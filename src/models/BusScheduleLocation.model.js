const mongoose = require("mongoose");
const { omitBy, isNil } = require("lodash");
const { Schema } = mongoose;
const { ObjectId } = Schema;

const BusScheduleLocationSchema = new Schema(
  {
    busScheduleId: { type: ObjectId, ref: "Bus_Schedule", required: true },
    stopId: { type: ObjectId, ref: "Location", required: true },
    departure_time: { type: Date, default: "", index: true },
    arrival_time: { type: Date, default: "", index: true },
  },
  { timestamps: true }
);

BusScheduleLocationSchema.statics = {
  async createOrUpdate(busScheduleId, dataObj) {
    try {
      // if exists update route and if stop not found then create
      dataObj.forEach(async (item) => {
        let objUpdate = {
          busScheduleId: busScheduleId,
          stopId: item.stopId,
          departure_time: item.departure_time,
          arrival_time: item.arrival_time,
        };
        if (await this.exists({ busScheduleId })) {
          await this.findOneAndUpdate(
            { busScheduleId, stopId: objUpdate.stopId },
            objUpdate,
            { new: true, upsert: true }
          );
        } else {
          await this.findOneAndUpdate(
            { busScheduleId, stopId: objUpdate.stopId },
            objUpdate,
            { new: true, upsert: true }
          );
        }
      });
    } catch (err) {
      return err;
    }
  },
};

module.exports = mongoose.model(
  "Bus_Schedule_Location",
  BusScheduleLocationSchema
);
