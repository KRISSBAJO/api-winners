import { Schema, model, Types, Document } from "mongoose";

export type OccurrenceStatus = "scheduled" | "held" | "cancelled";

export interface IOccurrence extends Document {
  nationalChurchId?: Types.ObjectId;
  districtId?: Types.ObjectId;
  churchId: Types.ObjectId;

  groupId: Types.ObjectId;     // Group._id
  title?: string;
  startAt: Date;
  endAt?: Date;
  notes?: string;
  status: OccurrenceStatus;

  rrule?: string;              // optional future use
  locationOverride?: string;
  createdBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const occurrenceSchema = new Schema<IOccurrence>(
  {
    nationalChurchId: { type: Schema.Types.ObjectId, ref: "NationalChurch", index: true },
    districtId:       { type: Schema.Types.ObjectId, ref: "District", index: true },
    churchId:         { type: Schema.Types.ObjectId, ref: "Church", required: true, index: true },

    groupId:          { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    title:            String,
    startAt:          { type: Date, required: true, index: true },
    endAt:            Date,
    notes:            String,
    status:           { type: String, enum: ["scheduled","held","cancelled"], default: "scheduled", index: true },

    rrule:            String,
    locationOverride: String,
    createdBy:        { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default model<IOccurrence>("Occurrence", occurrenceSchema);
