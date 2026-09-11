import { Router, Request, Response } from "express";
import { Product } from "../models/Product";
import { Addon } from "../models/Addon";
import { Package } from "../models/Package";
import { Service } from "../models/Service";
import { businessInfo } from "../data/products";

const router = Router();

function leanProduct(doc: unknown) {
  const { _id, __v, createdAt, updatedAt, ...rest } = doc as Record<string, unknown>;
  void _id;
  void __v;
  void createdAt;
  void updatedAt;
  return rest;
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const featured = req.query.featured === "1" || req.query.featured === "true";
    const filter: Record<string, unknown> = { active: { $ne: false } };
    if (featured) filter.featured = true;
    const [products, addons, packages] = await Promise.all([
      Product.find(filter).lean(),
      Addon.find().lean(),
      Package.find().lean(),
    ]);
    res.json({
      products: products.map((p) => leanProduct(p)),
      addons: addons.map((a) => leanProduct(a)),
      packages: packages.map((p) => leanProduct(p)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load products" });
  }
});

router.get("/services", async (_req: Request, res: Response) => {
  try {
    const services = await Service.find().lean();
    res.json({
      services: services.map((s) => leanProduct(s)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load services" });
  }
});

router.get("/business", (_req: Request, res: Response) => {
  res.json(businessInfo);
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const product = await Product.findOne({
      $or: [{ id: req.params.id }, { slug: req.params.id }],
    }).lean();
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    return res.json(leanProduct(product));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load product" });
  }
});

router.post("/quote", async (req: Request, res: Response) => {
  try {
    const { productId, quantity = 1, side = "single", addonIds = [] } = req.body ?? {};
    const product = await Product.findOne({ id: productId }).lean();
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    let unitMin = 0;
    let unitMax = 0;
    let quoteBased = false;

    const qty = Number(quantity) || 1;

    if (qty >= 100) {
      quoteBased = true;
    } else if (qty >= 51) {
      const tier = product.bulk.find((b) => b.quantity === "51-100");
      unitMin = tier?.min ?? 0;
      unitMax = tier?.max ?? 0;
    } else if (qty >= 26) {
      const tier = product.bulk.find((b) => b.quantity === "26-50");
      unitMin = tier?.min ?? 0;
      unitMax = tier?.max ?? 0;
    } else if (qty >= 10) {
      const tier = product.bulk.find((b) => b.quantity === "10-25");
      unitMin = tier?.min ?? 0;
      unitMax = tier?.max ?? 0;
    } else {
      if (side === "frontBack" || side === "front+back") {
        unitMin = product.individual.frontBack?.min ?? product.recommendedPrice ?? 0;
        unitMax = product.individual.frontBack?.max ?? product.recommendedPrice ?? 0;
      } else {
        unitMin = product.individual.singleSide?.min ?? product.recommendedPrice ?? 0;
        unitMax = product.individual.singleSide?.max ?? product.recommendedPrice ?? 0;
      }
    }

    let addonMin = 0;
    let addonMax = 0;
    const selectedAddons = await Addon.find({
      id: { $in: addonIds as string[] },
    }).lean();
    for (const a of selectedAddons) {
      addonMin += a.priceMin;
      addonMax += a.priceMax;
    }

    const cleanAddons = selectedAddons.map((a) => leanProduct(a));

    if (quoteBased || (!unitMin && !product.individual.singleSide)) {
      return res.json({
        productId,
        quantity: qty,
        quoteBased: true,
        message: "Please contact us for a custom quote on this order.",
        addons: cleanAddons,
      });
    }

    return res.json({
      productId,
      quantity: qty,
      quoteBased: false,
      unitRange: { min: unitMin + addonMin, max: unitMax + addonMax },
      totalRange: {
        min: (unitMin + addonMin) * qty,
        max: (unitMax + addonMax) * qty,
      },
      currency: "INR",
      addons: cleanAddons,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Quote failed" });
  }
});

export default router;
