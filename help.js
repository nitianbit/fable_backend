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