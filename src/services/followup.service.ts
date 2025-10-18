// src/services/followup.service.ts
import { FilterQuery, Types } from "mongoose";
import FollowUpCase, { IFollowUpCase } from "../models/FollowUpCase";
import ContactAttempt, { IContactAttempt } from "../models/ContactAttempt";
import FollowUpCadence from "../models/FollowUpCadence";
import MessageTemplate from "../models/MessageTemplate";
import { renderTemplateAndSend } from "../utils/messaging";
import type { AuthUser } from "../types/express";
import { notifySafe } from "../realtime/notifySafe";

/* --------------------------- scope helpers --------------------------- */

const isSite = (u?: AuthUser) => u?.role === "siteAdmin";
const oid = (v: string | Types.ObjectId) =>
  typeof v === "string" ? new Types.ObjectId(v) : v;

function enforceChurchWrite(churchId: string | Types.ObjectId, actor?: AuthUser) {
  if (!actor) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  if (isSite(actor)) return;
  if (!actor.churchId || String(actor.churchId) !== String(churchId)) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }
}

function buildReadFilter(actor?: AuthUser): FilterQuery<IFollowUpCase> {
  if (!actor) return { _id: null }; // block anonymous
  if (isSite(actor)) return {};
  if (actor.churchId) return { churchId: oid(actor.churchId) };
  return { _id: null };
}

/* --------------------------- helpers --------------------------- */

const actorLabel = (actor?: AuthUser) =>
  (actor as any)?.name ||
  [ (actor as any)?.firstName, (actor as any)?.lastName ].filter(Boolean).join(" ") ||
  undefined;

const caseLink = (id: string | Types.ObjectId) => `/dashboard/followup/cases/${String(id)}`;

/* --------------------------- public API --------------------------- */

