# Notification System - Implementation Summary

## Overview
A persistent, real-time notification system that works whether users are logged in or logged out. Notifications are stored in the database and displayed in a notification bell component in the navbar.

## Features

### 1. **Persistent Notifications**
- ✅ All notifications are stored in MongoDB
- ✅ Users can view notifications even after logging out and logging back in
- ✅ Unread count is tracked for each user

### 2. **Notification Types**
- **request**: When a mentor receives a session request or when a student's request is accepted/rejected
- **chat**: When a new message is received in a chat
- **session**: For session-related updates (extensible)
- **review**: For review-related updates (extensible)
- **logout**: When a mentor or user logs out or goes offline

### 3. **Real-Time Updates**
- Notifications are created immediately when:
  - A student creates a session request
  - A mentor accepts/rejects a request
  - A message is sent in a chat
- Frontend polls for new notifications every 5 seconds
- Notification badge shows unread count in navbar

### 4. **User Experience**
- Notification bell 🔔 in top navbar with unread badge
- Click bell to open notification panel
- Notifications show sender name, message preview, and timestamp
- Users can mark notifications as read
- Users can delete individual notifications
- "Mark all as read" button available

## Backend Implementation

### Models

#### Notification Model (`server/models/Notification.js`)
```javascript
{
  recipient: ObjectId (User),
  type: String (enum: chat, request, session, review, logout),
  title: String,
  message: String,
  data: {
    requestId: ObjectId,
    sessionId: ObjectId,
    senderId: ObjectId,
    senderName: String
  },
  read: Boolean (default: false),
  readAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### User Model (`server/models/User.js`) - New Activity Tracking Fields
```javascript
{
  // ... existing fields
  isOnline: Boolean (default: false),
  lastActivity: Date (default: current date),
  lastLogout: Date (default: null)
}
```

### Controllers

#### Notification Controller (`server/controllers/notificationController.js`)
- `getNotifications(userId)`: Fetch all notifications for a user with unread count
- `getUnreadCount(userId)`: Get only the unread notification count
- `markAsRead(notificationId)`: Mark a single notification as read
- `markAllAsRead(userId)`: Mark all user notifications as read
- `deleteNotification(notificationId)`: Delete a notification
- `createNotification()`: Helper function called by other controllers

### Routes

#### Notification Routes (`server/routes/notificationRoutes.js`)
- `GET /api/notifications/:userId` - Get all notifications
- `GET /api/notifications/:userId/unread-count` - Get unread count
- `PATCH /api/notifications/:notificationId/read` - Mark as read
- `PATCH /api/notifications/:userId/read-all` - Mark all as read
- `DELETE /api/notifications/:notificationId` - Delete notification

#### Auth Routes (`server/routes/authRoutes.js`) - New Logout Endpoint
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user (marks as online)
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - Logout user (marks as offline, sends logout notifications)

#### User Routes (`server/routes/userRoutes.js`) - New Activity Tracking
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `PATCH /api/users/track-activity` - Update last activity timestamp

### Event Handlers

#### Socket.io Integration (`server/server.js`)
When a message is sent via Socket.io:
1. Message is saved to database
2. Notification is created for the other party
3. Real-time "new-message" event is emitted to chat participants

#### Request Status Updates (`server/controllers/requestController.js`)
- **On Request Creation**: Notification sent to mentor
- **On Accept**: Notification sent to student with "You can now chat!" message
- **On Reject**: Notification sent to student

#### Logout Notifications (`server/controllers/authController.js`)
- **On Logout**: 
  1. User marked as offline (`isOnline: false`)
  2. `lastLogout` timestamp recorded
  3. All users who have active sessions or chats with this user are notified
  4. Notifications say: "{User} ({role}) has logged out"

## Frontend Implementation

### Services

#### Notification Service (`client/src/services/notificationService.js`)
```javascript
getNotifications(userId)        // Fetch all notifications
getUnreadCount(userId)          // Get unread count
markAsRead(notificationId)      // Mark one as read
markAllAsRead(userId)           // Mark all as read
deleteNotification(notificationId) // Delete notification
```

### Components

#### NotificationBell Component (`client/src/components/NotificationBell.jsx`)
- Displays bell icon with unread badge
- Opens/closes notification panel on click
- Shows list of notifications
- Features:
  - Click outside to close
  - Auto-polls for updates every 5 seconds
  - Click notification to mark as read
  - Delete individual notifications
  - Mark all as read button

#### Integration into Navbar (`client/src/components/Navbar.jsx`)
- `<NotificationBell />` component added before user chip
- Shows for authenticated users only

### Styling

#### NotificationBell.css
- Responsive design (works on mobile)
- Notification badge styling
- Dropdown panel with scrolling
- Hover effects and transitions
- Unread notification highlighting

## Logout & Offline Notifications Feature

### Overview
When a user (mentor or student) logs out or goes inactive, all connected users are notified automatically through persistent notifications that appear in the notification bell.

### How It Works

#### User Logout Flow
1. **User initiates logout**: Clicks logout button or closes application
2. **Frontend calls logout endpoint**: `POST /api/auth/logout`
3. **Backend processing**:
   - Marks user as `isOnline: false`
   - Records `lastLogout` timestamp
   - Finds all related users (from active session requests and chats)
   - Creates notifications for each related user
4. **Frontend clears session**: Removes token, redirects to login
5. **Related users receive notification**: Can see in notification bell

#### Activity Tracking
- **Automatic tracking**: Every 30 seconds, frontend calls `PATCH /api/users/track-activity`
- **Backend updates**: Records `lastActivity` timestamp and sets `isOnline: true`
- **Purpose**: Helps differentiate between inactive users and logged-out users

#### On Login
- User is marked as `isOnline: true`
- `lastActivity` is updated to current time

### Implementation Details

#### Backend - Auth Controller (`server/controllers/authController.js`)
```javascript
export const logout = async (req, res) => {
  // 1. Get user ID from authenticated request
  // 2. Update user: isOnline = false, lastLogout = now
  // 3. Find all related users from:
  //    - Accepted session requests (mentors & students)
  //    - Chat messages (senders & recipients)
  // 4. For each related user, create logout notification
  // 5. Return success response
}
```

#### Frontend - Activity Tracking (`client/src/App.jsx`)
```javascript
const ActivityTracker = () => {
  // Tracks user activity every 30 seconds
  // Calls: PATCH /api/users/track-activity
  // Updates lastActivity timestamp on backend
}
```

#### Frontend - Auth Service (`client/src/services/authService.js`)
```javascript
export const logoutUser = async () => {
  // Calls: POST /api/auth/logout
  // Sends logout notification to all related users
}
```

#### Frontend - Auth Context (`client/src/context/AuthContext.jsx`)
```javascript
const logout = async () => {
  // 1. Call logoutUser() API
  // 2. Clear token from localStorage
  // 3. Clear user from context
  // 4. Redirect to login
}
```

### Notification Details

#### Logout Notification Object
```javascript
{
  type: "logout",
  title: "{UserName} is offline",
  message: "{UserName} ({role}) has logged out. You can chat with them again once they're back online.",
  data: {
    senderId: ObjectId,
    senderName: String
  },
  read: false
}
```

### Related Users Identification
The system finds related users in two ways:

#### 1. From Session Requests
- All accepted session requests where the logging-out user is either mentor or student
- Extracts the other party (if logged-out user is mentor, finds student; and vice versa)

#### 2. From Chat History
- All chat messages where the logging-out user is either sender or recipient
- Extracts all unique users who have exchanged messages with this user

### Example Scenario

**User: John (Mentor) logs out**
1. John clicks "Logout" button
2. Frontend calls: `POST /api/auth/logout` (authenticated with John's token)
3. Backend finds:
   - Jane (student) has accepted session request from John
   - Bob (student) has chatted with John
   - Sarah (student) has chatted with John
4. Backend creates 3 notifications:
   - "John is offline" → Jane
   - "John is offline" → Bob
   - "John is offline" → Sarah
5. Jane, Bob, and Sarah see notifications in their notification bells
6. They can click the bell anytime to read the notification

## Database Queries

### Get all notifications for a user
```javascript
Notification.find({ recipient: userId })
  .sort({ createdAt: -1 })
  .populate("data.senderId", "name")
