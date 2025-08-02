const mongoose = require('mongoose');
const {
    omitBy,
    isNil,
} = require('lodash');
const bcrypt = require('bcryptjs');
// const {
//     env,
//     jwtSecret,
//     jwtExpirationInterval,
//     FULLBASEURL
// } = require('../../config/vars');
const moment = require('moment-timezone');
const mongoosePaginate = require('mongoose-paginate-v2');


/**
 * Driver Schema
 * @private
 */
const driverSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true,
    },
    currentLocation: {
      type: { type: String, default: "Point" },
      address: { type: String, default: "" },
      angle:{type:String,default:'100'},
      coordinates: [Number],
    },
    email: {
        type: String,
        match: /^\S+@\S+\.\S+$/,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        minlength: 6,
        maxlength: 128,
    },
    firstname: {
        type: String,
        maxlength: 128,
        index: true,
        trim: true,
    },
    lastname: {
        type: String,
        maxlength: 128,
        index: true,
        trim: true,
    },
    is_mobile_verified:{type:Boolean,default:false},
    country_code:{type:String,default:"91"},
    gender:{type:String,enum:["Male","Female","Other"],default:"Male"},
    phone: {
        type: String,
        trim: true,
        index: true,
    },

    otp: {
        type: Number
    },
    picture: {
        type: String,
        trim: true,
        default: 'default.png',
    },
    language: { type: String, enum:["en","ar"], default: "en" },
    device_token:{type:String,default:'',index:true},
    device_type:{type:Number,enum:[1,2],default:1},
    device_id:{type:String,default:''},
    device_info:{type:Object,default:{}},
    document_licence: { type: String, default: 'public/documents/default.jpg' },
    document_adhar_card: { type: String, default: 'public/documents/default.jpg' },
    document_police_vertification: { type: String, default: 'public/documents/default.jpg' },
    is_deleted:{type: Boolean, default: false},
    status: { type: Boolean, default: false },
    duty_status:{type:String,enum:['ONLINE','TRACKING','OFFLINE'],default:"OFFLINE"}
}, {
    timestamps: true,
});


/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */
driverSchema.pre('save', async function save(next) {
    try {
        // if (!this.isModified('password')) return next();

        const rounds = env === 'test' ? 1 : 10;

        const hash = await bcrypt.hash(this.phone, rounds);
        this.password = hash;

        return next();
    } catch (error) {
        return next(error);
    }
});


/**
 * Methods
 */
driverSchema.method({
    transforms() {
        const transformed = {};
        const fields = ['id', 'firstname', 'lastname','gender','country_code', 'phone', 'email', 'picture', 'document_police_vertification', 'document_adhar_card', 'document_licence', 'status', 'createdAt'];

        fields.forEach((field) => {
		
			if(field == 'picture'){
				transformed[field] = 'public/drivers/profile/'+this[field];
			}
				
            transformed[field] = this[field];
        });

        return transformed;
    },


    async passwordMatches(password) {
        return bcrypt.compare(password, this.password);
    },
});


/**
 * Statics
 */
