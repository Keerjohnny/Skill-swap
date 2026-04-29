# Real-Time Chat System Implementation

## Overview

A real-time chat system has been added to the Skill Swap platform using **Socket.io**. This system allows students and mentors to communicate in real-time after a mentor accepts a student's session request.

## How It Works

### 1. **Session Request Flow**
- Student requests a session with a mentor
- Mentor receives the request and can accept or reject it
- **When mentor accepts**: A chat room is automatically created
- Chat becomes available for both student and mentor

### 2. **Chat Architecture**

#### Backend (Node.js + Socket.io)
- Uses Socket.io for real-time bidirectional communication
- Messages are persisted to MongoDB via the Chat model
- Each chat is associated with a SessionRequest

#### Frontend (React + Socket.io-client)
- Real-time message display using WebSocket connection
- Auto-scrolls to latest messages
- Shows online/offline status of participants
- Keyboard shortcuts: Press Enter to send, Shift+Enter for new line

## Features

### ✅ Real-Time Messaging
- Messages appear instantly for both participants
- No page refresh needed

### ✅ Message Persistence
- All messages are saved to the database
- Chat history is preserved and loaded when you open the chat

### ✅ User Status
- Notifications when users come online/offline
- Helps participants know if the other person is available

### ✅ Role-Based Display
- Shows sender's role (Student/Mentor)
- Timestamps for each message
- Visual distinction between sent and received messages

### ✅ Easy Integration
- Chat can be opened/closed with a button toggle
- Integrated into both StudentRequests and MentorRequests pages

## File Structure

### Backend Files

```
server/
├── models/
│   ├── Chat.js              # Chat model with messages
│   └── SessionRequest.js    # Updated with chat reference
├── controllers/
│   ├── chatController.js    # Chat message handlers
│   └── requestController.js # Updated to create chat on accept
├── routes/
│   ├── chatRoutes.js        # Chat API endpoints
│   └── requestRoutes.js     # Updated routes
└── server.js               # Socket.io event handlers
```

### Frontend Files

```
client/src/
├── components/
│   ├── Chat.jsx             # Main chat component
│   └── Chat.css             # Chat styling
├── pages/
│   └── student/
│       └── StudentRequests.jsx  # Student requests page with chat
│   └── mentor/
│       └── MentorRequests.jsx   # Mentor requests page with chat
└── services/
    └── chatService.js       # Chat API calls
```

## API Endpoints

### Chat Routes

```
GET  /api/chats/request/:requestId    # Get chat by request ID
GET  /api/chats/:chatId/history       # Get full chat history
POST /api/chats/:chatId/message       # Send a message
```

## Socket.io Events

### Client to Server

```javascript
// Join a chat room
socket.emit("join-chat", { chatId, userId })

// Send a message
socket.emit("send-message", { chatId, message })

// Leave chat
socket.emit("leave-chat", { chatId, userId })
```

### Server to Client

```javascript
// New message received
socket.on("new-message", (data) => { ... })

// User came online
socket.on("user-online", (data) => { ... })

// User went offline
socket.on("user-offline", (data) => { ... })

// Error sending message
socket.on("message-error", (data) => { ... })
```

## Database Schema

### Chat Model

```javascript
{
  sessionRequest: ObjectId,        // Reference to SessionRequest
  student: ObjectId,               // Reference to User (student)
  mentor: ObjectId,                // Reference to User (mentor)
  messages: [
    {
      sender: ObjectId,            // User who sent message
      senderName: String,
      senderRole: String,          // "student" or "mentor"
      text: String,
      createdAt: Date
    }
  ],
  isActive: Boolean,
  timestamps: true
}
```

### SessionRequest Model Update

```javascript
{
  student: ObjectId,
  mentor: ObjectId,
  status: "pending" | "accepted" | "rejected",
  chat: ObjectId,  // NEW: Reference to Chat (null until accepted)
  timestamps: true
}
```

## Setup Instructions

### 1. **Install Dependencies**

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 2. **Environment Configuration**

Create `.env` file in the root directory:

```
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=your-secret-key
PORT=5000
CLIENT_URL=http://localhost:5173
```

Create `client/.env` file:

```
VITE_API_URL=http://localhost:5000
```

### 3. **Start Services**

```bash
# Terminal 1: Start Backend
cd server
npm run dev

# Terminal 2: Start Frontend
cd client
npm run dev
```

## User Journey

### For Students

1. Go to "My Skills" or "Browse Mentors"
2. Find a mentor and click "Request Session"
3. Go to "My Requests" page
4. When mentor accepts, click "Open Chat"
5. Start real-time conversation with mentor

### For Mentors

1. Go to "Requests" page
2. View pending session requests
3. Click "Accept" to accept request (chat created automatically)
4. Click "Open Chat" to communicate with student
5. Start real-time conversation with student

## Security Features

✅ **Authentication**: All chat endpoints require JWT token  
✅ **Authorization**: Users can only access their own chats  
✅ **Data Validation**: Messages validated before saving  
✅ **CORS Enabled**: Socket.io configured with CORS for frontend  

## Troubleshooting

### Chat not connecting?
- Check if backend server is running on port 5000
- Verify `VITE_API_URL` environment variable matches your server URL
- Check browser console for error messages

### Messages not saving?
- Verify MongoDB connection is active
- Check if Chat model is properly indexed
- Review server logs for database errors

### Socket.io not working?
- Ensure socket.io package is installed (`npm install socket.io`)
- Check if port 5000 is not blocked by firewall
- Verify CORS settings in server.js

## Future Enhancements

🔄 **Typing Indicators** - Show when other user is typing  
📎 **File Sharing** - Share documents/images in chat  
🔔 **Chat Notifications** - Browser push notifications for new messages  
🎤 **Voice Messages** - Record and send voice messages  
👥 **Group Chats** - Extend to support group conversations  
📱 **Mobile Optimized** - Responsive design for mobile devices  

## Dependencies Added

### Backend
- `socket.io: ^4.7.2` - Real-time communication

### Frontend
- `socket.io-client: ^4.7.2` - Socket.io client library

## Support

For issues or questions, please refer to:
- Socket.io Docs: https://socket.io/docs/
- MongoDB Docs: https://docs.mongodb.com/
- React Docs: https://react.dev/
