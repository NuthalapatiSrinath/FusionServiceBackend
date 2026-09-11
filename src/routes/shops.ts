import { Router, Request, Response } from "express";
import QRCode from "qrcode";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { Shop, serializeShop, generateShopCode } from "../models/Shop";
import { ShopUser, serializeShopUser } from "../models/ShopUser";
import { requireAdmin, AuthRequest } from "../middleware/auth";

const router = Router();

/** Public: get shop by code (for /print/:shopCode) — no PIN */
router.get("/code/:code", async (req: Request, res: Response) => {
  try {
    const raw = String(req.params.code).trim();
    const shop = await Shop.findOne({
      $or: [{ code: raw }, { code: raw.toLowerCase() }],
      active: true,
    });
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    return res.json({
      shop: {
        id: String(shop._id),
        name: shop.name,
        code: shop.code,
        address: shop.address,
        phone: shop.phone,
        whatsapp: shop.whatsapp,
        pricing: shop.pricing,
        qrPath: shop.qrPath,
        requiresPin: false,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load shop" });
  }
});

/** @deprecated Customer PIN removed — kept as no-op success for old clients */
router.post("/code/:code/verify-pin", async (req: Request, res: Response) => {
  try {
    const raw = String(req.params.code).trim();
    const shop = await Shop.findOne({
      $or: [{ code: raw }, { code: raw.toLowerCase() }],
      active: true,
    });
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    return res.json({ ok: true, shopCode: shop.code, message: "PIN not required" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "PIN verify failed" });
  }
});

/** Agent auth by long-lived token (pairing or legacy shop token) */
router.post("/agent/auth", async (req: Request, res: Response) => {
  try {
    const token = String(req.body?.token || "");
    const shop = await Shop.findOne({ printerAgentToken: token, active: true });
    if (shop) {
      return res.json({
        ok: true,
        shop: { id: String(shop._id), name: shop.name, code: shop.code },
      });
    }
    const { AgentDevice } = await import("../models/AgentDevice");
    const device = await AgentDevice.findOne({ token });
    if (!device) return res.status(401).json({ error: "Invalid agent token" });
    const linked = await Shop.findById(device.shopId);
    if (!linked || !linked.active) return res.status(401).json({ error: "Shop inactive" });
    device.lastSeenAt = new Date();
    device.online = true;
    await device.save();
    return res.json({
      ok: true,
      shop: { id: String(linked._id), name: linked.name, code: linked.code },
      deviceId: String(device._id),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Agent auth failed" });
  }
});

router.get("/", requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const shops = await Shop.find().sort({ createdAt: -1 });
    const users = await ShopUser.find().lean();
    const byShop = new Map<string, typeof users>();
    for (const u of users) {
      const key = String(u.shopId);
      if (!byShop.has(key)) byShop.set(key, []);
      byShop.get(key)!.push(u);
    }
    res.json({
      shops: shops.map((s) => ({
        ...serializeShop(s, { includeSecrets: true }),
        shopkeepers: (byShop.get(String(s._id)) || []).map(serializeShopUser),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list shops" });
  }
});

router.post("/", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, code, address, phone, whatsapp, pricing, active } = req.body ?? {};
    if (!name) return res.status(400).json({ error: "name is required" });

    let slug = generateShopCode(code);
    // Ensure uniqueness
    for (let i = 0; i < 5; i++) {
      const existing = await Shop.findOne({ code: slug });
      if (!existing) break;
      slug = generateShopCode();
    }
    if (await Shop.findOne({ code: slug })) {
      return res.status(409).json({ error: "Could not allocate unique shop code" });
    }

    const shop = await Shop.create({
      name: String(name).trim(),
      code: slug,
      address,
      phone,
      whatsapp,
      pricing,
      active: active !== false,
      printerAgentToken: randomBytes(24).toString("hex"),
      qrPath: `/print/${slug}`,
    });
    return res.status(201).json({ shop: serializeShop(shop, { includeSecrets: true }) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create shop" });
  }
});

/** Create shopkeeper login for a shop */
router.post("/:id/shopkeepers", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      return res.status(400).json({ error: "username and password required" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    const uname = String(username).trim().toLowerCase();
    const exists = await ShopUser.findOne({ username: uname });
    if (exists) return res.status(409).json({ error: "Username already taken" });

    const passwordHash = await bcrypt.hash(String(password), 12);
    const user = await ShopUser.create({
      shopId: shop._id,
      username: uname,
      passwordHash,
      role: "shopkeeper",
      active: true,
    });
    return res.status(201).json({ shopkeeper: serializeShopUser(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create shopkeeper" });
  }
});

router.get("/:id/shopkeepers", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const users = await ShopUser.find({ shopId: req.params.id }).sort({ createdAt: -1 });
    res.json({ shopkeepers: users.map(serializeShopUser) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list shopkeepers" });
  }
});

router.delete("/:id/shopkeepers/:userId", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await ShopUser.deleteOne({ _id: req.params.userId, shopId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete shopkeeper" });
  }
});

router.patch("/:id", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    const { name, address, phone, whatsapp, pricing, active } = req.body ?? {};
    if (name) shop.name = String(name).trim();
    if (address !== undefined) shop.address = address;
    if (phone !== undefined) shop.phone = phone;
    if (whatsapp !== undefined) shop.whatsapp = whatsapp;
    if (pricing) shop.pricing = { ...shop.pricing, ...pricing };
    if (typeof active === "boolean") shop.active = active;
    await shop.save();
    return res.json({ shop: serializeShop(shop, { includeSecrets: true }) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update shop" });
  }
});

router.post("/:id/rotate-token", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    shop.printerAgentToken = randomBytes(24).toString("hex");
    await shop.save();
    return res.json({ shop: serializeShop(shop, { includeSecrets: true }) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to rotate token" });
  }
});

router.get("/:id/qr", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    const origin = process.env.PUBLIC_SITE_URL || "http://localhost:5173";
    const url = `${origin}/print/${shop.code}`;
    const format = String(req.query.format || "png");
    if (format === "dataurl" || req.query.dataUrl === "1") {
      const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2 });
      return res.json({ url, dataUrl, shopCode: shop.code });
    }
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `inline; filename="qr-${shop.code}.png"`);
    await QRCode.toFileStream(res, url, { width: 512, margin: 2, type: "png" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to generate QR" });
  }
});

router.delete("/:id", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const shop = await Shop.findByIdAndDelete(req.params.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    await ShopUser.deleteMany({ shopId: shop._id });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete shop" });
  }
});

export default router;
