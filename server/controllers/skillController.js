import Skill from "../models/Skill.js";
import User from "../models/User.js";

export const getSkills = async (_req, res) => {
  try {
    const skills = await Skill.find().populate("users.userId", "name email role").sort({ name: 1 });
    res.json(skills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addSkill = async (req, res) => {
  try {
    const { name, category, level, userId } = req.body;
    const targetUserId = userId || req.user._id;
    const user = await User.findById(targetUserId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const alreadyExists = user.skills.some(
      (skill) => skill.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (!alreadyExists) {
      user.skills.push({ name: name.trim(), level: level || "beginner" });
      await user.save();
    }

    const skill = await Skill.findOneAndUpdate(
      { name: name.trim() },
      {
        $setOnInsert: {
          name: name.trim(),
          category: category || "General",
        },
        $pull: {
          users: { userId: user._id },
        },
      },
      {
        new: true,
        upsert: true,
      }
    );

    skill.users.push({
      userId: user._id,
      role: user.role,
      level: level || "beginner",
    });

    await skill.save();
    const populated = await Skill.findById(skill._id).populate("users.userId", "name email role");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const matchSkills = async (req, res) => {
  try {
    const requestedSkill = req.query.skill?.trim();
    const sourceUserId = req.query.userId || req.user._id;
    const sourceUser = await User.findById(sourceUserId);

    if (!sourceUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const skillNames = requestedSkill
      ? [requestedSkill]
      : sourceUser.skills.map((skill) => skill.name);

    const mentors = await User.find({
      role: "mentor",
      "skills.name": { $in: skillNames },
      _id: { $ne: sourceUser._id },
    }).sort({ createdAt: -1 });

    res.json({
      user: sourceUser,
      requestedSkills: skillNames,
      mentors,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removeSkill = async (req, res) => {
  try {
    const { name } = req.params;
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Remove from user
    user.skills = user.skills.filter(
      (skill) => skill.name.toLowerCase() !== name.trim().toLowerCase()
    );
    await user.save();

    // Remove from Skill collection
    const skill = await Skill.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, "i") } });
    if (skill) {
      skill.users = skill.users.filter(
        (u) => u.userId.toString() !== userId.toString()
      );
      
      if (skill.users.length === 0) {
        await Skill.deleteOne({ _id: skill._id });
      } else {
        await skill.save();
      }
    }

    res.json({ message: "Skill removed successfully", skills: user.skills });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};