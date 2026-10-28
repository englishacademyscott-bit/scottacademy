"use server";

import { revalidatePath } from "next/cache";
import { PaymentMethod, PaymentStatus, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";

export type SubscribeResult = { ok: true; message: string } | { ok: false; error: string };

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

/**
 * MVP SIMULADO: não há gateway de pagamento integrado.
 * A action apenas registra/atualiza a assinatura do aluno e cria um Payment com status PAGO.
 */
export async function subscribeToPlan(planId: string): Promise<SubscribeResult> {
  const user = await requireUser();

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return { ok: false, error: "Plano não encontrado." };
  if (!plan.active) return { ok: false, error: "Este plano não está disponível." };

  const current = await prisma.subscription.findUnique({ where: { userId: user.id } });
  if (current && current.planId === planId && current.status === SubscriptionStatus.ATIVA) {
    return { ok: false, error: "Você já está neste plano." };
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
  return { ok: true, message: `Plano ${plan.name} ativado (simulação).` };
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
