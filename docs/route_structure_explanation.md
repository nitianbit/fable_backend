# Route, Stop, and Location Structure Explanation

## Overview

The system uses a hierarchical data model to represent transportation routes:
1. **Locations** - Physical places (bus stops, stations, etc.)
2. **Routes** - Logical connections between locations
3. **Route Stops** - Ordered connections between routes and locations
4. **Buses** - Vehicles that operate on routes
5. **Bus Schedules** - Timetables for when buses operate
6. **Bus Schedule Locations** - Specific times for each stop in a schedule

## Data Model Structure

### 1. Locations
Locations represent physical places like bus stops, stations, or terminals.

```json
{
  "_id": "5f8d0d5f8f5c1a0017e7e8a1",
  "title": "Delhi ISBT",
  "type": "DA",
  "location": {
    "type": "Point",
    "address": "ISBT Kashmiri Gate, Delhi",
    "coordinates": [77.229585, 28.675702]
  },
  "city": "Delhi",
  "state": "Delhi",
  "status": true
}
```

**Key Fields:**
- `_id`: Unique identifier
- `title`: Name of the location
- `type`: Type of location (DA = Drop-off/Arrival)
- `location.coordinates`: [longitude, latitude] for geospatial queries
- `city`: City name for city-based searches
- `status`: Whether the location is active

### 2. Routes
Routes represent logical connections between locations, typically operated by a specific bus.

```json
{
  "_id": "5f8d0d5f8f5c1a0017e7e911",
  "locationId": "5f8d0d5f8f5c1a0017e7e8a1",
  "title": "Delhi to Dehradun Route",
  "busId": "5f8d0d5f8f5c1a0017e7e901",
  "status": true
}
```

**Key Fields:**
- `_id`: Unique identifier
- `locationId`: Reference to a location (typically the starting point)
- `title`: Name of the route
- `busId`: Reference to the bus that operates this route
- `status`: Whether the route is active

### 3. Route Stops
Route Stops define the ordered sequence of locations that make up a route.

```json
{
  "_id": "5f8d0d5f8f5c1a0017e7e921",
  "routeId": "5f8d0d5f8f5c1a0017e7e911",
  "stopId": "5f8d0d5f8f5c1a0017e7e8a1",
  "order": 1,
  "minimum_fare_pickup": "0",
  "minimum_fare_drop": "0",
  "price_per_km_drop": "15",
  "price_per_km_pickup": "15"
}
```

**Key Fields:**
- `_id`: Unique identifier
- `routeId`: Reference to the route this stop belongs to
- `stopId`: Reference to the location
- `order`: Position of this stop in the route sequence
- `minimum_fare_*`: Pricing information
- `price_per_km_*`: Pricing information

### 4. Buses
Buses are the vehicles that operate on routes.

```json
{
  "_id": "5f8d0d5f8f5c1a0017e7e901",
  "code": "DL-DEH-001",
  "name": "Delhi Dehradun Express",
  "reg_no": "DL01AB1234",
  "brand": "Volvo",
  "model_no": "VOLVO-9400",
  "chassis_no": "VOLVO9400DLDEH001",
  "amenities": ["AC", "WIFI", "WATER", "BLANKET"],
  "status": true
}
```

**Key Fields:**
- `_id`: Unique identifier
- `code`: Internal bus code
- `name`: Display name
- `reg_no`: Registration number
- `brand`: Manufacturer
- `amenities`: List of available amenities
- `status`: Whether the bus is active

### 5. Bus Schedules
Bus Schedules define when buses operate on specific routes.

```json
{
  "_id": "5f8d0d5f8f5c1a0017e7e931",
  "routeId": "5f8d0d5f8f5c1a0017e7e911",
  "busId": "5f8d0d5f8f5c1a0017e7e901",
  "departure_time": "2025-08-30T06:00:00.000Z",
  "arrival_time": "2025-08-30T12:00:00.000Z",
  "every": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
  "start_date": "2025-08-01T00:00:00.000Z",
  "end_date": "2026-08-01T00:00:00.000Z",
  "status": true
}
```

**Key Fields:**
- `_id`: Unique identifier
- `routeId`: Reference to the route
- `busId`: Reference to the bus
- `departure_time`: Scheduled departure time
- `arrival_time`: Scheduled arrival time
- `every`: Days of the week when this schedule operates
- `start_date`: When this schedule becomes active
- `end_date`: When this schedule expires
- `status`: Whether the schedule is active

### 6. Bus Schedule Locations
Bus Schedule Locations define specific arrival and departure times for each stop in a schedule.

```json
{
  "_id": "5f8d0d5f8f5c1a0017e7e941",
  "busScheduleId": "5f8d0d5f8f5c1a0017e7e931",
  "stopId": "5f8d0d5f8f5c1a0017e7e8a1",
  "departure_time": "2025-08-30T06:00:00.000Z",
  "arrival_time": "2025-08-30T06:00:00.000Z"
}
```

**Key Fields:**
- `_id`: Unique identifier
- `busScheduleId`: Reference to the bus schedule
- `stopId`: Reference to the location
- `departure_time`: Departure time at this stop
- `arrival_time`: Arrival time at this stop

## How It All Works Together

### 1. Searching for Routes
When a user searches for a route between two cities:

1. **Location Lookup**: The system finds locations matching the city names
2. **Route Matching**: The system looks for routes that connect these locations
3. **Schedule Validation**: The system checks if there are active schedules for the requested date
4. **Time Filtering**: The system filters schedules based on the requested time

### 2. Data Flow Example
For a search from Delhi to Dehradun:

1. User requests: `{ "pickup_city": "Delhi", "drop_city": "Dehradun", "current_date": "2025-08-30" }`
2. System finds Delhi location (ID: 5f8d0d5f8f5c1a0017e7e8a1) and Dehradun location (ID: 5f8d0d5f8f5c1a0017e7e8a3)
3. System looks for routes connecting these locations
4. System finds Route (ID: 5f8d0d5f8f5c1a0017e7e911) with Route Stops in the correct order
5. System finds Bus Schedule (ID: 5f8d0d5f8f5c1a0017e7e931) for this route
6. System gets specific times from Bus Schedule Locations
7. System returns complete route information to the user

### 3. Relationship Diagram

```
Locations ←→ Route Stops ←→ Routes ←→ Bus Schedules ←→ Bus Schedule Locations
     ↑                            ↑
     │                            │
     └────────────────────────────┘
                Buses
```

Each connection represents a reference relationship:
- Locations are referenced by Route Stops
- Routes are referenced by Route Stops and Bus Schedules
- Buses are referenced by Routes and Bus Schedules
- Bus Schedules are referenced by Bus Schedule Locations

This structure allows for flexible route planning, multiple schedules per route, and detailed time information for each stop.