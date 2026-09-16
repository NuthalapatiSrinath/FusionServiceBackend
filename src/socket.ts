import type { Server as HttpServer } from "http";
import { Server, type Socket } from "socket.io";

let io: Server | null = null;

export function initSocket(httpServer: HttpServer, corsOrigin: boolean | string[]) {
  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    socket.on("agent:join", (payload: { shopCode?: string; token?: string }) => {
      const code = String(payload?.shopCode || "").trim();
      if (!code) return;
      const room = `shop:${code}`;
      void socket.join(room);
      socket.data.shopCode = code;
      socket.data.role = "agent";
      socket.emit("agent:joined", { shopCode: code, room });
    });

    socket.on("shop:join", (payload: { shopCode?: string }) => {
      const code = String(payload?.shopCode || "").trim();
      if (!code) return;
      void socket.join(`shop:${code}`);
      socket.data.shopCode = code;
      socket.data.role = "shopkeeper";
      socket.emit("shop:joined", { shopCode: code, room: `shop:${code}` });
    });

    socket.on("admin:join", (payload: { shopCode?: string }) => {
      const code = String(payload?.shopCode || "all").trim();
      void socket.join(code === "all" ? "admin:all" : `shop:${code}`);
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}

export function emitPrintJob(shopCode: string, event: string, payload: unknown) {
  if (!io) return;
  const code = String(shopCode);
  io.to(`shop:${code}`).emit(event, payload);
  // also emit lowercase room for legacy agents
  if (code !== code.toLowerCase()) {
    io.to(`shop:${code.toLowerCase()}`).emit(event, payload);
  }
  io.to("admin:all").emit(event, payload);
}
