// models/Event.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IComment {
  _id?: Types.ObjectId;
  author: Types.ObjectId;
  authorName?: string;
  text: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IEvent extends Document {
  churchId: Types.ObjectId;
  title: string;
  description?: string;
  type: "Service" | "BibleStudy" | "Conference" | "Outreach" | "Meeting";
  startDate: Date;
  endDate?: Date;
  location?: string;
  visibility: "public" | "private" | "unlisted";
  tags?: string[];
  cover?: { url: string; publicId: string };
  likeCount: number;
  commentCount: number;
  likes: Types.ObjectId[];
  comments: IComment[];
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    churchId: { type: Schema.Types.ObjectId, ref: "Church", required: true, index: true },
    title: { type: String, required: true, index: true },
    description: String,
    type: { type: String, enum: ["Service", "BibleStudy", "Conference", "Outreach", "Meeting"], required: true, index: true },
    startDate: { type: Date, required: true, index: true },
    endDate: Date,
    location: String,
    visibility: { type: String, enum: ["public", "private", "unlisted"], default: "public", index: true },
    tags: [{ type: String, index: true }],
    cover: { url: String, publicId: String },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    comments: [
      {
        author: { type: Schema.Types.ObjectId, ref: "User", required: true },
        authorName: String,
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: Date,
      },
    ],
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Optional full-text
eventSchema.index({ title: "text", description: "text", tags: "text", location: "text" });

export default mongoose.model<IEvent>("Event", eventSchema);
