const mongoose = require("mongoose");
//const paginateAggregate = require("mongoose-aggregate-paginate-v2");
const { Schema } = mongoose;

const PaymentGatewaySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
      default: "",
    },
    value: {
      type: String,
      required: true,
      index: true,
      default: "",
    },
    site: {
      type: String,
      enum: ["Razorypay", "Paymob", "PayStack"],
      required: true,
      index: true,
      default: "",
    },
  }
);
PaymentGatewaySchema.statics = {
  format(item) {
    return {
      id: item._id,
      name: item.name,
      status: item.status,
      info_status: item.info.status,
      mode: item.info.mode,
      username: item.info.username,
      password: item.info.password,
      key: item.info.key,
      integration_id: item.info.integration_id,
      frame_id: item.info.frame_id,
      secret: item.info.secret,
      merchant_id: item.info.merchant_id ? item.info.merchant_id : "",
      callback_url: item.info.callback_url,
      webhook_url: item.info.webhook_url,
    };
  },
  formatData(rows) {
    const selectableItems = [];
    let i = 1;
    rows.forEach((item) => {
      selectableItems.push({
        // id: item._id,
        name: item.name,
        // status: item.status,
        // info_status: item.info.status,
        mode: item.info.mode,
        username: item.info.username,
        password: item.info.password,
        key: item.info.key,
        secret: item.info.secret,
        integration_id: item.info.integration_id,
        frame_id: item.info.frame_id,
        merchant_id: item.info.merchant_id,
        callback_url: item.info.callback_url,
        webhook_url: item.info.webhook_url,
      });
    });
    return selectableItems;
  },
};

/**
 * @typedef PaymentGateway
 */
module.exports = mongoose.model("payment_gateway", PaymentGatewaySchema);
