import Link from "next/link";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  LineChart,
  Sparkles,
  Target,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState, SectionHeader, StatCard } from "@/components/ui/primitives";
import { formatDate, formatDuration } from "@/lib/utils";
import {
  ExamScoreChart,
  ProgressBarsChart,
  StudyTimeAreaChart,
} from "@/app/app/_components/charts";
import {
  computeStreak,
  countActiveWeeks,
  sum,
  watchedMinutes,
  type LessonProgressRow,
} from "@/app/app/_components/stats";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const user = await requireUser();
  const now = new Date();

  const [progressRows, enrollments, attempts] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: { studentId: user.id },
      orderBy: { lastViewedAt: "desc" },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: { select: { id: true, title: true, slug: true } },
              },
            },
          },
        },
      },
    }),
    prisma.enrollment.findMany({
      where: { studentId: user.id, status: { not: "CANCELADO" } },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            modules: {
              select: { id: true, _count: { select: { lessons: true } } },
            },
          },
        },
      },
    }),
    prisma.examAttempt.findMany({
      where: { studentId: user.id, status: "CONCLUIDA" },
      orderBy: { submittedAt: "asc" },
      include: { exam: { select: { id: true, title: true, passingPercent: true } } },
    }),
  ]);

  const rows = progressRows as unknown as LessonProgressRow[];

  if (rows.length === 0) {
    return (
      <div className="space-y-6 animate-fade-up">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted">
            <LineChart className="h-4 w-4" />
            <span>Meu progresso</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-default sm:text-3xl">
            Progresso
          </h1>
        </header>
        <EmptyState
          icon={Target}
          title="Sem dados de progresso ainda"
          description="Assista sua primeira aula e seu histórico de estudo, notas e sequências aparece aqui."
          action={
            <Button asChild size="sm">
              <Link href="/app/aulas">
                <Sparkles className="h-4 w-4" />
                Encontrar uma aula
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const totalMinutes = sum(rows.map(watchedMinutes));
  const completed = rows.filter((r) => r.completed).length;
  const activityDates = rows.map((r) => r.lastViewedAt);
  const streak = computeStreak(activityDates, now);
  const activeWeeks = countActiveWeeks(activityDates);
  const overallPercent = rows.length ? Math.round((completed / rows.length) * 100) : 0;

  // Horas por semana (últimas 8 semanas)
  const weeklyHours: { label: string; horas: number }[] = (() => {
    const buckets = new Map<string, number>();
    for (const row of rows) {
      const date = new Date(row.lastViewedAt);
      const day = (date.getDay() + 6) % 7;
      const monday = new Date(date);
      monday.setDate(monday.getDate() - day);
      monday.setHours(0, 0, 0, 0);
      const key = monday.toISOString();
      buckets.set(key, (buckets.get(key) ?? 0) + watchedMinutes(row));
    }
    const current = new Date(now);
    const currentMonday = new Date(current);
    currentMonday.setDate(currentMonday.getDate() - ((currentMonday.getDay() + 6) % 7));
    currentMonday.setHours(0, 0, 0, 0);

    const out: { label: string; horas: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const at = new Date(currentMonday.getTime() - i * 7 * 86400000);
      const key = at.toISOString();
      out.push({
        label: `${String(at.getDate()).padStart(2, "0")}/${String(at.getMonth() + 1).padStart(2, "0")}`,
        horas: Math.round((buckets.get(key) ?? 0) / 60),
      });
    }
    return out;
  })();

  // Concluídas vs pendentes por curso
  const perCourse = enrollments.map((enrollment) => {
    const totalLessons = enrollment.course.modules.reduce(
      (acc, m) => acc + m._count.lessons,
      0,
    );
    const done = rows.filter(
      (r) => r.lesson.module.course.id === enrollment.courseId && r.completed,
    ).length;
    return {
      label: enrollment.course.title.length > 18
        ? `${enrollment.course.title.slice(0, 18)}…`
        : enrollment.course.title,
      concluidas: done,
      pendentes: Math.max(0, totalLessons - done),
    };
  });

  // Evolução das notas
  const examScores = attempts
    .filter((a) => a.score !== null)
    .map((a) => ({
      label: a.exam.title.length > 16 ? `${a.exam.title.slice(0, 16)}…` : a.exam.title,
      nota: a.score ?? 0,
      passou: a.passed ?? false,
    }));

  const sortedAttempts = attempts
    .filter((a) => a.score !== null)
    .sort((a, b) => (a.submittedAt ?? a.startedAt).getTime() - (b.submittedAt ?? b.startedAt).getTime())
    .slice(-8);

  return (
    <div className="space-y-8 animate-fade-up">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted">
          <LineChart className="h-4 w-4" />
          <span>Meu progresso</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-default sm:text-3xl">
          Progresso
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Acompanhe seu tempo de estudo, evolução nas provas e o avanço em cada curso.
        </p>
      </header>

      <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Progresso geral"
          value={`${overallPercent}%`}
          icon={Target}
          hint={`${completed} de ${rows.length} aulas concluídas`}
        />
        <StatCard
          label="Tempo de estudo"
          value={formatDuration(Math.round(totalMinutes * 60))}
          icon={Clock}
          hint="Acumulado em todas as aulas"
        />
        <StatCard
          label="Sequência atual"
          value={`${streak} ${streak === 1 ? "semana" : "semanas"}`}
          icon={Flame}
          hint={`${activeWeeks} ${activeWeeks === 1 ? "semana estudada" : "semanas estudadas"}`}
        />
        <StatCard
          label="Provas realizadas"
          value={attempts.filter((a) => a.status === "CONCLUIDA").length}
          icon={Award}
          hint={`${examScores.filter((e) => e.passou).length} aprovadas`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <StudyTimeAreaChart data={weeklyHours} />
        <ProgressBarsChart data={perCourse} />
      </div>

      <ExamScoreChart data={examScores} />

      {/* Cursos */}
      <section aria-labelledby="progresso-cursos">
        <SectionHeader
          title="Avanço por curso"
          description="Percentual concluído em cada matrícula"
        />
        <div id="progresso-cursos" className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {enrollments.length ? (
            enrollments.map((enrollment) => (
              <Card key={enrollment.id} className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lifted">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/app/cursos/${enrollment.course.slug}`}
                        className="line-clamp-2 text-sm font-semibold text-default transition-colors hover:text-brand-600 dark:hover:text-brand-300"
                      >
                        {enrollment.course.title}
                      </Link>
                      <p className="text-xs text-subtle">
                        Iniciado em {formatDate(enrollment.startedAt)}
                      </p>
                    </div>
                  </div>
                  <Progress
                    value={enrollment.progress}
                    size="sm"
                    aria-label={`Progresso em ${enrollment.course.title}`}
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">
                      {enrollment.course.modules.reduce((acc, m) => acc + m._count.lessons, 0)} aulas
                    </span>
                    <span className="font-bold tabular-nums text-default">
                      {enrollment.progress}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="sm:col-span-2 xl:col-span-3">
              <EmptyState
                icon={BookOpen}
                title="Nenhum curso matriculado"
                description="Inscreva-se em um curso para acompanhar seu avanço aqui."
                action={
                  <Button asChild size="sm">
                    <Link href="/app/cursos">Explorar cursos</Link>
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </section>

      {/* Provas realizadas */}
      {sortedAttempts.length > 0 ? (
        <section aria-labelledby="progresso-provas">
          <SectionHeader
            title="Histórico de provas"
            description="Suas últimas avaliações concluídas"
          />
          <div id="progresso-provas" className="mt-4">
            <ul className="space-y-3">
              {sortedAttempts.map((attempt) => (
                <li key={attempt.id}>
                  <Card>
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-default">
                          {attempt.exam.title}
                        </p>
                        <p className="text-xs text-muted">
                          {attempt.submittedAt
                            ? formatDate(attempt.submittedAt)
                            : formatDate(attempt.startedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold tabular-nums text-default">
                          {attempt.score}%
                        </span>
                        <Badge variant={attempt.passed ? "success" : "danger"}>
                          {attempt.passed ? "Aprovado" : "Reprovado"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Tabela de aulas */}
      <section aria-labelledby="tabela-aulas">
        <SectionHeader
          title="Aulas"
          description="Status de cada aula que você abriu"
        />
        <div id="tabela-aulas" className="mt-4">
          <div className="hidden overflow-hidden rounded-xl border border-subtle bg-surface shadow-soft lg:block">
            <table className="w-full text-sm">
              <caption className="sr-only">Status das aulas por curso</caption>
              <thead>
                <tr className="border-b border-subtle bg-sunken/60 text-left">
                  <th scope="col" className="px-4 py-3 font-semibold text-muted">
                    Aula
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-muted">
                    Curso
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-muted">
                    Duração
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-muted">
                    Progresso
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-muted">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border-subtle)]">
                {rows.map((row) => (
                  <tr key={row.lesson.id} className="transition-colors hover:bg-sunken/40">
                    <td className="max-w-[16rem] truncate px-4 py-3 font-medium text-default">
                      <Link
                        href={`/app/aulas/${row.lesson.id}`}
                        className="transition-colors hover:text-brand-600 dark:hover:text-brand-300"
                      >
                        {row.lesson.title}
                      </Link>
                    </td>
                    <td className="max-w-[12rem] truncate px-4 py-3 text-muted">
                      {row.lesson.module.course.title}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted">
                      {formatDuration(row.lesson.durationSec)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={row.completed ? 100 : row.watchedPercent}
                          size="sm"
                          className="w-24"
                          aria-label={`Progresso de ${row.lesson.title}`}
                        />
                        <span className="text-xs tabular-nums text-muted">
                          {row.completed ? 100 : row.watchedPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {row.completed ? (
                        <Badge variant="success">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Concluída
                        </Badge>
                      ) : (
                        <Badge variant="default">
                          <Circle className="h-3.5 w-3.5" />
                          Em andamento
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <ul className="space-y-3 lg:hidden">
            {rows.map((row) => (
              <li key={row.lesson.id}>
                <Card>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-default">
                          <Link
                            href={`/app/aulas/${row.lesson.id}`}
                            className="transition-colors hover:text-brand-600 dark:hover:text-brand-300"
                          >
                            {row.lesson.title}
                          </Link>
                        </p>
                        <p className="truncate text-xs text-muted">
                          {row.lesson.module.course.title}
                        </p>
                      </div>
                      <Badge variant={row.completed ? "success" : "default"} className="shrink-0">
                        {row.completed ? "Concluída" : "Pendente"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={row.completed ? 100 : row.watchedPercent}
                        size="sm"
                        className="flex-1"
                        aria-label={`Progresso de ${row.lesson.title}`}
                      />
                      <span className="text-xs tabular-nums text-muted">
                        {row.completed ? 100 : row.watchedPercent}%
                      </span>
                      <span className="text-xs text-subtle">
                        {formatDuration(row.lesson.durationSec)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
