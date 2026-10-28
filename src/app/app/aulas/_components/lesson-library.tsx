"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  GraduationCap,
  LayoutGrid,
  List,
  PlayCircle,
  Radio,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/primitives";
import { Progress } from "@/components/ui/progress";
import { cn, formatDuration } from "@/lib/utils";

export interface LessonListItem {
  id: string;
  title: string;
  kind: string;
  durationSec: number;
  free: boolean;
  moduleTitle: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  courseCoverUrl: string | null;
  watchedPercent: number;
  completed: boolean;
  lastViewedAt: string | null;
}

type KindFilter = "TODOS" | "AULA_GRAVADA" | "AULA_AO_VIVO" | "AULA_PARTICULAR";
type StatusFilter = "TODOS" | "CONCLUIDAS" | "PENDENTES";
type SortOrder = "RELEVANCIA" | "RECENTES" | "DURACAO" | "CURTAS";

const KIND_LABELS: Record<string, string> = {
  AULA_GRAVADA: "Gravada",
  AULA_AO_VIVO: "Ao vivo",
  AULA_PARTICULAR: "Particular",
};

export function LessonLibrary({
  lessons,
  courses,
}: {
  lessons: LessonListItem[];
  courses: { id: string; title: string }[];
}) {
  const [query, setQuery] = React.useState("");
  const [courseId, setCourseId] = React.useState("TODOS");
  const [kind, setKind] = React.useState<KindFilter>("TODOS");
  const [status, setStatus] = React.useState<StatusFilter>("TODOS");
  const [sort, setSort] = React.useState<SortOrder>("RELEVANCIA");
  const [view, setView] = React.useState<"grid" | "list">("grid");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = lessons.filter((lesson) => {
      if (courseId !== "TODOS" && lesson.courseId !== courseId) return false;
      if (kind !== "TODOS" && lesson.kind !== kind) return false;
      if (status === "CONCLUIDAS" && !lesson.completed) return false;
      if (status === "PENDENTES" && lesson.completed) return false;
      if (!q) return true;
      return (
        lesson.title.toLowerCase().includes(q) ||
        lesson.courseTitle.toLowerCase().includes(q) ||
        lesson.moduleTitle.toLowerCase().includes(q)
      );
    });

    const sorted = [...result];
    if (sort === "RECENTES") {
      sorted.sort((a, b) =>
        (b.lastViewedAt ?? "").localeCompare(a.lastViewedAt ?? ""),
      );
    } else if (sort === "DURACAO") {
      sorted.sort((a, b) => b.durationSec - a.durationSec);
    } else if (sort === "CURTAS") {
      sorted.sort((a, b) => a.durationSec - b.durationSec);
    } else {
      // Relevância: em andamento primeiro, depois não iniciadas, depois concluídas.
      sorted.sort((a, b) => {
        const score = (l: LessonListItem) =>
          l.completed ? 0 : l.watchedPercent > 0 ? 2 : 1;
        return score(b) - score(a);
      });
    }
    return sorted;
  }, [lessons, query, courseId, kind, status, sort]);

  const hasFilters =
    query.trim() !== "" ||
    courseId !== "TODOS" ||
    kind !== "TODOS" ||
    status !== "TODOS";

  const reset = () => {
    setQuery("");
    setCourseId("TODOS");
    setKind("TODOS");
    setStatus("TODOS");
  };

  return (
    <div className="space-y-6">
      <div className="surface-card space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar aula ou curso…"
              aria-label="Buscar aulas"
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="filtro-curso" className="sr-only">
              Filtrar por curso
            </label>
            <select
              id="filtro-curso"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="h-10 max-w-[13rem] rounded-lg border border-default bg-surface px-3 text-sm text-default shadow-xs focus-visible:border-brand-400 focus-visible:ring-brand focus-visible:outline-none"
            >
              <option value="TODOS">Todos os cursos</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>

            <label htmlFor="filtro-tipo" className="sr-only">
              Filtrar por tipo
            </label>
            <select
              id="filtro-tipo"
              value={kind}
              onChange={(e) => setKind(e.target.value as KindFilter)}
              className="h-10 rounded-lg border border-default bg-surface px-3 text-sm text-default shadow-xs focus-visible:border-brand-400 focus-visible:ring-brand focus-visible:outline-none"
            >
              <option value="TODOS">Todos os tipos</option>
              <option value="AULA_GRAVADA">Gravadas</option>
              <option value="AULA_AO_VIVO">Ao vivo</option>
              <option value="AULA_PARTICULAR">Particulares</option>
            </select>

            <label htmlFor="filtro-status" className="sr-only">
              Filtrar por status
            </label>
            <select
              id="filtro-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="h-10 rounded-lg border border-default bg-surface px-3 text-sm text-default shadow-xs focus-visible:border-brand-400 focus-visible:ring-brand focus-visible:outline-none"
            >
              <option value="TODOS">Todos os status</option>
              <option value="PENDENTES">Pendentes</option>
              <option value="CONCLUIDAS">Concluídas</option>
            </select>

            <label htmlFor="ordenar" className="sr-only">
              Ordenar aulas
            </label>
            <select
              id="ordenar"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOrder)}
              className="h-10 rounded-lg border border-default bg-surface px-3 text-sm text-default shadow-xs focus-visible:border-brand-400 focus-visible:ring-brand focus-visible:outline-none"
            >
              <option value="RELEVANCIA">Mais relevantes</option>
              <option value="RECENTES">Vistas recentemente</option>
              <option value="DURACAO">Mais longas</option>
              <option value="CURTAS">Mais curtas</option>
            </select>

            <div
              className="flex items-center rounded-lg border border-default bg-surface p-1"
              role="group"
              aria-label="Modo de visualização"
            >
              <button
                type="button"
                onClick={() => setView("grid")}
                aria-pressed={view === "grid"}
                aria-label="Visualizar em grade"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                  view === "grid"
                    ? "bg-brand-500 text-white"
                    : "text-muted hover:bg-sunken hover:text-default",
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
                aria-label="Visualizar em lista"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                  view === "list"
                    ? "bg-brand-500 text-white"
                    : "text-muted hover:bg-sunken hover:text-default",
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
          <p aria-live="polite" className="inline-flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {filtered.length} {filtered.length === 1 ? "aula" : "aulas"}
          </p>
          {hasFilters ? (
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              Limpar filtros
            </Button>
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhuma aula encontrada"
          description="Ajuste os filtros ou busque por outro termo."
          action={
            hasFilters ? (
              <Button type="button" variant="secondary" size="sm" onClick={reset}>
                Limpar filtros
              </Button>
            ) : undefined
          }
        />
      ) : view === "grid" ? (
        <ul className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((lesson) => (
            <li key={lesson.id}>
              <LessonGridCard lesson={lesson} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-3">
          {filtered.map((lesson) => (
            <li key={lesson.id}>
              <LessonListRow lesson={lesson} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function KindIcon({ kind }: { kind: string }) {
  if (kind === "AULA_AO_VIVO") return <Radio className="h-3.5 w-3.5" />;
  if (kind === "AULA_PARTICULAR") return <GraduationCap className="h-3.5 w-3.5" />;
  return <FileText className="h-3.5 w-3.5" />;
}

function LessonGridCard({ lesson }: { lesson: LessonListItem }) {
  return (
    <article className="group surface-card flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lifted">
      <Link
        href={`/app/aulas/${lesson.id}`}
        className="relative block aspect-[16/9] overflow-hidden bg-gradient-brand"
        tabIndex={-1}
        aria-hidden
      >
        <div className="absolute inset-0 bg-dots opacity-40" aria-hidden />
        <div className="absolute inset-0 flex items-center justify-center">
          <PlayCircle className="relative h-11 w-11 text-white/85 transition-transform duration-300 group-hover:scale-110" />
        </div>
        {lesson.completed ? (
          <div className="absolute right-3 top-3">
            <Badge variant="success" className="bg-surface/90 backdrop-blur-sm">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Concluída
            </Badge>
          </div>
        ) : null}
        {lesson.free ? (
          <div className="absolute left-3 top-3">
            <Badge variant="pop" className="bg-surface/90 backdrop-blur-sm">
              Gratuita
            </Badge>
          </div>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
            {lesson.courseTitle}
          </p>
          <h3 className="text-base font-semibold leading-snug tracking-tight text-default">
            <Link
              href={`/app/aulas/${lesson.id}`}
              className="transition-colors hover:text-brand-600 dark:hover:text-brand-300"
            >
              {lesson.title}
            </Link>
          </h3>
          <p className="truncate text-xs text-subtle">{lesson.moduleTitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(lesson.durationSec)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <KindIcon kind={lesson.kind} />
            {KIND_LABELS[lesson.kind] ?? lesson.kind}
          </span>
        </div>

        <div className="mt-auto space-y-1.5 pt-1">
          <div className="flex items-center gap-2">
            <Progress
              value={lesson.completed ? 100 : lesson.watchedPercent}
              size="sm"
              className="flex-1"
              aria-label={`Progresso da aula ${lesson.title}`}
            />
            <span className="text-xs font-semibold tabular-nums text-muted">
              {lesson.completed ? 100 : lesson.watchedPercent}%
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function LessonListRow({ lesson }: { lesson: LessonListItem }) {
  return (
    <article className="group surface-card flex items-center gap-4 p-4 transition-all duration-300 hover:shadow-lifted">
      <Link
        href={`/app/aulas/${lesson.id}`}
        className="relative flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-brand"
        tabIndex={-1}
        aria-hidden
      >
        <div className="absolute inset-0 bg-dots opacity-40" aria-hidden />
        <PlayCircle className="relative h-7 w-7 text-white/85 transition-transform group-hover:scale-110" />
      </Link>

      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-subtle">
          {lesson.courseTitle}
        </p>
        <h3 className="truncate text-sm font-semibold text-default">
          <Link
            href={`/app/aulas/${lesson.id}`}
            className="transition-colors hover:text-brand-600 dark:hover:text-brand-300"
          >
            {lesson.title}
          </Link>
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(lesson.durationSec)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <KindIcon kind={lesson.kind} />
            {KIND_LABELS[lesson.kind] ?? lesson.kind}
          </span>
          <span className="truncate text-subtle">{lesson.moduleTitle}</span>
        </div>
      </div>

      <div className="hidden w-40 shrink-0 items-center gap-2 sm:flex">
        <Progress
          value={lesson.completed ? 100 : lesson.watchedPercent}
          size="sm"
          className="flex-1"
          aria-label={`Progresso da aula ${lesson.title}`}
        />
        <span className="text-xs font-semibold tabular-nums text-muted">
          {lesson.completed ? 100 : lesson.watchedPercent}%
        </span>
      </div>

      <span
        className={cn(
          "shrink-0",
          lesson.completed
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-subtle",
        )}
        aria-hidden
      >
        {lesson.completed ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </span>
    </article>
  );
}
