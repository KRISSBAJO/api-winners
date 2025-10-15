// src/models/CellAttendanceReport.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICellAttendanceReport extends Document {
  nationalChurchId?: Types.ObjectId;
  districtId?: Types.ObjectId;
  churchId: Types.ObjectId;
  cellId: Types.ObjectId;         // CellGroup._id
  meetingId?: Types.ObjectId;     // CellMeeting._id (optional if ad-hoc)
  date: Date;                     // meeting date (when held)
  totals: {
    men: number;
    women: number;
    children: number;
    firstTimers: number;
    newConverts: number;
  };
  presentMemberIds: Types.ObjectId[]; // Member._id[]
  submittedBy: Types.ObjectId;        // User._id
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
}

const cellAttendanceReportSchema = new Schema<ICellAttendanceReport>(
  {
    nationalChurchId: { type: Schema.Types.ObjectId, ref: "NationalChurch", index: true },
    districtId:       { type: Schema.Types.ObjectId, ref: "District", index: true },
    churchId:         { type: Schema.Types.ObjectId, ref: "Church", required: true, index: true },
    cellId:           { type: Schema.Types.ObjectId, ref: "CellGroup", required: true, index: true },
    meetingId:        { type: Schema.Types.ObjectId, ref: "CellMeeting" },
    date:             { type: Date, required: true, index: true },
    totals: {
      men:         { type: Number, default: 0 },
      women:       { type: Number, default: 0 },
      children:    { type: Number, default: 0 },
      firstTimers: { type: Number, default: 0 },
      newConverts: { type: Number, default: 0 },
    },
    presentMemberIds: [{ type: Schema.Types.ObjectId, ref: "Member" }],
    submittedBy:      { type: Schema.Types.ObjectId, ref: "User", required: true },
    comments:         { type: String },
  },
  { timestamps: true }
);

/**
 * Enforce: ONE report per MEETING per CELLGROUP
 * - If meetingId is present, only a single report can exist for that (cellId, meetingId) pair.
 * - Partial index makes it apply only when meetingId exists (ad-hoc reports without meetingId aren’t blocked).
 */
cellAttendanceReportSchema.index(
  { cellId: 1, meetingId: 1 },
  { unique: true, partialFilterExpression: { meetingId: { $exists: true, $ne: null } } }
);

export default mongoose.model<ICellAttendanceReport>("CellAttendanceReport", cellAttendanceReportSchema);
