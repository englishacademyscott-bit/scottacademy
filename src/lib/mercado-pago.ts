import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.mercadopago.com";

function accessToken() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado.");
  return token;
}

async function mercadoPagoRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken()}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!response.ok) {
    const details = await response.text();
    console.error("Mercado Pago respondeu com erro", response.status, details.slice(0, 500));
    throw new Error("Não foi possível iniciar o pagamento.");
  }
  return response.json() as Promise<T>;
}

export async function createCheckoutPreference(input: { reference: string; title: string; description: string; amountCents: number; payerEmail: string; userId: string; planId: string }) {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const result = await mercadoPagoRequest<{ id: string; init_point: string; sandbox_init_point?: string }>("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: [{ id: input.planId, title: input.title, description: input.description, quantity: 1, currency_id: "BRL", unit_price: input.amountCents / 100 }],
      payer: { email: input.payerEmail },
      external_reference: input.reference,
      metadata: { user_id: input.userId, plan_id: input.planId },
      back_urls: { success: `${base}/app/assinatura?pagamento=sucesso`, pending: `${base}/app/assinatura?pagamento=pendente`, failure: `${base}/app/assinatura?pagamento=falhou` },
      auto_return: "approved",
      notification_url: `${base}/api/pagamentos/mercado-pago/webhook`,
      statement_descriptor: "SCOTT ENGLISH",
    }),
  });
  return { checkoutUrl: process.env.MERCADO_PAGO_SANDBOX === "true" && result.sandbox_init_point ? result.sandbox_init_point : result.init_point };
}

export async function getMercadoPagoPayment(id: string) {
  return mercadoPagoRequest<{ id: number; status: string; external_reference?: string; payment_method_id?: string; date_approved?: string; metadata?: { user_id?: string; plan_id?: string } }>(`/v1/payments/${encodeURIComponent(id)}`);
}

export function verifyMercadoPagoSignature(request: Request, dataId: string) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const signature = request.headers.get("x-signature") ?? "";
  const requestId = request.headers.get("x-request-id") ?? "";
  const parts = Object.fromEntries(signature.split(",").map((part) => part.trim().split("=")).filter((part) => part.length === 2));
  const ts = parts.ts;
  const supplied = parts.v1;
  if (!ts || !supplied || !requestId) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
