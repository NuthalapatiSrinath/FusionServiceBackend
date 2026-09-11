import mongoose, { Schema, Document, Types } from "mongoose";
import { randomBytes } from "crypto";

export interface IAgentDevice extends Document {
  shopId: Types.ObjectId;
  name: string;
  token: string;
  pairingCode?: string | null;
  pairingExpiresAt?: Date | null;
  lastSeenAt?: Date | null;
  online: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AgentDeviceSchema = new Schema<IAgentDevice>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    name: { type: String, default: "Print connector" },
    token: {
      type: String,
      required: true,
      unique: true,
      default: () => randomBytes(24).toString("hex"),
    },
    pairingCode: { type: String, default: null, index: true },
    pairingExpiresAt: { type: Date, default: null },
    lastSeenAt: { type: Date, default: null },
    online: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export function generatePairingCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) code += alphabet[bytes[i] % alphabet.length];
  return code;
}

export function serializeAgentDevice(
  d: IAgentDevice | Record<string, unknown>,
  opts?: { includeToken?: boolean }
) {
  const x = d as IAgentDevice & { _id: { toString(): string } };
  const base: Record<string, unknown> = {
    id: String(x._id),
    shopId: String(x.shopId),
    name: x.name,
    pairingCode: x.pairingCode || null,
    pairingExpiresAt: x.pairingExpiresAt || null,
    lastSeenAt: x.lastSeenAt || null,
    online: x.online,
    createdAt: x.createdAt,
    updatedAt: x.updatedAt,
  };
  if (opts?.includeToken) base.token = x.token;
  return base;
}

export const AgentDevice = mongoose.model<IAgentDevice>("AgentDevice", AgentDeviceSchema);
