import mongoose, { Schema, Document } from "mongoose";

export interface IService extends Document {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const ServiceSchema = new Schema<IService>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    icon: { type: String, required: true },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Service = mongoose.model<IService>("Service", ServiceSchema);
