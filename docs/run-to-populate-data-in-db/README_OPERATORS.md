# Operator Data Population Script

This script helps you populate your database with sample operator data for testing and development purposes.

## Features

- Add 3 sample operators with realistic data
- List all existing operators
- Get statistics for specific operators
- Add individual operators programmatically

## Sample Operators Included

### 1. Mumbai Bus Services (MBS001)
- **Type**: Private
- **Location**: Mumbai, Maharashtra
- **Fleet Size**: 25 buses
- **Contact**: Rajesh Kumar (Operations Manager)
- **Email**: contact@mumbaibusservices.com
- **Phone**: 9876543210

### 2. Delhi Transport Corporation (DTC002)
- **Type**: Government
- **Location**: New Delhi, Delhi
- **Fleet Size**: 150 buses
- **Contact**: Priya Sharma (General Manager)
- **Email**: info@dtc.delhi.gov.in
- **Phone**: 9876543220

### 3. Bangalore City Bus Services (BCBS003)
- **Type**: Semi-Government
- **Location**: Bangalore, Karnataka
- **Fleet Size**: 75 buses
- **Contact**: Suresh Reddy (Fleet Manager)
- **Email**: support@bangalorecitybus.com
- **Phone**: 9876543230

## Usage

### Prerequisites
1. Make sure your MongoDB is running
2. Ensure your `.env` file has the correct `MONGODB_URI`
3. Install required dependencies

### Commands

#### 1. Populate Sample Operators
```bash
cd docs/run-to-populate-data-in-db
node populate_operators_data.js populate
```

This will:
- Clear existing operators (optional)
- Add 3 sample operators with complete data
- Display confirmation of inserted operators

#### 2. List All Operators
```bash
node populate_operators_data.js list
```

This will display:
- All operators in the database
- Their basic information
- Status and verification details

#### 3. Get Operator Statistics
```bash
node populate_operators_data.js stats <operatorId>
```

Example:
```bash
node populate_operators_data.js stats 507f1f77bcf86cd799439011
```

This will show detailed statistics for a specific operator.

#### 4. Generate Secure Password
```bash
node populate_operators_data.js generate-password [length]
```

Example:
```bash
node populate_operators_data.js generate-password 16
```

This will generate a secure random password of specified length (default 12).

#### 5. Hash a Password
```bash
node populate_operators_data.js hash-password <password>
```

Example:
```bash
node populate_operators_data.js hash-password "MySecure@Pass123"
```

This will show how a password looks when hashed (for testing purposes).

## Programmatic Usage

You can also use the functions in your own scripts:

```javascript
const { populateOperators, addSingleOperator, listOperators } = require('./populate_operators_data');

// Add all sample operators
await populateOperators();

// Add a single custom operator
const customOperator = {
    companyName: "Custom Bus Services",
    email: "contact@custombus.com",
    phone: "9876543240",
    // ... other required fields
};
await addSingleOperator(customOperator);

// List all operators
await listOperators();
```

## Sample Data Structure

Each operator includes:

### Company Information
- Company name and unique code
- Business type (Private/Government/Semi-Government/Cooperative)
- Registration and license details

### Contact Information
- Primary and alternate phone numbers
- Email addresses
- Contact person details

### Address Information
- Complete address with coordinates
- Geospatial data for location-based searches

### Business Details
- GST, PAN, and license numbers
- Fleet size and capacity
- Commission rates and payment terms

### Documents
- Paths to various business documents
- Company logo

### Status Information
- Active/Inactive/Suspended/Pending status
- Verification status
- Login tracking

## Customization

To add your own operators, modify the `sampleOperators` array in the script:

```javascript
const customOperator = {
    companyName: "Your Company Name",
    companyCode: "YCN001",
    businessType: "Private",
    email: "contact@yourcompany.com",
    phone: "9876543250",
    // ... add other required fields
    address: {
        street: "Your Street Address",
        city: "Your City",
        state: "Your State",
        pincode: "123456",
        country: "India",
        coordinates: {
            type: "Point",
            coordinates: [longitude, latitude] // Your coordinates
        }
    },
    // ... other fields
};
```

## Notes

- All sample operators are set to "Active" status and verified
- Default passwords are set for testing (change in production)
- Geospatial coordinates are included for location-based features
- All operators have realistic Indian business data
- Document paths are set to default locations

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check if MongoDB is running
   - Verify MONGODB_URI in .env file
   - Ensure network connectivity

2. **Validation Errors**
   - Check required fields are provided
   - Verify email format
   - Ensure phone numbers are valid

3. **Duplicate Key Errors**
   - Company codes and emails must be unique
   - Check existing data before adding

### Error Messages

- `Company code already exists`: Use a different company code
- `Email already exists`: Use a different email address
- `License expiry date cannot be in the past`: Set a future date
- `Operator not found`: Check the operator ID

## Security Notes

### Password Security
- **Automatic Hashing**: All passwords are automatically hashed using bcrypt with 12 salt rounds
- **Password Strength**: Passwords must be at least 8 characters with uppercase, lowercase, number, and special character
- **Secure Generation**: Use the `generate-password` command to create secure random passwords
- **No Plain Text**: Passwords are never stored in plain text in the database

### Security Best Practices
- Default passwords are for testing only
- Change all passwords in production
- Remove or secure this script in production
- Validate all input data before adding operators
- Use HTTPS in production
- Implement rate limiting for authentication endpoints

## Next Steps

After populating operators, you can:

1. Add buses for each operator
2. Assign drivers to operators
3. Create routes for operators
4. Test the operator management APIs
5. Set up operator authentication

## API Testing

Once operators are added, you can test the APIs:

```bash
# List all operators
curl http://localhost:3000/api/operators

# Get specific operator
curl http://localhost:3000/api/operators/OPERATOR_ID

# Search operators
curl "http://localhost:3000/api/operators/search?city=Mumbai"

# Find nearby operators
curl "http://localhost:3000/api/operators/nearby?longitude=72.8777&latitude=19.0760"
```
