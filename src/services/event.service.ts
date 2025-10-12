// src/services/event.service.ts
import Event, { IEvent } from "../models/Event";
import { Types } from "mongoose";
import type { AuthUser } from "../types/express";

type ListParams = {
  churchId?: string;
  type?: string;
  q?: string;
  tags?: string[];
  visibility?: "public" | "private" | "unlisted";
  from?: string; // ISO
  to?: string;   // ISO
  page?: number;
  limit?: number;
  sort?: "startDate" | "-startDate" | "createdAt" | "-createdAt";
  includeDeleted?: boolean;
};

const oid = (v: string | Types.ObjectId) => new Types.ObjectId(String(v));
const isSite = (a?: AuthUser) => a?.role === "siteAdmin";

export const EventService = {
  /** Create (optionally scope by actor.churchId if you want strictness for non-site roles) */
  async create(data: Partial<IEvent>, actor?: AuthUser) {
    const payload: any = { ...data };
    if (!payload.churchId) {
      if (actor?.churchId) payload.churchId = oid(actor.churchId);
      else throw new Error("churchId is required");
    } else {
      payload.churchId = oid(payload.churchId as any);
    }
    const doc = await Event.create(payload);
    return doc;
  },

  async update(id: string, data: Partial<IEvent>, actor?: AuthUser) {
    // Optionally restrict non-site users to their own church’s events
    const q: any = { _id: oid(id), isDeleted: { $ne: true } };
    if (!isSite(actor) && actor?.churchId) q.churchId = oid(actor.churchId);

    const sanitized: any = { ...data };
    if (sanitized.churchId) sanitized.churchId = oid(sanitized.churchId as any);

    const doc = await Event.findOneAndUpdate(q, sanitized, { new: true });
    return doc;
  },

  async softDelete(id: string, actor?: AuthUser) {
    const q: any = { _id: oid(id) };
    if (!isSite(actor) && actor?.churchId) q.churchId = oid(actor.churchId);
    await Event.findOneAndUpdate(q, { isDeleted: true });
    return { message: "Deleted" };
  },

  async getById(id: string, actor?: AuthUser) {
    const q: any = { _id: oid(id), isDeleted: { $ne: true } };
    if (!isSite(actor) && actor?.churchId) q.churchId = oid(actor.churchId);
    return Event.findOne(q);
  },

  async list(params: ListParams, actor?: AuthUser) {
    const {
      churchId, type, q, tags, visibility,
      from, to, page = 1, limit = 20, sort = "startDate",
      includeDeleted = false,
    } = params;

    const query: any = {};
    if (!includeDeleted) query.isDeleted = { $ne: true };

    // Scope: if caller is NOT siteAdmin, force to their churchId unless one is given and matches
    if (isSite(actor)) {
      if (churchId) query.churchId = oid(churchId);
    } else if (actor?.churchId) {
      query.churchId = oid(actor.churchId);
    } else if (churchId) {
      // for public callers (no actor), allow churchId filter when listing public below
      query.churchId = oid(churchId);
    }

    if (type) query.type = type;
    if (visibility) query.visibility = visibility;
    if (tags?.length) query.tags = { $all: tags };
    if (from || to) {
      query.startDate = {};
      if (from) query.startDate.$gte = new Date(from);
      if (to) query.startDate.$lte = new Date(to);
    }
    if (q) query.$text = { $search: q };

    const pageNum = Math.max(1, Number(page || 1));
    const limitNum = Math.min(100, Math.max(1, Number(limit || 20)));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Event.find(query).sort(sort).skip(skip).limit(limitNum).lean(),
      Event.countDocuments(query),
    ]);

    return {
      items,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    };
  },

  /** Public list (forces visibility public) */
  async listPublic(params: Omit<ListParams, "visibility" | "includeDeleted">) {
    return this.list({ ...params, visibility: "public", includeDeleted: false }, /*actor*/ undefined);
  },

  async getPublicById(id: string) {
    return Event.findOne({ _id: oid(id), isDeleted: { $ne: true }, visibility: "public" }).lean();
  },

  /** Atomic like using aggregation pipeline update (prevents negative/duplicate counts) */
  async like(eventId: string, userId: string) {
    const uid = oid(userId);
    const updateResult = await Event.updateOne(
      { _id: oid(eventId), isDeleted: { $ne: true }, likes: { $ne: uid } },
      [
        {
          $set: {
            likes: { $setUnion: ["$likes", [uid]] },
            likeCount: { $add: ["$likeCount", 1] },
          },
        },
      ] as any
    );
    // Return fresh doc
    return Event.findById(eventId).lean();
  },

  async unlike(eventId: string, userId: string) {
    const uid = oid(userId);
    await Event.updateOne(
      { _id: oid(eventId), isDeleted: { $ne: true }, likes: uid },
      [
        {
          $set: {
            likes: {
              $filter: { input: "$likes", as: "l", cond: { $ne: ["$$l", uid] } },
            },
            likeCount: { $max: [{ $add: ["$likeCount", -1] }, 0] },
          },
        },
      ] as any
    );
    return Event.findById(eventId).lean();
  },

  /** Comments */
  async addComment(eventId: string, userId: string, authorName: string | undefined, text: string) {
    const updated = await Event.findOneAndUpdate(
      { _id: oid(eventId), isDeleted: { $ne: true } },
      {
        $push: { comments: { author: oid(userId), authorName, text, createdAt: new Date() } },
        $inc: { commentCount: 1 },
      },
      { new: true }
    );
    return updated;
  },

  async updateComment(
    eventId: string,
    commentId: string,
    userId: string,
    text: string,
    opts?: { allowAny?: boolean }
  ) {
    const filter: any = {
      _id: oid(eventId),
      isDeleted: { $ne: true },
      "comments._id": oid(commentId),
    };
    if (!opts?.allowAny) {
      filter["comments.author"] = oid(userId);
    }

    return Event.findOneAndUpdate(
      filter,
      { $set: { "comments.$.text": text, "comments.$.updatedAt": new Date() } },
      { new: true }
    );
  },

  // (optional) separate helper if you prefer explicit admin path
  async updateCommentAny(eventId: string, commentId: string, text: string) {
    return Event.findOneAndUpdate(
      {
        _id: oid(eventId),
        isDeleted: { $ne: true },
        "comments._id": oid(commentId),
      },
      { $set: { "comments.$.text": text, "comments.$.updatedAt": new Date() } },
      { new: true }
    );
  },

  /** Author delete; to allow admins, handle in controller by choosing a different query without author match */
  async deleteComment(eventId: string, commentId: string, userId: string) {
    const updated = await Event.findOneAndUpdate(
      { _id: oid(eventId), isDeleted: { $ne: true } },
      {
        $pull: { comments: { _id: oid(commentId), author: oid(userId) } },
        $inc: { commentCount: -1 },
      },
      { new: true }
    );
    // keep count non-negative
    if (updated && updated.commentCount < 0) {
      await Event.updateOne({ _id: updated._id }, { $set: { commentCount: 0 } });
    }
    return updated;
  },
};
