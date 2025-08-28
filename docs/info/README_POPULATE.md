# Database Population Scripts

This directory contains scripts to populate the database with sample data for testing the route search functionality.

## Files

1. `populate_locations.js` - Script to populate location data
2. `populate_routes_data.js` - Script to populate route-related data (routes, buses, schedules, etc.)
3. `sample_locations.json` - Sample location data
4. `sample_routes_data.json` - Sample route-related data

## Usage

### Prerequisites

1. Make sure your MongoDB server is running
2. Ensure the database connection string is correctly configured in your `.env` file or the script will use the default `mongodb://localhost:27017/fable_backend`

### Running the Scripts

You can run the scripts in two ways:

#### Method 1: Using npm scripts (recommended)

```bash
# Populate locations
npm run populate-locations

# Populate routes data
npm run populate-routes
```

#### Method 2: Direct node execution

```bash
# Populate locations
node populate_locations.js

# Populate routes data
node populate_routes_data.js
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
   - Inserts data into the following collections:
     - `buses`
     - `routes`
     - `route_stops`
     - `bus_schedules`
     - `bus_schedule_locations`
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