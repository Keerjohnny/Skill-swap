import Notification from "../models/Notification.js";

// Get all notifications for a user
export const getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .populate("data.senderId", "name");
    
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      read: false,
    });

    res.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get unread notification count
export const getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      read: false,
    });

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      {
        read: true,
        readAt: new Date(),
      },
      { new: true }
    );

    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    
    await Notification.updateMany(
      { recipient: userId, read: false },
      {
        read: true,
        readAt: new Date(),
      }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    await Notification.findByIdAndDelete(notificationId);
    res.json({ message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create notification (helper function to be called from other controllers)
export const createNotification = async (recipientId, type, title, message, data) => {
  try {
    const notification = new Notification({
      recipient: recipientId,
      type,
      title,
      message,
      data,
    });
    
    await notification.save();
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};
