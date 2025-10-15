import { Request, Response } from "express";
import demoService from "../services/demo.service";
import { publicDemoCreateSchema, adminUpdateSchema } from "../validation/demo.validation";
import { sendDemoNotification } from "../integrations/notify";

export const publicCreate = async (req: Request, res: Response) => {
  try {
    const body = publicDemoCreateSchema.parse(req.body);
    // optional: verify captcha here
    const meta = { ip: req.ip, ua: req.headers["user-agent"] };
    const doc = await demoService.createPublic(body as any, meta);
    // async notifications (don’t await to keep UX fast)
    sendDemoNotification?.(doc).catch(() => {});
    res.status(201).json(doc);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const adminList = async (req: Request, res: Response) => {
  const data = await demoService.list({
    q: req.query.q as string,
    status: req.query.status as string,
    ownerId: req.query.ownerId as string,
    from: req.query.from as string,
    to: req.query.to as string,
    page: Number(req.query.page),
    pageSize: Number(req.query.pageSize),
  });
  res.json(data);
};

export const adminGet = async (req: Request, res: Response) => {
  const doc = await demoService.get(req.params.id);
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json(doc);
};

export const adminUpdate = async (req: Request, res: Response) => {
  try {
    const patch = adminUpdateSchema.parse(req.body);
    const doc = await demoService.update(req.params.id, patch as any);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const adminDelete = async (req: Request, res: Response) => {
  await demoService.remove(req.params.id);
  res.json({ ok: true });
};
