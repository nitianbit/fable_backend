# Route Search API Documentation

## Overview
The Route Search API allows users to search for bus routes between pickup and drop locations. The API now supports filtering by operator_id to show only buses from specific operators.

## Endpoint
```
POST /api/routes/route-search
```

## Request Body Parameters

### Required Parameters
- `pickup_lat` (number): Pickup location latitude
- `pickup_long` (number): Pickup location longitude
- `drop_lat` (number): Drop location latitude
- `drop_long` (number): Drop location longitude
- `current_date` (string): Search date in YYYY-MM-DD format
- `current_time` (string): Search time in HH:MM format

### Optional Parameters
- `pickup_id` (string): Specific pickup location ID
- `drop_id` (string): Specific drop location ID
- `pickup_city` (string): Pickup city name (alternative to coordinates)
- `drop_city` (string): Drop city name (alternative to coordinates)
- `operator_id` (string): **NEW** - Filter buses by specific operator ID
- `search_type` (string): Type of search
- `end_date` (string): End date for search
- `type` (string): Search type

## Request Example

### Basic Search
```json
{
  "pickup_lat": 19.0760,
  "pickup_long": 72.8777,
  "drop_lat": 18.5204,
  "drop_long": 73.8567,
  "current_date": "2024-01-15",
  "current_time": "10:00"
}
```

### Search with Operator Filter
```json
{
  "pickup_lat": 19.0760,
  "pickup_long": 72.8777,
  "drop_lat": 18.5204,
  "drop_long": 73.8567,
  "current_date": "2024-01-15",
  "current_time": "10:00",
  "operator_id": "507f1f77bcf86cd799439011"
}
```

### Search by City Names
```json
{
  "pickup_city": "Mumbai",
  "drop_city": "Pune",
  "current_date": "2024-01-15",
  "current_time": "10:00",
  "operator_id": "507f1f77bcf86cd799439011"
}
```

## Response Format

### Success Response
```json
{
  "status": true,
  "message": "Successfully found route",
  "data": {
    "date": "2024-01-15",
    "getnearestData": [
      {
        "total_of_stops": 5,
        "busScheduleId": "507f1f77bcf86cd799439012",
        "routeId": "507f1f77bcf86cd799439013",
        "route_name": "Mumbai to Pune",
        "route_busId": "507f1f77bcf86cd799439014",
        "route_bus_timetable": ["monday", "tuesday", "wednesday", "thursday", "friday"],
        "bus_details": {
          "code": "B007",
          "name": "Express Bus",
          "reg_no": "MH01AB1234",
          "brand": "Volvo",
          "model_no": "B9R",
          "chassis_no": "CH123456",
          "amenities": ["AC", "WiFi", "Charging"],
          "operatorId": "507f1f77bcf86cd799439011"
        },
        "operator_details": {
          "id": "507f1f77bcf86cd799439011",
          "companyName": "Mumbai Bus Services",
          "companyCode": "MBS001",
          "businessType": "Private",
          "status": "Active"
        },
        "pickup_stop_id": "507f1f77bcf86cd799439015",
        "pickup_stop_name": "Mumbai Central",
        "pickup_stop_departure_time": "10:30",
        "pickup_stop_arrival_time": "10:30",
        "drop_stop_name": "Pune Station",
        "drop_stop_id": "507f1f77bcf86cd799439016",
        "drop_stop_departure_time": "14:30",
        "drop_stop_arrival_time": "14:30"
      }
    ]
  }
}
```

### No Results Response
```json
{
  "status": false,
  "message": "No route found."
}
```

### Error Response
```json
{
  "status": false,
  "message": "Route not found",
  "errorMessage": "Error details here"
}
```

## New Features

### Operator Filtering
When `operator_id` is provided in the request:
- Only buses belonging to the specified operator will be returned
- The response includes detailed operator information
- If no buses are found for the operator, an empty result is returned

### Enhanced Response Data
The response now includes:
- `operatorId` in bus_details
- `operator_details` object with:
  - `id`: Operator ID
  - `companyName`: Company name
  - `companyCode`: Company code
  - `businessType`: Business type (Private, Government, etc.)
  - `status`: Operator status

## Usage Examples

### cURL Examples

#### Basic Search
```bash
curl -X POST http://localhost:3000/api/routes/route-search \
  -H "Content-Type: application/json" \
  -d '{
    "pickup_lat": 19.0760,
    "pickup_long": 72.8777,
    "drop_lat": 18.5204,
    "drop_long": 73.8567,
    "current_date": "2024-01-15",
    "current_time": "10:00"
  }'
```

#### Search with Operator Filter
```bash
curl -X POST http://localhost:3000/api/routes/route-search \
  -H "Content-Type: application/json" \
  -d '{
    "pickup_lat": 19.0760,
    "pickup_long": 72.8777,
    "drop_lat": 18.5204,
    "drop_long": 73.8567,
    "current_date": "2024-01-15",
    "current_time": "10:00",
    "operator_id": "507f1f77bcf86cd799439011"
  }'
```

#### Search by City Names with Operator Filter
```bash
curl -X POST http://localhost:3000/api/routes/route-search \
  -H "Content-Type: application/json" \
  -d '{
    "pickup_city": "Mumbai",
    "drop_city": "Pune",
    "current_date": "2024-01-15",
    "current_time": "10:00",
    "operator_id": "507f1f77bcf86cd799439011"
  }'
```

## Business Logic

### Operator Filtering Logic
1. If `operator_id` is provided, the system filters buses by the operator
2. The filter is applied at the database level for better performance
3. Only buses with matching `operatorId` are included in results
4. Operator details are automatically joined and included in response

### Search Priority
1. **Coordinates**: If `pickup_lat/long` and `drop_lat/long` are provided, use them
2. **City Names**: If `pickup_city` and `drop_city` are provided, find locations by city
3. **Location IDs**: If `pickup_id` and `drop_id` are provided, use them directly

### Time Filtering
- Results are filtered by current date and time
- Only buses with valid schedules for the specified date are returned
- Pre-booking time constraints are applied

## Error Handling

### Common Errors
- **Invalid coordinates**: Invalid latitude/longitude values
- **Invalid date format**: Date must be in YYYY-MM-DD format
- **Invalid time format**: Time must be in HH:MM format
- **Invalid operator_id**: Non-existent operator ID
- **No routes found**: No matching routes for the criteria

### Error Response Format
All errors return a consistent format with:
- `status`: false
- `message`: Human-readable error message
- `errorMessage`: Technical error details (if available)

## Performance Considerations

- Database indexes are used for efficient querying
- Operator filtering is applied at the aggregation level
- Results are sorted by departure time for better user experience
- Pagination can be added for large result sets

## Security Notes

- Input validation is performed on all parameters
- SQL injection protection through parameterized queries
- Rate limiting should be implemented for production use
- Authentication can be added for premium features

