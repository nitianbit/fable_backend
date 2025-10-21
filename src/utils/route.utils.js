const {
  Setting,
  Wallet,
  Location,
  Route,
  RouteDetail,
  User,
  SearchAddress,
  Booking,
} = require("../models");
const { HelperTimeZone } = require("../helpers");
const mongoose = require("mongoose");
const { Schema } = mongoose;
const { ObjectId, ISODate } = Schema;
const moment = require("moment-timezone");

module.exports = {
  findRouteMatched: async (
    currentDate,
    pickup_long,
    pickup_lat,
    drop_long,
    drop_lat
  ) => {
    try {
      const start_point = await Location.findByCoordinates(
        pickup_long,
        pickup_lat
      );
      const end_point = await Location.findByCoordinates(drop_long, drop_lat);

      const getRouteDetail = await RouteDetail.find({
        locationId: { $in: [start_point._id, end_point._id] },
      }).lean();
      return getRouteDetail;
      //  return getRouteDetail.length > 0 ? getRouteDetail : 0;
    } catch (err) {
      return 0;
    }
  },
  findRouteNearBy: async (from, to) => {
    try {
      var location1 = await Location.nearBy(loc1.location.coordinates, 5); // near 5 km fetch data
      var location2 = await Location.nearBy(loc2.location.coordinates, 5); // near 5 km fetch data
    } catch (err) {
      res.status(401).json({
        status: false,
        message: "Location not found",
        errorMessage: err.message,
      });
    }
  },
  checkSeatAvailablity: async (
    busscheduleId,
    busId,
    seat_numbers,
    data,
    currentDate,
    endDate
  ) => {
    try {
      console.log("Checking seat availability for:", {
        busscheduleId,
        busId,
        seat_numbers,
        currentDate,
        endDate
      });

      const seatExists = await Booking.bookingExists(
        busscheduleId,
        busId,
        seat_numbers,
        currentDate,
        endDate
      );

      console.log("Found booked seats:", seatExists);

      // Ensure data is an array
      if (!Array.isArray(data)) {
        console.log("Data is not an array, returning empty arrays");
        return [[], [], [], [], [], []];
      }

      // Create deep copies of the arrays to avoid modifying original data
      const left_1 = Array.isArray(data[0]) ? JSON.parse(JSON.stringify(data[0])) : [];
      const left_2 = Array.isArray(data[1]) ? JSON.parse(JSON.stringify(data[1])) : [];
      const left_3 = Array.isArray(data[2]) ? JSON.parse(JSON.stringify(data[2])) : [];
      const right_1 = Array.isArray(data[3]) ? JSON.parse(JSON.stringify(data[3])) : [];
      const right_2 = Array.isArray(data[4]) ? JSON.parse(JSON.stringify(data[4])) : [];
      const right_3 = Array.isArray(data[5]) ? JSON.parse(JSON.stringify(data[5])) : [];

      // Helper function to update seat status
      const updateSeatStatus = (seatArray) => {
        seatArray.forEach((seat) => {
          if (seat && seat.seat_no) {
            // Check if this seat is booked
            const isBooked = seatExists.length > 0 && seatExists.includes(seat.seat_no);
            seat.seat_status = isBooked ? "booked" : "empty";
            
            // Log for debugging
            if (isBooked) {
              console.log(`Seat ${seat.seat_no} is marked as booked`);
            }
          }
        });
      };

      // Update status for all seat arrays
      updateSeatStatus(left_1);
      updateSeatStatus(left_2);
      updateSeatStatus(left_3);
      updateSeatStatus(right_1);
      updateSeatStatus(right_2);
      updateSeatStatus(right_3);

      console.log("Seat availability check completed");
      return [left_1, left_2, left_3, right_1, right_2, right_3];
    } catch (error) {
      console.error("Error in checkSeatAvailablity:", error);
      // Return original data structure in case of error
      if (!Array.isArray(data)) {
        return [[], [], [], [], [], []];
      }
      return [
        Array.isArray(data[0]) ? data[0] : [],
        Array.isArray(data[1]) ? data[1] : [],
        Array.isArray(data[2]) ? data[2] : [],
        Array.isArray(data[3]) ? data[3] : [],
        Array.isArray(data[4]) ? data[4] : [],
        Array.isArray(data[5]) ? data[5] : []
      ];
    }
  },
};
