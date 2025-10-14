// src/controllers/followup.controller.ts
import { Request, Response } from "express";
import followupService from "../services/followup.service";
import type { AuthUser } from "../types/express";

const handle = (fn: Function) => async (req: Request, res: Response) => {
  try {
    const data = await fn(req, res);
    if (!res.headersSent) res.json(data);
  } catch (e: any) {
    const code =
      e?.statusCode || (/forbidden/i.test(e?.message) ? 403 : /unauth/i.test(e?.message) ? 401 : 400);
    res.status(code).json({ message: e?.message || "Request failed" });
  }
};

export const listCases = handle(async (req: Request) =>
  followupService.listCases(req.query as any, req.user as AuthUser)
);

export const getCase = handle(async (req: Request) =>
  followupService.getCase(req.params.id, req.user as AuthUser)
);

export const openCase = handle(async (req: Request) =>
  followupService.openCase(req.body, req.user as AuthUser)
);

export const updateCase = handle(async (req: Request) =>
  followupService.updateCase(req.params.id, req.body, req.user as AuthUser)
);

export const assignCase = handle(async (req: Request) =>
  followupService.assignCase(req.params.id, req.body.assignedTo ?? null, req.user as AuthUser)
);

export const pauseCase = handle(async (req: Request) =>
  followupService.pauseCase(req.params.id, req.body.note, req.user as AuthUser)
);

export const resumeCase = handle(async (req: Request) =>
  followupService.resumeCase(req.params.id, req.user as AuthUser)
);

export const resolveCase = handle(async (req: Request) =>
  followupService.resolveCase(req.params.id, req.body.note, req.user as AuthUser)
);

export const archiveCase = handle(async (req: Request) =>
  followupService.archiveCase(req.params.id, req.user as AuthUser)
);

export const addTag = handle(async (req: Request) =>
  followupService.addTag(req.params.id, req.body.tag, req.user as AuthUser)
);

export const removeTag = handle(async (req: Request) =>
  followupService.removeTag(req.params.id, req.body.tag, req.user as AuthUser)
);

export const updateConsent = handle(async (req: Request) =>
  followupService.updateConsent(req.params.id, req.body, req.user as AuthUser)
);

export const setCadence = handle(async (req: Request) =>
  followupService.setCadence(req.params.id, req.body.cadenceId ?? null, req.user as AuthUser)
);

export const advanceCadence = handle(async (req: Request) =>
  followupService.advanceCadence(req.params.id, req.user as AuthUser)
);

export const listAttempts = handle(async (req: Request) =>
  followupService.listAttempts(req.params.id, req.user as AuthUser)
);

export const logAttempt = handle(async (req: Request) =>
  followupService.logAttempt(
    req.params.id,
    {
      channel: req.body.channel,
      outcome: req.body.outcome,
      content: req.body.content,
      nextActionOn: req.body.nextActionOn,
    },
    req.user as AuthUser
  )
);

export const stats = handle(async (req: Request) =>
  followupService.stats(req.user as AuthUser)
);

export const listCadences = handle(async (_req: Request) =>
  followupService.listCadences(_req.user as AuthUser)
);
