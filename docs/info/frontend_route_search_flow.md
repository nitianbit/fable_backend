# Complete Bus Booking Flow

Here's the full end-to-end bus booking process from user search to payment completion:

## 1. Location Search

### API: `/api/v1/location` (POST)
**Purpose**: Search for locations by city name or title

```json
// Request
{
  "address": "Delhi",
  "limit": 10
}

// Response
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
  ]
}
```

## 2. Route Search

### API: `/api/v1/route-search` (POST)
**Purpose**: Find available routes between locations

```json
// Request - City-based search
{
  "pickup_city": "Delhi",
  "drop_city": "Dehradun",
  "current_date": "2025-08-30",
  "current_time": "07:00"
}

// Request - Coordinate-based search
{
  "pickup_lat": 28.675702,
  "pickup_long": 77.229585,
  "pickup_id": "5f8d0d5f8f5c1a0017e7e8a1",
  "drop_lat": 30.327890,
  "drop_long": 78.043210,
  "drop_id": "5f8d0d5f8f5c1a0017e7e8a3",
  "current_date": "2025-08-30",
  "current_time": "07:00"
}

// Response
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
        "route_bus_timetable": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
        "bus_details": {
          "code": "DL-DEH-001",
          "name": "Delhi Dehradun Express",
          "reg_no": "DL01AB1234",
          "brand": "Volvo",
          "model_no": "VOLVO-9400",
          "chassis_no": "VOLVO9400DLDEH001",
          "amenities": ["AC", "WIFI", "WATER", "BLANKET"]
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

## 3. Route Details (Optional)

### API: `/api/v1/:routeId` (POST)
**Purpose**: Get detailed information about all stops on a route

```json
// Request
{
  "pickup_stop_id": "5f8d0d5f8f5c1a0017e7e8a1",
  "drop_stop_id": "5f8d0d5f8f5c1a0017e7e8a3"
}

// Response includes detailed stop information for the route
```

## 4. Bus Layout and Seat Selection

### API: `/api/v1/bus/:busId` (POST)
**Purpose**: Get bus seat layout with availability status

```json
// Request
{
  "busschedule_id": "5f8d0d5f8f5c1a0017e7e931",
  "route_id": "5f8d0d5f8f5c1a0017e7e911",
  "pickup_stop_id": "5f8d0d5f8f5c1a0017e7e8a1",
  "drop_stop_id": "5f8d0d5f8f5c1a0017e7e8a3",
  "type": "default",
  "has_return": "0",
  "current_date": "2025-08-30",
  "end_date": ""
}

// Response
{
  "status": true,
  "message": "Successfully found bus seats",
  "data": {
    "id": "5f8d0d5f8f5c1a0017e7e901",
    "bus_name": "Delhi Dehradun Express",
    "bus_brand": "Volvo",
    "bus_model_no": "VOLVO-9400",
    "bus_amenities": ["AC", "WIFI", "WATER", "BLANKET"],
    "bus_type": "AC_SEATER",
    "bus_reg_no": "DL01AB1234",
    "buslayoutId": {
      "id": "layout_id",
      "max_seats": "40",
      "layout": "1 X 1",
      "name": "Standard Layout",
      "combine_seats": [
        [
          {
            "seat_no": "A1",
            "seat_status": "empty"
          },
          {
            "seat_no": "A2", 
            "seat_status": "booked"
          }
        ]
      ]
    },
    "final_total_fare": "500",
    "tax": "18",
    "tax_amount": "90"
  }
}
```

## 5. Fare Calculation

### API: `/api/v1/fare/generate-seat-fare` (POST)
**Purpose**: Calculate exact fare for selected seats

```json
// Request
{
  "busschedule_id": "5f8d0d5f8f5c1a0017e7e931",
  "route_id": "5f8d0d5f8f5c1a0017e7e911",
  "bus_id": "5f8d0d5f8f5c1a0017e7e901",
  "pickup_stop_id": "5f8d0d5f8f5c1a0017e7e8a1",
  "drop_stop_id": "5f8d0d5f8f5c1a0017e7e8a3",
  "seat_no": "[A1,B1]",
  "has_return": "0",
  "start_date": "2025-08-30"
}

