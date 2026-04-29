import Chat from "../models/Chat.js";
import SessionRequest from "../models/SessionRequest.js";
import { createNotification } from "./notificationController.js";

export const createRequest = async (req, res) => {
  try {
    const { mentorId } = req.body;

    if (!mentorId) {
      return res.status(400).json({ message: "mentorId is required." });
    }

    const existing = await SessionRequest.findOne({
      student: req.user._id,
      mentor: mentorId,
      status: "pending",
    });

    if (existing) {
      return res.status(409).json({ message: "A pending request to this mentor already exists." });
    }

    const request = await SessionRequest.create({
      student: req.user._id,
      mentor: mentorId,
    });

    // Create notification for mentor
    await createNotification(
      mentorId,
      "request",
      "New Session Request",
      `${req.user.name} sent you a session request`,
      {
        requestId: request._id,
        senderId: req.user._id,
        senderName: req.user.name,
      }
    );

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStudentRequests = async (req, res) => {
  try {
    const requests = await SessionRequest.find({ student: req.user._id })
      .populate("mentor", "name email")
      .populate("chat")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMentorRequests = async (req, res) => {
  try {
    const requests = await SessionRequest.find({ mentor: req.user._id })
      .populate("student", "name email")
      .populate("chat")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be accepted or rejected." });
    }

    const request = await SessionRequest.findOne({ _id: id, mentor: req.user._id })
      .populate("student", "name email");

    if (!request) {
      return res.status(404).json({ message: "Request not found." });
    }

    // Create chat room if status is accepted
    if (status === "accepted" && !request.chat) {
      const chat = await Chat.create({
        sessionRequest: request._id,
        student: request.student._id,
        mentor: request.mentor,
        messages: [],
        isActive: true,
      });

      request.chat = chat._id;

      // Create notification for student
      await createNotification(
        request.student._id,
        "request",
        "Request Accepted",
        `${req.user.name} accepted your session request. You can now chat!`,
        {
          requestId: request._id,
          senderId: req.user._id,
          senderName: req.user.name,
        }
      );
    } else if (status === "rejected") {
      // Create notification for student if rejected
      await createNotification(
        request.student._id,
        "request",
        "Request Rejected",
        `${req.user.name} rejected your session request`,
        {
          requestId: request._id,
          senderId: req.user._id,
          senderName: req.user.name,
        }
      );
    }

    // Update status
    request.status = status;
    await request.save();

    const updatedRequest = await request.populate("student", "name email").populate("chat");

    res.json(updatedRequest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
