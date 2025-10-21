const { Operator } = require('../models');
const { Bus } = require('../models');
const { Driver } = require('../models');
const { Route } = require('../models');
const { Booking } = require('../models');
const moment = require('moment-timezone');

/**
 * Create a new operator
 * @param {Object} operatorData - Operator data
 * @returns {Promise<Object>} Created operator
 */
const createOperator = async (operatorData) => {
    try {
        // Generate company code if not provided
        if (!operatorData.companyCode) {
            operatorData.companyCode = generateCompanyCode(operatorData.companyName);
        }

        // Validate license expiry date
        if (operatorData.licenseExpiryDate) {
            const expiryDate = moment(operatorData.licenseExpiryDate);
            if (expiryDate.isBefore(moment())) {
                throw new Error('License expiry date cannot be in the past');
            }
        }

        const operator = new Operator(operatorData);
        const savedOperator = await operator.save();
        return savedOperator.transform();
    } catch (error) {
        throw error;
    }
};

/**
 * Get operator by ID
 * @param {String} operatorId - Operator ID
 * @returns {Promise<Object>} Operator data
 */
const getOperatorById = async (operatorId) => {
    try {
        const operator = await Operator.findById(operatorId);
        if (!operator) {
            throw new Error('Operator not found');
        }
        return operator.transform();
    } catch (error) {
        throw error;
    }
};

/**
 * Get operator by email
 * @param {String} email - Operator email
 * @returns {Promise<Object>} Operator data
 */
const getOperatorByEmail = async (email) => {
    try {
        const operator = await Operator.findOne({ email, isDeleted: false });
        if (!operator) {
            throw new Error('Operator not found');
        }
        return operator;
    } catch (error) {
        throw error;
    }
};

/**
 * Update operator
 * @param {String} operatorId - Operator ID
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>} Updated operator
 */
const updateOperator = async (operatorId, updateData) => {
    try {
        // Remove fields that shouldn't be updated directly
        const restrictedFields = ['email', 'companyCode', 'registrationNumber'];
        restrictedFields.forEach(field => delete updateData[field]);

        const operator = await Operator.findByIdAndUpdate(
            operatorId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!operator) {
            throw new Error('Operator not found');
        }

        return operator.transform();
    } catch (error) {
        throw error;
    }
};

/**
 * Delete operator (soft delete)
 * @param {String} operatorId - Operator ID
 * @returns {Promise<Boolean>} Success status
 */
const deleteOperator = async (operatorId) => {
    try {
        const operator = await Operator.findByIdAndUpdate(
            operatorId,
            { isDeleted: true, status: 'Inactive' },
            { new: true }
        );

        if (!operator) {
            throw new Error('Operator not found');
        }

        // Also deactivate all buses and drivers of this operator
        await Bus.updateMany(
            { operatorId },
            { status: false }
        );

        await Driver.updateMany(
            { operatorId },
            { status: false }
        );

        return true;
    } catch (error) {
        throw error;
    }
};

/**
 * Get operator statistics
 * @param {String} operatorId - Operator ID
 * @returns {Promise<Object>} Operator statistics
 */
