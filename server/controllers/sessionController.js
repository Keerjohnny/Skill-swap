import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Session from "../models/Session.js";
import Content from "../models/Content.js";
import User from "../models/User.js";
import { generateLink } from "../utils/generateLink.js";

const REWARD_POINTS_PER_SESSION = 10;
const SESSION_COMPLETION_TOLERANCE_SECONDS = 2;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sessionVideoDir = path.join(__dirname, "..", "..", "client", "public", "uploads");
const rootUploadsDir = path.join(__dirname, "..", "..", "uploads");

const normalizeReview = (review = {}) => ({
  rating: Number(review.rating),
  comment: (review.comment || "").trim(),
});

const formatVideoLabel = (filename = "") =>
  filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const listSessionVideoOptions = async (req) => {
  const options = [];
  const seen = new Set();
  const appendOption = (option) => {
    if (!option?.value || seen.has(option.value)) {
      return;
    }

    seen.add(option.value);
    options.push(option);
  };

  // 1. Scan client/public/uploads (traditional demo videos)
  if (fs.existsSync(sessionVideoDir)) {
    const files = fs.readdirSync(sessionVideoDir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => ({
        filename: entry.name,
        label: `${formatVideoLabel(entry.name)} (Demo)`,
        value: `/uploads/${entry.name}`,
      }));
    files.forEach(appendOption);
  }

  // 2. Scan root uploads/ (user-uploaded content)
  if (fs.existsSync(rootUploadsDir)) {
    const protocol = req.protocol;
    const host = req.get("host");
    const baseUrl = `${protocol}://${host}`;

    const files = fs.readdirSync(rootUploadsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => ({
        filename: entry.name,
        label: formatVideoLabel(entry.name),
        value: `${baseUrl}/uploads/${entry.name}`,
      }));
    files.forEach(appendOption);
  }

  // 3. Include content library URLs so manually added video links are selectable.
  const contentItems = await Content.find({}, "title videoUrl").sort({ createdAt: -1 });
  contentItems.forEach((item) => {
    appendOption({
      filename: "",
      label: item.title?.trim() || formatVideoLabel(item.videoUrl || "Content video"),
      value: item.videoUrl,
    });
  });

  return options.sort((left, right) => left.label.localeCompare(right.label));
};

const resolveSessionVideoSelection = async (req, videoUrl = "") => {
  const options = await listSessionVideoOptions(req);
  return options.find((option) => option.value === videoUrl);
};

const hasReachedVideoCompletion = (watchedSeconds, durationSeconds, completed) => {
  if (completed) {
    return true;
  }

  if (!durationSeconds) {
    return false;
  }

  return watchedSeconds >= Math.max(durationSeconds - SESSION_COMPLETION_TOLERANCE_SECONDS, durationSeconds * 0.95);
};

const isParticipant = (userId, participant) => (participant._id?.toString?.() || participant.toString()) === userId.toString();

const canAccessSession = (user, session) => {
  if (user.role === "admin") {
    return true;
  }

  return [session.mentor._id?.toString?.() || session.mentor.toString(), session.student._id?.toString?.() || session.student.toString()].includes(
    user._id.toString()
  );
};

