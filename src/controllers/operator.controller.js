const { omit } = require('lodash');
const { Operator } = require('../models');
const moment = require('moment-timezone');

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {boolean} - True if password is strong
 */
function isPasswordStrong(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
}

/**
 * Load operator and append to req.
 * @public
 */
exports.load = async (req, res, next, id) => {
    try {
        const operator = await Operator.findById(id);
        if (!operator) {
            return res.status(404).json({ message: 'Operator not found' });
        }
        req.locals = { operator };
        return next();
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

/**
 * Get operator
 * @public
 */
exports.get = (req, res) => res.json(req.locals.operator.transform());

/**
 * Get logged in operator info
 * @public
 */
exports.loggedIn = (req, res) => res.json(req.operator.transform());

/**
 * Create new operator
 * @public
 */
exports.create = async (req, res, next) => {
    try {
        const operatorData = omit(req.body, 'role');
        
        // Validate password strength if provided
        if (operatorData.password && !isPasswordStrong(operatorData.password)) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character'
            });
        }
        
        const operator = new Operator(operatorData);
        const savedOperator = await operator.save();
        res.status(201);
        res.json(savedOperator.transform());
    } catch (error) {
        next(Operator.checkDuplicateEmail(error));
    }
};

/**
 * Replace existing operator
 * @public
 */
exports.replace = async (req, res, next) => {
    try {
        const { operator } = req.locals;
        const newOperator = new Operator(req.body);
        const ommitRole = operator.role !== 'admin' ? 'role' : '';
        const newOperatorObject = omit(newOperator.toObject(), '_id', ommitRole);

        await operator.updateOne(newOperatorObject, { override: true, upsert: true });
        const savedOperator = await Operator.findById(operator._id);

        res.json(savedOperator.transform());
    } catch (error) {
        next(Operator.checkDuplicateEmail(error));
    }
};

/**
 * Update existing operator
 * @public
 */
exports.update = (req, res, next) => {
    const ommitRole = req.locals.operator.role !== 'admin' ? 'role' : '';
    const updatedOperator = omit(req.body, ommitRole);
    const operator = Object.assign(req.locals.operator, updatedOperator);

    operator.save()
        .then(savedOperator => res.json(savedOperator.transform()))
        .catch(e => next(Operator.checkDuplicateEmail(e)));
};

/**
 * Get operator list
 * @public
 */
exports.list = async (req, res, next) => {
    try {
        const operators = await Operator.list(req.query);
        const transformedOperators = operators.map(operator => operator.transform());
        res.json(transformedOperators);
    } catch (error) {
        next(error);
    }
};

/**
 * Delete operator
 * @public
 */
exports.remove = (req, res, next) => {
    const { operator } = req.locals;

    operator.remove()
        .then(() => res.status(204).end())
        .catch(e => next(e));
};

/**
 * Get operator statistics
 * @public
 */
exports.getStats = async (req, res, next) => {
    try {
        const operatorId = req.params.operatorId;
        
        // Get basic operator info
        const operator = await Operator.findById(operatorId);
        if (!operator) {
            return res.status(404).json({ message: 'Operator not found' });
        }

        // Get fleet statistics
        const { Bus } = require('../models');
        const { Driver } = require('../models');
        const { Booking } = require('../models');

        const totalBuses = await Bus.countDocuments({ operatorId, status: true });
        const totalDrivers = await Driver.countDocuments({ operatorId, status: true });
        const totalBookings = await Booking.countDocuments({ operatorId });
        
        // Get recent bookings (last 30 days)
        const thirtyDaysAgo = moment().subtract(30, 'days').toDate();
        const recentBookings = await Booking.countDocuments({ 
            operatorId, 
            createdAt: { $gte: thirtyDaysAgo } 
        });

        // Get active routes
        const { Route } = require('../models');
        const activeRoutes = await Route.countDocuments({ 
            operatorId, 
            status: true 
        });

        const stats = {
            operator: operator.transform(),
            fleet: {
                totalBuses,
                totalDrivers,
                activeRoutes,
            },
            bookings: {
                total: totalBookings,
                recent: recentBookings,
            },
            lastUpdated: new Date(),
        };

        res.json(stats);
    } catch (error) {
        next(error);
    }
};

