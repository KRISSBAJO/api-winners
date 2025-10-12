// src/realtime/notify.ts
import NotificationModel from "../models/Notification";
import ActivityModel from "../models/Activity";
import { io } from "./socket";
import { Types } from "mongoose";

type NotifyInput = {
  kind: any;
  title: string;
  message?: string;
  link?: string;
  actorId?: string;
  actorName?: string;
  scope: "user" | "church" | "district" | "national";
  scopeRef?: string;
  recipients?: string[]; // user ids
  activity?: {
    verb: string;
    churchId?: string; districtId?: string; nationalId?: string;
    target?: { type: string; id?: string; name?: string };
    meta?: Record<string, any>;
  }
};

export async function pushNotif(p: NotifyInput) {
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

  // emit to the correct room(s)
  const room =
    p.scope === "user"     ? `user:${p.scopeRef}`
  : p.scope === "church"   ? `church:${p.scopeRef}`
  : p.scope === "district" ? `district:${p.scopeRef}`
  :                          `national:${p.scopeRef}`;

  io.to(room).emit("notification:new", doc);

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
    // broadcast org-wide activity stream (optional):
    if (p.activity.churchId)  io.to(`church:${p.activity.churchId}`).emit("activity:new", act);
    if (p.activity.districtId)io.to(`district:${p.activity.districtId}`).emit("activity:new", act);
    if (p.activity.nationalId)io.to(`national:${p.activity.nationalId}`).emit("activity:new", act);
  }

  return doc;
}
