import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BookOpenCheck, CheckCircle2, MessageCircle, ShieldCheck } from "lucide-react";
import { SiteCredit } from "@/components/marketing/site-credit";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="relative grid min-h-dvh overflow-hidden bg-canvas lg:grid-cols-[1.05fr_.95fr]">
    <aside className="relative hidden overflow-hidden border-r border-white/10 bg-ink-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="pointer-events-none absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-brand-500/25 blur-3xl"/><div className="pointer-events-none absolute -right-24 bottom-1/4 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl"/><div className="pointer-events-none absolute inset-0 bg-grid opacity-20"/>
      <Link href="/" className="relative flex w-fit items-center gap-3 text-lg font-bold"><Image src="/icons/icon-96.png" alt="" width={48} height={48} className="rounded-xl shadow-glow"/>Scott English Academy</Link>
      <div className="relative max-w-xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-brand-300">Seu próximo passo começa aqui</p><h2 className="mt-5 text-5xl font-black leading-[1.08] tracking-tight">Inglês para quem quer <span className="text-brand-300">FALAR.</span></h2><p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-300">Estude no seu ritmo, pratique com contexto e acompanhe cada etapa da sua evolução.</p><div className="mt-9 grid gap-3 sm:grid-cols-2">{[[BookOpenCheck,"Cursos organizados"],[MessageCircle,"Prática e conversação"],[CheckCircle2,"Progresso registrado"],[ShieldCheck,"Acesso protegido"]].map(([Icon,label]) => { const ItemIcon = Icon as typeof ShieldCheck; return <div key={String(label)} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.06] px-4 py-3 text-sm text-ink-200 backdrop-blur"><ItemIcon className="h-4 w-4 text-brand-300"/>{String(label)}</div>; })}</div></div>
      <SiteCredit className="relative text-xs text-ink-400 [&_strong]:text-ink-300"/>
    </aside>
    <section className="relative flex flex-col justify-center px-5 py-8 sm:px-10 lg:px-16"><div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-brand-500/10 blur-3xl lg:hidden"/><div className="relative mx-auto w-full max-w-md"><Link href="/" className="mb-7 inline-flex items-center gap-2 rounded-lg text-sm text-muted transition-colors hover:text-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"><ArrowLeft className="h-4 w-4"/>Voltar ao início</Link><div className="surface-card animate-fade-up p-6 shadow-lifted sm:p-8">{children}</div><SiteCredit className="mt-6 text-center text-xs text-subtle lg:hidden"/></div></section>
  </main>;
}
