import mongoose from "mongoose";

const sessionRequestSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", default: null },
}, { timestamps: true });

export default mongoose.model("SessionRequest", sessionRequestSchema);
