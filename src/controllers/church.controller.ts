import { Request, Response } from "express";
import * as ChurchService from "../services/church.service";

/** Create church (scope-aware) */
export const create = async (req: any, res: Response) => {
  try {
    const record = await ChurchService.createChurch(req.body, req.user);
    res.status(201).json(record);
  } catch (err: any) {
    const status = /forbidden|unauthorized/i.test(err.message) ? 403 : 400;
    res.status(status).json({ message: err.message });
  }
};

/** List churches (scope-aware, supports paging/filter via req.query) */
export const list = async (req: any, res: Response) => {
  const result = await ChurchService.getChurches(req.query, req.user);
  res.json(result);
};

/** Get one (404 if not found or out-of-scope) */
export const get = async (req: any, res: Response) => {
  const doc = await ChurchService.getChurchById(req.params.id, req.user);
  if (!doc) return res.status(404).json({ message: "Church not found" });
  res.json(doc);
};

/** Update church (scope-aware) */
export const update = async (req: any, res: Response) => {
  try {
    const doc = await ChurchService.updateChurch(req.params.id, req.body, req.user);
    if (!doc) return res.status(404).json({ message: "Church not found" });
    res.json(doc);
  } catch (err: any) {
    const status = /forbidden|unauthorized/i.test(err.message) ? 403 : 400;
    res.status(status).json({ message: err.message });
  }
};

/** Delete church (scope-aware) */
export const remove = async (req: any, res: Response) => {
  try {
    const deleted = await ChurchService.deleteChurch(req.params.id, req.user);
    if (!deleted) return res.status(404).json({ message: "Church not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err: any) {
    const status = /forbidden|unauthorized/i.test(err.message) ? 403 : 400;
    res.status(status).json({ message: err.message });
  }
};

/** By district (scope-aware) */
export const getByDistrict = async (req: any, res: Response) => {
  const districtId = req.params.districtId;
  const churches = await ChurchService.getChurchesByDistrict(districtId, req.user);
  res.json(churches);
};

/** By national church (scope-aware) */
export const getByNationalChurch = async (req: any, res: Response) => {
  const nationalChurchId = req.params.nationalChurchId;
  const churches = await ChurchService.getChurchesByNationalChurch(nationalChurchId, req.user);
  res.json(churches);
};
