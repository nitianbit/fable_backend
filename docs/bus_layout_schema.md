# Bus Layout Schema Documentation

## Overview
This document provides the complete schema for bus layouts used in the Fable Backend system. The bus layout schema defines how seats are arranged in different bus types and how seat availability is managed.

## Bus Layout Model Schema

```javascript
const busLayoutSchema = new mongoose.Schema({
    name: {
        type: String,
        index: true,
    },
    max_seats: {
        type: String,
        index: true,
        default: '',
    },
    layout: {
        type: String,
        index: true,
        default: ''
    },
    combine_seats: {
        type: [Object],
        default: []
    },
    seat_numbers: {
        type: String,
        index: true,
        default: '',
    },
    last_seat: {
        type: String,
        default: ''
    },
    status: { 
        type: Boolean, 
        default: true 
    },
}, {
    timestamps: true,
});
```

## Field Descriptions

### Core Fields
- **`name`** (String): Human-readable name for the layout (e.g., "Standard Layout", "Deluxe Layout")
- **`max_seats`** (String): Maximum number of seats in this layout (e.g., "40", "50")
- **`layout`** (String): Layout type identifier (e.g., "layout-1", "layout-2", etc.)
- **`seat_numbers`** (String): Comma-separated list of all seat numbers (e.g., "A1,B1,C1,D1,E1,F1,G1,H1,I1,J1")
- **`last_seat`** (String): The last seat number in the layout (e.g., "Z1")
- **`status`** (Boolean): Whether the layout is active (default: true)

### Seat Configuration
- **`combine_seats`** (Array of Objects): Defines the seat arrangement structure

## Layout Types

The system supports 6 different layout types:

| Layout ID | Layout Name | Description | Example |
|-----------|-------------|-------------|---------|
| `layout-1` | `1 X 1` | Single seat per row | Luxury buses |
| `layout-2` | `1 X 2` | Two seats per row | Small buses |
| `layout-3` | `2 X 1` | Two rows, one seat each | Narrow buses |
| `layout-4` | `2 X 2` | Two rows, two seats each | Standard buses |
| `layout-5` | `2 X 3` | Two rows, three seats each | Wide buses |
| `layout-6` | `3 X 2` | Three rows, two seats each | Large buses |

## Combine Seats Structure

The `combine_seats` field is a 6-element array representing the seat arrangement:

```javascript
combine_seats: [
    left_1,    // Left side, row 1
    left_2,    // Left side, row 2  
    left_3,    // Left side, row 3
    right_1,   // Right side, row 1
    right_2,   // Right side, row 2
    right_3    // Right side, row 3
]
```

### Seat Object Structure

Each seat in the `combine_seats` array has the following structure:

```javascript
{
    "seat_no": "A1",           // Seat identifier
    "seat_status": "empty"     // Status: "empty", "booked", "blocked"
}
```

## Example Bus Layout Data

### Standard 2x2 Layout (40 seats)

