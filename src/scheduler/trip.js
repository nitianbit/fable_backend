const cron = require('node-cron');
const { Booking, BookingAssign,User,Setting } = require("../models");
const moment = require("moment-timezone")
const { user } = require("../notifications")


module.exports = {

    bookingCompletedTrip: async () => {
        const getSetting = await Setting.findOne({},"general").lean();
        let DEFAULT_TIMEZONE  = "Africa/Cairo"||getSetting.general.timezone;
        cron.schedule('*/1 * * * *', async function () {
            console.log('******** Process running every BookingAssign minute *********');
            const getBookingAssign = await BookingAssign.find({ trip_status: "COMPLETED" }).lean();
            if (getBookingAssign.length > 0) {
                getBookingAssign.forEach(async (trip, index) => {
                    //const currentDate = moment(trip.date_time).tz(appSetting.general.timezone).format("YYYY-MM-DD")
                    const getBookingOnboard = await Booking.find({travel_status: "ONBOARDED",busScheduleId: trip.busscheduleId,bus_depature_date:{ $in:trip.dates}});
                    if(getBookingOnboard){
                        getBookingOnboard.forEach(async (booking, index) => {
                            const updateObj = {
                                travel_status : "COMPLETED"
                            }
                            const updateOne = await Booking.updateOne({_id:booking._id},updateObj);
                            return updateOne;

                        })
                   
                    }

                    const getBookingSchedules = await Booking.find({travel_status: {$in:["SCHEDULED","PENDING"]},busScheduleId: trip.busscheduleId, bus_depature_date:{ $in:trip.dates}});
                    if(getBookingSchedules.length > 0){
                        getBookingSchedules.forEach(async (booking, index) => {
                            const updateObj = {
                                travel_status : "EXPIRED"
                            }
                            const updateOne = await Booking.updateOne({_id:booking._id},updateObj);
                            if (updateOne.n > 0) {
                                let getUser = await User.findById(booking.userId).select("device_token");
                                if (getUser && getUser.device_token) {
                                    user.UserNotification(
                                        "Trip Expired",
                                        `Your trip is expired.`,
                                        "",
                                        getUser.device_token
                                    ); //title,message,data,token 
                                }
                            }
                            return updateOne;
                        })
                    }

                })

            }
        },{
            timezone: DEFAULT_TIMEZONE
        });
    },
        bookingExpiredTrip: async () => {
        try {
            const getSetting = await Setting.findOne({},"general").lean();
            let DEFAULT_TIMEZONE  = getSetting.general.timezone;
            cron.schedule('0 0 1 * * *', async function () {
                console.log('******** Process running every minute for expired *********');
             
                let yesterday = moment().tz(DEFAULT_TIMEZONE).subtract(1, 'days').format('YYYY-MM-DD');
                const currentDate = moment(yesterday).tz(DEFAULT_TIMEZONE).format("YYYY-MM-DD")
                const getBooking = await Booking.find({
                    bus_depature_date: {$lte: new Date(currentDate)},
                    travel_status: { $in: ["SCHEDULED", "PROCESSING"] }
                });
                if(getBooking.length > 0){
                    getBooking.forEach(async (booking, index) => {
                        const updateObj = {
                            travel_status: "EXPIRED"
                        }
                        await Booking.updateOne({ _id: booking._id }, updateObj);
                          const updateObj2 = {
                            trip_status: "EXPIRED",
                            date_time: {$lte: new Date(currentDate)}
                        }
                        await BookingAssign.updateOne({ routeId: booking.routeId }, updateObj2);
                    })
                }
            },{
            timezone: DEFAULT_TIMEZONE
        });
        } catch (err) {

            return err;
        }
    }
}