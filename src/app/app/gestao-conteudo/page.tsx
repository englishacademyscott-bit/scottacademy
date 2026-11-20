import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { SectionHeader } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCourse, createExam, createLesson, createMaterial, createModule, createQuestion, togglePublish } from "./actions";

export const metadata = { title: "Gestão de conteúdo" };
export const dynamic = "force-dynamic";
const field = "w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-default";

export default async function ContentManagementPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireRole([Role.ADMIN, Role.EDITOR, Role.PROFESSOR]);
  const params = await searchParams;
  const filter = user.role === Role.PROFESSOR ? { teacherId: user.id } : {};
  const [courses, teachers] = await Promise.all([
    prisma.course.findMany({ where: filter, orderBy: { updatedAt: "desc" }, include: { modules: { orderBy: { position: "asc" }, include: { lessons: { orderBy: { position: "asc" } } } }, exams: { orderBy: { createdAt: "desc" }, include: { _count: { select: { questions: true } } } } } }),
    prisma.user.findMany({ where: { role: { in: [Role.PROFESSOR, Role.ADMIN] } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const modules = courses.flatMap((course) => course.modules.map((module) => ({ ...module, courseTitle: course.title })));
  const lessons = modules.flatMap((module) => module.lessons.map((lesson) => ({ ...lesson, moduleTitle: module.title })));
  const exams = courses.flatMap((course) => course.exams.map((exam) => ({ ...exam, courseTitle: course.title })));

  return <div className="space-y-6">
    <SectionHeader title="Gestão de conteúdo" description="Cadastre cursos, módulos, aulas, materiais e avaliações antes de publicá-los para os alunos." />
    {params.ok ? <p className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">{params.ok}</p> : null}
    {params.error ? <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{params.error}</p> : null}

    {user.role !== Role.PROFESSOR ? <Card><CardHeader><CardTitle>Novo curso</CardTitle></CardHeader><CardContent><form action={createCourse} className="grid gap-3 md:grid-cols-2">
      <input className={field} name="title" placeholder="Título" required />
      <input className={field} name="subtitle" placeholder="Subtítulo" />
      <textarea className={`${field} md:col-span-2`} name="description" placeholder="Descrição" minLength={10} required />
      <input className={field} name="category" placeholder="Categoria" defaultValue="Inglês" />
      <select className={field} name="level"><option value="INICIANTE">Iniciante</option><option value="INTERMEDIARIO">Intermediário</option><option value="AVANCADO">Avançado</option></select>
      <select className={field} name="teacherId" required><option value="">Professor responsável</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select>
      <input className={field} name="price" type="number" min="0" step="0.01" placeholder="Preço (R$)" />
      <Button type="submit">Criar curso</Button>
    </form></CardContent></Card> : null}

    <div className="grid gap-4 xl:grid-cols-2">
      <Card><CardHeader><CardTitle>Novo módulo</CardTitle></CardHeader><CardContent><form action={createModule} className="space-y-3"><select className={field} name="courseId" required><option value="">Curso</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select><input className={field} name="title" placeholder="Título do módulo" required/><textarea className={field} name="summary" placeholder="Resumo"/><Button type="submit">Adicionar módulo</Button></form></CardContent></Card>
      <Card><CardHeader><CardTitle>Nova aula</CardTitle></CardHeader><CardContent><form action={createLesson} className="space-y-3"><select className={field} name="moduleId" required><option value="">Módulo</option>{modules.map((m) => <option key={m.id} value={m.id}>{m.courseTitle} · {m.title}</option>)}</select><input className={field} name="title" placeholder="Título da aula" required/><input className={field} name="videoUrl" type="url" placeholder="URL do vídeo ou reunião"/><div className="grid grid-cols-2 gap-3"><select className={field} name="kind"><option value="AULA_GRAVADA">Gravada</option><option value="AULA_AO_VIVO">Ao vivo</option><option value="AULA_PARTICULAR">Particular</option></select><input className={field} name="durationMin" type="number" min="0" placeholder="Minutos"/></div><label className="mr-4 text-sm"><input name="published" type="checkbox"/> Publicar</label><label className="text-sm"><input name="free" type="checkbox"/> Aula grátis</label><div><Button type="submit">Adicionar aula</Button></div></form></CardContent></Card>
      <Card><CardHeader><CardTitle>Novo material</CardTitle></CardHeader><CardContent><form action={createMaterial} className="space-y-3"><select className={field} name="lessonId" required><option value="">Aula</option>{lessons.map((l) => <option key={l.id} value={l.id}>{l.moduleTitle} · {l.title}</option>)}</select><input className={field} name="title" placeholder="Nome do material" required/><input className={field} name="url" type="url" placeholder="https://..." required/><input className={field} name="kind" placeholder="PDF, DOC, LINK..." defaultValue="PDF"/><Button type="submit">Vincular material</Button></form></CardContent></Card>
      <Card><CardHeader><CardTitle>Nova prova</CardTitle></CardHeader><CardContent><form action={createExam} className="space-y-3"><select className={field} name="courseId" required><option value="">Curso</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select><input className={field} name="title" placeholder="Título da prova" required/><textarea className={field} name="description" placeholder="Descrição"/><div className="grid grid-cols-3 gap-2"><input className={field} name="timeLimitMin" type="number" defaultValue="30" title="Tempo em minutos"/><input className={field} name="passingPercent" type="number" defaultValue="60" title="Aprovação %"/><input className={field} name="maxAttempts" type="number" defaultValue="3" title="Tentativas"/></div><Button type="submit">Criar prova</Button></form></CardContent></Card>
      <Card><CardHeader><CardTitle>Nova questão objetiva</CardTitle></CardHeader><CardContent><form action={createQuestion} className="space-y-3"><select className={field} name="examId" required><option value="">Prova</option>{exams.map((e) => <option key={e.id} value={e.id}>{e.courseTitle} · {e.title}</option>)}</select><textarea className={field} name="prompt" placeholder="Enunciado" required/><textarea className={field} name="options" placeholder={'Uma opção por linha\nSegunda opção'} required/><div className="grid grid-cols-2 gap-3"><input className={field} name="correctOption" type="number" min="1" defaultValue="1" title="Número da opção correta"/><input className={field} name="points" type="number" min="1" defaultValue="1" title="Pontos"/></div><textarea className={field} name="explanation" placeholder="Explicação da resposta"/><Button type="submit">Adicionar questão</Button></form></CardContent></Card>
    </div>

    <Card><CardHeader><CardTitle>Publicação</CardTitle></CardHeader><CardContent className="space-y-4">{courses.length ? courses.map((course) => <div key={course.id} className="rounded-lg border border-subtle p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{course.title}</strong><form action={togglePublish}><input type="hidden" name="type" value="course"/><input type="hidden" name="id" value={course.id}/><Button type="submit" variant="secondary">{course.published ? "Despublicar curso" : "Publicar curso"}</Button></form></div><div className="mt-3 space-y-2 text-sm">{course.modules.flatMap((m) => m.lessons).map((lesson) => <div key={lesson.id} className="flex items-center justify-between gap-2"><span>{lesson.title} · {lesson.published ? "publicada" : "rascunho"}</span><form action={togglePublish}><input type="hidden" name="type" value="lesson"/><input type="hidden" name="id" value={lesson.id}/><button className="text-brand-600 underline" type="submit">alternar</button></form></div>)}{course.exams.map((exam) => <div key={exam.id} className="flex items-center justify-between gap-2"><span>{exam.title} · {exam._count.questions} questões · {exam.published ? "publicada" : "rascunho"}</span><form action={togglePublish}><input type="hidden" name="type" value="exam"/><input type="hidden" name="id" value={exam.id}/><button className="text-brand-600 underline" type="submit">alternar</button></form></div>)}</div></div>) : <p className="text-sm text-muted">Nenhum curso disponível para este perfil.</p>}</CardContent></Card>
  </div>;
}
