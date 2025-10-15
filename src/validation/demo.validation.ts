import { z } from "zod";

export const publicDemoCreateSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  church: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  interests: z.array(z.string()).optional().default([]),
  goals: z.string().optional().nullable(),
  timeframe: z.string().optional().nullable(),
  budget: z.string().optional().nullable(),
  demoPref: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  consent: z.boolean(),
  // optional extras for anti-abuse/telemetry
  source: z.string().optional(),
});

export const adminUpdateSchema = z.object({
  status: z.enum(["new","in_review","scheduled","won","lost"]).optional(),
  ownerId: z.string().optional(),
  adminNotes: z.string().optional(),
});
