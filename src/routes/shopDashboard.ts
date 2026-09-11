import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Shop, serializeShop } from "../models/Shop";
import { ShopUser, serializeShopUser } from "../models/ShopUser";
import { Printer, serializePrinter } from "../models/Printer";
import { PrintJob, serializePrintJob } from "../models/PrintJob";
import {
  AgentDevice,
  generatePairingCode,
  serializeAgentDevice,
} from "../models/AgentDevice";
import {
  requireShopkeeper,
  AuthRequest,
  jwtSecret,
} from "../middleware/auth";
import { emitPrintJob } from "../socket";
import { Request } from "express";

const router = Router();

/** Shopkeeper login — separate from platform admin */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    const user = await ShopUser.findOne({
      username: String(username).trim().toLowerCase(),
      active: true,
    });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const shop = await Shop.findById(user.shopId);
    if (!shop || !shop.active) {
      return res.status(403).json({ error: "Shop is inactive" });
    }

    const token = jwt.sign(
      {
        role: "shopkeeper",
        username: user.username,
        shopId: String(shop._id),
        userId: String(user._id),
      },
      jwtSecret(),
      { expiresIn: "12h" }
    );

    return res.json({
      token,
      user: serializeShopUser(user),
      shop: serializeShop(shop), // no secrets
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", requireShopkeeper, async (req: AuthRequest, res: Response) => {
  try {
    const shop = await Shop.findById(req.user!.shopId);
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    const user = await ShopUser.findById(req.user!.userId);
    return res.json({
      user: user ? serializeShopUser(user) : { username: req.user!.username, role: "shopkeeper" },
      shop: serializeShop(shop),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load profile" });
  }
});

/** Live print queue for THIS shop only */
router.get("/jobs", requireShopkeeper, async (req: AuthRequest, res: Response) => {
  try {
    const filter: Record<string, unknown> = { shopId: req.user!.shopId };
    if (req.query.status) filter.status = String(req.query.status);
    const jobs = await PrintJob.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json({ jobs: jobs.map(serializePrintJob) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load jobs" });
  }
});

router.patch("/jobs/:id", requireShopkeeper, async (req: AuthRequest, res: Response) => {
  try {
    const job = await PrintJob.findOne({ _id: req.params.id, shopId: req.user!.shopId });
    if (!job) return res.status(404).json({ error: "Job not found" });
    const { status, paymentStatus } = req.body ?? {};
    if (status && ["queued", "printing", "done", "failed", "cancelled"].includes(status)) {
      job.status = status;
      if (job.assignedPrinterId && ["done", "failed", "cancelled"].includes(status)) {
        await Printer.updateOne(
          { _id: job.assignedPrinterId, status: "busy" },
          { $set: { status: "available" } }
        );
      }
    }
    if (paymentStatus && ["pending", "paid", "stub"].includes(paymentStatus)) {
      job.paymentStatus = paymentStatus;
    }
    await job.save();
    const payload = serializePrintJob(job);
    emitPrintJob(job.shopCode, "printjob:updated", payload);
    return res.json({ job: payload });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update job" });
  }
});

/* ---------- Printers CRUD ---------- */
router.get("/printers", requireShopkeeper, async (req: AuthRequest, res: Response) => {
  try {
    const printers = await Printer.find({ shopId: req.user!.shopId }).sort({ priority: 1 });
    res.json({ printers: printers.map(serializePrinter) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list printers" });
  }
});

router.post("/printers", requireShopkeeper, async (req: AuthRequest, res: Response) => {
  try {
    const { name, capabilities, priority, status } = req.body ?? {};
    if (!name) return res.status(400).json({ error: "name required" });
    let caps = Array.isArray(capabilities) ? capabilities : ["bw"];
    caps = caps.filter((c: string) => c === "bw" || c === "color");
    if (!caps.length) caps = ["bw"];

    const printer = await Printer.create({
      shopId: req.user!.shopId,
      name: String(name).trim(),
      capabilities: caps,
      priority: Number(priority) || 100,
      status: ["available", "busy", "offline"].includes(status) ? status : "available",
    });
    return res.status(201).json({ printer: serializePrinter(printer) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create printer" });
  }
});

router.patch("/printers/:id", requireShopkeeper, async (req: AuthRequest, res: Response) => {
  try {
    const printer = await Printer.findOne({ _id: req.params.id, shopId: req.user!.shopId });
    if (!printer) return res.status(404).json({ error: "Printer not found" });
    const { name, capabilities, priority, status } = req.body ?? {};
    if (name) printer.name = String(name).trim();
    if (Array.isArray(capabilities)) {
      const caps = capabilities.filter((c: string) => c === "bw" || c === "color");
      if (caps.length) printer.capabilities = caps;
    }
    if (priority != null) printer.priority = Number(priority);
    if (["available", "busy", "offline"].includes(status)) printer.status = status;
    await printer.save();
    return res.json({ printer: serializePrinter(printer) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update printer" });
  }
});

router.delete("/printers/:id", requireShopkeeper, async (req: AuthRequest, res: Response) => {
  try {
    await Printer.deleteOne({ _id: req.params.id, shopId: req.user!.shopId });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete printer" });
  }
});

/* ---------- Pair device (one-time code) — no API URL shown ---------- */
router.get("/devices", requireShopkeeper, async (req: AuthRequest, res: Response) => {
  try {
    const devices = await AgentDevice.find({ shopId: req.user!.shopId }).sort({ createdAt: -1 });
    res.json({ devices: devices.map((d) => serializeAgentDevice(d)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list devices" });
  }
});

router.post("/pair", requireShopkeeper, async (req: AuthRequest, res: Response) => {
  try {
    const name = String(req.body?.name || "Print connector").trim();
    const code = generatePairingCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const device = await AgentDevice.create({
      shopId: req.user!.shopId,
      name,
      pairingCode: code,
      pairingExpiresAt: expiresAt,
      online: false,
    });

    return res.status(201).json({
      device: serializeAgentDevice(device),
      pairingCode: code,
      expiresAt,
      hint: "Enter this code in the Fusion Print Connector app. Do not share API URLs with staff.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create pairing code" });
  }
});

router.delete("/devices/:id", requireShopkeeper, async (req: AuthRequest, res: Response) => {
  try {
    await AgentDevice.deleteOne({ _id: req.params.id, shopId: req.user!.shopId });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove device" });
  }
});

/**
 * Public agent pairing — connector posts the short code.
 * Platform owner configures default API_URL in the agent binary/env;
 * shops only ever see/enter the pairing code.
 */
router.post("/agent/pair", async (req: Request, res: Response) => {
  try {
    const code = String(req.body?.pairingCode || req.body?.code || "")
      .trim()
      .toUpperCase();
    if (!code || code.length < 4) {
      return res.status(400).json({ error: "pairingCode required" });
    }

    const device = await AgentDevice.findOne({ pairingCode: code });
    if (!device) return res.status(404).json({ error: "Invalid pairing code" });
    if (device.pairingExpiresAt && device.pairingExpiresAt.getTime() < Date.now()) {
      return res.status(410).json({ error: "Pairing code expired — generate a new one" });
    }

    const shop = await Shop.findById(device.shopId);
    if (!shop || !shop.active) return res.status(403).json({ error: "Shop inactive" });

    device.pairingCode = null;
    device.pairingExpiresAt = null;
    device.lastSeenAt = new Date();
    device.online = true;
    if (req.body?.deviceName) device.name = String(req.body.deviceName).trim();
    await device.save();

    const apiUrl =
      process.env.PUBLIC_API_URL ||
      process.env.API_PUBLIC_URL ||
      `http://localhost:${process.env.PORT || 5000}`;

    return res.json({
      ok: true,
      agentToken: device.token,
      shop: { id: String(shop._id), name: shop.name, code: shop.code },
      apiUrl,
      deviceId: String(device._id),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Pairing failed" });
  }
});

export default router;
