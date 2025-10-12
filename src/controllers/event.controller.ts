import { Request, Response } from "express";
import { EventService } from "../services/event.service";
import { uploadImage, deleteImage } from "../config/cloudinary";
import type { AuthUser } from "../types/express";
import fs from "fs";
import Event from "../models/Event";

// --- helpers (roles/scope) ---
const isSiteAdmin = (u?: AuthUser) => u?.role === "siteAdmin";
const isChurchAdmin = (u?: AuthUser) => u?.role === "churchAdmin";
const canManage = (u?: AuthUser) => isSiteAdmin(u) || isChurchAdmin(u);

// --- helpers (body/cleanup) ---
function normalizeBody(body: any) {
  const patch: any = { ...body };

  // tags: accept CSV or JSON array string
  if (typeof patch.tags === "string") {
    try {
      const maybe = JSON.parse(patch.tags);
      patch.tags = Array.isArray(maybe) ? maybe : [String(patch.tags)];
    } catch {
      patch.tags = String(patch.tags)
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
  }

  if (patch.startDate) patch.startDate = new Date(patch.startDate);
  if (patch.endDate) patch.endDate = new Date(patch.endDate);
  return patch;
}

const cleanupTemp = (filePath?: string) => {
  if (filePath) fs.unlink(filePath, () => {});
};

/* ----------------------------- CRUD ---------------------------------- */

export const create = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user as AuthUser | undefined;
    if (!actor) return res.status(401).json({ message: "Unauthorized" });
    if (!canManage(actor)) return res.status(403).json({ message: "Forbidden" });

    const body = normalizeBody(req.body);
    let cover: { url: string; publicId: string } | undefined;

    if ((req as any).file) {
      const up = await uploadImage((req as any).file.path, "dominion_connect/events");
      cover = { url: up.url, publicId: up.publicId };
      cleanupTemp((req as any).file.path);
    }

    const doc = await EventService.create({ ...body, cover }, actor);
    return res.status(201).json(doc);
  } catch (e: any) {
    if ((req as any).file?.path) cleanupTemp((req as any).file.path);
    const code = /forbidden|unauthorized/i.test(e.message) ? 403 : 400;
    return res.status(code).json({ message: e.message });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user as AuthUser | undefined;
    if (!actor) return res.status(401).json({ message: "Unauthorized" });
    if (!canManage(actor)) return res.status(403).json({ message: "Forbidden" });

    const body = normalizeBody(req.body);
    const patch: any = { ...body };

    if ((req as any).file) {
      const existing = await EventService.getById(req.params.id, actor);
      if (!existing) return res.status(404).json({ message: "Not found" });

      if (existing.cover?.publicId) {
        try {
          await deleteImage(existing.cover.publicId);
        } catch {
          // ignore cloudinary delete failure
        }
      }
      const up = await uploadImage((req as any).file.path, "dominion_connect/events");
      patch.cover = { url: up.url, publicId: up.publicId };
      cleanupTemp((req as any).file.path);
    }

    const doc = await EventService.update(req.params.id, patch, actor);
    if (!doc) return res.status(404).json({ message: "Not found" });
    return res.json(doc);
  } catch (e: any) {
    if ((req as any).file?.path) cleanupTemp((req as any).file.path);
    const code =
      /not found/i.test(e.message) ? 404 :
      /forbidden|unauthorized/i.test(e.message) ? 403 : 400;
    return res.status(code).json({ message: e.message });
  }
};

export const softDelete = async (req: Request, res: Response) => {
  const actor = (req as any).user as AuthUser | undefined;
  if (!actor) return res.status(401).json({ message: "Unauthorized" });
  if (!canManage(actor)) return res.status(403).json({ message: "Forbidden" });

  const ok = await EventService.softDelete(req.params.id, actor);
  if (!ok) return res.status(404).json({ message: "Not found" });
  return res.json({ message: "Deleted" });
};

export const remove = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user as AuthUser | undefined;
    if (!actor) return res.status(401).json({ message: "Unauthorized" });
    if (!canManage(actor)) return res.status(403).json({ message: "Forbidden" });

    const event = await EventService.getById(req.params.id, actor);
    if (!event) return res.status(404).json({ message: "Not found" });

    // If you truly want hard delete + cloud cleanup, do it here
    if (event.cover?.publicId) {
      try {
        await deleteImage(event.cover.publicId);
      } catch {
        // ignore cloudinary delete failure
      }
    }

    await EventService.softDelete(req.params.id, actor);
    return res.json({ message: "Deleted" });
  } catch (err: any) {
    const code =
      /not found/i.test(err.message) ? 404 :
      /forbidden|unauthorized/i.test(err.message) ? 403 : 400;
    return res.status(code).json({ message: err.message });
  }
};

