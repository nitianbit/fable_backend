# Sample CURL Requests

## Search Locations

### Search by City or Title
This endpoint searches for locations by city or title.

```bash
curl -X POST http://localhost:3000/api/v1/location \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "address": "Delhi",
    "limit": 10
  }'
```

### Search Nearest Locations (by coordinates)
This endpoint finds locations near specific coordinates.

```bash
curl -X POST http://localhost:3000/api/v1/nearest-stops \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 28.675702,
    "lng": 77.229585
  }'
```

## Search Routes

### Search Routes by City Names (New Feature)
This endpoint searches for routes between cities using the new city-based search functionality.

```bash
curl -X POST http://localhost:3000/api/v1/route-search \
  -H "Content-Type: application/json" \
  -d '{
    "pickup_city": "Delhi",
    "drop_city": "Dehradun",
    "current_date": "2025-08-30",
    "current_time": "07:00"
  }'
```

### Search Routes by Coordinates and IDs (Original Method)
This endpoint searches for routes using coordinates and location IDs.

```bash
curl -X POST http://localhost:3000/api/v1/route-search \
  -H "Content-Type: application/json" \
  -d '{
    "pickup_lat": 28.675702,
    "pickup_long": 77.229585,
    "pickup_id": "5f8d0d5f8f5c1a0017e7e8a1",
    "drop_lat": 30.327890,
    "drop_long": 78.043210,
    "drop_id": "5f8d0d5f8f5c1a0017e7e8a3",
    "current_date": "2025-08-30",
    "current_time": "07:00"
  }'
```

### Get Route Timing
This endpoint fetches timing information for a specific route.

```bash
curl -X POST http://localhost:3000/api/v1/timing \
  -H "Content-Type: application/json" \
  -d '{
    "route_id": "5f8d0d5f8f5c1a0017e7e911",
    "pickup_stop_id": "5f8d0d5f8f5c1a0017e7e8a1",
    "drop_stop_id": "5f8d0d5f8f5c1a0017e7e8a3"
  }'
```

### Get Seat Price
This endpoint fetches seat pricing information for a route.

```bash
curl -X POST http://localhost:3000/api/v1/seatprice \
  -H "Content-Type: application/json" \
  -d '{
    "routeId": "5f8d0d5f8f5c1a0017e7e911",
    "pickup_stop_id": "5f8d0d5f8f5c1a0017e7e8a1",
    "drop_stop_id": "5f8d0d5f8f5c1a0017e7e8a3",
    "seat_no": "A1",
    "busId": "5f8d0d5f8f5c1a0017e7e901"
  }'
```

## Authentication Note

Some endpoints require authentication. For testing purposes, you can temporarily remove the `authenticate` middleware from the routes in `src/routes/location.js` and `src/routes/route.js`:

```javascript
// Before (requires authentication):
router.post('/location', authenticate, locationController.searchlocation);

// After (no authentication required):
router.post('/location', locationController.searchlocation);
```

## Troubleshooting

### If City-Based Search Is Not Working

1. **Check if data is populated**: Make sure you've run both population scripts:
   ```bash
   npm run populate-locations
   npm run populate-routes
   ```

2. **Check server logs**: The updated searchroute function now includes console.log statements that will help identify issues:
   - "Searching for pickup city: CITY_NAME"
   - "Found pickup location: LOCATION_OBJECT" or "No pickup location found for city: CITY_NAME"
   - Similar messages for drop city

3. **Verify city names**: Make sure the city names in your request exactly match those in the database:
   - Valid cities from sample data: "Delhi", "Dehradun", "Mumbai", "Bangalore"

4. **Check database directly**: You can verify the data in MongoDB:
   ```bash
   # Connect to MongoDB
   mongo fable_backend
   
   # Check locations
   db.locations.find({city: "Delhi"}).pretty()
   db.locations.find({city: "Dehradun"}).pretty()
   ```

## Expected Responses

### Successful Location Search
```json
{
  "status": true,
  "message": "Successfully found location",
  "data": [
    {
      "id": "5f8d0d5f8f5c1a0017e7e8a1",
      "title": "Delhi ISBT",
      "location_address": "ISBT Kashmiri Gate, Delhi",
      "location_latitude": 28.675702,
      "location_longitude": 77.229585,
      "city": "Delhi",
      "state": "Delhi",
      "type": "location"
    }
  ],
  "total_count": 1
}
```

### Successful Route Search
```json
{
  "status": true,
  "message": "Successfully found route",
  "data": {
    "date": "2025-08-30",
    "getnearestData": [
      {
        "total_of_stops": 2,
        "busScheduleId": "5f8d0d5f8f5c1a0017e7e931",
        "routeId": "5f8d0d5f8f5c1a0017e7e911",
        "route_name": "Delhi to Dehradun Route",
        "route_busId": "5f8d0d5f8f5c1a0017e7e901",
        "route_bus_timetable": [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday"
        ],
        "bus_details": {
          "code": "DL-DEH-001",
          "name": "Delhi Dehradun Express",
          "reg_no": "DL01AB1234",
          "brand": "Volvo",
          "model_no": "VOLVO-9400",
          "chassis_no": "VOLVO9400DLDEH001",
          "amenities": [
            "AC",
            "WIFI",
            "WATER",
            "BLANKET"
          ]
        },
        "pickup_stop_id": "5f8d0d5f8f5c1a0017e7e8a1",
        "pickup_stop_name": "Delhi ISBT",
        "pickup_stop_departure_time": "06:00",
        "pickup_stop_arrival_time": "06:00",
        "drop_stop_name": "Dehradun ISBT",
        "drop_stop_id": "5f8d0d5f8f5c1a0017e7e8a3",
        "drop_stop_departure_time": "12:00",
        "drop_stop_arrival_time": "12:00"
      }
    ]
  }
}
```

### City Not Found Error
```json
{
  "status": false,
  "message": "Pickup city 'InvalidCity' not found."
}
```

### No Routes Found
```json
{
  "status": false,
  "message": "No route found."
}