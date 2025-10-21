const Utils = require("../../utils/utils");
const routeUtils = require("../../utils/route.utils");
const {
    SearchAddress,
    Setting,
    Location,
    Route,
    RouteStop,
    RouteDetail,
    Bus,
    BusLayout,
    UserReferral,
	Wallet
} = require("../../models");
const _ = require("lodash");
const objectIdToTimestamp = require("objectid-to-timestamp");
const moment = require("moment-timezone");
const {
    HelperCustom
} = require('../../helpers')

    module.exports = {
    getSeatPrices: async (req, res) => {
        try {
            const {
                busschedule_id,
                route_id,
                pickup_stop_id,
                drop_stop_id,
                has_return,
                current_date
            } = req.body;

            const busId = req.params.busId;

            // Get bus layout to get all seats
            const getbus = await Bus.findOne({
                _id: busId
            })
                .populate({
                    path: "buslayoutId",
                    model: BusLayout
                });

            if (!getbus) {
                return res.status(404).json({
                    status: false,
                    message: "Bus not found"
                });
            }

            // Transform bus layout to get seat data
            const transformedLayout = await BusLayout.transformData(
                busschedule_id, 
                busId, 
                getbus.buslayoutId, 
                current_date, 
                ''
            );

            // Extract all seats from the layout
            const allSeats = [];
            if (transformedLayout && transformedLayout.combine_seats) {
                transformedLayout.combine_seats.forEach(row => {
                    if (Array.isArray(row)) {
                        row.forEach(seat => {
                            if (seat && seat.seat_no) {
                                allSeats.push(seat.seat_no);
                            }
                        });
                    }
                });
            }

            // Calculate prices for each seat
            const seatPrices = {};
            const pricingInfo = {
                baseFare: "0.00",
                totalFare: "0.00", 
                taxRate: "18",
                fees: "0",
                distance: "0.00",
                perSeatBasePrice: 0,
                perSeatTotalPrice: 0,
                perSeatTax: 0
            };

            if (allSeats.length > 0) {
                // Get fare for first seat to get base pricing info
                const sampleFare = await HelperCustom.generateBookingFare(
                    busschedule_id,
                    route_id, 
                    busId, 
                    pickup_stop_id, 
                    drop_stop_id, 
                    `["${allSeats[0]}"]`,
                    has_return,
                    current_date
                );

                // Calculate per-seat pricing
                const basePrice = sampleFare.sub_total / sampleFare.no_of_seats;
                const taxPerSeat = sampleFare.tax_amount / sampleFare.no_of_seats;
                const totalPerSeat = basePrice + taxPerSeat;

                pricingInfo.baseFare = basePrice.toFixed(2);
                pricingInfo.totalFare = totalPerSeat.toFixed(2);
                pricingInfo.taxRate = sampleFare.tax.toString();
                pricingInfo.distance = sampleFare.distance.toString();
                pricingInfo.perSeatBasePrice = basePrice;
                pricingInfo.perSeatTotalPrice = totalPerSeat;
                pricingInfo.perSeatTax = taxPerSeat;

                // Generate prices for each seat
                for (const seatNo of allSeats) {
                    try {
                        const seatFare = await HelperCustom.generateBookingFare(
                            busschedule_id,
                            route_id,
                            busId,
                            pickup_stop_id,
                            drop_stop_id,
                            `["${seatNo}"]`,
                            has_return,
                            current_date
                        );

                        seatPrices[seatNo] = {
                            basePrice: seatFare.sub_total / seatFare.no_of_seats,
                            totalPrice: seatFare.final_total_fare / seatFare.no_of_seats,
                            tax: seatFare.tax_amount / seatFare.no_of_seats,
                            seatNo: seatNo,
                            status: seatFare.seat_no && seatFare.seat_no.includes(seatNo) ? "empty" : "unavailable"
                        };
                    } catch (error) {
                        console.log(`Error calculating price for seat ${seatNo}:`, error);
                        seatPrices[seatNo] = {
                            basePrice: 0,
                            totalPrice: 0,
                            tax: 0,
                            seatNo: seatNo,
                            status: "unavailable"
                        };
                    }
                }
            }

            res.status(200).json({
                status: true,
                message: "Seat prices calculated successfully",
                data: {
                    busId: busId,
                    routeId: route_id,
                    busScheduleId: busschedule_id,
                    pickupStopId: pickup_stop_id,
                    dropStopId: drop_stop_id,
                    currentDate: current_date,
                    seatPrices: seatPrices,
                    pricingInfo: pricingInfo
                }
            });

        } catch (err) {
            console.log("Error in getSeatPrices:", err);
            res.status(200).json({
                status: false,
                message: "Error calculating seat prices",
                errorMessage: err.message,
            });
        }
    },
    searchseats: async(req, res) => {
        try {
            const {
				busschedule_id,
                route_id,
                pickup_stop_id,
                drop_stop_id,
                type,
                has_return,
                 current_date,
                end_date,
            } = req.body;

            const busId = req.params.busId;
			const {
                walletId,
                userId
            } = req.session;
			
            const getbus = await Bus.findOne({
                _id: busId
            })
                .populate({
                path: "bustypeId",
                select: "name"
            })
                .populate({
                path: "buslayoutId",
                model: BusLayout
            })
                // .lean();
                const getbuses = await Bus.transformdata(getbus);
    
            const getFare = await HelperCustom.generateBookingFare(busschedule_id,route_id, busId, pickup_stop_id, drop_stop_id, "[A1]",has_return,current_date); // helper generate fare

	         getbuses.final_total_fare = getFare.final_total_fare;
            getbuses.tax = getFare.tax;
              getbuses.tax_amount = getFare.tax_amount;

            if (type === 'office') {
                getbuses.buslayoutId = await BusLayout.transformData(busschedule_id, busId, getbuses.buslayoutId,current_date,end_date);
                const getPassFare = await HelperCustom.generatePassFare(busschedule_id,route_id,pickup_stop_id, drop_stop_id, "[A1]",has_return); // helper generate fare

                getbuses.final_pass_fare = getPassFare;
                getbuses.pickup_name = getFare.pickup_name;
                getbuses.pickup_time = getFare.pickup_time;
                getbuses.drop_name = getFare.drop_name;
                getbuses.drop_time = getFare.drop_time;
                getbuses.seat_no = getFare.seat_no;
                getbuses.created_date = getFare.created_date;
            }else{

                 getbuses.buslayoutId = await BusLayout.transformData(busschedule_id, busId, getbuses.buslayoutId,current_date,'');
            }

			const wallet = await Wallet.findById({
                _id: walletId
            });
			 const credamount = await UserReferral.totalRefAmount(userId);
			getbuses.user_total_wallet_amount =  parseInt(wallet.amount)
			
            res.status(200).json({
                status: true,
                message: "Successfully found bus seats ",
                data: getbuses
            });

        } catch (err) {
            console.log(err);
            res.status(200).json({
                status: false,
                message: "bus seat not found",
                errorMessage: err.message,
            });
        }
    },
};
