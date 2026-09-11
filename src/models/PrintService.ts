import mongoose, { Schema, Document } from "mongoose";

export interface IPrintService extends Document {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  basePriceBw: number;
  basePriceColor: number;
  active: boolean;
  sortOrder: number;
}

const PrintServiceSchema = new Schema<IPrintService>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    icon: { type: String, default: "file" },
    basePriceBw: { type: Number, default: 5 },
    basePriceColor: { type: Number, default: 10 },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const PrintService = mongoose.model<IPrintService>("PrintService", PrintServiceSchema);
