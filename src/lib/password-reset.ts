import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

type ResetPayload = { userId: string; email: string; expiresAt: number; passwordVersion: string };
const TOKEN_LIFETIME_MS = 30 * 60 * 1000;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET não configurado.");
  return value;
}

function passwordVersion(hash: string) {
  return createHmac("sha256", secret()).update(hash).digest("base64url").slice(0, 20);
}

function signature(data: string) {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function createPasswordResetToken(user: { id: string; email: string; passwordHash: string }) {
  const payload: ResetPayload = {
    userId: user.id,
    email: user.email,
    expiresAt: Date.now() + TOKEN_LIFETIME_MS,
    passwordVersion: passwordVersion(user.passwordHash),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export async function verifyPasswordResetToken(token: string) {
  const [encoded, suppliedSignature] = token.split(".");
  if (!encoded || !suppliedSignature) return null;
  const expected = signature(encoded);
  const suppliedBuffer = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;

  let payload: ResetPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as ResetPayload;
  } catch {
    return null;
  }
  if (!payload.userId || !payload.email || payload.expiresAt < Date.now()) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, passwordHash: true },
  });
  if (!user || user.email !== payload.email || passwordVersion(user.passwordHash) !== payload.passwordVersion) return null;
  return user;
}
