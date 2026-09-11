import mongoose, { Schema, Document } from "mongoose";

export interface IAdminUser extends Document {
  username: string;
  passwordHash: string;
  role: "admin";
  createdAt: Date;
  updatedAt: Date;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin"], default: "admin" },
  },
  { timestamps: true }
);

export const AdminUser = mongoose.model<IAdminUser>("AdminUser", AdminUserSchema);
