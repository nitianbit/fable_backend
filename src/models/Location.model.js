const mongoose = require("mongoose");
/**
 * Location Schema
 * @private
 */
const locationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      index: true,
      trim: true,
    },
    type: { type: String, default: "" },
    location: {
      type: { type: String, default: "Point" },
      address: { type: String, default: "" },
      coordinates: [Number],
      title: { type: String, default: "" },
    },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    status: { type: Boolean, default: true },
    files: { type: [Object] },
  },
  {
    timestamps: true,
  }
);

locationSchema.index({ location: "2dsphere" });

locationSchema.statics = {
  async nearestRouteStops(lat, lng, maxDistance) {
    return await this.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          distanceField: "distance",
          maxDistance: maxDistance,
          distanceField: "actual_distance",
          spherical: true,
          distanceMultiplier: 0.001,
          includeLocs: "loc",
        },
      },
      {
        $lookup: {
          from: "route_stops",
          localField: "_id",
          foreignField: "stopId",
          as: "stop_routes",
        },
      },
      {
        $unwind: "$stop_routes", // Optional if you expect multiple matches
      },
      // {
      //   $project: {
      //     title: 1,
      //     actual_distance: 1,
      //     type: 1,
      //   },
      // },
      {
        $group: {
          _id: "$title",
          title: {
            $first: "$title",
          },
          id: {
            $first: "$_id",
          },
          actual_distance: {
            $first: "$actual_distance",
          },
          type: {
            $first: "$type",
          },
          location: { $first: "$location" },
        },
      },
      {
        $addFields: {
          near_distance: {
            $cond: {
              if: { $lt: ["$actual_distance", 1] }, // Check if distance is less than 1 km
              then: {
                $concat: [
                  {
                    $toString: {
                      $round: [{ $multiply: ["$actual_distance", 1000] }, 2],
                    },
                  }, // Convert to meters
                  "m",
                ],
              },
              else: {
                $concat: [
                  { $toString: { $round: ["$actual_distance", 2] } },
                  "km",
                ],
              },
            },
          },
        },
      },
      { $sort: { actual_distance: 1 } },
      {
        $project: {
          _id: 0,
          id: "$id",
          title: "$title",
          type: "$type",
          near_distance: "$near_distance",
          lat: { $arrayElemAt: ["$location.coordinates", 1] },
          lng: { $arrayElemAt: ["$location.coordinates", 0] },
        },
      },
      { $limit: 5 },
    ]);
  },
  async nearestStops(lat, lng, maxDistance) {
    return await this.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          distanceField: "distance",
          maxDistance: maxDistance,
          distanceField: "actual_distance",
          spherical: true,
          distanceMultiplier: 0.001,
          includeLocs: "loc",
        },
      },
      {
        $project: {
          title: 1,
          actual_distance: 1,
          type: 1,
        },
      },
      {
        $addFields: {
          near_distance: {
            $cond: {
              if: { $lt: ["$actual_distance", 1] }, // Check if distance is less than 1 km
              then: {
                $concat: [
                  {
                    $toString: { $multiply: ["$actual_distance", maxDistance] },
                  }, // Convert to meters
                  " m",
                ],
              },
              else: {
                $concat: [{ $toString: "$actual_distance" }, " km"],
              },
            },
          },
        },
      },
      { $limit: 1 },
    ]);
  },
  transformData(data) {
    const selectableItems = [];
    data.forEach((item) => {
      selectableItems.push({
        id: item.id,
        title: item.title,
        location_address: item.location.address,
        location_latitude: item.location.coordinates[1],
        location_longitude: item.location.coordinates[0],
        city: item.city ? item.city : "",
        state: item.state ? item.state : "",
        type: "location",
      });
    });
    return selectableItems;
  },
  transformFile(data) {
    const selectableItems = [];
    if (data.length > 0) {
      data.forEach((item) => {
        selectableItems.push({
          path: item.path,
        });
      });
      return selectableItems;
    }
    return [];
  },
};

module.exports = mongoose.model("Location", locationSchema);