driverSchema.statics = {

	transform(row){
		return {
			"id": row._id,
			"firstname": row.firstname,
			"lastname": row.lastname,
			"gender":  row.male,
			"country_code": row.country_code,
			"phone": row.phone,
			"email": row.email,
			"picture": (this.isValidURL(row.picture)) ? row.picture : `${process.env.BASE_URL}public/drivers/profile/${row.picture}`,
			"document_police_vertification":  (this.isValidURL(row.document_police_vertification)) ? row.document_police_vertification : `${process.env.BASE_URL}public/drivers/documents/${row.document_police_vertification}`,
			"document_adhar_card": (this.isValidURL(row.document_adhar_card)) ? row.document_adhar_card : `${process.env.BASE_URL}public/drivers/documents/${row.document_adhar_card}`,
			"document_licence": (this.isValidURL(row.document_licence)) ? row.document_licence : `${process.env.BASE_URL}public/drivers/documents/${row.document_licence}`,
			"status": row.status ?  'Active' : 'Inactive'
		}
	},
    /**
     * Find driver by email and tries to generate a JWT token
     *
     * @param {ObjectId} id - The objectId of driver.
     * @returns {Promise<User, APIError>}
     */
    async findAndGenerateToken(options) {
        const {
            email,
            password,
            refreshObject,
        } = options;
        if (!email) {
            throw new APIError({
                message: 'An email is required to generate a token',
            });
        }

        const driver = await this.findOne({
            email,
        }).exec();
        const err = {
            status: httpStatus.UNAUTHORIZED,
            isPublic: true,
        };
        if (password) {
            if (driver && await driver.passwordMatches(password)) {
                return {
                    driver,
                    accessToken: driver.token(),
                };
            }
            err.message = 'Incorrect email or password';
        } else if (refreshObject && refreshObject.driverEmail === email) {
            if (moment(refreshObject.expires).isBefore()) {
                err.message = 'Invalid refresh token.';
            } else {
                return {
                    driver,
                    accessToken: driver.token(),
                };
            }
        } else {
            err.message = 'Incorrect email or refreshToken';
        }
        throw new APIError(err);
    },

    /**
     * List drivers in descending order of 'createdAt' timestamp.
     *
     * @param {number} skip - Number of drivers to be skipped.
     * @param {number} limit - Limit number of drivers to be returned.
     * @returns {Promise<User[]>}
     */
    list({
        page = 1,
        perPage,
        firstname,
        lastname,
        email,
        phone,
    }) {
        const options = omitBy({
            firstname,
            lastname,
            email,
            phone,
        }, isNil);

        return this.find(options)
            .sort({
                createdAt: -1,
            })
            .skip(perPage * (page - 1))
            .limit(perPage)
            .exec();
    },
    transformData(rows) {
        const selectableItems = [];
        let i = 1;
        rows.forEach((item) => {
            selectableItems.push({
                id: i++,
                ids: item.id,
                adminId: item.adminId,
                firstname: item.firstname,
                lastname: item.lastname,
                email: item.email,
                phone: item.phone,
                picture: (this.isValidURL(item.picture)) ? item.picture : `${FULLBASEURL}` + item.picture,
                document_licence: (this.isValidURL(item.document_licence)) ? item.document_licence : `${FULLBASEURL}` + item.document_licence,
                document_adhar_card: (this.isValidURL(item.document_adhar_card)) ? item.document_adhar_card : `${FULLBASEURL}` + item.document_adhar_card,
                document_police_vertification: (this.isValidURL(item.document_police_vertification)) ? item.document_police_vertification : `${FULLBASEURL}` + item.document_police_vertification,
                status: item.status == true ? "Active" : "Inactive",
                createdAt: moment.utc(item.createdAt).tz("Asia/Kolkata").format("DD MMM YYYY"),
            });

        });
        return selectableItems;
    },
    isValidURL(str) {
        const regex = /(http|https):\/\/(\w+:{0,1}\w*)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/;
        if (!regex.test(str)) {
            return false;
        }
        return true;

    },
    isValidBase64(str) {
        const regex = /^data:image\/(?:gif|png|jpeg|jpg|bmp|webp)(?:;charset=utf-8)?;base64,(?:[A-Za-z0-9]|[+/])+={0,2}/g;

        if (regex.test(str)) {
            return true;
        }
        return false;
    },
    /**
     * Return new validation error
     * if error is a mongoose duplicate key error
     *
     * @param {Error} error
     * @returns {Error|APIError}
     */
    checkDuplicateEmail(error) {
        if (error.name === 'MongoError' && error.code === 11000) {
            return new APIError({
                message: 'Validation Error',
                errors: [{
                    field: 'email',
                    location: 'body',
                    messages: ['"email" already exists'],
                }],
                status: httpStatus.CONFLICT,
                isPublic: true,
                stack: error.stack,
            });
        }
        return error;
    },
};


driverSchema.plugin(mongoosePaginate);

driverSchema.plugin(require('@hilarion/mongoose-activity-logger'));

/**
 * @typedef Driver
 */
module.exports = mongoose.model('Driver', driverSchema);