import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/auth-redirect";
import { AuthForm } from "../auth-form";
import { LoginVaultHeader } from "../vault-seal";
export const metadata: Metadata = { title: "Entrar" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  if ((await auth())?.user) redirect(callbackUrl);
  return <><LoginVaultHeader /><h1 className="text-2xl font-bold tracking-tight">Bom ter você de volta</h1><p className="mb-7 mt-2 text-sm text-muted">Entre para continuar seu aprendizado.</p>{params.senha === "redefinida" ? <p role="status" className="mb-5 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">Senha redefinida. Entre com a nova senha.</p> : null}<AuthForm mode="login" callbackUrl={callbackUrl} registered={params.cadastro === "sucesso"} /></>;
}
