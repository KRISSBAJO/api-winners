// src/models/Notification.ts
import { Schema, model, Types, Document } from "mongoose";
import { NOTIF_KINDS, type NotifKind } from "./notificationKinds";

export type NotifScope = "user" | "church" | "district" | "national";

export interface INotification extends Document {
  kind: NotifKind;
  title: string;
  message?: string;
  actorId?: Types.ObjectId;
  actorName?: string;
  link?: string;
  scope: NotifScope;
  scopeRef?: Types.ObjectId;
  recipients?: Types.ObjectId[];
  readBy: Types.ObjectId[];
  createdAt: Date;
}

const schema = new Schema<INotification>({
  kind: { type: String, required: true, index: true, enum: NOTIF_KINDS },
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
