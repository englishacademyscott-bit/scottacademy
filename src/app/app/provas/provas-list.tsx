"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  Clock,
  FileCheck2,
  ListChecks,
  Play,
  RotateCcw,
  Search,
  Target,
  XCircle,
} from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { startAttempt } from "./actions";

export type ProvaStatus = "NAO_INICIADA" | "EM_ANDAMENTO" | "CONCLUIDA";

export type ProvaItem = {
  id: string;
  title: string;
  description: string | null;
  courseId: string | null;
  courseTitle: string | null;
  moduleTitle: string | null;
  questionCount: number;
  timeLimitMin: number;
  passingPercent: number;
  maxAttempts: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  status: ProvaStatus;
  lastAttemptId: string | null;
  lastScore: number | null;
  lastPassed: boolean | null;
  lastSubmittedAt: string | null;
};

type Filtro = "TODAS" | "PENDENTES" | "FEITAS";

const FILTROS: { value: Filtro; label: string }[] = [
  { value: "TODAS", label: "Todas" },
  { value: "PENDENTES", label: "Pendentes" },
  { value: "FEITAS", label: "Feitas" },
];

function StatusBadge({ prova }: { prova: ProvaItem }) {
  if (prova.status === "EM_ANDAMENTO") {
    return (
      <Badge variant="warning" className="shrink-0">
        <Clock className="h-3.5 w-3.5" />
        Em andamento
      </Badge>
    );
  }
  if (prova.status === "CONCLUIDA") {
    return prova.lastPassed ? (
      <Badge variant="success" className="shrink-0">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Aprovada
      </Badge>
    ) : (
      <Badge variant="danger" className="shrink-0">
        <XCircle className="h-3.5 w-3.5" />
        Reprovada
      </Badge>
    );
  }
  return (
    <Badge variant="default" className="shrink-0">
      <CircleDashed className="h-3.5 w-3.5" />
      Não iniciada
    </Badge>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-muted">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-subtle">
          {label}
        </span>
        <span className="block truncate text-sm font-semibold tabular-nums text-default">
          {value}
        </span>
      </span>
    </div>
  );
}

