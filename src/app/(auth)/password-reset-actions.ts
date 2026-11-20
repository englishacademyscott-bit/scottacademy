"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { createPasswordResetToken, verifyPasswordResetToken } from "@/lib/password-reset";
import { clearLoginFailures } from "@/lib/login-rate-limit";

export type PasswordResetState = { error?: string; success?: string };
const emailSchema = z.string().trim().email("Informe um e-mail válido.").max(254).transform((value) => value.toLowerCase());
const passwordSchema = z.string().min(8, "A senha precisa de pelo menos 8 caracteres.").max(72).refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Use uma senha de até 72 bytes.");

export async function requestPasswordReset(_state: PasswordResetState, form: FormData): Promise<PasswordResetState> {
  const parsed = emailSchema.safeParse(form.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "E-mail inválido." };
  const user = await prisma.user.findUnique({ where: { email: parsed.data }, select: { id: true, email: true, name: true, passwordHash: true } });
  if (user) {
    const token = createPasswordResetToken(user);
    const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const resetUrl = `${base}/redefinir-senha?token=${encodeURIComponent(token)}`;
    const result = await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
    if (!result.sent) {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      if (admins.length) await prisma.notification.createMany({ data: admins.map((admin) => ({ userId: admin.id, title: "Recuperação de senha pendente", body: `${user.name} (${user.email}) solicitou recuperação. Configure RESEND_API_KEY e EMAIL_FROM. Link temporário: ${resetUrl}`, href: "/app/admin/usuarios", read: false })) });
    }
  }
  return { success: "Se o e-mail estiver cadastrado, você receberá as instruções para criar uma nova senha." };
}

export async function resetPassword(_state: PasswordResetState, form: FormData): Promise<PasswordResetState> {
  const parsed = z.object({ token: z.string().min(20), password: passwordSchema, confirmPassword: z.string() }).refine((data) => data.password === data.confirmPassword, { message: "As senhas precisam ser iguais.", path: ["confirmPassword"] }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const user = await verifyPasswordResetToken(parsed.data.token);
  if (!user) return { error: "Este link é inválido ou expirou. Solicite uma nova recuperação." };
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(parsed.data.password, 12) } });
  await clearLoginFailures(user.email);
  redirect("/login?senha=redefinida");
}
