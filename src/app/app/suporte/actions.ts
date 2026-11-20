"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";

export type SupportResult = { ok: true; message: string } | { ok: false; error: string };

function protocol() {
  return `SEA-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

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
  const ticket = protocol();

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  if (admins.length === 0) {
    return { ok: false, error: "Nenhum administrador disponível no momento." };
  }

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      title: `Suporte [${ticket}]: ${subject}`,
      body: `${user.name} (${user.email}) [usuário:${user.id}]: ${message}`,
      href: `/app/suporte?ticket=${encodeURIComponent(ticket)}`,
      read: false,
    })),
  });

  revalidatePath("/app/suporte");
  return { ok: true, message: `Solicitação registrada. Protocolo: ${ticket}` };
}

const replySchema = z.object({
  userId: z.string().min(1),
  ticket: z.string().min(5).max(40),
  message: z.string().trim().min(3).max(4000),
});

export async function replySupportMessage(form: FormData) {
  const admin = await requireUser();
  if (admin.role !== "ADMIN") return;
  const parsed = replySchema.safeParse({ userId: form.get("userId"), ticket: form.get("ticket"), message: form.get("message") });
  if (!parsed.success) return;
  await prisma.notification.create({ data: { userId: parsed.data.userId, title: `Resposta do suporte [${parsed.data.ticket}]`, body: parsed.data.message, href: "/app/suporte" } });
  await prisma.notification.updateMany({ where: { userId: admin.id, title: { contains: `[${parsed.data.ticket}]` } }, data: { read: true } });
  revalidatePath("/app/suporte");
}
