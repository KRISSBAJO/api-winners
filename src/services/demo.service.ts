import DemoRequest from "../models/DemoRequest";
import type { IDemoRequest } from "../models/DemoRequest";
import { Types } from "mongoose";

export class DemoService {
  async createPublic(payload: Partial<IDemoRequest>, meta?: any) {
    const doc = await DemoRequest.create({
      ...payload,
      source: payload.source || "public_web",
      meta,
      status: "new",
    });
    return doc;
  }

  async list(params: {
    q?: string;
    status?: string;
    ownerId?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }) {
    const q: any = {};
    if (params.status) q.status = params.status;
    if (params.ownerId && Types.ObjectId.isValid(params.ownerId)) q.ownerId = new Types.ObjectId(params.ownerId);
    if (params.from || params.to) {
      q.createdAt = {};
      if (params.from) q.createdAt.$gte = new Date(params.from);
      if (params.to) q.createdAt.$lte = new Date(params.to);
    }

    const filter = DemoRequest.find(q);

    if (params.q) {
      const regex = new RegExp(params.q, "i");
      filter.find({ $or: [{ fullName: regex }, { email: regex }, { church: regex }] });
    }

    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
    const [items, total] = await Promise.all([
      filter.sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      DemoRequest.countDocuments(filter.getFilter()),
    ]);

    return { items, total, page, pageSize };
  }

  async get(id: string) {
    return DemoRequest.findById(id);
  }

  async update(id: string, patch: Partial<IDemoRequest>) {
    return DemoRequest.findByIdAndUpdate(id, patch, { new: true });
  }

  async remove(id: string) {
    await DemoRequest.findByIdAndDelete(id);
    return true;
  }
}

export default new DemoService();
