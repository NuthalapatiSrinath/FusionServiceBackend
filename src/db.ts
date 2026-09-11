import mongoose from "mongoose";

export async function connectDB(uri: string): Promise<typeof mongoose> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB || "fusionservices",
  });
  return mongoose;
}

export function dbReadyState(): "disconnected" | "connected" | "connecting" | "disconnecting" {
  switch (mongoose.connection.readyState) {
    case 1:
      return "connected";
    case 2:
      return "connecting";
    case 3:
      return "disconnecting";
    default:
      return "disconnected";
  }
}