export const createSession = async (req, res) => {
  try {
    const { mentor, student, date, timeSlot, videoUrl, skillsDiscussed, sessionRequestId } = req.body;
    const selectedVideo = await resolveSessionVideoSelection(req, videoUrl);
    const [mentorUser, studentUser] = await Promise.all([
      User.findById(mentor),
      User.findById(student),
    ]);

    if (!mentorUser || !studentUser) {
      return res.status(400).json({ message: "Mentor or student is invalid." });
    }

    if (mentorUser.role !== "mentor") {
      return res.status(400).json({ message: "Selected user is not a mentor." });
    }

    if (studentUser.role !== "student") {
      return res.status(400).json({ message: "Selected user is not a student." });
    }

    if (mentorUser.status === "suspended") {
      return res.status(400).json({ message: "Suspended mentors cannot be scheduled." });
    }

    if (!selectedVideo) {
      return res.status(400).json({ message: "Select a session video from the uploads library." });
    }

    const sessionData = {
      mentor,
      student,
      date,
      timeSlot,
      videoUrl: selectedVideo.value,
      videoLabel: selectedVideo.label,
      sessionLink: generateLink(),
      studentNotificationExpiresAt: new Date(Date.now() + 30 * 1000),
      skillsDiscussed: Array.isArray(skillsDiscussed) ? skillsDiscussed : [],
    };

    if (sessionRequestId) {
      sessionData.sessionRequest = sessionRequestId;
    }

    const session = await Session.create(sessionData);

    const populated = await Session.findById(session._id)
      .populate("mentor student", "name email role status rewardPoints")
      .populate({
        path: "sessionRequest",
        select: "chat",
        populate: {
          path: "chat",
          select: "_id messages",
        },
      });

    const sessionObj = populated.toObject();
    if (populated.sessionRequest?.chat) {
      sessionObj.chat = populated.sessionRequest.chat;
    }

    res.status(201).json(sessionObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSessions = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role !== "admin") {
      filter.$or = [{ mentor: req.user._id }, { student: req.user._id }];
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const sessions = await Session.find(filter)
      .populate("mentor student", "name email role status rewardPoints skills")
      .populate({
        path: "sessionRequest",
        select: "chat",
        populate: {
          path: "chat",
          select: "_id messages",
        },
      })
      .sort({ date: 1, createdAt: -1 });

    // Add chat field to each session for convenience on frontend
    const sessionsWithChat = sessions.map((session) => {
      const sessionObj = session.toObject();
      if (session.sessionRequest?.chat) {
        sessionObj.chat = session.sessionRequest.chat;
      }
      return sessionObj;
    });

    res.json(sessionsWithChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSessionById = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate("mentor student", "name email role bio skills status rewardPoints")
      .populate({
        path: "sessionRequest",
        select: "chat",
        populate: {
          path: "chat",
          select: "_id messages",
        },
      });

    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }

    if (!canAccessSession(req.user, session)) {
      return res.status(403).json({ message: "Forbidden." });
    }

    const sessionObj = session.toObject();
    if (session.sessionRequest?.chat) {
      sessionObj.chat = session.sessionRequest.chat;
    }

    res.json(sessionObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).populate("mentor student", "name email role status rewardPoints");

    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }

    if (!canAccessSession(req.user, session)) {
      return res.status(403).json({ message: "Forbidden." });
    }

    const { status, videoUrl, timeSlot, date } = req.body;
    const isAdmin = req.user.role === "admin";
    const isMentor = isParticipant(req.user._id, session.mentor);

    if (!isAdmin && !isMentor) {
      return res.status(403).json({ message: "Only the assigned mentor or an admin can update session details." });
    }

    if (status && ["pending", "completed", "cancelled"].includes(status)) {
      session.status = status;
    }

    if (videoUrl !== undefined) {
      const selectedVideo = await resolveSessionVideoSelection(req, videoUrl);

      if (!selectedVideo) {
        return res.status(400).json({ message: "Select a session video from the uploads library." });
      }

      const videoChanged = session.videoUrl !== selectedVideo.value;
      session.videoUrl = selectedVideo.value;
      session.videoLabel = selectedVideo.label;

      if (videoChanged) {
        session.playback = {
          watchedSeconds: 0,
          durationSeconds: 0,
          completedAt: undefined,
          lastUpdatedAt: undefined,
        };
      }
    }

    if (timeSlot) {
      session.timeSlot = timeSlot;
    }

    if (date) {
      session.date = date;
    }

    await session.save();
    const updated = await Session.findById(session._id).populate("mentor student", "name email role status rewardPoints");

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSessionPlayback = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).populate("mentor student", "name email role status rewardPoints");

    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }

    if (!canAccessSession(req.user, session)) {
      return res.status(403).json({ message: "Forbidden." });
    }

    if (!isParticipant(req.user._id, session.student)) {
      return res.status(403).json({ message: "Only the assigned student can update playback progress." });
    }

    if (session.status === "cancelled") {
      return res.status(400).json({ message: "Playback is unavailable for cancelled sessions." });
    }

    const watchedSeconds = Math.max(0, Number(req.body.watchedSeconds) || 0);
    const durationSeconds = Math.max(0, Number(req.body.durationSeconds) || 0);
    const completed = Boolean(req.body.completed);

    session.playback.watchedSeconds = Math.max(session.playback?.watchedSeconds || 0, watchedSeconds);
    session.playback.durationSeconds = Math.max(session.playback?.durationSeconds || 0, durationSeconds);
    session.playback.lastUpdatedAt = new Date();

    if (
      hasReachedVideoCompletion(
        session.playback.watchedSeconds,
        session.playback.durationSeconds,
        completed
      )
    ) {
      session.status = "completed";
      session.playback.completedAt = session.playback.completedAt || new Date();
    }

    await session.save();
    const updated = await Session.findById(session._id).populate("mentor student", "name email role status rewardPoints");

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSessionVideoOptions = async (req, res) => {
  try {
    res.json(await listSessionVideoOptions(req));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const submitSessionFeedback = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).populate("mentor student", "name email role status rewardPoints");

    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }

    if (!canAccessSession(req.user, session)) {
      return res.status(403).json({ message: "Forbidden." });
    }

    if (!isParticipant(req.user._id, session.student)) {
      return res.status(403).json({ message: "Only the assigned student can submit feedback." });
    }

    if (session.status !== "completed") {
      return res.status(400).json({ message: "Feedback can only be submitted after a completed session." });
    }

    const review = normalizeReview(req.body.review);

    if (!Number.isFinite(review.rating) || review.rating < 1 || review.rating > 5) {
      return res.status(400).json({ message: "Feedback rating must be between 1 and 5." });
    }

    const mentor = await User.findById(session.mentor._id || session.mentor);
    const rewardWasGranted = session.rewardPointsGranted;
    const rewardShouldBeGranted = review.rating > 3;

    if (mentor) {
      if (!rewardWasGranted && rewardShouldBeGranted) {
        mentor.rewardPoints += REWARD_POINTS_PER_SESSION;
        session.rewardPointsGranted = true;
      }

      if (rewardWasGranted && !rewardShouldBeGranted) {
        mentor.rewardPoints = Math.max(0, mentor.rewardPoints - REWARD_POINTS_PER_SESSION);
        session.rewardPointsGranted = false;
      }

      await mentor.save();
    }

    session.review = review;
    session.reviewSubmittedAt = new Date();
    await session.save();

    const updated = await Session.findById(session._id).populate("mentor student", "name email role status rewardPoints");
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSessionByLink = async (req, res) => {
  try {
    const session = await Session.findOne({ sessionLink: req.params.linkId }).populate(
      "mentor student",
      "name email role status rewardPoints"
    );

    if (!session) {
      return res.status(404).json({ message: "Session link is invalid." });
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};