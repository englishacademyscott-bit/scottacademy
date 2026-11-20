import type { Metadata } from "next";
import { RequestPasswordResetForm } from "../password-reset-form";

export const metadata: Metadata = { title: "Recuperar senha" };
export default function RecoverPasswordPage() {
  return <><h1 className="text-2xl font-bold tracking-tight">Recuperar senha</h1><p className="mb-7 mt-2 text-sm text-muted">Informe o e-mail da conta para receber um link seguro de redefinição.</p><RequestPasswordResetForm /></>;
}
