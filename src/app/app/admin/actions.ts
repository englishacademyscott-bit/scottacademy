"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";

export type AdminActionResult =
  | { ok: true; message: string; temporaryPassword?: string }
  | { ok: false; error: string };

export async function changeUserRole(input: unknown): Promise<AdminActionResult> {
  const admin = await requireRole(["ADMIN"]);

  const parsed = z
    .object({ userId: z.string().min(1), role: z.nativeEnum(Role) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const { userId, role } = parsed.data;
  if (userId === admin.id) {
    return { ok: false, error: "Você não pode alterar o próprio papel." };
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) return { ok: false, error: "Usuário não encontrado." };

  await prisma.user.update({ where: { id: userId }, data: { role } });

  revalidatePath("/app/admin/usuarios");
  return { ok: true, message: "Papel atualizado com sucesso." };
}

function generatePassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = upper + lower + digits + symbols;
  const chars = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];
  for (let i = 0; i < 8; i++) chars.push(all[Math.floor(Math.random() * all.length)]);
  return chars.sort(() => Math.random() - 0.5).join("");
}

export async function resetUserPassword(input: unknown): Promise<AdminActionResult> {
  const admin = await requireRole(["ADMIN"]);

  const parsed = z.object({ userId: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Usuário inválido." };

  const { userId } = parsed.data;
  if (userId === admin.id) {
    return { ok: false, error: "Use a página de configurações para alterar a sua própria senha." };
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) return { ok: false, error: "Usuário não encontrado." };

  const temporaryPassword = generatePassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  revalidatePath("/app/admin/usuarios");
  return {
    ok: true,
    message: "Senha redefinida.",
    temporaryPassword,
  };
}
