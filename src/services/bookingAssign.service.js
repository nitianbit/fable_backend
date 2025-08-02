const {
    User,
    Driver,
    BookingAssign,
    Booking,
    RouteStop,
    Ticket,
    DriverNotification,
  } = require("../models");
  const { user } = require("../notifications");
  const mongoose = require("mongoose");
  const moment = require("moment-timezone");
  
  const getTrips = async (driverId, current_date) => {
    try {
      const busSchedulePipeLine = [
        {
          $match: {
            $expr: { $eq: ["$busScheduleId", "$$busScheduleId"] },
          },
        },
        {
          $lookup: {
            from: "bookings",
            localField: "stopId",
            foreignField: "pickupId",
            as: "pickupBookings",
          },
        },
        {
          $lookup: {
            from: "bookings",
            localField: "stopId",
            foreignField: "dropoffId",
            as: "dropBookings",
          },
        },
        {
          $addFields: {
            pickupBookings: {
              $cond: {
                if: {
                  $anyElementTrue: {
                    $map: {
                      input: "$pickupBookings",
                      as: "booking",
                      in: {
                        $eq: [
                          "$$booking.bus_depature_date",
                          new Date(current_date),
                        ],
                      },
                    },
                  },
                },
                then: {
                  $filter: {
                    input: "$pickupBookings",
                    as: "booking",
                    cond: {
                      $and: [
                        {
                          $eq: [
                            "$$booking.bus_depature_date",
                            new Date(current_date),
                          ],
                        },
                        {
                          $eq: ["$$booking.travel_status", "SCHEDULED"],
                        },
                        {
                          $eq: ["$$booking.busscheduleId", "$$busScheduleId"],
                        },
                      ],
                    },
                  },
                },
                else: [],
              },
            },
            dropBookings: {
              $cond: {
                if: {
                  $anyElementTrue: {
                    $map: {
                      input: "$dropBookings",
                      as: "booking",
                      in: {
                        $eq: [
                          "$$booking.bus_depature_date",
                          new Date(current_date),
                        ],
                      },
                    },
                  },
                },
                then: {
                  $filter: {
                    input: "$dropBookings",
                    as: "booking",
                    cond: {
                      $and: [
                        {
                          $eq: [
                            "$$booking.bus_depature_date",
                            new Date(current_date),
                          ],
                        },
                        {
                          $eq: ["$$booking.travel_status", "SCHEDULED"],
                        },
                        {
                          $eq: ["$$booking.busscheduleId", "$$busScheduleId"],
                        },
                      ],
                    },
                  },
                },
                else: [],
              },
            },
          },
        },
        {
          $lookup: {
            from: "locations",
            localField: "stopId",
            foreignField: "_id",
            as: "location",
          },
        },
        {
          $unwind: "$location",
        },
             {
          $lookup: {
            from: "passengers",
            localField: "pickupBookings._id",
            foreignField: "bookingId",
            as: "pickup_passengers",
          },
        },
        {
          $lookup: {
            from: "passengers",
            localField: "dropBookings._id",
            foreignField: "bookingId",
            as: "drop_passengers",
          },
        },
        {
          $project: {
            _id: 0,
            stop_id: "$stopId",
            stop_name: { $ifNull: ["$location.title", "-"] },
            lat: {
              $ifNull: [
                {
                  $arrayElemAt: ["$location.location.coordinates", 1],
                },
                0,
              ],
            },
            lng: {
              $ifNull: [
                {
                  $arrayElemAt: ["$location.location.coordinates", 0],
                },
                0,
              ],
            },
            //   pickupBookings: 1,
            //     dropBookings: 1,
            pickup_bookings: {
              $map: {
                // input: "$pickupBookings",
                input: {
                  $filter: {
                    input: "$pickupBookings",
                    as: "booking",
                    cond: {
                      $or: [
                        {
                          $eq: ["$$booking.pickupId", "$stopId"],
                        },
                      ],
                    },
                  },
                },
                as: "booking",
                in: "$$booking._id",
              },
            },
            drop_bookings: {
              $map: {
                // input: "$pickupBookings",
                input: {
                  $filter: {
                    input: "$dropBookings",
                    as: "booking",
                    cond: {
                      $or: [
                        {
                          $eq: ["$$booking.dropoffId", "$stopId"],
                        },
                      ],
                    },
                  },
                },
                as: "booking",
                in: "$$booking._id",
              },
            },
            pickup_count: { $size: "$pickup_passengers" },
            drop_count: { $size: "$drop_passengers" },
        //    pickup_count: {
         //     $size: {
         //       $filter: {
         //         input: "$pickupBookings",
         //         as: "booking",
         //         cond: {
         //           $eq: ["$$booking.pickupId", "$stopId"],
         //         },
         //       },
         //     },
        //    },
         //   drop_count: {
        //      $size: {
         //       $filter: {
         //         input: "$dropBookings",
         //         as: "booking",
         //         cond: {
         //          $eq: ["$$booking.dropoffId", "$stopId"],
         //         },
        //        },
           //   },
        //    },
            departure_time: {
              $cond: {
                if: { $eq: ["$departure_time", null] },
                then: "-",
                else: {
                  $concat: [
                    {
                      $dateToString: {
                        format: "%H:%M",
                        date: "$departure_time",
                        timezone: DEFAULT_TIMEZONE, // Adjust timezone as needed
                      },
                    },
                    " ",
                    {
                      $cond: {
                        if: {
                          $gte: [
                            {
                              $hour: {
                                date: "$departure_time",
                                timezone: DEFAULT_TIMEZONE,
                              },
                            },
                            12,
                          ],
                        },
                        then: "PM",
                        else: "AM",
                      },
                    },
                  ],
                },
              },
            },
            arrival_time: {
              $cond: {
                if: { $eq: ["$arrival_time", null] },
                then: "-",
                else: {
                  $concat: [
                    {
                      $dateToString: {
                        format: "%H:%M",
                        date: "$arrival_time",
                        timezone: DEFAULT_TIMEZONE, // Adjust timezone as needed
                      },
                    },
                    " ",
                    {
                      $cond: {
                        if: {
                          $gte: [
                            {
                              $hour: {
                                date: "$arrival_time",
                                timezone: DEFAULT_TIMEZONE,
                              },
                            },
                            12,
                          ],
                        },
                        then: "PM",
                        else: "AM",
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      ];
      const getData = await BookingAssign.aggregate([
        {
          $match: {
            driverId: mongoose.Types.ObjectId(driverId),
            dates: {
              $elemMatch: {
                $eq: new Date(current_date),
              },
            },
            trip_status: { $nin: ["COMPLETED", "EXPIRED"] },
          },
        },
        {
          $lookup: {
            from: "drivers",
            localField: "driverId",
            foreignField: "_id",
            as: "driver",
          },
        },
        {
          $unwind: "$driver",
        },
        {
          $lookup: {
            from: "drivers",
            localField: "assistantId",
            foreignField: "_id",
            //   let: { assistantId: "$assistantId" },
            //   pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$assistantId"] } } }],
            as: "assistant",
          },
        },
        {
          $unwind: "$assistant",
        },
        {
          $lookup: {
            from: "bus_schedules",
            //   localField: "routeId",
            //   foreignField: "_id",
            let: { busScheduleId: "$busScheduleId" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$busScheduleId"] } } },
  
              // {
              //   $lookup: {
              //     from: "buses",
              //     localField: "busId",
              //     foreignField: "_id",
              //     as: "bus",
              //   },
              // },
              // {
              //   $unwind: "$bus",
              // },
              // {
              //   $lookup: {
              //     from: "bus_layouts",
              //     localField: "bus.buslayoutId",
              //     foreignField: "_id",
              //     as: "bus_layout",
              //   },
              // },
              // {
              //   $unwind: "$bus_layout",
              // },
              // {
              //   $lookup: {
              //     from: "routes",
              //     localField: "routeId",
              //     foreignField: "_id",
              //     as: "route",
              //   },
              // },
              // {
              //   $unwind: "$route",
              // },
              // {
  
              {
                $lookup: {
                  from: "bookings",
                  localField: "_id",
                  foreignField: "busscheduleId",
                  as: "bookings",
                },
              },
              {
                $addFields: {
                  total_bookings_list: {
                    $cond: {
                      if: {
                        $eq: [
                          {
                            $size: {
                              $filter: {
                                input: "$bookings",
                                as: "booking",
                                cond: {
                                  $and: [
                                    {
                                      $eq: [
                                        "$$booking.travel_status",
                                        "SCHEDULED",
                                      ],
                                    },
                                    {
                                      $eq: [
                                        "$$booking.bus_depature_date",
                                        new Date(current_date),
                                      ],
                                    },
                                  ],
                                },
                              },
                            },
                          },
                          0,
                        ],
                      },
                      then: [],
                      else: {
                        $filter: {
                          input: "$bookings",
                          as: "booking",
                          cond: {
                            $and: [
                              { $eq: ["$$booking.travel_status", "SCHEDULED"] },
                              {
                                $eq: [
                                  "$$booking.bus_depature_date",
                                  new Date(current_date),
                                ],
                              },
                            ],
                          },
                        },
                      },
                    },
                  },
                  //
                },
              },
              {
                $facet: {
                  bookingsInfo: [
                    {
                      $match: {
                        total_bookings_list: { $ne: [] },
                      },
                    },
                    {
                      $lookup: {
                        from: "payments",
                        localField: "total_bookings_list._id",
                        foreignField: "bookingId",
                        as: "payments",
                      },
                    },
                    {
                      $match: {
                        "payments.payment_status": "Completed",
                        "payments.payment_type": {
                          $in: ["trip", "pass", "wallet"],
                        },
                      },
                    },
                    {
                      $lookup: {
                        from: "passengers",
                        localField: "total_bookings_list._id",
                        foreignField: "bookingId",
                        as: "passengers",
                      },
                    },
                    {
                      $addFields: {
                        total_bookings: { $size: "$total_bookings_list" },
                        total_passengers: { $size: "$passengers" },
                      },
                    },
                    {
                      $lookup: {
                        from: "routes",
                        localField: "total_bookings_list.routeId",
                        foreignField: "_id",
                        as: "route",
                      },
                    },
                    {
                      $unwind: "$route",
                    },
                    {
                      $lookup: {
                        from: "buses",
                        localField: "total_bookings_list.busId",
                        foreignField: "_id",
                        as: "bus",
                      },
                    },
                    {
                      $unwind: "$bus",
                    },
                    {
                      $lookup: {
                        from: "bus_layouts",
                        localField: "bus.buslayoutId",
                        foreignField: "_id",
                        as: "bus_layout",
                      },
                    },
                    {
                      $unwind: "$bus_layout",
                    },
                    // {
                    //   $lookup: {
                    //     from: "bus_schedule_locations",
                    //     let: { busScheduleId: "$_id" },
                    //     pipeline: busSchedulePipeLine,
                    //     as: "stops",
                    //   },
                    // },
                    {
                      $project: {
                        _id: 0,
                        bus_schedule_id:"$_id",
                        total_bookings: 1,
                        total_passengers: 1,
                        routeId: { $ifNull: ["$route._id", "-"] },
                        route_name: { $ifNull: ["$route.title", "-"] },
                        bus: {
                          code: { $ifNull: ["$bus.code", "-"] },
                          name: { $ifNull: ["$bus.name", "-"] },
                          brand: { $ifNull: ["$bus.brand", "-"] },
                          model_no: { $ifNull: ["$bus.model_no", "-"] },
                          chassis_no: { $ifNull: ["$bus.chassis_no", "-"] },
                          reg_no: { $ifNull: ["$bus.reg_no", "-"] },
                        },
                        total_seats: {
                          $ifNull: [{ $toInt: "$bus_layout.max_seats" }, 0],
                        },
                      },
                    },
                    {
                      $addFields: {
                        total_seat_left: {
                          $ifNull: [
                            {
                              $toInt: {
                                $subtract: ["$total_seats", "$total_passengers"],
                              },
                            },
                            0,
                          ],
                        },
                      },
                    },
                  ],
                  stopLists: [
                    {
                      $lookup: {
                        from: "bus_schedule_locations",
                        let: { busScheduleId: "$$busScheduleId" },
                        pipeline: busSchedulePipeLine,
                        as: "stops",
                      },
                    },
                    {
                      $unwind: "$stops",
                    },
                  ],
                  busSchedules: [
                  {
                      $lookup: {
                        from: "routes",
                        localField: "routeId",
                        foreignField: "_id",
                        as: "route",
                      },
                    },
                    {
                      $unwind: "$route",
                    },
                          {
                      $lookup: {
                        from: "buses",
                        localField: "busId",
                        foreignField: "_id",
                        as: "bus",
                      },
                    },
                    {
                      $unwind: "$bus",
                    },
                    {
                      $lookup: {
                        from: "bus_layouts",
                        localField: "bus.buslayoutId",
                        foreignField: "_id",
                        as: "bus_layout",
                      },
                    },
                    {
                      $unwind: "$bus_layout",
                    },
                    {
                      $project: {
                        _id:0,
                        bus_schedule_id:"$_id",
                        routeId: { $ifNull: ["$route._id", "-"] },
                        route_name: { $ifNull: ["$route.title", "-"] },
                         bus: {
                          code: { $ifNull: ["$bus.code", "-"] },
                          name: { $ifNull: ["$bus.name", "-"] },
                          brand: { $ifNull: ["$bus.brand", "-"] },
                          model_no: { $ifNull: ["$bus.model_no", "-"] },
                          chassis_no: { $ifNull: ["$bus.chassis_no", "-"] },
                          reg_no: { $ifNull: ["$bus.reg_no", "-"] },
                        },
                         total_seats: {
                          $ifNull: [{ $toInt: "$bus_layout.max_seats" }, 0],
                        },
                        time: {
                          $cond: {
                            if: { $eq: ["$departure_time", null] },
                            then: "-",
                            else: {
                              $concat: [
                                {
                                  $dateToString: {
                                    format: "%H:%M",
                                    date: "$departure_time",
                                    timezone: DEFAULT_TIMEZONE, // Adjust timezone as needed
                                  },
                                },
                                " ",
                                {
                                  $cond: {
                                    if: {
                                      $gte: [
                                        {
                                          $hour: {
                                            date: "$departure_time",
                                            timezone: DEFAULT_TIMEZONE,
                                          },
                                        },
                                        12,
                                      ],
                                    },
                                    then: "PM",
                                    else: "AM",
                                  },
                                },
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
              {
                $project: {
                  //     _id: 0,
                  stops: "$stopLists.stops",
                  bus_schedule_id:{ $arrayElemAt: ["$busSchedules.bus_schedule_id", 0] },
                  bookings_info: {
                    $ifNull: [
                      { $arrayElemAt: ["$bookingsInfo", 0] },
                      {
                        total_bookings: 0,
                        total_passengers: 0,
                        bus:{ $arrayElemAt: ["$busSchedules.bus", 0] },
                        routeId: { $arrayElemAt: ["$busSchedules.routeId", 0] },
                        route_name: { $arrayElemAt: ["$busSchedules.route_name", 0] },
                        total_seats: { $arrayElemAt: ["$busSchedules.total_seats", 0] },
                        total_seat_left:{ $arrayElemAt: ["$busSchedules.total_seats", 0] },
                      },
                    ],
                  },
                  booking_date: current_date,
                  time: { $arrayElemAt: ["$busSchedules.time", 0] },
                  
                  //timetable: 1,
                },
              },
            ],
            as: "bus_schedules",
          },
        },
  
        {
          $lookup: {
            from: "routes",
            localField: "routeId",
            foreignField: "_id",
            as: "booking_assign_route",
          },
        },
        {
          $unwind: "$booking_assign_route",
        },
        {
          $project: {
            _id: 0,
            route_name: { $ifNull: ["$booking_assign_route.title", "-"] },
            assistants: {
              firstname: { $ifNull: ["$assistant.firstname", "-"] },
              lastname: { $ifNull: ["$assistant.lastname", "-"] },
              email: { $ifNull: ["$assistant.email", "-"] },
              phone: { $ifNull: ["$assistant.phone", "-"] },
              country_code: { $ifNull: ["$assistant.country_code", "-"] },
              picture: {
                $cond: [
                  {
                    $regexMatch: {
                      input: "$assistant.picture",
                      regex: /^(http|https):\/\//,
                    },
                  },
                  "$assistant.picture",
                  {
                    $cond: [
                      {
                        $regexMatch: {
                          input: "$assistant.picture",
                          regex: /^(default):\/\//,
                        },
                      },
                      `${process.env.BASE_URL}public/drivers/profile/default.jpg`,
                      {
                        $concat: [
                          `${process.env.BASE_URL}public/drivers/profile/`,
                          "$assistant.picture",
                        ],
                      },
                    ],
                  },
                ],
              },
            },
            bus_schedules: "$bus_schedules",
            trip_status: 1,
            assignId: "$_id",
            status: 1,
          },
        },
      ]);
  
      if (getData.length > 0) {
        return getData;
      }
  
  
      // const getDataOld = await BookingAssign.findOne({
      //   driverId,
      //   trip_status: { $nin: ["COMPLETED", "EXPIRED"] },
      // })
      //   .populate({
      //     path: "routeId",
      //     select: "title routeId",
      //     populate: { path: "routestops", select: "stops" },
      //     // populate: {
      //     //     path: "bookings",
      //     //     populate: { path: "payments" },
      //     //     populate: { path: "passengerdetails" }
      //     // }
      //   })
      //   .populate({ path: "assistantId", select: "firstname lastname phone" })
      //   .populate({
      //     path: "timetables",
      //     populate: {
      //       path: "busId",
      //       select: "model_no reg_no",
      //     },
      //   })
      //   .sort({ date_time: -1 })
      //   .lean();
  
      // if (getDataOld) {
      //   return getDataOld // BookingAssign.transformData(getData);
      // }
      return false;
    } catch (err) {
      console.log(err);
      return "error while : " + err;
    }
  };
  
  const getBookingDetails = async (routeId, stopId, booking_date) => {
    try {
      const getData = await Booking.aggregate([
        {
          $match: {
            routeId: mongoose.Types.ObjectId(routeId),
            dates: {
              $elemMatch: {
                $eq: new Date(booking_date),
              },
            },
            pickupId: mongoose.Types.ObjectId(stopId),
            travel_status: "SCHEDULED",
          },
        },
        {
          $lookup: {
            from: "payments",
            localField: "bookings._id",
            foreignField: "bookingId",
            as: "payments",
          },
        },
        {
          $match: {
            "payments.payment_status": "Completed",
            "payments.payment_type": { $in: ["trip", "pass"] },
          },
        },
      ]);
  
      if (getData.length > 0) {
        return getData;
      }
    } catch (err) {
      console.log(err);
      return "error while : " + err;
    }
  };
  
  module.exports = {
    getTrips,
    getBookingDetails,
  };
  