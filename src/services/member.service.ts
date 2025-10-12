import Member, { IMember } from "../models/Member";
import mongoose, { Types } from "mongoose";
import fs from "fs";
import { z } from "zod";
import * as XLSX from "xlsx";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import type { AuthUser } from "../types/express";
import { signSelfRegToken, verifySelfRegToken, type SelfRegPayload } from "../utils/selfRegToken";
import { mailer } from "../utils/mailer";

/* ------------------------- helpers: scope & utils ------------------------- */

const shortSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  gender: z.enum(["Male","Female","Other"]).optional(),
});
const longSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  middleName: z.string().optional(),
  gender: z.enum(["Male","Female","Other"]).optional(),
  dob: z.string().or(z.date()).optional(),
  maritalStatus: z.enum(["Single","Married","Divorced","Widowed"]).optional(),
  spouseName: z.string().optional(),
  weddingAnniversary: z.string().or(z.date()).optional(),
  phone: z.string().optional(),
  altPhone: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    zip: z.string().optional(),
  }).partial().optional(),
  salvationDate: z.string().or(z.date()).optional(),
  baptismDate: z.string().or(z.date()).optional(),
  holyGhostBaptism: z.boolean().optional(),
  membershipStatus: z.enum(["Active","Visitor","New Convert","Inactive"]).optional(),
  joinDate: z.string().or(z.date()).optional(),
  invitedBy: z.string().optional(),
  role: z.string().optional(),
  volunteerGroups: z.array(z.string()).optional(),
  isLeader: z.boolean().optional(),
  familyId: z.string().optional(),
  household: z.object({
    spouse: z.string().optional(),
    children: z.array(z.object({ name: z.string(), dob: z.string().or(z.date()).optional() })).optional(),
    dependents: z.array(z.string()).optional(),
  }).partial().optional(),
  photoUrl: z.string().optional(),
  notes: z.string().optional(),
}).strict();

/** Build the public link the member will click */
function buildSelfRegUrl(token: string) {
  const base = (process.env.APP_BASE_URL || "http://localhost:5174").replace(/\/+$/,"");
  return `${base}/self-register?token=${encodeURIComponent(token)}`;
}

const oid = (v: string | Types.ObjectId) =>
  typeof v === "string" ? new Types.ObjectId(v) : v;

const isSite = (u?: AuthUser) => u?.role === "siteAdmin";
const isNational = (u?: AuthUser) => u?.role === "nationalPastor";
const isDistrict = (u?: AuthUser) => u?.role === "districtPastor";
const isChurchLevel = (u?: AuthUser) =>
  u?.role === "churchAdmin" || u?.role === "pastor" || u?.role === "volunteer";

/** Build a Mongo filter that restricts reads by the actor’s scope. */
function buildScopeFilter(actor?: AuthUser) {
  if (!actor) return {}; // unauthenticated: let controller decide; here we don’t block
  if (isSite(actor)) return {};
  if (isNational(actor) && actor.nationalChurchId) {
    // Join via church.district.national – done in service methods that use populate/aggregate.
    // For basic queries we can’t natively filter by nationalId w/o a lookup,
    // so we return empty here and rely on the aggregate path when needed.
    return { __requireLookup: true as const };
  }
  if (isDistrict(actor) && actor.districtId) {
    return { __districtId: actor.districtId };
  }
  if (isChurchLevel(actor) && actor.churchId) {
    return { churchId: oid(actor.churchId) };
  }
  return {};
}

/** Guard that the target churchId is writable by actor. */
function canWriteChurch(churchId: string, actor?: AuthUser) {
  if (!actor) return false;
  if (isSite(actor)) return true;
  if (isChurchLevel(actor)) return String(actor.churchId) === String(churchId);
  // District/National: allow if they have those scope IDs; controller may add stricter checks later
  if (isDistrict(actor)) return true;
  if (isNational(actor)) return true;
  return false;
}

/* -------------------------------- service -------------------------------- */

export class MemberService {
  /** Create a member manually */
  async createMember(data: Partial<IMember>, actor?: AuthUser): Promise<IMember> {
    if (!data.churchId) throw new Error("churchId is required");
    if (!canWriteChurch(String(data.churchId), actor)) {
      throw new Error("Forbidden");
    }
    return await Member.create(data);
  }

