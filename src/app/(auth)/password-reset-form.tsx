"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { requestPasswordReset, resetPassword, type PasswordResetState } from "./password-reset-actions";

export function RequestPasswordResetForm() {
  const [state, action, pending] = useActionState<PasswordResetState, FormData>(requestPasswordReset, {});
  if (state.success) return <div role="status" className="space-y-4 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" /><p className="text-sm leading-relaxed text-muted">{state.success}</p><Button asChild variant="secondary"><Link href="/login">Voltar ao login</Link></Button></div>;
  return <form action={action} className="space-y-5"><div className="space-y-2"><Label htmlFor="reset-email">E-mail da conta</Label><Input id="reset-email" name="email" type="email" autoComplete="email" maxLength={254} required disabled={pending} /></div>{state.error ? <p role="alert" className="rounded-xl bg-cherry-500/10 p-3 text-sm text-cherry-600 dark:text-cherry-400">{state.error}</p> : null}<Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{pending ? "Enviando…" : "Enviar link de recuperação"}</Button></form>;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<PasswordResetState, FormData>(resetPassword, {});
  return <form action={action} className="space-y-5"><input type="hidden" name="token" value={token} /><div className="space-y-2"><Label htmlFor="new-password">Nova senha</Label><Input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required disabled={pending} /><p className="text-xs text-subtle">Use pelo menos 8 caracteres.</p></div><div className="space-y-2"><Label htmlFor="confirm-new-password">Confirmar nova senha</Label><Input id="confirm-new-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required disabled={pending} /></div>{state.error ? <p role="alert" className="rounded-xl bg-cherry-500/10 p-3 text-sm text-cherry-600 dark:text-cherry-400">{state.error}</p> : null}<Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{pending ? "Salvando…" : "Redefinir senha"}</Button></form>;
}
