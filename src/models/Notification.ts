// src/models/Notification.ts
import { Schema, model, Types, Document } from "mongoose";

export type NotifScope = "user" | "church" | "district" | "national";
export type NotifKind =
  | "event.created" | "event.updated" | "event.commented"
  | "attendance.upserted"
  | "member.created" | "member.updated"
  | "system";

export interface INotification extends Document {
  kind: NotifKind;
  title: string;
  message?: string;
  actorId?: Types.ObjectId;        // who triggered it
  actorName?: string;
  link?: string;                   // deeplink (dashboard/events/123)
  scope: NotifScope;
  scopeRef?: Types.ObjectId;       // the church/district/national/user id
  recipients?: Types.ObjectId[];   // optional explicit users
  readBy: Types.ObjectId[];        // users who marked read
  createdAt: Date;
}

const schema = new Schema<INotification>({
  kind: { type: String, required: true, index: true },
  title: { type: String, required: true },
  message: String,
  actorId: { type: Schema.Types.ObjectId, ref: "User" },
  actorName: String,
  link: String,
  scope: { type: String, enum: ["user","church","district","national"], required: true },
  scopeRef: { type: Schema.Types.ObjectId },
  recipients: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
  readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.index({ scope: 1, scopeRef: 1, createdAt: -1 });
schema.index({ createdAt: -1 });

export default model<INotification>("Notification", schema);
