"use client";

import * as React from "react";
import {
  Activity,
  BookOpen,
  CalendarClock,
  ChevronRight,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  GraduationCap,
  Mail,
  Phone,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatDateTime } from "@/lib/utils";

export interface AlunoRow {
  enrollmentId: string;
  studentId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  courseId: string;
  courseTitle: string;
  progress: number;
  completedLessons: number;
  avgScore: number | null;
  status: "ATIVO" | "INATIVO";
  statusLabel: string;
  lastActivity: string | null;
}

export interface AlunoDetalhe {
  studentId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
  createdAt: string;
  courses: {
    id: string;
    title: string;
    progress: number;
    status: string;
    modules: { id: string; title: string; position: number; completed: number; total: number; percent: number }[];
  }[];
  exams: {
    id: string;
    title: string;
    courseTitle: string;
    score: number | null;
    passed: boolean | null;
    submittedAt: string | null;
    answers: {
      id: string;
      prompt: string;
      questionType: string;
      points: number;
      textAnswer: string | null;
      optionText: string | null;
      isCorrect: boolean;
      pointsAwarded: number;
      feedback: string | null;
      feedbackAt: string | null;
    }[];
  }[];
  completedLessons: { id: string; title: string; courseTitle: string; moduleTitle: string; completedAt: string | null }[];
  stats: { completedLessons: number; totalLessons: number; avgScore: number | null; lastActivity: string | null };
}

function scoreVariant(score: number | null) {
  if (score == null) return "outline" as const;
  if (score >= 80) return "success" as const;
  if (score >= 60) return "brand" as const;
  return "danger" as const;
}

function relativeDate(iso: string | null) {
  if (!iso) return "Sem atividade";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return minutes <= 1 ? "Agora mesmo" : `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Há ${days}d`;
  return formatDate(iso);
}