```javascript
{
    "_id": "507f1f77bcf86cd799439011",
    "name": "Standard Layout",
    "max_seats": "40",
    "layout": "layout-4",
    "seat_numbers": "A1,A2,B1,B2,C1,C2,D1,D2,E1,E2,F1,F2,G1,G2,H1,H2,I1,I2,J1,J2,K1,K2,L1,L2,M1,M2,N1,N2,O1,O2,P1,P2,Q1,Q2,R1,R2,S1,S2,T1,T2",
    "last_seat": "T2",
    "combine_seats": [
        // Left side, row 1
        [
            {"seat_no": "A1", "seat_status": "empty"},
            {"seat_no": "B1", "seat_status": "empty"},
            {"seat_no": "C1", "seat_status": "empty"},
            {"seat_no": "D1", "seat_status": "empty"},
            {"seat_no": "E1", "seat_status": "empty"},
            {"seat_no": "F1", "seat_status": "empty"},
            {"seat_no": "G1", "seat_status": "empty"},
            {"seat_no": "H1", "seat_status": "empty"},
            {"seat_no": "I1", "seat_status": "empty"},
            {"seat_no": "J1", "seat_status": "empty"}
        ],
        // Left side, row 2
        [
            {"seat_no": "K1", "seat_status": "empty"},
            {"seat_no": "L1", "seat_status": "empty"},
            {"seat_no": "M1", "seat_status": "empty"},
            {"seat_no": "N1", "seat_status": "empty"},
            {"seat_no": "O1", "seat_status": "empty"},
            {"seat_no": "P1", "seat_status": "empty"},
            {"seat_no": "Q1", "seat_status": "empty"},
            {"seat_no": "R1", "seat_status": "empty"},
            {"seat_no": "S1", "seat_status": "empty"},
            {"seat_no": "T1", "seat_status": "empty"}
        ],
        // Left side, row 3 (empty for 2x2 layout)
        [],
        // Right side, row 1
        [
            {"seat_no": "A2", "seat_status": "empty"},
            {"seat_no": "B2", "seat_status": "empty"},
            {"seat_no": "C2", "seat_status": "empty"},
            {"seat_no": "D2", "seat_status": "empty"},
            {"seat_no": "E2", "seat_status": "empty"},
            {"seat_no": "F2", "seat_status": "empty"},
            {"seat_no": "G2", "seat_status": "empty"},
            {"seat_no": "H2", "seat_status": "empty"},
            {"seat_no": "I2", "seat_status": "empty"},
            {"seat_no": "J2", "seat_status": "empty"}
        ],
        // Right side, row 2
        [
            {"seat_no": "K2", "seat_status": "empty"},
            {"seat_no": "L2", "seat_status": "empty"},
            {"seat_no": "M2", "seat_status": "empty"},
            {"seat_no": "N2", "seat_status": "empty"},
            {"seat_no": "O2", "seat_status": "empty"},
            {"seat_no": "P2", "seat_status": "empty"},
            {"seat_no": "Q2", "seat_status": "empty"},
            {"seat_no": "R2", "seat_status": "empty"},
            {"seat_no": "S2", "seat_status": "empty"},
            {"seat_no": "T2", "seat_status": "empty"}
        ],
        // Right side, row 3 (empty for 2x2 layout)
        []
    ],
    "status": true,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

### Luxury 1x1 Layout (20 seats)

```javascript
{
    "_id": "507f1f77bcf86cd799439012",
    "name": "Luxury Layout",
    "max_seats": "20",
    "layout": "layout-1",
    "seat_numbers": "A1,B1,C1,D1,E1,F1,G1,H1,I1,J1,K1,L1,M1,N1,O1,P1,Q1,R1,S1,T1",
    "last_seat": "T1",
    "combine_seats": [
        // Left side, row 1 (all seats)
        [
            {"seat_no": "A1", "seat_status": "empty"},
            {"seat_no": "B1", "seat_status": "empty"},
            {"seat_no": "C1", "seat_status": "empty"},
            {"seat_no": "D1", "seat_status": "empty"},
            {"seat_no": "E1", "seat_status": "empty"},
            {"seat_no": "F1", "seat_status": "empty"},
            {"seat_no": "G1", "seat_status": "empty"},
            {"seat_no": "H1", "seat_status": "empty"},
            {"seat_no": "I1", "seat_status": "empty"},
            {"seat_no": "J1", "seat_status": "empty"},
            {"seat_no": "K1", "seat_status": "empty"},
            {"seat_no": "L1", "seat_status": "empty"},
            {"seat_no": "M1", "seat_status": "empty"},
            {"seat_no": "N1", "seat_status": "empty"},
            {"seat_no": "O1", "seat_status": "empty"},
            {"seat_no": "P1", "seat_status": "empty"},
            {"seat_no": "Q1", "seat_status": "empty"},
            {"seat_no": "R1", "seat_status": "empty"},
            {"seat_no": "S1", "seat_status": "empty"},
            {"seat_no": "T1", "seat_status": "empty"}
        ],
        // Other rows empty for 1x1 layout
        [], [], [], [], []
    ],
    "status": true
}
```

## API Response Format

When fetching bus layout data through the API, the response includes:

```javascript
{
    "status": true,
    "message": "Successfully found bus seats",
    "data": {
        "id": "507f1f77bcf86cd799439011",
        "bus_name": "Delhi Dehradun Express",
        "bus_brand": "Volvo",
        "bus_model_no": "VOLVO-9400",
        "bus_amenities": ["AC", "WIFI", "WATER", "BLANKET"],
        "bus_type": "AC_SEATER",
        "bus_reg_no": "DL01AB1234",
        "buslayoutId": {
            "id": "507f1f77bcf86cd799439011",
            "max_seats": "40",
            "layout": "2 X 2",
            "name": "Standard Layout",
            "combine_seats": [
                [
                    {"seat_no": "A1", "seat_status": "empty"},
                    {"seat_no": "B1", "seat_status": "booked"},
                    {"seat_no": "C1", "seat_status": "empty"}
                ],
                [
                    {"seat_no": "A2", "seat_status": "empty"},
                    {"seat_no": "B2", "seat_status": "empty"},
                    {"seat_no": "C2", "seat_status": "booked"}
                ]
                // ... more seat rows
            ]
        },
        "final_total_fare": "500",
        "tax": "18",
        "tax_amount": "90"
    }
}
```

## Frontend Implementation Guide

### 1. Seat Status Types
- **`empty`**: Available for booking
- **`booked`**: Already booked by another passenger
- **`blocked`**: Temporarily blocked (maintenance, etc.)

### 2. Seat Numbering Convention
- **Format**: `{Row}{Column}` (e.g., A1, B2, C1)
- **Rows**: A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z
- **Columns**: 1, 2, 3 (depending on layout)

### 3. Visual Layout Mapping

For a 2x2 layout, the visual arrangement would be:

```
    Driver
    ┌─────────────────┐
    │ A1    A2        │
    │ B1    B2        │
    │ C1    C2        │
    │ D1    D2        │
    │ E1    E2        │
    │ F1    F2        │
    │ G1    G2        │
    │ H1    H2        │
    │ I1    I2        │
    │ J1    J2        │
    └─────────────────┘
