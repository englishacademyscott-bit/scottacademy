"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { login, register, type AuthFormState } from "./actions";

export function AuthForm({ mode, callbackUrl = "/app", registered = false }: { mode: "login" | "register"; callbackUrl?: string; registered?: boolean }) {
  const isLogin = mode === "login";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [state, action, pending] = useActionState<AuthFormState, FormData>(isLogin ? login : register, {});
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      {registered && <p role="status" className="rounded-xl bg-brand-500/10 p-3 text-sm text-default">Conta criada. Entre com seu e-mail e senha para começar.</p>}
      {!isLogin && <div className="space-y-2"><Label htmlFor="name">Nome completo</Label><Input id="name" name="name" value={name} onChange={event => setName(event.target.value)} autoComplete="name" minLength={2} maxLength={120} required disabled={pending} /></div>}
      <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" name="email" value={email} onChange={event => setEmail(event.target.value)} type="email" autoComplete="email" maxLength={254} required disabled={pending} /></div>
      <div className="space-y-2"><Label htmlFor="password">Senha</Label><Input id="password" name="password" type="password" autoComplete={isLogin ? "current-password" : "new-password"} minLength={6} maxLength={72} required disabled={pending} />{!isLogin && <p className="text-xs text-subtle">Use pelo menos 6 caracteres.</p>}</div>
      {!isLogin && <div className="space-y-2"><Label htmlFor="confirmPassword">Confirmar senha</Label><Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={6} maxLength={72} required disabled={pending} /></div>}
      {state.error && <p role="alert" className="rounded-xl bg-cherry-500/10 p-3 text-sm text-cherry-600 dark:text-cherry-400">{state.error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{pending ? "Aguarde..." : isLogin ? "Entrar" : "Criar conta"}</Button>
      <p className="text-center text-sm text-muted">{isLogin ? "Ainda não tem uma conta? " : "Já tem uma conta? "}<Link href={isLogin ? "/cadastro" : "/login"} className="font-semibold text-brand-600 hover:underline dark:text-brand-300">{isLogin ? "Cadastre-se" : "Entrar"}</Link></p>
    </form>
  );
}