  /** Get all members with optional filters (scope-aware) */
  async getMembers(filters: any = {}, actor?: AuthUser): Promise<IMember[]> {
    const scope = buildScopeFilter(actor);

    // If actor must be narrowed by church
    if ("churchId" in scope) {
      filters.churchId = scope.churchId;
      return await Member.find(filters)
        .populate({
          path: "churchId",
          populate: { path: "districtId", populate: { path: "nationalChurchId" } },
        })
        .sort({ createdAt: -1 });
    }

    // If district-bounded reads
    if ("__districtId" in scope) {
      // Join through church to districtId
      return await Member.aggregate([
        { $match: filters },
        {
          $lookup: {
            from: "churches",
            localField: "churchId",
            foreignField: "_id",
            as: "church",
          },
        },
        { $unwind: "$church" },
        { $match: { "church.districtId": oid(scope.__districtId as string) } },
        { $sort: { createdAt: -1 } },
      ]) as unknown as IMember[];
    }

    // If national read needed, join to districts then to national
    if ("__requireLookup" in scope && actor?.nationalChurchId) {
      return await Member.aggregate([
        { $match: filters },
        {
          $lookup: {
            from: "churches",
            localField: "churchId",
            foreignField: "_id",
            as: "church",
          },
        },
        { $unwind: "$church" },
        {
          $lookup: {
            from: "districts",
            localField: "church.districtId",
            foreignField: "_id",
            as: "district",
          },
        },
        { $unwind: "$district" },
        { $match: { "district.nationalChurchId": oid(actor.nationalChurchId) } },
        { $sort: { createdAt: -1 } },
      ]) as unknown as IMember[];
    }

    // site admin or no constraint
    return await Member.find(filters)
      .populate({
        path: "churchId",
        populate: { path: "districtId", populate: { path: "nationalChurchId" } },
      })
      .sort({ createdAt: -1 });
  }

  /** Get member by ID (scope-aware) */
  async getMemberById(id: string, actor?: AuthUser): Promise<IMember | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    // We fetch and then enforce scope.
    const doc = await Member.findById(id)
      .populate({
        path: "churchId",
        populate: { path: "districtId", populate: { path: "nationalChurchId" } },
      });
    if (!doc) return null;

    if (isSite(actor)) return doc;

    if (isChurchLevel(actor) && actor?.churchId) {
      return String(doc.churchId) === String(actor.churchId) ? doc : null;
    }

    if (isDistrict(actor) && actor?.districtId) {
      // @ts-expect-error populated path
      const dId = doc?.churchId?.districtId?._id || doc?.churchId?.districtId;
      return String(dId) === String(actor.districtId) ? doc : null;
    }

    if (isNational(actor) && actor?.nationalChurchId) {
      // @ts-expect-error populated path
      const nId = doc?.churchId?.districtId?.nationalChurchId?._id || doc?.churchId?.districtId?.nationalChurchId;
      return String(nId) === String(actor.nationalChurchId) ? doc : null;
    }

