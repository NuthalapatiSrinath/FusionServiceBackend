import mongoose, { Schema, Document } from "mongoose";

export type PriceRange = { min: number; max: number | null; label?: string };

export type BulkTier = {
  quantity: string;
  min: number | null;
  max: number | null;
  quoteBased?: boolean;
};

export interface IProduct extends Document {
  id: string;
  name: string;
  slug: string;
  category: "apparel" | "mockup";
  material?: string;
  description: string;
  individual: {
    singleSide?: PriceRange;
    frontBack?: PriceRange;
    plain?: number;
    namePrint?: number;
    photoPrint?: number;
    logoPrint?: number;
    printed?: number;
  };
  bulk: BulkTier[];
  recommendedPrice?: number;
  storePrice?: number;
  images: string[];
  image?: string;
  stock: number;
  active: boolean;
  featured: boolean;
  mockupType: "tshirt" | "polo" | "cap" | "mug" | "bag" | "business-card";
  colors: string[];
  sides: ("front" | "back")[];
}

const PriceRangeSchema = new Schema(
  {
    min: { type: Number, required: true },
    max: { type: Number, default: null },
    label: String,
  },
  { _id: false }
);

const BulkTierSchema = new Schema(
  {
    quantity: { type: String, required: true },
    min: { type: Number, default: null },
    max: { type: Number, default: null },
    quoteBased: Boolean,
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    category: { type: String, enum: ["apparel", "mockup"], required: true },
    material: String,
    description: { type: String, default: "" },
    individual: {
      singleSide: PriceRangeSchema,
      frontBack: PriceRangeSchema,
      plain: Number,
      namePrint: Number,
      photoPrint: Number,
      logoPrint: Number,
      printed: Number,
    },
    bulk: { type: [BulkTierSchema], default: [] },
    recommendedPrice: Number,
    storePrice: Number,
    images: { type: [String], default: [] },
    image: String,
    stock: { type: Number, default: 100 },
    active: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    mockupType: {
      type: String,
      enum: ["tshirt", "polo", "cap", "mug", "bag", "business-card"],
      required: true,
    },
    colors: { type: [String], default: [] },
    sides: [{ type: String, enum: ["front", "back"] }],
  },
  { timestamps: true }
);

export const Product = mongoose.model<IProduct>("Product", ProductSchema);
