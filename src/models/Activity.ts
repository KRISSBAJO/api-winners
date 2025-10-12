// src/models/Activity.ts
import { Schema, model, Types, Document } from "mongoose";

export type ActivityKind =
  | "event.created" | "event.updated" | "event.commented"
  | "attendance.upserted"
  | "member.created" | "member.updated";

export interface IActivity extends Document {
  kind: ActivityKind;
  verb: string;                    // human-readable
  actorId?: Types.ObjectId;
  actorName?: string;
  target?: { type: string; id?: string; name?: string };
  meta?: Record<string, any>;
  churchId?: Types.ObjectId;
  districtId?: Types.ObjectId;
  nationalId?: Types.ObjectId;
  createdAt: Date;
}

const schema = new Schema<IActivity>({
  kind: { type: String, required: true, index: true },
  verb: { type: String, required: true },
  actorId: { type: Schema.Types.ObjectId, ref: "User" },
  actorName: String,
  target: {
    type: { type: String },
    id: String,
    name: String,
  },
  meta: Schema.Types.Mixed,
  churchId: { type: Schema.Types.ObjectId, ref: "Church", index: true },
  districtId: { type: Schema.Types.ObjectId, ref: "District", index: true },
  nationalId: { type: Schema.Types.ObjectId, ref: "NationalChurch", index: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.index({ createdAt: -1 });

export default model<IActivity>("Activity", schema);
