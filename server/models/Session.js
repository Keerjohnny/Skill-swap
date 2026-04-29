import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const playbackSchema = new mongoose.Schema(
  {
    watchedSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedAt: {
      type: Date,
    },
    lastUpdatedAt: {
      type: Date,
    },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sessionRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SessionRequest",
      default: null,
    },
    date: {
      type: Date,
      required: true,
    },
    timeSlot: {
      start: {
        type: String,
        required: true,
      },
      end: {
        type: String,
        required: true,
      },
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
    },
    sessionLink: {
      type: String,
      unique: true,
      required: true,
    },
    videoUrl: {
      type: String,
      default: "",
      trim: true,
    },
    videoLabel: {
      type: String,
      default: "",
      trim: true,
    },
    playback: {
      type: playbackSchema,
      default: () => ({}),
    },
    review: reviewSchema,
    reviewSubmittedAt: {
      type: Date,
    },
    rewardPointsGranted: {
      type: Boolean,
      default: false,
    },
    studentNotificationExpiresAt: {
      type: Date,
    },
    skillsDiscussed: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Session = mongoose.model("Session", sessionSchema);

export default Session;