    return null;
  }

  /** Update member details (scope-aware) */
  async updateMember(id: string, data: Partial<IMember>, actor?: AuthUser): Promise<IMember | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const current = await Member.findById(id).select("churchId");
    if (!current) return null;

    if (!canWriteChurch(String(current.churchId), actor)) {
      throw new Error("Forbidden");
    }

    return await Member.findByIdAndUpdate(id, data, { new: true });
  }

  /** Delete a member (scope-aware) */
  async deleteMember(id: string, actor?: AuthUser): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const current = await Member.findById(id).select("churchId");
    if (!current) return false;
    if (!canWriteChurch(String(current.churchId), actor)) throw new Error("Forbidden");

    const result = await Member.findByIdAndDelete(id);
    return !!result;
  }

  /** Members by church (scope-aware) */
  async getMembersByChurch(churchId: string, actor?: AuthUser): Promise<IMember[]> {
    const filters: any = { churchId: oid(churchId) };
    // Narrow by actor’s scope
    const scoped = await this.getMembers(filters, actor);
    return scoped as IMember[];
  }

  /** Leaders list (scope-aware) */
  async getLeaders(actor?: AuthUser): Promise<IMember[]> {
    return this.getMembers({ isLeader: true }, actor);
  }

  /** Birthdays by month (scope-aware via aggregate) */
  async getBirthdaysInMonth(month: number, actor?: AuthUser): Promise<IMember[]> {
    const scope = buildScopeFilter(actor);

    const pipeline: any[] = [
      { $addFields: { birthMonth: { $month: "$dob" } } },
      { $match: { birthMonth: month } },
    ];

    if ("churchId" in scope) {
      pipeline.unshift({ $match: { churchId: oid(scope.churchId as Types.ObjectId) } });
    } else if ("__districtId" in scope) {
      pipeline.push(
        { $lookup: { from: "churches", localField: "churchId", foreignField: "_id", as: "church" } },
        { $unwind: "$church" },
        { $match: { "church.districtId": oid(scope.__districtId as string) } },
      );
    } else if ("__requireLookup" in scope && actor?.nationalChurchId) {
      pipeline.push(
        { $lookup: { from: "churches", localField: "churchId", foreignField: "_id", as: "church" } },
        { $unwind: "$church" },
        { $lookup: { from: "districts", localField: "church.districtId", foreignField: "_id", as: "district" } },
        { $unwind: "$district" },
        { $match: { "district.nationalChurchId": oid(actor.nationalChurchId) } },
      );
    }

    return (await Member.aggregate(pipeline)) as IMember[];
  }

  /** Anniversaries by month (scope-aware via aggregate) */
  async getAnniversariesInMonth(month: number, actor?: AuthUser): Promise<IMember[]> {
    const scope = buildScopeFilter(actor);

    const pipeline: any[] = [
      { $addFields: { anniversaryMonth: { $month: "$weddingAnniversary" } } },
      { $match: { anniversaryMonth: month } },
    ];

    if ("churchId" in scope) {
      pipeline.unshift({ $match: { churchId: oid(scope.churchId as Types.ObjectId) } });
    } else if ("__districtId" in scope) {
      pipeline.push(
        { $lookup: { from: "churches", localField: "churchId", foreignField: "_id", as: "church" } },
        { $unwind: "$church" },
        { $match: { "church.districtId": oid(scope.__districtId as string) } },
      );
    } else if ("__requireLookup" in scope && actor?.nationalChurchId) {
      pipeline.push(
        { $lookup: { from: "churches", localField: "churchId", foreignField: "_id", as: "church" } },
        { $unwind: "$church" },
        { $lookup: { from: "districts", localField: "church.districtId", foreignField: "_id", as: "district" } },
        { $unwind: "$district" },
        { $match: { "district.nationalChurchId": oid(actor.nationalChurchId) } },
      );
    }

    return (await Member.aggregate(pipeline)) as IMember[];
  }

  /** Member stats summary (scope-aware via count filters) */
  async countStats(actor?: AuthUser) {
    const scope = buildScopeFilter(actor);

    const build = (extra: any = {}) => {
      if ("churchId" in scope) return { ...extra, churchId: oid(scope.churchId as Types.ObjectId) };
      // For district/national we’d need lookup; keep simple totals for church/site for now
      if (isSite(actor)) return extra;
      return extra; // could be expanded with aggregate lookups if needed
    };

    const [total, active, visitors, converts] = await Promise.all([
      Member.countDocuments(build()),
      Member.countDocuments(build({ membershipStatus: "Active" })),
      Member.countDocuments(build({ membershipStatus: "Visitor" })),
      Member.countDocuments(build({ membershipStatus: "New Convert" })),
    ]);

    return { total, active, visitors, converts };
  }

  /** Upload Excel/CSV (scope-aware) */
  async importMembersFromFile(filePath: string, churchId: string, actor?: AuthUser) {
    if (!churchId) throw new Error("churchId is required");
    if (!canWriteChurch(churchId, actor)) throw new Error("Forbidden");

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(sheet);

    const success: IMember[] = [];
    const errors: any[] = [];

    for (const row of rows) {
      try {
        const member = await Member.create({
          churchId,
          firstName: row.firstName || row["First Name"],
          lastName: row.lastName || row["Last Name"],
          email: row.email || row["Email"],
          phone: row.phone || row["Phone"],
          gender: row.gender || row["Gender"],
          membershipStatus: "Active",
        });
        success.push(member);
      } catch (err: any) {
        errors.push({ row, error: err.message });
      }
    }

    fs.unlinkSync(filePath); // delete temp file
    return { successCount: success.length, failedCount: errors.length, errors };
  }

  /** Generate blank Excel template */
  async generateMemberTemplate(): Promise<Buffer> {
    const headers = [["First Name", "Last Name", "Email", "Phone", "Gender"]];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Members");
    return XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
  }

  /** Send invite link (scope-aware) */
  async sendInvite(email: string, churchId: string, actor?: AuthUser) {
    if (!canWriteChurch(churchId, actor)) throw new Error("Forbidden");

    const token = jwt.sign({ email, churchId }, process.env.JWT_SECRET!, { expiresIn: "7d" });
    const link = `${process.env.FRONTEND_URL}/register?token=${token}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"Dominion Connect" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "You're Invited to Register on Dominion Connect",
      html: `<p>Hello!</p><p>Please click the link below to register:</p><p><a href="${link}">${link}</a></p>`,
    });

    return { message: "Invitation sent", link };
  }

  /** Register via invite link (no actor required) */
  async registerViaInvite(token: string, data: Partial<IMember>) {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    if (!decoded?.email || !decoded?.churchId) throw new Error("Invalid or expired token");

    const existing = await Member.findOne({ email: decoded.email });
    if (existing) throw new Error("Member already registered");

    return await Member.create({ ...data, email: decoded.email, churchId: decoded.churchId });
  }

    /** Send a self-registration invite (short or long) */
  async sendSelfRegInvite(email: string, churchId: string, kind: "short"|"long", invitedBy?: string) {
    const token = signSelfRegToken({ email, churchId, kind, invitedBy });
    const url = buildSelfRegUrl(token);

    const subj = `You're invited to register as a member`;
    const text = `Hello! Use the link below to register as a member (${kind} form):
${url}
If you didn't expect this, you can ignore this message.`;

    const html = `
      <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;margin:auto;max-width:560px;border:1px solid #eee;border-radius:12px;padding:24px">
        <h2>Complete your membership registration</h2>
        <p>You’ve been invited to register on <b>Dominion Connect</b>. Click the button to complete a ${kind} form.</p>
        <p style="text-align:center;margin:20px 0">
          <a href="${url}" style="background:linear-gradient(135deg,#8B0000,#D4AF37);color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;display:inline-block">Open Registration</a>
        </p>
        <p style="font-size:12px;color:#555">If the button doesn’t work, paste this link:<br/><a href="${url}">${url}</a></p>
      </div>
    `;

    await mailer(email, subj, text, html);
    return { ok: true, link: url };
  }

  /** Let frontend verify token before showing form */
  async verifySelfRegToken(token: string) {
    const payload = verifySelfRegToken(token);
    return { email: payload.email, churchId: payload.churchId, kind: payload.kind };
  }

  /** Create member from SHORT form */
  async selfRegisterShort(token: string, body: unknown) {
    const payload = verifySelfRegToken(token); // throws if invalid
    const data = shortSchema.parse(body);

    // prevent duplicate within same church (by email)
    const existing = await Member.findOne({ email: payload.email, churchId: payload.churchId });
    if (existing) throw new Error("Member already registered for this church");

    const created = await Member.create({
      churchId: payload.churchId,
      email: payload.email,
      membershipStatus: "Active",
      ...data,
    });
    return created;
  }

  /** Create (or update) from LONG form */
  async selfRegisterLong(token: string, body: any) {
  const payload = verifySelfRegToken(token);

  // ✅ Remove the token key before validating
  const { token: _ignored, ...data } = body;
  const parsed = longSchema.parse(data);

  const base = {
    churchId: payload.churchId,
    email: payload.email,
    membershipStatus: parsed.membershipStatus || "Active",
  };

  const existing = await Member.findOne({
    email: payload.email,
    churchId: payload.churchId,
  });

  if (existing) {
    const updated = await Member.findByIdAndUpdate(existing._id, parsed, { new: true });
    return updated!;
  }

  const created = await Member.create({ ...base, ...parsed });
  return created;
}
}

export default new MemberService();
