import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { DesignUpload } from "../models/DesignUpload";
import { requireAdmin, AuthRequest } from "../middleware/auth";

const uploadDir = path.resolve(process.env.UPLOAD_DIR || "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".png";
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpe?g|png|gif|webp|svg)$/i;
    if (allowed.test(path.extname(file.originalname)) || file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

const router = Router();

router.post("/", upload.single("design"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const url = `/uploads/${req.file.filename}`;
    const record = await DesignUpload.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      url,
    });

    return res.status(201).json({
      success: true,
      id: String(record._id),
      filename: record.filename,
      originalName: record.originalName,
      size: record.size,
      url: record.url,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Upload failed" });
  }
});

router.get("/", requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const uploads = await DesignUpload.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json({
      uploads: uploads.map((u) => ({
        id: String(u._id),
        filename: u.filename,
        originalName: u.originalName,
        size: u.size,
        url: u.url,
        mimeType: u.mimeType,
        createdAt: u.createdAt,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list uploads" });
  }
});

export default router;
