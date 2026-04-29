import mongoose from "mongoose";

const skillUserSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["student", "mentor", "admin"],
      required: true,
    },
    level: {
      type: String,
      default: "beginner",
      trim: true,
    },
  },
  { _id: false }
);

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      default: "General",
      trim: true,
    },
    users: {
      type: [skillUserSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Skill = mongoose.model("Skill", skillSchema);

export default Skill;