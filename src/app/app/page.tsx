import Link from "next/link";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileCheck2,
  Flame,
  GraduationCap,
  Layers,
  LineChart,
  PlayCircle,
  Sparkles,
  TrendingUp,
  Users,
  Video,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { formatCurrency, formatDateTime, formatDuration, formatTime, percentage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState, SectionHeader, StatCard } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/avatar";
import {
  CourseTimeChart,
  SimpleBarChart,
  WeeklyStudyChart,
} from "./_components/charts";
import {
  computeStreak,
  countActiveWeeks,
  greetingFor,
  minutesByCourse,
  sum,
  weeklyMinutes,
  type LessonProgressRow,
} from "./_components/stats";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();

  switch (user.role) {
    case "PROFESSOR":
      return <ProfessorDashboard name={user.name ?? "Professor"} userId={user.id} />;
    case "EDITOR":
      return <EditorDashboard name={user.name ?? "Editor"} />;
    case "ADMIN":
      return <AdminDashboard name={user.name ?? "Admin"} />;
    case "ALUNO":
    default:
      return <StudentDashboard name={user.name ?? "Aluno"} userId={user.id} />;
  }
}

/* -------------------------------------------------------------------------- */
/*  ALUNO                                                                      */
/* -------------------------------------------------------------------------- */

