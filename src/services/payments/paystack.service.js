const Paystack = require("@paystack/paystack-sdk");
const { paymentGateway } = require("../../utils/utils");
const { Payment, UserNotification, Booking,BookingLog } = require("../../models");
const { walletService, bookingService } = require("../../services");
const moment = require("moment-timezone");
const { user } = require("../../notifications");

let paystack = null;

const authenticate = async () => {
  const paymobSetting = await paymentGateway("Paystack");
  const result = new Paystack(paymobSetting.secret);
  paystack = result;
  return paystack;
};

authenticate();

const initiate = async (amount, userDetail) => {
  try {
    const response = await paystack.transaction.initialize({
      currency: DEFAULT_CURRENCY_CODE, // default global currency code
      email: userDetail.email,
      amount: parseInt(amount) * 100,
      metadata: JSON.stringify({
        type: userDetail.type,
        payment_name: userDetail.payment_name,
      }),
    });
    if (response && response.status) {
      return response.data;
    } else {
      return false;
    }
  } catch (err) {
    return false;
  }
};

const verification = async (reference, orderId) => {
  try {
    const response = await paystack.transaction.verify({ reference });
    if (response && response.status) {
      const getPayment = await Payment.findOne({
        orderId,
        payment_status: "Processing",
      }).populate({ path: "userId", select: "device_token" });
      if (getPayment && getPayment.payment_type === "wallet") {
        // if order is exists and payment type wallet then update the order
        const updateObj = {
          paymentId: reference,
          payment_created: moment(response.data.created_at)
            .tz(DEFAULT_TIMEZONE)
            .unix(),
          payment_status: "Completed",
          payment_details: response.data,
          method: response.data.channel,
          passed: response.data.status,
          currency_code: response.data.currency,
        };
        await Payment.findOneAndUpdate({ orderId }, updateObj);
        // wallet recharge
        await walletService.updateBalance(getPayment); // update wallet balance and notification to user

        return true;
      } else if (getPayment && getPayment.payment_type === "trip") {
        const bookingId = getPayment.bookingId[0]; /// booking id
        // if order is exists and payment type wallet then update the order
        const updateObj = {
          paymentId: reference,
          payment_created: moment(response.data.created_at)
            .tz(DEFAULT_TIMEZONE)
            .unix(),
          payment_status: "Completed",
          payment_details: response.data,
          method: response.data.channel,
          passed: response.data.status,
          currency_code: response.data.currency,
        };
        await Payment.findOneAndUpdate({ orderId }, updateObj);
        const updateBooking = await Booking.findByIdAndUpdate(
          bookingId,
          {
            travel_status: "SCHEDULED",
          },
          {
            new: true,
          }
        );
        if (getPayment.userId && getPayment.userId.device_token) {
          const title = "Booking Confirmed";
          const bookingDate = moment(updateBooking.start_date).format(
            DEFAULT_DATEFORMAT
          );
          const content = `Thank you for booking the ${DEFAULT_APPNAME} for ${bookingDate}. Your PNR number is ${updateBooking.pnr_no}. Please show your ticket QR code to the driver when boarding. We will send you the driver's details in the ticket when the shuttle's trip begins.`;
          await user.UserNotification(
            title,
            content,
            "",
            getPayment.userId.device_token
          ); //title,message,data,token
          await UserNotification.create(
            "trip",
            title,
            content,
            getPayment.userId._id,
            {}
          );
        }
        return true;
      } else if (getPayment && getPayment.payment_type === "pass") {
        // generate pass booking data
        const getBookingLog = await BookingLog.findById(
          mongoose.Types.ObjectId(getPayment.bookingLogId)
        ).lean();
        if (getBookingLog) {
          const getBookingIds = await HelperCustom.generateSinglePass(
            getBookingLog.booking_date,
            "SCHEDULED",
            getBookingLog.payment_mode,
            getBookingLog.userId,
            getBookingLog.busId,
            getBookingLog.busscheduleId,
            getBookingLog.routeId,
            getBookingLog.pickupId,
            getBookingLog.dropoffId,
            getBookingLog.seat_no,
            getBookingLog.has_return,
            getBookingLog.passId,
            getBookingLog.pass_no_of_rides,
            getBookingLog.ip
          );

          let ObjPayment = {
            bookingId: getBookingIds,
            bookingLogId: getBookingLog._id,
            paymentId: reference,
            payment_details: response.data,
            method: response.data.channel,
            passed: response.data.status,
            currency_code: response.data.currency,
            payment_created: moment(response.data.created_at)
              .tz(DEFAULT_TIMEZONE)
              .unix(),
            payment_status: "Completed",
          };

          const updatePayment = await Payment.updateOne(
            { orderId },
            ObjPayment
          );
          if (getPayment.userId && getPayment.userId.device_token) {
            const title = "Booking Confirmed";
            const startbookingDate = moment(getBookingLog.booking_date)
              .tz(DEFAULT_TIMEZONE)
              .format(DEFAULT_DATEFORMAT);
            const endbookingDate = moment(
              startbookingDate,
              DEFAULT_DATEFORMAT
            ).add("days", parseInt(getBookingLog.pass_no_of_rides));
            const content = `Thank you for booking the ${DEFAULT_APPNAME} for ${startbookingDate} to  ${endbookingDate}. Please show your ticket QR code to the driver when boarding. We will send you the driver's details in the ticket when the shuttle's trip begins.`;
            await user.UserNotification(
              title,
              content,
              "",
              getPayment.userId.device_token
            ); //title,message,data,token
            await UserNotification.create(
              "trip",
              title,
              content,
              getPayment.userId._id,
              {}
            );
          }
          console.log("--- trip pass payment success ----");
        }
        return true;
      }
    } else {
      return false;
    }
  } catch (err) {
    return false;
  }
};

module.exports = {
  initiate,
  verification,
};
