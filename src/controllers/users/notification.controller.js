const { User, UserNotification } = require("../../models");
const userService = require("../../services/user.service");

module.exports = {
  lists: async (req, res) => {
    try {
      const { userId } = req.session;

      let perPage = 6;
      let page = 1;
      if (req.query.page != "") {
        perPage = req.query.perPage;
      }

      if (req.query.page != "") {
        page = req.query.page;
      }

      const getUserNotifications = await UserNotification.aggregate([
        {
          $match: { userId, read: 0 },
        },
        { $limit: parseInt(page) + parseInt(perPage) },
        { $skip: parseInt(page) },
        {
          $sort: { createdAt: -1 },
        },
        {
          $project: {
            _id: 0,
            title: 1,
            content: 1,
            type: 1,
            created_at: {
              $dateToString: {
                timezone: DEFAULT_TIMEZONE,
                format: "%d-%m-%Y %H:%M",
                date: "$createdAt",
              },
            },
          },
        },
      ]);
      if(getUserNotifications.length > 0){
        res.json({
            status: true,
            data: getUserNotifications,
            message: "notification lists",
          });
      }else{
        res.json({
            status: true,
            message: "No new notification found.",
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
  clearAll: async (req, res) => {
    try {
      const { userId } = req.session;

      const result = await UserNotification.updateMany(
        { userId },
        { $set: { read: 1 } }
      );
      if (result) {
        res.json({
          status: true,
          message: "clear all successfully.",
        });
      } else {
        res.json({
          status: true,
          message: "clear all notification failed.",
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
};
