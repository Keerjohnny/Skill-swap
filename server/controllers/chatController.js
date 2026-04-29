import Chat from "../models/Chat.js";

const buildAttachment = (req) => {
  if (!req.file) {
    return undefined;
  }

  return {
    url: `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`,
    name: req.file.originalname,
    type: req.file.mimetype,
    size: req.file.size,
  };
};

export const getChatByRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const chat = await Chat.findOne({ sessionRequest: requestId })
      .populate("student", "name email")
      .populate("mentor", "name email")
      .populate("messages.sender", "name email");

    if (!chat) {
      return res.status(404).json({ message: "Chat not found." });
    }

    // Verify user is part of this chat
    if (
      chat.student._id.toString() !== req.user._id.toString() &&
      chat.mentor._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Unauthorized access to this chat." });
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const text = (req.body.text || "").trim();
    const attachment = buildAttachment(req);

    if (!text && !attachment) {
      return res.status(400).json({ message: "Message text or attachment is required." });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: "Chat not found." });
    }

    // Verify user is part of this chat
    if (
      chat.student.toString() !== req.user._id.toString() &&
      chat.mentor.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Unauthorized to send messages in this chat." });
    }

    const message = {
      sender: req.user._id,
      senderName: req.user.name,
      senderRole: req.user.role,
      text,
      attachment,
      createdAt: new Date(),
    };

    chat.messages.push(message);
    await chat.save();

    const updatedChat = await chat.populate("messages.sender", "name email");

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId)
      .populate("messages.sender", "name email role")
      .populate("student", "name email")
      .populate("mentor", "name email");

    if (!chat) {
      return res.status(404).json({ message: "Chat not found." });
    }

    // Verify user is part of this chat
    if (
      chat.student._id.toString() !== req.user._id.toString() &&
      chat.mentor._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Unauthorized access to this chat." });
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
