"use server";

import { revalidatePath } from "next/cache";
import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";

export type RefundResult = { ok: true; message: string } | { ok: false; error: string };

export async function refundPayment(paymentId: string): Promise<RefundResult> {
  await requireRole(["ADMIN"]);

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return { ok: false, error: "Pagamento não encontrado." };
  if (payment.status === PaymentStatus.REEMBOLSADO) {
    return { ok: false, error: "Este pagamento já está registrado como reembolsado." };
  }
  if (payment.status !== PaymentStatus.PAGO) {
    return { ok: false, error: "Somente pagamentos com status Pago podem ser registrados como reembolsados." };
  }

  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: PaymentStatus.REEMBOLSADO },
  });

  revalidatePath("/app/pagamentos");
  revalidatePath("/app/assinatura");
  return { ok: true, message: "Reembolso registrado na plataforma. Confirme a operação no provedor de pagamento." };
}
