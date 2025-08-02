const Utils = require("../utils/utils");
const cron = require("node-cron");
const { Booking, Payment, User, BookingLog,Wallet,Setting } = require("../models");
const { HelperCustom } = require("../helpers");
const { user } = require("../notifications");
const moment = require("moment-timezone");
const mongoose = require("mongoose");

module.exports = {
  bookingPaymentCheck: async () => {
    cron.schedule("*/15 * * * *", async function () {
      console.log("******** Process running every minute payment *********");
      try {
        const razorPaySetting = await Utils.configRazorPay(); // call utils for the Razory pay
        const getSetting = await Setting.findOne({},"general").lean();
        const DEFAULT_TIMEZONE  = getSetting.general.timezone;
        const currentDate = moment()
          .tz(DEFAULT_TIMEZONE)
          .startOf("day")
          .toString();
        const payments = await Payment.find({
          payment_status: "Processing",
          method: { $ne: "wallet" },
          createdAt: { $gte: currentDate },
        })
          .populate({ path: "userId", select: "device_token" })
          .lean();


        if (payments.length > 0) {
          for (const payment of payments) {
            const fetchPayments = await razorPaySetting.razor.orders.fetchPayments(payment.orderId); // order_8rxvBwFoOD


            if (fetchPayments.items.length > 0) {
              for (const item of fetchPayments.items) {
                if ((item.status === "captured" && item.captured == true) || (item.status === "authorized" && item.captured == false)) {
                  if (item.notes.type === "booking") {
                    const updatePayment = await Payment.findByIdAndUpdate(
                      payment._id,
                      {
                        payment_status: "Completed",
                        payment_created: item.created_at,
                        paymentId: item.id,
                      }
                    );
                    if (updatePayment) {
                      let updateBooking = await Booking.findOneAndUpdate(
                        { _id: { $in: updatePayment.bookingId } },
                        { travel_status: "SCHEDULED" }
                      );

                      if (payment.userId.device_token) {
                        user.UserNotification(
                          "Booking Confirmed",
                          `Thanks for booking ferri shuttle for ${updateBooking.start_date}, Show your ticket Qr Code to Driver while boarding.We'll send driver detail in ticket when shuttle starts trip.`,
                          "",
                          payment.userId.device_token
                        ); //title,message,data,token
                      }
                    }
                  } else if (
                    payment.is_pass &&
                    item.notes.type === "booking_pass" &&
                    payment.bookingId.length === 0
                  ) {
                    const bookingLogId = item.notes.bookingLogId;
                    const getBookingLog = await BookingLog.findById(
                      mongoose.Types.ObjectId(bookingLogId)
                    ).lean();
                    if (getBookingLog) {
                      const getBookingIds =
                        await HelperCustom.generateSinglePass(
                          getBookingLog.booking_date,
                          "SCHEDULED",
                          getBookingLog.payment_mode,
                          getBookingLog.userId,
                          getBookingLog.busId,
                          getBookingLog.routeId,
                          getBookingLog.pickupId,
                          getBookingLog.dropoffId,
                          getBookingLog.seat_no,
                          getBookingLog.has_return,
                          getBookingLog.passId,
                          getBookingLog.pass_no_of_rides,
                          getBookingLog.ip
                        );

                      if (getBookingIds) {
                        let ObjPayment = {
                          bookingId: getBookingIds,
                          paymentId: item.id,
                          payment_created: item.created_at,
                          payment_status: "Completed",
                          payment_details: {
                            notes: item.notes,
                            description: item.description,
                            wallet: item.wallet ? item.wallet : "",
                            invoice_id: item.invoice_id ? item.invoice_id : "",
                            bank: item.bank ? item.bank : "",
                            card_id: item.card_id ? item.card_id : "",
                            vpa: item.vpa ? item.vpa : "",
                            fee: item.fee,
                            tax: item.tax,
                            created_at: item.created_at,
                            captured: item.captured,
                          },
                        };
                        const updatePayment = await Payment.findByIdAndUpdate(
                          { _id: payment._id },
                          ObjPayment
                        );

                        if (updatePayment) {
                          if (payment.userId.device_token) {
                            user.UserNotification(
                              "Pass Purchased",
                              `Thanks for booking ferri shuttle. Pass has been added to ticket history. Show your ticket Qr Code to Driver while boarding.We'll send driver detail in ticket when shuttle starts trip.`,
                              "",
                              payment.userId.device_token
                            ); //title,message,data,token
                          }
                        }
                      }
                    }
                  }else if (item.notes.type === "wallet_recharge") {
					  
					const updated_payment = await Payment.findByIdAndUpdate(
                      {
                        _id: payment._id,
                      },
                      {
                        method: item.method,
                        paymentId: item.id,
                        payment_created: item.created_at,
                        payment_status: "Completed",
                        payment_details: {
                          notes: item.notes,
                          description: item.description,
                          wallet: item.wallet ? item.wallet : "",
                          invoice_id: item.invoice_id ? item.invoice_id : "",
                          bank: item.bank ? item.bank : "",
                          card_id: item.card_id ? item.card_id : "",
                          vpa: item.vpa ? item.vpa : "",
                          fee: item.fee,
                          tax: item.tax,
                          created_at: item.created_at,
                          captured: item.captured,
                        },
                      }
                    );
                    var wallet = {};
                    var updatedWallet = {};
                    if (payment.walletId != undefined) {
                      wallet = await Wallet.findOne({
                        _id: payment.walletId,
                      });
                      var total = 0;
                      total = parseInt(wallet.amount) + parseInt(payment.amount);
                      updatedWallet = await Wallet.findOneAndUpdate(
                        {
                          _id: payment.walletId,
                        },
                        {
                          amount: total,
                        },
                        { new: true }
                      ).populate({
                        path: "users",
                        select: "firstname lastname device_token",
                      });

                      if (
                        updatedWallet.users &&
                        updatedWallet.users.device_token
                      ) {
                        user.UserNotification(
                          "Wallet Recharge Successful",
                          `Hey ${updatedWallet.users.firstname}, Amount Rs. ${payment.amount} has been added in your wallet. Your new balance is Rs. ${updatedWallet.amount}.`,
                          "",
                          updatedWallet.users.device_token
                        ); 
                      }
                    }
				  } // note type end
                }
              }
            }
          }
        }
      } catch (err) {
        return err;
      }
	 
    });
  },
};
