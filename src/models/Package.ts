import mongoose, { Schema, Document } from "mongoose";

export interface IPackage extends Document {
  id: string;
  name: string;
  description: string;
  price: number | null;
  quoteBased: boolean;
  items: string;
}

const PackageSchema = new Schema<IPackage>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, default: null },
    quoteBased: { type: Boolean, default: false },
    items: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Package = mongoose.model<IPackage>("Package", PackageSchema);
