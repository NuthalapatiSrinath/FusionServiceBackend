import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    username: string;
    role: string;
    shopId?: string;
    userId?: string;
  };
}

function jwtSecret() {
  return process.env.JWT_SECRET || "fusion-print-local-dev-secret-change-me";
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const payload = jwt.verify(header.slice(7), jwtSecret()) as {
      username: string;
      role: string;
      shopId?: string;
      userId?: string;
    };
    if (payload.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireShopkeeper(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const payload = jwt.verify(header.slice(7), jwtSecret()) as {
      username: string;
      role: string;
      shopId?: string;
      userId?: string;
    };
    if (payload.role !== "shopkeeper" || !payload.shopId) {
      return res.status(403).json({ error: "Forbidden — shopkeeper login required" });
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdminOrShopkeeper(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const payload = jwt.verify(header.slice(7), jwtSecret()) as {
      username: string;
      role: string;
      shopId?: string;
      userId?: string;
    };
    if (payload.role !== "admin" && payload.role !== "shopkeeper") {
      return res.status(403).json({ error: "Forbidden" });
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export { jwtSecret };
