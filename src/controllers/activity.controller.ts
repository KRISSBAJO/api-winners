// src/controllers/activity.controller.ts
import { Request, Response } from "express";
import Activity from "../models/Activity";
import { Types } from "mongoose";

export async function list(req: Request, res: Response) {
  const { churchId, districtId, nationalId } = (req as any).user;
  const { page = 1, limit = 30 } = req.query as any;

  const q: any = {
    $or: [
      ...(churchId ? [{ churchId: new Types.ObjectId(churchId) }] : []),
      ...(districtId ? [{ districtId: new Types.ObjectId(districtId) }] : []),
      ...(nationalId ? [{ nationalId: new Types.ObjectId(nationalId) }] : []),
    ],
  };

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Activity.find(q).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Activity.countDocuments(q),
  ]);

  res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}
