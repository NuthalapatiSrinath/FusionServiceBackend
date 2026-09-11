import mongoose, { Schema, Document } from "mongoose";

export interface IDesignUpload extends Document {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  createdAt: Date;
}

const DesignUploadSchema = new Schema<IDesignUpload>(
  {
    filename: { type: String, required: true, unique: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
    url: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const DesignUpload = mongoose.model<IDesignUpload>("DesignUpload", DesignUploadSchema);
