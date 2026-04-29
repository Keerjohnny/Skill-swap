import express from "express";
import auth from "../middleware/auth.js";
import { getMe, login, register, logout } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", auth, getMe);
router.post("/logout", auth, logout);

export default router;