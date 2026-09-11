import mongoose, { Schema, Document } from "mongoose";

export interface IInquiry extends Document {
  name: string;
  phone: string;
  email?: string;
  productId?: string;
  quantity?: number;
  side?: string;
  color?: string;
  addonIds?: string[];
  designUrl?: string;
  message?: string;
  status: "new" | "reviewed" | "quoted";
  createdAt: Date;
  updatedAt: Date;
}

const InquirySchema = new Schema<IInquiry>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    productId: String,
    quantity: Number,
    side: String,
    color: String,
    addonIds: { type: [String], default: [] },
    designUrl: String,
    message: String,
    status: {
      type: String,
      enum: ["new", "reviewed", "quoted"],
      default: "new",
    },
  },
  { timestamps: true }
);

export const Inquiry = mongoose.model<IInquiry>("Inquiry", InquirySchema);

export function serializeInquiry(doc: IInquiry) {
  return {
    id: String(doc._id),
    name: doc.name,
    phone: doc.phone,
    email: doc.email,
    productId: doc.productId,
    quantity: doc.quantity,
    side: doc.side,
    color: doc.color,
    addonIds: doc.addonIds,
    designUrl: doc.designUrl,
    message: doc.message,
    status: doc.status,
    createdAt: doc.createdAt?.toISOString?.() ?? new Date(doc.createdAt).toISOString(),
  };
}
