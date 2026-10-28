"use server";

import { AuthError } from "next-auth";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/auth-redirect";

export type AuthFormState = { error?: string };
const emailSchema = z.string().trim().email("Informe um e-mail válido.").max(254).transform(v => v.toLowerCase());
const passwordSchema = z.string().min(6, "A senha precisa de pelo menos 6 caracteres.").max(72, "A senha pode ter até 72 caracteres.").refine(v => Buffer.byteLength(v, "utf8") <= 72, "Use uma senha de até 72 bytes.");

export async function login(_state: AuthFormState, form: FormData): Promise<AuthFormState> {
  const parsed = z.object({ email: emailSchema, password: passwordSchema }).safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados informados." };
  try {
    await signIn("credentials", { ...parsed.data, redirectTo: safeCallbackUrl(form.get("callbackUrl")) });
  } catch (error) {
    if (error instanceof AuthError) return { error: error.type === "CredentialsSignin" ? "E-mail ou senha incorretos." : "Não foi possível entrar. Tente novamente em instantes." };
    throw error;
  }
  return {};
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
