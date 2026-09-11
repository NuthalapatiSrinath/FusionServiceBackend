import mongoose, { Schema, Document, Types } from "mongoose";

export type PrintJobStatus = "queued" | "printing" | "done" | "failed" | "cancelled";

export type PrintJobOptions = {
  colorMode: "bw" | "color";
  duplex: boolean;
  copies: number;
  layout?: "id-front-back" | "certificate" | "admit" | "auto" | "none";
  pageCount?: number;
};

export type PrintJobFile = {
  url: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
};

export interface IPrintJob extends Document {
  shopId: Types.ObjectId;
  shopCode: string;
  assignedPrinterId?: Types.ObjectId | null;
  serviceType: string;
  serviceName?: string;
  files: PrintJobFile[];
  options: PrintJobOptions;
  status: PrintJobStatus;
  totalPrice: number;
  paymentStatus: "pending" | "paid" | "stub";
  paymentMethod?: "online" | "counter" | "stub";
  customerNote?: string;
  customerPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PrintJobFileSchema = new Schema(
  {
    url: String,
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
  },
  { _id: false }
);

const PrintJobSchema = new Schema<IPrintJob>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    shopCode: { type: String, required: true, index: true },
    assignedPrinterId: { type: Schema.Types.ObjectId, ref: "Printer", default: null, index: true },
    serviceType: { type: String, required: true },
    serviceName: String,
    files: { type: [PrintJobFileSchema], default: [] },
    options: {
      colorMode: { type: String, enum: ["bw", "color"], default: "bw" },
      duplex: { type: Boolean, default: false },
      copies: { type: Number, default: 1 },
      layout: {
        type: String,
        enum: ["id-front-back", "certificate", "admit", "auto", "none"],
        default: "auto",
      },
      pageCount: { type: Number, default: 1 },
    },
    status: {
      type: String,
      enum: ["queued", "printing", "done", "failed", "cancelled"],
      default: "queued",
      index: true,
    },
    totalPrice: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "stub"],
      default: "stub",
    },
    paymentMethod: {
      type: String,
      enum: ["online", "counter", "stub"],
      default: "stub",
    },
    customerNote: String,
    customerPhone: String,
  },
  { timestamps: true }
);

export function serializePrintJob(job: IPrintJob | Record<string, unknown>) {
  const j = job as IPrintJob & { _id: { toString(): string } };
  return {
    id: String(j._id),
    shopId: String(j.shopId),
    shopCode: j.shopCode,
    assignedPrinterId: j.assignedPrinterId ? String(j.assignedPrinterId) : null,
    serviceType: j.serviceType,
    serviceName: j.serviceName,
    files: j.files,
    options: j.options,
    status: j.status,
    totalPrice: j.totalPrice,
    paymentStatus: j.paymentStatus || "stub",
    paymentMethod: j.paymentMethod || "stub",
    customerNote: j.customerNote,
    customerPhone: j.customerPhone,
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
  };
}

export const PrintJob = mongoose.model<IPrintJob>("PrintJob", PrintJobSchema);
