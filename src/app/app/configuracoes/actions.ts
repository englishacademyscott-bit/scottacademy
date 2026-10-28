"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";

export type ConfigResult = { ok: true; message: string } | { ok: false; error: string };

const profileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo.").max(120, "Nome muito longo."),
  bio: z.string().trim().max(500, "Bio muito longa.").optional().nullable(),
  phone: z.string().trim().max(40, "Telefone inválido.").optional().nullable(),
  avatarUrl: z.string().trim().url("Informe uma URL válida.").max(500).optional().nullable().or(z.literal("")),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Informe a senha atual."),
  newPassword: z.string().min(6, "A nova senha precisa de ao menos 6 caracteres.").max(100),
});

export async function updateProfile(input: unknown): Promise<ConfigResult> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { name, bio, phone, avatarUrl } = parsed.data;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      bio: bio && bio.length > 0 ? bio : null,
      phone: phone && phone.length > 0 ? phone : null,
      avatarUrl: avatarUrl && avatarUrl.length > 0 ? avatarUrl : null,
    },
  });

  revalidatePath("/app/configuracoes");
  return { ok: true, message: "Perfil atualizado." };
}

export async function changePassword(input: unknown): Promise<ConfigResult> {
  const user = await requireUser();

  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { currentPassword, newPassword } = parsed.data;

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!record) return { ok: false, error: "Usuário não encontrado." };

  const valid = await bcrypt.compare(currentPassword, record.passwordHash);
  if (!valid) return { ok: false, error: "Senha atual incorreta." };

  if (currentPassword === newPassword) {
    return { ok: false, error: "A nova senha precisa ser diferente da atual." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  revalidatePath("/app/configuracoes");
  return { ok: true, message: "Senha alterada com sucesso." };
}

/**
 * O schema de User não possui campos de preferências.
 * A preferência "receber novidades" é persistida como uma Notification
 * com título fixo (PREFERENCIA: receber novidades) vinculada ao próprio usuário.
 */
const NEWSLETTER_TITLE = "PREFERENCIA: receber novidades";

export async function updatePreferences(input: unknown): Promise<ConfigResult> {
  const user = await requireUser();

  const parsed = z
    .object({ newsletter: z.boolean() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Preferências inválidas." };

  const existing = await prisma.notification.findFirst({
    where: { userId: user.id, title: NEWSLETTER_TITLE },
  });

  if (parsed.data.newsletter) {
    if (existing) {
      await prisma.notification.update({ where: { id: existing.id }, data: { body: "ATIVO", read: true } });
    } else {
      await prisma.notification.create({
        data: { userId: user.id, title: NEWSLETTER_TITLE, body: "ATIVO", href: "/app/configuracoes", read: true },
      });
    }
  } else if (existing) {
    await prisma.notification.delete({ where: { id: existing.id } });
  }

  revalidatePath("/app/configuracoes");
  return { ok: true, message: "Preferências salvas." };
}
