import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "../password-reset-form";

export const metadata: Metadata = { title: "Redefinir senha" };
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  if (!token) return <><h1 className="text-2xl font-bold tracking-tight">Link inválido</h1><p className="mb-6 mt-2 text-sm text-muted">Solicite um novo link para redefinir sua senha.</p><Link href="/recuperar-senha" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">Solicitar novo link</Link></>;
  return <><h1 className="text-2xl font-bold tracking-tight">Criar nova senha</h1><p className="mb-7 mt-2 text-sm text-muted">Escolha uma senha segura para voltar à plataforma.</p><ResetPasswordForm token={token} /></>;
}
