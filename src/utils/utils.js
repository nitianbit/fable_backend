const {
  Setting,
  Wallet,
  Payment,
  Session,
  User,
  Pass,
  BookingAssign,
  PaymentGateway,
} = require("../models");
const { HelperTimeZone } = require("../helpers");
const Razorpay = require("razorpay");
const axios = require("axios");
const moment = require("moment-timezone");
const qr = require("qr-image");

const paymentGateway = async (site) => {
  try {
    const getPayment = await PaymentGateway.find({ site });
    const convertedObject = {};

    getPayment.forEach((item) => {
      convertedObject[item.name] = item.value;
    });
    return convertedObject;
  } catch (err) {
    return err;
  }
};

const sendOTPTextLocal = async (phone, OTP) => {
  const getsetting = await getSetting();
  if (getsetting.sms && getsetting.sms.is_production == true) {
    const senderID = encodeURI(getsetting.sms.senderId);
    const apiKey = getsetting.sms.apiKey;
    const number = encodeURI(phone);
    //Welcome to Ferri Shuttle. %%|otp^{"inputtype" : "text","maxlength" : "5"}%% is the ACCOUNT PASSWORD for your account. DO NOT SHARE with anyone.
    const message = encodeURIComponent(
      `Welcome to Ferri Shuttle. ${OTP} is the ACCOUNT PASSWORD for your account. DO NOT SHARE with anyone.`
    );
    const params = `apikey=${apiKey}&numbers=${number}&sender=${senderID}&message=${message}`;
    const BaseURL = `https://api.textlocal.in/send/?${params}`;
    const response = await axios.get(BaseURL); // axios send sms
    if (response) {
      return true;
    }
    return false;
  } else {
    return false;
  }
};

const configRazorPay = async () => {
  const getsetting = await getSetting();
  const ferriOrderId = generateOrderID("Ferri");
  if (getsetting.payments) {
    const is_production = getsetting.payments.is_production;
    var status = "";
    if (is_production) {
      // is_production is true  
      status = "LIVE";
      let razor = new Razorpay({
        key_id: getsetting.payments.key, // process.env.RAZOR_KEY_ID,
        key_secret: getsetting.payments.secret, // process.env.RAZOR_KEY_SECRET,
      });
      return {
        status,
        payment_settings: getsetting.payments,
        razor,
        ferriOrderId,
      };
    } else {
      status = "TEST";
      let razor = new Razorpay({
        key_id: getsetting.payments.key, // process.env.RAZOR_KEY_ID,
        key_secret: getsetting.payments.secret, // process.env.RAZOR_KEY_SECRET,
      });
      return {
        status,
        payment_settings: getsetting.payments,
        razor,
        ferriOrderId,
      };
    }
  }
};

function generateOrderID(type) {
  const rand = Math.floor(1000000000 + Math.random() * 9999999999);
  if (type) {
    const name =
      type.charAt(0).toUpperCase() +
      "" +
      type.charAt(1).toUpperCase() +
      "" +
      type.charAt(2).toUpperCase();
    return name + rand;
  }
  return rand;
}

const initSession = async (phone, userId, walletId, onModel) => {
  const expiresIn = await HelperTimeZone.setExpiredTime(25, "days"); //"hours" //"minutes"

  const token = await Session.generateToken(userId, walletId, expiresIn);
  const csrfToken = await Session.generateCsrf();
  if (onModel == "User") {
    const session = new Session({
      token,
      csrfToken,
      phone,
      userId,
      walletId,
      expiresIn,
      onModel,
    });
    await session.save();
    return session;
  } else {
    const session = new Session({
      token,
      csrfToken,
      phone,
      userId,
      expiresIn,
      onModel,
    });
    await session.save();
    return session;
  }
};

const verifyToken = async (token) => {
  const decodeToken = await Session.verifyToken(token);
  await Session.expireAllTokensForUser(decodeToken.userId);
};

