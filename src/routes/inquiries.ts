import { Router, Request, Response } from "express";
import { requireAdmin, AuthRequest } from "../middleware/auth";
import { Inquiry, serializeInquiry } from "../models/Inquiry";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, phone, email, productId, quantity, side, color, addonIds, designUrl, message } =
      req.body ?? {};

    if (!name || !phone) {
      return res.status(400).json({ error: "Name and phone are required" });
    }

    const inquiry = await Inquiry.create({
      name: String(name).trim(),
      phone: String(phone).trim(),
      email: email ? String(email).trim() : undefined,
      productId,
      quantity,
      side,
      color,
      addonIds,
      designUrl,
      message,
      status: "new",
    });

    return res.status(201).json({ success: true, inquiry: serializeInquiry(inquiry) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to save inquiry" });
  }
});

router.get("/", requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const inquiries = await Inquiry.find().sort({ createdAt: -1 }).limit(200);
    res.json({ inquiries: inquiries.map(serializeInquiry) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load inquiries" });
  }
});

router.patch("/:id", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found" });
    }
    const { status } = req.body ?? {};
    if (status && ["new", "reviewed", "quoted"].includes(status)) {
      inquiry.status = status;
      await inquiry.save();
    }
    return res.json({ inquiry: serializeInquiry(inquiry) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update inquiry" });
  }
});

export default router;
