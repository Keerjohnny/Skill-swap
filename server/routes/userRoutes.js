import express from "express";
import { getUserProfile, listUsers, suspendMentor, updateUserProfile, updateLastActivity } from "../controllers/userController.js";
import auth from "../middleware/auth.js";
import roleCheck from "../middleware/roleCheck.js";

const router = express.Router();

router.patch("/track-activity", auth, updateLastActivity);
router.get("/", auth, listUsers);
router.get("/:id", auth, getUserProfile);
router.patch("/:id/suspend", auth, roleCheck("admin"), suspendMentor);
router.put("/:id", auth, updateUserProfile);

export default router;