import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import http from "http";
import { connectDB, dbReadyState } from "./db";
import { seedDatabase } from "./data/seed";
import { initSocket } from "./socket";
import authRoutes from "./routes/auth";
import productRoutes from "./routes/products";
import inquiryRoutes from "./routes/inquiries";
import uploadRoutes from "./routes/uploads";
import shopRoutes from "./routes/shops";
import printJobRoutes from "./routes/printJobs";
import shopDashboardRoutes from "./routes/shopDashboard";
import adminRoutes from "./routes/admin";
import orderRoutes from "./routes/orders";

const app = express();
const PORT = Number(process.env.PORT) || 5000;
/** Reflect any Origin (open CORS). cors package handles OPTIONS preflight. */
const corsOrigin: boolean | string[] = true;
const uploadDir = path.resolve(process.env.UPLOAD_DIR || "uploads");
const mongoUri = process.env.MONGODB_URI;

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(uploadDir));

app.get("/api/health", (_req, res) => {
  const db = dbReadyState();
  res.json({
    status: db === "connected" ? "ok" : "degraded",
    service: "Fusion Print & Services API",
    time: new Date().toISOString(),
    database: {
      status: db,
      name: process.env.MONGODB_DB || "fusionservices",
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/print-jobs", printJobRoutes);
app.use("/api/shop", shopDashboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/orders", orderRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Server error" });
});

async function start() {
  if (!mongoUri) {
    console.error("Missing MONGODB_URI in environment. Copy .env.example to .env and set it.");
    process.exit(1);
  }

  try {
    await connectDB(mongoUri);
    console.log(`MongoDB connected (db: ${process.env.MONGODB_DB || "fusionservices"})`);
    await seedDatabase();
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }

  const server = http.createServer(app);
  initSocket(server, corsOrigin);

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Fusion Print API running on http://0.0.0.0:${PORT}`);
    console.log(
      `Socket.IO enabled | CORS: ${corsOrigin === true ? "reflect any origin" : corsOrigin.join(",")}`
    );
  });
}

void start();