const refreshToken = async (phone, csrf, onModel) => {
  try {
    const refreshObject = await Session.findOneAndRemove({
      phone: phone,
      csrfToken: csrf,
    });
    if (refreshObject) {
      const userId = refreshObject.userId;
      const walletId = refreshObject.walletId;
      const onModel = refreshObject.onModel;
      const expiresIn = await HelperTimeZone.setExpiredTime(30, "days");
      const token = await Session.generateToken(userId, walletId, expiresIn);
      const csrfToken = await Session.generateCsrf();
      const session = new Session({
        token,
        csrfToken,
        phone,
        userId,
        walletId,
        expiresIn,
        onModel,
      });
      await session.save();
      return session;
    }
  } catch (err) {
    return err;
  }
};

const refreshDriverToken = async (phone, csrf, onModel) => {
  try {
    const refreshObject = await Session.findOne({
      phone: phone,
      csrfToken: csrf,
    });

    if (refreshObject) {
      const userId = refreshObject.userId;
      const onModel = refreshObject.onModel;
      const expiresIn = await HelperTimeZone.setExpiredTime(20, "days");
      const token = await Session.generateDriverToken(userId, expiresIn);
      const csrfToken = await Session.generateCsrf();
      const session = new Session({
        token,
        csrfToken,
        phone,
        userId,
        expiresIn,
        onModel,
      });
      await session.save();
      await Session.deleteOne({ _id: refreshObject._id });
      return session;
    }
  } catch (err) {
    return err;
  }
};

const updateReferAmount = async (amount, date, reffby, referFrom) => {
  try {
    const newcredit = {
      amount: amount,
      status: false,
      date_of_reg: new Date(),
      date_of_exp: date,
      referedto: referFrom,
    };
    if (await Wallet.exists({ refercode: reffby })) {
      const cref = await Wallet.updateOne(
        { refercode: reffby },
        { $push: { credit: [newcredit] } }
      );
      return cref;
    }
  } catch (err) {
    return err;
  }
};

const getSetting = async () => {
  try {
    return await Setting.findOne({}).sort({ _id: -1 }).limit(1);
  } catch (err) {
    return err;
  }
};

const isEmail = (email) => {
  if (typeof email !== "string") {
    return false;
  }
  const emailRegex =
    /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
  return emailRegex.test(email);
};

const isPhone = (phone) => {
  if (typeof phone !== "string") {
    return false;
  }
  const phoneRegex = /^[7-9]\d{9}$/;
  return phoneRegex.test(phone);
};

const generatingOTP = (min, max) => {
  return Math.floor(max + Math.random() * min);
};

// const referMoney = async(referedby) => {
//     const wallet = await Wallet.findOne({ refercode: referedby });
//     wallet.money = wallet.money + 20;
//     await wallet.save();
// };

