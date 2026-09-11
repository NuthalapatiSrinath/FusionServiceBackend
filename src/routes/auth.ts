import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AdminUser } from "../models/AdminUser";
import { Inquiry } from "../models/Inquiry";
import { DesignUpload } from "../models/DesignUpload";
import { requireAdmin, AuthRequest } from "../middleware/auth";

const router = Router();

function jwtSecret() {
  return process.env.JWT_SECRET || "fusion-print-local-dev-secret-change-me";
}

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body ?? {};

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const user = await AdminUser.findOne({
      username: String(username).trim().toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { role: user.role, username: user.username },
      jwtSecret(),
      { expiresIn: "12h" }
    );
    return res.json({ token, user: { username: user.username, role: user.role } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", (req: Request, res: Response) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const payload = jwt.verify(header.slice(7), jwtSecret()) as {
      username: string;
      role: string;
    };
    return res.json({ user: payload });
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

/** Minimal dashboard stats for admin */
router.get("/dashboard", requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const [inquiryTotal, inquiryNew, uploadsTotal, recentInquiries] = await Promise.all([
      Inquiry.countDocuments(),
      Inquiry.countDocuments({ status: "new" }),
      DesignUpload.countDocuments(),
      Inquiry.find().sort({ createdAt: -1 }).limit(10),
    ]);

    res.json({
      stats: {
        inquiryTotal,
        inquiryNew,
        uploadsTotal,
      },
      recentInquiries: recentInquiries.map((i) => ({
        id: String(i._id),
        name: i.name,
        phone: i.phone,
        status: i.status,
        productId: i.productId,
        createdAt: i.createdAt?.toISOString?.() ?? i.createdAt,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

export default router;
