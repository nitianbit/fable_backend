const { User, Wallet, UserNotification } = require("../models");
const { user } = require("../notifications");
/**
 * **/
const updateBalance = async (payment) => {
  try {
    const wallet = await Wallet.findById(payment.walletId);
    let total = 0;
    total = parseInt(wallet.amount) + parseInt(payment.amount);
    updatedWallet = await Wallet.findByIdAndUpdate(
      payment.walletId,
      {
        amount: total,
      },
      { new: true }
    ).populate({
      path: "users",
      select: "firstname lastname device_token",
    });


    if (updatedWallet.users && updatedWallet.users.device_token) {
      const title = "Wallet Recharge Successful";
      const content = `Hey ${updatedWallet.users.firstname} ${updatedWallet.users.lastname}, Amount ${DEFAULT_CURRENCY} ${payment.amount} has been added in your wallet. Your new balance is ${DEFAULT_CURRENCY} ${updatedWallet.amount}.`;
      user.UserNotification(
        title,
        content,
        "",
        updatedWallet.users.device_token
      ); //title,message,data,token
      await UserNotification.create(
        "wallet",
        title,
        content,
        updatedWallet.users._id,
        {}
      );
    }
  } catch (err) {
    return false;
  }
};

/**
 *  update the referral amount
 * @param {Number} amount
 * @return Object
 * ***/
const updateReferAmount = async (amount, date, reffby, referFrom) => {
  try {
    const newcredit = {
      amount: amount,
      status: false,
      date_of_reg: new Date(),
      date_of_exp: date,
      referedto: referFrom,
    };
    if (await this.exists({ refercode: reffby })) {
      const cref = await this.updateOne(
        { refercode: reffby },
        { $push: { credit: [newcredit] } }
      );
      return cref;
    }
  } catch (err) {
    return err;
  }
};

module.exports = {
  updateReferAmount,
  updateBalance,
};
