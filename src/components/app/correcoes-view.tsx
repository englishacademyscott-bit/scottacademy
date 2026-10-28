"use client";

import * as React from "react";
import {
  CheckCircle2,
  CircleX,
  Clock,
  MessageSquareQuote,
  Save,
  Sparkles,
  User,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { formatDateTime } from "@/lib/utils";
import { gradeAnswer } from "@/app/app/correcoes/actions";

export interface TentativaRow {
  id: string;
  examId: string;
  examTitle: string;
  courseId: string | null;
  courseTitle: string;
  teacher: { name: string; avatarUrl: string | null };
  passingPercent: number;
  submittedAt: string | null;
  score: number | null;
  passed: boolean | null;
  status: "PENDENTE" | "REVISADA";
  student: { id: string; name: string; email: string; avatarUrl: string | null };
  answers: {
    id: string;
    prompt: string;
    questionType: "MULTIPLA_ESCOLHA" | "VERDADEIRO_FALSO" | "TEXTO_LIVRE";
    points: number;
    position: number;
    textAnswer: string | null;
    optionText: string | null;
    isCorrect: boolean;
    pointsAwarded: number;
    feedback: string | null;
    feedbackAt: string | null;
  }[];
}

type Draft = { isCorrect: boolean; points: number; feedback: string };

export function CorrecoesView({ rows }: { rows: TentativaRow[] }) {
  const [drafts, setDrafts] = React.useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = React.useState<string | null>(null);

  const draftFor = (answer: TentativaRow["answers"][number]): Draft =>
    drafts[answer.id] ?? {
      isCorrect: answer.isCorrect,
      points: answer.pointsAwarded,
      feedback: answer.feedback ?? "",
    };

  const setDraft = (id: string, patch: Partial<Draft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { isCorrect: false, points: 0, feedback: "" }), ...patch } }));
  };

  const handleGrade = async (answer: TentativaRow["answers"][number]) => {
    const draft = draftFor(answer);
    setSavingId(answer.id);
    const result = await gradeAnswer({
      answerId: answer.id,
      isCorrect: draft.isCorrect,
      pointsAwarded: draft.points,
      feedback: draft.feedback,
    });
    setSavingId(null);
    if (result.ok) {
      toast.success(result.message ?? "Correção registrada.");
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[answer.id];
        return next;
      });
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <Card key={row.id} className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-subtle p-4">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={row.student.name} src={row.student.avatarUrl} size="md" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-default">{row.student.name}</p>
                <p className="truncate text-xs text-muted">
                  {row.examTitle} · {row.courseTitle}
                </p>
                {row.submittedAt ? (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-subtle">
                    <Clock className="h-3.5 w-3.5" /> Enviado em {formatDateTime(row.submittedAt)}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {row.score == null ? (
                <Badge variant="outline">Sem nota</Badge>
              ) : (
                <Badge variant={row.score >= row.passingPercent ? "success" : "danger"}>
                  {row.score}% · corte em {row.passingPercent}%
                </Badge>
              )}
              {row.status === "PENDENTE" ? (
                <Badge variant="warning">Pendente de revisão</Badge>
              ) : (
                <Badge variant="success">Revisada</Badge>
              )}
            </div>
          </div>

          <CardContent className="space-y-4 p-4">
            {row.answers.map((answer) => {
              const isEssay = answer.questionType === "TEXTO_LIVRE";
              const draft = draftFor(answer);
              const dirty =
                drafts[answer.id] &&
                (drafts[answer.id].isCorrect !== answer.isCorrect ||
                  drafts[answer.id].points !== answer.pointsAwarded ||
                  drafts[answer.id].feedback !== (answer.feedback ?? ""));

              return (
                <div
                  key={answer.id}
                  className="rounded-lg border border-subtle p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-default">{answer.prompt}</p>
                    <span className="shrink-0 text-xs text-subtle">{answer.points} pts</span>
                  </div>

                  {isEssay ? (
                    <div className="mt-3 rounded-lg border-l-2 border-brand-400 bg-sunken p-3">
                      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-subtle">
                        <MessageSquareQuote className="h-3.5 w-3.5" /> Resposta do aluno
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-default">
                        {answer.textAnswer?.trim() || <span className="italic text-subtle">Sem resposta.</span>}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted">
                      Resposta: {answer.optionText ?? <span className="italic text-subtle">não respondida</span>}
                    </p>
                  )}

                  {!isEssay ? (
                    <div className="mt-3 flex items-center gap-2">
                      {answer.isCorrect ? (
                        <Badge variant="success">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Correta
                        </Badge>
                      ) : (
                        <Badge variant="danger">
                          <CircleX className="h-3.5 w-3.5" /> Incorreta
                        </Badge>
                      )}
                      <span className="text-xs text-subtle">
                        {answer.pointsAwarded}/{answer.points} pts atribuídos
                      </span>
                    </div>
                  ) : null}

                  {isEssay ? (
                    <div className="mt-4 space-y-3 rounded-lg border border-subtle bg-sunken p-3">
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="space-y-1.5">
                          <Label>Avaliação</Label>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={draft.isCorrect ? "success" : "secondary"}
                              aria-pressed={draft.isCorrect}
                              onClick={() => setDraft(answer.id, { isCorrect: true })}
                            >
                              <CheckCircle2 className="h-4 w-4" /> Acertou
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={!draft.isCorrect ? "destructive" : "secondary"}
                              aria-pressed={!draft.isCorrect}
                              onClick={() => setDraft(answer.id, { isCorrect: false })}
                            >
                              <CircleX className="h-4 w-4" /> Não acertou
                            </Button>
                          </div>
                        </div>

                        <div className="w-32 space-y-1.5">
                          <Label htmlFor={`pontos-${answer.id}`}>Pontos</Label>
                          <Input
                            id={`pontos-${answer.id}`}
                            type="number"
                            min={0}
                            max={answer.points}
                            value={draft.points}
                            onChange={(e) =>
                              setDraft(answer.id, { points: Math.max(0, Math.min(answer.points, Number(e.target.value))) })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor={`feedback-${answer.id}`}>Feedback do professor</Label>
                        <Textarea
                          id={`feedback-${answer.id}`}
                          rows={3}
                          maxLength={2000}
                          value={draft.feedback}
                          onChange={(e) => setDraft(answer.id, { feedback: e.target.value })}
                          placeholder="O que foi bem feito? O que melhorar na próxima redação?"
                        />
                        <p className="text-xs text-subtle">
                          O feedback é enviado ao aluno como notificação após a correção.
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleGrade(answer)}
                          disabled={savingId === answer.id}
                        >
                          <Save className="h-4 w-4" />
                          {savingId === answer.id ? "Salvando…" : dirty ? "Salvar correção" : "Salvar"}
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {answer.feedback ? (
                    <div className="mt-3 flex gap-3 rounded-lg border border-subtle p-3">
                      <Avatar name={row.teacher.name} src={row.teacher.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-x-2 text-xs font-semibold text-default">
                          {row.teacher.name}
                          <span className="inline-flex items-center gap-1 font-normal text-subtle">
                            <Sparkles className="h-3 w-3" />
                            {answer.feedbackAt ? formatDateTime(answer.feedbackAt) : "feedback"}
                          </span>
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{answer.feedback}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {row.answers.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted">
                <User className="h-4 w-4" /> Esta tentativa não possui respostas registradas.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
