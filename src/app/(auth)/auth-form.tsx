"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { login, register, type AuthFormState } from "./actions";
import { SpinningSeal } from "./vault-seal";

const LOGIN_STEPS = ["Validando seus dados", "Protegendo sua sessão", "Abrindo sua área de estudos"];

export function AuthForm({ mode, callbackUrl = "/app", registered = false }: { mode: "login" | "register"; callbackUrl?: string; registered?: boolean }) {
  const isLogin = mode === "login";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [step, setStep] = useState(0);
  const [state, action, pending] = useActionState<AuthFormState, FormData>(isLogin ? login : register, {});

  useEffect(() => {
    if (!pending || !isLogin) { setStep(0); return; }
    const timer = window.setInterval(() => setStep((current) => Math.min(current + 1, LOGIN_STEPS.length - 1)), 700);
    return () => window.clearInterval(timer);
  }, [pending, isLogin]);

  const passwordField = (id: string, label: string) => <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <div className="relative">
      <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"/>
      <Input id={id} name={id} type={showPassword ? "text" : "password"} autoComplete={isLogin ? "current-password" : "new-password"} minLength={6} maxLength={72} required disabled={pending} aria-invalid={Boolean(state.error)} className="h-12 pl-10 pr-11" onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))}/>
      <button type="button" onClick={() => setShowPassword((visible) => !visible)} disabled={pending} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:bg-sunken hover:text-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button>
    </div>
    {capsLock ? <p className="text-xs font-medium text-amber-600" role="status">Caps Lock está ativado.</p> : null}
  </div>;

  return <>
    <form action={action} className="space-y-5" aria-busy={pending}>
      <input type="hidden" name="callbackUrl" value={callbackUrl}/>
      {registered ? <p role="status" className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"><Check className="mt-0.5 h-4 w-4 shrink-0"/>Conta criada. Entre com seu e-mail e senha para começar.</p> : null}
      {!isLogin ? <div className="space-y-2"><Label htmlFor="name">Nome completo</Label><Input id="name" name="name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" minLength={2} maxLength={120} required disabled={pending} className="h-12" placeholder="Como você quer ser chamado?"/></div> : null}
      <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" inputMode="email" autoComplete="email" maxLength={254} required disabled={pending} aria-invalid={Boolean(state.error)} className="h-12" placeholder="voce@exemplo.com"/></div>
      {passwordField("password", "Senha")}
      {isLogin ? <div className="-mt-2 flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 text-xs text-subtle"><ShieldCheck className="h-3.5 w-3.5"/>Acesso protegido</span><Link href="/recuperar-senha" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">Esqueci minha senha</Link></div> : <p className="-mt-3 text-xs text-subtle">Use de 6 a 72 caracteres.</p>}
      {!isLogin ? passwordField("confirmPassword", "Confirmar senha") : null}
      {state.error ? <p role="alert" className="rounded-xl border border-cherry-500/20 bg-cherry-500/10 p-3 text-sm text-cherry-600 dark:text-cherry-400">{state.error}</p> : null}
      <Button type="submit" size="lg" className="h-12 w-full transition-transform active:scale-[.99]" disabled={pending} aria-label={isLogin ? "Entrar" : "Criar conta"}>{pending ? <Loader2 className="h-4 w-4 animate-spin"/> : <ArrowRight className="h-4 w-4"/>}{pending ? (isLogin ? "Entrando com segurança…" : "Criando sua conta…") : isLogin ? "Entrar na plataforma" : "Criar minha conta"}</Button>
      <p className="text-center text-sm text-muted">{isLogin ? "Ainda não tem uma conta? " : "Já tem uma conta? "}<Link href={isLogin ? "/cadastro" : "/login"} className="font-semibold text-brand-600 hover:underline dark:text-brand-300">{isLogin ? "Cadastre-se" : "Entrar"}</Link></p>
    </form>

    {pending && isLogin ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/75 p-5 backdrop-blur-md" role="status" aria-live="polite"><div className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-white p-7 text-center shadow-2xl dark:bg-ink-900"><div className="relative mx-auto flex items-center justify-center"><SpinningSeal size={96} spinning /></div><h2 className="mt-6 text-xl font-bold text-default">Preparando seu acesso</h2><p className="mt-2 text-sm text-muted">{LOGIN_STEPS[step]}</p><div className="mt-6 h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-white/10"><div className="h-full rounded-full gradient-brand transition-all duration-500" style={{ width: `${((step + 1) / LOGIN_STEPS.length) * 100}%` }}/></div><div className="mt-5 flex justify-center gap-2" aria-hidden="true">{LOGIN_STEPS.map((label, index) => <span key={label} className={`h-2 w-2 rounded-full transition-all duration-300 ${index <= step ? "scale-110 bg-brand-500" : "bg-ink-200 dark:bg-white/20"}`}/>)}</div><p className="mt-5 text-xs text-subtle">Isso leva apenas alguns segundos.</p></div></div> : null}
  </>;
}
