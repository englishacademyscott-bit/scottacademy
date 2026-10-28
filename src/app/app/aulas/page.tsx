import Link from "next/link";
import { BookOpen, LibraryBig, Video } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { LessonLibrary, type LessonListItem } from "./_components/lesson-library";

export const dynamic = "force-dynamic";

export default async function LessonsPage() {
  const user = await requireUser();

  const [lessons, courses] = await Promise.all([
    prisma.lesson.findMany({
      where: { published: true, module: { course: { published: true } } },
      orderBy: [{ module: { position: "asc" } }, { position: "asc" }],
      include: {
        module: {
          include: {
            course: { select: { id: true, title: true, slug: true, coverUrl: true } },
          },
        },
        progress: {
          where: { studentId: user.id },
          select: { completed: true, watchedPercent: true, lastViewedAt: true },
        },
      },
    }),
    prisma.course.findMany({
      where: { published: true },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const items: LessonListItem[] = lessons.map((lesson) => {
    const progress = lesson.progress[0];
    return {
      id: lesson.id,
      title: lesson.title,
      kind: lesson.kind,
      durationSec: lesson.durationSec,
      free: lesson.free,
      moduleTitle: lesson.module.title,
      courseId: lesson.module.course.id,
      courseTitle: lesson.module.course.title,
      courseSlug: lesson.module.course.slug,
      courseCoverUrl: lesson.module.course.coverUrl,
      watchedPercent: progress?.watchedPercent ?? 0,
      completed: progress?.completed ?? false,
      lastViewedAt: progress?.lastViewedAt
        ? new Date(progress.lastViewedAt).toISOString()
        : null,
    };
  });

  const completed = items.filter((l) => l.completed).length;

  return (
    <div className="space-y-6 animate-fade-up">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted">
            <LibraryBig className="h-4 w-4" />
            <span>Biblioteca</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-default sm:text-3xl">
            Aulas
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            {items.length > 0
              ? `${items.length} aulas disponíveis · ${completed} concluída(s). Retome de onde parou a qualquer momento.`
              : "Todas as aulas gravadas, lives e particulares em um só lugar."}
          </p>
        </div>
        <Button asChild variant="secondary" className="w-full sm:w-auto">
          <Link href="/app/cursos">
            <BookOpen className="h-4 w-4" />
            Ver cursos
          </Link>
        </Button>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={Video}
          title="Nenhuma aula publicada"
          description="Assim que as aulas forem publicadas, elas aparecem aqui."
          action={
            <Button asChild variant="secondary" size="sm">
              <Link href="/app/cursos">Explorar cursos</Link>
            </Button>
          }
        />
      ) : (
        <LessonLibrary lessons={items} courses={courses} />
      )}
    </div>
  );
}
