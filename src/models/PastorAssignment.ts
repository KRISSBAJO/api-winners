import { Schema, model, Types } from "mongoose";
import { PastorTitles } from "./Pastor";

const PastorAssignmentSchema = new Schema(
  {
    pastorId: { type: Types.ObjectId, ref: "Pastor", required: true },

    // Where this assignment applies
    level: { type: String, enum: ["national", "district", "church"], required: true },
    nationalChurchId: { type: Types.ObjectId, ref: "NationalChurch" },
    districtId: { type: Types.ObjectId, ref: "District" },
    churchId: { type: Types.ObjectId, ref: "Church" },

    // Role at that level
    title: { type: String, enum: PastorTitles, required: true },

    // Dates
    startDate: { type: Date, required: true },
    endDate: { type: Date },      // when filled → historical

    // Audit
    createdBy: { type: Types.ObjectId, ref: "User" },
    endedBy: { type: Types.ObjectId, ref: "User" },
    reason: { type: String },     // transfer/promotion/etc

  },
  { timestamps: true }
);

PastorAssignmentSchema.index({ pastorId: 1, startDate: -1 });
PastorAssignmentSchema.index({ level: 1, nationalChurchId: 1, districtId: 1, churchId: 1 });

export default model("PastorAssignment", PastorAssignmentSchema);
