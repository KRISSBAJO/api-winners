import { Request, Response } from "express";
import * as Svc from "../services/pastor.service";

export const create = async (req: Request, res: Response) => {
  try {
    const doc = await Svc.createPastor(req.body, req.user);
    res.status(201).json(doc);
  } catch (e: any) {
    res.status(/forbidden/i.test(e.message) ? 403 : 400).json({ message: e.message });
  }
};

export const list = async (req: Request, res: Response) => {
  const r = await Svc.listPastors(req.query, req.user);
  res.json(r);
};

export const get = async (req: Request, res: Response) => {
  const doc = await Svc.getPastorById(req.params.id, req.user);
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json(doc);
};

export const update = async (req: Request, res: Response) => {
  try {
    const doc = await Svc.updatePastor(req.params.id, req.body, req.user);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e: any) {
    res.status(/forbidden/i.test(e.message) ? 403 : 400).json({ message: e.message });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const ok = await Svc.softDeletePastor(req.params.id, req.user);
    if (!ok) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(/forbidden/i.test(e.message) ? 403 : 400).json({ message: e.message });
  }
};

/** History / assignment APIs */
export const getAssignments = async (req: Request, res: Response) => {
  try {
    const rows = await Svc.listAssignments(req.params.id, req.user);
    res.json(rows);
  } catch (e: any) {
    res.status(/forbidden|not found/i.test(e.message) ? 404 : 400).json({ message: e.message });
  }
};

export const assign = async (req: Request, res: Response) => {
  try {
    const doc = await Svc.assign(req.params.id, req.body, req.user);
    res.json(doc);
  } catch (e: any) {
    res.status(/forbidden/i.test(e.message) ? 403 : 400).json({ message: e.message });
  }
};

export const endAssignment = async (req: Request, res: Response) => {
  try {
    const row = await Svc.endAssignment(req.params.id, req.params.assignmentId, req.user);
    res.json(row);
  } catch (e: any) {
    res.status(/forbidden/i.test(e.message) ? 403 : 400).json({ message: e.message });
  }
};