export function ProvasList({
  provas,
  cursos,
}: {
  provas: ProvaItem[];
  cursos: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [filtro, setFiltro] = React.useState<Filtro>("TODAS");
  const [cursoId, setCursoId] = React.useState("TODOS");
  const [startingId, setStartingId] = React.useState<string | null>(null);

  const filtradas = React.useMemo(() => {
    const termo = query.trim().toLowerCase();

    return provas.filter((prova) => {
      if (filtro === "PENDENTES" && prova.status === "CONCLUIDA") return false;
      if (filtro === "FEITAS" && prova.status !== "CONCLUIDA") return false;
      if (cursoId !== "TODOS" && prova.courseId !== cursoId) return false;
      if (!termo) return true;
      return (
        prova.title.toLowerCase().includes(termo) ||
        (prova.description ?? "").toLowerCase().includes(termo) ||
        (prova.courseTitle ?? "").toLowerCase().includes(termo) ||
        (prova.moduleTitle ?? "").toLowerCase().includes(termo)
      );
    });
  }, [provas, query, filtro, cursoId]);

  async function handleIniciar(prova: ProvaItem) {
    setStartingId(prova.id);
    try {
      const res = await startAttempt(prova.id);
      if (!res.ok) {
        toast.error("Não foi possível iniciar a prova", {
          description: res.error,
        });
        return;
      }
      router.push(`/app/provas/${prova.id}/realizar`);
    } catch {
      toast.error("Não foi possível iniciar a prova", {
        description: "Tente novamente em instantes.",
      });
    } finally {
      setStartingId(null);
    }
  }

  const totalPendentes = provas.filter((p) => p.status !== "CONCLUIDA").length;
  const totalFeitas = provas.filter((p) => p.status === "CONCLUIDA").length;

  if (provas.length === 0) {
    return (
      <EmptyState
        icon={FileCheck2}
        title="Nenhuma prova disponível"
        description="Você ainda não tem provas liberadas. Assim que o professor publicar uma prova do seu curso, ela aparece aqui."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros e busca */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div
          role="tablist"
          aria-label="Filtrar provas por situação"
          className="inline-flex w-full items-center gap-1 rounded-xl bg-sunken p-1 lg:w-auto"
        >
          {FILTROS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filtro === f.value}
              onClick={() => setFiltro(f.value)}
              className={cn(
                "flex-1 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold text-muted transition-all lg:flex-none",
                "hover:text-default",
                filtro === f.value &&
                  "bg-surface text-default shadow-soft",
              )}
            >
              {f.label}
              <span className="ml-1.5 text-xs tabular-nums text-subtle">
                {f.value === "TODAS"
                  ? provas.length
                  : f.value === "PENDENTES"
                    ? totalPendentes
                    : totalFeitas}
              </span>
            </button>
          ))}
        </div>

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar prova…"
              aria-label="Buscar prova por título, curso ou módulo"
              className="pl-9"
            />
          </div>
          {cursos.length > 1 ? (
            <Select
              value={cursoId}
              onChange={(e) => setCursoId(e.target.value)}
              aria-label="Filtrar por curso"
              className="min-w-0 sm:w-64"
            >
              <option value="TODOS">Todos os cursos</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
          ) : null}
        </div>
      </div>

      {filtradas.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhuma prova encontrada"
          description="Nenhum resultado para os filtros selecionados. Tente outra busca ou volte para “Todas”."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setQuery("");
                setFiltro("TODAS");
                setCursoId("TODOS");
              }}
            >
              Limpar filtros
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtradas.map((prova, i) => (
            <Card
              key={prova.id}
              className="stagger flex flex-col transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lifted"
              style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}
            >
              <CardHeader className="gap-3 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-subtle">
                      {prova.courseTitle ?? "Geral"}
                      {prova.moduleTitle ? ` · ${prova.moduleTitle}` : ""}
                    </p>
                    <h3 className="text-base font-semibold leading-snug tracking-tight text-default">
                      {prova.title}
                    </h3>
                  </div>
                  <StatusBadge prova={prova} />
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-4">
                {prova.description ? (
                  <p className="line-clamp-2 text-sm leading-relaxed text-muted">
                    {prova.description}
                  </p>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  <Meta
                    icon={ListChecks}
                    label="Questões"
                    value={String(prova.questionCount)}
                  />
                  <Meta
                    icon={Clock}
                    label="Tempo"
                    value={`${prova.timeLimitMin} min`}
                  />
                  <Meta
                    icon={Target}
                    label="Nota de corte"
                    value={`${prova.passingPercent}%`}
                  />
                  <Meta
                    icon={RotateCcw}
                    label="Tentativas"
                    value={`${prova.attemptsRemaining} de ${prova.maxAttempts}`}
                  />
                </div>

                {prova.status === "CONCLUIDA" && prova.lastScore !== null ? (
                  <div
                    className={cn(
                      "flex items-center justify-between rounded-xl border px-3.5 py-2.5",
                      prova.lastPassed
                        ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                        : "border-cherry-500/30 bg-cherry-500/10 dark:border-cherry-500/30",
                    )}
                  >
                    <span className="text-xs font-semibold text-muted">
                      Última nota
                    </span>
                    <span
                      className={cn(
                        "text-lg font-bold tabular-nums",
                        prova.lastPassed
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-cherry-700 dark:text-cherry-400",
                      )}
                    >
                      {prova.lastScore}%
                    </span>
                  </div>
                ) : null}
              </CardContent>

              <CardFooter className="flex-wrap gap-2">
                {prova.status === "CONCLUIDA" && prova.lastAttemptId ? (
                  <>
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/app/provas/resultado/${prova.lastAttemptId}`}>
                        <ClipboardList className="h-4 w-4" />
                        Revisar resultado
                      </Link>
                    </Button>
                    {prova.attemptsRemaining > 0 ? (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={startingId === prova.id}
                        onClick={() => handleIniciar(prova)}
                      >
                        <Play className="h-4 w-4" />
                        Tentar de novo
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={
                      startingId === prova.id || prova.attemptsRemaining <= 0
                    }
                    onClick={() => handleIniciar(prova)}
                  >
                    <Play className="h-4 w-4" />
                    {prova.status === "EM_ANDAMENTO"
                      ? "Continuar prova"
                      : "Iniciar prova"}
                  </Button>
                )}

                <Button asChild size="sm" variant="ghost">
                  <Link href={`/app/provas/${prova.id}`}>Detalhes</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
