import { Request, Response } from "express";
import * as NationalService from "../services/nationalChurch.service";
import { canAccessNational } from "../utils/acl";
import type { AuthUser } from "../types/express";

export const create = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthUser | undefined;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== "siteAdmin") {
      return res
        .status(403)
        .json({ message: "Only siteAdmin can create national churches" });
    }
    const church = await NationalService.createNationalChurch(req.body); // ← 1 arg
    res.status(201).json(church);
  } catch (err: any) {
    const code = /forbidden|unauthorized/i.test(err.message) ? 403 : 400;
    res.status(code).json({ message: err.message });
  }
};

export const list = async (_: Request, res: Response) => {
  const list = await NationalService.getNationalChurches();
  res.json(list);
};

export const get = async (req: Request, res: Response) => {
  const record = await NationalService.getNationalChurchById(req.params.id);
  if (!record) return res.status(404).json({ message: "Not found" });
  res.json(record);
};

export const update = async (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser | undefined;
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  if (user.role !== "siteAdmin") {
    return res.status(403).json({ message: "Only siteAdmin can update" });
  }
  const record = await NationalService.updateNationalChurch(
    req.params.id,
    req.body // ← 2 args total (id, body) as before
  );
  res.json(record);
};

export const remove = async (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser | undefined;
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  if (user.role !== "siteAdmin") {
    return res.status(403).json({ message: "Only siteAdmin can delete" });
  }
  await NationalService.deleteNationalChurch(req.params.id); // ← 1 arg
  res.json({ message: "Deleted successfully" });
};

// NEW: districts under a national
export const districts = async (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser | undefined;
  const { id } = req.params;
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  if (!canAccessNational(user, id)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  const rows = await NationalService.listDistrictsByNational(id); // ← 1 arg
  res.json(rows);
};

// NEW: churches under a national
export const churches = async (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser | undefined;
  const { id } = req.params;
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  if (!canAccessNational(user, id)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  const rows = await NationalService.listChurchesByNational(id); // ← 1 arg
  res.json(rows);
};

export const overview = async (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser | undefined;
  const { id } = req.params;
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  if (!canAccessNational(user, id)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  const data = await NationalService.nationalOverview(id); // ← 1 arg
  res.json(data);
};
