
/**
 * Validates that required fields are present in the request body
 * @param {Array} fields - Array of field names that are required
 * @returns {Function} Express middleware function
 */
const validateRequired = (fields) => {
    return (req, res, next) => {
        const missingFields = [];
        
        for (const field of fields) {
            if (!req.body[field] || req.body[field].toString().trim() === '') {
                missingFields.push(field);
            }
        }
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`,
                missingFields
            });
        }
        
        next();
    };
};

/**
 * Validates email format
 * @param {string} field - Field name containing the email
 * @returns {Function} Express middleware function
 */
const validateEmail = (field) => {
    return (req, res, next) => {
        const email = req.body[field];
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: `${field} is required`
            });
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: `Invalid email format for ${field}`
            });
        }
        
        next();
    };
};

/**
 * Validates password strength
 * @param {string} field - Field name containing the password
 * @returns {Function} Express middleware function
 */
const validatePassword = (field) => {
    return (req, res, next) => {
        const password = req.body[field];
        
        if (!password) {
            return res.status(400).json({
                success: false,
                message: `${field} is required`
            });
        }
        
        // Password must be at least 8 characters long
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: `${field} must be at least 8 characters long`
            });
        }
        
        // Password must contain at least one uppercase letter, one lowercase letter, and one number
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        
        if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
            return res.status(400).json({
                success: false,
                message: `${field} must contain at least one uppercase letter, one lowercase letter, and one number`
            });
        }
        
        next();
    };
};

/**
 * Validates that a field value is one of the allowed enum values
 * @param {string} field - Field name to validate
 * @param {Array} allowedValues - Array of allowed values
 * @returns {Function} Express middleware function
 */
const validateEnum = (field, allowedValues) => {
    return (req, res, next) => {
        const value = req.body[field];
        
        if (!value) {
            return res.status(400).json({
                success: false,
                message: `${field} is required`
            });
        }
        
        if (!allowedValues.includes(value)) {
            return res.status(400).json({
                success: false,
                message: `${field} must be one of: ${allowedValues.join(', ')}`
            });
        }
        
        next();
    };
};

module.exports = {
    validateRequired,
    validateEmail,
    validatePassword,
    validateEnum
};
