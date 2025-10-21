const mongoose = require('mongoose');
const { omitBy, isNil } = require('lodash');
const bcrypt = require('bcryptjs');
const moment = require('moment-timezone');
const mongoosePaginate = require('mongoose-paginate-v2');

/**
 * Operator Schema
 * @private
 */
const operatorSchema = new mongoose.Schema({
    // Company Information
    companyName: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    companyCode: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
        index: true,
    },
    businessType: {
        type: String,
        enum: ['Private', 'Government', 'Semi-Government', 'Cooperative'],
        default: 'Private',
    },
    
    // Contact Information
    email: {
        type: String,
        match: /^\S+@\S+\.\S+$/,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    phone: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    countryCode: {
        type: String,
        default: "91",
    },
    alternatePhone: {
        type: String,
        trim: true,
    },
    
    // Address Information
    address: {
        street: { type: String, default: "" },
        city: { type: String, default: "" },
        state: { type: String, default: "" },
        pincode: { type: String, default: "" },
        country: { type: String, default: "India" },
        coordinates: {
            type: { type: String, default: "Point" },
            coordinates: [Number], // [longitude, latitude]
        },
    },
    
    // Business Details
    registrationNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true,
    },
    gstNumber: {
        type: String,
        trim: true,
        index: true,
    },
    panNumber: {
        type: String,
        trim: true,
        index: true,
    },
    licenseNumber: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    licenseExpiryDate: {
        type: Date,
        required: true,
    },
    
    // Contact Person Details
    contactPerson: {
        name: { type: String, required: true },
        designation: { type: String, default: "" },
        phone: { type: String, required: true },
        email: { type: String, required: true },
    },
    
    // Documents
    documents: {
        registrationCertificate: { type: String, default: "" },
        gstCertificate: { type: String, default: "" },
        panCard: { type: String, default: "" },
        licenseDocument: { type: String, default: "" },
        insuranceDocument: { type: String, default: "" },
        permitDocument: { type: String, default: "" },
        logo: { type: String, default: "default.jpg" },
    },
    
    // Account Information
    password: {
        type: String,
        minlength: 6,
        maxlength: 128,
    },
    
    // Status and Settings
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Suspended', 'Pending'],
        default: 'Pending',
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    
    // Fleet Information
    fleetSize: {
        type: Number,
        default: 0,
    },
    maxFleetSize: {
        type: Number,
        default: 100,
    },
    
    // Commission and Payment Settings
    commissionRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
    },
    paymentTerms: {
        type: String,
        enum: ['Daily', 'Weekly', 'Monthly'],
        default: 'Weekly',
    },
    
    // Additional Information
    description: {
        type: String,
        default: "",
    },
    website: {
        type: String,
        default: "",
    },
    socialMedia: {
        facebook: { type: String, default: "" },
        twitter: { type: String, default: "" },
        instagram: { type: String, default: "" },
        linkedin: { type: String, default: "" },
    },
    
    // Device Information
    deviceToken: {
        type: String,
        default: '',
        index: true,
    },
    deviceType: {
        type: Number,
        enum: [1, 2], // 1: Android, 2: iOS
        default: 1,
    },
    deviceId: {
        type: String,
        default: '',
    },
    deviceInfo: {
        type: Object,
        default: {},
    },
    
    // Language and Preferences
    language: {
        type: String,
        enum: ["en", "ar"],
        default: "en",
    },
    
    // Timestamps
    lastLoginAt: {
        type: Date,
    },
    verifiedAt: {
        type: Date,
    },
}, {
    timestamps: true,
});

// Index for geospatial queries
operatorSchema.index({ "address.coordinates": "2dsphere" });

/**
 * Pre-save middleware
 */
operatorSchema.pre('save', async function save(next) {
    try {
        if (!this.isModified('password')) return next();
        

            const rounds = process.env.NODE_ENV === 'test' ? 1 : 12;
            const hash = await bcrypt.hash(this.password, rounds);
            this.password = hash;
        
        return next();
    } catch (error) {
        return next(error);
    }
});

/**
 * Instance Methods
 */