// Response
{
  "status": true,
  "message": "Successfully generate fare.",
  "data": {
    "pnr_no": "PNR123456789",
    "created_date": "2025-08-30",
    "busschedule_id": "5f8d0d5f8f5c1a0017e7e931",
    "route_id": "5f8d0d5f8f5c1a0017e7e911",
    "bus_id": "5f8d0d5f8f5c1a0017e7e901",
    "pickup_stop_id": "5f8d0d5f8f5c1a0017e7e8a1",
    "pickup_name": "Delhi ISBT",
    "pickup_time": "06:00",
    "drop_stop_id": "5f8d0d5f8f5c1a0017e7e8a3",
    "drop_name": "Dehradun ISBT",
    "drop_time": "12:00",
    "distance": "250",
    "has_return": "0",
    "seat_no": "[A1,B1]",
    "no_of_seats": 2,
    "sub_total": "1000",
    "final_total_fare": "1180",
    "tax_amount": "180",
    "tax": "18",
    "fee": "0"
  }
}
```

## 6. Booking Creation

### API: `/api/v1/booking/create` (POST) - Requires Authentication
**Purpose**: Create booking with passenger details

```json
// Request
{
  "fareData": {
    "pnr_no": "PNR123456789",
    "created_date": "2025-08-30",
    "busschedule_id": "5f8d0d5f8f5c1a0017e7e931",
    "route_id": "5f8d0d5f8f5c1a0017e7e911",
    "bus_id": "5f8d0d5f8f5c1a0017e7e901",
    "pickup_stop_id": "5f8d0d5f8f5c1a0017e7e8a1",
    "drop_stop_id": "5f8d0d5f8f5c1a0017e7e8a3",
    "seat_no": "[A1,B1]",
    "has_return": "0",
    "pickup_time": "06:00",
    "drop_time": "12:00",
    "distance": "250",
    "sub_total": "1000",
    "final_total_fare": "1180",
    "tax_amount": "180",
    "tax": "18",
    "fee": "0"
  },
  "passengerDetailsItem": [
    {
      "name": "John Doe",
      "age": "30",
      "gender": "Male",
      "seat_no": "A1"
    },
    {
      "name": "Jane Doe",
      "age": "28",
      "gender": "Female", 
      "seat_no": "B1"
    }
  ],
  "offer_code": ""
}

// Response
{
  "status": true,
  "message": "Successfully booked ticket",
  "data": {
    "getbookingData": {
      "pnr_no": "PNR123456789",
      "route_name": "Delhi to Dehradun Route",
      "pickup_name": "Delhi ISBT",
      "drop_name": "Dehradun ISBT",
      "bus_name": "Delhi Dehradun Express",
      "final_total_fare": "1180",
      "travel_status": "PROCESSING"
    },
    "persistedPassenger": [
      {
        "name": "John Doe",
        "age": "30",
        "gender": "Male",
        "seat_no": "A1"
      }
    ],
    "walletBalance": "5000"
  }
}
```

## 7. Payment Processing

### API: `/api/v1/booking/payment` (POST) - Requires Authentication
**Purpose**: Process payment for the booking

```json
// Request for Wallet Payment
{
  "amount": "1180",
  "pnr_no": "PNR123456789",
  "payment_mode": "WALLET",
  "date": "2025-08-30"
}

// Request for Online Payment
{
  "amount": "1180",
  "pnr_no": "PNR123456789",
  "payment_mode": "UPI", // or "CARD", "PAYTM"
  "date": "2025-08-30"
}

// Response for Wallet Payment
{
  "status": true,
  "message": "booking payment successful with wallet.",
  "data": {
    "payment_mode": "WALLET",
    "amount": "1180"
  }
}

// Response for Online Payment
{
  "status": true,
  "message": "successfully generate booking order.",
  "verify_url": "https://api.example.com/api/booking/payment-verify",
  "data": {
    "orderId": "order_xyz123",
    "payment_mode": "UPI",
    "amount": "1180",
    "name": "Booking Ride - FER_abc123",
    "prefill": {
      "name": "John Doe",
      "email": "john@example.com",
      "contact": "9876543210"
    },
    "notes": {
      "ferri_order_id": "FER_abc123",
      "booking_pnr_no": "PNR123456789"
    },
    "payment_settings": {
      "key": "rzp_test_key",
      "currency": "INR"
    }
  }
}
```

## 8. Payment Verification (For Online Payments)

### API: `/api/v1/booking/payment-verify` (POST) - Requires Authentication
**Purpose**: Verify online payment completion

```json
// Request
{
  "orderId": "order_xyz123",
  "paymentId": "pay_abc123",
  "signature": "signature_hash",
  "status": "true"
}

// Response
{
  "status": true,
  "message": "payment verified successfully.",
  "verification": "success",
  "data": {
    "pnr_no": "PNR123456789",
    "final_total_fare": "1180"
  }
}
```

## Complete Frontend Flow Summary

1. **Search Locations** → User enters pickup/drop cities
2. **Search Routes** → System finds available routes with timings
3. **Select Route** → User chooses preferred route and bus
4. **View Seat Layout** → System shows bus layout with available seats
5. **Select Seats** → User selects desired seats
6. **Calculate Fare** → System calculates exact fare for selected seats
7. **Enter Passenger Details** → User provides passenger information
8. **Create Booking** → System creates booking (status: PROCESSING)
9. **Make Payment** → User pays via wallet or online payment gateway
10. **Verify Payment** → System confirms payment and updates booking status to SCHEDULED

## Security Considerations

1. **Server-Side Fare Calculation**: All pricing should be calculated server-side to prevent manipulation
2. **Authentication**: Most APIs require user authentication
3. **Seat Availability**: Real-time seat availability checking prevents overbooking
4. **Payment Verification**: Online payments require server-side verification
5. **Data Validation**: All inputs are validated server-side

## Error Handling

Each step includes proper error handling:
- Route not found
- Seats unavailable
- Insufficient wallet balance
- Payment failures
- Network timeouts
- Invalid input data

This complete flow ensures a secure, user-friendly booking experience with proper validation at each step.