import Image from "next/image";
import Link from "next/link";
import { BookOpen, CheckCircle2, GraduationCap, MessageCircle, PlayCircle, Target } from "lucide-react";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MarketingHeader } from "@/components/marketing/header";
import { SiteCredit } from "@/components/marketing/site-credit";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";

export const metadata = { title: "Sobre a academia", description: "Conheça a proposta de ensino da Scott English Academy." };
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const session = await auth();
  const videoUrl = process.env.NEXT_PUBLIC_INTRO_VIDEO_URL;
  const rawWhatsApp = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "5515998229592").replace(/\D/g, "");
  const wppMessage = "Olá! Gostaria de saber mais sobre a Scott English Academy.";
  const showTeam = process.env.NEXT_PUBLIC_TEAM_ENABLED === "true";
  const team = showTeam ? await prisma.user.findMany({ where: { role: { in: [Role.ADMIN, Role.PROFESSOR] }, bio: { not: null } }, select: { id: true, name: true, bio: true, avatarUrl: true, role: true, _count: { select: { coursesAuthored: true } } }, orderBy: { name: "asc" } }) : [];
  return <>
    <MarketingHeader isAuthenticated={Boolean(session?.user)} />
    <main>
      <section className="border-b border-subtle bg-grid"><div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_.9fr]"><div><p className="text-sm font-bold uppercase tracking-[.18em] text-brand-600 dark:text-brand-300">Sobre a academia</p><h1 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">Aulas ao vivo, exclusivas por aluno e personalizadas para você conversar e praticar.</h1><p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">Na Scott English Academy, cada aula é ao vivo e exclusiva por aluno, 100% personalizada para cada aluno conversar e praticar no seu ritmo, com planos de 1x por semana ou 2x por semana. Para saber mais, entre em contato com a nossa equipe — nosso diferencial faz a diferença no seu aprendizado.</p><div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg"><WhatsAppLink phone={rawWhatsApp} message={wppMessage}><MessageCircle className="h-4 w-4" />Fale conosco</WhatsAppLink></Button><Button asChild size="lg" variant="secondary"><Link href={session?.user ? "/app" : "/cadastro"}>{session?.user ? "Abrir plataforma" : "Acessar plataforma"}</Link></Button></div></div><Image src="/brand/profile-512.jpg" alt="Scott English Academy" width={512} height={512} priority className="mx-auto aspect-square w-full max-w-md rounded-3xl object-cover shadow-lifted"/></div></section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6"><div className="grid gap-5 md:grid-cols-3">{[[Target,"Aula exclusiva por aluno","Atendimento individual ao vivo para que toda a atenção do professor esteja voltada para você."],[MessageCircle,"Personalizada para conversar","Cada aula é preparada para você conversar, praticar e ganhar confiança em situações reais."],[GraduationCap,"Nosso diferencial","Planos de 1x ou 2x por semana com acompanhamento próximo que faz a diferença no seu aprendizado."]].map(([Icon,title,text]) => { const ItemIcon = Icon as typeof Target; return <Card key={String(title)}><CardContent className="p-6"><ItemIcon className="h-8 w-8 text-brand-500"/><h2 className="mt-4 text-xl font-bold">{String(title)}</h2><p className="mt-2 text-sm leading-relaxed text-muted">{String(text)}</p></CardContent></Card>; })}</div></section>

      <section className="border-y border-subtle bg-sunken"><div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 sm:px-6 md:grid-cols-2"><div><p className="text-sm font-bold uppercase tracking-[.18em] text-brand-600 dark:text-brand-300">Como ensinamos</p><h2 className="mt-3 text-3xl font-bold">Nosso diferencial faz a diferença no seu aprendizado</h2><ul className="mt-6 space-y-4 text-muted">{["Aulas ao vivo e exclusivas por aluno (atendimento individual).","Aula personalizada para cada aluno conversar e praticar.","Planos de 1x por semana ou 2x por semana adaptados à sua rotina.","Para saber mais, entre em contato com a nossa equipe pelo WhatsApp."].map(item => <li key={item} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500"/><span>{item}</span></li>)}</ul></div>{videoUrl ? <div className="aspect-video overflow-hidden rounded-2xl border border-subtle bg-black shadow-lifted"><iframe src={videoUrl} title="Apresentação da Scott English Academy" className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/></div> : <div className="flex aspect-video flex-col items-center justify-center rounded-2xl border border-dashed border-subtle bg-surface p-8 text-center"><PlayCircle className="h-12 w-12 text-brand-500"/><p className="mt-4 font-semibold">Para saber mais, entre em contato com a nossa equipe</p><p className="mt-2 max-w-sm text-sm text-muted">Converse com nosso time para alinhar seus objetivos e escolher entre o plano 1x semana ou 2x semana.</p><Button asChild className="mt-5"><WhatsAppLink phone={rawWhatsApp} message={wppMessage}><MessageCircle className="h-4 w-4" />Falar com a nossa equipe</WhatsAppLink></Button></div>}</div></section>

      {team.length ? <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6"><p className="text-sm font-bold uppercase tracking-[.18em] text-brand-600 dark:text-brand-300">Equipe</p><h2 className="mt-3 text-3xl font-bold">Quem acompanha seu aprendizado</h2><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{team.map(person => <Card key={person.id}><CardContent className="p-6">{person.avatarUrl ? <Image src={person.avatarUrl} alt={person.name} width={80} height={80} className="h-20 w-20 rounded-2xl object-cover"/> : <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-500/10"><BookOpen className="h-8 w-8 text-brand-500"/></div>}<h3 className="mt-4 text-lg font-bold">{person.name}</h3><p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{person.role === Role.ADMIN ? "Direção e ensino" : "Professor(a)"}</p><p className="mt-3 text-sm leading-relaxed text-muted">{person.bio}</p>{person._count.coursesAuthored ? <p className="mt-3 text-xs text-subtle">{person._count.coursesAuthored} {person._count.coursesAuthored === 1 ? "curso publicado ou em preparação" : "cursos publicados ou em preparação"}</p> : null}</CardContent></Card>)}</div></section> : null}
    </main>
    <footer className="border-t border-subtle px-5 py-7"><SiteCredit className="mx-auto max-w-6xl text-sm text-muted"/></footer>
  </>;
}
