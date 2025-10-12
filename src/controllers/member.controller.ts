import { Request, Response } from "express";
import memberService from "../services/member.service";
import type { AuthUser } from "../types/express";

export const createMember = async (req: Request, res: Response) => {
  try {
    const member = await memberService.createMember(req.body, req.user as AuthUser | undefined);
    res.status(201).json(member);
  } catch (e: any) {
    res.status(/forbidden/i.test(e.message) ? 403 : 400).json({ message: e.message });
  }
};

export const getMembers = async (req: Request, res: Response) => {
  const members = await memberService.getMembers(req.query, req.user as AuthUser | undefined);
  res.json(members);
};

export const getMemberById = async (req: Request, res: Response) => {
  const member = await memberService.getMemberById(req.params.id, req.user as AuthUser | undefined);
  if (!member) return res.status(404).json({ message: "Member not found" });
  res.json(member);
};

export const updateMember = async (req: Request, res: Response) => {
  try {
    const updated = await memberService.updateMember(req.params.id, req.body, req.user as AuthUser | undefined);
    if (!updated) return res.status(404).json({ message: "Member not found" });
    res.json(updated);
  } catch (e: any) {
    res.status(/forbidden/i.test(e.message) ? 403 : 400).json({ message: e.message });
  }
};

export const deleteMember = async (req: Request, res: Response) => {
  try {
    const deleted = await memberService.deleteMember(req.params.id, req.user as AuthUser | undefined);
    if (!deleted) return res.status(404).json({ message: "Member not found" });
    res.json({ message: "Member deleted successfully" });
  } catch (e: any) {
    res.status(/forbidden/i.test(e.message) ? 403 : 400).json({ message: e.message });
  }
};

export const getMembersByChurch = async (req: Request, res: Response) => {
  const members = await memberService.getMembersByChurch(req.params.churchId, req.user as AuthUser | undefined);
  res.json(members);
};

export const getLeaders = async (req: Request, res: Response) => {
  const leaders = await memberService.getLeaders(req.user as AuthUser | undefined);
  res.json(leaders);
};

export const getBirthdaysInMonth = async (req: Request, res: Response) => {
  const birthdays = await memberService.getBirthdaysInMonth(Number(req.params.month), req.user as AuthUser | undefined);
  res.json(birthdays);
};

export const getAnniversariesInMonth = async (req: Request, res: Response) => {
  const anniversaries = await memberService.getAnniversariesInMonth(Number(req.params.month), req.user as AuthUser | undefined);
  res.json(anniversaries);
};

export const getMemberStats = async (req: Request, res: Response) => {
  const stats = await memberService.countStats(req.user as AuthUser | undefined);
  res.json(stats);
};

export const uploadMembers = async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  try {
    const result = await memberService.importMembersFromFile(
      req.file.path,
      req.body.churchId,
      req.user as AuthUser | undefined
    );
    res.json(result);
  } catch (e: any) {
    res.status(/forbidden/i.test(e.message) ? 403 : 400).json({ message: e.message });
  }
};

export const downloadTemplate = async (_req: Request, res: Response) => {
  const buffer = await memberService.generateMemberTemplate();
  res.setHeader("Content-Disposition", "attachment; filename=member_template.xlsx");
  res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buffer);
};

export const sendInvite = async (req: Request, res: Response) => {
  const { email, churchId } = req.body;
  try {
    const result = await memberService.sendInvite(email, churchId, req.user as AuthUser | undefined);
    res.json(result);
  } catch (e: any) {
    res.status(/forbidden/i.test(e.message) ? 403 : 400).json({ message: e.message });
  }
};

export const registerViaInvite = async (req: Request, res: Response) => {
  const member = await memberService.registerViaInvite(req.params.token, req.body);
  res.status(201).json(member);
};


/** Admin/staff sends invite (secured) */
export async function sendSelfRegInvite(req: Request, res: Response) {
  try {
    const { email, churchId, kind = "short", invitedBy } = req.body as any;
    // Optional: enforce scope like your other routes
    // e.g., only allow church admins for their church
    const result = await memberService.sendSelfRegInvite(email, churchId, kind, invitedBy);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
}

/** Public: verify token before showing form */
export async function verifySelfReg(req: Request, res: Response) {
  try {
    const { token } = req.query as any;
    const info = await memberService.verifySelfRegToken(String(token || ""));
    res.json(info);
  } catch (e: any) {
    res.status(400).json({ message: "Invalid or expired link" });
  }
}

/** Public: submit short form */
export async function selfRegisterShort(req: Request, res: Response) {
  try {
    const { token } = req.body as any;
    const member = await memberService.selfRegisterShort(String(token || ""), req.body);
    res.status(201).json(member);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
}

/** Public: submit long form */
export async function selfRegisterLong(req: Request, res: Response) {
  try {
    const { token } = req.body as any;
    const member = await memberService.selfRegisterLong(String(token || ""), req.body);
    res.status(201).json(member);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
}