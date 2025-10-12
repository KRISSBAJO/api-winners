import mongoose, { Schema, Document } from "mongoose";

export interface IChurch extends Document {
  districtId: mongoose.Types.ObjectId;
  name: string;
  churchId: string; // short code like "WCN001"
  pastor: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
  contactEmail?: string;
  contactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const churchSchema = new Schema<IChurch>(
  {
    districtId: { type: Schema.Types.ObjectId, ref: "District", required: true },
    name: { type: String, required: true },
    churchId: { type: String, required: true, unique: true },
    pastor: { type: String, required: true },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zip: String,
    },
    contactEmail: String,
    contactPhone: String,
  },
  { timestamps: true }
);

export default mongoose.model<IChurch>("Church", churchSchema);
