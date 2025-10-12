// src/realtime/socket.ts
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import type { IncomingMessage } from "http";

type JwtPayload = {
  _id: string;
  role: string;
  churchId?: string;
  districtId?: string;
  nationalId?: string;
};

export let io: Server;

export function initSocket(httpServer: any) {
  io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL, credentials: true },
  });

  // handshake auth via query ?token=...
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || (socket.handshake as any).query?.token;
      if (!token) return next(new Error("No token"));
      const decoded = jwt.verify(String(token), process.env.JWT_SECRET!) as JwtPayload;
      (socket as any).user = decoded;
      next();
    } catch (e) { next(new Error("Bad token")); }
  });

  io.on("connection", (socket) => {
    const u = (socket as any).user as JwtPayload;

    // join personal + org rooms
    socket.join(`user:${u._id}`);
    if (u.churchId)  socket.join(`church:${u.churchId}`);
    if (u.districtId)socket.join(`district:${u.districtId}`);
    if (u.nationalId)socket.join(`national:${u.nationalId}`);

    socket.emit("connected", { ok: true });
  });

  return io;
}
