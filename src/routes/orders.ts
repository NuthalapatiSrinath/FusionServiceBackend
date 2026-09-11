import { Router, Request, Response } from "express";
import { Order, serializeOrder } from "../models/Order";
import { SiteSettings } from "../models/SiteSettings";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { customerName, phone, email, address, items, totalEstimate, note, type } = req.body ?? {};
    if (!customerName || !phone) {
      return res.status(400).json({ error: "Name and phone are required" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Cart items required" });
    }
    const order = await Order.create({
      customerName: String(customerName).trim(),
      phone: String(phone).trim(),
      email,
      address,
      items,
      totalEstimate: Number(totalEstimate) || 0,
      note,
      type: type === "inquiry" ? "inquiry" : "order",
      status: "new",
    });
    return res.status(201).json({ success: true, order: serializeOrder(order) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to place order" });
  }
});

router.get("/settings/public", async (_req: Request, res: Response) => {
  try {
    let settings = await SiteSettings.findOne({ key: "default" }).lean();
    if (!settings) {
      const created = await SiteSettings.create({ key: "default" });
      settings = created.toObject();
    }
    res.json({
      settings: {
        heroTagline: settings.heroTagline,
        heroHeadline: settings.heroHeadline,
        heroSubline: settings.heroSubline,
        phone: settings.phone,
        whatsapp: settings.whatsapp,
        email: settings.email,
        address: settings.address,
        featuredProductIds: settings.featuredProductIds,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load settings" });
  }
});

export default router;
