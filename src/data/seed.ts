import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { Product } from "../models/Product";
import { Addon } from "../models/Addon";
import { Package } from "../models/Package";
import { Service } from "../models/Service";
import { AdminUser } from "../models/AdminUser";
import { Shop } from "../models/Shop";
import { ShopUser } from "../models/ShopUser";
import { Printer } from "../models/Printer";
import { PrintService } from "../models/PrintService";
import { SiteSettings } from "../models/SiteSettings";
import {
  products,
  addons,
  packages,
  services,
} from "./products";

const PRODUCT_IMAGES: Record<string, { image: string; images: string[]; featured?: boolean; storePrice?: number }> = {
  "round-neck": {
    image: "/images/product-tshirt-black.jpg",
    images: ["/images/product-tshirt-black.jpg", "/images/product-tshirt-white.jpg"],
    featured: true,
    storePrice: 299,
  },
  polo: {
    image: "/images/product-polo-navy.jpg",
    images: ["/images/product-polo-navy.jpg", "/images/product-polo-orange.jpg"],
    featured: true,
    storePrice: 449,
  },
  cap: {
    image: "/images/product-cap-black.jpg",
    images: ["/images/product-cap-black.jpg", "/images/product-cap-navy.jpg"],
    featured: true,
    storePrice: 249,
  },
  mug: {
    image: "/images/product-mug-white.jpg",
    images: ["/images/product-mug-white.jpg"],
    featured: true,
    storePrice: 199,
  },
  bag: {
    image: "/images/product-bag-white.jpg",
    images: ["/images/product-bag-white.jpg"],
    storePrice: 99,
  },
  "business-card": {
    image: "/images/product-business-cards.jpg",
    images: ["/images/product-business-cards.jpg"],
    storePrice: 149,
  },
};

const printServicesSeed = [
  {
    id: "document",
    name: "Document Print",
    slug: "document",
    description: "PDF / Photo — A4 to Legal",
    icon: "file-text",
    basePriceBw: 5,
    basePriceColor: 10,
    sortOrder: 1,
  },
  {
    id: "resume",
    name: "Resume Maker",
    slug: "resume",
    description: "Professional designs, print instantly",
    icon: "pen-tool",
    basePriceBw: 5,
    basePriceColor: 10,
    sortOrder: 2,
  },
  {
    id: "photo-4x6",
    name: "4x6 Photo Print",
    slug: "photo-4x6",
    description: "Passport photos — 4, 6, 8 or 10 per sheet",
    icon: "camera",
    basePriceBw: 8,
    basePriceColor: 15,
    sortOrder: 3,
  },
  {
    id: "big-size",
    name: "Big Size Print",
    slug: "big-size",
    description: "A3 / A2 / A1 large paper",
    icon: "maximize",
    basePriceBw: 20,
    basePriceColor: 40,
    sortOrder: 4,
  },
  {
    id: "mini",
    name: "Mini Print",
    slug: "mini",
    description: "2–16 pages on one sheet",
    icon: "grid",
    basePriceBw: 5,
    basePriceColor: 10,
    sortOrder: 5,
  },
  {
    id: "smart-scanner",
    name: "Smart Scanner",
    slug: "smart-scanner",
    description: "Photo of a document — clean scan-like page",
    icon: "scan",
    basePriceBw: 5,
    basePriceColor: 10,
    sortOrder: 6,
  },
];

