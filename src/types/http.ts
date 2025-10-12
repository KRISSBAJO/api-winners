// src/types/http.ts
import { Request } from "express";
export interface AuthUser {
  id: string;
  role: string;
  churchId?: string;
  districtId?: string;
  nationalChurchId?: string;
}
export type AuthRequest = Request & { user: AuthUser };
