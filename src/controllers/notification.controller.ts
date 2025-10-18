// src/controllers/notification.controller.ts
import { Request, Response } from "express";
import Notification from "../models/Notification";
import { Types } from "mongoose";

export async function list(req: Request, res: Response) {
  const userId = new Types.ObjectId((req as any).user._id);
  const { page = 1, limit = 20 } = req.query as any;

  // notifications addressed to this user directly OR via their org rooms
  const { churchId, districtId, nationalId } = (req as any).user;
  const q = {
    $or: [
      { scope: "user", scopeRef: userId },
      ...(churchId ? [{ scope: "church",   scopeRef: new Types.ObjectId(churchId) }]   : []),
      ...(districtId ? [{ scope: "district", scopeRef: new Types.ObjectId(districtId) }] : []),
      ...(nationalId ? [{ scope: "national", scopeRef: new Types.ObjectId(nationalId) }] : []),
      { recipients: userId },
    ],
  };

  const skip = (Number(page) - 1) * Number(limit);

  const [docs, total] = await Promise.all([
    Notification.find(q).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    Notification.countDocuments(q),
  ]);

  // shape items with isRead flag
  const items = docs.map((d: any) => ({
    ...d,
    _id: String(d._id),
    actorId: d.actorId ? String(d.actorId) : undefined,
    scopeRef: d.scopeRef ? String(d.scopeRef) : undefined,
    recipients: (d.recipients ?? []).map((r: any) => String(r)),
    readBy: undefined, // hide raw readBy array from client (optional)
    isRead: (d.readBy ?? []).some((x: any) => String(x) === String(userId)),
  }));

  res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}

export async function unreadCount(req: Request, res: Response) {
  const userId = new Types.ObjectId((req as any).user._id);
  const { churchId, districtId, nationalId } = (req as any).user;
  const q = {
    $or: [
      { scope: "user", scopeRef: userId },
      ...(churchId ? [{ scope: "church",   scopeRef: new Types.ObjectId(churchId) }]   : []),
      ...(districtId ? [{ scope: "district", scopeRef: new Types.ObjectId(districtId) }] : []),
      ...(nationalId ? [{ scope: "national", scopeRef: new Types.ObjectId(nationalId) }] : []),
      { recipients: userId },
    ],
    readBy: { $ne: userId },
  };
  const count = await Notification.countDocuments(q);
  res.json({ count });
}

export async function markRead(req: Request, res: Response) {
  const userId = new Types.ObjectId((req as any).user._id);
  const { id } = req.params;
  await Notification.updateOne({ _id: id }, { $addToSet: { readBy: userId } });
  res.json({ ok: true });
}

export async function markAllRead(req: Request, res: Response) {
  const userId = new Types.ObjectId((req as any).user._id);
  const { churchId, districtId, nationalId } = (req as any).user;
  const q = {
    $or: [
      { scope: "user", scopeRef: userId },
      ...(churchId ? [{ scope: "church",   scopeRef: new Types.ObjectId(churchId) }]   : []),
      ...(districtId ? [{ scope: "district", scopeRef: new Types.ObjectId(districtId) }] : []),
      ...(nationalId ? [{ scope: "national", scopeRef: new Types.ObjectId(nationalId) }] : []),
      { recipients: userId },
    ],
  };
  await Notification.updateMany(q, { $addToSet: { readBy: userId } });
  res.json({ ok: true });
}
