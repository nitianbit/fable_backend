const mongoose = require("mongoose");
const { Schema } = mongoose;
const { ObjectId } = Schema;

// const stopSchema = new Schema();
const objectIdToTimestamp = require("objectid-to-timestamp");

const RouteStopSchema = new Schema(
  {
    routeId: { type: ObjectId, ref: "Route", required: true },
    stopId: { type: ObjectId, ref: "Location", required: true },
    order: { type: Number, default: 1 },
    minimum_fare_pickup: { type: String, default: "", index: true },
    minimum_fare_drop: { type: String, default: "", index: true },
    price_per_km_drop: { type: String, default: "", index: true },
    price_per_km_pickup: { type: String, default: "", index: true },
    // departure_time: { type: Date, default: "", index: true },
    // arrival_time: { type: Date, default: "", index: true },
  },
  { timestamps: true }
);

RouteStopSchema.statics = {
  async stopOrderValidate(pickupId, dropId) {
    // validate the order stops
    const stopIds = [...pickupId, ...dropId];
    return this.aggregate([
      {
        $match: {
          stopId: { $in: stopIds },
        },
      },
      {
        $group: {
          _id: "$routeId",
          stops: {
            $push: "$stopId",
          },
        },
      },
      {
        $project: {
          _id: 0,
          result: {
            $cond: {
              if: {
                $eq: ["$stops", stopIds],
              },
              // Check if stops are in order
              then: true,
              // Route found in desired order
              else: false, // Route not found in desired order
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          anyResultTrue: {
            $max: "$result",
          },
        },
      },
      {
        $project: {
          _id: 0,
          result: "$anyResultTrue",
        },
      },
    ]);
  },
  validateAndConvert(inputString) {
    // Remove any leading or trailing spaces
    inputString = inputString.trim();

    // Check if the inputString contains a comma
    if (inputString.includes(",")) {
      // Split the string into an array using comma as the separator
      return inputString.split(",").map((item) => item.trim());
    } else {
      // If there's no comma, convert the single item to an array
      return [inputString];
    }
  },
  formatstops(data, pickupId, dropId) {
    const selectableItems = [];
    data.forEach((item) => {
      selectableItems.push({
        id: item.id,
        name: item.location.title,
        pickup: objectIdToTimestamp(item.id) == pickupId ? true : false,
        drop: objectIdToTimestamp(item.id) == dropId ? true : false,
        lat: item.location.coordinates[1],
        lng: item.location.coordinates[0],
      });
    });
    return selectableItems;
  },
};

module.exports = mongoose.model("Route_Stop", RouteStopSchema);
