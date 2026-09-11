import mongoose, { Schema, Document } from "mongoose";

export type OrderItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  color?: string;
  side?: string;
  designUrl?: string;
  image?: string;
};

export interface IOrder extends Document {
  customerName: string;
  phone: string;
  email?: string;
  address?: string;
  items: OrderItem[];
  totalEstimate: number;
  note?: string;
  status: "new" | "reviewed" | "quoted" | "confirmed" | "completed" | "cancelled";
  type: "order" | "inquiry";
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema(
  {
    productId: String,
    name: String,
    quantity: Number,
    unitPrice: Number,
    color: String,
    side: String,
    designUrl: String,
    image: String,
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
    address: String,
    items: { type: [OrderItemSchema], default: [] },
    totalEstimate: { type: Number, default: 0 },
    note: String,
    status: {
      type: String,
      enum: ["new", "reviewed", "quoted", "confirmed", "completed", "cancelled"],
      default: "new",
      index: true,
    },
    type: { type: String, enum: ["order", "inquiry"], default: "order" },
  },
  { timestamps: true }
);

export function serializeOrder(order: IOrder | Record<string, unknown>) {
  const o = order as IOrder & { _id: { toString(): string } };
  return {
    id: String(o._id),
    customerName: o.customerName,
    phone: o.phone,
    email: o.email,
    address: o.address,
    items: o.items,
    totalEstimate: o.totalEstimate,
    note: o.note,
    status: o.status,
    type: o.type,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

export const Order = mongoose.model<IOrder>("Order", OrderSchema);
