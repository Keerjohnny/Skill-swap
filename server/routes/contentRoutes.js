import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import {
  createContent,
  deleteContent,
  listContent,
  updateContent,
} from "../controllers/contentController.js";
import auth from "../middleware/auth.js";
import roleCheck from "../middleware/roleCheck.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, "..", "..", "uploads"));
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`);
  },
});

const upload = multer({ storage });

const router = express.Router();

router.get("/", auth, listContent);
router.post("/", auth, roleCheck("admin"), upload.single("file"), createContent);
router.put("/:id", auth, roleCheck("admin"), upload.single("file"), updateContent);
router.delete("/:id", auth, roleCheck("admin"), deleteContent);

export default router;