const findDistance = (pickup, drop) => {
  const dlongitude = radians(drop[0] - pickup[0]);
  const dlatitude = radians(drop[1] - pickup[1]);
  const a =
    Math.sin(dlatitude / 2) * Math.sin(dlatitude / 2) +
    Math.cos(radians(pickup[1])) *
      Math.cos(radians(drop[1])) *
      Math.sin(dlongitude / 2) *
      Math.sin(dlongitude / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = 6371 * c;
  return distance;
};

const radians = (deg) => {
  const tau = 2 * Math.PI;
  return (deg * tau) / 360;
};

const findDuration = (T2, T1) => {
  return minTostr(strTomin(T2) - strTomin(T1));
};

const strTomin = (t) => {
  const s = t.split(":");
  return Number(s[0]) * 60 + Number(s[1]);
};

const minTostr = (t) => {
  return Math.trunc(t / 60) + ":" + ("00" + (t % 60)).slice(-2);
};

const findTotalFare = (X, k, y, tax, f) => {
  const Y = k * y;
  const P = tax / 100;
  const XY = X + Y;
  const Z = (XY * P + f).toFixed(2);
  const total = parseFloat(XY) + parseFloat(Z);
  return {
    total: total,
    tax: Z,
  };
};

const findBaseFare = (X, k, y) => {
  const Y = k * y;
  const XY = X + Y;
  return parseFloat(XY);
};

const referCode = (length, phone) => {
  let result = "";
  let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" + phone;
  let charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

/****
 * * X minium fare
 * * k distance
 *   y rate per km
 * * Y = ky
 * * tax
 * * fee
 * * pass
 * * r no of rides
 * rdiscount
 * ****/
const findTotalPassFare = (X, k, y, tax, fee, r, rdiscount) => {
  const Y = k * y;
  const p = parseInt(fee) + parseInt(tax) / 100;
  const T = parseFloat((X + Y) * p).toFixed(2);
  const total = X + Y - parseFloat(((X + Y) * r) / rdiscount) + parseFloat(T);
  return { total: Math.round(total), tax: T };
};

const joinDateTime = (time) => {
  const timing = time;
  const currentDate = moment().format("YYYY-MM-DD");
  const datetime = new Date(currentDate + " " + timing);
  return moment(datetime);
};

const getPassLists = async (minimum_fare, distance, tax, fee) => {
  try {
    var totalPassFares = [];
    const getleastPass = await Pass.find({ status: true }).lean();
    for (let pass of getleastPass) {
      const pass_price_per_km = parseFloat(pass.price_per_km);
      const pass_no_of_rides = parseInt(pass.no_of_rides);
      const pass_no_of_valid_days = parseInt(pass.no_of_valid_days);
      const pass_terms = pass.terms;
      const pass_description = pass.description;
      const pass_discount = parseInt(pass.discount);

      let rdiscount = hasOneDigit(pass_discount)
        ? pass_discount * 100
        : pass_discount * 10;
      let totalsingleFare = "";
      if (pass_no_of_rides == 7) {
        //  rdiscount = 100;
        totalsingleFare = await findTotalPassFare(
          minimum_fare,
          distance,
          pass_price_per_km,
          tax,
          fee,
          pass_no_of_rides,
          rdiscount
        );
      } else if (pass_no_of_rides == 15) {
        // rdiscount = 150;
        totalsingleFare = await findTotalPassFare(
          minimum_fare,
          distance,
          pass_price_per_km,
          tax,
          fee,
          pass_no_of_rides,
          rdiscount
        );
      } else if (pass_no_of_rides == 30) {
        // rdiscount = 200;
        totalsingleFare = await findTotalPassFare(
          minimum_fare,
          distance,
          pass_price_per_km,
          tax,
          fee,
          pass_no_of_rides,
          rdiscount
        );
      }

      totalPassFares.push({
        passId: pass._id,
        pass_no_of_rides,
        totalsingleFare: totalsingleFare.total,
        totalFare: totalsingleFare.total * pass_no_of_rides,
        totalTaxAmount: totalsingleFare.tax * parseFloat(pass_no_of_rides),
        pass_no_of_valid_days,
        pass_terms,
        pass_description,
      });
    }
    return totalPassFares;
  } catch (err) {
    return "err while :" + err;
  }
};

//const WEEKEND = [moment().tz(DEFAULT_TIMEZONE).day("Sunday").weekday(),moment().day("Saturday").weekday()]

const addBusinessDays1 = (currentDate, date, daysToAdd) => {
  var daysAdded = 0;
  var momentDate;
  if (currentDate === date) {
    momentDate = moment(new Date(date)).tz(DEFAULT_TIMEZONE);
  } else {
    const changeDate = moment(date)
      .subtract(1, "days")
      .tz(DEFAULT_TIMEZONE)
      .format("YYYY-MM-DD");
    momentDate = moment(new Date(changeDate)).tz(DEFAULT_TIMEZONE);
  }
  // momentDate = moment(new Date(date)).tz("Asia/kolkata");
  const WEEKEND = HelperTimeZone.weekend();
  while (daysAdded < daysToAdd) {
    momentDate = momentDate.add(1, "days");
    if (!WEEKEND.includes(momentDate.weekday())) {
      daysAdded++;
    }
  }
  return momentDate;
};

function hasOneDigit(val) {
  return String(Math.abs(val)).charAt(0) == val;
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function getSum(array, column) {
  if (array.length > 0) {
    let values = array.map((item) => parseInt(item[column]) || 0);
    return values.reduce((a, b) => a + b).toString();
  }
  return "0";
}

async function bookingtransformData(data) {
  try {
    var selectableItems = [];
    var png_string = '';
    for (const item of data) {
      var booking_assign = {}
      if (item.travel_status === "SCHEDULED"  || item.travel_status === "ONBOARDED") {
           const picture = item.userId.ProfilePic ? item.userId.ProfilePic : "default.jpg";
		
		const qrData = {
          final_total_fare: item.final_total_fare,
          pnr_no: item.pnr_no,
          seat_nos: item.seat_nos,
          travel_status: item.travel_status,
          bus_name: item.busId.name,
          bus_model_no: item.busId.model_no,
		  bus_depature_date: moment(item.bus_depature_date).tz(DEFAULT_TIMEZONE).format('YYYY-MM-DD'),
          passengers: item.passengers,
		   passengerdetails: item.passengerdetails.map((item) => {
            return {
              fullname: item.fullname,
              age: item.age,
              gender: item.gender,
              seat: extractContentInsideBrackets(item.seat),
            };
          }),
          has_return: item.has_return ? "NO" : "YES",
          firstname: item.userId.firstname,
          lastname: item.userId.lastname,
          phone: item.userId.phone,
		  profile_picture: (await User.isValidURL(item.userId.ProfilePic))
            ? item.userId.ProfilePic
            : `${process.env.BASE_URL}public/users/profiles/${picture}`,
          payment_method:item.payments ? item.payments.method : ''
        }
        png_string = qr.imageSync(JSON.stringify(qrData), {
          type: "svg"
        });

      } else {

        png_string = '';
      }

    const paymentExists = await Payment.exists({bookingId:{$in:[item._id]}})
      if(paymentExists){
		  
      const OBj = {
        //id: item._id,
		passengerdetails: item.passengerdetails.map((item) => {
            return {
              fullname: item.fullname,
              age: item.age,
              gender: item.gender,
              seat: extractContentInsideBrackets(item.seat),
            };
          }),
        travel_status: item.travel_status,
        seat_nos: item.seat_nos,
        has_return: item.has_return ? "1" : "2",
        start_time: item.start_time,
        start_date: item.start_date,
        drop_date: item.drop_date ? item.drop_date : "",
        drop_time: item.drop_time ? item.drop_time : "",
        sub_total: item.sub_total,
        discount: item.discount ? item.discount : "0",
        bus_depature_date: item.bus_depature_date,
        tax_percent: item.tax,
        tax: item.tax_amount,
        fee: item.fee,
        final_total_fare: item.final_total_fare,
        pnr_no: item.pnr_no,
        passengers: item.passengers,
        routeId: item.routeId ? item.routeId._id : '-',
        route_name: item.routeId ? item.routeId.title :'-',
        pickupId: item.pickupId ? item.pickupId._id : '-',
        pickup_name: item.pickupId ? item.pickupId.title: '-',
        dropoffId: item.dropoffId ? item.dropoffId._id : '-',
        drop_name: item.dropoffId ? item.dropoffId.title : '-',
        busId: item.busId._id,
        bus_name: item.busId.name,
        bus_model_no: item.busId.reg_no,
        png_string: png_string.toString('base64')
      }
	  
	      if (item.travel_status === "COMPLETED"){
			OBj.invoice_url =  `${process.env.BASE_URL}api/users/invoice/${item.pnr_no}`;
		  }else{
			  OBj.invoice_url =  '';
		  }

	     if(item.routeId){
			const getdata = await checkDriver(item.routeId._id, item.bus_depature_date, item.travel_status);
		  if (getdata) {
			OBj.booking_assign = getdata
		  } else {
			OBj.booking_assign = {}
		  }
		}else{
			OBj.booking_assign = {}
		}
      selectableItems.push(OBj);
	  }
    };
    return selectableItems;
  } catch (err) {
    console.log("err",err)
    return [];
  }

}

/***
 * extrack bracket from string
 * **/
function extractContentInsideBrackets(inputString) {
  const startIndex = inputString.indexOf("[");
  const endIndex = inputString.indexOf("]");
  
  if (startIndex !== -1 && endIndex !== -1) {
    return inputString.substring(startIndex + 1, endIndex);
  } else {
    return inputString;
  }
}



async function checkDriver(routeId, tripDateTime, travel_status) {
  try {
    const currentDate = moment(tripDateTime)
      .tz(DEFAULT_TIMEZONE)
      .format("YYYY-MM-DD");
    const endDate = moment(tripDateTime).tz(DEFAULT_TIMEZONE).endOf("day");
    if (
      await BookingAssign.exists({
        routeId,
        date_time: { $gte: new Date(currentDate), $lte: new Date(endDate) },
      })
    ) {
      const getData = await BookingAssign.findOne({
        routeId,
        date_time: { $gte: new Date(currentDate), $lte: new Date(endDate) },
      })
        .populate({ path: "driverId", select: "firstname lastname phone" })
        .lean();
      if (getData) {
        if (travel_status === "SCHEDULED" || travel_status === "ONBOARDED") {
          return {
            driver_fullname:
              getData.driverId.firstname + " " + getData.driverId.lastname,
            driver_phone: getData.driverId.phone,
          };
        } else {
          return {};
        }
      } else {
        return {};
      }
    } else {
      return {};
    }
  } catch (err) {
    return false;
  }
}

function convertDateTimeToSec(date, time) {
  //'2022-05-16 09:34 AM'
  const curentTime = moment(new Date(date + " " + time))
    .tz(DEFAULT_TIMEZONE)
    .format("HH:mm:ss A");
  const convertSec = moment(curentTime, "HH:mm:ss: A").diff(
    moment().startOf("day"),
    "seconds"
  );
  return convertSec;
}

function transformRouteData(currentDate, data) {
  const selectableItems = [];
  data.forEach((item) => {
    const pickupTime = convertDateTimeToSec(
      currentDate,
      item.pickup_stop_departure_time
    );
    const dropTime = convertDateTimeToSec(
      currentDate,
      item.drop_stop_arrival_time
    );
    if (pickupTime <= dropTime) {
      var hold;
      if (item.drop_stop_order > item.pickup_stop_order) {
        hold = item.drop_stop_order - item.pickup_stop_order; // 4 -1 3
      } else {
        hold = item.pickup_stop_order - item.drop_stop_order;
      }

      selectableItems.push({
        routeId: item.routeId,
        route_name: item.route_name,
        route_busId: item.route_busId,
        total_of_stops: item.total_of_stops.toString(),
        route_bus_timetable: item.route_bus_timetable,
        holds: hold.toString(),
        pickup_stop_id: item.pickup_stop_id,
        pickup_stop_name: item.pickup_stop_name,
        pickup_stop_lat: item.pickup_stop_lat,
        pickup_stop_lng: item.pickup_stop_lng,
        pickup_stop_minimum_fare_pickup: item.pickup_stop_minimum_fare_pickup,
        pickup_stop_minimum_fare_drop: item.pickup_stop_minimum_fare_drop,
        pickup_stop_departure_time: item.pickup_stop_departure_time,
        pickup_distance: item.pickup_distance,
        drop_distance: item.drop_distance,
        drop_stop_id: item.drop_stop_id,
        drop_stop_id: item.drop_stop_id,
        drop_stop_name: item.drop_stop_name,
        drop_stop_order: item.drop_stop_order,
        drop_stop_lat: item.drop_stop_lat,
        drop_stop_lng: item.drop_stop_lng,
        drop_stop_minimum_fare_drop: item.drop_stop_minimum_fare_drop,
        drop_stop_price_per_km_drop: item.drop_stop_price_per_km_drop,
        drop_stop_arrival_time: item.drop_stop_arrival_time,
      });
    }
  });
  return selectableItems;
}

module.exports = {
  paymentGateway,
  hasOneDigit,
  transformRouteData,
  convertDateTimeToSec,
  bookingtransformData,
  getSum,
  capitalizeFirstLetter,
  findTotalPassFare,
  addBusinessDays1,
  getPassLists,
  joinDateTime,
  sendOTPTextLocal,
  initSession,
  refreshToken,
  refreshDriverToken,
  verifyToken,
  referCode,
  updateReferAmount,
  getSetting,
  configRazorPay,
  isEmail,
  isPhone,
  generatingOTP,
  findDistance,
  radians,
  findDuration,
  strTomin,
  minTostr,
  findTotalFare,
  findBaseFare,
};
