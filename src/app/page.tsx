import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarClock, CheckCircle2, GraduationCap, MessageCircle, Video } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/primitives";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { levelLabel } from "@/lib/course-labels";

export const dynamic = "force-dynamic";
const STEPS = [
  { icon: BookOpen, title: "Aprenda no seu ritmo", text: "Aulas gravadas e materiais organizados em cursos, do básico ao avançado." },
  { icon: MessageCircle, title: "Coloque o inglês em prática", text: "Conversação ao vivo e aulas particulares com acompanhamento do professor." },
  { icon: GraduationCap, title: "Acompanhe sua evolução", text: "Provas, histórico de estudo e progresso para enxergar cada conquista." },
];
const INTERVAL: Record<string, string> = { MENSAL: "mês", TRIMESTRAL: "trimestre", ANUAL: "ano" };

export default async function HomePage() {
  const [session, courses, plans, reviews] = await Promise.all([
    auth(),
    prisma.course.findMany({ where: { published: true }, orderBy: { createdAt: "desc" }, take: 3, select: { id: true, title: true, subtitle: true, slug: true, level: true, category: true } }),
    prisma.plan.findMany({ where: { active: true }, orderBy: { priceCents: "asc" } }),
    prisma.review.findMany({ where: { comment: { not: null }, course: { published: true } }, take: 3, orderBy: { rating: "desc" }, select: { id: true, comment: true, student: { select: { name: true } } } }),
  ]);
  const destination = session?.user ? "/app" : "/cadastro";
  return <>
    <MarketingHeader isAuthenticated={Boolean(session?.user)} />
    <main>
      <section className="bg-grid border-b border-subtle"><div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-7 animate-fade-up"><p className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-4 py-2 text-xs font-semibold text-brand-600 dark:text-brand-300"><MessageCircle className="h-4 w-4" />Seu inglês ganha voz aqui</p><h1 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl">Inglês para quem quer <span className="text-brand-600 dark:text-brand-300">FALAR.</span></h1><p className="max-w-xl text-lg leading-relaxed text-muted">Saia da teoria e leve o inglês para a sua vida. Aprenda com aulas no seu ritmo, pratique com professores e acompanhe sua evolução em um só lugar.</p><div className="flex flex-wrap gap-3"><Button asChild size="lg"><Link href={destination}>Começar agora<ArrowRight className="h-4 w-4" /></Link></Button><Button asChild size="lg" variant="secondary"><a href="#como-funciona">Conhecer a academia</a></Button></div><p className="text-sm text-subtle">Do primeiro passo à conversação com confiança.</p></div>
        <div className="surface-card relative overflow-hidden p-6 sm:p-9"><Image src="/brand/profile-512.jpg" alt="Scott, da Scott English Academy" width={512} height={512} priority className="aspect-square w-full rounded-2xl object-cover" /><div className="mt-6 flex items-center gap-3"><span className="rounded-xl bg-brand-500/10 p-3 text-brand-500"><Video className="h-6 w-6" /></span><div><p className="font-bold">Aprender é só o começo.</p><p className="text-sm text-muted">O próximo passo é se comunicar.</p></div></div></div>
      </div></section>
      <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16 sm:px-6"><p className="text-sm font-semibold text-brand-600 dark:text-brand-300">UM CAMINHO, MUITAS CONQUISTAS</p><h2 className="mt-3 text-3xl font-bold tracking-tight">Aprenda. Pratique. Evolua.</h2><div className="mt-8 grid gap-5 md:grid-cols-3">{STEPS.map((step, i) => <Card key={step.title}><CardContent className="space-y-4 p-6"><step.icon className="h-7 w-7 text-brand-500" /><p className="text-xs font-bold text-subtle">PASSO {i + 1}</p><h3 className="text-lg font-bold">{step.title}</h3><p className="text-sm leading-relaxed text-muted">{step.text}</p></CardContent></Card>)}</div></section>
      <section id="cursos" className="border-y border-subtle bg-sunken scroll-mt-24"><div className="mx-auto max-w-6xl px-5 py-16 sm:px-6"><h2 className="text-3xl font-bold tracking-tight">Encontre seu próximo curso</h2><p className="mt-3 text-muted">Conteúdo organizado para você avançar com clareza.</p><div className="mt-8 grid gap-5 md:grid-cols-3">{courses.map(course => <Card key={course.id}><CardContent className="flex h-full flex-col items-start gap-4 p-6"><span className="rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-300">{levelLabel(course.level)}</span><p className="text-xs text-subtle">{course.category}</p><h3 className="text-xl font-bold">{course.title}</h3><p className="flex-1 text-sm text-muted">{course.subtitle ?? "Conheça as aulas e os materiais deste curso."}</p><Button asChild variant="secondary"><Link href={"/app/cursos/" + course.slug}>Conhecer curso<ArrowRight className="h-4 w-4" /></Link></Button></CardContent></Card>)}</div>{!courses.length && <EmptyState icon={BookOpen} title="Novos cursos a caminho" description="Crie sua conta e acompanhe as novidades da academia." />}</div></section>
      <section id="aulas" className="mx-auto grid max-w-6xl scroll-mt-24 items-center gap-10 px-5 py-16 sm:px-6 md:grid-cols-2"><div><CalendarClock className="mb-5 h-10 w-10 text-brand-500" /><h2 className="text-3xl font-bold tracking-tight">Seu inglês precisa de conversa.</h2><p className="mt-4 leading-relaxed text-muted">Leve suas dúvidas para as aulas ao vivo. Agende aulas particulares para trabalhar seus objetivos e pratique o que aprendeu nos cursos.</p><Button asChild className="mt-6"><Link href="/app/agenda">Conhecer a agenda<ArrowRight className="h-4 w-4" /></Link></Button></div><div className="surface-card space-y-5 p-7">{["Aulas gravadas para rever quando quiser", "Agenda de encontros com professores", "Aulas particulares com foco em você", "Provas e acompanhamento de progresso"].map(item => <p key={item} className="flex items-start gap-3 text-sm"><CheckCircle2 className="h-5 w-5 shrink-0 text-brand-500" />{item}</p>)}</div></section>
      <section id="planos" className="border-y border-subtle bg-sunken scroll-mt-24"><div className="mx-auto max-w-6xl px-5 py-16 sm:px-6"><h2 className="text-3xl font-bold tracking-tight">Um plano para o seu momento</h2><p className="mt-3 text-muted">Confira os benefícios e escolha como quer aprender.</p><div className="mt-8 grid gap-5 md:grid-cols-3">{plans.map(plan => <Card key={plan.id}><CardContent className="flex h-full flex-col items-start gap-5 p-6"><h3 className="text-xl font-bold">{plan.name}</h3><p><span className="text-3xl font-black">{formatCurrency(plan.priceCents)}</span><span className="text-sm text-subtle"> / {INTERVAL[plan.interval]}</span></p><p className="flex-1 text-sm text-muted">{plan.description}</p><Button asChild className="w-full"><Link href="/app/assinatura">Ver benefícios<ArrowRight className="h-4 w-4" /></Link></Button></CardContent></Card>)}</div>{!plans.length && <p className="mt-6 text-muted">Os planos serão disponibilizados em breve.</p>}<p className="mt-6 text-xs text-subtle">Versão de demonstração: assinaturas e pagamentos são simulados.</p></div></section>
      <section id="depoimentos" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16 sm:px-6"><h2 className="text-3xl font-bold tracking-tight">Quem aprende, conta</h2><div className="mt-8 grid gap-5 md:grid-cols-3">{reviews.map(review => <Card key={review.id}><CardContent className="p-6"><blockquote className="text-sm leading-relaxed text-muted">“{review.comment}”</blockquote><p className="mt-5 text-sm font-bold">{review.student.name.split(" ")[0]}</p><p className="text-xs text-subtle">Aluno da Scott English Academy</p></CardContent></Card>)}</div>{!reviews.length && <p className="mt-6 text-muted">Faça parte da academia e construa sua própria história com o inglês.</p>}</section>
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-5 py-12 sm:px-6"><h2 className="mb-8 text-3xl font-bold tracking-tight">Dúvidas frequentes</h2>{[
        ["Posso começar do zero?", "Sim. Explore os cursos pelo nível e comece pelos conteúdos para iniciantes."],
        ["Como funcionam as aulas?", "Você encontra aulas gravadas nos cursos, encontros ao vivo na agenda e agendamento de aulas particulares na plataforma."],
        ["Como acompanho minha evolução?", "Seu painel reúne aulas concluídas, progresso por curso e resultados de provas. Os certificados emitidos ficam na sua conta."],
        ["Como entro na plataforma?", "Crie uma conta com seu nome, e-mail e senha. Se já tem cadastro, use o botão Entrar."],
      ].map(([question, answer]) => <details key={question} className="border-b border-subtle py-5"><summary className="cursor-pointer text-base font-semibold">{question}</summary><p className="mt-3 text-sm leading-relaxed text-muted">{answer}</p></details>)}</section>
      <section className="mx-auto max-w-6xl px-5 py-16 text-center sm:px-6"><h2 className="text-3xl font-black">Pronto para dar voz ao seu inglês?</h2><Button asChild size="lg" className="mt-7"><Link href={destination}>Começar meu aprendizado<ArrowRight className="h-4 w-4" /></Link></Button></section>
    </main>
    <footer className="border-t border-subtle px-5 py-8"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 text-sm text-muted"><p>Scott English Academy · Inglês para quem quer FALAR</p><div className="flex gap-5"><Link href="/login" className="hover:text-default">Entrar</Link><Link href="/cadastro" className="hover:text-default">Criar conta</Link><a href="mailto:suporte@scottenglish.com.br" className="hover:text-default">Contato</a></div></div></footer>
  </>;
}