export async function seedDatabase(): Promise<void> {
  const productCount = await Product.countDocuments();
  if (productCount === 0) {
    const enriched = products.map((p) => ({
      ...p,
      ...PRODUCT_IMAGES[p.id],
      active: true,
      stock: 100,
      storePrice: PRODUCT_IMAGES[p.id]?.storePrice ?? p.recommendedPrice ?? 0,
    }));
    await Product.insertMany(enriched);
    console.log(`Seeded ${enriched.length} products`);
  } else {
    for (const [id, meta] of Object.entries(PRODUCT_IMAGES)) {
      const existing = await Product.findOne({ id });
      if (existing && !existing.image) {
        existing.image = meta.image;
        existing.images = meta.images;
        existing.featured = meta.featured || false;
        existing.storePrice = meta.storePrice;
        existing.active = true;
        await existing.save();
      } else if (existing) {
        if (!existing.images?.length) existing.images = meta.images;
        if (!existing.image) existing.image = meta.image;
        if (existing.storePrice == null) existing.storePrice = meta.storePrice;
        if (meta.featured) existing.featured = true;
        existing.active = true;
        await existing.save();
      }
    }
  }

  const addonCount = await Addon.countDocuments();
  if (addonCount === 0) {
    await Addon.insertMany(addons);
    console.log(`Seeded ${addons.length} add-ons`);
  }

  const packageCount = await Package.countDocuments();
  if (packageCount === 0) {
    await Package.insertMany(packages);
    console.log(`Seeded ${packages.length} packages`);
  }

  const serviceCount = await Service.countDocuments();
  if (serviceCount === 0) {
    await Service.insertMany(services);
    console.log(`Seeded ${services.length} services`);
  }

  const adminCount = await AdminUser.countDocuments();
  if (adminCount === 0) {
    const username = (process.env.ADMIN_USERNAME || "fpsadmin").toLowerCase();
    const password = process.env.ADMIN_PASSWORD || "FusionPrint@2026";
    const passwordHash = await bcrypt.hash(password, 12);
    await AdminUser.create({ username, passwordHash, role: "admin" });
    console.log(`Seeded default admin user: ${username}`);
  }

  const printSvcCount = await PrintService.countDocuments();
  if (printSvcCount === 0) {
    await PrintService.insertMany(printServicesSeed.map((s) => ({ ...s, active: true })));
    console.log(`Seeded ${printServicesSeed.length} print services`);
  }

  let fusionShop = await Shop.findOne({ code: "fusion" });
  if (!fusionShop) {
    fusionShop = await Shop.create({
      name: "Fusion Print & Services",
      code: "fusion",
      address: "Village: Macherla, Mandal: Armoor, District: Nizamabad, Pincode: 503224",
      phone: "9494197969",
      whatsapp: "917995572200",
      active: true,
      printerAgentToken: randomBytes(24).toString("hex"),
      pricing: { bwPerPage: 5, colorPerPage: 10, duplexSurcharge: 0 },
      qrPath: "/print/fusion",
    });
    console.log("Seeded shop: fusion (QR /print/fusion)");
  }

  const shopkeeperUser = (process.env.SHOPKEEPER_USERNAME || "fusion.shop").toLowerCase();
  const shopkeeperPass = process.env.SHOPKEEPER_PASSWORD || "Shop@Fusion2026";
  let keeper = await ShopUser.findOne({ username: shopkeeperUser });
  if (!keeper) {
    keeper = await ShopUser.create({
      shopId: fusionShop._id,
      username: shopkeeperUser,
      passwordHash: await bcrypt.hash(shopkeeperPass, 12),
      role: "shopkeeper",
      active: true,
    });
    console.log(`Seeded shopkeeper: ${shopkeeperUser} / ${shopkeeperPass}`);
  }

  const printerCount = await Printer.countDocuments({ shopId: fusionShop._id });
  if (printerCount === 0) {
    await Printer.insertMany([
      {
        shopId: fusionShop._id,
        name: "Front Desk B&W",
        capabilities: ["bw"],
        priority: 1,
        status: "available",
      },
      {
        shopId: fusionShop._id,
        name: "Color Laser",
        capabilities: ["bw", "color"],
        priority: 10,
        status: "available",
      },
    ]);
    console.log("Seeded Fusion printers (B&W priority 1, Color priority 10)");
  }

  const settingsCount = await SiteSettings.countDocuments();
  if (settingsCount === 0) {
    await SiteSettings.create({
      key: "default",
      heroTagline: "Your One-Stop Print & Digital Hub",
      heroHeadline: "FUSION",
      heroSubline:
        "Print. Design. Deliver. Custom apparel, QR print, and digital services in Macherla, Armoor.",
      featuredProductIds: ["round-neck", "polo", "cap", "mug"],
    });
    console.log("Seeded site settings");
  }
}

/** Standalone: npm run seed */
async function runStandalone() {
  if (require.main !== module) return;
  const { config } = await import("dotenv");
  config();
  const { connectDB } = await import("../db");
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }
  await connectDB(uri);
  await seedDatabase();
  console.log("Seed complete");
  process.exit(0);
}

void runStandalone();
