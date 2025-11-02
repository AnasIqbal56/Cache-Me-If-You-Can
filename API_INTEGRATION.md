# API Integration Setup Guide

This guide explains how the frontend now connects to the backend API controllers.

## Changes Made

### 1. API Configuration (`frontend/app/config/api.ts`)
- Created centralized API endpoint configuration
- All API endpoints are defined in one place
- Helper function `apiRequest` handles authentication and cookies

### 2. Login (`frontend/app/routes/login.tsx`)
- Now calls `POST /api/v/users/login` with phone number and password
- Stores authentication data in localStorage:
  - `isAuthenticated`
  - `userPhone`
  - `userRole` (seller/buyer)
  - `accessToken`
  - `userId`
  - `username`
- Redirects based on role: sellers → `/farmer-dashboard`, buyers → `/marketplace`

### 3. Signup (`frontend/app/routes/signup.tsx`)
- Now calls `POST /api/v/users/register` with:
  - `username` (from name field)
  - `phoneno`
  - `password`
  - `confirmPassword`
  - `role` (farmer/buyer)
  - `region`
- After registration, automatically logs in the user
- Stores authentication data in localStorage
- Redirects based on selected role

### 4. Logout (Both Marketplace & Farmer Dashboard)
- Now calls `POST /api/v/users/logout`
- Clears all localStorage data
- Redirects to home page

## Backend Requirements

### 1. Environment Variables
Create a `.env` file in the `Backend` directory with:

```env
PORT=8000
MONGODB_URI=your_mongodb_connection_string
CORS_ORIGIN=http://localhost:5173
ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=10d
```

### 2. CORS Configuration
The backend must allow requests from the frontend origin (default: `http://localhost:5173`).
This is already configured in `Backend/src/app.js`.

### 3. API Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v/users/register` | POST | Register new user |
| `/api/v/users/login` | POST | Login user |
| `/api/v/users/logout` | POST | Logout user (requires auth) |

### 4. Expected Request/Response Format

#### Register Request
```json
{
  "username": "John Doe",
  "phoneno": "+1234567890",
  "password": "password123",
  "confirmPassword": "password123",
  "role": "buyer",
  "region": "California"
}
```

#### Login Request
```json
{
  "phoneno": "+1234567890",
  "password": "password123"
}
```

#### Login/Register Response
```json
{
  "statusCode": 200,
  "data": {
    "user": {
      "_id": "...",
      "username": "John Doe",
      "phoneno": "+1234567890",
      "role": "buyer",
      "region": "California"
    },
    "accessToken": "...",
    "refreshToken": "..."
  },
  "message": "User Logged in Successfully",
  "success": true
}
```

## Frontend Environment Variables

Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:8000
```

## Testing

### 1. Start Backend
```bash
cd Backend
npm install  # if not already installed
npm start    # or npm run dev
```

### 2. Start Frontend
```bash
cd frontend
npm install  # if not already installed
npm run dev
```

### 3. Test Flow
1. Go to `/signup`
2. Fill in the form with:
   - Name
   - Phone number
   - Password & Confirm Password
   - Select role (Farmer/Buyer)
   - Enter region
3. Submit - should redirect based on role
4. Try logging out
5. Go to `/login` and login with the same credentials
6. Should redirect to appropriate dashboard

## Notes

- Authentication uses HTTP-only cookies for security
- Access tokens are also stored in localStorage for API requests
- All API requests include credentials (cookies) automatically
- Error handling is implemented for all API calls
- If API call fails, user sees appropriate error messages

## Troubleshooting

### CORS Errors
- Ensure `CORS_ORIGIN` in backend `.env` matches frontend URL
- Default frontend dev server runs on `http://localhost:5173`

### Connection Refused
- Ensure backend is running on port 8000
- Check if `VITE_API_URL` in frontend `.env` is correct

### Authentication Errors
- Ensure MongoDB is running and connected
- Check if JWT secrets are configured in backend `.env`
- Verify cookies are being sent (check browser DevTools → Network → Cookies)
