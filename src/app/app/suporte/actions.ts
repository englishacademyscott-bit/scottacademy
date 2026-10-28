"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";

export type SupportResult = { ok: true; message: string } | { ok: false; error: string };

const supportSchema = z.object({
  subject: z.string().trim().min(3, "Informe um assunto.").max(120, "Assunto muito longo."),
  message: z.string().trim().min(10, "Descreva sua dúvida com pelo menos 10 caracteres.").max(4000, "Mensagem muito longa."),
});

/**
 * A mensagem do aluno é registrada como Notification para todos os administradores
 * da plataforma (o schema não possui um modelo de ticket de suporte).
 */
export async function sendSupportMessage(input: unknown): Promise<SupportResult> {
  const user = await requireUser();

  const parsed = supportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Mensagem inválida." };
  }

  const { subject, message } = parsed.data;

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  if (admins.length === 0) {
    return { ok: false, error: "Nenhum administrador disponível no momento." };
  }

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      title: `Suporte: ${subject}`,
      body: `${user.name ?? user.email}: ${message}`,
      href: "/app/suporte",
      read: false,
    })),
  });

  revalidatePath("/app/suporte");
  return { ok: true, message: "Mensagem enviada ao time de suporte. Responderemos em breve." };
}
