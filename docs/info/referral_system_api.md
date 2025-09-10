# Referral System API Documentation

## Overview

The referral system allows users to earn rewards by referring new users to the platform. Users can share their referral code/link, and when new users register using that code, the referrer earns a reward after certain conditions are met.

## Database Models

### UserReferral Model
- `userId`: ID of the referred user
- `refferalId`: ID of the referrer
- `user_type`: Type of user (default: 'Customer')
- `start_date`: Start date of the referral period
- `end_date`: End date of the referral period
- `days`: Number of days for the referral validity
- `trips`: Number of trips completed by the referred user
- `amount`: Total referral amount
- `pending_amount`: Pending referral amount
- `payment_status`: Status ('Pending' or 'Completed')

### User Model (Referral Fields)
- `refercode`: Unique referral code for the user
- `referedby`: Referral code used during registration

## API Endpoints

### Base URL
```
http://your-domain/api/users
```

All endpoints require authentication except registration with referral.

---

## 1. Get Referral Code and Amount

**Endpoint:** `GET /refercode`

**Description:** Get the user's referral code and total earned amount.

**Authentication:** Required

**Response:**
```json
{
  "status": true,
  "message": "Successfully found refercode",
  "data": {
    "amount": "150",
    "refercode": "ABC123",
    "referral_policy": "Earn ₹100 for each successful referral"
  }
}
```

---

## 2. Get Referral Link

**Endpoint:** `GET /referlink`

**Description:** Get the shareable referral link for the user.

**Authentication:** Required

**Response:**
```json
{
  "status": true,
  "message": "Successfully found refercode",
  "data": "https://your-app.com/refer/ABC123"
}
```

---

## 3. Register with Referral Code

**Endpoint:** `POST /referrallink/:referral`

**Description:** Register a new user with a referral code.

**Authentication:** Not required

**Parameters:**
- URL Parameter: `referral` (string) - The referral code

**Request Body:**
```json
{
  "country_code": "91",
  "phone": "9876543210"
}
```

**Response:**
```json
{
  "title": "User Registration Successful",
  "status": true,
  "flag": 0,
  "otp": 1234,
  "userDetail": {
    "firstname": "",
    "lastname": "",
    "phone": "9876543210",
    "refercode": "DEF456"
  },
  "csrfToken": "token_here",
  "token": "auth_token_here"
}
```

---

## Frontend Integration Guide

### 1. Display Referral Code/Link

```javascript
// Get user's referral code and amount
const getReferralCode = async () => {
  try {
    const response = await fetch('/api/users/refercode', {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (data.status) {
      setReferralCode(data.data.refercode);
      setEarnedAmount(data.data.amount);
      setReferralPolicy(data.data.referral_policy);
    }
  } catch (error) {
    console.error('Error fetching referral code:', error);
  }
};

// Get referral link for sharing
const getReferralLink = async () => {
  try {
    const response = await fetch('/api/users/referlink', {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (data.status) {
      setReferralLink(data.data);
    }
  } catch (error) {
    console.error('Error fetching referral link:', error);
  }
};
```

### 2. Registration with Referral

```javascript
// During user registration
const registerWithReferral = async (phone, countryCode, referralCode) => {
  try {
    const response = await fetch(`/api/users/referrallink/${referralCode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        country_code: countryCode,
        phone: phone
      })
    });
    const data = await response.json();
    if (data.status) {
      // Handle successful registration
      // Store tokens, redirect to OTP verification
    }
  } catch (error) {
    console.error('Error registering with referral:', error);
  }
};
```

### 3. Share Referral Link

```javascript
const shareReferralLink = async () => {
  const referralLink = await getReferralLink();
  if (navigator.share) {
    navigator.share({
      title: 'Join me on this amazing app!',
      text: 'Use my referral code to get started and earn rewards!',
      url: referralLink
    });
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(referralLink);
    alert('Referral link copied to clipboard!');
  }
};
```

---

## Error Handling

### Common Error Responses

```json
{
  "status": false,
  "message": "Invalid referral code"
}

{
  "status": false,
  "message": "User already has an active referral"
}

{
  "status": false,
  "message": "Cannot apply your own referral code"
}

{
  "status": false,
  "message": "Kindly update your profile to generate refercode"
}
```

---

## Business Logic

1. **Referral Code Generation:** Automatically generated during user registration using phone number
2. **Referral Validity:** 30 days from the date of application
3. **Reward Amount:** ₹100 per successful referral
4. **Payment Status:** Changes to 'Completed' after the validity period and successful trips
5. **Referral During Registration:** Users can only use a referral code during the registration process

---

## Security Considerations

- All referral endpoints (except registration) require authentication
- Referral codes are validated against existing users
- Users cannot use their own referral codes
- Referral codes can only be used during registration

---

## Testing

### Sample Test Cases

1. **Valid Referral During Registration:**
   - Register user A
   - Get user A's referral code
   - Register user B with user A's referral code in the URL
   - Verify referral record is created

2. **Invalid Referral Code:**
   - Try to register with non-existent referral code
   - Should return error message

3. **Self-Referral Prevention:**
   - Try to register with user's own referral code
   - Should return error message