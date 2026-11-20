import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Download,
  FileText,
  GraduationCap,
  Layers,
  MessageSquare,
  NotebookPen,
  Radio,
  ScrollText,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { canManageCourse, getAccessibleLesson } from "@/lib/learning-access";
import { requireUser } from "@/lib/guards";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/primitives";
import { cn, formatDuration } from "@/lib/utils";
import { toEmbedUrl, videoLabel } from "@/app/app/_components/video";
import { LessonPlayer } from "../_components/lesson-player";
import { LessonViewTracker } from "../_components/lesson-view-tracker";

export const dynamic = "force-dynamic";

const LESSON_KIND_LABELS: Record<string, string> = {
  AULA_GRAVADA: "Gravada",
  AULA_AO_VIVO: "Ao vivo",
  AULA_PARTICULAR: "Particular",
};

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      module: {
        include: {
          course: {
            include: {
              modules: {
                orderBy: { position: "asc" },
                include: {
                  lessons: {
                    orderBy: { position: "asc" },
                    select: {
                      id: true,
                      title: true,
                      published: true,
                      progress: {
                        where: { studentId: user.id },
                        select: { completed: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      materials: { orderBy: { title: "asc" } },
      progress: { where: { studentId: user.id } },
    },
  });

  if (!lesson) notFound();
  const canManage = canManageCourse(user, lesson.module.course.teacherId);
  if ((!lesson.published || !lesson.module.course.published) && !canManage) notFound();
  if (!await getAccessibleLesson(user, lesson.id)) redirect(`/app/cursos/${lesson.module.course.slug}#inscricao`);

  const progress = lesson.progress[0];
  const course = lesson.module.course;

  // Sequência de aulas do mesmo curso para anterior/próxima.
  const orderedLessons = course.modules.flatMap((module) =>
    module.lessons.filter(l => canManage || l.published).map((l) => ({ ...l, moduleTitle: module.title })),
  );
  const index = orderedLessons.findIndex((l) => l.id === lesson.id);
  const prev = index > 0 ? orderedLessons[index - 1] : null;
  const next = index >= 0 && index < orderedLessons.length - 1 ? orderedLessons[index + 1] : null;

  const embed = toEmbedUrl(lesson.videoUrl);
  const providerLabel = videoLabel(lesson.videoUrl);

  return (
    <div className="space-y-6 animate-fade-up">
      <LessonViewTracker lessonId={lesson.id} />

      {/* Cabeçalho */}
      <nav aria-label="Trilha" className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <Link href="/app/aulas" className="transition-colors hover:text-default">
          Aulas
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <Link
          href={`/app/cursos/${course.slug}`}
          className="transition-colors hover:text-default"
        >
          {course.title}
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span className="truncate text-subtle">{lesson.module.title}</span>
      </nav>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">
            {LESSON_KIND_LABELS[lesson.kind] ?? lesson.kind}
          </Badge>
          {lesson.free ? <Badge variant="pop">Gratuita</Badge> : null}
          {progress?.completed ? (
            <Badge variant="success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Concluída
            </Badge>
          ) : null}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-default sm:text-3xl">
          {lesson.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {formatDuration(lesson.durationSec)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Layers className="h-4 w-4" />
            {lesson.module.title}
          </span>
          <Link
            href={`/app/cursos/${course.slug}`}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-default"
          >
            <BookOpen className="h-4 w-4" />
            {course.title}
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Coluna principal */}
        <div className="min-w-0 space-y-6">
          <LessonPlayer
            lessonId={lesson.id}
            title={lesson.title}
            embedSrc={embed?.src ?? null}
            providerLabel={providerLabel}
            durationSec={lesson.durationSec}
            initiallyCompleted={progress?.completed ?? false}
            initialPercent={progress?.watchedPercent ?? 0}
            prevLessonId={prev?.id ?? null}
            nextLessonId={next?.id ?? null}
            prevLabel={prev?.title ?? null}
            nextLabel={next?.title ?? null}
          />

          <Tabs defaultValue="sobre">
            <TabsList className="flex w-full flex-wrap justify-start gap-1 sm:w-auto">
              <TabsTrigger value="sobre">Sobre</TabsTrigger>
              <TabsTrigger value="transcricao">
                <ScrollText className="h-4 w-4" />
                Transcrição
              </TabsTrigger>
              <TabsTrigger value="notas">
                <NotebookPen className="h-4 w-4" />
                Notas
              </TabsTrigger>
              <TabsTrigger value="discussao">
                <MessageSquare className="h-4 w-4" />
                Discussão
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sobre">
              <Card>
                <CardHeader>
                  <CardTitle>Sobre esta aula</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {lesson.description ? (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
                      {lesson.description}
                    </p>
                  ) : (
                    <p className="text-sm text-subtle">
                      O professor ainda não escreveu a descrição desta aula.
                    </p>
                  )}

                  <div className="space-y-3 border-t border-subtle pt-4">
                    <h3 className="text-sm font-semibold text-default">Material de apoio</h3>
                    {lesson.materials.length > 0 ? (
                      <ul className="space-y-2">
                        {lesson.materials.map((material) => (
                          <li key={material.id}>
                            <a
                              href={material.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex items-center gap-3 rounded-xl border border-subtle bg-sunken/50 p-3.5 transition-colors hover:border-brand-300 hover:bg-sunken"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-default">
                                  {material.title}
                                </p>
                                <p className="text-xs text-subtle">{material.kind}</p>
                              </div>
                              <Download
                                className="h-4 w-4 shrink-0 text-subtle transition-colors group-hover:text-brand-500"
                                aria-hidden
                              />
                              <span className="sr-only">Abrir em nova aba</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-subtle">
                        Nenhum material de apoio foi anexado a esta aula.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transcricao">
              <Card>
                <CardHeader>
                  <CardTitle>Transcrição</CardTitle>
                </CardHeader>
                <CardContent>
                  <EmptyState
                    icon={ScrollText}
                    title="Transcrição indisponível"
                    description="Esta aula ainda não possui uma transcrição cadastrada."
                    className="border-0 bg-transparent py-8"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notas">
              <Card>
                <CardHeader>
                  <CardTitle>Minhas notas</CardTitle>
                </CardHeader>
                <CardContent>
                  <EmptyState
                    icon={NotebookPen}
                    title="Anotações pessoais"
                    description="Suas notas de estudo aparecerão aqui assim que o espaço de notas for liberado."
                    className="border-0 bg-transparent py-8"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="discussao">
              <Card>
                <CardHeader>
                  <CardTitle>Discussão da aula</CardTitle>
                </CardHeader>
                <CardContent>
                  <EmptyState
                    icon={MessageSquare}
                    title="Sem mensagens ainda"
                    description="Troque ideias com outros alunos e tire suas dúvidas sobre esta aula."
                    className="border-0 bg-transparent py-8"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Painel lateral */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <GraduationCap className="h-4 w-4 text-brand-500" />
                Conteúdo do curso
              </CardTitle>
              <Link
                href={`/app/cursos/${course.slug}`}
                className="truncate text-xs text-muted transition-colors hover:text-brand-600 dark:hover:text-brand-300"
              >
                {course.title}
              </Link>
            </CardHeader>
            <CardContent className="max-h-[32rem] space-y-4 overflow-y-auto p-4 pt-0">
              {course.modules.map((module) => (
                <div key={module.id} className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
                    {module.title}
                  </p>
                  <ul className="space-y-0.5">
                    {module.lessons.map((l) => {
                      const isCurrent = l.id === lesson.id;
                      const done = l.progress[0]?.completed ?? false;
                      return (
                        <li key={l.id}>
                          <Link
                            href={`/app/aulas/${l.id}`}
                            aria-current={isCurrent ? "page" : undefined}
                            className={cn(
                              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                              isCurrent
                                ? "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200"
                                : "text-muted hover:bg-sunken hover:text-default",
                            )}
                          >
                            {done && !isCurrent ? (
                              <CheckCircle2
                                className="h-3.5 w-3.5 shrink-0 text-emerald-500"
                                aria-hidden
                              />
                            ) : isCurrent ? (
                              <Radio className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            ) : (
                              <Circle className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                            )}
                            <span className="line-clamp-2">{l.title}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
