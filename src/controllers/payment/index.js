const {
  Payment,
  Booking,
  User,
  Wallet,
  BookingLog,
  UserNotification,
} = require("../../models");
const { user } = require("../../notifications");
const { HelperCustom } = require("../../helpers");
const { initiatePayment } = require("../../services/payments/paymob.service");
const {
  initiate,
  verification,
} = require("../../services/payments/paystack.service");
const {
  initiatePay,
  paymentVerification,
} = require("../../services/payments/razorpay.service");
const { paymentGateway } = require("../../utils/utils");
const { hmacValidate } = require("../../utils/authenticatePaymob");
const { walletService, bookingService } = require("../../services");
const moment = require("moment");
const uniqid = require("uniqid");
const mongoose = require("mongoose");
const { createHmac } = require("crypto");

module.exports = {
  pay: async (req, res, next) => {
    try {
      const {
        type,
        payment_name,
        amount,
        pnr_no,
        payment_mode,
        bus_id,
        route_id,
        pickup_stop_id,
        drop_stop_id,
        seat_no,
        has_return,
        pass_id,
        pass_no_of_rides,
      } = req.query;

      const { userId, walletId } = req.session;
      let userDetail = await User.findById(userId);
      userDetail.type = type;
      userDetail.payment_name = payment_name;
      if (type === "wallet") {
        if (payment_name === "Paymob") {
          // payment for paymob integration
          const { link, orderId } = await initiatePayment(
            type,
            payment_name,
            amount,
            userDetail
          ); // payment_name,amount,userDetail
          const payment = new Payment({
            orderId,
            walletId: walletId,
            userId: userId,
            amount: amount,
            payment_type: type,
            payment_status: "Processing",
            title: "Wallet recharge",
            type: 0,
          });
          await payment.save();
          res.status(200).json({
            status: true,
            link,
          });
        } else if (payment_name === "Paystack") {
          const { authorization_url, reference } = await initiate(
            amount,
            userDetail
          );
          const orderId = reference;
          const payment = new Payment({
            orderId,
            walletId: walletId,
            userId: userId,
            amount: amount,
            payment_type: type,
            payment_status: "Processing",
            title: "Wallet recharge",
            type: 0,
          });
          await payment.save();

          res.status(200).json({
            status: true,
            link: authorization_url,
          });
        } else if (payment_name === "Razorpay") {
          userDetail.orderId = "#" + uniqid.time();
          userDetail.description = "Wallet Recharge";
          const result = await initiatePay(amount, userDetail);
          if (result && result.codeStatus) {
            const payment = new Payment({
              orderId: result.id,
              walletId: walletId,
              userId: userId,
              amount: amount,
              payment_type: type,
              payment_status: "Processing",
              title: "Wallet recharge",
              type: 0,
            });
            await payment.save();
            res.status(200).json({
              status: true,
              link: result.short_url,
            });
          } else {
            res.status(200).json({
              status: false,
              message: "initiatePay payment failed",
            });
          }
        }
      } else if (type === "trip") {
        if (payment_name === "Paymob" && payment_mode === "ONLINE") {
          const getBooking = await Booking.findOne({ pnr_no }).lean();
          if (getBooking) {
            // payment for paymob integration
            userDetail.bookingId = getBooking._id;
            const { link, orderId } = await initiatePayment(
              type,
              payment_name,
              amount,
              userDetail
            ); // payment_name,amount,userDetail
            if (
              !(await Payment.exists({ bookingId: { $in: [getBooking._id] } }))
            ) {
              const payment = new Payment({
                bookingId: getBooking._id,
                walletId: walletId,
                userId: userId,
                orderId,
                payment_mode: payment_mode,
                payment_type: type,
                payment_status: "Processing",
                amount: amount,
                method: payment_mode.toLowerCase(),
                title: "Ride paid",
                type: 1,
              });
              await payment.save();
            } else {
              await Payment.updateOne(
                { bookingId: { $in: [getBooking._id] } },
                { orderId }
              );
            }
            res.status(200).json({
              status: true,
              link,
            });
          } else {
            res.status(200).json({
              status: false,
              message: "PNR No. not found.",
            });
          }
        } else if (payment_name === "Paystack" && payment_mode === "ONLINE") {
          const getBooking = await Booking.findOne({ pnr_no }).lean();
          if (getBooking) {
            // for trip
            const { authorization_url, reference } = await initiate(
              amount,
              userDetail
            );
            const orderId = reference;
            if (
              !(await Payment.exists({ bookingId: { $in: [getBooking._id] } }))
            ) {
              const payment = new Payment({
                bookingId: getBooking._id,
                orderId,
                walletId: walletId,
                userId: userId,
                amount: amount,
                payment_type: type,
                payment_status: "Processing",
                title: "Trip booking",
                type: 0,
              });
              await payment.save();
            } else {
              await Payment.updateOne(
                { bookingId: { $in: [getBooking._id] } },
                { orderId }
              ); // orderId update if payment gateway is reopen
            }

            res.status(200).json({
              status: true,
              link: authorization_url,
            });
          } else {
            res.status(200).json({
              status: false,
              link: "",
            });
          }
        } else if (payment_name === "Razorpay" && payment_mode === "ONLINE") {
          const getBooking = await Booking.findOne({ pnr_no }).lean();
          if (getBooking) {
            userDetail.orderId = "#" + uniqid.time();
            userDetail.description = "Trip booking";
            const result = await initiatePay(amount, userDetail);
            if (result && result.codeStatus) {
              if (
                !(await Payment.exists({
                  bookingId: { $in: [getBooking._id] },
                }))
              ) {
                let orderId = result.id;
                const payment = new Payment({
                  bookingId: getBooking._id,
                  orderId,
                  walletId: walletId,
                  userId: userId,
                  amount: amount,
                  payment_type: type,
                  payment_status: "Processing",
                  title: "Trip booking",
                  type: 0,
                });
                await payment.save();
              } else {
                await Payment.updateOne(
                  { bookingId: { $in: [getBooking._id] } },
                  { orderId }
                ); // orderId update if payment gateway is reopen
              }

              res.status(200).json({
                status: true,
                link: result.short_url,
              });
            } else {
              res.status(200).json({
                status: false,
                link: "",
              });
            }
          } else {
            res.status(200).json({
              status: false,
              link: "",
            });
          }
        }
      } else if (type === "pass") {
        // create passes booking iniate
        if (payment_name === "Paymob" && payment_mode === "ONLINE") {
          const getBookingLog = await BookingLog.createLog(
            booking_date,
            amount,
            payment_mode,
            userId,
            bus_id,
            busschedule_id,
            route_id,
            pickup_stop_id,
            drop_stop_id,
            seat_no,
            has_return,
            pass_id,
            parseInt(pass_no_of_rides),
            req.ip
          );
          if (getBookingLog) {
            userDetail.bookingLogId = getBookingLog._id;
            const { link, orderId } = await initiatePayment(
              type,
              payment_name,
              amount,
              userDetail
            ); // payment_name,amount,userDetail
            if (
              !(await Payment.exists({
                bookingLogId: { $in: [getBookingLog._id] },
              }))
            ) {
              const payment = new Payment({
                bookingId: getBooking._id,
                walletId: walletId,
                userId: userId,
                orderId,
                passId: mongoose.Types.ObjectId(pass_id),
                is_pass: true,
                payment_mode: payment_mode,
                payment_type: type,
                payment_status: "Processing",
                amount: amount,
                method: payment_mode.toLowerCase(),
                title: "Ride paid",
                type: 1,
              });
              await payment.save();
            } else {
              await Payment.updateOne(
                { bookingLogId: { $in: [getBookingLog._id] } },
                { orderId }
              ); // orderId update if payment gateway is reopen
            }

            res.status(200).json({
              status: true,
              link,
            });
          }
        } else if (payment_name === "Paystack" && payment_mode === "ONLINE") {
          const getBookingLog = await BookingLog.createLog(
            booking_date,
            amount,
            payment_mode,
            userId,
            bus_id,
            busschedule_id,
            route_id,
            pickup_stop_id,
            drop_stop_id,
            seat_no,
            has_return,
            pass_id,
            parseInt(pass_no_of_rides),
            req.ip
          );
          if (getBookingLog) {
            userDetail.bookingLogId = getBookingLog._id;
            const { authorization_url, reference } = await initiate(
              amount,
              userDetail
            );
            const orderId = reference;
            if (
              !(await Payment.exists({
                bookingLogId: { $in: [getBookingLog._id] },
              }))
            ) {
              const payment = new Payment({
                bookingId: getBooking._id,
                walletId: walletId,
                userId: userId,
                orderId,
                passId: mongoose.Types.ObjectId(pass_id),
                is_pass: true,
                payment_mode: payment_mode,
                payment_type: type,
                payment_status: "Processing",
                amount: amount,
                method: payment_mode.toLowerCase(),
                title: "Ride paid",
                type: 1,
              });
              await payment.save();
            } else {
              await Payment.updateOne(
                { bookingLogId: { $in: [getBookingLog._id] } },
                { orderId }
              ); // orderId update if payment gateway is reopen
            }
            res.status(200).json({
              status: true,
              link: authorization_url,
            });
          }
        } else if (payment_name === "Razorpay" && payment_mode === "ONLINE") {
          const getBookingLog = await BookingLog.createLog(
            booking_date,
            amount,
            payment_mode,
            userId,
            bus_id,
            busschedule_id,
            route_id,
            pickup_stop_id,
            drop_stop_id,
            seat_no,
            has_return,
            pass_id,
            parseInt(pass_no_of_rides),
            req.ip
          );
          if (getBookingLog) {
            userDetail.bookingLogId = getBookingLog._id;
            userDetail.orderId = "#" + uniqid.time();
            userDetail.description = "Trip booking";
            const result = await initiatePay(amount, userDetail);
            if (result && result.codeStatus) {
              if (
                !(await Payment.exists({
                  bookingLogId: { $in: [getBookingLog._id] },
                }))
              ) {
                const payment = new Payment({
                  bookingId: getBooking._id,
                  walletId: walletId,
                  userId: userId,
                  orderId,
                  passId: mongoose.Types.ObjectId(pass_id),
                  is_pass: true,
                  payment_mode: payment_mode,
                  payment_type: type,
                  payment_status: "Processing",
                  amount: amount,
                  method: payment_mode.toLowerCase(),
                  title: "Ride paid",
                  type: 1,
                });
                await payment.save();
              } else {
                await Payment.updateOne(
                  { bookingLogId: { $in: [getBookingLog._id] } },
                  { orderId }
                ); // orderId update if payment gateway is reopen
              }
            } else {
              res.status(200).json({
                status: false,
                link: "",
              });
            }
          } else {
            res.status(200).json({
              status: false,
              link: "",
            });
          }
        }
      }
    } catch (err) {
      return { message: err.message };
    }
  },
  callback: async (req, res, next) => {
    try {
      const { trxref, reference } = req.query;
      const orderId = reference;
      if (await verification(reference, orderId)) {
        // paystack verifications
        res.send(`
			  <div id="data">
					${JSON.stringify({
            status: true,
            success: true,
            payment_id: orderId,
            message: "payment verified successfully.",
            verification: "success",
          })}
			  </div>
            `);
      } else {
        res.send(`
			  <div id="data">
					${JSON.stringify({
            status: true,
            success: false,
            payment_id: orderId,
            message: "payment verified failed.",
            verification: "failed",
          })}
			  </div>
            `);
      }
    } catch (err) {
      res.send(`<div id="data">
      ${JSON.stringify({
        status: false,
        success: false,
        message: err.message,
      })}</div>`);
    }
  },
  paystackWebhook: async (req, res, next) => {
    try {
      // web hooking
      if (eventData.event === "charge.success") {
        const referenceId = eventData.data.reference;
        // Process the successful transaction to maybe fund wallet and update your WalletModel
      } else if (eventData.event === "charge.success") {
      }
    } catch (err) {}
  },
  verify: async (req, res, next) => {
    try {
      const { success, order, payment_name } = req.query;

      console.log("------------client side callback --------------------");
      if (payment_name === "Razorpay") {
        const result = await paymentVerification(req.query);
        if (result) {
          res.send(`
          <div id="data">
            ${JSON.stringify({
              status: true,
              success: true,
              payment_id: order,
              message: "payment verified successfully.",
              verification: "success",
            })}
          </div>
              `);
        } else {
          res.send(`
          <div id="data">
            ${JSON.stringify({
              status: true,
              success: false,
              message: "payment verified failed or Completed.",
            })}
          </div>
              `);
        }
      } else {
        // Create a hash using the lexogragical string and the HMAC key
        let hash = await hmacValidate("GET", req.query);

        // Compare the hash with the hmac sent by Paymob to verify the request is authentic
        if (hash === req.query.hmac) {
          if (success === "true") {
            res.send(`
     <div id="data">
       ${JSON.stringify({
         status: true,
         success: true,
         payment_id: order,
         message: "payment verified successfully.",
         verification: "success",
       })}
     </div>
         `);
          } else {
            res.send(`
     <div id="data">
       ${JSON.stringify({
         status: true,
         success: false,
         message: "payment verified failed.",
       })}
     </div>
         `);
          }
        } else {
          res.send(`
     <div id="data">
       ${JSON.stringify({
         status: false,
         success: false,
         message: "payment hmac validate failed.",
       })}
     </div>
         `);
        }
      }
    } catch (err) {
      res.send(`<div id="data">
					${JSON.stringify({
            status: false,
            success: false,
            message: err.message,
          })}</div>`);
    }
  },
  processed: async (req, res, next) => {
    try {
      const { obj } = req.body;
      console.log(
        "---------------------- processed callback -----------------------"
      );
      let paymentObj = {
        success: obj.success,
        pending: obj.pending,
        owner: obj.owner,
        order: obj.order.id.toString(),
        is_voided: obj.is_voided,
        is_refunded: obj.is_refunded,
        is_capture: obj.is_capture,
        is_auth: obj.is_auth,
        is_3d_secure: obj.is_3d_secure,
        integration_id: obj.integration_id,
        id: obj.id,
        amount_cents: obj.amount_cents,
        created_at: obj.created_at,
        currency: obj.currency,
        error_occured: obj.error_occured,
        has_parent_transaction: obj.has_parent_transaction,
        is_standalone_payment: obj.is_standalone_payment,
        source_data: obj.source_data,
      };

      // Create a hash using the lexogragical string and the HMAC key
      let hash = await hmacValidate("POST", paymentObj);
      if (hash === req.query.hmac) {
        if (obj.success) {
          // check is success is true
          const orderId = obj.order.id;
          const getPayment = await Payment.findOne({
            orderId,
            payment_status: "Processing",
          });

          if (getPayment && getPayment.payment_type === "wallet") {
            // if order is exists and payment type wallet then update the order
            const updateObj = {
              paymentId: obj.id,
              payment_signature: hash,
              payment_created: moment(obj.created_at).unix(),
              currency_code: obj.currency,
              payment_status: "Completed",
              payment_details: obj.data,
            };
            await Payment.findOneAndUpdate({ orderId }, updateObj);
            await walletService.updateBalance(getPayment); // update wallet balance and notification to user

            res.status(200).json({
              status: true,
              success: true,
              message: "payment verified successfully.",
              verification: "success",
            });
          } else if (getPayment && getPayment.payment_type === "trip") {
            const bookingId = getPayment.bookingId; // booking id
            // if order is exists and payment type wallet then update the order
            const updateObj = {
              paymentId: obj.id,
              payment_signature: hash,
              payment_created: moment(obj.created_at).unix(),
              currency_code: obj.currency,
              payment_status: "Completed",
              payment_details: obj.data,
              method: "card",
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
            console.log("--- trip payment success ----");
          } else if (getPayment && getPayment.payment_type === "pass") {
            // generate pass booking data
            const getBookingLog = await BookingLog.findById(
              mongoose.Types.ObjectId(getPayment.bookingLogId)
            ).lean();
            if (getBookingLog) {
              // check if exits or not

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
              if (getBookingIds) {
                let ObjPayment = {
                  bookingId: getBookingIds,
                  bookingLogId: getBookingLog._id,
                  paymentId: obj.id,
                  payment_signature: hash,
                  payment_created: moment(obj.created_at).unix(),
                  currency_code: obj.currency,
                  payment_status: "Completed",
                  payment_details: obj.data,
                  method: "card",
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
            }
          }
        } else {
          // check is not success is false
        }
      } else {
        res.status(200).json({
          status: false,
          message: "hmac validate failed",
        });
      }
    } catch (err) {
      res.status(200).json({
        status: false,
        message: err.message,
      });
    }
  },
  walletPayment: async (paymentObj, signature) => {
    try {
      const ferriOrderId = paymentObj.entity.notes["ferriOrderId"];
      const getPayment = await Payment.findOne({
        ferriOrderId,
        payment_status: "Processing",
      }).lean();
      if (getPayment) {
        const updated_payment = await Payment.findByIdAndUpdate(
          {
            _id: getPayment._id,
          },
          {
            method: paymentObj.entity.method,
            paymentId: paymentObj.entity.id,
            payment_signature: signature,
            payment_created: paymentObj.entity.created_at,
            payment_status: "Completed",
            payment_details: {
              notes: paymentObj.entity.notes,
              description: paymentObj.entity.description,
              wallet: paymentObj.entity.wallet ? paymentObj.entity.wallet : "",
              invoice_id: paymentObj.entity.invoice_id
                ? paymentObj.entity.invoice_id
                : "",
              bank: paymentObj.entity.bank ? paymentObj.entity.bank : "",
              card_id: paymentObj.entity.card_id
                ? paymentObj.entity.card_id
                : "",
              vpa: paymentObj.entity.vpa ? paymentObj.entity.vpa : "",
              fee: paymentObj.entity.fee,
              tax: paymentObj.entity.tax,
              created_at: paymentObj.entity.created_at,
              captured: paymentObj.entity.captured,
            },
          }
        );
        var wallet = {};
        var updatedWallet = {};
        if (getPayment.walletId != undefined) {
          wallet = await Wallet.findOne({
            _id: getPayment.walletId,
          });
          var total = 0;
          total = parseInt(wallet.amount) + parseInt(getPayment.amount);
          updatedWallet = await Wallet.findOneAndUpdate(
            {
              _id: getPayment.walletId,
            },
            {
              amount: total,
            },
            { new: true }
          ).populate({
            path: "users",
            select: "firstname lastname device_token",
          });

          if (updatedWallet.users && updatedWallet.users.device_token) {
            user.UserNotification(
              "Wallet Recharge Successful",
              `Hey ${updatedWallet.users.firstname}, Amount Rs. ${getPayment.amount} has been added in your wallet. Your new balance is Rs. ${updatedWallet.amount}.`,
              "",
              updatedWallet.users.device_token
            ); //title,message,data,token
          }
          return {
            message: "OK",
          };
        }
      }
    } catch (err) {
      return { message: "failed" };
    }
  },
  bookingPayment: async (paymentObj, signature) => {
    try {
      const ferriOrderId = paymentObj.entity.notes["ferriOrderId"];
      const getPayment = await Payment.findOne({
        ferriOrderId,
        payment_status: "Processing",
      })
        .populate({ path: "userId", select: "device_token" })
        .lean();
      if (getPayment) {
        const updated_payment = await Payment.findByIdAndUpdate(
          {
            _id: getPayment._id,
          },
          {
            method: paymentObj.entity.method,
            paymentId: paymentObj.entity.id,
            payment_signature: signature,
            payment_created: paymentObj.entity.created_at,
            payment_status: "Completed",
          }
        );

        const pnr_no = paymentObj.entity.notes.booking_pnr_no;
        const updateBooking = await Booking.findOneAndUpdate(
          {
            pnr_no: pnr_no,
          },
          {
            travel_status: "SCHEDULED",
          },
          {
            new: true,
          }
        );
        if (getPayment.userId.device_token) {
          user.UserNotification(
            "Booking Confirmed",
            `Thanks for booking shuttle for ${updateBooking.start_date}, Show your ticket Qr Code to Driver while boarding.We'll send driver detail in ticket when shuttle starts trip.`,
            "",
            getPayment.userId.device_token
          ); //title,message,data,token
        }
        return {
          message: "OK",
        };
      }
    } catch (err) {
      return { message: "failed" };
    }
  },
  bookingPassPayment: async (paymentObj, signature) => {
    try {
      const ferriOrderId = paymentObj.entity.notes.ferriOrderId;
      const getPayment = await Payment.findOne({
        ferriOrderId,
        payment_status: "Processing",
      })
        .populate({ path: "userId", select: "device_token" })
        .lean();
      if (getPayment) {
        const bookingLogId = paymentObj.entity.notes.bookingLogId;
        const getBookingLog = await BookingLog.findById(
          mongoose.Types.ObjectId(bookingLogId.toString())
        ).lean();
        if (getBookingLog) {
          const getBookingIds = await HelperCustom.generateSinglePass(
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
              bookingLogId: getBookingLog._id,
              method: paymentObj.entity.method,
              paymentId: paymentObj.entity.id,
              payment_signature: signature,
              payment_created: paymentObj.entity.created_at,
              payment_status: "Completed",
              payment_details: {
                notes: paymentObj.entity.notes,
                description: paymentObj.entity.description,
                wallet: paymentObj.entity.wallet
                  ? paymentObj.entity.wallet
                  : "",
                invoice_id: paymentObj.entity.invoice_id
                  ? paymentObj.entity.invoice_id
                  : "",
                bank: paymentObj.entity.bank ? paymentObj.entity.bank : "",
                card_id: paymentObj.entity.card_id
                  ? paymentObj.entity.card_id
                  : "",
                vpa: paymentObj.entity.vpa ? paymentObj.entity.vpa : "",
                fee: paymentObj.entity.fee,
                tax: paymentObj.entity.tax,
                created_at: paymentObj.entity.created_at,
                captured: paymentObj.entity.captured,
              },
            };
            const updatePayment = await Payment.findByIdAndUpdate(
              { _id: getPayment._id },
              ObjPayment
            );

            if (updatePayment) {
              if (getPayment.userId.device_token) {
                user.UserNotification(
                  "Pass Purchased",
                  `Thanks for booking ferri shuttle. Pass has been added to ticket history. Show your ticket Qr Code to Driver while boarding.We'll send driver detail in ticket when shuttle starts trip.`,
                  "",
                  getPayment.userId.device_token
                ); //title,message,data,token
              }

              return {
                message: "OK",
              };
            }
          }
        }
      }
    } catch (err) {
      return {
        message: "failed",
      };
    }
  },
};
