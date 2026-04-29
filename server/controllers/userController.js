import Session from "../models/Session.js";
import Skill from "../models/Skill.js";
import User from "../models/User.js";

const formatMentorStats = (user, statsMap) => {
  const baseUser = user.toObject ? user.toObject() : { ...user };

  if (baseUser.role !== "mentor") {
    return baseUser;
  }

  const stats = statsMap.get(baseUser._id.toString()) || { averageRating: null, feedbackCount: 0 };

  return {
    ...baseUser,
    averageRating: stats.averageRating === null ? null : Number(stats.averageRating.toFixed(1)),
    feedbackCount: stats.feedbackCount,
  };
};

const buildMentorStatsMap = async (mentorIds) => {
  if (!mentorIds.length) {
    return new Map();
  }

  const stats = await Session.aggregate([
    {
      $match: {
        mentor: { $in: mentorIds },
        "review.rating": { $exists: true },
      },
    },
    {
      $group: {
        _id: "$mentor",
        averageRating: { $avg: "$review.rating" },
        feedbackCount: { $sum: 1 },
      },
    },
  ]);

  return new Map(
    stats.map((entry) => [entry._id.toString(), { averageRating: entry.averageRating, feedbackCount: entry.feedbackCount }])
  );
};

const syncSkills = async (user) => {
  await Skill.updateMany(
    { "users.userId": user._id },
    { $pull: { users: { userId: user._id } } }
  );

  const operations = user.skills.map((skill) => ({
    updateOne: {
      filter: { name: skill.name.trim() },
      update: {
        $setOnInsert: {
          name: skill.name.trim(),
          category: "General",
        },
        $push: {
          users: {
            userId: user._id,
            role: user.role,
            level: skill.level,
          },
        },
      },
      upsert: true,
    },
  }));

  if (operations.length > 0) {
    await Skill.bulkWrite(operations);
  }
};

export const listUsers = async (req, res) => {
  try {
    const filter = {};

    if (req.query.role) {
      filter.role = req.query.role;
    }

    const users = await User.find(filter).sort({ createdAt: -1 });
    const mentorIds = users.filter((user) => user.role === "mentor").map((user) => user._id);
    const statsMap = await buildMentorStatsMap(mentorIds);

    res.json(users.map((user) => formatMentorStats(user, statsMap)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const sessions = await Session.find({
      $or: [{ mentor: user._id }, { student: user._id }],
    })
      .populate("mentor student", "name email role")
      .sort({ date: -1 });

    const statsMap = await buildMentorStatsMap(user.role === "mentor" ? [user._id] : []);

    res.json({
      user: formatMentorStats(user, statsMap),
      sessions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const isOwner = req.user._id.toString() === targetUser._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Forbidden." });
    }

    const allowedFields = [
      "name",
      "bio",
      "avatar",
      "skills",
      "availableTimeSlots",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        targetUser[field] = req.body[field];
      }
    });

    await targetUser.save();
    await syncSkills(targetUser);

    res.json(targetUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const suspendMentor = async (req, res) => {
  try {
    const mentor = await User.findById(req.params.id);

    if (!mentor) {
      return res.status(404).json({ message: "User not found." });
    }

    if (mentor.role !== "mentor") {
      return res.status(400).json({ message: "Only mentors can be suspended." });
    }

    const statsMap = await buildMentorStatsMap([mentor._id]);
    const stats = statsMap.get(mentor._id.toString()) || { averageRating: null, feedbackCount: 0 };

    if (stats.feedbackCount === 0) {
      return res.status(400).json({ message: "Mentor must receive feedback before suspension is available." });
    }

    if (stats.averageRating >= 3) {
      return res.status(400).json({ message: "Mentor average feedback must be below 3 to suspend." });
    }

    mentor.status = "suspended";
    await mentor.save();

    res.json(formatMentorStats(mentor, statsMap));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateLastActivity = async (req, res) => {
  try {
    const userId = req.user._id;
    
    await User.findByIdAndUpdate(userId, {
      lastActivity: new Date(),
      isOnline: true,
    });

    res.json({ message: "Activity updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};