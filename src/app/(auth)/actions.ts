"use server";

import { AuthError } from "next-auth";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/auth-redirect";
import {
  checkLoginLimit,
  clearLoginFailures,
  loginOrigin,
  recordLoginFailure,
} from "@/lib/login-rate-limit";

export type AuthFormState = { error?: string };
const emailSchema = z.string().trim().email("Informe um e-mail válido.").max(254).transform(v => v.toLowerCase());
const passwordSchema = z.string().min(6, "A senha precisa de pelo menos 6 caracteres.").max(72, "A senha pode ter até 72 caracteres.").refine(v => Buffer.byteLength(v, "utf8") <= 72, "Use uma senha de até 72 bytes.");

function blockedMessage(seconds: number) {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `Muitas tentativas de acesso. Tente novamente em ${minutes} minuto${minutes === 1 ? "" : "s"}.`;
}

export async function login(_state: AuthFormState, form: FormData): Promise<AuthFormState> {
  const parsed = z.object({ email: emailSchema, password: passwordSchema }).safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados informados." };
  const origin = loginOrigin(await headers());
  const limit = await checkLoginLimit(parsed.data.email, origin);
  if (!limit.allowed) return { error: blockedMessage(limit.retryAfterSeconds) };

  try {
    // redirect: false evita o redirecionamento automático do signIn, para que
    // a verificação de credenciais aconteça uma única vez (dentro de authorize()).
    await signIn("credentials", { ...parsed.data, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      const failure = await recordLoginFailure(parsed.data.email, origin);
      await new Promise((resolve) => setTimeout(resolve, failure.delayMs));
      if (failure.retryAfterSeconds > 0) return { error: blockedMessage(failure.retryAfterSeconds) };
      return { error: "E-mail ou senha incorretos." };
    }
    throw error;
  }

  await clearLoginFailures(parsed.data.email);
  redirect(safeCallbackUrl(form.get("callbackUrl")));
}

export async function register(_state: AuthFormState, form: FormData): Promise<AuthFormState> {
  const parsed = z.object({
    name: z.string().trim().min(2, "Informe seu nome completo.").max(120),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  }).refine(data => data.password === data.confirmPassword, { message: "As senhas precisam ser iguais.", path: ["confirmPassword"] }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados informados." };
  try {
    await prisma.user.create({ data: { name: parsed.data.name, email: parsed.data.email, passwordHash: await bcrypt.hash(parsed.data.password, 12), role: "ALUNO" } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "Este e-mail já está cadastrado. Entre com sua conta." };
    console.error("Falha ao cadastrar usuário.", error instanceof Error ? error.name : "unknown");
    return { error: "Não foi possível criar a conta. Tente novamente em instantes." };
  }
  redirect("/login?cadastro=sucesso");
}
