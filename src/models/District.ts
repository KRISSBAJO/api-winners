import mongoose, { Schema, Document } from "mongoose";

export interface IDistrict extends Document {
  nationalChurchId: mongoose.Types.ObjectId;
  name: string;
  code: string; // e.g. "D001"
  districtPastor: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const districtSchema = new Schema<IDistrict>(
  {
    nationalChurchId: {
      type: Schema.Types.ObjectId,
      ref: "NationalChurch",
      required: true,
    },
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    districtPastor: { type: String, required: true },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zip: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IDistrict>("District", districtSchema);
