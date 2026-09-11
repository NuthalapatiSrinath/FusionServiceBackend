import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { PrintJob, serializePrintJob } from "../models/PrintJob";
import { PrintService } from "../models/PrintService";
import { Shop } from "../models/Shop";
import { AgentDevice } from "../models/AgentDevice";
import { requireAdmin, requireShopkeeper, AuthRequest } from "../middleware/auth";
import { emitPrintJob } from "../socket";
import { assignPrinterForJob } from "../utils/assignPrinter";

const uploadDir = path.resolve(process.env.UPLOAD_DIR || "uploads", "print-jobs");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".bin";
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      /\.(jpe?g|png|gif|webp|pdf)$/i.test(path.extname(file.originalname)) ||
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf";
    if (ok) cb(null, true);
    else cb(new Error("Only images and PDF allowed"));
  },
});

const router = Router();

async function resolveShopByAgentToken(token: string) {
  if (!token) return null;
  const shop = await Shop.findOne({ printerAgentToken: token, active: true });
  if (shop) return { shop, deviceId: null as string | null };
  const device = await AgentDevice.findOne({ token });
  if (!device) return null;
  const linked = await Shop.findById(device.shopId);
  if (!linked || !linked.active) return null;
  device.lastSeenAt = new Date();
  device.online = true;
  await device.save();
  return { shop: linked, deviceId: String(device._id) };
}

router.get("/services", async (_req: Request, res: Response) => {
  try {
    const services = await PrintService.find({ active: true }).sort({ sortOrder: 1 }).lean();
    res.json({
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        description: s.description,
        icon: s.icon,
        basePriceBw: s.basePriceBw,
        basePriceColor: s.basePriceColor,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load print services" });
  }
});

/** Customer submit — NO PIN. Shop bound by shopCode from QR URL. */
router.post("/submit", upload.array("files", 10), async (req: Request, res: Response) => {
  try {
    const {
      shopCode,
      serviceType,
      colorMode = "bw",
      duplex = "false",
      copies = "1",
      layout = "auto",
      pageCount = "1",
      customerNote,
      customerPhone,
      paymentStatus = "stub",
      paymentMethod = "stub",
    } = req.body ?? {};

    if (!shopCode || !serviceType) {
      return res.status(400).json({ error: "shopCode and serviceType required" });
    }

    const raw = String(shopCode).trim();
    const shop = await Shop.findOne({
      $or: [{ code: raw }, { code: raw.toLowerCase() }],
      active: true,
    });
    if (!shop) return res.status(404).json({ error: "Shop not found" });

    const svc = await PrintService.findOne({ id: serviceType });
    const files = ((req.files as Express.Multer.File[]) || []).map((f) => ({
      url: `/uploads/print-jobs/${f.filename}`,
      filename: f.filename,
      originalName: f.originalname,
      mimeType: f.mimetype,
      size: f.size,
    }));

    if (!files.length) return res.status(400).json({ error: "At least one file required" });

    const pages = Math.max(1, Number(pageCount) || 1);
    const copyCount = Math.max(1, Number(copies) || 1);
    const isColor = colorMode === "color";
    const perPage =
      (isColor
        ? shop.pricing?.colorPerPage ?? svc?.basePriceColor ?? 10
        : shop.pricing?.bwPerPage ?? svc?.basePriceBw ?? 5) || 5;
    const duplexFee = String(duplex) === "true" ? shop.pricing?.duplexSurcharge || 0 : 0;
    const totalPrice = (perPage * pages + duplexFee) * copyCount;

    const mode = isColor ? "color" : "bw";
    const assigned = await assignPrinterForJob(shop._id, mode);

    const job = await PrintJob.create({
      shopId: shop._id,
      shopCode: shop.code,
      assignedPrinterId: assigned?._id || null,
      serviceType,
      serviceName: svc?.name,
      files,
      options: {
        colorMode: mode,
        duplex: String(duplex) === "true",
        copies: copyCount,
        layout,
        pageCount: pages,
      },
      status: "queued",
      totalPrice,
      paymentStatus: ["pending", "paid", "stub"].includes(paymentStatus) ? paymentStatus : "stub",
      paymentMethod: ["online", "counter", "stub"].includes(String(paymentMethod))
        ? paymentMethod
        : paymentStatus === "pending"
          ? "counter"
          : "stub",
      customerNote,
      customerPhone,
    });

    if (assigned && assigned.status === "available") {
      assigned.status = "busy";
      await assigned.save();
    }

    const payload = serializePrintJob(job);
    emitPrintJob(shop.code, "printjob:new", payload);

    return res.status(201).json({ success: true, job: payload });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to submit print job" });
  }
});

router.get("/", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.shopCode) filter.shopCode = String(req.query.shopCode);
    if (req.query.status) filter.status = String(req.query.status);
    const jobs = await PrintJob.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({ jobs: jobs.map(serializePrintJob) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list jobs" });
  }
});

router.get("/agent/queue", async (req: Request, res: Response) => {
  try {
    const token = String(req.headers["x-agent-token"] || req.query.token || "");
    const resolved = await resolveShopByAgentToken(token);
    if (!resolved) return res.status(401).json({ error: "Invalid agent token" });
    const jobs = await PrintJob.find({
      shopCode: resolved.shop.code,
      status: { $in: ["queued", "printing"] },
    })
      .sort({ createdAt: 1 })
      .limit(50);
    res.json({ shopCode: resolved.shop.code, jobs: jobs.map(serializePrintJob) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load agent queue" });
  }
});

router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const job = await PrintJob.findById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });

    const auth = req.headers.authorization;
    const agentToken = String(req.headers["x-agent-token"] || "");
    let allowed = false;

    if (auth?.startsWith("Bearer ")) {
      allowed = true;
    }
    if (agentToken) {
      const resolved = await resolveShopByAgentToken(agentToken);
      if (resolved && resolved.shop.code === job.shopCode) allowed = true;
    }
    if (!allowed) return res.status(401).json({ error: "Unauthorized" });

    const { status } = req.body ?? {};
    if (!["queued", "printing", "done", "failed", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    job.status = status;
    await job.save();

    if (job.assignedPrinterId && (status === "done" || status === "failed" || status === "cancelled")) {
      const { Printer } = await import("../models/Printer");
      await Printer.updateOne(
        { _id: job.assignedPrinterId, status: "busy" },
        { $set: { status: "available" } }
      );
    }

    const payload = serializePrintJob(job);
    emitPrintJob(job.shopCode, "printjob:updated", payload);
    return res.json({ job: payload });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update status" });
  }
});

router.patch("/:id", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const job = await PrintJob.findById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    const { status } = req.body ?? {};
    if (status && ["queued", "printing", "done", "failed", "cancelled"].includes(status)) {
      job.status = status;
      await job.save();
    }
    const payload = serializePrintJob(job);
    emitPrintJob(job.shopCode, "printjob:updated", payload);
    return res.json({ job: payload });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update job" });
  }
});

void requireShopkeeper;

export default router;
