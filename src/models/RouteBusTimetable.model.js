const mongoose = require("mongoose");
const { omitBy, isNil } = require("lodash");
const { Schema } = mongoose;
const moment = require("moment-timezone");

const { ObjectId } = Schema;

// const stopSchema = new Schema();

const RouteBusTimetableSchema = new Schema(
  {
    busId: { type: ObjectId, ref: "Bus", required: true },
    locationId: { type: ObjectId, ref: "Location", required: true },
    departure_time:{ type: Date, default: null, index: true },
    arrival_time:{ type: Date, default: null, index: true },

  },
  { timestamps: true }
  );
  


module.exports = mongoose.model("Route_Stop_Timetable", RouteBusTimetableSchema);