/* ---------------------------- Reads ---------------------------------- */

export const list = async (req: Request, res: Response) => {
  const actor = (req as any).user as AuthUser | undefined;

  const data = await EventService.list(
    {
      churchId: req.query.churchId as string,
      type: req.query.type as string,
      q: req.query.q as string,
      tags:
        typeof req.query.tags === "string"
          ? (req.query.tags as string).split(",").map((t) => t.trim()).filter(Boolean)
          : undefined,
      from: req.query.from as string,
      to: req.query.to as string,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      sort: req.query.sort as any,
      includeDeleted: req.query.includeDeleted === "true",
      visibility: req.query.visibility as any,
    },
    actor
  );
  return res.json(data);
};

export const get = async (req: Request, res: Response) => {
  const actor = (req as any).user as AuthUser | undefined;
  const doc = await EventService.getById(req.params.id, actor);
  if (!doc) return res.status(404).json({ message: "Not found" });
  return res.json(doc);
};

// Public
export const listPublic = async (req: Request, res: Response) => {
  const data = await EventService.listPublic({
    churchId: req.query.churchId as string,
    type: req.query.type as string,
    q: req.query.q as string,
    tags:
      typeof req.query.tags === "string"
        ? (req.query.tags as string).split(",").map((t) => t.trim()).filter(Boolean)
        : undefined,
    from: req.query.from as string,
    to: req.query.to as string,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    sort: req.query.sort as any,
  });
  return res.json(data);
};

export const getPublic = async (req: Request, res: Response) => {
  const doc = await EventService.getPublicById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Not found" });
  return res.json(doc);
};

/* ------------------------- Likes & Comments --------------------------- */

export const like = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user as AuthUser | undefined;
  if (!user?.id) return res.status(401).json({ message: "Unauthorized" });

  const updated = await EventService.like(id, user.id);
  if (!updated) return res.status(404).json({ message: "Not found" });
  return res.json(updated);
};

export const unlike = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user as AuthUser | undefined;
  if (!user?.id) return res.status(401).json({ message: "Unauthorized" });

  const updated = await EventService.unlike(id, user.id);
  if (!updated) return res.status(404).json({ message: "Not found" });
  return res.json(updated);
};

export const addComment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user as AuthUser | undefined;
  if (!user?.id) return res.status(401).json({ message: "Unauthorized" });

  const text = (req.body?.text || "").trim();
  if (!text) return res.status(400).json({ message: "Text required" });

  const authorName = (user as any)?.name as string | undefined;
  const updated = await EventService.addComment(id, user.id, authorName, text);
  if (!updated) return res.status(404).json({ message: "Not found" });
  return res.json(updated);
};

export const updateComment = async (req: Request, res: Response) => {
  const { id, commentId } = req.params;
  const user = (req as any).user as AuthUser | undefined;
  if (!user?.id) return res.status(401).json({ message: "Unauthorized" });

  const text = (req.body?.text || "").trim();
  if (!text) return res.status(400).json({ message: "Text required" });

  const updated = await EventService.updateComment(id, commentId, user.id, text);
  if (!updated) return res.status(404).json({ message: "Not found or not owner" });
  return res.json(updated);
};

export const deleteComment = async (req: Request, res: Response) => {
  const { id, commentId } = req.params;
  const user = (req as any).user as AuthUser | undefined;
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  // Admins can delete any comment directly
  if (isSiteAdmin(user) || isChurchAdmin(user)) {
    const updated = await Event.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $pull: { comments: { _id: commentId } }, $inc: { commentCount: -1 } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Event or comment not found" });
    if ((updated as any).commentCount < 0) {
      await Event.updateOne({ _id: updated._id }, { $set: { commentCount: 0 } });
    }
    return res.json(updated);
  }

  // Authors can delete their own
  const updated = await EventService.deleteComment(id, commentId, user.id);
  if (!updated) return res.status(404).json({ message: "Not found or not owner" });
  return res.json(updated);
};
