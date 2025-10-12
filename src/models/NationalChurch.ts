import mongoose, { Schema, Document } from "mongoose";

export interface INationalChurch extends Document {
  name: string;
  code: string; // e.g. "NC001"
  address: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
  nationalPastor: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const nationalChurchSchema = new Schema<INationalChurch>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zip: String,
    },
    nationalPastor: { type: String, required: true },
    contactEmail: String,
    contactPhone: String,
  },
  { timestamps: true }
);

export default mongoose.model<INationalChurch>(
  "NationalChurch",
  nationalChurchSchema
);
