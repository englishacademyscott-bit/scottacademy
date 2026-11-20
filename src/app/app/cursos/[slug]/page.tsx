import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Award,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  GraduationCap,
  Layers,
  Lock,
  PlayCircle,
  Radio,
  Star,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/primitives";
import { cn, formatCurrency, formatDate, formatDateTime, formatDuration } from "@/lib/utils";
import { CourseCover } from "@/app/app/_components/course-cover";
import { StarRating } from "@/app/app/_components/star-rating";
import { EnrollButton } from "../_components/enroll-button";
import { canManageCourse } from "@/lib/learning-access";
import { levelLabel } from "@/lib/course-labels";

export const dynamic = "force-dynamic";

const LESSON_KIND_LABELS: Record<string, string> = {
  AULA_GRAVADA: "Gravada",
  AULA_AO_VIVO: "Ao vivo",
  AULA_PARTICULAR: "Particular",
};

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireUser();

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      teacher: {
        select: { id: true, name: true, avatarUrl: true, bio: true },
      },
      modules: {
        orderBy: { position: "asc" },
        include: {
          lessons: {
            where: user.role === "ALUNO" ? { published: true } : undefined,
            orderBy: { position: "asc" },
            include: {
              progress: {
                where: { studentId: user.id },
                select: { id: true, completed: true, watchedPercent: true },
              },
            },
          },
        },
      },
      enrollments: {
        where: { studentId: user.id },
        select: { id: true, status: true, progress: true, startedAt: true },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: { student: { select: { id: true, name: true, avatarUrl: true } } },
      },
      sessions: {
        where: { startsAt: { gte: new Date() }, status: { in: ["AGENDADA", "CONFIRMADA"] } },
        orderBy: { startsAt: "asc" },
        take: 6,
        include: { teacher: { select: { id: true, name: true } } },
      },
      _count: { select: { enrollments: true, reviews: true } },
    },
  });

  if (!course || (!course.published && !canManageCourse(user, course.teacherId))) notFound();
  const canManage = canManageCourse(user, course.teacherId);

  const lessons = course.modules.flatMap((m) => m.lessons);
  const totalDurationSec = lessons.reduce((acc, l) => acc + l.durationSec, 0);
  const rating =
    course.reviews.length > 0
      ? course.reviews.reduce((acc, r) => acc + r.rating, 0) / course.reviews.length
      : 0;
  const enrollment = course.enrollments[0];
  const isEnrolled = Boolean(enrollment && enrollment.status !== "CANCELADO");

  const doneLessons = lessons.filter((l) => l.progress[0]?.completed).length;
  const computedProgress =
    lessons.length > 0 ? Math.round((doneLessons / lessons.length) * 100) : 0;
  const studentProgress = isEnrolled ? (enrollment?.progress ?? computedProgress) : 0;

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Hero */}
      <section className="surface-card overflow-hidden">
        <div className="relative h-48 w-full overflow-hidden sm:h-64 lg:h-72">
          <CourseCover
            src={course.coverUrl}
            title={course.title}
            className="h-full w-full"
            sizes="(max-width: 1440px) 100vw, 1400px"
            priority
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/35 to-transparent"
            aria-hidden
          />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="brand" className="bg-surface/90 backdrop-blur-sm">
                {levelLabel(course.level)}
              </Badge>
              <Badge variant="default" className="bg-surface/90 backdrop-blur-sm">
                {course.category}
              </Badge>
              {course.priceCents === 0 ? (
                <Badge variant="pop" className="bg-surface/90 backdrop-blur-sm">
                  Gratuito
                </Badge>
              ) : null}
            </div>
            <h1 className="mt-3 max-w-3xl text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              {course.title}
            </h1>
            {course.subtitle ? (
              <p className="mt-2 max-w-2xl text-sm text-ink-100 sm:text-base">
                {course.subtitle}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="space-y-6">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:max-w-2xl">
              <Stat
                icon={Clock}
                label="Duração total"
                value={
                  totalDurationSec > 0
                    ? formatDuration(totalDurationSec)
                    : course.durationMin > 0
                      ? formatDuration(course.durationMin * 60)
                      : "A definir"
                }
              />
              <Stat icon={BookOpen} label="Aulas" value={String(lessons.length)} />
              <Stat icon={Layers} label="Módulos" value={String(course.modules.length)} />
              <Stat
                icon={Users}
                label="Alunos matriculados"
                value={String(course._count.enrollments)}
              />
              <Stat
                icon={Star}
                label="Avaliação"
                value={
                  course._count.reviews > 0
                    ? `${rating.toFixed(1).replace(".", ",")} (${course._count.reviews})`
                    : "Sem avaliações"
                }
              />
              <Stat
                icon={GraduationCap}
                label="Professor"
                value={course.teacher.name}
              />
            </dl>

            {isEnrolled ? (
              <div className="max-w-2xl space-y-2 rounded-xl border border-subtle bg-sunken/60 p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-default">Seu progresso</span>
                  <span className="font-bold tabular-nums text-default">
                    {studentProgress}%
                  </span>
                </div>
                <Progress value={studentProgress} aria-label="Seu progresso no curso" />
                <p className="text-xs text-muted">
                  {doneLessons} de {lessons.length} aulas concluídas
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 lg:w-64 lg:shrink-0">
            <div id="inscricao" className="scroll-mt-24" />
              {user.role === "ALUNO" && <EnrollButton
              courseId={course.id}
              enrolled={isEnrolled}
              completed={studentProgress >= 100}
              progress={studentProgress}
            />}
            <div className="rounded-xl border border-subtle bg-sunken/60 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
                Investimento
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-default">
                {course.priceCents === 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Gratuito</span>
                ) : (
                  formatCurrency(course.priceCents)
                )}
              </p>
              {course.priceCents > 0 ? (
                <p className="mt-1 text-xs text-muted">Pagamento único</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <Tabs defaultValue="conteudo">
        <TabsList className="flex w-full flex-wrap justify-start gap-1 sm:w-auto">
          <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
          <TabsTrigger value="sobre">Sobre</TabsTrigger>
          <TabsTrigger value="avaliacoes">
            Avaliações
            {course._count.reviews > 0 ? (
              <span className="ml-1 rounded-full bg-sunken px-1.5 text-xs text-muted">
                {course._count.reviews}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="professor">Professor</TabsTrigger>
        </TabsList>

        {/* Conteúdo */}
        <TabsContent value="conteudo" id="conteudo">
          {course.modules.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="Conteúdo em preparação"
              description="Os módulos deste curso ainda estão sendo montados."
            />
          ) : (
            <div className="space-y-4">
              {course.modules.map((module, moduleIndex) => {
                const moduleDone = module.lessons.filter((l) => l.progress[0]?.completed).length;
                return (
                  <details
                    key={module.id}
                    open={moduleIndex === 0}
                    className="group overflow-hidden rounded-xl border border-subtle bg-surface shadow-soft transition-shadow hover:shadow-lifted"
                  >
                    <summary className="flex cursor-pointer list-none items-center gap-4 p-5 [&::-webkit-details-marker]:hidden">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300">
                        <span className="text-sm font-bold">{moduleIndex + 1}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold tracking-tight text-default">
                          {module.title}
                        </h3>
                        {module.summary ? (
                          <p className="mt-0.5 line-clamp-1 text-sm text-muted">
                            {module.summary}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-subtle">
                          {moduleDone} de {module.lessons.length} aulas concluídas
                        </p>
                      </div>
                      <ChevronDown className="h-5 w-5 shrink-0 text-subtle transition-transform duration-300 group-open:rotate-180" />
                    </summary>

                    <ul className="divide-y divide-[color:var(--border-subtle)] border-t border-subtle">
                      {module.lessons.map((lesson) => {
                        const progress = lesson.progress[0];
                        const completed = progress?.completed ?? false;
                        const locked = !canManage && !isEnrolled && !lesson.free;
                        return (
                          <li key={lesson.id}>
                            <Link
                              href={locked ? "#inscricao" : `/app/aulas/${lesson.id}`}
                              title={locked ? "Inscreva-se no curso para acessar esta aula" : undefined}
                              className={cn(
                                "flex items-center gap-4 px-5 py-3.5 transition-colors",
                                locked
                                  ? "cursor-not-allowed opacity-60"
                                  : "hover:bg-sunken/70",
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                                  completed
                                    ? "border-emerald-500 bg-emerald-500 text-white"
                                    : "border-default text-subtle",
                                )}
                                aria-hidden
                              >
                                {completed ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : locked ? (
                                  <Lock className="h-3.5 w-3.5" />
                                ) : (
                                  <PlayCircle className="h-4 w-4" />
                                )}
                              </span>

                              <div className="min-w-0 flex-1">
                                <p
                                  className={cn(
                                    "truncate text-sm font-medium",
                                    completed ? "text-muted" : "text-default",
                                  )}
                                >
                                  {lesson.title}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDuration(lesson.durationSec)}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    {lesson.kind === "AULA_AO_VIVO" ? (
                                      <Radio className="h-3 w-3" />
                                    ) : (
                                      <FileText className="h-3 w-3" />
                                    )}
                                    {LESSON_KIND_LABELS[lesson.kind] ?? lesson.kind}
                                  </span>
                                  {lesson.free ? (
                                    <Badge variant="success" className="px-1.5 py-0 text-[10px]">
                                      Gratuita
                                    </Badge>
                                  ) : null}
                                  {locked ? (
                                    <Badge variant="default" className="px-1.5 py-0 text-[10px]">
                                      Inscreva-se para acessar
                                    </Badge>
                                  ) : null}
                                </div>
                              </div>

                              {progress && !completed ? (
                                <span className="shrink-0 text-xs font-semibold tabular-nums text-muted">
                                  {progress.watchedPercent}%
                                </span>
                              ) : null}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Sobre */}
        <TabsContent value="sobre">
          <Card>
            <CardHeader>
              <CardTitle>Sobre o curso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
                {course.description}
              </p>
              <dl className="grid grid-cols-1 gap-3 border-t border-subtle pt-4 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-muted">Nível</dt>
                  <dd className="font-semibold text-default">{levelLabel(course.level)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-muted">Categoria</dt>
                  <dd className="font-semibold text-default">{course.category}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-muted">Aulas gratuitas</dt>
                  <dd className="font-semibold text-default">
                    {lessons.filter((l) => l.free).length}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-muted">Atualizado em</dt>
                  <dd className="font-semibold text-default">{formatDate(course.updatedAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Avaliações */}
        <TabsContent value="avaliacoes">
          {course.reviews.length === 0 ? (
            <EmptyState
              icon={Star}
              title="Ainda sem avaliações"
              description="Seja a primeira pessoa a avaliar este curso."
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <Card className="h-fit">
                <CardContent className="space-y-4 p-6 text-center">
                  <p className="text-5xl font-bold tracking-tight tabular-nums text-default">
                    {rating.toFixed(1).replace(".", ",")}
                  </p>
                  <StarRating rating={rating} size="md" showValue={false} />
                  <p className="text-sm text-muted">
                    {course._count.reviews}{" "}
                    {course._count.reviews === 1 ? "avaliação" : "avaliações"}
                  </p>
                </CardContent>
              </Card>

              <ul className="space-y-3">
                {course.reviews.map((review) => (
                  <li key={review.id}>
                    <Card>
                      <CardContent className="space-y-3 p-5">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={review.student.name}
                            src={review.student.avatarUrl}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-default">
                              {review.student.name}
                            </p>
                            <p className="text-xs text-subtle">
                              {formatDate(review.createdAt)}
                            </p>
                          </div>
                          <StarRating rating={review.rating} showValue={false} />
                        </div>
                        {review.comment ? (
                          <p className="text-sm leading-relaxed text-muted">{review.comment}</p>
                        ) : null}
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        {/* Professor */}
        <TabsContent value="professor">
          <Card>
            <CardContent className="space-y-5 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar
                  name={course.teacher.name}
                  src={course.teacher.avatarUrl}
                  size="xl"
                />
                <div className="min-w-0 space-y-1">
                  <h3 className="text-lg font-bold tracking-tight text-default">
                    {course.teacher.name}
                  </h3>
                  <p className="text-sm text-muted">Professor responsável por este curso</p>
                </div>
              </div>
              {course.teacher.bio ? (
                <p className="whitespace-pre-line border-t border-subtle pt-4 text-sm leading-relaxed text-muted">
                  {course.teacher.bio}
                </p>
              ) : (
                <p className="border-t border-subtle pt-4 text-sm text-subtle">
                  Este professor ainda não escreveu sua bio.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Aulas ao vivo do curso */}
      <section aria-labelledby="vivos-do-curso">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 id="vivos-do-curso" className="text-xl font-bold tracking-tight text-default">
              Aulas ao vivo deste curso
            </h2>
            <p className="text-sm text-muted">Sessões agendadas para os matriculados</p>
          </div>
        </div>

        {course.sessions.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={CalendarClock}
              title="Nenhuma sessão agendada"
              description="Novas aulas ao vivo deste curso serão divulgadas aqui."
            />
          </div>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {course.sessions.map((session) => (
              <li key={session.id}>
                <Card className="h-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lifted">
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cherry-500/10 text-cherry-600 dark:text-cherry-400">
                        <Radio className="h-5 w-5" />
                      </div>
                      <Badge variant={session.status === "CONFIRMADA" ? "success" : "default"}>
                        {session.status === "CONFIRMADA" ? "Confirmada" : "Agendada"}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <h3 className="line-clamp-2 text-sm font-semibold text-default">
                        {session.title}
                      </h3>
                      {session.description ? (
                        <p className="line-clamp-2 text-xs text-muted">{session.description}</p>
                      ) : null}
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
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Avaliação resumida + selo */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            icon: Award,
            title: "Certificado de conclusão",
            text: "Ao concluir 100% das aulas você recebe um certificado com código de registro.",
          },
          {
            icon: CalendarClock,
            title: "Aulas ao vivo",
            text: "Sessões de conversa e pronúncia com professores da casa.",
          },
          {
            icon: GraduationCap,
            title: "Acompanhamento",
            text: "Feedback direto no professor para cada módulo concluído.",
          },
        ].map((item) => (
          <Card key={item.title}>
            <CardContent className="space-y-2 p-5">
              <item.icon className="h-5 w-5 text-brand-500" />
              <h3 className="text-sm font-semibold text-default">{item.title}</h3>
              <p className="text-sm text-muted">{item.text}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sunken text-brand-500">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-wide text-subtle">{label}</dt>
        <dd className="truncate text-sm font-bold text-default">{value}</dd>
      </div>
    </div>
  );
}
