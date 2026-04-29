import express from "express";
import { createRequest, getStudentRequests, getMentorRequests, updateRequestStatus } from "../controllers/requestController.js";
import auth from "../middleware/auth.js";
import roleCheck from "../middleware/roleCheck.js";

const router = express.Router();

router.post("/", auth, roleCheck("student"), createRequest);
router.get("/student", auth, roleCheck("student"), getStudentRequests);
router.get("/mentor", auth, roleCheck("mentor"), getMentorRequests);
router.put("/:id/status", auth, roleCheck("mentor"), updateRequestStatus);

export default router;