export class FollowupService {
  /* List cases (filters + pagination) */
  async listCases(
    params: {
      status?: string;
      type?: string;
      assignedTo?: string;
      tag?: string;
      q?: string;
      sort?: "recent" | "score";
      page?: number;
      limit?: number;
    },
    actor?: AuthUser
  ) {
    const base = buildReadFilter(actor);
    const q: FilterQuery<IFollowUpCase> = { ...base };

    if (params.status) q.status = params.status as any;
    if (params.type) q.type = params.type as any;
    if (params.assignedTo) q.assignedTo = oid(params.assignedTo);
    if (params.tag) q.tags = params.tag;

    if (params.q) {
      q.$or = [
        { reason: { $regex: params.q, $options: "i" } },
        { "prospect.firstName": { $regex: params.q, $options: "i" } },
        { "prospect.lastName": { $regex: params.q, $options: "i" } },
        { "prospect.email": { $regex: params.q, $options: "i" } },
        { "prospect.phone": { $regex: params.q, $options: "i" } },
      ];
    }

    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.min(100, Math.max(1, Number(params.limit || 20)));
    const skip = (page - 1) * limit;

    const sort: { [key: string]: 1 | -1 } =
      params.sort === "score"
        ? { engagementScore: -1, updatedAt: -1 }
        : { updatedAt: -1 };

    const [items, total] = await Promise.all([
      FollowUpCase.find(q)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("memberId", "firstName lastName email phone")
        .populate("assignedTo", "firstName lastName"),
      FollowUpCase.countDocuments(q),
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  async getCase(id: string, actor?: AuthUser) {
    const q = buildReadFilter(actor);
    const doc = await FollowUpCase.findOne({ _id: id, ...q })
      .populate("memberId", "firstName lastName email phone")
      .populate("assignedTo", "firstName lastName")
      .populate("cadenceId", "name type steps");
    return doc;
  }

  // make openedBy optional in the payload type
  async openCase(
    payload: {
      memberId?: string;
      prospect?: { firstName: string; lastName?: string; email?: string; phone?: string; source?: string };
      churchId: string;
      type: "newcomer" | "absentee" | "evangelism" | "care";
      reason?: string;
      openedBy?: string;                    // optional
      cadenceId?: string;
      assignedTo?: string;
      tags?: string[];
      consent?: { email?: boolean; sms?: boolean; call?: boolean };
    },
    actor?: AuthUser
  ) {
    enforceChurchWrite(payload.churchId, actor);

    const openedBy = payload.openedBy ?? String((actor as any)?._id ?? (actor as any)?.id);
    if (!openedBy) {
      throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
    }

    const doc = await FollowUpCase.create({
      ...payload,
      openedBy,
      status: "open",
      tags: payload.tags || [],
      consent: { ...(payload.consent || {}), updatedAt: new Date() },
      currentStepIndex: 0,
      engagementScore: 0,
    });

    // 🔔 notify + activity
    await notifySafe({
      kind: "followup.case.opened",
      title: "Follow-up case opened",
      message: `A ${doc.type} case was opened${doc.prospect?.firstName ? ` for ${doc.prospect.firstName}` : ""}.`,
      link: caseLink(doc._id),
      actorId: (actor as any)?._id,
      actorName: actorLabel(actor),
      scope: "church",
      scopeRef: String(doc.churchId),
      activity: {
        verb: "opened a follow-up case",
        churchId: String(doc.churchId),
        target: { type: "FollowUpCase", id: String(doc._id), name: doc.reason || doc.type },
        meta: { type: doc.type, assignedTo: doc.assignedTo || null },
      },
    });

    return doc;
  }

  async updateCase(
    id: string,
    data: Partial<Pick<IFollowUpCase, "type" | "status" | "reason" | "tags">>,
    actor?: AuthUser
  ) {
    const current = await FollowUpCase.findById(id).select("churchId type reason").lean();
    if (!current) return null;
    enforceChurchWrite(current.churchId, actor);
    const updated = await FollowUpCase.findByIdAndUpdate(id, data, { new: true });

    if (updated) {
      await notifySafe({
        kind: "followup.case.updated",
        title: "Follow-up case updated",
        message: `Case was updated${data.status ? ` (status: ${data.status})` : ""}.`,
        link: caseLink(updated._id),
        actorId: (actor as any)?._id,
        actorName: actorLabel(actor),
        scope: "church",
        scopeRef: String(updated.churchId),
        activity: {
          verb: "updated a follow-up case",
          churchId: String(updated.churchId),
          target: { type: "FollowUpCase", id: String(updated._id), name: updated.reason || updated.type },
          meta: { changes: Object.keys(data) },
        },
      });
    }

    return updated;
  }

  async assignCase(id: string, assignedTo: string | null, actor?: AuthUser) {
    const current = await FollowUpCase.findById(id).select("churchId type reason").lean();
    if (!current) return null;
    enforceChurchWrite(current.churchId, actor);
    const updated = await FollowUpCase.findByIdAndUpdate(
      id,
      { assignedTo: assignedTo ? oid(assignedTo) : undefined },
      { new: true }
    );

    if (updated) {
      await notifySafe({
        kind: "followup.case.assigned",
        title: "Case assignment changed",
        message: assignedTo ? "Case was assigned." : "Case was unassigned.",
        link: caseLink(updated._id),
        actorId: (actor as any)?._id,
        actorName: actorLabel(actor),
        scope: "church",
        scopeRef: String(updated.churchId),
        activity: {
          verb: assignedTo ? "assigned a follow-up case" : "unassigned a follow-up case",
          churchId: String(updated.churchId),
          target: { type: "FollowUpCase", id: String(updated._id), name: updated.reason || updated.type },
          meta: { assignedTo: assignedTo || null },
        },
      });
    }

    return updated;
  }

  async pauseCase(id: string, note?: string, actor?: AuthUser) {
    const current = await FollowUpCase.findById(id).select("churchId type reason").lean();
    if (!current) return null;
    enforceChurchWrite(current.churchId, actor);
    const updated = await FollowUpCase.findByIdAndUpdate(
      id,
      { status: "paused", reason: note ?? current.reason },
      { new: true }
    );

    if (updated) {
      await notifySafe({
        kind: "followup.case.paused",
        title: "Case paused",
        message: "Case was paused.",
        link: caseLink(updated._id),
        actorId: (actor as any)?._id,
        actorName: actorLabel(actor),
        scope: "church",
        scopeRef: String(updated.churchId),
        activity: {
          verb: "paused a follow-up case",
          churchId: String(updated.churchId),
          target: { type: "FollowUpCase", id: String(updated._id), name: updated.reason || updated.type },
        },
      });
    }

    return updated;
  }

  async resumeCase(id: string, actor?: AuthUser) {
    const current = await FollowUpCase.findById(id).select("churchId status type reason").lean();
    if (!current) return null;
    enforceChurchWrite(current.churchId, actor);
    const status = current.status === "paused" ? "in_progress" : current.status;
    const updated = await FollowUpCase.findByIdAndUpdate(id, { status }, { new: true });

    if (updated) {
      await notifySafe({
        kind: "followup.case.resumed",
        title: "Case resumed",
        message: "Case was resumed.",
        link: caseLink(updated._id),
        actorId: (actor as any)?._id,
        actorName: actorLabel(actor),
        scope: "church",
        scopeRef: String(updated.churchId),
        activity: {
          verb: "resumed a follow-up case",
          churchId: String(updated.churchId),
          target: { type: "FollowUpCase", id: String(updated._id), name: updated.reason || updated.type },
        },
      });
    }

    return updated;
  }

  async resolveCase(id: string, resolutionNote?: string, actor?: AuthUser) {
    const current = await FollowUpCase.findById(id).select("churchId type reason").lean();
    if (!current) return null;
    enforceChurchWrite(current.churchId, actor);
    const updated = await FollowUpCase.findByIdAndUpdate(
      id,
      { status: "resolved", reason: resolutionNote ?? "Resolved", $addToSet: { tags: "resolved" } },
      { new: true }
    );

    if (updated) {
      await notifySafe({
        kind: "followup.case.resolved",
        title: "Case resolved",
        message: "A follow-up case was resolved.",
        link: caseLink(updated._id),
        actorId: (actor as any)?._id,
        actorName: actorLabel(actor),
        scope: "church",
        scopeRef: String(updated.churchId),
        activity: {
          verb: "resolved a follow-up case",
          churchId: String(updated.churchId),
          target: { type: "FollowUpCase", id: String(updated._id), name: updated.reason || updated.type },
        },
      });
    }

    return updated;
  }

  async archiveCase(id: string, actor?: AuthUser) {
    const current = await FollowUpCase.findById(id).select("churchId type reason").lean();
    if (!current) return null;
    enforceChurchWrite(current.churchId, actor);
    const updated = await FollowUpCase.findByIdAndUpdate(id, { status: "archived" }, { new: true });

    if (updated) {
      await notifySafe({
        kind: "followup.case.archived",
        title: "Case archived",
        message: "A follow-up case was archived.",
        link: caseLink(updated._id),
        actorId: (actor as any)?._id,
        actorName: actorLabel(actor),
        scope: "church",
        scopeRef: String(updated.churchId),
        activity: {
          verb: "archived a follow-up case",
          churchId: String(updated.churchId),
          target: { type: "FollowUpCase", id: String(updated._id), name: updated.reason || updated.type },
        },
      });
    }

    return updated;
  }

  async addTag(id: string, tag: string, actor?: AuthUser) {
    const current = await FollowUpCase.findById(id).select("churchId type reason").lean();
    if (!current) return null;
    enforceChurchWrite(current.churchId, actor);
    const updated = await FollowUpCase.findByIdAndUpdate(id, { $addToSet: { tags: tag } }, { new: true });

    if (updated) {
      await notifySafe({
        kind: "followup.case.tag.added",
        title: "Tag added",
        message: `Tag “${tag}” added to case.`,
        link: caseLink(updated._id),
        actorId: (actor as any)?._id,
        actorName: actorLabel(actor),
        scope: "church",
        scopeRef: String(updated.churchId),
        activity: {
          verb: "added a tag to a follow-up case",
          churchId: String(updated.churchId),
          target: { type: "FollowUpCase", id: String(updated._id), name: updated.reason || updated.type },
          meta: { tag },
        },
      });
    }

    return updated;
  }

  async removeTag(id: string, tag: string, actor?: AuthUser) {
    const current = await FollowUpCase.findById(id).select("churchId type reason").lean();
    if (!current) return null;
    enforceChurchWrite(current.churchId, actor);
    const updated = await FollowUpCase.findByIdAndUpdate(id, { $pull: { tags: tag } }, { new: true });

    if (updated) {
      await notifySafe({
        kind: "followup.case.tag.removed",
        title: "Tag removed",
        message: `Tag “${tag}” removed from case.`,
        link: caseLink(updated._id),
        actorId: (actor as any)?._id,
        actorName: actorLabel(actor),
        scope: "church",
        scopeRef: String(updated.churchId),
        activity: {
          verb: "removed a tag from a follow-up case",
          churchId: String(updated.churchId),
          target: { type: "FollowUpCase", id: String(updated._id), name: updated.reason || updated.type },
          meta: { tag },
        },
      });
    }

    return updated;
  }

  async updateConsent(
    id: string,
    consent: { email?: boolean; sms?: boolean; call?: boolean },
    actor?: AuthUser
  ) {
    const current = await FollowUpCase.findById(id).select("churchId").lean();
    if (!current) return null;
    enforceChurchWrite(current.churchId, actor);
    const updated = await FollowUpCase.findByIdAndUpdate(
      id,
      { consent: { ...(consent || {}), updatedAt: new Date() } },
      { new: true }
    );
    // (no notif to avoid noise)
    return updated;
  }

  async setCadence(id: string, cadenceId: string | null, actor?: AuthUser) {
    const current = await FollowUpCase.findById(id).select("churchId type reason").lean();
    if (!current) return null;
    enforceChurchWrite(current.churchId, actor);
    const patch: any = cadenceId
      ? { cadenceId: oid(cadenceId), currentStepIndex: 0 }
      : { cadenceId: undefined, currentStepIndex: 0 };
    const updated = await FollowUpCase.findByIdAndUpdate(id, patch, { new: true });

    if (updated) {
      await notifySafe({
        kind: "followup.case.cadence.set",
        title: "Cadence updated",
        message: cadenceId ? "Cadence set on case." : "Cadence cleared on case.",
        link: caseLink(updated._id),
        actorId: (actor as any)?._id,
        actorName: actorLabel(actor),
        scope: "church",
        scopeRef: String(updated.churchId),
        activity: {
          verb: cadenceId ? "set a cadence on a follow-up case" : "cleared cadence on a follow-up case",
          churchId: String(updated.churchId),
          target: { type: "FollowUpCase", id: String(updated._id), name: updated.reason || updated.type },
          meta: { cadenceId: cadenceId || null },
        },
      });
    }

    return updated;
  }

  async advanceCadence(caseId: string, actor?: AuthUser) {
    const c = await FollowUpCase.findById(caseId)
      .populate("memberId", "firstName lastName email phone")
      .lean();
    if (!c) return null;
    enforceChurchWrite(c.churchId, actor);

    if (!c.cadenceId) return c;
    const cadence = await FollowUpCadence.findById(c.cadenceId).lean();
    if (!cadence) return c;
    const idx = c.currentStepIndex ?? 0;
    const step = cadence.steps[idx];
    if (!step) return c;

    if (step.templateKey) {
      const tmpl = await MessageTemplate.findOne({
        key: step.templateKey,
        $or: [{ churchId: c.churchId }, { churchId: null }, { churchId: { $exists: false } }],
      }).lean();
      if (tmpl) {
        await renderTemplateAndSend({ case: c, template: tmpl, channel: step.channel });

        await ContactAttempt.create({
          caseId: c._id,
          byUserId: new Types.ObjectId((actor as any)!._id),
          channel: step.channel,
          outcome: "sent",
          content: tmpl.body,
        });

        // 🔔 message sent (optional, useful for audit)
        await notifySafe({
          kind: "followup.message.sent",
          title: "Cadence message sent",
          message: `A ${step.channel} message was sent via cadence.`,
          link: caseLink(c._id),
          actorId: (actor as any)?._id,
          actorName: actorLabel(actor),
          scope: "church",
          scopeRef: String(c.churchId),
          activity: {
            verb: "sent a cadence message",
            churchId: String(c.churchId),
            target: { type: "FollowUpCase", id: String(c._id), name: c.reason || c.type },
            meta: { channel: step.channel, templateKey: step.templateKey },
          },
        });
      }
    }

    await FollowUpCase.updateOne({ _id: c._id }, { $inc: { currentStepIndex: 1 }, status: "in_progress" });
    const next = await FollowUpCase.findById(c._id);

    // 🔔 cadence advanced
    await notifySafe({
      kind: "followup.case.cadence.advanced",
      title: "Cadence advanced",
      message: "Case progressed to the next cadence step.",
      link: caseLink(c._id),
      actorId: (actor as any)?._id,
      actorName: actorLabel(actor),
      scope: "church",
      scopeRef: String(c.churchId),
      activity: {
        verb: "advanced a follow-up cadence",
        churchId: String(c.churchId),
        target: { type: "FollowUpCase", id: String(c._id), name: c.reason || c.type },
        meta: { fromIndex: idx, toIndex: idx + 1 },
      },
    });

    return next;
  }

  /* Attempts */
  async listAttempts(caseId: string, actor?: AuthUser) {
    const c = await FollowUpCase.findById(caseId).select("churchId");
    if (!c) return [];
    const rf = buildReadFilter(actor);
    if (!isSite(actor) && String(c.churchId) !== String((actor as any).churchId)) return [];
    return ContactAttempt.find({ caseId }).sort({ createdAt: -1 });
  }

  async logAttempt(
    caseId: string,
    payload: { channel: IContactAttempt["channel"]; outcome: IContactAttempt["outcome"]; content?: string; nextActionOn?: Date },
    actor?: AuthUser
  ) {
    const c = await FollowUpCase.findById(caseId).select("churchId type reason").lean();
    if (!c) throw Object.assign(new Error("Case not found"), { statusCode: 404 });
    enforceChurchWrite(c.churchId, actor);

    const a = await ContactAttempt.create({
      caseId,
      byUserId: new Types.ObjectId((actor as any)!._id),
      ...payload,
    });

    const delta =
      payload.outcome === "connected"
        ? 3
        : payload.outcome === "not_interested"
        ? -4
        : payload.outcome === "prayed"
        ? 5
        : 0;

    await FollowUpCase.updateOne(
      { _id: caseId },
      { $inc: { engagementScore: delta }, status: "in_progress" }
    );

    // 🔔 attempt logged
    await notifySafe({
      kind: "followup.attempt.logged",
      title: "Contact attempt logged",
      message: `Attempt via ${payload.channel} recorded (${payload.outcome}).`,
      link: caseLink(caseId),
      actorId: (actor as any)?._id,
      actorName: actorLabel(actor),
      scope: "church",
      scopeRef: String(c.churchId),
      activity: {
        verb: "logged a contact attempt",
        churchId: String(c.churchId),
        target: { type: "FollowUpCase", id: String(caseId), name: c.reason || c.type },
        meta: { channel: payload.channel, outcome: payload.outcome, nextActionOn: payload.nextActionOn || null },
      },
    });

    return a;
  }

  async listCadences(actor?: AuthUser) {
    if (!actor) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
    const q = actor.churchId
      ? { $or: [{ churchId: null }, { churchId: oid(actor.churchId) }] }
      : { churchId: null };

    return FollowUpCadence.find(q)
      .select("_id name type steps.length")
      .sort({ name: 1 })
      .lean();
  }

  /* Summary KPIs (simple version) */
  async stats(actor?: AuthUser) {
    const base = buildReadFilter(actor);
    const [open, inProgress, paused, resolved, absentee, newcomer, evangelism] = await Promise.all([
      FollowUpCase.countDocuments({ ...base, status: "open" }),
      FollowUpCase.countDocuments({ ...base, status: "in_progress" }),
      FollowUpCase.countDocuments({ ...base, status: "paused" }),
      FollowUpCase.countDocuments({ ...base, status: "resolved" }),
      FollowUpCase.countDocuments({ ...base, type: "absentee", status: { $in: ["open", "in_progress"] } }),
      FollowUpCase.countDocuments({ ...base, type: "newcomer", status: { $in: ["open", "in_progress"] } }),
      FollowUpCase.countDocuments({ ...base, type: "evangelism", status: { $in: ["open", "in_progress"] } }),
    ]);
    return { open, inProgress, paused, resolved, absentee, newcomer, evangelism };
  }
}

export default new FollowupService();