```

### 4. React Component Example

```jsx
const BusSeatLayout = ({ busLayout }) => {
    const { combine_seats, layout, max_seats } = busLayout;
    
    const renderSeat = (seat) => (
        <div 
            key={seat.seat_no}
            className={`seat ${seat.seat_status}`}
            onClick={() => handleSeatClick(seat)}
        >
            {seat.seat_no}
        </div>
    );
    
    const renderRow = (rowSeats, rowIndex) => (
        <div key={rowIndex} className="seat-row">
            {rowSeats.map(renderSeat)}
        </div>
    );
    
    return (
        <div className="bus-layout">
            <div className="layout-info">
                <h3>{busLayout.name}</h3>
                <p>Layout: {layout} | Max Seats: {max_seats}</p>
            </div>
            <div className="seat-grid">
                {combine_seats.map((row, index) => 
                    row.length > 0 ? renderRow(row, index) : null
                )}
            </div>
        </div>
    );
};
```

### 5. CSS Styling Example

```css
.bus-layout {
    max-width: 400px;
    margin: 0 auto;
}

.seat-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.seat-row {
    display: flex;
    gap: 8px;
    justify-content: center;
}

.seat {
    width: 40px;
    height: 40px;
    border: 2px solid #ccc;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 12px;
    font-weight: bold;
}

.seat.empty {
    background-color: #e8f5e8;
    border-color: #4caf50;
}

.seat.booked {
    background-color: #ffebee;
    border-color: #f44336;
    cursor: not-allowed;
}

.seat.blocked {
    background-color: #f5f5f5;
    border-color: #9e9e9e;
    cursor: not-allowed;
}

.seat.selected {
    background-color: #2196f3;
    color: white;
    border-color: #1976d2;
}
```

## Seat Availability Logic

The system checks seat availability by:

1. **Querying existing bookings** for the specific bus schedule and date
2. **Comparing seat numbers** from bookings with available seats
3. **Updating seat status** to "booked" for occupied seats
4. **Returning updated layout** with current availability

## Integration with Booking System

When a user selects seats:

1. **Frontend sends** selected seat numbers (e.g., `["A1", "B1"]`)
2. **Backend validates** seat availability
3. **Booking is created** with seat numbers
4. **Layout is updated** to reflect new bookings

## Best Practices

1. **Always validate** seat availability before allowing selection
2. **Handle concurrent bookings** with proper locking mechanisms
3. **Update seat status** in real-time for better UX
4. **Provide visual feedback** for different seat states
5. **Support seat selection** for multiple passengers
6. **Handle seat blocking** during payment processing

This schema provides a flexible foundation for implementing various bus seat layouts while maintaining consistency across the application.


