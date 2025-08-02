const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const bcrypt = require("bcryptjs");
const timezoneHelpers = require("../helpers/timezone");
const moment = require("moment-timezone");

const UserSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      default: "",
    },
    lastname: {
      type: String,
      default: "",
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Male",
    },
    email: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    is_mobile_verified: { type: Boolean, default: false },
    country_code: { type: String, default: "91" },
    password: {
      type: String,
      minlength: 8,
    },
    otp: {
      type: Number,
      default: 0,
    },
    device_token: {
      type: String,
      default: "",
      index: true,
    },
    device_type: { type: Number, enum: [1, 2], default: 1 },
    device_id: { type: String, default: "" },
    device_info: { type: Object, default: {} },
    refercode: {
      type: String,
      trim: true,
      unique: true,
    },
    referedby: {
      type: String,
      trim: true,
    },
    mode: {
      type: String,
      default: "",
    },
    social_id: {
      type: String,
      default: "",
    },
    ProfilePic: {
      type: String,
      default: "default.jpg",
    },
    ip: { type: String, default: "0.0.0.0" },
    language: { type: String, enum: ["en", "ar"], default: "en" },
    is_deleted: { type: Boolean, default: false },
    status: { type: Boolean, default: true },
    places: {
      home: {
        address: {
          type: String,
          default: "",
          index: true,
        },
        type: {
          type: String,
          default: "Point",
        },
        coordinates: {
          type: [Number],
          default: [],
        },
        timing: {
          type: Date,
          default: "",
        },
      },
      office: {
        address: {
          type: String,
          default: "",
          index: true,
        },
        type: {
          type: String,
          default: "Point",
        },
        coordinates: {
          type: [Number],
          default: [],
        },
        timing: {
          type: Date,
          default: "",
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.virtual("wallets", {
  ref: "Wallet", // the model to use
  localField: "_id", // find children where 'localField'
  foreignField: "users", // is equal to foreignField
  justOne: true,
});

UserSchema.virtual("userreferrals", {
  ref: "User_Referral", // the model to use
  localField: "_id", // find children where 'localField'
  foreignField: "userId", // is equal to foreignField
  justOne: false,
});

UserSchema.plugin(uniqueValidator);

UserSchema.pre("save", function (next) {
  let user = this;

  if (!user.isModified("password")) {
    return next();
  }

  bcrypt
    .genSalt(12)
    .then((salt) => {
      return bcrypt.hash(user.password, salt);
    })
    .then((hash) => {
      user.password = hash;
      next();
    })
    .catch((err) => next(err));
});

UserSchema.statics.formatedData = function (user) {
  return {
    firstname: user.firstname,
    lastname: user.lastname,
    gender: user.gender,
    email: user.email,
    phone: user.phone,
    otp: user.otp,
    id: user._id,
    refercode: user.refercode,
    country_code: user.country_code,
    ProfilePic: this.isValidURL(user.ProfilePic)
      ? user.ProfilePic
      : `${process.env.BASE_URL}public/users/profiles/${user.ProfilePic}`,
    home_address: user.places.home.address ? user.places.home.address : "",
    home_lat: user.places.home.coordinates
      ? user.places.home.coordinates[1]
      : 0.0,
    home_lng: user.places.home.coordinates
      ? user.places.home.coordinates[0]
      : 0.0,
    home_timing: user.places.home.timing
      ? moment(user.places.home.timing).format("hh:mm a")
      : "",
    office_timing: user.places.office.timing
      ? moment(user.places.office.timing).format("hh:mm a")
      : "",
    office_address: user.places.office.address
      ? user.places.office.address
      : "",
    office_lat: user.places.office.coordinates
      ? user.places.office.coordinates[1]
      : 0.0,
    office_lng: user.places.office.coordinates
      ? user.places.office.coordinates[0]
      : 0.0,
  };
};

UserSchema.statics.isValidURL = (str) => {
  const regex =
    /(http|https):\/\/(\w+:{0,1}\w*)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/;
  if (!regex.test(str)) {
    return false;
  }
  return true;
};

UserSchema.plugin(require("@hilarion/mongoose-activity-logger"));

module.exports = mongoose.model("User", UserSchema);
