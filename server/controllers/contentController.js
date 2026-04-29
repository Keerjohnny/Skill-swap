import fs from "fs";
import path from "path";
import Content from "../models/Content.js";

const resolveVideoUrl = (req) => {
  if (req.file) {
    return `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  }

  return req.body.videoUrl;
};

const removeUploadedFile = (videoUrl) => {
  if (!videoUrl || !videoUrl.includes("/uploads/")) {
    return;
  }

  const filename = videoUrl.split("/uploads/")[1];
  const filePath = path.join(process.cwd(), "uploads", filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

export const listContent = async (_req, res) => {
  try {
    const content = await Content.find().populate("uploadedBy", "name email role").sort({ createdAt: -1 });
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createContent = async (req, res) => {
  try {
    const videoUrl = resolveVideoUrl(req);

    if (!videoUrl) {
      return res.status(400).json({ message: "A video URL or file is required." });
    }

    const content = await Content.create({
      title: req.body.title,
      description: req.body.description,
      videoUrl,
      uploadedBy: req.user._id,
    });

    const populated = await Content.findById(content._id).populate("uploadedBy", "name email role");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateContent = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);

    if (!content) {
      return res.status(404).json({ message: "Content not found." });
    }

    const newVideoUrl = resolveVideoUrl(req);

    if (req.body.title !== undefined) {
      content.title = req.body.title;
    }

    if (req.body.description !== undefined) {
      content.description = req.body.description;
    }

    if (newVideoUrl) {
      removeUploadedFile(content.videoUrl);
      content.videoUrl = newVideoUrl;
    }

    await content.save();
    const populated = await Content.findById(content._id).populate("uploadedBy", "name email role");

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteContent = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);

    if (!content) {
      return res.status(404).json({ message: "Content not found." });
    }

    removeUploadedFile(content.videoUrl);
    await content.deleteOne();

    res.json({ message: "Content deleted." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};