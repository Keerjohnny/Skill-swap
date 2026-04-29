import express from "express";
import {
  createSession,
  getSessionById,
  getSessionByLink,
  getSessions,
  getSessionVideoOptions,
  submitSessionFeedback,
  updateSession,
  updateSessionPlayback,
} from "../controllers/sessionController.js";
import auth from "../middleware/auth.js";
import roleCheck from "../middleware/roleCheck.js";

const router = express.Router();

router.get("/link/:linkId", getSessionByLink);
router.get("/videos", auth, getSessionVideoOptions);
router.post("/", auth, roleCheck("admin", "mentor"), createSession);
router.get("/", auth, getSessions);
router.get("/:id", auth, getSessionById);
router.patch("/:id/playback", auth, roleCheck("student"), updateSessionPlayback);
router.patch("/:id/feedback", auth, roleCheck("student"), submitSessionFeedback);
router.put("/:id", auth, updateSession);

export default router;