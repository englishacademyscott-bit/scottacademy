"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  GraduationCap,
  LayoutGrid,
  List,
  Search,
  Star,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/primitives";
import { Progress } from "@/components/ui/progress";
import { cn, formatCurrency, formatDuration } from "@/lib/utils";
import { CourseCover } from "@/app/app/_components/course-cover";
import { levelLabel } from "@/lib/course-labels";

export interface CourseListItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  coverUrl: string | null;
  category: string;
  level: string;
  priceCents: number;
  durationMin: number;
  teacherName: string;
  lessonCount: number;
  moduleCount: number;
  studentCount: number;
  rating: number;
  reviewCount: number;
  freeLessons: number;
  enrolled: boolean;
  progress: number;
}

/** Nota média arredondada em 1 casa (0 quando sem avaliações). */
function formatRating(rating: number, reviewCount: number) {
  if (!reviewCount) return "—";
  return rating.toFixed(1).replace(".", ",");
}

export function CourseBrowser({
  courses,
  initialQuery = "",
  initialLevel = "TODOS",
  initialCategory = "TODOS",
  initialOnlyEnrolled = false,
  levels,
  categories,
}: {
  courses: CourseListItem[];
  initialQuery?: string;
  initialLevel?: string;
  initialCategory?: string;
  initialOnlyEnrolled?: boolean;
  levels: string[];
  categories: string[];
}) {
  const [query, setQuery] = React.useState(initialQuery);
  const [level, setLevel] = React.useState(initialLevel);
  const [category, setCategory] = React.useState(initialCategory);
  const [onlyEnrolled, setOnlyEnrolled] = React.useState(initialOnlyEnrolled);
  const [view, setView] = React.useState<"grid" | "list">("grid");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((course) => {
      if (level !== "TODOS" && course.level !== level) return false;
      if (category !== "TODOS" && course.category !== category) return false;
      if (onlyEnrolled && !course.enrolled) return false;
      if (!q) return true;
      return (
        course.title.toLowerCase().includes(q) ||
        (course.subtitle ?? "").toLowerCase().includes(q) ||
        course.category.toLowerCase().includes(q) ||
        course.teacherName.toLowerCase().includes(q)
      );
    });
  }, [courses, query, level, category, onlyEnrolled]);

  const hasFilters =
    query.trim() !== "" || level !== "TODOS" || category !== "TODOS" || onlyEnrolled;

  const reset = () => {
    setQuery("");
    setLevel("TODOS");
    setCategory("TODOS");
    setOnlyEnrolled(false);
  };

  return (
    <div className="space-y-6">
      {/* Barra de filtros */}
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
              placeholder="Buscar curso, categoria ou professor…"
              aria-label="Buscar cursos"
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="filtro-nivel" className="sr-only">
              Filtrar por nível
            </label>
            <select
              id="filtro-nivel"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="h-10 rounded-lg border border-default bg-surface px-3 text-sm text-default shadow-xs focus-visible:border-brand-400 focus-visible:ring-brand focus-visible:outline-none"
            >
              <option value="TODOS">Todos os níveis</option>
              {levels.map((l) => (
                <option key={l} value={l}>
                  {levelLabel(l)}
                </option>
              ))}
            </select>

            <label htmlFor="filtro-categoria" className="sr-only">
              Filtrar por categoria
            </label>
            <select
              id="filtro-categoria"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 rounded-lg border border-default bg-surface px-3 text-sm text-default shadow-xs focus-visible:border-brand-400 focus-visible:ring-brand focus-visible:outline-none"
            >
              <option value="TODOS">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <Button
              type="button"
              variant={onlyEnrolled ? "primary" : "secondary"}
              size="md"
              onClick={() => setOnlyEnrolled((v) => !v)}
              aria-pressed={onlyEnrolled}
            >
              <GraduationCap className="h-4 w-4" />
              Matriculados
            </Button>

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
          <p aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "curso encontrado" : "cursos encontrados"}
            {hasFilters ? " com os filtros aplicados" : ""}
          </p>
          {hasFilters ? (
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              <X className="h-4 w-4" />
              Limpar filtros
            </Button>
          ) : null}
        </div>
      </div>

      {/* Resultados */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhum curso encontrado"
          description="Ajuste os filtros ou tente outro termo de busca."
          action={
            hasFilters ? (
              <Button type="button" variant="secondary" size="sm" onClick={reset}>
                Limpar filtros
              </Button>
            ) : undefined
          }
        />
      ) : view === "grid" ? (
        <ul className="stagger grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((course) => (
            <li key={course.id}>
              <CourseGridCard course={course} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-3">
          {filtered.map((course) => (
            <li key={course.id}>
              <CourseListRow course={course} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CourseGridCard({ course }: { course: CourseListItem }) {
  return (
    <article className="group surface-card flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lifted">
      <Link
        href={`/app/cursos/${course.slug}`}
        className="relative block aspect-[16/9] overflow-hidden"
        tabIndex={-1}
        aria-hidden
      >
        <CourseCover
          src={course.coverUrl}
          title={course.title}
          className="h-full w-full"
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 400px"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge variant="brand" className="bg-surface/90 backdrop-blur-sm">
            {levelLabel(course.level)}
          </Badge>
          {course.enrolled ? (
            <Badge variant="success" className="bg-surface/90 backdrop-blur-sm">
              Matriculado
            </Badge>
          ) : null}
        </div>
        {course.priceCents === 0 ? (
          <div className="absolute right-3 top-3">
            <Badge variant="pop" className="bg-surface/90 backdrop-blur-sm">
              Gratuito
            </Badge>
          </div>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
            {course.category}
          </p>
          <h3 className="text-base font-semibold leading-snug tracking-tight text-default">
            <Link
              href={`/app/cursos/${course.slug}`}
              className="transition-colors hover:text-brand-600 focus-visible:text-brand-600 dark:hover:text-brand-300"
            >
              {course.title}
            </Link>
          </h3>
          {course.subtitle ? (
            <p className="line-clamp-2 text-sm text-muted">{course.subtitle}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {course.durationMin > 0 ? formatDuration(course.durationMin * 60) : "A definir"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            {course.lessonCount} aulas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {course.studentCount}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-sun-500" />
            {formatRating(course.rating, course.reviewCount)}
            <span className="text-subtle">({course.reviewCount})</span>
          </span>
        </div>

        {course.enrolled && course.progress > 0 ? (
          <div className="space-y-1.5">
            <Progress value={course.progress} size="sm" aria-label="Seu progresso neste curso" />
            <p className="text-xs text-subtle">Você está em {course.progress}%</p>
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <span className="text-lg font-bold tracking-tight text-default">
            {course.priceCents === 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400">Gratuito</span>
            ) : (
              formatCurrency(course.priceCents)
            )}
          </span>
          <Button asChild size="sm" variant={course.enrolled ? "secondary" : "primary"}>
            <Link href={`/app/cursos/${course.slug}`}>
              {course.enrolled ? "Continuar" : "Inscrever-se"}
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function CourseListRow({ course }: { course: CourseListItem }) {
  return (
    <article className="group surface-card flex flex-col gap-4 p-4 transition-all duration-300 hover:shadow-lifted sm:flex-row sm:items-center">
      <Link
        href={`/app/cursos/${course.slug}`}
        className="block w-full shrink-0 overflow-hidden rounded-xl sm:w-40"
        tabIndex={-1}
        aria-hidden
      >
        <CourseCover
          src={course.coverUrl}
          title={course.title}
          className="aspect-video w-full sm:aspect-[4/3]"
          sizes="160px"
        />
      </Link>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">{levelLabel(course.level)}</Badge>
          <Badge variant="default">{course.category}</Badge>
          {course.enrolled ? <Badge variant="success">Matriculado</Badge> : null}
        </div>
        <h3 className="text-base font-semibold tracking-tight text-default">
          <Link
            href={`/app/cursos/${course.slug}`}
            className="transition-colors hover:text-brand-600 dark:hover:text-brand-300"
          >
            {course.title}
          </Link>
        </h3>
        {course.subtitle ? (
          <p className="line-clamp-1 text-sm text-muted">{course.subtitle}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {course.durationMin > 0 ? formatDuration(course.durationMin * 60) : "A definir"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            {course.lessonCount} aulas · {course.moduleCount} módulos
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-sun-500" />
            {formatRating(course.rating, course.reviewCount)}
          </span>
          <span className="text-subtle">por {course.teacherName}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
        <span className="text-lg font-bold tracking-tight text-default">
          {course.priceCents === 0 ? (
            <span className="text-emerald-600 dark:text-emerald-400">Gratuito</span>
          ) : (
            formatCurrency(course.priceCents)
          )}
        </span>
        <Button asChild size="sm" variant={course.enrolled ? "secondary" : "primary"}>
          <Link href={`/app/cursos/${course.slug}`}>
            {course.enrolled ? "Continuar" : "Inscrever-se"}
          </Link>
        </Button>
      </div>
    </article>
  );
}
