// models/ContactAttempt.ts
import { Schema, model, Types, Document } from "mongoose";

export type Channel = "phone" | "sms" | "email" | "visit" | "whatsapp" | "in_person";
export type Outcome = "no_answer" | "left_voicemail" | "sent" | "connected" | "prayed" | "invited" | "committed" | "not_interested" | "wrong_number";

export interface IContactAttempt extends Document {
  caseId: Types.ObjectId;
  byUserId: Types.ObjectId;
  channel: Channel;
  content?: string;                 // message body or call notes
  outcome: Outcome;
  nextActionOn?: Date;              // optional schedule next follow-up
  createdAt: Date;
  updatedAt: Date;
}
const attemptSchema = new Schema<IContactAttempt>({
  caseId: { type: Schema.Types.ObjectId, ref: "FollowUpCase", required: true },
  byUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  channel: { type: String, enum: ["phone","sms","email","visit","whatsapp","in_person"], required: true },
  content: String,
  outcome: { type: String, enum: ["no_answer","left_voicemail","sent","connected","prayed","invited","committed","not_interested","wrong_number"], required: true },
  nextActionOn: Date,
}, { timestamps: true });

export default model<IContactAttempt>("ContactAttempt", attemptSchema);
