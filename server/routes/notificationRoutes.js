import express from "express";
import * as notificationController from "../controllers/notificationController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Get all notifications for a user
router.get("/:userId", auth, notificationController.getNotifications);

// Get unread count
router.get("/:userId/unread-count", auth, notificationController.getUnreadCount);

// Mark notification as read
router.patch("/:notificationId/read", auth, notificationController.markAsRead);

// Mark all as read
router.patch("/:userId/read-all", auth, notificationController.markAllAsRead);

// Delete notification
router.delete("/:notificationId", auth, notificationController.deleteNotification);

export default router;
