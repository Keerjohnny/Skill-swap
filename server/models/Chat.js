import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  senderName: String,
  senderRole: String,
  text: String,
  attachment: {
    url: String,
    name: String,
    type: String,
    size: Number,
  },
  createdAt: { type: Date, default: Date.now },
});

const chatSchema = new mongoose.Schema(
  {
    sessionRequest: { type: mongoose.Schema.Types.ObjectId, ref: "SessionRequest", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    messages: [messageSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Chat", chatSchema);
