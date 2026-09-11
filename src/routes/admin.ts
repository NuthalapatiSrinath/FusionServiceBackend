import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { Product } from "../models/Product";
import { Addon } from "../models/Addon";
import { Package } from "../models/Package";
import { Service } from "../models/Service";
import { PrintService } from "../models/PrintService";
import { SiteSettings } from "../models/SiteSettings";
import { Order, serializeOrder } from "../models/Order";
import { PrintJob } from "../models/PrintJob";
import { Shop } from "../models/Shop";
import { Inquiry } from "../models/Inquiry";
import { requireAdmin, AuthRequest } from "../middleware/auth";

const uploadDir = path.resolve(process.env.UPLOAD_DIR || "uploads", "products");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

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
    if (file.mimetype.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(file.originalname)) {
      cb(null, true);
    } else cb(new Error("Images only"));
  },
});

const router = Router();

function lean(doc: unknown) {
  const { _id, __v, ...rest } = doc as Record<string, unknown>;
  void __v;
  return { id: rest.id || String(_id), ...rest, _id: undefined };
}

router.get("/stats", requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const [shops, jobsQueued, jobsTotal, products, orders, inquiries] = await Promise.all([
      Shop.countDocuments({ active: true }),
      PrintJob.countDocuments({ status: "queued" }),
      PrintJob.countDocuments(),
      Product.countDocuments({ active: true }),
      Order.countDocuments({ status: "new" }),
      Inquiry.countDocuments({ status: "new" }),
    ]);
    res.json({
      stats: {
        shops,
        jobsQueued,
        jobsTotal,
        products,
        ordersNew: orders,
        inquiriesNew: inquiries,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Stats failed" });
  }
});

/* ---------- Products CRUD ---------- */
router.get("/products", requireAdmin, async (_req: AuthRequest, res: Response) => {
  const products = await Product.find().sort({ createdAt: -1 }).lean();
  res.json({ products: products.map(lean) });
});

router.post("/products", requireAdmin, upload.array("images", 5), async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body ?? {};
    const id = String(body.id || body.slug || uuidv4()).toLowerCase().replace(/\s+/g, "-");
    const files = (req.files as Express.Multer.File[]) || [];
    const uploaded = files.map((f) => `/uploads/products/${f.filename}`);
    const images = uploaded.length
      ? uploaded
      : body.image
        ? [body.image]
        : body.images
          ? JSON.parse(body.images)
          : [];

    const product = await Product.create({
      id,
      name: body.name,
      slug: body.slug || id,
      category: body.category || "apparel",
      material: body.material,
      description: body.description || "",
      individual: body.individual
        ? typeof body.individual === "string"
          ? JSON.parse(body.individual)
          : body.individual
        : {},
      bulk: body.bulk ? (typeof body.bulk === "string" ? JSON.parse(body.bulk) : body.bulk) : [],
      recommendedPrice: body.recommendedPrice ? Number(body.recommendedPrice) : undefined,
      storePrice: body.storePrice ? Number(body.storePrice) : Number(body.recommendedPrice) || 0,
      images,
      image: images[0],
      stock: body.stock != null ? Number(body.stock) : 100,
      active: body.active !== "false" && body.active !== false,
      featured: body.featured === "true" || body.featured === true,
      mockupType: body.mockupType || "tshirt",
      colors: body.colors
        ? typeof body.colors === "string"
          ? JSON.parse(body.colors)
          : body.colors
        : ["#FFFFFF", "#1A2A47", "#000000"],
      sides: body.sides
        ? typeof body.sides === "string"
          ? JSON.parse(body.sides)
          : body.sides
        : ["front"],
    });
    res.status(201).json({ product: lean(product.toObject()) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Create product failed" });
  }
});

router.patch("/products/:id", requireAdmin, upload.array("images", 5), async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findOne({ $or: [{ id: req.params.id }, { slug: req.params.id }] });
    if (!product) return res.status(404).json({ error: "Not found" });
    const body = req.body ?? {};
    const files = (req.files as Express.Multer.File[]) || [];
    const uploaded = files.map((f) => `/uploads/products/${f.filename}`);

    if (body.name) product.name = body.name;
    if (body.description !== undefined) product.description = body.description;
    if (body.material !== undefined) product.material = body.material;
    if (body.recommendedPrice != null) product.recommendedPrice = Number(body.recommendedPrice);
    if (body.storePrice != null) product.storePrice = Number(body.storePrice);
    if (body.stock != null) product.stock = Number(body.stock);
    if (body.active !== undefined) product.active = body.active !== "false" && body.active !== false;
    if (body.featured !== undefined) product.featured = body.featured === "true" || body.featured === true;
    if (body.mockupType) product.mockupType = body.mockupType;
    if (body.individual) {
      product.individual =
        typeof body.individual === "string" ? JSON.parse(body.individual) : body.individual;
    }
    if (body.colors) {
      product.colors = typeof body.colors === "string" ? JSON.parse(body.colors) : body.colors;
    }
    if (uploaded.length) {
      product.images = [...(product.images || []), ...uploaded];
      product.image = product.images[0];
    } else if (body.image) {
      product.image = body.image;
      if (!product.images?.includes(body.image)) product.images = [body.image, ...(product.images || [])];
    }
    await product.save();
    return res.json({ product: lean(product.toObject()) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Update product failed" });
  }
});

router.delete("/products/:id", requireAdmin, async (req: AuthRequest, res: Response) => {
  await Product.deleteOne({ $or: [{ id: req.params.id }, { slug: req.params.id }] });
  res.json({ ok: true });
});

/* ---------- Services / Addons / Packages / PrintServices ---------- */
router.post("/services", requireAdmin, async (req: AuthRequest, res: Response) => {
  const body = req.body ?? {};
  const id = String(body.id || uuidv4());
  const doc = await Service.findOneAndUpdate(
    { id },
    { id, name: body.name, icon: body.icon || "star", description: body.description || "" },
    { upsert: true, new: true }
  );
  res.json({ service: lean(doc!.toObject()) });
});

router.delete("/services/:id", requireAdmin, async (req: AuthRequest, res: Response) => {
  await Service.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

router.post("/addons", requireAdmin, async (req: AuthRequest, res: Response) => {
  const body = req.body ?? {};
  const id = String(body.id || uuidv4());
  const doc = await Addon.findOneAndUpdate(
    { id },
    {
      id,
      name: body.name,
      priceMin: Number(body.priceMin) || 0,
      priceMax: Number(body.priceMax) || 0,
      description: body.description || "",
    },
    { upsert: true, new: true }
  );
  res.json({ addon: lean(doc!.toObject()) });
});

router.delete("/addons/:id", requireAdmin, async (req: AuthRequest, res: Response) => {
  await Addon.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

router.post("/packages", requireAdmin, async (req: AuthRequest, res: Response) => {
  const body = req.body ?? {};
  const id = String(body.id || uuidv4());
  const doc = await Package.findOneAndUpdate(
    { id },
    {
      id,
      name: body.name,
      description: body.description || "",
      price: body.price != null ? Number(body.price) : null,
      quoteBased: !!body.quoteBased,
      items: body.items || "",
    },
    { upsert: true, new: true }
  );
  res.json({ package: lean(doc!.toObject()) });
});

router.delete("/packages/:id", requireAdmin, async (req: AuthRequest, res: Response) => {
  await Package.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

router.get("/print-services", requireAdmin, async (_req: AuthRequest, res: Response) => {
  const services = await PrintService.find().sort({ sortOrder: 1 }).lean();
  res.json({ services: services.map(lean) });
});

router.post("/print-services", requireAdmin, async (req: AuthRequest, res: Response) => {
  const body = req.body ?? {};
  const id = String(body.id || body.slug || uuidv4());
  const doc = await PrintService.findOneAndUpdate(
    { id },
    {
      id,
      name: body.name,
      slug: body.slug || id,
      description: body.description || "",
      icon: body.icon || "file",
      basePriceBw: Number(body.basePriceBw) || 5,
      basePriceColor: Number(body.basePriceColor) || 10,
      active: body.active !== false,
      sortOrder: Number(body.sortOrder) || 0,
    },
    { upsert: true, new: true }
  );
  res.json({ service: lean(doc!.toObject()) });
});

router.delete("/print-services/:id", requireAdmin, async (req: AuthRequest, res: Response) => {
  await PrintService.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

/* ---------- Orders ---------- */
router.get("/orders", requireAdmin, async (_req: AuthRequest, res: Response) => {
  const orders = await Order.find().sort({ createdAt: -1 }).limit(200);
  res.json({ orders: orders.map(serializeOrder) });
});

router.patch("/orders/:id", requireAdmin, async (req: AuthRequest, res: Response) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: "Not found" });
  if (req.body?.status) order.status = req.body.status;
  await order.save();
  return res.json({ order: serializeOrder(order) });
});

/* ---------- Site settings ---------- */
router.get("/settings", requireAdmin, async (_req: AuthRequest, res: Response) => {
  let settings = await SiteSettings.findOne({ key: "default" });
  if (!settings) settings = await SiteSettings.create({ key: "default" });
  res.json({ settings });
});

router.put("/settings", requireAdmin, async (req: AuthRequest, res: Response) => {
  const settings = await SiteSettings.findOneAndUpdate(
    { key: "default" },
    { $set: { ...req.body, key: "default" } },
    { upsert: true, new: true }
  );
  res.json({ settings });
});

export default router;
