# Operator API Documentation

## Overview
The Operator API provides comprehensive management for bus operators (companies) in the system. Operators are the entities that own and manage buses, drivers, and routes.

## Operator Model
The Operator model includes the following key fields:

### Company Information
- `companyName`: Name of the bus operator company
- `companyCode`: Unique code for the company (auto-generated if not provided)
- `businessType`: Type of business (Private, Government, Semi-Government, Cooperative)

### Contact Information
- `email`: Primary email address
- `phone`: Primary phone number
- `countryCode`: Country code for phone number
- `alternatePhone`: Secondary phone number

### Address Information
- `address`: Complete address with coordinates for geospatial queries
  - `street`, `city`, `state`, `pincode`, `country`
  - `coordinates`: [longitude, latitude] for location-based searches

### Business Details
- `registrationNumber`: Company registration number
- `gstNumber`: GST registration number
- `panNumber`: PAN card number
- `licenseNumber`: Transport license number
- `licenseExpiryDate`: License expiry date

### Contact Person
- `contactPerson`: Details of the main contact person
  - `name`, `designation`, `phone`, `email`

### Documents
- `documents`: Various business documents
  - `registrationCertificate`, `gstCertificate`, `panCard`
  - `licenseDocument`, `insuranceDocument`, `permitDocument`
  - `logo`: Company logo

### Status and Settings
- `status`: Current status (Active, Inactive, Suspended, Pending)
- `isVerified`: Verification status
- `isDeleted`: Soft delete flag
- `fleetSize`: Current number of buses
- `maxFleetSize`: Maximum allowed buses
- `commissionRate`: Commission rate for the platform
- `paymentTerms`: Payment terms (Daily, Weekly, Monthly)

## API Endpoints

### Public Endpoints

#### GET /api/operators
List all operators with pagination and filtering
- Query parameters: `page`, `perPage`, `companyName`, `businessType`, `status`, `isVerified`

#### POST /api/operators
Create a new operator
- Body: Operator data (see model fields above)

#### GET /api/operators/search
Search operators with advanced criteria
- Query parameters: `companyName`, `businessType`, `status`, `isVerified`, `city`, `state`

#### GET /api/operators/nearby
Find operators near a location
- Query parameters: `longitude`, `latitude`, `radius` (in km, default 50)

### Authenticated Endpoints

#### GET /api/operators/profile
Get current operator's profile (requires authentication)

#### PUT /api/operators/profile
Update current operator's profile (requires authentication)

#### PUT /api/operators/change-password
Change operator password (requires authentication)
- Body: `{ "currentPassword": "...", "newPassword": "..." }`

### Management Endpoints

#### GET /api/operators/:operatorId
Get specific operator details

#### PUT /api/operators/:operatorId
Update specific operator

#### DELETE /api/operators/:operatorId
Delete operator (soft delete)

#### PUT /api/operators/:operatorId/status
Update operator status
- Body: `{ "status": "Active|Inactive|Suspended|Pending" }`

#### PUT /api/operators/:operatorId/verify
Verify/unverify operator
- Body: `{ "isVerified": true|false }`

#### GET /api/operators/:operatorId/stats
Get operator statistics including:
- Fleet information (buses, drivers, routes)
- Booking statistics
- Revenue data
- Monthly trends

#### GET /api/operators/:operatorId/fleet
Get operator's fleet details:
- List of buses with details
- List of drivers
- List of routes
- Fleet summary

## Integration with Existing Models

### Bus Model Updates
- Changed `adminId` to `operatorId` to reference the Operator model
- Buses now belong to operators instead of admins

### Driver Model Updates
- Changed `adminId` to `operatorId` to reference the Operator model
- Drivers now belong to operators instead of admins

## File Structure
```
src/
├── models/
│   └── Operator.model.js          # Operator data model
├── controllers/
│   └── operator.controller.js     # API controllers
├── services/
│   └── operator.service.js        # Business logic
├── routes/
│   └── operator.js                # API routes
└── public/
    └── operators/
        ├── logo/                  # Operator logos
        └── documents/             # Operator documents
```

## Usage Examples

### Create a new operator
```bash
curl -X POST http://localhost:3000/api/operators \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "ABC Bus Services",
    "email": "contact@abcbus.com",
    "phone": "9876543210",
    "registrationNumber": "REG123456",
    "licenseNumber": "LIC789012",
    "licenseExpiryDate": "2025-12-31",
    "contactPerson": {
      "name": "John Doe",
      "designation": "Manager",
      "phone": "9876543210",
      "email": "john@abcbus.com"
    },
    "address": {
      "street": "123 Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "coordinates": [72.8777, 19.0760]
    }
  }'
```

### Get operator statistics
```bash
curl http://localhost:3000/api/operators/OPERATOR_ID/stats
```

### Search operators by location
```bash
curl "http://localhost:3000/api/operators/nearby?longitude=72.8777&latitude=19.0760&radius=25"
```

## Notes
- All timestamps are in UTC and can be converted to local timezone
- Geospatial queries use MongoDB's 2dsphere index for efficient location-based searches
- Soft delete is implemented to maintain data integrity
- File uploads for documents and logos should be handled separately
- Authentication middleware should be implemented for protected endpoints
