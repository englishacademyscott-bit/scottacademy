const required = ["DATABASE_URL", "AUTH_SECRET", "APP_URL"];
const missing = required.filter((key) => !process.env[key]);
const weak = [];
if ((process.env.AUTH_SECRET ?? "").length < 32) weak.push("AUTH_SECRET deve ter ao menos 32 caracteres");
if (process.env.NODE_ENV === "production" && process.env.PAYMENT_PROVIDER === "mercadopago") {
  for (const key of ["MERCADO_PAGO_ACCESS_TOKEN", "MERCADO_PAGO_WEBHOOK_SECRET"]) if (!process.env[key]) missing.push(key);
}
if (process.env.NODE_ENV === "production" && !process.env.RESEND_API_KEY) weak.push("RESEND_API_KEY ausente: a recuperação de senha dependerá da caixa interna dos administradores");
if (missing.length || weak.length) {
  for (const item of missing) console.error(`ERRO: variável obrigatória ausente: ${item}`);
  for (const item of weak) console.error(`AVISO: ${item}`);
  if (missing.length || weak.some((item) => item.startsWith("AUTH_SECRET"))) process.exit(1);
}
console.log("Configuração essencial validada.");
