// models/MessageTemplate.ts
import { Schema, model, Document } from "mongoose";

export interface IMessageTemplate extends Document {
  key: string;                 // "newcomer_day1_sms"
  channel: "sms" | "email";
  subject?: string;
  body: string;                // supports {{firstName}} etc
  churchId?: any;
}
const templateSchema = new Schema<IMessageTemplate>({
  key: { type: String, unique: true, required: true },
  channel: { type: String, enum: ["sms","email"], required: true },
  subject: String,
  body: { type: String, required: true },
  churchId: { type: Schema.Types.ObjectId, ref: "Church" },
});
export default model<IMessageTemplate>("MessageTemplate", templateSchema);
