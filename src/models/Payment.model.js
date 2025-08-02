const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const timezoneHelpers = require("../helpers/timezone");
var Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
const moment = require("moment-timezone");
const _ = require("lodash");

const PaymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: [ObjectId],
      ref: "Booking",
      default: [],
    },
    bookingLogId: {
      type: ObjectId,
      ref: "Booking_log",
      default: null,
    },
    walletId: {
      type: ObjectId,
      ref: "Wallet",
    },
    userId: {
      type: ObjectId,
      ref: "User",
    },
    title: { type: String, default: "" },
    type: { type: Number, default: 1 }, // 0 credit 1 debit
    is_deleted: { type: Boolean, default: false },
    is_refferal: { type: Boolean, default: false },
    orderId: { type: String, required: true, index: true },
    paymentId: { type: String, default: "" },
    payment_signature: { type: String, default: "" },
    passId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pass",
      default: null,
    },
    is_pass: { type: Boolean, default: false, index: true },
    total_pass_amount: { type: Number, default: 0 },
    payment_type: {
      type: String,
      enum: ["wallet", "trip","pass","free","refund"],
      default: "wallet",
    },
    payment_status: {
      type: String,
      enum: [
        "Cancelled",
        "Pending",
        "Completed",
        "Processing",
        "Failed",
        "Refunded",
      ],
      default: "Processing",
      index: true,
    },
    refund_type: {
      type: String,
      enum: ["percentage", "number", null],
      default: null,
    },
    refund_number: { type: String, default: "" },
    currency_code:{type:String,default:'IN'},
    payment_created: { type: Number, default: "" },
    amount: { type: String, default: "" },
    payment_details: { type: Object, default: {} },
    method: { type: String, default: "card" },
    failed: { type: String, default: "" },
    passed: { type: String, default: "" },
    reason: { type: String, default: "" },
    // tax: {type: Number,index:true},
    // fare: {type: Number,index:true},amount: {type: Number,index:true},
    // minimum_fare: {type: Number,index:true},
    // price_per_km: {type: Number,index:true}
  },
  { timestamps: true }
);

PaymentSchema.statics = {
  async create(data) {
    var obj = {
      bookingId: data.bookingId,
      bookingLogId: data.bookingLogId,
      walletId: data.walletId,
      userId: data.userId,
      passId: data.passId ? mongoose.Types.ObjectId(data.passId) : null,
      orderId: data.orderId,
      payment_type:data.payment_type,
      payment_status: data.payment_status,
      method: data.method,
      is_pass: data.is_pass ? data.is_pass : false,
      total_pass_amount: data.total_pass_amount ? data.total_pass_amount : 0,
      amount: data.amount,
      title: data.title,
      type: data.type,
    };

    if (await this.exists({ orderId: data.orderId })) {
      return await this.findOneAndUpdate({ orderId: data.orderId }, obj, {
        new: true,
      });
    } else {
      return await new this(obj).save();
    }
  },
  formattedData(data) {
    const selectableItems = [];
    data.forEach((item) => {
      selectableItems.push({
        //   id: item._id,
        title: item.title,
        status: item.type == 0 ? "credit" : "debit",
        type: item.type,
        payment_status: item.payment_status,
        method: item.method,
        amount: item.amount,
        payment_created: moment(item.createdAt)
          .tz("Asia/kolkata")
          .format("DD MMM YYYY"),
      });
    });
    return selectableItems;
  },
  formattedBookingData(data) {
    const selectableItems = [];
    data.forEach((item) => {
      selectableItems.push({
        //   id: item._id,
        title: item.title,
        status: item.type == 0 ? "credit" : "debit",
        type: item.type,
        payment_status: item.payment_status,
        method: item.method,
        amount: item.is_pass ? item.total_pass_amount : item.amount,
        is_pass: item.is_pass,
        no_of_pasess: item.passId ? item.passId.no_of_rides : 0,
        payment_created: moment(item.createdAt)
          .tz("Asia/kolkata")
          .format("DD MMM YYYY"),
        booking_details: item.bookingId
          ? this.bookingDetail(item.bookingId)
          : [],
      });
    });
    return selectableItems;
  },
  bookingDetail(data) {
    const selectableItems = [];
    data.forEach((item) => {
      selectableItems.push({
        //   id: item._id,
        pnr_no: item.pnr_no,
        seat_nos: _.join(item.seat_nos, ","),
        travel_status: item.travel_status,
        booking_date: moment(item.booking_date)
          .tz("Asia/Kolkata")
          .format("DD-MM-YYYY"),
        start_time: item.start_time,
        start_date: item.start_date,
        drop_date: item.drop_date,
        drop_time: item.drop_time,
        route_name: item.routeId ? item.routeId.title : "-",
        pickup_name: item.pickupId ? item.pickupId.title : "-",
        dropoff_title: item.dropoffId ? item.dropoffId.title : "-",
        bus_detail: item.busId
          ? {
              code: item.busId.code,
              name: item.busId.name,
              brand: item.busId.brand,
              model_no: item.busId.model_no,
              chassis_no: item.busId.chassis_no,
              reg_no: item.busId.reg_no,
            }
          : {},

        // title: item.title,
        // status: (item.type == 0) ? 'credit' : 'debit',
        // type: item.type,
        // payment_status: item.payment_status,
        // method: item.method,
        // amount: item.amount,
        // payment_created: moment(item.createdAt).tz('Asia/kolkata').format('DD MMM YYYY'),
      });
    });
    return selectableItems;
  },
};

PaymentSchema.plugin(require("@hilarion/mongoose-activity-logger"));

module.exports = mongoose.model("Payment", PaymentSchema);
