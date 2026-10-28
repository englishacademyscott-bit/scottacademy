import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Clock,
  ListChecks,
  RotateCcw,
  Target,
  XCircle,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/utils";
import { ComecarProvaButton } from "./comecar-prova";

export const metadata: Metadata = {
  title: "Detalhes da prova",
};

const TYPE_LABEL: Record<string, string> = {
  MULTIPLA_ESCOLHA: "Múltipla escolha",
  VERDADEIRO_FALSO: "Verdadeiro ou falso",
  TEXTO_LIVRE: "Resposta aberta",
};

export default async function ProvaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, title: true, slug: true } },
      module: { select: { id: true, title: true, position: true } },
      questions: {
        select: { id: true, type: true, points: true, position: true },
        orderBy: { position: "asc" },
      },
      attempts: {
        where: { studentId: user.id },
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          status: true,
          score: true,
          passed: true,
          startedAt: true,
          submittedAt: true,
        },
      },
    },
  });

  if (!exam || !exam.published) notFound();

  const emAndamento = exam.attempts.find((a) => a.status === "EM_ANDAMENTO");
  const concluidas = exam.attempts.filter((a) => a.status === "CONCLUIDA");
  const usadas = exam.attempts.length;
  const restantes = Math.max(0, exam.maxAttempts - usadas);
  const pontosTotais = exam.questions.reduce((acc, q) => acc + q.points, 0);

  const tiposPresentes = Array.from(
    new Set(exam.questions.map((q) => q.type)),
  ) as string[];

  const INSTRUCOES = [
    "Leia cada questão com atenção antes de escolher a alternativa.",
    "Você pode pular entre as questões livremente usando o mapa de questões.",
    "O cronômetro começa no instante em que você clicar em começar e não pausa.",
    "Ao zerar o tempo, a prova é enviada automaticamente com as respostas dadas.",
    "O gabarito e as justificativas só aparecem depois do envio.",
  ];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href="/app/provas">
          <ArrowLeft className="h-4 w-4" />
          Voltar para as provas
        </Link>
      </Button>

      {/* Cabeçalho */}
      <header className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
          {exam.course?.title ?? "Geral"}
          {exam.module?.title ? ` · ${exam.module.title}` : ""}
        </p>
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-default sm:text-3xl">
          {exam.title}
        </h1>
        {exam.description ? (
          <p className="max-w-3xl text-base leading-relaxed text-muted">
            {exam.description}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {concluidas.length > 0 ? (
            concluidas.every((a) => a.passed) ? (
              <Badge variant="success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Aprovado
              </Badge>
            ) : (
              <Badge variant="danger">
                <XCircle className="h-3.5 w-3.5" />
                Reprovado
              </Badge>
            )
          ) : emAndamento ? (
            <Badge variant="warning">
              <Clock className="h-3.5 w-3.5" />
              Em andamento
            </Badge>
          ) : (
            <Badge variant="default">Não iniciada</Badge>
          )}
          <Badge variant="outline">
            {restantes} {restantes === 1 ? "tentativa restante" : "tentativas restantes"}
          </Badge>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Instruções */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-brand-500" />
                Instruções
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {INSTRUCOES.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 text-sm leading-relaxed text-muted"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-brand-500" />
                O que será avaliado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-muted">
                A prova tem {exam.questions.length}{" "}
                {exam.questions.length === 1 ? "questão" : "questões"} e vale{" "}
                {pontosTotais} {pontosTotais === 1 ? "ponto" : "pontos"} no
                total.
              </p>
              <ul className="space-y-2.5">
                {tiposPresentes.map((tipo) => {
                  const quantidade = exam.questions.filter(
                    (q) => q.type === tipo,
                  ).length;
                  return (
                    <li
                      key={tipo}
                      className="flex items-center justify-between gap-3 rounded-xl border border-subtle bg-sunken px-3.5 py-2.5"
                    >
                      <span className="text-sm font-medium text-default">
                        {TYPE_LABEL[tipo] ?? tipo}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-muted">
                        {quantidade}{" "}
                        {quantidade === 1 ? "questão" : "questões"}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {exam.module?.title ? (
                <p className="text-sm leading-relaxed text-muted">
                  Conteúdo: <span className="font-semibold text-default">{exam.module.title}</span>
                  {exam.course?.title ? ` — ${exam.course.title}` : ""}.
                </p>
              ) : null}
              <div className="rounded-xl border border-sun-500/30 bg-sun-500/10 p-3.5 dark:border-sun-500/30">
                <p className="flex gap-2.5 text-sm leading-relaxed text-default">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-sun-500" />
                  <span>
                    Nas perguntas de <strong>resposta aberta</strong>, o
                    gabarito é objetivo: a resposta é considerada correta quando
                    tem <strong>30 caracteres ou mais</strong>. Escreva com
                    suas próprias palavras.
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tentativas anteriores */}
          {exam.attempts.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-brand-500" />
                  Suas tentativas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {exam.attempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-subtle bg-surface px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-default">
                        {attempt.status === "EM_ANDAMENTO"
                          ? "Em andamento"
                          : `Enviada em ${formatDateTime(attempt.submittedAt ?? attempt.startedAt)}`}
                      </p>
                      {attempt.status === "CONCLUIDA" ? (
                        <p className="text-xs text-muted">
                          {attempt.passed ? "Aprovado" : "Reprovado"} ·{" "}
                          {attempt.score}% de acerto
                        </p>
                      ) : (
                        <p className="text-xs text-muted">
                          Você pode continuar de onde parou.
                        </p>
                      )}
                    </div>
                    {attempt.status === "CONCLUIDA" ? (
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/app/provas/resultado/${attempt.id}`}>
                          Ver resultado
                        </Link>
                      </Button>
                    ) : (
                      <ComecarProvaButton
                        examId={exam.id}
                        resuming
                        label="Continuar"
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Resumo + ação */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden">
            <div className="gradient-brand px-6 py-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
                Resumo da prova
              </p>
              <p className="mt-1 text-lg font-bold leading-snug">
                {exam.questions.length} questões · {exam.timeLimitMin} min
              </p>
            </div>
            <CardContent className="space-y-4 pt-6">
              <dl className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-sm text-muted">
                    <Clock className="h-4 w-4" />
                    Tempo limite
                  </dt>
                  <dd className="text-sm font-semibold tabular-nums text-default">
                    {exam.timeLimitMin} minutos
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-sm text-muted">
                    <Target className="h-4 w-4" />
                    Nota de aprovação
                  </dt>
                  <dd className="text-sm font-semibold tabular-nums text-default">
                    {exam.passingPercent}%
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-sm text-muted">
                    <RotateCcw className="h-4 w-4" />
                    Tentativas restantes
                  </dt>
                  <dd className="text-sm font-semibold tabular-nums text-default">
                    {restantes} de {exam.maxAttempts}
                  </dd>
                </div>
              </dl>

              <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-3.5 text-sm leading-relaxed text-default dark:border-brand-500/30 dark:bg-brand-500/10">
                <p className="flex gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-brand-500" />
                  <span>
                    <strong>O cronômetro começa agora.</strong> Ao clicar em
                    começar, o tempo começa a correr e só para quando você
                    envia a prova.
                  </span>
                </p>
              </div>

              {restantes > 0 || emAndamento ? (
                <ComecarProvaButton examId={exam.id} resuming={!!emAndamento} />
              ) : (
                <EmptyState
                  icon={RotateCcw}
                  title="Tentativas esgotadas"
                  description="Você já usou todas as tentativas disponíveis desta prova."
                  className="py-8"
                />
              )}

              <p className="text-center text-xs text-subtle">
                {emAndamento
                  ? "Existe uma prova em andamento. Ao continuar, o cronômetro retoma de onde parou."
                  : "Bom trabalho! Reserve um momento tranquilo antes de começar."}
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
