// models/FollowUpCase.ts
import { Schema, model, Types, Document } from "mongoose";

export type FollowUpType = "newcomer" | "absentee" | "evangelism" | "care";
export type FollowUpStatus = "open" | "in_progress" | "paused" | "resolved" | "archived";

export interface IFollowUpCase extends Document {
  memberId?: Types.ObjectId;        // known member
  prospect?: {
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    source?: string;               // street, small group, web form, fb ad, etc
  };
  churchId: Types.ObjectId;         // scope
  type: FollowUpType;
  status: FollowUpStatus;
  reason?: string;                  // e.g. "Missed 4 weeks", "First-time visitor", “Prayer request”
  lastSeenAt?: Date;                // for absentees
  openedBy: Types.ObjectId;         // staff user
  assignedTo?: Types.ObjectId;      // staff/volunteer user
  cadenceId?: Types.ObjectId;       // optional (see cadence below)
  currentStepIndex?: number;        // pointer in cadence steps
  engagementScore: number;          // up/down based on outcomes
  tags: string[];
  consent: { email?: boolean; sms?: boolean; call?: boolean; updatedAt?: Date };
  createdAt: Date;
  updatedAt: Date;
}
const followUpCaseSchema = new Schema<IFollowUpCase>({
  memberId: { type: Schema.Types.ObjectId, ref: "Member" },
  prospect: {
    firstName: String, lastName: String, email: String, phone: String, source: String,
  },
  churchId: { type: Schema.Types.ObjectId, ref: "Church", required: true },
  type: { type: String, enum: ["newcomer","absentee","evangelism","care"], required: true },
  status: { type: String, enum: ["open","in_progress","paused","resolved","archived"], default: "open" },
  reason: String,
  lastSeenAt: Date,
  openedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
  cadenceId: { type: Schema.Types.ObjectId, ref: "FollowUpCadence" },
  currentStepIndex: { type: Number, default: 0 },
  engagementScore: { type: Number, default: 0 },
  tags: [String],
  consent: { email: Boolean, sms: Boolean, call: Boolean, updatedAt: Date },
}, { timestamps: true });

export default model<IFollowUpCase>("FollowUpCase", followUpCaseSchema);
// Note: FollowUpCadence and FollowUpAction models would be defined similarly in their own files.