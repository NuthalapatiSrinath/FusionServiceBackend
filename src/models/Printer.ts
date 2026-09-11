import mongoose, { Schema, Document, Types } from "mongoose";

export type PrinterCapability = "bw" | "color";
export type PrinterStatus = "available" | "busy" | "offline";

export interface IPrinter extends Document {
  shopId: Types.ObjectId;
  name: string;
  capabilities: PrinterCapability[];
  /** Lower number = higher priority (1 first). */
  priority: number;
  status: PrinterStatus;
  agentDeviceId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const PrinterSchema = new Schema<IPrinter>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    name: { type: String, required: true, trim: true },
    capabilities: {
      type: [String],
      enum: ["bw", "color"],
      default: ["bw"],
    },
    priority: { type: Number, default: 100 },
    status: {
      type: String,
      enum: ["available", "busy", "offline"],
      default: "available",
    },
    agentDeviceId: { type: Schema.Types.ObjectId, ref: "AgentDevice", default: null },
  },
  { timestamps: true }
);

export function serializePrinter(p: IPrinter | Record<string, unknown>) {
  const x = p as IPrinter & { _id: { toString(): string } };
  return {
    id: String(x._id),
    shopId: String(x.shopId),
    name: x.name,
    capabilities: x.capabilities,
    priority: x.priority,
    status: x.status,
    agentDeviceId: x.agentDeviceId ? String(x.agentDeviceId) : null,
    createdAt: x.createdAt,
    updatedAt: x.updatedAt,
  };
}

export const Printer = mongoose.model<IPrinter>("Printer", PrinterSchema);
