// models/FollowUpCadence.ts
import { Schema, model, Document } from "mongoose";

export interface ICadenceStep {
  offsetDays: number;               // when after case open/last step
  channel: "sms" | "email" | "phone" | "visit";
  templateKey?: string;             // link to templated content
  note?: string;
}
export interface IFollowUpCadence extends Document {
  name: string;                     // “Newcomer 7-30-60”
  type: "newcomer" | "absentee" | "evangelism" | "care";
  steps: ICadenceStep[];
  isActive: boolean;
  churchId: any;                    // optional per church cadence
}
const cadenceSchema = new Schema<IFollowUpCadence>({
  name: { type: String, required: true },
  type: { type: String, enum: ["newcomer","absentee","evangelism","care"], required: true },
  steps: [{
    offsetDays: Number,
    channel: { type: String, enum: ["sms","email","phone","visit"] },
    templateKey: String,
    note: String,
  }],
  isActive: { type: Boolean, default: true },
  churchId: { type: Schema.Types.ObjectId, ref: "Church" },
});
export default model<IFollowUpCadence>("FollowUpCadence", cadenceSchema);
