import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuthForm } from "../auth-form";
export const metadata: Metadata = { title: "Criar conta" };
export default async function CadastroPage() {
  if ((await auth())?.user) redirect("/app");
  return <><h1 className="text-2xl font-bold tracking-tight">Comece a falar inglês</h1><p className="mb-7 mt-2 text-sm text-muted">Crie sua conta para explorar a plataforma.</p><AuthForm mode="register" /></>;
}
