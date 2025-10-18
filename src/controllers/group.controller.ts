import { Request, Response } from "express";
import groupService from "../services/group.service";
import type { AuthUser } from "../types/express";

const handle = (fn: Function) => async (req: Request, res: Response) => {
  try {
    const data = await fn(req, res);
    if (!res.headersSent) res.json(data);
  } catch (e: any) {
    const code = e?.statusCode || (/forbidden/i.test(e?.message) ? 403 : /unauth/i.test(e?.message) ? 401 : 400);
    res.status(code).json({ message: e?.message || "Request failed" });
  }
};

/* Public directory */
export const listPublic = handle((req: Request) => groupService.listPublic(req.query as any));

/* Auth endpoints */
export const listGroups = handle((req: Request) => groupService.list(req.query as any, req.user as AuthUser));
export const getGroup   = handle((req: Request) => groupService.get(req.params.id, req.user as AuthUser));
export async function createGroup(req: Request, res: Response) {
  try {
    const actor = req.user as any;
    const filePath = (req as any).file?.path as string | undefined; // multer
    const data = await groupService.create(req.body, actor, filePath);
    res.json(data);
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ message: e.message });
  }
}

export async function updateGroup(req: Request, res: Response) {
  try {
    const actor = req.user as any;
    const filePath = (req as any).file?.path as string | undefined;
    const data = await groupService.update(req.params.id, req.body, actor, filePath);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ message: e.message });
  }
}
export const deleteGroup= handle((req: Request) => groupService.remove(req.params.id, req.user as AuthUser));

/* Occurrences */
export const listOccurrences   = handle((req: Request) => groupService.listOccurrences(req.params.id, req.query as any, req.user as AuthUser));
export const createOccurrence  = handle((req: Request) => groupService.createOccurrence(req.params.id, req.body, req.user as AuthUser));
export const updateOccurrence  = handle((req: Request) => groupService.updateOccurrence(req.params.occurrenceId, req.body, req.user as AuthUser));
export const deleteOccurrence  = handle((req: Request) => groupService.deleteOccurrence(req.params.occurrenceId, req.user as AuthUser));

/* Join Requests */
export const requestJoin   = handle((req: Request) => groupService.requestJoin(req.params.id, req.body));
export const listRequests  = handle((req: Request) => groupService.listJoinRequests(req.params.id, req.user as AuthUser));
export const handleRequest = handle((req: Request) => groupService.handleJoinRequest(req.params.requestId, req.body.action, req.user as AuthUser));
export const rejectRequest = handle((req: Request) => groupService.rejectJoinRequest(req.params.requestId, req.user as AuthUser));


export const nextOccurrence = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const data = await groupService.getNextOccurrenceForGroup(id);
  // Always 200; frontend expects null if none
  res.json(data ?? null);
};

export const nextOccurrenceBatch = async (req: Request, res: Response) => {
  const ids = String(req.query.ids || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) return res.json({});
  const map = await groupService.getNextOccurrencesForGroups(ids);
  res.json(map);
};