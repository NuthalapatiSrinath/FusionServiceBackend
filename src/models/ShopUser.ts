import mongoose, { Schema, Document, Types } from "mongoose";

export interface IShopUser extends Document {
  shopId: Types.ObjectId;
  username: string;
  passwordHash: string;
  role: "shopkeeper";
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ShopUserSchema = new Schema<IShopUser>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["shopkeeper"], default: "shopkeeper" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export function serializeShopUser(user: IShopUser | Record<string, unknown>) {
  const u = user as IShopUser & { _id: { toString(): string } };
  return {
    id: String(u._id),
    shopId: String(u.shopId),
    username: u.username,
    role: u.role,
    active: u.active,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export const ShopUser = mongoose.model<IShopUser>("ShopUser", ShopUserSchema);
