# Frontend Route Search Flow and API Sequence

## Overview

When a user searches for routes in the frontend, there's a specific sequence of API calls that need to be made to complete the booking process. Here's the complete flow:

## 1. Initial Route Search

### API Call: `/api/v1/route-search`
**Method:** POST

**Request Body:**
```json
{
  "pickup_city": "Delhi",
  "drop_city": "Dehradun", 
  "current_date": "2025-08-30",
  "current_time": "07:00"
}
```

**Response:**
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

## 2. After Route Search - Next API Calls

Once the user gets the route search results, they need to proceed with the following sequence:

### Step 1: Get Route Details (Optional)
**API Call:** `/api/v1/:routeId`
**Method:** POST

**Request Body:**
```json
{
  "pickup_stop_id": "5f8d0d5f8f5c1a0017e7e8a1",
  "drop_stop_id": "5f8d0d5f8f5c1a0017e7e8a3"
}
```

This returns detailed information about all stops on the route.

### Step 2: Generate Fare for Selected Seats
**API Call:** `/api/v1/fare/generate-seat-fare`
**Method:** POST
**Authentication:** Required

**Request Body:**
```json
{
  "busschedule_id": "5f8d0d5f8f5c1a0017e7e931",
  "route_id": "5f8d0d5f8f5c1a0017e7e911",
  "bus_id": "5f8d0d5f8f5c1a0017e7e901",
  "pickup_stop_id": "5f8d0d5f8f5c1a0017e7e8a1",
  "drop_stop_id": "5f8d0d5f8f5c1a0017e7e8a3",
  "seat_no": "[A1,A2]",
  "has_return": "0",
  "start_date": "2025-08-30"
}
```

**Response:**
```json
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
    "seat_no": "[A1,A2]",
    "no_of_seats": 2,
    "sub_total": "1000",
    "final_total_fare": "1180",
    "tax_amount": "180",
    "tax": "18",
    "fee": "0"
  }
}
```

### Step 3: Create Booking
**API Call:** `/api/v1/booking/create`
**Method:** POST
**Authentication:** Required

**Request Body:**
```json
{
  "fareData": {
    "pnr_no": "PNR123456789",
    "created_date": "2025-08-30",
    "busschedule_id": "5f8d0d5f8f5c1a0017e7e931",
    "route_id": "5f8d0d5f8f5c1a0017e7e911",
    "bus_id": "5f8d0d5f8f5c1a0017e7e901",
    "pickup_stop_id": "5f8d0d5f8f5c1a0017e7e8a1",
    "drop_stop_id": "5f8d0d5f8f5c1a0017e7e8a3",
    "seat_no": "[A1,A2]",
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
      "seat_no": "A2"
    }
  ],
  "offer_code": ""
}
```

**Response:**
```json
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
      },
      {
        "name": "Jane Doe",
        "age": "28",
        "gender": "Female", 
        "seat_no": "A2"
      }
    ],
    "walletBalance": "5000"
  }
}
```

### Step 4: Make Payment
**API Call:** `/api/v1/booking/payment`
**Method:** POST
**Authentication:** Required

**Request Body:**
```json
{
  "amount": "1180",
  "pnr_no": "PNR123456789",
  "payment_mode": "WALLET", // or "UPI", "CARD", "PAYTM"
  "date": "2025-08-30"
}
```

**For Wallet Payment Response:**
```json
{
  "status": true,
  "message": "booking payment successful with wallet.",
  "data": {
    "payment_mode": "WALLET",
    "amount": "1180"
  }
}
```

**For Online Payment Response:**
```json
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

### Step 5: Payment Verification (For Online Payments)
**API Call:** `/api/v1/booking/payment-verify`
**Method:** POST
**Authentication:** Required

**Request Body:**
```json
{
  "orderId": "order_xyz123",
  "paymentId": "pay_abc123",
  "signature": "signature_hash",
  "status": "true"
}
```

**Response:**
```json
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

1. **Search Routes** → Get available routes with bus details and timings
2. **Select Route & Seats** → User chooses preferred route and seats
3. **Generate Fare** → Calculate total fare including taxes and fees
4. **Create Booking** → Save booking with passenger details (status: PROCESSING)
5. **Make Payment** → Process payment via wallet or online gateway
6. **Verify Payment** → Confirm payment success (status: SCHEDULED)

## Important Notes

### Bus Schedules vs Bus Schedule Locations

- **Bus Schedules**: Contains overall route timing and operational days
- **Bus Schedule Locations**: Contains specific arrival/departure times for each stop

The `departure_time` and `arrival_time` in bus_schedules represent the overall journey time, while bus_schedule_locations contain granular stop-by-stop timings. Both are important:

- Bus schedules help filter routes by operational days and overall timing
- Bus schedule locations provide exact pickup/drop times for passengers

### Authentication Requirements

Most APIs after route search require user authentication:
- `/api/v1/fare/generate-seat-fare` - Requires auth
- `/api/v1/booking/create` - Requires auth  
- `/api/v1/booking/payment` - Requires auth
- `/api/v1/booking/payment-verify` - Requires auth

### Error Handling

Each API call should handle potential errors:
- Route not found
- Seats unavailable
- Insufficient wallet balance
- Payment failures
- Network timeouts

The frontend should implement proper error handling and user feedback for each step in the booking process.