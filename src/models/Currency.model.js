const mongoose = require('mongoose');
const { omitBy, isNil } = require('lodash');
const moment = require('moment-timezone');
/**
 * City Schema
 * @private
 */

const currencySchema = new mongoose.Schema({
  name: {
    type: String, index: true, trim: true, default: '',
  },
  code: {
    type: String, index: true, trim: true, default: '',
  },
  symbol: {
    type: String, index: true, trim: true, default: '',
  },
  rate: {
    type: String, index: true, trim: true, default: '',
  },
  status: { type: Boolean, index: true },
  default_currency: { type: Boolean, index: true, default: false },
  razorpay_currency: { type: Boolean, index: true, default: false },
  is_deleted: { type: Boolean, default: false },
}, {
  timestamps: true,
});


currencySchema.statics = {
  transform() {
    const transformed = {};
    const fields = [
      'id',
      'name',
      'code',
      'symbol',
      'status',
      'createdAt',
    ];

    fields.forEach((field) => {
      transformed[field] = this[field];
    });

    return transformed;
  },
  transformData(rows) {
    const selectableItems = [];
    let i = 1;
    rows.forEach((item) => {
      selectableItems.push({
        id: i++,
        ids: item._id,
        name: item.name,
        code: item.code,
        symbol: item.symbol,
        status: item.status,
        createdAt: moment
          .utc(item.createdAt)
          .tz('Asia/Kolkata')
          .format('DD MMM YYYY'),
      });
    });
    return selectableItems;
  },
  async defaultCurrency() {
    return await this.findOne({ default_currency: 1, status: true }).select('name code symbol rate default_currency razorpay_currency');
  },
  async defaultPaymentCurrency() {
    return await this.findOne({ razorpay_currency: true, status: true }).select('name code symbol rate default_currency razorpay_currency');
  },
};



/**
 * @typedef currency
 */
module.exports = mongoose.model('Currency', currencySchema);