const getOperatorStats = async (operatorId) => {
    try {
        const operator = await Operator.findById(operatorId);
        if (!operator) {
            throw new Error('Operator not found');
        }

        // Get fleet statistics
        const totalBuses = await Bus.countDocuments({ operatorId, status: true });
        const totalDrivers = await Driver.countDocuments({ operatorId, status: true });
        const totalRoutes = await Route.countDocuments({ operatorId, status: true });
        const totalBookings = await Booking.countDocuments({ operatorId });

        // Get recent bookings (last 30 days)
        const thirtyDaysAgo = moment().subtract(30, 'days').toDate();
        const recentBookings = await Booking.countDocuments({ 
            operatorId, 
            createdAt: { $gte: thirtyDaysAgo } 
        });

        // Get monthly booking trend (last 6 months)
        const sixMonthsAgo = moment().subtract(6, 'months').startOf('month').toDate();
        const monthlyBookings = await Booking.aggregate([
            {
                $match: {
                    operatorId: operator._id,
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);

        // Get revenue data (if payment information is available)
        const revenueData = await Booking.aggregate([
            {
                $match: {
                    operatorId: operator._id,
                    status: 'confirmed',
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalAmount' },
                    averageBookingValue: { $avg: '$totalAmount' }
                }
            }
        ]);

        return {
            operator: operator.transform(),
            fleet: {
                totalBuses,
                totalDrivers,
                totalRoutes,
                fleetUtilization: totalBuses > 0 ? (totalRoutes / totalBuses * 100).toFixed(2) : 0,
            },
            bookings: {
                total: totalBookings,
                recent: recentBookings,
                monthlyTrend: monthlyBookings,
            },
            revenue: revenueData.length > 0 ? {
                totalRevenue: revenueData[0].totalRevenue || 0,
                averageBookingValue: revenueData[0].averageBookingValue || 0,
            } : {
                totalRevenue: 0,
                averageBookingValue: 0,
            },
            lastUpdated: new Date(),
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get operator fleet details
 * @param {String} operatorId - Operator ID
 * @returns {Promise<Object>} Fleet details
 */
const getOperatorFleet = async (operatorId) => {
    try {
        const operator = await Operator.findById(operatorId);
        if (!operator) {
            throw new Error('Operator not found');
        }

        const buses = await Bus.find({ operatorId, status: true })
            .populate('bustypeId', 'name')
            .populate('buslayoutId', 'name')
            .populate('adminId', 'name email')
            .sort({ createdAt: -1 });

        const drivers = await Driver.find({ operatorId, status: true })
            .populate('adminId', 'name email')
            .sort({ createdAt: -1 });

        const routes = await Route.find({ operatorId, status: true })
            .populate('locationId', 'name')
            .sort({ createdAt: -1 });

        return {
            operator: operator.transform(),
            fleet: {
                buses: buses.map(bus => Bus.transformdata(bus)),
                drivers: drivers.map(driver => driver.transforms()),
                routes: routes.map(route => route.transform()),
            },
            summary: {
                totalBuses: buses.length,
                totalDrivers: drivers.length,
                totalRoutes: routes.length,
                activeBuses: buses.filter(bus => bus.status).length,
                activeDrivers: drivers.filter(driver => driver.status).length,
            }
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Update operator status
 * @param {String} operatorId - Operator ID
 * @param {String} status - New status
 * @returns {Promise<Object>} Updated operator
 */
const updateOperatorStatus = async (operatorId, status) => {
    try {
        const validStatuses = ['Active', 'Inactive', 'Suspended', 'Pending'];
        if (!validStatuses.includes(status)) {
            throw new Error('Invalid status');
        }

        const updateData = { status };
        if (status === 'Active') {
            updateData.isVerified = true;
            updateData.verifiedAt = new Date();
        }

        const operator = await Operator.findByIdAndUpdate(
            operatorId,
            updateData,
            { new: true }
        );

        if (!operator) {
            throw new Error('Operator not found');
        }

        return operator.transform();
    } catch (error) {
        throw error;
    }
};

/**
 * Verify operator
 * @param {String} operatorId - Operator ID
 * @param {Boolean} isVerified - Verification status
 * @returns {Promise<Object>} Updated operator
 */
const verifyOperator = async (operatorId, isVerified) => {
    try {
        const updateData = {
            isVerified,
            verifiedAt: isVerified ? new Date() : null,
            status: isVerified ? 'Active' : 'Pending'
        };

        const operator = await Operator.findByIdAndUpdate(
            operatorId,
            updateData,
            { new: true }
        );

        if (!operator) {
            throw new Error('Operator not found');
        }

        return operator.transform();
    } catch (error) {
        throw error;
    }
};

/**
 * Search operators
 * @param {Object} searchCriteria - Search criteria
 * @returns {Promise<Array>} List of operators
 */
const searchOperators = async (searchCriteria) => {
    try {
        const {
            page = 1,
            perPage = 30,
            companyName,
            businessType,
            status,
            isVerified,
            city,
            state
        } = searchCriteria;

        const query = { isDeleted: false };

        if (companyName) {
            query.companyName = { $regex: companyName, $options: 'i' };
        }

        if (businessType) {
            query.businessType = businessType;
        }

        if (status) {
            query.status = status;
        }

        if (isVerified !== undefined) {
            query.isVerified = isVerified;
        }

        if (city) {
            query['address.city'] = { $regex: city, $options: 'i' };
        }

        if (state) {
            query['address.state'] = { $regex: state, $options: 'i' };
        }

        const operators = await Operator.find(query)
            .sort({ createdAt: -1 })
            .skip(perPage * (page - 1))
            .limit(perPage);

        const total = await Operator.countDocuments(query);

        return {
            operators: operators.map(operator => operator.transform()),
            pagination: {
                page,
                perPage,
                total,
                totalPages: Math.ceil(total / perPage)
            }
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Generate company code from company name
 * @param {String} companyName - Company name
 * @returns {String} Generated company code
 */
const generateCompanyCode = (companyName) => {
    const words = companyName.trim().split(' ');
    let code = '';
    
    if (words.length === 1) {
        code = words[0].substring(0, 3).toUpperCase();
    } else {
        code = words.map(word => word.charAt(0)).join('').toUpperCase();
    }
    
    // Add random number to make it unique
    const randomNum = Math.floor(Math.random() * 1000);
    return `${code}${randomNum.toString().padStart(3, '0')}`;
};

/**
 * Get operators near a location
 * @param {Number} longitude - Longitude
 * @param {Number} latitude - Latitude
 * @param {Number} radius - Radius in kilometers
 * @returns {Promise<Array>} List of nearby operators
 */
const getNearbyOperators = async (longitude, latitude, radius = 50) => {
    try {
        const operators = await Operator.find({
            isDeleted: false,
            status: 'Active',
            'address.coordinates': {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    },
                    $maxDistance: radius * 1000 // Convert km to meters
                }
            }
        }).limit(20);

        return operators.map(operator => operator.transform());
    } catch (error) {
        throw error;
    }
};

module.exports = {
    createOperator,
    getOperatorById,
    getOperatorByEmail,
    updateOperator,
    deleteOperator,
    getOperatorStats,
    getOperatorFleet,
    updateOperatorStatus,
    verifyOperator,
    searchOperators,
    generateCompanyCode,
    getNearbyOperators,
};
