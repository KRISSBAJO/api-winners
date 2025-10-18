// src/realtime/notify.ts
import NotificationModel from "../models/Notification";
import { type NotifKind } from "../models/notificationKinds";
import ActivityModel from "../models/Activity";
import { io } from "./socket";
import { Types } from "mongoose";

type NotifyInput = {
  kind: NotifKind;                       // <- strongly typed
  title: string;
  message?: string;
  link?: string;
  actorId?: string;
  actorName?: string;
  scope: "user" | "church" | "district" | "national";
  scopeRef?: string;                     // may be missing if using recipients-only
  recipients?: string[];                 // user ids
  activity?: {
    verb: string;
    churchId?: string; districtId?: string; nationalId?: string;
    target?: { type: string; id?: string; name?: string };
    meta?: Record<string, any>;
  }
};

export async function pushNotif(p: NotifyInput) {
  // 1) persist
  const doc = await NotificationModel.create({
    kind: p.kind,
    title: p.title,
    message: p.message,
    link: p.link,
    actorId: p.actorId ? new Types.ObjectId(p.actorId) : undefined,
    actorName: p.actorName,
    scope: p.scope,
    scopeRef: p.scopeRef ? new Types.ObjectId(p.scopeRef) : undefined,
    recipients: (p.recipients || []).map(id => new Types.ObjectId(id)),
  });

  // 2) normalize payload for the client (no raw ObjectIds)
  const payload = {
    _id: String(doc._id),
    kind: doc.kind,
    scope: doc.scope,
    title: doc.title,
    message: doc.message,
    link: doc.link,
    actorId: doc.actorId ? String(doc.actorId) : undefined,
    actorName: doc.actorName,
    scopeRef: doc.scopeRef ? String(doc.scopeRef) : undefined,
    createdAt: doc.createdAt,
  };

  // 3) build all rooms (scope + every explicit recipient)
  const rooms = new Set<string>();

  if (doc.scope === "user"     && doc.scopeRef) rooms.add(`user:${doc.scopeRef}`);
  if (doc.scope === "church"   && doc.scopeRef) rooms.add(`church:${doc.scopeRef}`);
  if (doc.scope === "district" && doc.scopeRef) rooms.add(`district:${doc.scopeRef}`);
  if (doc.scope === "national" && doc.scopeRef) rooms.add(`national:${doc.scopeRef}`);

  for (const uid of doc.recipients ?? []) rooms.add(`user:${uid}`);

  // Edge case: recipients-only (no scopeRef) — still deliver
  if (rooms.size === 0 && (doc.recipients?.length ?? 0) > 0) {
    for (const uid of doc.recipients!) rooms.add(`user:${uid}`);
  }

  // 4) emit to all rooms
  rooms.forEach((r) => io.to(r).emit("notification:new", payload));

  // 5) optional activity creation + broadcast
  if (p.activity) {
    const act = await ActivityModel.create({
      kind: p.kind,
      verb: p.activity.verb,
      actorId: p.actorId ? new Types.ObjectId(p.actorId) : undefined,
      actorName: p.actorName,
      target: p.activity.target,
      meta: p.activity.meta,
      churchId: p.activity.churchId ? new Types.ObjectId(p.activity.churchId) : undefined,
      districtId: p.activity.districtId ? new Types.ObjectId(p.activity.districtId) : undefined,
      nationalId: p.activity.nationalId ? new Types.ObjectId(p.activity.nationalId) : undefined,
    });

    if (p.activity.churchId)   io.to(`church:${p.activity.churchId}`).emit("activity:new", act);
    if (p.activity.districtId) io.to(`district:${p.activity.districtId}`).emit("activity:new", act);
    if (p.activity.nationalId) io.to(`national:${p.activity.nationalId}`).emit("activity:new", act);
  }

  return doc;
}