async function StudentDashboard({ name, userId }: { name: string; userId: string }) {
  const now = new Date();

  const [enrollments, progresses, sessions, exams] = await Promise.all([
    prisma.enrollment.findMany({
      where: { studentId: userId, status: { not: "CANCELADO" } },
      orderBy: { startedAt: "desc" },
      include: {
        course: {
          include: {
            modules: {
              orderBy: { position: "asc" },
              include: {
                lessons: {
                  orderBy: { position: "asc" },
                  select: { id: true, title: true, durationSec: true, position: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.lessonProgress.findMany({
      where: { studentId: userId },
      orderBy: { lastViewedAt: "desc" },
      include: {
        lesson: {
          include: {
            module: { include: { course: { select: { id: true, title: true } } } },
          },
        },
      },
    }),
    prisma.scheduledSession.findMany({
      where: {
        startsAt: { gt: now },
        status: { in: ["AGENDADA", "CONFIRMADA"] },
      },
      orderBy: { startsAt: "asc" },
      take: 8,
      include: {
        course: { select: { id: true, title: true } },
        teacher: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),
    prisma.exam.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        course: { select: { id: true, title: true } },
        attempts: { where: { studentId: userId } },
      },
    }),
  ]);

  const courseIds = enrollments.map((e) => e.courseId);
  const relevantSessions = sessions.filter(
    (s) => s.studentId === userId || (s.courseId && courseIds.includes(s.courseId)),
  );

  const progressRows = progresses as unknown as LessonProgressRow[];
  const totalMinutes = sum(progressRows.map((p) => (p.lesson.durationSec * p.watchedPercent) / 100 / 60));
  const overallProgress = enrollments.length
    ? Math.round(
        enrollments.reduce((acc, e) => acc + e.progress, 0) / enrollments.length,
      )
    : 0;

  const activityDates = progresses.map((p) => p.lastViewedAt);
  const streak = computeStreak(activityDates, now);
  const activeWeeks = countActiveWeeks(activityDates);

  const lastLesson = (() => {
    const pending = progresses.find((p) => !p.completed);
    return pending ?? progresses[0] ?? null;
  })();

  const completedCount = progresses.filter((p) => p.completed).length;

  // Próximo módulo: primeiro módulo do curso matriculado com aulas pendentes.
  const nextModule = (() => {
    for (const enrollment of enrollments) {
      for (const mod of enrollment.course.modules) {
        const done = mod.lessons.filter((l) =>
          progresses.some((p) => p.lessonId === l.id && p.completed),
        ).length;
        if (done < mod.lessons.length) {
          return { enrollment, module: mod, done, total: mod.lessons.length };
        }
      }
    }
    return null;
  })();

  const pendingExams = exams.filter(
    (e) => !e.attempts.some((a) => a.status === "CONCLUIDA"),
  );
  const availableExams = pendingExams.filter((e) => !e.courseId || courseIds.includes(e.courseId));

  const weekly = weeklyMinutes(progressRows, 8, now);
  const byCourse = minutesByCourse(progressRows);

  const firstName = name.split(" ")[0];

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-subtle bg-surface p-6 shadow-soft sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" aria-hidden />
        <div
          className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-3">
            <Badge variant="brand" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Scott English Academy
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight text-default sm:text-3xl">
              {greetingFor(now)}, {firstName}!
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted">
              {enrollments.length
                ? "Inglês para quem quer FALAR. Continue de onde você parou e mantenha sua sequência viva."
                : "Comece hoje: inscreva-se em um curso e desbloqueie sua primeira aula."}
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
            {lastLesson ? (
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href={`/app/aulas/${lastLesson.lessonId}`}>
                  <PlayCircle className="h-4 w-4" />
                  Retomar aula
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/app/cursos">
                  <BookOpen className="h-4 w-4" />
                  Explorar cursos
                </Link>
              </Button>
            )}
            <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
              <Link href="/app/aulas">
                <Video className="h-4 w-4" />
                Biblioteca de aulas
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section aria-labelledby="stats-aluno">
        <h2 id="stats-aluno" className="sr-only">
          Resumo do seu progresso
        </h2>
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Progresso geral"
            value={`${overallProgress}%`}
            icon={TrendingUp}
            hint={`${enrollments.length} ${enrollments.length === 1 ? "curso" : "cursos"} matriculado(s)`}
          />
          <StatCard
            label="Sequência"
            value={`${streak} ${streak === 1 ? "semana" : "semanas"}`}
            icon={Flame}
            hint={`${activeWeeks} ${activeWeeks === 1 ? "semana estudada" : "semanas estudadas"}`}
          />
          <StatCard
            label="Horas de estudo"
            value={formatDuration(Math.round(totalMinutes * 60))}
            icon={Clock}
            hint={`${completedCount} ${completedCount === 1 ? "aula concluída" : "aulas concluídas"}`}
          />
          <StatCard
            label="Provas pendentes"
            value={availableExams.length}
            icon={FileCheck2}
            hint={availableExams.length ? "Disponíveis agora" : "Nada pendente"}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Continuar de onde parou */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <SectionHeader
              title="Continuar de onde parou"
              description="Sua última aula com progresso registrado"
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/app/aulas">
                    Ver todas
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              }
            />
          </CardHeader>
          <CardContent>
            {lastLesson ? (
              <Link
                href={`/app/aulas/${lastLesson.lessonId}`}
                className="group flex flex-col gap-4 rounded-xl border border-subtle bg-sunken/60 p-4 transition-all hover:border-brand-300 hover:bg-sunken sm:flex-row sm:items-center sm:p-5"
              >
                <div className="relative flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-brand sm:h-20 sm:w-32">
                  <div className="absolute inset-0 bg-dots opacity-40" aria-hidden />
                  <PlayCircle className="relative h-9 w-9 text-white/90 transition-transform group-hover:scale-110" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
                    {lastLesson.lesson.module.course.title}
                  </p>
                  <h3 className="truncate text-base font-semibold text-default">
                    {lastLesson.lesson.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="flex min-w-[10rem] flex-1 items-center gap-2">
                      <Progress
                        value={lastLesson.watchedPercent}
                        size="sm"
                        className="flex-1"
                      />
                      <span className="text-xs font-semibold tabular-nums text-muted">
                        {lastLesson.watchedPercent}%
                      </span>
                    </div>
                    <span className="text-xs text-subtle">
                      Visto {formatDateTime(lastLesson.lastViewedAt)}
                    </span>
                  </div>
                </div>
                <Badge variant={lastLesson.completed ? "success" : "accent"} className="shrink-0 self-start sm:self-center">
                  {lastLesson.completed ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Concluída
                    </>
                  ) : (
                    <>
                      <Clock className="h-3.5 w-3.5" />
                      Em andamento
                    </>
                  )}
                </Badge>
              </Link>
            ) : (
              <EmptyState
                icon={PlayCircle}
                title="Nada em andamento"
                description="Assista sua primeira aula e ela aparecerá aqui para você retomar quando quiser."
                action={
                  <Button asChild size="sm">
                    <Link href="/app/cursos">Ver cursos</Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Progresso geral do curso */}
        <Card>
          <CardHeader>
            <CardTitle>Progresso por curso</CardTitle>
            <CardDescription>Seu avanço em cada matrícula</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {enrollments.length ? (
              enrollments.map((enrollment) => {
                const totalLessons = enrollment.course.modules.reduce(
                  (acc, m) => acc + m.lessons.length,
                  0,
                );
                const done = enrollment.course.modules
                  .flatMap((m) => m.lessons)
                  .filter((l) => progresses.some((p) => p.lessonId === l.id && p.completed)).length;
                return (
                  <div key={enrollment.id} className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/app/cursos/${enrollment.course.slug}`}
                        className="min-w-0 text-sm font-semibold text-default hover:text-brand-600 dark:hover:text-brand-300"
                      >
                        <span className="line-clamp-1">{enrollment.course.title}</span>
                      </Link>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-default">
                        {enrollment.progress}%
                      </span>
                    </div>
                    <Progress value={enrollment.progress} size="sm" />
                    <p className="text-xs text-subtle">
                      {done} de {totalLessons} aulas concluídas
                    </p>
                  </div>
                );
              })
            ) : (
              <EmptyState
                icon={BookOpen}
                title="Nenhum curso ainda"
                description="Escolha um curso e comece hoje."
                action={
                  <Button asChild size="sm">
                    <Link href="/app/cursos">Explorar cursos</Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Aulas ao vivo */}
      <section aria-labelledby="aulas-vivo">
        <SectionHeader
          title="Aulas ao vivo próximas"
          description="Sessões agendadas e confirmadas"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/app/aulas">
                Biblioteca
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        />
        <div id="aulas-vivo" className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {relevantSessions.length ? (
            relevantSessions.slice(0, 6).map((session) => (
              <Card key={session.id} className="group hover:-translate-y-0.5 hover:shadow-lifted">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cherry-500/10 text-cherry-600 dark:text-cherry-400">
                      <CalendarClock className="h-5 w-5" />
                    </div>
                    <Badge variant={session.status === "CONFIRMADA" ? "success" : "default"}>
                      {session.status === "CONFIRMADA" ? "Confirmada" : "Agendada"}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <h3 className="line-clamp-2 text-sm font-semibold text-default">
                      {session.title}
                    </h3>
                    {session.course ? (
                      <p className="truncate text-xs text-muted">{session.course.title}</p>
                    ) : (
                      <p className="text-xs text-muted">Sessão aberta</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-subtle pt-3 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDateTime(session.startsAt)}
                    </span>
                    <span className="truncate">{session.teacher.name}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="sm:col-span-2 xl:col-span-3">
              <EmptyState
                icon={CalendarClock}
                title="Nenhuma aula ao vivo agendada"
                description="Assim que uma sessão for agendada, ela aparece aqui."
                action={
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/app/cursos">Ver cursos</Link>
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <WeeklyStudyChart data={weekly} />
        <CourseTimeChart data={byCourse.slice(0, 6)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Próximo módulo */}
        <Card>
          <CardHeader>
            <CardTitle>Próximo módulo</CardTitle>
            <CardDescription>O que vem a seguir no seu curso</CardDescription>
          </CardHeader>
          <CardContent>
            {nextModule ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
                      {nextModule.enrollment.course.title}
                    </p>
                    <h3 className="text-base font-semibold text-default">
                      {nextModule.module.title}
                    </h3>
                    {nextModule.module.summary ? (
                      <p className="text-sm text-muted">{nextModule.module.summary}</p>
                    ) : null}
                  </div>
                </div>
                <Progress
                  value={percentage(nextModule.done, nextModule.total)}
                  aria-label="Progresso do módulo"
                />
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted">
                    {nextModule.done} de {nextModule.total} aulas concluídas
                  </span>
                  <Button asChild size="sm">
                    <Link href="/app/aulas">
                      Continuar
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Layers}
                title="Tudo em dia"
                description="Você concluiu todos os módulos dos seus cursos. Que tal uma prova?"
                action={
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/app/cursos">Ver outros cursos</Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Provas */}
        <Card>
          <CardHeader>
            <CardTitle>Provas</CardTitle>
            <CardDescription>Pendentes e disponíveis para você</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableExams.length ? (
              availableExams.slice(0, 5).map((exam) => (
                <div
                  key={exam.id}
                  className="flex items-start gap-3 rounded-xl border border-subtle bg-sunken/50 p-3.5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pop-50 text-pop-600 dark:bg-pop-500/10 dark:text-pop-300">
                    <FileCheck2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-default">{exam.title}</p>
                    <p className="truncate text-xs text-muted">
                      {exam.course?.title ?? "Prova geral"}
                    </p>
                  </div>
                  <Badge variant="warning" className="shrink-0">
                    Pendente
                  </Badge>
                </div>
              ))
            ) : (
              <EmptyState
                icon={FileCheck2}
                title="Nenhuma prova pendente"
                description="Você está em dia com as avaliações disponíveis."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  PROFESSOR                                                                  */
/* -------------------------------------------------------------------------- */

async function ProfessorDashboard({ name, userId }: { name: string; userId: string }) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);

  const [sessions, courses, students, pendingReviews] = await Promise.all([
    prisma.scheduledSession.findMany({
      where: { teacherId: userId, startsAt: { gte: weekStart, lt: weekEnd } },
      orderBy: { startsAt: "asc" },
      include: {
        course: { select: { id: true, title: true } },
        student: { select: { id: true, name: true } },
      },
    }),
    prisma.course.findMany({
      where: { teacherId: userId },
      include: { _count: { select: { enrollments: true, modules: true } } },
    }),
    prisma.enrollment.findMany({
      where: { course: { teacherId: userId } },
      distinct: ["studentId"],
      select: { studentId: true },
    }),
    prisma.examAttempt.findMany({
      where: {
        exam: { course: { teacherId: userId } },
        status: "CONCLUIDA",
        passed: null,
      },
      include: {
        exam: { select: { id: true, title: true } },
        student: { select: { id: true, name: true } },
      },
      orderBy: { submittedAt: "asc" },
      take: 6,
    }),
  ]);

  const totalEnrollments = courses.reduce((acc, c) => acc + c._count.enrollments, 0);
  const firstName = name.split(" ")[0];

  return (
    <div className="space-y-8 animate-fade-up">
      <section className="relative overflow-hidden rounded-2xl border border-subtle bg-surface p-6 shadow-soft sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" aria-hidden />
        <div className="relative space-y-3">
          <Badge variant="accent" className="gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" />
            Painel do professor
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight text-default sm:text-3xl">
            {greetingFor(now)}, {firstName}!
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            {sessions.length
              ? `Você tem ${sessions.length} ${sessions.length === 1 ? "sessão" : "sessões"} nesta semana.`
              : "Nenhuma sessão agendada para esta semana."}
          </p>
        </div>
      </section>

      <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Aulas na semana"
          value={sessions.length}
          icon={CalendarClock}
          hint="Sessões agendadas"
        />
        <StatCard
          label="Alunos ativos"
          value={students.length}
          icon={Users}
          hint={`${totalEnrollments} matrículas`}
        />
        <StatCard
          label="Avaliações pendentes"
          value={pendingReviews.length}
          icon={FileCheck2}
          hint="Provas aguardando correção"
        />
        <StatCard
          label="Meus cursos"
          value={courses.length}
          icon={BookOpen}
          hint={`${sum(courses.map((c) => c._count.modules))} módulos publicados`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <SectionHeader
              title="Sua semana"
              description="Sessões entre segunda e domingo"
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {sessions.length ? (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col gap-3 rounded-xl border border-subtle bg-sunken/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-semibold text-default">{session.title}</p>
                    <p className="truncate text-xs text-muted">
                      {session.course?.title ?? "Sessão individual"} ·{" "}
                      {session.student?.name ?? "Aberta ao público"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge variant={session.status === "CONFIRMADA" ? "success" : "default"}>
                      {session.status === "CONFIRMADA" ? "Confirmada" : "Agendada"}
                    </Badge>
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(session.startsAt)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={CalendarClock}
                title="Semana livre"
                description="Você não tem sessões agendadas nesta semana."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avaliações pendentes</CardTitle>
            <CardDescription>Provas entregues aguardando resultado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingReviews.length ? (
              pendingReviews.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center gap-3 rounded-xl border border-subtle bg-sunken/50 p-3"
                >
                  <Avatar name={attempt.student.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-default">
                      {attempt.student.name}
                    </p>
                    <p className="truncate text-xs text-muted">{attempt.exam.title}</p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="Tudo avaliado"
                description="Nenhuma prova aguardando correção."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <SimpleBarChart
        title="Aulas da semana"
        seriesName="Sessões"
        data={sessions.map((s) => ({
          label: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(s.startsAt),
          value: 1,
        }))}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  EDITOR                                                                     */
/* -------------------------------------------------------------------------- */

async function EditorDashboard({ name }: { name: string }) {
  const [published, drafts, exams, courses, modules] = await Promise.all([
    prisma.lesson.count({ where: { published: true } }),
    prisma.lesson.count({ where: { published: false } }),
    prisma.exam.count(),
    prisma.course.count(),
    prisma.module.count(),
  ]);

  const total = published + drafts;

  return (
    <div className="space-y-8 animate-fade-up">
      <section className="relative overflow-hidden rounded-2xl border border-subtle bg-surface p-6 shadow-soft sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" aria-hidden />
        <div className="relative space-y-3">
          <Badge variant="pop" className="gap-1.5">
            <LineChart className="h-3.5 w-3.5" />
            Estúdio de conteúdo
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight text-default sm:text-3xl">
            Olá, {name.split(" ")[0]}!
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            Acompanhe o que já foi publicado e o que ainda está em rascunho.
          </p>
        </div>
      </section>

      <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Conteúdo publicado" value={published} icon={CheckCircle2} hint="Aulas visíveis" />
        <StatCard label="Aulas em rascunho" value={drafts} icon={Video} hint="Ainda não publicadas" />
        <StatCard label="Provas criadas" value={exams} icon={FileCheck2} hint="Banco de avaliações" />
        <StatCard label="Cursos" value={courses} icon={BookOpen} hint={`${modules} módulos`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status do conteúdo</CardTitle>
            <CardDescription>Publicadas versus rascunhos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Publicadas</span>
                <span className="font-semibold tabular-nums text-default">
                  {total ? Math.round((published / total) * 100) : 0}%
                </span>
              </div>
              <Progress value={total ? (published / total) * 100 : 0} aria-label="Conteúdo publicado" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Rascunhos</span>
                <span className="font-semibold tabular-nums text-default">
                  {total ? Math.round((drafts / total) * 100) : 0}%
                </span>
              </div>
              <Progress
                value={total ? (drafts / total) * 100 : 0}
                indicatorClassName="bg-pop-500"
                aria-label="Conteúdo em rascunho"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos passos</CardTitle>
            <CardDescription>Atalhos úteis para o seu dia</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { href: "/app/cursos", label: "Gerenciar cursos", icon: BookOpen },
              { href: "/app/provas", label: "Ver provas", icon: FileCheck2 },
              { href: "/app/biblioteca", label: "Biblioteca de aulas", icon: Video },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-xl border border-subtle bg-sunken/50 p-3.5 text-sm font-medium text-default transition-colors hover:border-brand-300 hover:bg-sunken"
              >
                <item.icon className="h-4 w-4 text-brand-500" />
                {item.label}
                <ArrowRight className="ml-auto h-4 w-4 text-subtle" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  ADMIN                                                                      */
/* -------------------------------------------------------------------------- */

async function AdminDashboard({ name }: { name: string }) {
  const [usersByRole, courseCount, revenue, sessionsCount, pendingPayments] =
    await Promise.all([
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
      prisma.course.count(),
      prisma.payment.aggregate({
        where: { status: "PAGO" },
        _sum: { amountCents: true },
        _count: { _all: true },
      }),
      prisma.scheduledSession.count(),
      prisma.payment.count({ where: { status: "PENDENTE" } }),
    ]);

  const totalUsers = usersByRole.reduce((acc, r) => acc + r._count._all, 0);
  const revenueCents = revenue._sum.amountCents ?? 0;

  const roleStats = [
    { label: "Alunos", value: usersByRole.find((r) => r.role === "ALUNO")?._count._all ?? 0 },
    { label: "Professores", value: usersByRole.find((r) => r.role === "PROFESSOR")?._count._all ?? 0 },
    { label: "Editores", value: usersByRole.find((r) => r.role === "EDITOR")?._count._all ?? 0 },
    { label: "Admins", value: usersByRole.find((r) => r.role === "ADMIN")?._count._all ?? 0 },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      <section className="relative overflow-hidden rounded-2xl border border-subtle bg-surface p-6 shadow-soft sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" aria-hidden />
        <div
          className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full bg-brand-500/10 blur-3xl"
          aria-hidden
        />
        <div className="relative space-y-3">
          <Badge variant="brand" className="gap-1.5">
            <Award className="h-3.5 w-3.5" />
            Painel administrativo
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight text-default sm:text-3xl">
            Olá, {name.split(" ")[0]}!
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            Visão consolidada da plataforma: pessoas, conteúdo e receita.
          </p>
        </div>
      </section>

      <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Usuários" value={totalUsers} icon={Users} hint={`${pendingPayments} pagamentos pendentes`} />
        <StatCard label="Cursos" value={courseCount} icon={BookOpen} hint="Cadastrados na plataforma" />
        <StatCard
          label="Receita"
          value={formatCurrency(revenueCents)}
          icon={Wallet}
          hint={`${revenue._count._all} pagamentos confirmados`}
        />
        <StatCard label="Sessões" value={sessionsCount} icon={CalendarClock} hint="Agendadas e realizadas" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SimpleBarChart title="Usuários por perfil" seriesName="Usuários" data={roleStats} />
        <Card>
          <CardHeader>
            <CardTitle>Saúde da plataforma</CardTitle>
            <CardDescription>Indicadores rápidos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                label: "Receita média por pagamento",
                value: revenue._count._all
                  ? formatCurrency(Math.round(revenueCents / revenue._count._all))
                  : formatCurrency(0),
                icon: Wallet,
              },
              {
                label: "Pagamentos pendentes",
                value: String(pendingPayments),
                icon: BarChart3,
              },
              {
                label: "Cursos publicados",
                value: String(courseCount),
                icon: BookOpen,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl border border-subtle bg-sunken/50 p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300">
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="text-sm text-muted">{item.label}</span>
                <span className="ml-auto text-base font-bold tabular-nums text-default">
                  {item.value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
