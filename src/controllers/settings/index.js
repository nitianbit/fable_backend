const { Setting, PaymentGateway } = require("../../models");

module.exports = {
  appSettings: async (req, res) => {
    try {
      const getSetting = await Setting.aggregate([
        {
          $project: {
            _id: 0,
            name: "$general.name",
            address: "$general.address",
            email: "$general.email",
            phone: "$general.phone",
            default_country: "$general.default_country",
            default_currency: "$general.default_currency",
            timezone: "$general.timezone",
            date_format: "$general.date_format.value",
            time_format: "$general.time_format.value",
            google_key: "$general.google_key",
            fee: "$general.fee",
            tax: "$general.tax",
            logo: "$general.logo",
            api_base_url: "$general.api_base_url",
            background_location_update_interval:
              "$general.background_location_update_interval",
            driver_online_location_update_interval:
              "$general.driver_online_location_update_interval",
            refund_type: "$refunds.type",
            refund_amount: "$refunds.amount",
            refund_contents: "$refunds.contents",
            otp_validation_via: "$notifications.otp_validation_via",
            firebase_customer_secret_key: "$notifications.customer_secret_key",
            firebase_driver_secret_key: "$notifications.driver_secret_key",
            apple_key_id: "$notifications.apple_key_id",
            apple_team_id: "$notifications.apple_team_id",
            apple_key: "$notifications.apple_key",
            privacy_policy_url: "",
            term_conditions_url: "",

            // refferal: 1,
            terms: 1,
            referral_policy: 1,
          },
        },
      ]);

      const getEnabledPayment = await PaymentGateway.findOne({ value: "1" });
      const convertedObject = {};
      const getPayments = await PaymentGateway.find({ site: getEnabledPayment.site });
      getPayments.forEach((item) => {
        convertedObject[item.name] = item.value;
      });
      getSetting[0].default_payment = getEnabledPayment.site;
      getSetting[0].payments = convertedObject;
      res.status(200).json({
        status: true,
        message: "get settings data",
        data: getSetting[0],
      });
    } catch (err) {
      res.status(400).json({
        status: false,
        title: "Settings Error",
        message: "Something went wrong during Settings process.",
        errorMessage: err.message,
      });
    }
  },
  maxSeatsPerBooking: async (req, res) => {
    try {
      const getSetting = await Setting.findOne({}, "general.max_seats_per_booking").lean();
      const maxSeats = getSetting?.general?.max_seats_per_booking || 1;
      
      res.status(200).json({
        status: true,
        message: "Maximum seats per booking retrieved successfully",
        data: {
          max_seats_per_booking: maxSeats,
        },
      });
    } catch (err) {
      res.status(400).json({
        status: false,
        title: "Settings Error",
        message: "Something went wrong while retrieving max seats per booking.",
        errorMessage: err.message,
      });
    }
  },
};
