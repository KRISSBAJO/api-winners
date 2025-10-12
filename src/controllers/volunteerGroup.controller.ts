import { Request, Response } from "express";
import type { AuthUser } from "../types/express";
import * as Svc from "../services/volunteerGroup.service";

export const list = async (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser | undefined;
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  const r = await Svc.list(user);
  res.json(r);
};

export const listByChurch = async (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser | undefined;
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  const r = await Svc.listByChurch(req.params.churchId, user);
  res.json(r);
};

export const get = async (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser | undefined;
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  const r = await Svc.get(req.params.id, user);
  if (!r) return res.status(404).json({ message: "Not found" });
  res.json(r);
};

export const create = async (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser | undefined;
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await Svc.create(req.body, user);
    res.status(201).json(r);
  } catch (e: any) {
    const code = /forbidden|unauthorized/i.test(e.message) ? 403 : 400;
    res.status(code).json({ message: e.message });
  }
};

export const update = async (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser | undefined;
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await Svc.update(req.params.id, req.body, user);
    res.json(r);
  } catch (e: any) {
    const code = /not found/i.test(e.message)
      ? 404
      : /forbidden|unauthorized/i.test(e.message)
      ? 403
      : 400;
    res.status(code).json({ message: e.message });
  }
};

export const remove = async (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser | undefined;
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    await Svc.remove(req.params.id, user);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    const code = /not found/i.test(e.message)
      ? 404
      : /forbidden|unauthorized/i.test(e.message)
      ? 403
      : 400;
    res.status(code).json({ message: e.message });
  }
};

export const addMember = async (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser | undefined;
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await Svc.addMember(req.params.id, req.body.memberId, user);
    res.json(r);
  } catch (e: any) {
    const code = /not found/i.test(e.message)
      ? 404
      : /forbidden|unauthorized/i.test(e.message)
      ? 403
      : 400;
    res.status(code).json({ message: e.message });
  }
};

export const removeMember = async (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser | undefined;
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await Svc.removeMember(req.params.id, req.params.memberId, user);
    res.json(r);
  } catch (e: any) {
    const code = /not found/i.test(e.message)
      ? 404
      : /forbidden|unauthorized/i.test(e.message)
      ? 403
      : 400;
    res.status(code).json({ message: e.message });
  }
};

export const assignLeader = async (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser | undefined;
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  try {
    const r = await Svc.assignLeader(req.params.id, req.body.leaderId, user);
    res.json(r);
  } catch (e: any) {
    const code = /not found/i.test(e.message)
      ? 404
      : /forbidden|unauthorized/i.test(e.message)
      ? 403
      : 400;
    res.status(code).json({ message: e.message });
  }
};
