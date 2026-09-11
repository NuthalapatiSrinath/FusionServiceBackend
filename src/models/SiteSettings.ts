import mongoose, { Schema, Document } from "mongoose";

export interface ISiteSettings extends Document {
  key: string;
  heroTagline: string;
  heroHeadline: string;
  heroSubline: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  featuredProductIds: string[];
}

const SiteSettingsSchema = new Schema<ISiteSettings>(
  {
    key: { type: String, default: "default", unique: true },
    heroTagline: { type: String, default: "Your One-Stop Print & Digital Hub" },
    heroHeadline: { type: String, default: "FUSION" },
    heroSubline: {
      type: String,
      default: "Print. Design. Deliver. Custom apparel, QR print, and digital services in Macherla.",
    },
    phone: { type: String, default: "9494197969" },
    whatsapp: { type: String, default: "917995572200" },
    email: { type: String, default: "fusionprintservices@gmail.com" },
    address: {
      type: String,
      default: "Village: Macherla, Mandal: Armoor, District: Nizamabad, Pincode: 503224",
    },
    featuredProductIds: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const SiteSettings = mongoose.model<ISiteSettings>("SiteSettings", SiteSettingsSchema);
