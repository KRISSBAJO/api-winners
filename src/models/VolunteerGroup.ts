import mongoose, { Schema, Document } from "mongoose";

export interface IVolunteerGroup extends Document {
  churchId: mongoose.Types.ObjectId | string;
  name: string;
  description?: string;
  leaderId?: mongoose.Types.ObjectId | string;
  members: (mongoose.Types.ObjectId | string)[];
  createdAt: Date;
  updatedAt: Date;
}

const groupSchema = new Schema<IVolunteerGroup>(
  {
    churchId: { type: Schema.Types.ObjectId, ref: "Church", required: true },
    name: { type: String, required: true },
    description: String,
    leaderId: { type: Schema.Types.ObjectId, ref: "Member" },
    members: [{ type: Schema.Types.ObjectId, ref: "Member" }],
  },
  { timestamps: true }
);

export default mongoose.model<IVolunteerGroup>("VolunteerGroup", groupSchema);
