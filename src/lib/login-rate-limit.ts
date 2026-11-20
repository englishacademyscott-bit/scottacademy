import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const ACCOUNT_LIMIT = 5;
const ORIGIN_FAILURE_LIMIT = 30;
const DIRECT_REQUEST_LIMIT = 20;
const BLOCK_MS = 15 * 60 * 1000;

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function key(kind: "account" | "origin" | "direct", value: string) {
  return `${kind}:${digest(value.trim().toLowerCase())}`;
}

// Persistido no banco (tabela LoginAttempt) para que o limite valha para
// todas as instâncias da aplicação e sobreviva a reinícios/redeploys.
async function currentEntry(storageKey: string, now = Date.now()) {
  const existing = await prisma.loginAttempt.findUnique({ where: { key: storageKey } });
  if (!existing || now - existing.windowStartedAt.getTime() >= WINDOW_MS) {
    return prisma.loginAttempt.upsert({
      where: { key: storageKey },
      create: { key: storageKey, failures: 0, windowStartedAt: new Date(now), blockedUntil: null },
      update: { failures: 0, windowStartedAt: new Date(now), blockedUntil: null },
    });
  }
  return existing;
}

function remainingSeconds(entry: { blockedUntil: Date | null }, now = Date.now()) {
  if (!entry.blockedUntil) return 0;
  return Math.max(0, Math.ceil((entry.blockedUntil.getTime() - now) / 1000));
}

async function increment(storageKey: string, limit: number, now = Date.now()) {
  const entry = await currentEntry(storageKey, now);
  const failures = entry.failures + 1;
  const blockedUntil = failures >= limit
    ? new Date(Math.max(entry.blockedUntil?.getTime() ?? 0, now + BLOCK_MS))
    : entry.blockedUntil;
  return prisma.loginAttempt.update({
    where: { key: storageKey },
    data: { failures, blockedUntil },
  });
}

export function loginOrigin(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = headers.get("x-real-ip")?.trim();
  return (forwarded || real || "origem-desconhecida").slice(0, 128);
}

export async function checkLoginLimit(email: string, origin: string) {
  const now = Date.now();
  const account = await currentEntry(key("account", email), now);
  const source = await currentEntry(key("origin", origin), now);
  const retryAfterSeconds = Math.max(
    remainingSeconds(account, now),
    remainingSeconds(source, now),
  );
  return { allowed: retryAfterSeconds === 0, retryAfterSeconds };
}

export async function recordLoginFailure(email: string, origin: string) {
  const account = await increment(key("account", email), ACCOUNT_LIMIT);
  const source = await increment(key("origin", origin), ORIGIN_FAILURE_LIMIT);
  const failures = Math.max(account.failures, source.failures);
  return {
    retryAfterSeconds: Math.max(remainingSeconds(account), remainingSeconds(source)),
    delayMs: Math.min(2000, 250 * 2 ** Math.min(3, Math.max(0, failures - 1))),
  };
}

export async function clearLoginFailures(email: string) {
  await prisma.loginAttempt.deleteMany({ where: { key: key("account", email) } });
}

/** Protege também chamadas diretas ao endpoint do Auth.js, fora do formulário. */
export async function consumeDirectAuthRequest(origin: string) {
  const storageKey = key("direct", origin);
  const entry = await currentEntry(storageKey);
  if (remainingSeconds(entry) > 0) {
    return { allowed: false, retryAfterSeconds: remainingSeconds(entry) };
  }
  const updated = await increment(storageKey, DIRECT_REQUEST_LIMIT);
  const retryAfterSeconds = remainingSeconds(updated);
  return {
    allowed: updated.failures <= DIRECT_REQUEST_LIMIT,
    retryAfterSeconds,
  };
}
