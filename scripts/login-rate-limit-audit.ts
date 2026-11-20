import {
  checkLoginLimit,
  clearLoginFailures,
  consumeDirectAuthRequest,
  recordLoginFailure,
} from "../src/lib/login-rate-limit";

const suffix = `${Date.now()}-${Math.random()}`;
const email = `audit-${suffix}@example.test`;
const origin = `audit-origin-${suffix}`;

for (let attempt = 1; attempt <= 4; attempt += 1) {
  const result = await recordLoginFailure(email, origin);
  if (result.retryAfterSeconds !== 0) throw new Error(`Bloqueio antecipado na tentativa ${attempt}.`);
}
await recordLoginFailure(email, origin);
const blocked = await checkLoginLimit(email, origin);
if (blocked.allowed || blocked.retryAfterSeconds < 60) throw new Error("Conta não foi bloqueada após cinco falhas.");

await clearLoginFailures(email);
const cleared = await checkLoginLimit(email, `${origin}-limpo`);
if (!cleared.allowed) throw new Error("Sucesso não limpou o bloqueio da conta.");

const directOrigin = `${origin}-direto`;
for (let attempt = 1; attempt <= 20; attempt += 1) {
  const result = await consumeDirectAuthRequest(directOrigin);
  if (!result.allowed) throw new Error(`Endpoint direto bloqueou antes do limite: ${attempt}.`);
}
const directBlocked = await consumeDirectAuthRequest(directOrigin);
if (directBlocked.allowed || directBlocked.retryAfterSeconds < 60) throw new Error("Endpoint direto não foi bloqueado.");

console.log("OK bloqueio por conta após 5 falhas");
console.log("OK limpeza da conta após autenticação válida");
console.log("OK proteção do endpoint direto após 20 requisições");
