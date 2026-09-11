import mongoose, { Schema, Document } from "mongoose";

export interface IAddon extends Document {
  id: string;
  name: string;
  priceMin: number;
  priceMax: number;
  description: string;
}

const AddonSchema = new Schema<IAddon>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    priceMin: { type: Number, required: true },
    priceMax: { type: Number, required: true },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Addon = mongoose.model<IAddon>("Addon", AddonSchema);
