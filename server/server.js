import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import contentRoutes from "./routes/contentRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import requestRoutes from "./routes/requestRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import skillRoutes from "./routes/skillRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import Chat from "./models/Chat.js";
import { createNotification } from "./controllers/notificationController.js";

const app = express();
const httpServer = createServer(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const uploadsDir = path.join(__dirname, "..", "uploads");
const configuredOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const defaultDevOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
const allowedOrigins = [...new Set([...configuredOrigins, ...defaultDevOrigins])];
const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || localhostOriginPattern.test(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS.`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Store active connections
const userSockets = new Map();

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error." });
});

// Socket.io event handlers
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-chat", (data) => {
    const { chatId, userId } = data;
    const roomName = `chat-${chatId}`;

    // Store user socket mapping
    userSockets.set(userId, socket.id);

    // Join user to chat room
    socket.join(roomName);
    console.log(`User ${userId} joined chat room: ${roomName}`);

    // Notify others that user is online
    socket.to(roomName).emit("user-online", { userId });
  });

  socket.on("send-message", async (data) => {
    const { chatId, message } = data;
    const roomName = `chat-${chatId}`;

    try {
      // Get chat to find the recipient
      const chatDoc = await Chat.findById(chatId).populate("student", "_id name").populate("mentor", "_id name");
      
      if (!chatDoc) {
        socket.emit("message-error", { error: "Chat not found" });
        return;
      }

      // Save message to database
      const chat = await Chat.findByIdAndUpdate(
        chatId,
        {
          $push: {
            messages: {
              sender: message.sender,
              senderName: message.senderName,
              senderRole: message.senderRole,
              text: message.text,
              createdAt: new Date(),
            },
          },
        },
        { new: true }
      ).populate("messages.sender", "name email role");

      // Broadcast message to all users in the room
      io.to(roomName).emit("new-message", {
        chatId,
        message: chat.messages[chat.messages.length - 1],
      });

      // Create notification for the other party
      const recipientId = message.sender.toString() === chatDoc.student._id.toString() 
        ? chatDoc.mentor._id 
        : chatDoc.student._id;

      await createNotification(
        recipientId,
        "chat",
        `New message from ${message.senderName}`,
        `${message.senderName}: ${message.text.substring(0, 50)}${message.text.length > 50 ? "..." : ""}`,
        {
          senderId: message.sender,
          senderName: message.senderName,
        }
      );
    } catch (error) {
      console.error("Error saving message:", error);
      socket.emit("message-error", { error: error.message });
    }
  });

  socket.on("leave-chat", (data) => {
    const { chatId, userId } = data;
    const roomName = `chat-${chatId}`;

    socket.leave(roomName);
    userSockets.delete(userId);
    socket.to(roomName).emit("user-offline", { userId });
    console.log(`User ${userId} left chat room: ${roomName}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const port = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
    httpServer.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server", error.message);
    process.exit(1);
  }
};

start();