export function AlunosView({ rows, details }: { rows: AlunoRow[]; details: AlunoDetalhe[] }) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const detail = details.find((d) => d.studentId === selectedId) ?? null;

  return (
    <>
      {/* Tabela (desktop) */}
      <div className="relative hidden overflow-hidden rounded-xl border border-subtle bg-surface shadow-soft xl:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Lista de alunos matriculados</caption>
          <thead>
            <tr className="border-b border-subtle bg-sunken text-left">
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">
                Aluno
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">
                Curso
              </th>
              <th scope="col" className="w-44 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">
                Progresso
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">
                Aulas
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">
                Nota média
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">
                Última atividade
              </th>
              <th scope="col" className="w-12 px-4 py-3">
                <span className="sr-only">Abrir detalhe</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.enrollmentId}
                className="cursor-pointer border-b border-subtle transition-colors last:border-0 hover:bg-sunken"
                onClick={() => setSelectedId(row.studentId)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={row.name} src={row.avatarUrl} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-default">{row.name}</p>
                      <p className="truncate text-xs text-muted">{row.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="line-clamp-1 text-muted">{row.courseTitle}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Progress value={row.progress} size="sm" className="w-24" />
                    <span className="w-9 text-right text-xs font-semibold tabular-nums text-default">
                      {row.progress}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted tabular-nums">{row.completedLessons}</td>
                <td className="px-4 py-3">
                  {row.avgScore == null ? (
                    <span className="text-xs text-subtle">—</span>
                  ) : (
                    <Badge variant={scoreVariant(row.avgScore)}>{row.avgScore}%</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={row.status === "ATIVO" ? "success" : "outline"}>
                    <span className="sr-only">Status: </span>
                    {row.statusLabel}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted">{relativeDate(row.lastActivity)}</td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Ver detalhes de ${row.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(row.studentId);
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards (mobile) */}
      <div className="space-y-3 xl:hidden">
        {rows.map((row) => (
          <button
            key={row.enrollmentId}
            type="button"
            onClick={() => setSelectedId(row.studentId)}
            className="w-full rounded-xl border border-subtle bg-surface p-4 text-left shadow-soft transition-colors hover:bg-sunken"
          >
            <div className="flex items-start gap-3">
              <Avatar name={row.name} src={row.avatarUrl} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-default">{row.name}</p>
                    <p className="truncate text-xs text-muted">{row.email}</p>
                  </div>
                  <Badge variant={row.status === "ATIVO" ? "success" : "outline"}>{row.statusLabel}</Badge>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                  <BookOpen className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{row.courseTitle}</span>
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Progress value={row.progress} size="sm" className="flex-1" />
                  <span className="text-xs font-semibold tabular-nums text-default">{row.progress}%</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <CircleCheck className="h-3.5 w-3.5" /> {row.completedLessons} aulas
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {row.avgScore == null ? "sem nota" : `${row.avgScore}%`}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5" /> {relativeDate(row.lastActivity)}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Painel de detalhe */}
      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-2xl p-0">
          {detail ? (
            <>
              <DialogHeader className="border-b border-subtle pb-4">
                <div className="flex items-start gap-3 pr-8">
                  <Avatar name={detail.name} src={detail.avatarUrl} size="lg" />
                  <div className="min-w-0">
                    <DialogTitle>{detail.name}</DialogTitle>
                    <DialogDescription className="mt-1 flex flex-col gap-1">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" /> {detail.email}
                      </span>
                      {detail.phone ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" /> {detail.phone}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5" /> Aluno desde {formatDate(detail.createdAt)}
                      </span>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 px-6 pb-6">
                {detail.bio ? (
                  <p className="rounded-lg border border-subtle bg-sunken p-3 text-sm text-muted">
                    {detail.bio}
                  </p>
                ) : null}

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-subtle p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">Aulas</p>
                    <p className="text-xl font-bold tabular-nums text-default">
                      {detail.stats.completedLessons}
                      <span className="text-sm font-medium text-subtle">/{detail.stats.totalLessons}</span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-subtle p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">Nota média</p>
                    <p className="text-xl font-bold tabular-nums text-default">
                      {detail.stats.avgScore == null ? "—" : `${detail.stats.avgScore}%`}
                    </p>
                  </div>
                  <div className="rounded-lg border border-subtle p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">Atividade</p>
                    <p className="text-sm font-semibold text-default">{relativeDate(detail.stats.lastActivity)}</p>
                  </div>
                </div>

                <Tabs defaultValue="cursos">
                  <TabsList>
                    <TabsTrigger value="cursos">Cursos</TabsTrigger>
                    <TabsTrigger value="provas">Provas</TabsTrigger>
                    <TabsTrigger value="aulas">Aulas</TabsTrigger>
                  </TabsList>

                  <TabsContent value="cursos" className="space-y-4">
                    {detail.courses.length === 0 ? (
                      <p className="text-sm text-muted">Nenhuma matrícula encontrada.</p>
                    ) : (
                      detail.courses.map((course) => (
                        <div key={course.id} className="rounded-lg border border-subtle">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle px-4 py-3">
                            <p className="font-semibold text-default">{course.title}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant={course.status === "ATIVO" ? "success" : "outline"}>
                                {course.status === "ATIVO" ? "Ativo" : "Inativo"}
                              </Badge>
                              <span className="text-xs font-semibold tabular-nums text-muted">
                                {course.progress}%
                              </span>
                            </div>
                          </div>
                          <ul className="divide-y divide-[color:var(--border-subtle)]">
                            {course.modules.map((module) => (
                              <li key={module.id} className="px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="truncate text-sm font-medium text-default">{module.title}</p>
                                  <span className="shrink-0 text-xs tabular-nums text-muted">
                                    {module.completed}/{module.total}
                                  </span>
                                </div>
                                <Progress value={module.percent} size="sm" className="mt-2" />
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="provas" className="space-y-3">
                    {detail.exams.length === 0 ? (
                      <p className="text-sm text-muted">Nenhuma prova concluída ainda.</p>
                    ) : (
                      detail.exams.map((attempt) => (
                        <div key={attempt.id} className="rounded-lg border border-subtle">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle px-4 py-3">
                            <div>
                              <p className="text-sm font-semibold text-default">{attempt.title}</p>
                              <p className="text-xs text-muted">
                                {attempt.courseTitle}
                                {attempt.submittedAt ? ` · ${formatDateTime(attempt.submittedAt)}` : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={scoreVariant(attempt.score)}>
                                {attempt.score == null ? "—" : `${attempt.score}%`}
                              </Badge>
                              {attempt.passed === true ? (
                                <Badge variant="success">
                                  <CircleCheck className="h-3.5 w-3.5" /> Aprovado
                                </Badge>
                              ) : attempt.passed === false ? (
                                <Badge variant="danger">
                                  <CircleX className="h-3.5 w-3.5" /> Reprovado
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          <ul className="divide-y divide-[color:var(--border-subtle)]">
                            {attempt.answers.map((answer) => (
                              <li key={answer.id} className="px-4 py-3">
                                <p className="text-sm font-medium text-default">{answer.prompt}</p>
                                <p className="mt-1 text-xs text-muted">
                                  Resposta: {answer.textAnswer ?? answer.optionText ?? "—"} ·{" "}
                                  {answer.pointsAwarded}/{answer.points} pts
                                </p>
                                {answer.feedback ? (
                                  <p className="mt-2 rounded-lg border-l-2 border-brand-400 bg-sunken px-3 py-2 text-xs text-muted">
                                    {answer.feedback}
                                  </p>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="aulas">
                    {detail.completedLessons.length === 0 ? (
                      <p className="text-sm text-muted">Nenhuma aula concluída ainda.</p>
                    ) : (
                      <ul className="divide-y divide-[color:var(--border-subtle)] rounded-lg border border-subtle">
                        {detail.completedLessons.map((lesson) => (
                          <li key={lesson.id} className="flex items-start gap-3 px-4 py-3">
                            <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-default">{lesson.title}</p>
                              <p className="text-xs text-muted">
                                {lesson.courseTitle} · {lesson.moduleTitle}
                                {lesson.completedAt ? ` · ${formatDate(lesson.completedAt)}` : ""}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
