import { Schema, model, Types } from "mongoose";

/** Titles you mentioned */
export const PastorTitles = [
  "Resident Pastor",
  "Assistant Resident Pastor",
  "Associate Pastor",
  "Youth Pastor",
  "Pastor", // generic/no title
] as const;
export type PastorTitle = typeof PastorTitles[number];

const PastorSchema = new Schema(
  {
    // Link to User (optional — if they also have a login)
    userId: { type: Types.ObjectId, ref: "User" },

    // Identity
    firstName: { type: String, required: true },
    middleName: { type: String },
    lastName: { type: String, required: true },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    phone: { type: String },
    email: { type: String },

    // Spiritual profile
    dateOfBirth: { type: Date },
    dateBornAgain: { type: Date },           // "got born again"
    dateBecamePastor: { type: Date },        // became pastor/ordained
    notes: { type: String },

    // Snapshot of current role/location (denormalized for quick filters)
    currentTitle: { type: String, enum: PastorTitles, default: "Pastor" },
    level: { type: String, enum: ["national", "district", "church"], required: true },
    nationalChurchId: { type: Types.ObjectId, ref: "NationalChurch" },
    districtId: { type: Types.ObjectId, ref: "District" },
    churchId: { type: Types.ObjectId, ref: "Church" },

    // Admin flags
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PastorSchema.index({ lastName: 1, firstName: 1 });
PastorSchema.index({ level: 1, nationalChurchId: 1, districtId: 1, churchId: 1 });
PastorSchema.index({ userId: 1 }, { sparse: true });

export default model("Pastor", PastorSchema);
