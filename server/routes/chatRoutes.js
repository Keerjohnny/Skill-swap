import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { getChatByRequest, getChatHistory, sendMessage } from "../controllers/chatController.js";
import auth from "../middleware/auth.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, "..", "..", "uploads"));
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-chat-${file.originalname.replace(/\s+/g, "-")}`);
  },
});

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
]);

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error("Only image and document attachments are allowed."));
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.get("/request/:requestId", auth, getChatByRequest);
router.get("/:chatId/history", auth, getChatHistory);
router.post("/:chatId/message", auth, upload.single("attachment"), sendMessage);

export default router;