```

### Get unread count
```javascript
Notification.countDocuments({
  recipient: userId,
  read: false
})
```

### Mark as read
```javascript
Notification.findByIdAndUpdate(
  notificationId,
  { read: true, readAt: new Date() }
)
```

## User Workflows

### For Students
1. **Send Request**: Creates notification for mentor
2. **View Result**: Gets notification when mentor accepts/rejects
3. **Chat Messages**: Gets notifications when mentor sends messages
4. **Check Notifications**: Click bell → view notification panel

### For Mentors
1. **Receive Request**: Gets notification from student
2. **Accept/Reject**: Student gets notification of the decision
3. **Chat Messages**: Gets notifications when student sends messages
4. **Check Notifications**: Click bell → view notification panel

## Offline Support

### Current Implementation
- ✅ Notifications persist in database
- ✅ Users see all past notifications when they log back in
- ✅ Unread count shows how many new notifications await

### Future Enhancements
- Email notifications for important events
- Browser push notifications (using Web Notifications API)
- SMS notifications for critical updates
- Notification preferences per user

## Testing the System

### Create a Test Notification
```javascript
// In any controller
await createNotification(
  studentId,
  "test",
  "Test Notification",
  "This is a test notification",
  { senderId: mentorId }
)
```

### Verify in Frontend
1. User logs in
2. Notification bell shows count badge
3. Click bell to see notification panel
4. Click notification to mark as read
5. Logout and log back in - notification still visible

## Files Modified/Created

### Backend
- ✅ `server/models/Notification.js` - NEW
- ✅ `server/controllers/notificationController.js` - NEW
- ✅ `server/routes/notificationRoutes.js` - NEW
- ✅ `server/controllers/requestController.js` - UPDATED (imports createNotification)
- ✅ `server/server.js` - UPDATED (socket.io handler, imports notification routes)

### Frontend
- ✅ `client/src/services/notificationService.js` - NEW
- ✅ `client/src/components/NotificationBell.jsx` - NEW
- ✅ `client/src/components/NotificationBell.css` - NEW
- ✅ `client/src/components/Navbar.jsx` - UPDATED (imports NotificationBell)

## Notifications Created During Normal Flow

| Event | Type | Recipient | Message |
|-------|------|-----------|---------|
| Student sends request | request | Mentor | "New Session Request" |
| Mentor accepts request | request | Student | "Request Accepted - You can now chat!" |
| Mentor rejects request | request | Student | "Request Rejected" |
| Message sent in chat | chat | Other party | Message preview (first 50 chars) |

## Environment Setup
No additional environment variables needed. Uses existing:
- `VITE_API_URL` (frontend)
- `CLIENT_URL` (backend for CORS)

## Performance Considerations
- Notifications indexed by `recipient` and `read` fields for fast queries
- Frontend polls every 5 seconds (can be adjusted)
- Notifications soft-deleted (marked as read) rather than removed
- Socket.io integration provides real-time chat notifications

## Security
- All notification routes protected with `auth` middleware
- Users can only see their own notifications
- Notifications can only be deleted by authorized users
- No sensitive data stored in notification messages
