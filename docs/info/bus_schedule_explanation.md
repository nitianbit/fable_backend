# Difference Between Bus Schedules and Bus Schedule Locations

## Bus Schedules

The `bus_schedules` collection represents the **master schedule** for a bus route. It contains:

### Key Fields:
- `routeId` - Reference to the route
- `busId` - Reference to the bus
- `departure_time` - Overall departure time for the route
- `arrival_time` - Overall arrival time for the route
- `every` - Days of the week when this schedule operates
- `start_date` - When this schedule becomes active
- `end_date` - When this schedule expires
- `status` - Whether the schedule is active

### Purpose:
- Defines when a specific bus operates on a specific route
- Sets the overall time frame for the route (start to finish)
- Specifies which days of the week the service runs

## Bus Schedule Locations

The `bus_schedule_locations` collection represents the **detailed stop-by-stop schedule**. It contains:

### Key Fields:
- `busScheduleId` - Reference to the bus schedule
- `stopId` - Reference to the location/stop
- `departure_time` - Departure time from this specific stop
- `arrival_time` - Arrival time at this specific stop

### Purpose:
- Defines the exact arrival and departure times for each stop along the route
- Provides granular timing information for passengers
- Allows for different dwell times at different stops

## Example

Let's say we have a bus route from Delhi to Dehradun:

### Bus Schedules Entry:
```json
{
  "_id": "schedule_001",
  "routeId": "route_123",
  "busId": "bus_456",
  "departure_time": "2025-08-30T06:00:00.000Z",
  "arrival_time": "2025-08-30T12:00:00.000Z",
  "every": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
  "start_date": "2025-08-01T00:00:00.000Z",
  "end_date": "2026-08-01T00:00:00.000Z"
}
```
This means: "Bus 456 runs Route 123 from 6:00 AM to 12:00 PM every day from August 2025 to August 2026"

### Bus Schedule Locations Entries:
```json
[
  {
    "_id": "stop_001",
    "busScheduleId": "schedule_001",
    "stopId": "delhi_isbt",
    "departure_time": "2025-08-30T06:00:00.000Z",
    "arrival_time": "2025-08-30T06:00:00.000Z"
  },
  {
    "_id": "stop_002",
    "busScheduleId": "schedule_001",
    "stopId": "dehradun_isbt",
    "departure_time": "2025-08-30T12:00:00.000Z",
    "arrival_time": "2025-08-30T12:00:00.000Z"
  }
]
```
This means:
- "Bus 456 arrives at Delhi ISBT at 6:00 AM and departs at 6:00 AM"
- "Bus 456 arrives at Dehradun ISBT at 12:00 PM"

## Why This Structure?

This two-level structure allows for:

1. **Flexibility**: Different stops can have different arrival/departure times
2. **Scalability**: Easy to add intermediate stops
3. **Detailed Information**: Passengers can see exact times for their specific stop
4. **Operational Management**: Better tracking of bus movements at each stop

## In Route Search

When searching for routes, the system:
1. Finds relevant bus schedules based on date/day
2. Checks the bus_schedule_locations for specific stop times
3. Matches pickup and drop-off stop times with user requirements
4. Returns detailed timing information for each available route

This structure enables features like:
- Showing exact arrival/departure times for each stop
- Calculating travel times between specific stops
- Handling intermediate stops with different timing requirements