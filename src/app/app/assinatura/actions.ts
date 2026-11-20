"use server";

import { revalidatePath } from "next/cache";
import { PaymentMethod, PaymentStatus, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { createCheckoutPreference } from "@/lib/mercado-pago";

export type SubscribeResult =
  | { ok: true; message: string; redirectUrl?: string }
  | { ok: false; error: string };

function periodEndFor(interval: "MENSAL" | "TRIMESTRAL" | "ANUAL") {
  const end = new Date();
  if (interval === "MENSAL") end.setMonth(end.getMonth() + 1);
  else if (interval === "TRIMESTRAL") end.setMonth(end.getMonth() + 3);
  else end.setFullYear(end.getFullYear() + 1);
  return end;
}

function reference(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export async function subscribeToPlan(planId: string): Promise<SubscribeResult> {
  const user = await requireUser();

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return { ok: false, error: "Plano não encontrado." };
  if (!plan.active) return { ok: false, error: "Este plano não está disponível." };

  const current = await prisma.subscription.findUnique({ where: { userId: user.id } });
  if (current && current.planId === planId && current.status === SubscriptionStatus.ATIVA) {
    return { ok: false, error: "Você já está neste plano." };
  }

  if (process.env.PAYMENT_PROVIDER === "mercadopago") {
    const payment = await prisma.payment.create({
      data: {
        studentId: user.id,
        amountCents: plan.priceCents,
        status: PaymentStatus.PENDENTE,
        method: PaymentMethod.PIX,
        reference: reference("SEA-MP"),
        description: `Assinatura ${plan.name} — Scott English Academy`,
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    try {
      const preference = await createCheckoutPreference({
        reference: payment.reference,
        title: payment.description,
        description: `Plano ${plan.name}`,
        amountCents: payment.amountCents,
        payerEmail: user.email,
        userId: user.id,
        planId: plan.id,
      });
      revalidatePath("/app/pagamentos");
      return {
        ok: true,
        message: "Checkout seguro preparado. Você será direcionado ao Mercado Pago.",
        redirectUrl: preference.checkoutUrl,
      };
    } catch (error) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FALHOU } });
      console.error("Falha ao criar checkout do Mercado Pago", error);
      return { ok: false, error: "Não foi possível iniciar o pagamento. Tente novamente em instantes." };
    }
  }

  const periodEnd = periodEndFor(plan.interval);

  await prisma.$transaction(async (tx) => {
    if (current) {
      await tx.subscription.update({
        where: { id: current.id },
        data: { planId: plan.id, status: SubscriptionStatus.ATIVA, startedAt: new Date(), currentPeriodEnd: periodEnd, cancelledAt: null },
      });
    } else {
      await tx.subscription.create({
        data: { userId: user.id, planId: plan.id, status: SubscriptionStatus.ATIVA, currentPeriodEnd: periodEnd },
      });
    }

    await tx.payment.create({
      data: {
        studentId: user.id,
        amountCents: plan.priceCents,
        status: PaymentStatus.PAGO,
        method: PaymentMethod.CARTAO,
        reference: reference("SEA"),
        description: `Assinatura ${plan.name} — Scott English Academy`,
        paidAt: new Date(),
        dueAt: new Date(),
      },
    });
  });

  revalidatePath("/app/assinatura");
  revalidatePath("/app/pagamentos");
  return { ok: true, message: `Plano ${plan.name} ativado no ambiente de demonstração.` };
}

export async function cancelSubscription(): Promise<SubscribeResult> {
  const user = await requireUser();

  const current = await prisma.subscription.findUnique({ where: { userId: user.id } });
  if (!current) return { ok: false, error: "Você não possui assinatura ativa." };
  if (current.status === SubscriptionStatus.CANCELADA) {
    return { ok: false, error: "Sua assinatura já está cancelada." };
  }

  await prisma.subscription.update({
    where: { id: current.id },
    data: { status: SubscriptionStatus.CANCELADA, cancelledAt: new Date() },
  });

  revalidatePath("/app/assinatura");
  return { ok: true, message: "Assinatura cancelada. Você mantém o acesso até o fim do período." };
}
