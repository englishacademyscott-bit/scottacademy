import Link from "next/link";
import { BookOpen, GraduationCap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import {
  CourseBrowser,
  type CourseListItem,
} from "./_components/course-browser";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Decisão de arquitetura (busca + filtros):
 *
 * - Os dados (cursos publicados + agregados de avaliação/matrícula) são
 *   buscados no Prisma no **Server Component**, uma única vez.
 * - Os **filtros estruturados** (nível, categoria, "só matriculados") e a
 *   **busca textual** são aplicados no **client-side**, sobre o conjunto já
 *   recebido. Motivo: a resposta é instantânea (sem round-trip por tecla) e o
 *   volume de cursos é pequeno — o filtro do banco traria latência sem ganho.
 * - O `searchParams` da URL é lido no servidor apenas para **hidratar** o
 *   estado inicial do filtro (permite links compartilháveis e deep-link),
 *   mantendo a UI em sincronia com a URL na primeira renderização.
 */
export default async function CoursesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;

  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const initialQuery = first(params.q) ?? "";
  const initialLevel = first(params.nivel) ?? "TODOS";
  const initialCategory = first(params.categoria) ?? "TODOS";
  const initialOnlyEnrolled = first(params.matriculado) === "1";

  const [courses, freeLessonsByCourse] = await Promise.all([
    prisma.course.findMany({
      where: { published: true },
      orderBy: [{ createdAt: "desc" }],
      include: {
        teacher: { select: { id: true, name: true } },
        modules: { select: { id: true, _count: { select: { lessons: true } } } },
        _count: { select: { enrollments: true, reviews: true } },
        reviews: { select: { rating: true } },
        enrollments: {
          where: { studentId: user.id },
          select: { id: true, status: true, progress: true },
        },
      },
    }),
    prisma.lesson.groupBy({
      by: ["moduleId"],
      where: { free: true, module: { course: { published: true } } },
      _count: { _all: true },
    }),
  ]);

  const freeByCourse = new Map<string, number>();
  if (freeLessonsByCourse.length) {
    const modules = await prisma.module.findMany({
      where: { id: { in: freeLessonsByCourse.map((f) => f.moduleId) } },
      select: { id: true, courseId: true },
    });
    const courseOf = new Map(modules.map((m) => [m.id, m.courseId]));
    for (const entry of freeLessonsByCourse) {
      const courseId = courseOf.get(entry.moduleId);
      if (courseId) {
        freeByCourse.set(courseId, (freeByCourse.get(courseId) ?? 0) + entry._count._all);
      }
    }
  }

  const items: CourseListItem[] = courses.map((course) => {
    const lessonCount = course.modules.reduce((acc, m) => acc + m._count.lessons, 0);
    const freeLessons = freeByCourse.get(course.id) ?? 0;
    const rating = course.reviews.length
      ? course.reviews.reduce((acc, r) => acc + r.rating, 0) / course.reviews.length
      : 0;
    const enrollment = course.enrollments[0];

    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      subtitle: course.subtitle,
      coverUrl: course.coverUrl,
      category: course.category,
      level: course.level,
      priceCents: course.priceCents,
      durationMin: course.durationMin,
      teacherName: course.teacher.name,
      lessonCount,
      moduleCount: course.modules.length,
      studentCount: course._count.enrollments,
      rating,
      reviewCount: course._count.reviews,
      freeLessons,
      enrolled: Boolean(enrollment && enrollment.status !== "CANCELADO"),
      progress: enrollment?.progress ?? 0,
    };
  });

  const levels = Array.from(new Set(items.map((c) => c.level))).sort();
  const categories = Array.from(new Set(items.map((c) => c.category))).sort();

  const isStudent = user.role === "ALUNO";

  return (
    <div className="space-y-6 animate-fade-up">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted">
          <BookOpen className="h-4 w-4" />
          <span>Biblioteca de cursos</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-default sm:text-3xl">
          Cursos
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          {isStudent
            ? "Escolha seu próximo passo: cursos com aulas gravadas, lives e prática de fala."
            : "Todos os cursos publicados da plataforma."}
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Nenhum curso publicado ainda"
          description="Assim que o conteúdo for publicado, ele aparece aqui."
          action={
            <Button asChild variant="secondary" size="sm">
              <Link href="/app">Voltar ao início</Link>
            </Button>
          }
        />
      ) : (
        <CourseBrowser
          courses={items}
          initialQuery={initialQuery}
          initialLevel={levels.includes(initialLevel) ? initialLevel : "TODOS"}
          initialCategory={categories.includes(initialCategory) ? initialCategory : "TODOS"}
          initialOnlyEnrolled={initialOnlyEnrolled}
          levels={levels}
          categories={categories}
        />
      )}
    </div>
  );
}
