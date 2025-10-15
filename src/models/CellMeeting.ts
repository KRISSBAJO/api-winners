// src/models/CellMeeting.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICellMeeting extends Document {
  churchId: Types.ObjectId;
  cellId: Types.ObjectId;         // CellGroup._id
  title?: string;
  scheduledFor: Date;             // scheduled meeting date/time
  notes?: string;
  createdBy?: Types.ObjectId;     // User._id or Leader user id if you map
  status: "scheduled" | "held" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const cellMeetingSchema = new Schema<ICellMeeting>({
  churchId: { type: Schema.Types.ObjectId, ref: "Church", required: true, index: true },
  cellId:   { type: Schema.Types.ObjectId, ref: "CellGroup", required: true, index: true },
  title:    { type: String },
  scheduledFor: { type: Date, required: true },
  notes: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  status: { type: String, enum: ["scheduled", "held", "cancelled"], default: "scheduled" }
}, { timestamps: true });

export default mongoose.model<ICellMeeting>("CellMeeting", cellMeetingSchema);
