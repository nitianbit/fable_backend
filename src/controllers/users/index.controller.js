const {
  User,
  Booking,
  Wallet,
  Session,
  Payment,
  Location,
  UserReferral,
  Setting,
} = require("../../models");
const userService = require("../../services/user.service");
const Utils = require("../../utils/utils");
const bcrypt = require("bcrypt");
const UniqueString = require("unique-string");
const Helper = require("../../models/Helper.model");
const MetaData = require("../../models/MetaData.model");
const nodeMailer = require("nodemailer");
const objectIdToTimestamp = require("objectid-to-timestamp");
const momenttz = require("moment-timezone");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const requestIp = require("request-ip");
const qr = require("qr-image");
const { user } = require("../../notifications");
const { nanoid } = require("nanoid");
const _ = require("lodash");

module.exports = {
  register: async (req, res) => {
    try {
      const { country_code, phone, device_id, country_details } = req.body;
      const userExist = await User.exists({ phone, country_code });
      if (!userExist) {
        let refercode = Utils.referCode(6, phone);
        const user = new User({
          country_code,
          phone,
          refercode,
          device_id,
          ip: requestIp.getClientIp(req),
        });
        const persistedUser = await user.save();
        const userId = persistedUser._id;

        const amount = 0;
        const wallet = new Wallet({
          users: user._id,
          refercode,
          amount,
        });
        const persistedWallet = await wallet.save();
        const walletId = persistedWallet._id;

        const session = await Utils.initSession(
          phone,
          userId,
          walletId,
          "User"
        );
        //await Utils.sendOTPTextLocal(phone, otp) // send otp via textlocal
        res.status(200).json({
          title: "User Registration Successful",
          status: true,
          flag: 0,
          csrfToken: session.csrfToken,
          token: session.token,
        });
        if (!_.isEmpty(country_details)) {
          await MetaData.create("country", JSON.parse(country_details));
        }
      } else {
        if (
          await User.exists({
            country_code,
            phone: phone,
            is_deleted: false,
          })
        ) {
          const getUser = await User.findOne({
            country_code,
            phone: phone,
          });
          const getWallet = await Wallet.findOne({
            users: getUser._id,
          });

          const updateuser = await User.updateOne(
            {
              country_code: getUser.country_code,
              phone: getUser.phone,
            },
            {
              device_id,
              ip: requestIp.getClientIp(req),
            }
          );
          const walletId = getWallet._id;
          const userId = getUser._id;

          const session = await Utils.initSession(
            phone,
            userId,
            walletId,
            "User"
          );
          // await Utils.sendOTPTextLocal(getUser.phone, otp) // send otp via textlocal
          res.status(200).json({
            title: "User login Successful",
            status: true,
            flag: 1,
            csrfToken: session.csrfToken,
            token: session.token,
          });

          if (!_.isEmpty(country_details)) {
            await MetaData.create("country", JSON.parse(country_details));
          }
        } else if (
          await User.exists({
            country_code,
            phone: phone,
            is_deleted: false,
          })
        ) {
          res.status(200).json({
            title: "Customer phone not found.",
            status: false,
            flag: 2,
          });
        } else {
          res.status(200).json({
            title: "User blocked by admin. Please contact to support ",
            status: false,
            flag: 3,
          });
        }
      }
    } catch (err) {
      res.status(404).json({
        status: false,
        title: "Registration Error",
        message: "Something went wrong during registration process.",
        errorMessage: err.message,
      });
    }
  },
  verifyOTP: async function (req, res) {
    try {
      const {
        otp,
        is_mobile_verified,
        device_token,
        device_type,
        device_info,
      } = req.body;
      const { userId } = req.session;
      const currentOtp = await User.findOne({_id:userId}).select("otp").lean();
      console.log(currentOtp,otp);
      if (!currentOtp) {
      return res.status(404).json({
        status: false,
        message: "please send  OTP first /user not found",
      });
    }
      if (currentOtp.otp != otp) {
      return res.status(401).json({
        status: false,
        message: "Invalid OTP",
      });
    }
      const getUser = await userService.getUserById(userId);
      if (getUser) {
        if (is_mobile_verified) {
          const persistedUser = await userService.updateUserById(userId, {
            otp,
            is_mobile_verified,
            device_token,
            device_type,
            device_info,
          });
          res.json({
            status: true,
            userDetail: User.formatedData(persistedUser),
            message: "OTP verify successful",
          });
        } else {
          res.json({
            status: false,
            message: "OTP not matched.",
          });
        }
      } else {
        res.json({
          status: false,
          message: "User not found.",
        });
      }
    } catch (err) {
      res.status(200).json({
        message: "Invalid OTP",
        status: false,
        errorMessage: err.message,
      });
    }
  },
  reSendOTP: async (req, res) => {
    try {
      const { phone } = req.body;
      const { userId } = req.session;
      const otp = await Utils.generatingOTP(999, 1000);
      const userExist = await User.exists({
        phone: phone,
      });
      if (userExist) {
        const updateuser = await User.findOneAndUpdate(
          {
            phone: phone,
          },
          {
            otp: otp,
          }
        );
        await Utils.sendOTPTextLocal(updateuser.phone, otp); // send otp via textlocal
        res.status(200).json({
          message: "resend otp Successful",
          status: true,
          otp: otp,
        });
      } else {
        res.status(200).json({
          message: "phone number not exists.",
          status: false,
        });
      }
    } catch (err) {
      res.status(401).json({
        message: "Invalid OTP",
        status: false,
        errorMessage: err.message,
      });
    }
  },
  refresh: async (req, res) => {
    try {
      const { phone, csrfToken, onModel } = req.body;
      
      const session = await Utils.refreshToken(phone, csrfToken, onModel);
      res.status(200).json({
        status: true,
        message: "token updated successfully.",
        data: {
          token: session.token,
          csrfToken: session.csrfToken,
        },
      });
    } catch (err) {
      res.status(400).json({
        status: false,
        title: "Error while",
        message: "Something went wrong during refresh token.",
        errorMessage: err,
      });
    }
  },
  help: async (req, res) => {
    try {
      const { contact, helpemail, description } = req.body;
      const { userId } = req.session;
      const user = await User.findById(
        {
          _id: userId,
        },
        {
          firstname: 1,
          lastname: 1,
          gender: 1,
          email: 1,
          phone: 1,
          _id: 0,
        }
      );
      contactNum = Number(contact);
      const firstname = user.firstname;
      const lastname = user.lastname;
      const gender = user.gender;
      const email = user.email;
      const phone = user.phone;

      const helper = new Helper({
        firstname,
        lastname,
        gender,
        email,
        phone,
        helpemail,
        contactNum,
        description,
        ticket_no: momenttz().valueOf(),
      });
      const persistedHelper = await helper.save();
      const helperId = persistedHelper._id;
      if (helperId) {
        res.status(200).json({
          status: true,
          message: "Your request has been submitted.",
        });
      }
    } catch (err) {
      res.send(err);
    }
  },
  findProfile: async (req, res) => {
    try {
      const { userId, walletId } = req.session;
      const user = await User.findById(
        {
          _id: userId,
        },
        {
          email: 1,
          refercode: 1,
          referedby: 1,
          _id: 0,
        }
      ).po;

      const getuserdetail = await Wallet.findById(walletId).populate("users");
      res.json({
        status: true,
        message: "Successfully authenticated user",
        baseurl: process.env.BASE_URL,
        data: User.formatedData(getuserdetail.users),
      });
    } catch (err) {
      res.status(401).json({
        status: false,
        message: "Not authorized to access this route",
        errorMessage: err.message,
      });
    }
  },
  referral: async (req, res) => {
    try {
      const { userId } = req.session;
      const refercode = await User.findById({
        _id: userId,
      }).lean();

      if (refercode.refercode == "" || refercode.refercode == undefined) {
        throw new Error("Kindly update your profile to generate refercode");
      }
      const getsetting = await Utils.getSetting();
      const refAmount = await UserReferral.totalRefAmount(userId);
      res.json({
        status: true,
        message: "Successfully found refercode",
        data: {
          amount: refAmount ? refAmount : "0",
          refercode: refercode.refercode,
          referral_policy: getsetting.referral_policy,
        },
      });
    } catch (err) {
      res.status(401).json({
        status: false,
        message: "Not authorized to access this route",
        errorMessage: err.message,
      });
    }
  },
  referrallink: async (req, res) => {
    try {
      const { phone } = req.body;
      const otp = 1234; //await Utils.generatingOTP(999, 1000); // generate OTP
      const userExist = await User.findOne({
        phone,
      });
      if (!userExist) {
        const referedby = req.params.referral;
        if (referedby != undefined && referedby != "") {
          toString(referedby);
          const ref = await User.findOne({
            refercode: {
              $eq: referedby,
            },
          });

          if (!ref) {
            throw new Error("Invalid referlink");
          }
          const refercode = Utils.referCode(6, phone);
          const user = new User({
            phone,
            otp,
            refercode,
            referedby,
          });
          const persistedUser = await user.save();
          const userId = persistedUser._id;

          const amount = 100;
          //         const credit = [{ amount: amount, status: false }];

          var date = new Date();
          date.setDate(date.getDate() + 30); // expire within the months
          await Utils.updateReferAmount(amount, date, referedby, userId); //update refer amount pending in refer user
          const wallet = new Wallet({
            users: user._id,
            refercode,
          });
          const persistedWallet = await wallet.save();
          const userReferral = await UserReferral.create(user._id,referedby);
          const walletId = persistedWallet._id;
          const session = await Utils.initSession(
            phone,
            userId,
            walletId,
            "User"
          );

          res.status(200).json({
            title: "User Registration Successful",
            status: true,
            otp: otp,
            // data1: user.referedby,
            // data2: { totalamount, cref },
            flag: 0,
            userDetail: User.formatedData(persistedUser),
            csrfToken: session.csrfToken,
            token: session.token,
          });
        } else {
          throw new Error("Invalid referlink");
        }
      } else {
        res.status(200).json({
          status: false,
          message: "Phone number already exists",
        });
      }
    } catch (err) {
      res.status(400).json({
        status: false,
        title: "Registration Error",
        message: "Something went wrong during registration process.",
        errorMessage: err.message,
      });
    }
  },
  referlink: async (req, res) => {
    try {
      const { userId } = req.session;
      const refercode = await User.findById(
        {
          _id: userId,
        },
        {
          refercode: 1,
          _id: 0,
        }
      );

      if (refercode.refercode == "" || refercode.refercode == undefined) {
        throw new Error("Kindly update your profile to generate referlink");
      }
      const referlink = process.env.REFER_LINK + refercode.refercode;
      res.json({
        status: true,
        message: "Successfully found refercode",
        data: referlink,
      });
    } catch (err) {
      res.status(401).json({
        status: false,
        message: "Not authorized to access this route",
        errorMessage: err.message,
      });
    }
  },
  applyReferral: async (req, res) => {
    try {
      const { userId } = req.session;
      const { referralCode } = req.body;

      if (!referralCode) {
        return res.status(400).json({
          status: false,
          message: "Referral code is required"
        });
      }

      // Check if user already has a referral
      const existingReferral = await UserReferral.findOne({ userId });
      if (existingReferral) {
        return res.status(400).json({
          status: false,
          message: "User already has an active referral"
        });
      }

      // Find the referrer
      const referrer = await User.findOne({ refercode: referralCode });
      if (!referrer) {
        return res.status(400).json({
          status: false,
          message: "Invalid referral code"
        });
      }

      if (referrer._id.toString() === userId.toString()) {
        return res.status(400).json({
          status: false,
          message: "Cannot apply your own referral code"
        });
      }

      // Create referral record
      const referral = await UserReferral.create(userId, referralCode);

      if (referral) {
        res.json({
          status: true,
          message: "Referral code applied successfully",
          data: {
            referrer: {
              id: referrer._id,
              name: `${referrer.firstname} ${referrer.lastname}`,
              phone: referrer.phone
            },
            amount: referral.amount,
            startDate: referral.start_date,
            endDate: referral.end_date
          }
        });
      } else {
        res.status(400).json({
          status: false,
          message: "Failed to apply referral code"
        });
      }
    } catch (err) {
      res.status(500).json({
        status: false,
        message: "Failed to apply referral code",
        errorMessage: err.message,
      });
    }
  },
  wallettransactions: async (req, res) => {
    try {
      const { walletId, userId } = req.session;
      const getpayments = await Payment.find({
        userId,
        walletId,
        is_pass: false,
        payment_status: { $nin: ['Processing'] }
      })
        .limit(8)
        .sort({ _id: -1 })
        .lean();
      res.json({
        status: true,
        message: "wallet history",
        data: Payment.formattedData(getpayments),
      });
    } catch (err) {
      res.status(404).json({
        status: false,
        message: "Not authorized to access this route",
        errorMessage: err.message,
      });
    }
  },
  bookingTransactions: async (req, res) => {
    try {
      const { userId } = req.session;
      const getPayments = await userService.bookingHistory(
        userId,
        req.query.limit
      );
      res.json({
        status: true,
        message: "booking history",
        data: getPayments,
      });
    } catch (err) {
      res.status(404).json({
        status: false,
        message: "booking history not found",
        errorMessage: err.message,
      });
    }
  },
  walletcheck: async (req, res) => {
    try {
      const { walletId, userId } = req.session;
      const wallet = await Wallet.findById({
        _id: walletId,
      });
      //   var credamount = 0;
      //  credamount = await UserReferral.totalRefAmount(userId);
      // wallet.credit.forEach((item) => {
      //     if (item.amount != undefined && item.status == true) {
      //         credamount = credamount + item.amount;
      //     }
      // });
      var amount = 0;
      if (wallet.amount != undefined) {
        amount = wallet.amount;
      }

      res.json({
        status: true,
        message: "Successfully found refercode",
        data: {
          amount: amount,
        },
      });
    } catch (err) {
      res.status(401).json({
        status: false,
        message: "Not authorized to access this route",
        errorMessage: err.message,
      });
    }
  },
  updateLang: async (req, res) => {
    try {
      const { language } = req.body;
      const { userId } = req.session;
      const updateUser = await User.findByIdAndUpdate(userId, { language });
      res.status(200).json({
        status: true,
        statusCode: 22,
        message: "Language updated successfully.",
      });
    } catch (err) {
      res.status(200).json({
        message: "Language updated failed",
        status: false,
        statusCode: 33,
        errorMessage: err.message,
      });
    }
  },
  addmoney: async (req, res) => {
    try {
      const { amount } = req.body;
      // our order ID
      const { userId } = req.session;
      const razorPaySetting = await Utils.configRazorPay(); // call utils for the Razory pay
      const wallet = await Wallet.findOne({
        users: {
          $eq: userId,
        },
      }).populate("users");
      const currency = razorPaySetting.payment_settings.currency;
      const receipt = razorPaySetting.ferriOrderId;
      const payment_capture = razorPaySetting.payment_settings.payment_capture;
      let parameters = {
        amount: parseInt(amount) * 100,
        currency,
        receipt,
        payment_capture,
        notes: {
          type: "wallet_recharge",
          ferriOrderId: receipt,
        },
      };

      const data = await razorPaySetting.razor.orders.create(parameters);
      const payment = new Payment({
        ferriOrderId: receipt,
        orderId: data.id,
        walletId: wallet._id,
        userId: userId,
        amount: amount,
        payment_status: "Processing",
        title: "Wallet recharge",
        type: 0,
      });
      const persistedPayment = await payment.save();
      res.status(200).json({
        status: true,
        message: "successfully added amount in wallet",
        verify_url: `${process.env.BASE_URL}api/users/payment/verify`,
        data: {
          orderId: data.id,
          amount: amount,
          name: `Wallet - ${receipt}`,
          prefill: {
            name: wallet.users.firstname + " " + wallet.users.lastname,
            email: wallet.users.email,
            contact: wallet.users.phone,
          },
          notes: {
            ferri_order_id: receipt,
          },
          payment_settings: razorPaySetting.payment_settings,
        },
      });
    } catch (err) {
      res.status(404).json({
        status: false,
        message: "Amount not added in wallet",
        errorMessage: err.message,
      });
    }
  },
  verifypayment: async (req, res) => {
    try {
      const { orderId, paymentId, signature, status } = req.body;

      const razorPaySetting = await Utils.configRazorPay(); // call utils for the Razory pay
      const secret = razorPaySetting.payment_settings.secret;
      let body = orderId + "|" + paymentId;
      //  const secret = process.env.RAZOR_KEY_SECRET;
      let expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(body.toString())
        .digest("hex");
      if (expectedSignature == signature && status === "true") {
        const razorPaymentStatus = await razorPaySetting.razor.payments.fetch(
          paymentId
        );

        if (
          (razorPaymentStatus && razorPaymentStatus.status == "captured") ||
          razorPaymentStatus.status == "authorized"
        ) {
          if (await Payment.exists({ orderId, payment_status: "Processing" })) {
            const updated_payment = await Payment.findOneAndUpdate(
              {
                orderId: orderId,
              },
              {
                method: razorPaymentStatus.method
                  ? razorPaymentStatus.method
                  : "wallet",
                paymentId: paymentId,
                payment_signature: signature,
                payment_created: razorPaymentStatus.created_at,
                payment_status: "Completed",
                payment_details: {
                  notes: razorPaymentStatus.notes,
                  description: razorPaymentStatus.description,
                  wallet: razorPaymentStatus.wallet
                    ? razorPaymentStatus.wallet
                    : "",
                  invoice_id: razorPaymentStatus.invoice_id
                    ? razorPaymentStatus.invoice_id
                    : "",
                  bank: razorPaymentStatus.bank ? razorPaymentStatus.bank : "",
                  card_id: razorPaymentStatus.card_id
                    ? razorPaymentStatus.card_id
                    : "",
                  vpa: razorPaymentStatus.vpa ? razorPaymentStatus.vpa : "",
                  fee: razorPaymentStatus.fee,
                  tax: razorPaymentStatus.tax,
                  created_at: razorPaymentStatus.created_at,
                  captured: razorPaymentStatus.captured,
                },
              }
            );
            const payment = await Payment.findOne(
              {
                orderId: orderId,
              },
              "bookingId walletId amount"
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

              await Payment.findOneAndUpdate(
                { orderId: orderId, userId: wallet.users },
                { payment_status: "Completed" }
              );


              if (updatedWallet.users && updatedWallet.users.device_token) {
                user.UserNotification(
                  "Wallet Recharge Successful",
                  `Hey ${updatedWallet.users.firstname}, Amount Rs. ${payment.amount} has been added in your wallet. Your new balance is Rs. ${updatedWallet.amount}.`,
                  "",
                  updatedWallet.users.device_token
                ); //title,message,data,token
              }
            }
            res.status(200).json({
              status: true,
              message: "payment verified successfully.",
              verification: "success",
            });
          } else if (
            await Payment.exists({ orderId, payment_status: "Completed" })
          ) {
            res.status(200).json({
              status: true,
              message: "payment verified successfully.",
              verification: "success",
            });
          }
        } else if (
          razorPaymentStatus &&
          razorPaymentStatus.status == "failed"
        ) {
          const updated_payment = await Payment.findOneAndUpdate(
            {
              orderId: orderId,
            },
            {
              method: razorPaymentStatus.method,
              payment_created: razorPaymentStatus.created_at,
              paymentId: paymentId,
              payment_signature: signature,
              payment_status: "Failed",
            }
          );
          await Payment.findOneAndUpdate(
            { orderId: orderId },
            { payment_status: "Failed" }
          );
          res.status(200).json({
            status: false,
            message: "payment failed try after sometime.",
            verification: "failed",
          });
        }
      } else {
        res.status(200).json({
          status: false,
          message: "payment cancel by customer.",
          verification: "failure",
        });
      }
    } catch (err) {
      res.status(200).json({
        status: false,
        message: "",
        errorMessage: err.message,
      });
    }
  },
  searchlocation: async (req, res) => {
    try {
      const address = req.body.address;
      var searchname = {
        title: {
          $regex: "(s+" + address + "|^" + address + ")",
          $options: "i",
        },
      };

      var location = await Location.aggregate([
        {
          $match: searchname,
        },
        {
          $group: {
            _id: "$_id",
            id: {
              $first: "$_id",
            },
            title: {
              $first: "$title",
            },
            location: {
              $first: "$location",
            },
            type: {
              $first: "$type",
            },
            city: {
              $first: "$city",
            },
            state: {
              $first: "$state",
            },
          },
        },
        {
          $limit: parseInt(req.body.limit),
        },
      ]);

      if (location.length > 0) {
        res.status(200).json({
          status: true,
          message: "Successfully found location",
          data: Location.transformData(location),
        });
      } else {
        res.status(200).json({
          status: false,
          message: "location not found",
        });
      }
    } catch (err) {
      res.status(401).json({
        status: false,
        message: "Location not found",
        errorMessage: err.message,
      });
    }
  },
  book: async (req, res) => {
    try {
      // const { userId, walletId } = req.session;
      // const user = await User.findById({ _id: userId }, { firstname: 1, lastname: 1, gender: 1, email: 1, phone: 1, refercode: 1, referedby: 1, _id: 0 });
      // const wallet = await Wallet.findById({ _id: walletId }, { money: 1, _id: 0 });
      const {
        firstname,
        lastname,
        gender,
        email,
        phone,
        bus,
        seat,
        pickup,
        destination,
        date,
        time,
      } = req.body;
      const booking = new Booking({
        firstname,
        lastname,
        gender,
        email,
        phone,
        bus,
        seat,
        pickup,
        destination,
        date,
        time,
      });
      const persistedBooking = await booking.save();
      const bookingId = persistedBooking._id;
      res.json({
        title: "Booking successful",
        detail: "Successfully booked ticket",
        booking,
      });
    } catch (err) {
      res.status(401).json({
        status: false,
        message: "Not authorized to access this route",
        errorMessage: err.message,
      });
    }
  },
  updateuser: async (req, res) => {
    try {
      if (/@vusra\.com$/.test(req.body.email)) {
        res.json({
          message: "email address not valid",
          status: false,
        });
      } else {
        const {
          firstname,
          lastname,
          email,
          gender,
          referedby,
          social_id,
          mode,
          device_token,
          home_address,
          home_lat,
          home_lng,
          home_timing,
          office_address,
          office_lat,
          office_lng,
          office_timing,
        } = req.body;

        const { userId, walletId } = req.session;
        const userExists = await User.findById(userId);
        if (userExists) {
          const updateObj = {
            firstname,
            lastname,
            email,
            gender,
            referedby,
            social_id,
            mode,
            device_token,
          };
          if (
            (home_address != "" &&
              home_lng != "" &&
              home_lat != "" &&
              home_timing != "") ||
            (office_address != "" &&
              office_lng != "" &&
              office_lat != "" &&
              office_timing != "")
          ) {
            updateObj.places = {
              home: {
                address: home_address,
                coordinates: [parseFloat(home_lng), parseFloat(home_lat)],
                timing: new Date(home_timing),
                type: "Point",
              },
              office: {
                address: office_address,
                coordinates: [parseFloat(office_lng), parseFloat(office_lat)],
                timing: new Date(office_timing),
                type: "Point",
              },
            };
          }
          if (req.files && req.files != undefined) {
            const profileLink = await userService.uploadProfile(
              req.files.ProfilePic
            ); // update profile
            updateObj.ProfilePic = profileLink;
          }

          const user = await userService.updateUserById(userId, updateObj);
          res.json({
            message: "Update successful",
            status: true,
            baseurl: process.env.BASE_URL,
            data: User.formatedData(user),
          });
        } else {
          res.json({
            message: "Customer not found",
            status: true,
          });
        }
      }
    } catch (err) {
      res.status(404).json({
        status: false,
        message: "Enter valid Information",
        errorMessage: err.message,
      });
    }
  },
  getTrips: async (req, res) => {
    try {
      const { travel_status, offset, limit } = req.body;
      const { userId, walletId } = req.session;

      // {
      //     $in: ["CANCELLED","ACCEPTED","ONBOARDED",
      //     "ASSIGNED",
      //     "STARTED",
      //     "ARRIVED",
      //     "PICKEDUP",
      //     "DROPPED",
      //     "COMPLETED",
      //     "EXPIRED",
      //     "SCHEDULED"]
      //     }

      const getTrips = await Booking.find({
        userId: userId,
        travel_status: travel_status,
      })
        .populate({
          path: "userId",
          select: "firstname lastname phone email",
        })
        .populate({
          path: "routeId",
          select: "title",
        })
        .populate({
          path: "pickupId",
          select: "title",
        })
        .populate({
          path: "dropoffId",
          select: "title",
        })
        .populate({
          path: "busId",
          select: "name model_no reg_no",
        })
        .populate({
          path: "passengerdetails",
        })
        .populate({ path: "userId", select: "firstname lastname phone" })
        .populate({ path: "payments", match: { payment_status: "Completed" } })
        .sort({
          booking_date: 1,
        })
        .skip(parseInt(offset))
        .limit(parseInt(limit));

      const refundssettings = await Setting.getrefunds();
      res.json({
        message: "my trip Successful",
        status: true,
        refund_alert: refundssettings.refunds.contents,
        data: await Utils.bookingtransformData(getTrips),
      });
    } catch (err) {
      res.status(404).json({
        status: false,
        message: "fetching failed",
        errorMessage: err.message,
      });
    }
  },
  generateQRTrip: async (req, res) => {
    try {
      const { userId, walletId } = req.session;
      const { pnr_no } = req.body;
      const getData = await Booking.findOne(
        {
          pnr_no,
          userId,
        },
        "_id has_return passengers seat_nos travel_status final_total_fare pnr_no"
      )
        .populate({
          path: "userId",
          select: "firstname lastname phone email",
        })
        .populate({
          path: "routeId",
          select: "title",
        })
        .populate({
          path: "pickupId",
          select: "title",
        })
        .populate({
          path: "dropoffId",
          select: "title",
        })
        .populate({
          path: "busId",
          select: "name model_no",
        })
        .lean();

      if (!getData.travel_status) {
        const qrData = `final_total_fare=${getData.final_total_fare}&pnr_no=${getData.pnr_no
          }&
          seat_nos=${getData.seat_nos}&travel_status=${getData.travel_status ? "Completed" : "Pending"
          }&bus_name=${getData.busId.name}&
          bus_model_no=${getData.busId.model_no}&
          passengers=${getData.passengers}&has_return=${getData.has_return ? "NO" : "YES"
          }&firstname=${getData.userId.firstname}&lastname=${getData.userId.lastname
          }&phone=${getData.userId.phone}`;


        const png_string = qr.imageSync(qrData, {
          type: "png",
        });
        res.json({
          message: "ti Successful",
          status: true,
          data: png_string.toString("base64"),
        });
      } else {
        const png_string = "";
        res.json({
          message: "ti Successful",
          status: true,
          data: png_string,
        });
      }
    } catch (err) {
      res.status(404).json({
        status: false,
        message: "fetching failed",
        errorMessage: err.message,
      });
    }
  },
  addHomeOffice: async (req, res) => {
    try {
      const {
        home_lat,
        home_lng,
        home_address,
        home_timing,
        office_lat,
        office_lng,
        office_address,
        office_timing,
      } = req.body;
      const { userId, walletId } = req.session;

      if (
        await User.exists({
          _id: userId,
        })
      ) {
        const Obj = {
          places: {
            home: {
              address: home_address,
              coordinates: [parseFloat(home_lng), parseFloat(home_lat)],
              timing: await Utils.joinDateTime(home_timing),
            },
            office: {
              address: office_address,
              coordinates: [parseFloat(office_lng), parseFloat(office_lat)],
              timing: await Utils.joinDateTime(office_timing),
            },
          },
        };
        const updateUser = await User.findOneAndUpdate(
          {
            _id: userId,
          },
          Obj,
          {
            new: true,
          }
        );
        res.json({
          message: "Add home and office details",
          status: true,
          data: await User.formatedData(updateUser),
        });
      }
    } catch (err) {
      res.status(400).json({
        status: false,
        message: "Unable to added home and office",
        detail: ".",
        errorMessage: err.message,
      });
    }
  },
  logout: async (req, res) => {
    try {
      const requestData = req.session;
      await Utils.verifyToken(requestData.token);
      res.json({
        message: "Logout Successful",
        status: true,
        detail: "Successfuly expired login session",
      });
    } catch (err) {
      res.status(400).json({
        status: false,
        message: "Logout Failed",
        detail: "Something went wrong during the logout process.",
        errorMessage: err.message,
      });
    }
  },
  userDelete: async (req, res) => {
    try {
      const { userId } = req.session;
      const { password } = req.body;
      if (typeof password !== "string") {
        throw new Error();
      }
      const user = await User.findById({
        _id: userId,
      });

      const passwordValidated = await bcrypt.compare(password, user.password);
      if (!passwordValidated) {
        throw new Error();
      }

      await Session.expireAllTokensForUser(userId);
      res.clearCookie("token");
      await User.findByIdAndDelete({
        _id: userId,
      });
      res.json({
        title: "Account Deleted",
        detail:
          "Account with credentials provided has been successfuly deleted",
      });
    } catch (err) {
      res.status(401).json({
        errors: [
          {
            title: "Invalid Credentials",
            detail: "Check email and password combination",
            errorMessage: err.message,
          },
        ],
      });
    }
  },
  track: async (req, res) => {
    try {
      const { pnr_no } = req.body;
      const date = await userService.bookingTrack(pnr_no);
      res.json({
        message: "track Successful",
        status: true,
        data: date,
      });
    } catch (err) {
      res.status(200).json({
        status: false,
        message: "Something went wrong during registration process.",
        errorMessage: err.message,
      });
    }
  },
  invoiceGenerate: async (req, res) => {
    try {
      const pnr_no = req.params.pnr_no;
      const data = await userService.invoiceGenerate(pnr_no, res);
      return data;
    } catch (err) {
      res.status(200).json({
        status: false,
        message: "Something went wrong during registration process.",
        errorMessage: err.message,
      });
    }
  },
};
