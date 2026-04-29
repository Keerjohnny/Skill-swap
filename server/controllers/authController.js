import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import SessionRequest from "../models/SessionRequest.js";
import Chat from "../models/Chat.js";
import { createNotification } from "./notificationController.js";

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "Email is already in use." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "student",
    });

    const token = signToken(user._id);

    res.status(201).json({
      token,
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    if (user.role === "mentor" && user.status === "suspended") {
      return res.status(403).json({ message: "Mentor account is suspended." });
    }

    const token = signToken(user._id);
    
    // Mark user as online
    await User.findByIdAndUpdate(user._id, {
      isOnline: true,
      lastActivity: new Date(),
    });
    
    const safeUser = await User.findById(user._id);

    res.json({
      token,
      user: safeUser,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMe = async (req, res) => {
  res.json(req.user);
};

export const logout = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user status
    await User.findByIdAndUpdate(userId, {
      isOnline: false,
      lastLogout: new Date(),
    });

    // Find all users who have interacted with this user and notify them
    // Get all session requests where this user is involved
    const sessionRequests = await SessionRequest.find({
      $or: [{ mentorId: userId }, { studentId: userId }],
      status: "accepted",
    });

    const relatedUserIds = new Set();
    sessionRequests.forEach((req) => {
      if (req.mentorId.toString() !== userId.toString()) {
        relatedUserIds.add(req.mentorId.toString());
      }
      if (req.studentId.toString() !== userId.toString()) {
        relatedUserIds.add(req.studentId.toString());
      }
    });

    // Get all users this user has chatted with
    const chats = await Chat.find({
      $or: [{ senderId: userId }, { recipientId: userId }],
    });

    chats.forEach((chat) => {
      if (chat.senderId.toString() !== userId.toString()) {
        relatedUserIds.add(chat.senderId.toString());
      }
      if (chat.recipientId.toString() !== userId.toString()) {
        relatedUserIds.add(chat.recipientId.toString());
      }
    });

    // Send logout notifications to related users
    for (const relatedUserId of relatedUserIds) {
      try {
        await createNotification(
          relatedUserId,
          "logout",
          `${user.name} is offline`,
          `${user.name} (${user.role}) has logged out. You can chat with them again once they're back online.`,
          {
            senderId: userId,
            senderName: user.name,
          }
        );
      } catch (error) {
        console.error(`Error creating notification for user ${relatedUserId}:`, error);
      }
    }

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};