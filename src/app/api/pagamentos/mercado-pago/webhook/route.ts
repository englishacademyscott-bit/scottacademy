import { PaymentMethod, PaymentStatus, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMercadoPagoPayment, verifyMercadoPagoSignature } from "@/lib/mercado-pago";

function periodEnd(interval: "MENSAL" | "TRIMESTRAL" | "ANUAL") {
  const date = new Date();
  if (interval === "MENSAL") date.setMonth(date.getMonth() + 1);
  else if (interval === "TRIMESTRAL") date.setMonth(date.getMonth() + 3);
  else date.setFullYear(date.getFullYear() + 1);
  return date;
}

export async function POST(request: Request) {
  let body: { data?: { id?: string | number } };
  try { body = await request.json(); } catch { return Response.json({ error: "JSON inválido" }, { status: 400 }); }
  const dataId = String(body.data?.id ?? new URL(request.url).searchParams.get("data.id") ?? "");
  if (!dataId) return Response.json({ received: true });
  if (!verifyMercadoPagoSignature(request, dataId)) return Response.json({ error: "Assinatura inválida" }, { status: 401 });

  const external = await getMercadoPagoPayment(dataId);
  if (!external.external_reference) return Response.json({ received: true });
  const payment = await prisma.payment.findUnique({ where: { reference: external.external_reference } });
  if (!payment) return Response.json({ received: true });
  const status = external.status === "approved" ? PaymentStatus.PAGO : external.status === "refunded" || external.status === "charged_back" ? PaymentStatus.REEMBOLSADO : external.status === "rejected" || external.status === "cancelled" ? PaymentStatus.FALHOU : PaymentStatus.PENDENTE;
  const method = external.payment_method_id === "pix" ? PaymentMethod.PIX : PaymentMethod.CARTAO;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: payment.id }, data: { status, method, paidAt: status === PaymentStatus.PAGO ? new Date(external.date_approved ?? Date.now()) : payment.paidAt } });
    if (status === PaymentStatus.PAGO && external.metadata?.plan_id && external.metadata?.user_id === payment.studentId) {
      const plan = await tx.plan.findUnique({ where: { id: external.metadata.plan_id } });
      if (plan) await tx.subscription.upsert({ where: { userId: payment.studentId }, create: { userId: payment.studentId, planId: plan.id, status: SubscriptionStatus.ATIVA, currentPeriodEnd: periodEnd(plan.interval) }, update: { planId: plan.id, status: SubscriptionStatus.ATIVA, startedAt: new Date(), currentPeriodEnd: periodEnd(plan.interval), cancelledAt: null } });
    }
  });
  return Response.json({ received: true });
}
