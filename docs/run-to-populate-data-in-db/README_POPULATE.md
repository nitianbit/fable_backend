# Database Population Scripts

This directory contains scripts to populate the database with sample data for testing the route search functionality.

## Files

1. `populate_locations.js` - Script to populate location data
2. `populate_routes_data.js` - Script to populate route-related data (routes, buses, schedules, etc.)
3. `check_route_data.js` - Script to check if route data is properly populated
4. `sample_locations.json` - Sample location data
5. `sample_routes_data.json` - Sample route-related data

## Usage

### Prerequisites

1. Make sure your MongoDB server is running
2. Ensure the database connection string is correctly configured in your `.env` file or the script will use the default `mongodb://localhost:27017/fable_backend`
3. Make sure you have run the location population script first before running the routes population script

### Running the Scripts

You can run the scripts in two ways:

#### Method 1: Using npm scripts (recommended)

```bash
# Populate locations first
npm run populate-locations

# Then populate routes data
npm run populate-routes

# Check if route data is properly populated
npm run check-route-data
```

#### Method 2: Direct node execution

```bash
# Populate locations first
node populate_locations.js

# Then populate routes data
node populate_routes_data.js

# Check if route data is properly populated
node check_route_data.js
```

### What the Scripts Do

1. **populate_locations.js**:
   - Connects to the MongoDB database
   - Reads location data from `sample_locations.json`
   - Inserts the data into the `locations` collection
   - Closes the database connection

2. **populate_routes_data.js**:
   - Connects to the MongoDB database
   - Reads route-related data from `sample_routes_data.json`
   - Creates required reference data (BusType, BusLayout, Admin User) if they don't exist
   - Creates the following entities with proper references:
     - Buses (linked to BusType, BusLayout, and Admin User)
     - Routes (linked to Locations, Buses, and Admin User)
     - Route Stops (linked to Routes and Locations)
     - Bus Schedules (linked to Routes and Buses)
     - Bus Schedule Locations (linked to Bus Schedules and Locations)
   - Closes the database connection

3. **check_route_data.js**:
   - Connects to the MongoDB database
   - Checks if locations, routes, route stops, bus schedules, and buses are properly populated
   - Displays summary information about the data
   - Closes the database connection

## Data Structure

The sample data includes:

1. **Locations**: Major cities in India with proper coordinates
2. **Buses**: Sample buses with amenities
3. **Routes**: Connections between cities (Delhi to Dehradun and vice versa)
4. **Route Stops**: Ordered stops for each route
5. **Bus Schedules**: Timetables for each route
6. **Bus Schedule Locations**: Specific times for each stop

## Testing the Search Functionality

After running the population scripts, you can test the search functionality with requests like:

```json
{
  "pickup_city": "Delhi",
  "drop_city": "Dehradun",
  "current_date": "2025-08-30",
  "current_time": "07:00"
}
```

This should return available routes between Delhi and Dehradun.

## Troubleshooting

If the city-based search is not working:

1. **Check if data is populated**:
   ```bash
   npm run check-route-data
   ```

2. **Verify the data in MongoDB directly**:
   ```bash
   # Connect to MongoDB
   mongo fable_backend
   
   # Check locations
   db.locations.find({city: "Delhi"}).pretty()
   db.locations.find({city: "Dehradun"}).pretty()
   
   # Check routes
   db.routes.find().pretty()
   
   # Check route stops
   db.route_stops.find().pretty()
   ```

3. **Check server logs** for debugging messages from the searchroute function

4. **Verify city names** match exactly with those in the database

## Important Notes

1. **Order matters**: You must run `populate-locations` before `populate-routes` because the routes script needs to reference the location data
2. **Reference data**: The routes script will automatically create required reference data (BusType, BusLayout, Admin User) if they don't exist
3. **Idempotent**: Running the scripts multiple times won't create duplicate data (except for the reference data which checks for existence first)