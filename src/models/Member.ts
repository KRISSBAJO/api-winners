import mongoose, { Schema, Document } from "mongoose";

export interface IMember extends Document {
  churchId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  middleName?: string;
  gender?: "Male" | "Female" | "Other";
  dob?: Date;
  maritalStatus?: "Single" | "Married" | "Divorced" | "Widowed";
  spouseName?: string;
  weddingAnniversary?: Date;

  email?: string;
  phone?: string;
  altPhone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };

  salvationDate?: Date;
  baptismDate?: Date;
  holyGhostBaptism?: boolean;
  membershipStatus: "Active" | "Visitor" | "New Convert" | "Inactive";
  joinDate?: Date;
  invitedBy?: string;

  role?: string;
  volunteerGroups?: string[];
  isLeader?: boolean;

  familyId?: string;
  household?: {
    spouse?: string;
    children?: { name: string; dob?: Date }[];
    dependents?: string[];
  };

  photoUrl?: string;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const memberSchema = new Schema<IMember>(
  {
    churchId: { type: Schema.Types.ObjectId, ref: "Church", required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    middleName: String,
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    dob: Date,
    maritalStatus: {
      type: String,
      enum: ["Single", "Married", "Divorced", "Widowed"],
    },
    spouseName: String,
    weddingAnniversary: Date,

    email: String,
    phone: String,
    altPhone: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zip: String,
    },

    salvationDate: Date,
    baptismDate: Date,
    holyGhostBaptism: { type: Boolean, default: false },
    membershipStatus: {
      type: String,
      enum: ["Active", "Visitor", "New Convert", "Inactive"],
      default: "Active",
    },
    joinDate: Date,
    invitedBy: String,

    role: String,
    volunteerGroups: [String],
    isLeader: { type: Boolean, default: false },

    familyId: String,
    household: {
      spouse: String,
      children: [{ name: String, dob: Date }],
      dependents: [String],
    },

    photoUrl: String,
    notes: String,
  },
  { timestamps: true }
);

export default mongoose.model<IMember>("Member", memberSchema);
