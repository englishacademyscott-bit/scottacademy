import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/auth-redirect";
import { AuthForm } from "../auth-form";
export const metadata: Metadata = { title: "Entrar" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  if ((await auth())?.user) redirect(callbackUrl);
  return <><h1 className="text-2xl font-bold tracking-tight">Bom ter você de volta</h1><p className="mb-7 mt-2 text-sm text-muted">Entre para continuar seu aprendizado.</p><AuthForm mode="login" callbackUrl={callbackUrl} registered={params.cadastro === "sucesso"} /></>;
}
