import { Schema, model, Types, Document } from "mongoose";

export type GroupType =
  | "cell" | "ministry" | "class" | "prayer" | "outreach" | "youth" | "women" | "men" | "seniors" | "other";

export type GroupVisibility = "public" | "members" | "private";
export type JoinPolicy = "request" | "invite" | "auto";

export interface IGroup extends Document {
  nationalChurchId?: Types.ObjectId;
  districtId?: Types.ObjectId;
  churchId: Types.ObjectId;

  type: GroupType;
  name: string;
  subtitle?: string;
  description?: string;
  coverUrl?: string;
  coverPublicId?: string;
  tags: string[];

  publicArea?: string;             // safe public label
  visibility: GroupVisibility;
  joinPolicy: JoinPolicy;

  // day of week group meets (if applicable)
  meetDay?: Date;
  meetTime?: string;

  address?: string;                 // private
  geo?: { type: "Point"; coordinates: [number, number] };

  leaders: Types.ObjectId[];        // Member ids
  members: Types.ObjectId[];        // Member ids
  capacity?: number;
  isActive: boolean;
  createdBy?: Types.ObjectId;       // User id

  createdAt: Date;
  updatedAt: Date;
}

const groupSchema = new Schema<IGroup>(
  {
    nationalChurchId: { type: Schema.Types.ObjectId, ref: "NationalChurch", index: true },
    districtId:       { type: Schema.Types.ObjectId, ref: "District", index: true },
    churchId:         { type: Schema.Types.ObjectId, ref: "Church", required: true, index: true },

    type:       { type: String, enum: ["cell","ministry","class","prayer","outreach","youth","women","men","seniors","other"], required: true, index: true },
    name:       { type: String, required: true, index: "text" },
    subtitle:   String,
    description:String,
    coverUrl:   String,
    coverPublicId: String,
    tags:       { type: [String], default: [] },

    publicArea: String,
    visibility: { type: String, enum: ["public","members","private"], default: "public", index: true },
    joinPolicy: { type: String, enum: ["request","invite","auto"], default: "request" },

    address:    String,
    geo:        { type: { type: String, enum: ["Point"] }, coordinates: { type: [Number], default: undefined } },

    meetDay:   Date,
    meetTime:  String,

    leaders:    [{ type: Schema.Types.ObjectId, ref: "Member" }],
    members:    [{ type: Schema.Types.ObjectId, ref: "Member" }],
    capacity:   Number,
    isActive:   { type: Boolean, default: true },

    createdBy:  { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

groupSchema.index({ geo: "2dsphere" });

export default model<IGroup>("Group", groupSchema);