/**
 * Update operator status
 * @public
 */
exports.updateStatus = async (req, res, next) => {
    try {
        const { operatorId } = req.params;
        const { status } = req.body;

        if (!['Active', 'Inactive', 'Suspended', 'Pending'].includes(status)) {
            return res.status(400).json({ 
                message: 'Invalid status. Must be one of: Active, Inactive, Suspended, Pending' 
            });
        }

        const operator = await Operator.findByIdAndUpdate(
            operatorId,
            { 
                status,
                ...(status === 'Active' && { verifiedAt: new Date(), isVerified: true })
            },
            { new: true }
        );

        if (!operator) {
            return res.status(404).json({ message: 'Operator not found' });
        }

        res.json(operator.transform());
    } catch (error) {
        next(error);
    }
};

/**
 * Verify operator
 * @public
 */
exports.verify = async (req, res, next) => {
    try {
        const { operatorId } = req.params;
        const { isVerified } = req.body;

        const operator = await Operator.findByIdAndUpdate(
            operatorId,
            { 
                isVerified,
                verifiedAt: isVerified ? new Date() : null,
                status: isVerified ? 'Active' : 'Pending'
            },
            { new: true }
        );

        if (!operator) {
            return res.status(404).json({ message: 'Operator not found' });
        }

        res.json(operator.transform());
    } catch (error) {
        next(error);
    }
};

/**
 * Get operator fleet (buses and drivers)
 * @public
 */
exports.getFleet = async (req, res, next) => {
    try {
        const { operatorId } = req.params;
        
        const { Bus } = require('../models');
        const { Driver } = require('../models');

        const buses = await Bus.find({ operatorId, status: true })
            .populate('bustypeId', 'name')
            .populate('buslayoutId', 'name')
            .populate('adminId', 'name email')
            .sort({ createdAt: -1 });

        const drivers = await Driver.find({ operatorId, status: true })
            .populate('adminId', 'name email')
            .sort({ createdAt: -1 });

        const fleet = {
            buses: buses.map(bus => Bus.transformdata(bus)),
            drivers: drivers.map(driver => driver.transforms()),
            totalBuses: buses.length,
            totalDrivers: drivers.length,
        };

        res.json(fleet);
    } catch (error) {
        next(error);
    }
};

/**
 * Update operator profile
 * @public
 */
exports.updateProfile = async (req, res, next) => {
    try {
        const operatorId = req.operator._id;
        const updateData = omit(req.body, ['password', 'email', 'companyCode', 'registrationNumber']);

        const operator = await Operator.findByIdAndUpdate(
            operatorId,
            updateData,
            { new: true, runValidators: true }
        );

        res.json(operator.transform());
    } catch (error) {
        next(error);
    }
};

/**
 * Change operator password
 * @public
 */
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const operator = req.operator;

        // Validate new password strength
        if (!isPasswordStrong(newPassword)) {
            return res.status(400).json({
                message: 'New password must be at least 8 characters long and contain uppercase, lowercase, number, and special character'
            });
        }

        if (!await operator.passwordMatches(currentPassword)) {
            return res.status(400).json({ 
                message: 'Current password is incorrect' 
            });
        }

        operator.password = newPassword;
        await operator.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        next(error);
    }
};

/**
 * Search operators
 * @public
 */
exports.search = async (req, res, next) => {
    try {
        const operatorService = require('../services/operator.service');
        const result = await operatorService.searchOperators(req.query);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * Get nearby operators
 * @public
 */
exports.getNearby = async (req, res, next) => {
    try {
        const { longitude, latitude, radius } = req.query;
        
        if (!longitude || !latitude) {
            return res.status(400).json({ 
                message: 'Longitude and latitude are required' 
            });
        }

        const operatorService = require('../services/operator.service');
        const operators = await operatorService.getNearbyOperators(
            parseFloat(longitude), 
            parseFloat(latitude), 
            radius ? parseFloat(radius) : 50
        );
        
        res.json(operators);
    } catch (error) {
        next(error);
    }
};
