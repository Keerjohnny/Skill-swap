# Logout & Offline Notification Feature - Implementation Guide

## 🎯 Feature Overview

When a mentor or user logs out or goes inactive, all connected users receive **persistent notifications** through the notification bell. This allows real-time awareness of user availability without relying on real-time WebSocket connections.

## ✅ What Was Implemented

### Backend Changes

#### 1. **User Model Updates** (`server/models/User.js`)
Added three new fields to track user activity:
- `isOnline` (Boolean): Indicates if user is currently online
- `lastActivity` (Date): Timestamp of last user activity
- `lastLogout` (Date): Timestamp of last logout

#### 2. **Notification Model Update** (`server/models/Notification.js`)
- Added "logout" to notification types enum
- Now supports: `["chat", "request", "session", "review", "logout"]`

#### 3. **Auth Controller Enhancement** (`server/controllers/authController.js`)
**New Functions:**
- `login()`: Updated to mark user as online on login
- `logout()`: New endpoint that:
  - Marks user as offline (`isOnline: false`)
  - Records logout timestamp (`lastLogout`)
  - Finds all related users (from session requests & chats)
  - Creates logout notifications for each related user

**Imports:**
```javascript
import Notification from "../models/Notification.js";
import SessionRequest from "../models/SessionRequest.js";
import Chat from "../models/Chat.js";
import { createNotification } from "./notificationController.js";
```

#### 4. **User Controller Enhancement** (`server/controllers/userController.js`)
**New Function:**
- `updateLastActivity()`: Tracks user activity by updating the `lastActivity` timestamp

#### 5. **Auth Routes Update** (`server/routes/authRoutes.js`)
**New Endpoint:**
- `POST /api/auth/logout` (requires authentication)
  - Calls the logout controller function
  - Triggers notification creation for related users

#### 6. **User Routes Update** (`server/routes/userRoutes.js`)
**New Endpoint:**
- `PATCH /api/users/track-activity` (requires authentication)
  - Called every 30 seconds by frontend
  - Updates `lastActivity` and sets `isOnline: true`

### Frontend Changes

#### 1. **Auth Service Update** (`client/src/services/authService.js`)
**New Function:**
```javascript
export const logoutUser = async () => {
  // Calls: POST /api/auth/logout
  // Sends request to notify related users
  // Works in both production and demo mode
}
```

#### 2. **Auth Context Update** (`client/src/context/AuthContext.jsx`)
**Updated logout function:**
- Now asynchronously calls `logoutUser()` API
- Falls back to local cleanup even if API fails
- Ensures notifications are sent to related users before session is cleared

#### 3. **User Service Enhancement** (`client/src/services/userService.js`)
**New Function:**
```javascript
export const trackUserActivity = async () => {
  // Calls: PATCH /api/users/track-activity
  // Updates activity timestamp on backend
  // Handles errors gracefully
}
```

#### 4. **App Component Enhancement** (`client/src/App.jsx`)
**New Component: `ActivityTracker`**
- Runs automatically when user is logged in
- Calls `trackUserActivity()` every 30 seconds
- Updates `lastActivity` on backend
- Helps distinguish between inactive users and logged-out users

## 🔄 How It Works

### Logout Flow (Sequence)

```
1. User clicks "Logout" button
                 ↓
2. Frontend calls: POST /api/auth/logout (with auth token)
                 ↓
3. Backend:
   - Marks user as offline (isOnline = false)
   - Records logout timestamp (lastLogout = now)
   - Finds all related users from:
     * Accepted session requests
     * Chat message history
                 ↓
4. For each related user:
   - Creates logout notification
   - Notification stored in database
                 ↓
5. Frontend:
   - Removes token from localStorage
   - Clears user from context
   - Redirects to login page
                 ↓
6. Related users:
   - Poll notifications every 5 seconds
   - See new "User is offline" notification
   - Can click bell to view notification
```

### Activity Tracking Flow

```
Every 30 seconds (while logged in):
                 ↓
Frontend calls: PATCH /api/users/track-activity
                 ↓
Backend updates: lastActivity = now, isOnline = true
```

## 📱 User Experience

### For Mentors/Students Receiving Notification

1. **See Badge**: Notification bell shows unread count badge
2. **Click Bell**: Opens notification panel
3. **Read Message**: "John (Mentor) is offline. You can chat with them again once they're back online."
4. **Mark as Read**: Click notification or "Mark all as read"
5. **Delete**: Remove notification if not needed

