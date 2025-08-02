const { paymentGateway } = require("../../utils/utils");
const Razorpay = require("razorpay");
const {
  Payment,
  UserNotification,
  Booking,
  BookingLog,
} = require("../../models");
const { walletService, bookingService } = require("../../services");
const moment = require("moment-timezone");
const { user } = require("../../notifications");
const {
  validatePaymentVerification,
} = require("razorpay/dist/utils/razorpay-utils");
const { HelperCustom } = require("../../helpers");
let instance = null;
let defaultCurrency = "";
let secretKey = "";

const authenticate = async () => {
  const paymobSetting = await paymentGateway("Razorpay");
  instance = new Razorpay({
    key_id: paymobSetting.key,
    key_secret: paymobSetting.secret,
  });
  defaultCurrency = paymobSetting.currency;
  secretKey = paymobSetting.secret;
  return instance;
};

// authenticate();

/**
 * Payment initiate
 * @param amount
 * @param userDetail
 * **/
const initiatePay = async (amount, userDetail) => {
  try {
    let parameters = {
      amount: parseInt(amount) * 100,
      currency: defaultCurrency,
      accept_partial: false,
      reference_id: userDetail.orderId,
      description: userDetail.description,
      customer: {
        name: `${userDetail.firstname} ${userDetail.lastname}`,
        email: `${userDetail.email}`,
        contact: `+${userDetail.country_code}${userDetail.phone}`,
      },
      notes: {
        type: userDetail.type,
        orderId: userDetail.orderId,
      },
      callback_url: `${process.env.BASE_URL}api/payments/verify?type=${userDetail.type}&payment_name=${userDetail.payment_name}`,
      callback_method: "get",
      options: {
        checkout: {
          name: DEFAULT_APPNAME,
          readonly: {
            email: "1",
            contact: "1",
          },
        },
      },
    };

    const response = await instance.paymentLink.create(parameters);
    if (response) {
      response.codeStatus = true;
      return response;
    } else {
      return { codeStatus: false };
    }
  } catch (err) {
    return { codeStatus: false };
  }
};

const paymentVerification = async (rzpay) => {
  try {
    //razorpay_payment_id=pay_MkSOpPiyxISHg6
    //&razorpay_payment_link_id=plink_MkSMyXYAQ2fgq0
    //&razorpay_payment_link_reference_id=
    //&razorpay_payment_link_status=paid
    //&razorpay_signature=13ea6d52712f7f60c4c5e9032e9131eb2dc534a04750a4cee7d6953601787699&type=wallet
    const validatePayment = await validatePaymentVerification(
      {
        payment_link_id: rzpay.razorpay_payment_link_id,
        payment_id: rzpay.razorpay_payment_id,
        payment_link_reference_id: rzpay.razorpay_payment_link_reference_id,
        payment_link_status: rzpay.razorpay_payment_link_status,
      },
      rzpay.razorpay_signature,
      secretKey
    );
    if (validatePayment) {
      let orderId = rzpay.razorpay_payment_link_id;
      const getPayment = await Payment.findOne({
        orderId,
        payment_status: "Processing",
      }).populate({ path: "userId", select: "device_token" });
      if (getPayment && getPayment.payment_type === "wallet") {
        // if order is exists and payment type wallet then update the order
        const updateObj = {
          paymentId: rzpay.razorpay_payment_id,
          payment_created: moment().tz(DEFAULT_TIMEZONE).unix(),
          payment_status: "Completed",
          passed: rzpay.razorpay_payment_link_status,
          currency_code: defaultCurrency,
        };
        await Payment.findOneAndUpdate({ orderId }, updateObj);
        // wallet recharge
        await walletService.updateBalance(getPayment); // update wallet balance and notification to user

        return true;
      } else if (getPayment && getPayment.payment_type === "trip") {
        const bookingId = getPayment.bookingId[0]; /// booking id
        // if order is exists and payment type wallet then update the order
        const updateObj = {
          paymentId: rzpay.razorpay_payment_id,
          passed: rzpay.razorpay_payment_link_status,
          payment_created: moment().tz(DEFAULT_TIMEZONE).unix(),
          currency_code: defaultCurrency,
          payment_status: "Completed",
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
            paymentId: rzpay.razorpay_payment_id,
            passed: rzpay.razorpay_payment_link_status,
            payment_created: moment().tz(DEFAULT_TIMEZONE).unix(),
            currency_code: defaultCurrency,
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
    }
    return false;
  } catch (err) {
    return { codeStatus: false };
  }
};

module.exports = {
  initiatePay,
  paymentVerification,
};
