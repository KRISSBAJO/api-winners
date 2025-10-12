// src/utils/selfreg-jwt.ts
import jwt, { Secret, SignOptions, JwtPayload } from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

/**
 * Load secret safely and narrow type
 */
const secretValue = process.env.JWT_SELFREG_SECRET ?? process.env.JWT_SECRET;

if (!secretValue) {
  console.error("❌ JWT secret not found. Check your .env configuration.");
  throw new Error("Missing JWT_SELFREG_SECRET or JWT_SECRET in environment");
}

// ✅ Narrow type AFTER runtime check
const SECRET = secretValue as Secret;

/**
 * TTL (time to live)
 */
const rawTtl = process.env.SELFREG_TOKEN_TTL ?? "7d";
const TTL: SignOptions["expiresIn"] =
  /^\d+$/.test(String(rawTtl)) ? Number(rawTtl) : (rawTtl as SignOptions["expiresIn"]);

/**
 * Payload structure
 */
export type SelfRegPayload = {
  email: string;
  churchId: string;
  kind: "short" | "long";
  invitedBy?: string;
};

/**
 * Create a signed registration token
 */
export function signSelfRegToken(data: SelfRegPayload): string {
  const opts: SignOptions = { algorithm: "HS256", expiresIn: TTL };
  return jwt.sign({ ...data }, SECRET, opts);
}

/**
 * Verify a registration token and extract payload
 */
export function verifySelfRegToken(token: string): SelfRegPayload {
  const decoded = jwt.verify(token, SECRET) as JwtPayload & Partial<SelfRegPayload>;
  return {
    email: decoded.email!,
    churchId: decoded.churchId!,
    kind: decoded.kind as "short" | "long",
    invitedBy: decoded.invitedBy,
  };
}
