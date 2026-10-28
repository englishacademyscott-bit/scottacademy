import { Suspense } from "react";
import type { LessonKind, Prisma } from "@prisma/client";
import { LibraryBig } from "lucide-react";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { SectionHeader, StatCard, EmptyState } from "@/components/ui/primitives";
import { BibliotecaView } from "@/components/app/biblioteca-view";
import { QueryFilters } from "@/components/app/query-filters";

export const metadata = { title: "Biblioteca" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const KIND_LABEL: Record<string, string> = {
  AULA_GRAVADA: "Gravada",
  AULA_AO_VIVO: "Ao vivo",
  AULA_PARTICULAR: "Particular",
};

export default async function BibliotecaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireRole(["EDITOR", "PROFESSOR", "ADMIN"]);
  const sp = await searchParams;

  const q = (first(sp.q) ?? "").trim();
  const curso = first(sp.curso) ?? "";
  const tipo = first(sp.tipo) ?? "";
  const publicado = first(sp.publicado) ?? "";

  const courses = await prisma.course.findMany({
    where: user.role === "PROFESSOR" ? { teacherId: user.id } : {},
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
  const courseIds = courses.map((c) => c.id);

  const moduleFilter: Prisma.ModuleWhereInput = curso
    ? { courseId: curso }
    : courseIds.length
      ? { courseId: { in: courseIds } }
      : { courseId: "__none__" };

  const where: Prisma.LessonWhereInput = {
    module: moduleFilter,
    ...(tipo ? { kind: tipo as unknown as LessonKind } : {}),
    ...(publicado === "sim" ? { published: true } : publicado === "nao" ? { published: false } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { module: { title: { contains: q, mode: "insensitive" } } },
            { module: { course: { title: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [lessons, totalLessons, publishedCount] = await Promise.all([
    prisma.lesson.findMany({
      where,
      include: {
        module: { select: { id: true, title: true, position: true, course: { select: { id: true, title: true } } } },
        materials: { select: { id: true, title: true, kind: true, url: true } },
        _count: { select: { progress: true } },
      },
      orderBy: [{ module: { course: { title: "asc" } } }, { module: { position: "asc" } }, { position: "asc" }],
    }),
    prisma.lesson.count({
      where: courseIds.length ? { module: { courseId: { in: courseIds } } } : { id: "__none__" },
    }),
    prisma.lesson.count({
      where: { published: true, ...(courseIds.length ? { module: { courseId: { in: courseIds } } } : { id: "__none__" } ) },
    }),
  ]);

  const rows = lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    kind: lesson.kind,
    durationSec: lesson.durationSec,
    videoUrl: lesson.videoUrl,
    published: lesson.published,
    free: lesson.free,
    position: lesson.position,
    moduleId: lesson.module.id,
    moduleTitle: lesson.module.title,
    modulePosition: lesson.module.position,
    courseId: lesson.module.course.id,
    courseTitle: lesson.module.course.title,
    materials: lesson.materials.map((m) => ({ id: m.id, title: m.title, kind: m.kind, url: m.url })),
    studentsReached: lesson._count.progress,
  }));

  const totalMaterials = rows.reduce((sum, r) => sum + r.materials.length, 0);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Biblioteca de conteúdo"
        description="Todas as aulas da plataforma. Publique, edite, duplique ou remova conteúdo."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Aulas no total" value={totalLessons} icon={LibraryBig} />
        <StatCard label="Publicadas" value={publishedCount} icon={LibraryBig} hint={`${totalLessons - publishedCount} rascunhos`} />
        <StatCard label="Materiais" value={totalMaterials} icon={LibraryBig} />
        <StatCard label="Cursos" value={courses.length} icon={LibraryBig} />
      </div>

      <Suspense fallback={<div className="h-10" />}>
        <QueryFilters
          search={{ value: q, placeholder: "Buscar por título, módulo ou curso" }}
          selects={[
            {
              name: "curso",
              label: "Todos os cursos",
              value: curso,
              options: courses.map((c) => ({ value: c.id, label: c.title })),
            },
            {
              name: "tipo",
              label: "Todos os tipos",
              value: tipo,
              options: Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label })),
            },
            {
              name: "publicado",
              label: "Todos os status",
              value: publicado,
              options: [
                { value: "sim", label: "Publicadas" },
                { value: "nao", label: "Rascunhos" },
              ],
            },
          ]}
        />
      </Suspense>

      {rows.length === 0 ? (
        <EmptyState
          icon={LibraryBig}
          title="Nenhuma aula encontrada"
          description="Ajuste a busca ou os filtros para ver outros conteúdos da biblioteca."
        />
      ) : (
        <BibliotecaView rows={rows} />
      )}
    </div>
  );
}
