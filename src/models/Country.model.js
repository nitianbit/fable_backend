const mongoose = require('mongoose');
const moment = require('moment-timezone');
/**
 * City Schema
 * @private
 */

const countrySchema = new mongoose.Schema({
  name: {
    type: String, index: true, trim: true, default: '',
  },
  short_name: {
    type: String, index: true, trim: true, default: '',
  },
  phone_code:{type:String,default:"91"},
  status: { type: Boolean, index: true },
  is_deleted: { type: Boolean, default: false },
}, {
  timestamps: true,
});


countrySchema.statics = {
  transform() {
    const transformed = {};
    const fields = [
      'id',
      'name',
      'short_name',
      'phone_code',
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
        short_name: item.short_name,
        phone_code:item.phone_code,
        status: item.status,
        createdAt: moment
          .utc(item.createdAt)
          .tz('Asia/Kolkata')
          .format('DD MMM YYYY'),
      });
    });
    return selectableItems;
  },
};



/**
 * @typedef Country
 */
module.exports = mongoose.model('Country', countrySchema);
