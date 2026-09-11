import mongoose, { Schema, Document } from "mongoose";
import { randomBytes } from "crypto";

export interface IShopPricing {
  bwPerPage?: number;
  colorPerPage?: number;
  duplexSurcharge?: number;
}

export interface IShop extends Document {
  name: string;
  code: string;
  /** Legacy field — never required for customers. Kept optional for old docs. */
  pin?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  active: boolean;
  /** Long-lived agent token (also issued via pairing). Not shown to shopkeepers. */
  printerAgentToken: string;
  pricing?: IShopPricing;
  qrPath: string;
  createdAt: Date;
  updatedAt: Date;
}

const ShopSchema = new Schema<IShop>(
  {
    name: { type: String, required: true },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    pin: { type: String, required: false },
    address: String,
    phone: String,
    whatsapp: String,
    active: { type: Boolean, default: true },
    printerAgentToken: {
      type: String,
      required: true,
      unique: true,
      default: () => randomBytes(24).toString("hex"),
    },
    pricing: {
      bwPerPage: { type: Number, default: 5 },
      colorPerPage: { type: Number, default: 10 },
      duplexSurcharge: { type: Number, default: 0 },
    },
    qrPath: { type: String, required: true },
  },
  { timestamps: true }
);

/** Generate codes like SHOP_ECB1AB8A or keep short slugs when provided. */
export function generateShopCode(preferred?: string): string {
  if (preferred) {
    const slug = String(preferred)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .replace(/_+/g, "_");
    if (slug) return slug;
  }
  return `SHOP_${randomBytes(4).toString("hex").toUpperCase()}`;
}

export function serializeShop(
  shop: IShop | Record<string, unknown>,
  opts?: { includeSecrets?: boolean }
) {
  const s = shop as IShop & { _id: { toString(): string }; createdAt?: Date; updatedAt?: Date };
  const base: Record<string, unknown> = {
    id: String(s._id),
    name: s.name,
    code: s.code,
    address: s.address,
    phone: s.phone,
    whatsapp: s.whatsapp,
    active: s.active,
    pricing: s.pricing,
    qrPath: s.qrPath || `/print/${s.code}`,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
  if (opts?.includeSecrets) {
    base.printerAgentToken = s.printerAgentToken;
    if (s.pin) base.pin = s.pin;
  }
  return base;
}

export const Shop = mongoose.model<IShop>("Shop", ShopSchema);