operatorSchema.methods = {
    transform() {
        const transformed = {};
        const fields = [
            'id', 'companyName', 'companyCode', 'businessType', 'email', 'phone', 
            'countryCode', 'address', 'registrationNumber', 'gstNumber', 'panNumber',
            'licenseNumber', 'licenseExpiryDate', 'contactPerson', 'documents',
            'status', 'isVerified', 'fleetSize', 'maxFleetSize', 'commissionRate',
            'paymentTerms', 'description', 'website', 'socialMedia', 'language',
            'createdAt', 'updatedAt', 'lastLoginAt', 'verifiedAt'
        ];

        fields.forEach((field) => {
            if (field === 'documents' && this.documents) {
                transformed[field] = {
                    ...this.documents,
                    logo: this.isValidURL(this.documents.logo) 
                        ? this.documents.logo 
                        : `${process.env.BASE_URL}public/operators/logo/${this.documents.logo}`,
                };
            } else {
                transformed[field] = this[field];
            }
        });

        return transformed;
    },

    async passwordMatches(password) {
        return bcrypt.compare(password, this.password);
    },

    isValidURL(str) {
        const regex = /(http|https):\/\/(\w+:{0,1}\w*)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/;
        return regex.test(str);
    },
};

/**
 * Static Methods
 */
operatorSchema.statics = {
    /**
     * Transform operator data for listing
     */
    transformData(rows) {
        const selectableItems = [];
        let i = 1;
        rows.forEach((item) => {
            selectableItems.push({
                id: i++,
                ids: item._id,
                companyName: item.companyName,
                companyCode: item.companyCode,
                businessType: item.businessType,
                email: item.email,
                phone: item.phone,
                contactPerson: item.contactPerson.name,
                fleetSize: item.fleetSize,
                maxFleetSize: item.maxFleetSize,
                status: item.status,
                isVerified: item.isVerified ? 'Verified' : 'Not Verified',
                createdAt: moment.utc(item.createdAt).tz("Asia/Kolkata").format("DD MMM YYYY"),
                licenseExpiryDate: moment.utc(item.licenseExpiryDate).tz("Asia/Kolkata").format("DD MMM YYYY"),
            });
        });
        return selectableItems;
    },

    /**
     * List operators with pagination and filtering
     */
    list({
        page = 1,
        perPage = 30,
        companyName,
        companyCode,
        businessType,
        status,
        isVerified,
    }) {
        const options = omitBy({
            companyName: companyName ? new RegExp(companyName, 'i') : undefined,
            companyCode: companyCode ? new RegExp(companyCode, 'i') : undefined,
            businessType,
            status,
            isVerified,
            isDeleted: false,
        }, isNil);

        return this.find(options)
            .sort({ createdAt: -1 })
            .skip(perPage * (page - 1))
            .limit(perPage)
            .exec();
    },

    /**
     * Find operator by email and generate token
     */
    async findAndGenerateToken(options) {
        const { email, password } = options;
        
        if (!email) {
            throw new Error('An email is required to generate a token');
        }

        const operator = await this.findOne({ email, isDeleted: false }).exec();
        
        if (!operator) {
            throw new Error('Operator not found');
        }

        if (password) {
            if (await operator.passwordMatches(password)) {
                return {
                    operator,
                    accessToken: operator.token(),
                };
            }
            throw new Error('Incorrect email or password');
        }
        
        throw new Error('Password is required');
    },

    /**
     * Check for duplicate email
     */
    checkDuplicateEmail(error) {
        if (error.name === 'MongoError' && error.code === 11000) {
            return new Error('Email already exists');
        }
        return error;
    },

    /**
     * Check for duplicate company code
     */
    checkDuplicateCompanyCode(error) {
        if (error.name === 'MongoError' && error.code === 11000) {
            return new Error('Company code already exists');
        }
        return error;
    },

    /**
     * Check for duplicate registration number
     */
    checkDuplicateRegistrationNumber(error) {
        if (error.name === 'MongoError' && error.code === 11000) {
            return new Error('Registration number already exists');
        }
        return error;
    },

    /**
     * Generate a secure random password
     */
    generateSecurePassword(length = 12) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
    },
};

// Add pagination plugin
operatorSchema.plugin(mongoosePaginate);

// Add activity logger plugin
operatorSchema.plugin(require('@hilarion/mongoose-activity-logger'));

/**
 * @typedef Operator
 */
module.exports = mongoose.model('Operator', operatorSchema);
