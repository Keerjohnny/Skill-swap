import express from "express";
import { addSkill, getSkills, matchSkills, removeSkill } from "../controllers/skillController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/", auth, getSkills);
router.post("/", auth, addSkill);
router.get("/match", auth, matchSkills);
router.delete("/:name", auth, removeSkill);

export default router;