### Notification Example

```
Title: "John is offline"
Type: logout
Message: "John (mentor) has logged out. You can chat with them again once they're back online."
Status: Unread (shown with highlight)
Timestamp: "2 minutes ago"
```

## 🔧 Database Schema

### User Model (New Fields)
```javascript
{
  // ... existing fields
  isOnline: {
    type: Boolean,
    default: false
  },
  lastActivity: {
    type: Date,
    default: () => new Date()
  },
  lastLogout: {
    type: Date,
    default: null
  }
}
```

### Notification Model (Updated)
```javascript
{
  type: {
    enum: ["chat", "request", "session", "review", "logout"]
  },
  // ... rest remains the same
}
```

## 🧪 Testing the Feature

### Test 1: Logout Notification
1. **Setup**: 
   - User A (Mentor) and User B (Student) have an accepted session request
2. **Action**:
   - User A logs in
   - User B logs in
   - User A logs out (clicks logout)
3. **Expected Result**:
   - User B sees notification: "User A is offline"
   - Notification appears in notification bell
   - Unread count increases

### Test 2: Activity Tracking
1. **Setup**: User is logged in
2. **Action**: Wait and watch network tab
3. **Expected Result**:
   - Every 30 seconds, `PATCH /api/users/track-activity` request is made
   - User's `lastActivity` timestamp updates in database

### Test 3: Notification Persistence
1. **Setup**: User B receives offline notification from User A
2. **Action**: User B logs out without reading notification
3. **Step**: User B logs back in
4. **Expected Result**:
   - Notification still exists
   - Can still be read/deleted

## 🚀 API Endpoints Reference

### Auth Endpoints

#### Login
- **Endpoint**: `POST /api/auth/login`
- **Body**: `{ email, password }`
- **Effect**: Sets user `isOnline = true`, updates `lastActivity`

#### Logout
- **Endpoint**: `POST /api/auth/logout` (requires auth)
- **Body**: Empty
- **Effect**: 
  - Sets user `isOnline = false`
  - Records `lastLogout` timestamp
  - Creates logout notifications for related users

### User Endpoints

#### Track Activity
- **Endpoint**: `PATCH /api/users/track-activity` (requires auth)
- **Body**: Empty
- **Effect**: Updates `lastActivity` to current time, sets `isOnline = true`

## 📊 Related Users Detection

The system identifies related users as those who:

1. **Have Accepted Session Requests** with the logging-out user
   - Query: `SessionRequest.find({ status: "accepted" })`
   - Includes both mentors and students

2. **Have Chat History** with the logging-out user
   - Query: `Chat.find({ $or: [{ senderId }, { recipientId }] })`
   - Includes all unique users who've exchanged messages

## 🎓 How to Use

### For End Users

1. **When you see a logout notification**:
   - Click the bell icon 🔔 at the top
   - See message: "[User] has logged out"
   - Click to mark as read or delete

2. **To log out properly**:
   - Click the logout button in your dashboard
   - Related users will be notified
   - You'll be redirected to login

### For Developers

1. **To customize notification message**:
   - Edit in `server/controllers/authController.js` logout function
   - Look for `createNotification()` call with "logout" type

2. **To change activity tracking interval**:
   - Edit in `client/src/App.jsx` ActivityTracker component
   - Change `30000` (milliseconds) to desired interval

3. **To modify related users detection**:
   - Edit in `server/controllers/authController.js` logout function
   - Modify SessionRequest and Chat queries

## 🔒 Security Notes

- Logout endpoint requires authentication (user token)
- Only authenticated users can trigger notifications
- Notifications are user-specific (stored with recipient ID)
- Activity tracking requires valid user session

## 📝 Files Modified

1. ✅ `server/models/User.js`
2. ✅ `server/models/Notification.js`
3. ✅ `server/controllers/authController.js`
4. ✅ `server/controllers/userController.js`
5. ✅ `server/routes/authRoutes.js`
6. ✅ `server/routes/userRoutes.js`
7. ✅ `client/src/services/authService.js`
8. ✅ `client/src/services/userService.js`
9. ✅ `client/src/context/AuthContext.jsx`
10. ✅ `client/src/App.jsx`
11. ✅ `NOTIFICATION_SYSTEM.md` (documentation updated)

## 🎉 Feature is Complete!

The logout notification system is now fully implemented. Users will automatically receive notifications when mentors or other users they're connected with log out or go offline. The notifications persist in the database and can be viewed at any time through the notification bell.
