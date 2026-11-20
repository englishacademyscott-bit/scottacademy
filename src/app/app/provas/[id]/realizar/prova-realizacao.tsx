"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Grid3x3,
  Loader2,
  LogOut,
  Send,
  Timer,
  TriangleAlert,
} from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  QuestionCard,
  type ProvaQuestion,
} from "@/components/ui/question-card";
import { cn } from "@/lib/utils";
import { submitAttempt } from "../../actions";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* Cronômetro                                                          */
/* ------------------------------------------------------------------ */

function TimerBadge({
  remaining,
  totalSeconds,
}: {
  remaining: number;
  totalSeconds: number;
}) {
  const ratio = totalSeconds > 0 ? remaining / totalSeconds : 0;
  const tone =
    ratio <= 0.1 ? "danger" : ratio <= 0.25 ? "warn" : "normal";

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-2xl border px-3.5 py-2 transition-colors duration-300",
        tone === "danger" &&
          "border-cherry-500/50 bg-cherry-500/10 text-cherry-600 dark:text-cherry-400 animate-pulse",
        tone === "warn" &&
          "border-sun-500/50 bg-sun-500/10 text-sun-600 dark:text-sun-400",
        tone === "normal" && "border-subtle bg-surface text-default",
      )}
    >
      {tone === "danger" ? (
        <TriangleAlert className="h-5 w-5" />
      ) : (
        <Timer className="h-5 w-5 text-muted" />
      )}
      <div className="leading-tight">
        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
          Tempo restante
        </p>
        <p
          className="font-mono text-xl font-bold tabular-nums"
          role="timer"
          aria-live="off"
        >
          {formatClock(remaining)}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mapa de questões                                                    */
/* ------------------------------------------------------------------ */

function MapaQuestoes({
  questions,
  current,
  answeredIds,
  onJump,
}: {
  questions: ProvaQuestion[];
  current: number;
  answeredIds: Set<string>;
  onJump: (index: number) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {questions.map((question, index) => {
        const answered = answeredIds.has(question.id);
        const isCurrent = index === current;
        return (
          <button
            key={question.id}
            type="button"
            onClick={() => onJump(index)}
            aria-label={`Questão ${index + 1}${answered ? ", respondida" : ", não respondida"}`}
            aria-current={isCurrent ? "true" : undefined}
            className={cn(
              "relative flex h-11 w-11 items-center justify-center rounded-xl border text-sm font-semibold tabular-nums transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]",
              answered
                ? "border-brand-300 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-200 dark:hover:bg-brand-500/25"
                : "border-default bg-surface text-muted hover:border-brand-300 hover:text-default",
              isCurrent && "ring-2 ring-brand-500 ring-offset-2 ring-offset-[var(--bg-canvas)]",
            )}
          >
            {index + 1}
            {answered ? (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-white"
              >
                <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function Legenda() {
  return (
    <ul className="space-y-1.5 text-xs text-muted">
      <li className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-md border border-brand-300 bg-brand-50 text-[10px] font-bold text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-200">
          1
        </span>
        Respondida
      </li>
      <li className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-md border border-default bg-surface text-[10px] font-bold text-muted">
          2
        </span>
        Não respondida
      </li>
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Tela de realização                                                  */
/* ------------------------------------------------------------------ */

export function ProvaRealizacao({
  examId,
  title,
  timeLimitMin,
  passingPercent,
  startedAt,
  initialRemaining,
  questions,
}: {
  examId: string;
  title: string;
  timeLimitMin: number;
  passingPercent: number;
  startedAt: string;
  initialRemaining: number;
  questions: ProvaQuestion[];
}) {
  const router = useRouter();

  const totalSeconds = timeLimitMin * 60;
  const deadline = React.useMemo(
    () => new Date(startedAt).getTime() + totalSeconds * 1000,
    [startedAt, totalSeconds],
  );

  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [textAnswers, setTextAnswers] = React.useState<Record<string, string>>(
    {},
  );
  const [current, setCurrent] = React.useState(0);
  const [remaining, setRemaining] = React.useState(initialRemaining);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [mapOpen, setMapOpen] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState("");
  const storageKey = React.useMemo(
    () => `sea:prova:${examId}:${startedAt}`,
    [examId, startedAt],
  );

  const submittingRef = React.useRef(false);
  const submittedRef = React.useRef(false);
  const submitRef = React.useRef<() => void>(() => undefined);
  const announcedRef = React.useRef<number[]>([]);
  const restoredRef = React.useRef(false);

  const question = questions[current];
  const total = questions.length;

  const isAnswered = React.useCallback(
    (q: ProvaQuestion) =>
      q.type === "TEXTO_LIVRE"
        ? (textAnswers[q.id] ?? "").trim().length > 0
        : Boolean(answers[q.id]),
    [answers, textAnswers],
  );

  const answeredIds = React.useMemo(
    () =>
      new Set(questions.filter((q) => isAnswered(q)).map((q) => q.id)),
    [questions, isAnswered],
  );
  const respondidas = answeredIds.size;
  const naoRespondidas = questions.filter((q) => !answeredIds.has(q.id));

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          answers?: Record<string, string>;
          textAnswers?: Record<string, string>;
          current?: number;
        };
        if (parsed.answers) setAnswers(parsed.answers);
        if (parsed.textAnswers) setTextAnswers(parsed.textAnswers);
        if (typeof parsed.current === "number") {
          setCurrent(Math.max(0, Math.min(parsed.current, questions.length - 1)));
        }
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      restoredRef.current = true;
    }
  }, [questions.length, storageKey]);

  React.useEffect(() => {
    if (!restoredRef.current || submitted) return;
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ answers, textAnswers, current }),
    );
  }, [answers, current, storageKey, submitted, textAnswers]);

  /* ---------------------------- envio ---------------------------- */

  const handleSubmit = React.useCallback(async () => {
    if (submittingRef.current || submittedRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    const payload = questions.map((q) =>
      q.type === "TEXTO_LIVRE"
        ? { questionId: q.id, textAnswer: textAnswers[q.id] ?? "" }
        : { questionId: q.id, optionId: answers[q.id] ?? null },
    );

    try {
      const res = await submitAttempt(examId, payload);
      if (!res.ok) {
        toast.error("Não foi possível enviar a prova", {
          description: res.error,
        });
        submittingRef.current = false;
        setSubmitting(false);
        return;
      }
      submittedRef.current = true;
      setSubmitted(true);
      window.localStorage.removeItem(storageKey);
      const hasOpenAnswers = questions.some((q) => q.type === "TEXTO_LIVRE");
      toast.success("Prova enviada!", {
        description: hasOpenAnswers
          ? `Resultado provisório: ${res.score}%. As respostas abertas aguardam correção.`
          : `Sua nota foi ${res.score}% — ${res.passed ? "aprovado" : "reprovado"}.`,
      });
      router.push(`/app/provas/resultado/${res.attemptId}`);
    } catch {
      toast.error("Falha de conexão", {
        description: "Não foi possível enviar agora. Tente novamente.",
      });
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [answers, textAnswers, examId, questions, router, storageKey]);

  React.useEffect(() => {
    submitRef.current = () => {
      void handleSubmit();
    };
  }, [handleSubmit]);

  /* --------------------------- cronômetro ------------------------ */

  React.useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        toast.warning("Tempo esgotado", {
          description: "Enviando suas respostas automaticamente.",
        });
        submitRef.current();
      }
    };
    const id = window.setInterval(tick, 1000);
    tick();
    return () => window.clearInterval(id);
  }, [deadline]);

  /* ------------------- avisos acessíveis do timer ----------------- */

  React.useEffect(() => {
    const ratio = totalSeconds > 0 ? remaining / totalSeconds : 0;
    for (const mark of [50, 25, 10, 5]) {
      if (ratio <= mark && !announcedRef.current.includes(mark)) {
        announcedRef.current.push(mark);
        setAnnouncement(
          `Atenção: ${formatClock(remaining)} restantes.`,
        );
      }
    }
  }, [remaining, totalSeconds]);

  /* ------------------- proteção contra saída acidental -------------- */

  React.useEffect(() => {
    if (submitted || respondidas === 0) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [submitted, respondidas]);

  /* ------------------------- navegação ---------------------------- */

  const goTo = React.useCallback((index: number) => {
    setCurrent(index);
    setMapOpen(false);
    // Move o foco para o enunciado da nova questão.
    window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(
        "[data-question-heading]",
      );
      target?.focus();
    });
  }, []);

  function handleNext() {
    if (current < total - 1) {
      if (!isAnswered(question)) {
        toast.warning("Questão não respondida", {
          description:
            "Você pode avançar em branco, mas esta questão valerá 0 pontos.",
        });
      }
      goTo(current + 1);
      return;
    }
    setConfirmOpen(true);
  }

  function handleSelectOption(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  function handleTextChange(questionId: string, value: string) {
    setTextAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  if (!question) {
    return (
      <div className="rounded-xl border border-dashed border-default bg-surface p-10 text-center">
        <p className="text-sm text-muted">
          Esta prova ainda não tem questões cadastradas.
        </p>
      </div>
    );
  }

  const progresso = total > 0 ? Math.round((respondidas / total) * 100) : 0;

  return (
    <div className="pb-32">
      {/* ---------------------- barra fixa do topo ---------------------- */}
      <div className="sticky top-16 z-20 -mx-4 border-b border-subtle bg-canvas px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold text-default">
                {title}
              </p>
              <Badge variant="outline" className="shrink-0">
                Nota de corte {passingPercent}%
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="shrink-0 text-xs font-semibold tabular-nums text-muted">
                Questão {current + 1} de {total}
              </span>
              <Progress
                value={progresso}
                size="sm"
                className="flex-1"
                aria-label={`${respondidas} de ${total} questões respondidas`}
              />
              <span className="shrink-0 text-xs font-semibold tabular-nums text-muted">
                {respondidas}/{total}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <TimerBadge remaining={remaining} totalSeconds={totalSeconds} />
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMapOpen(true)}
              aria-label="Abrir mapa de questões"
            >
              <Grid3x3 className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </div>

      {/* -------------------------- conteúdo --------------------------- */}
      <div className="mx-auto mt-8 grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          <div className="rounded-xl border border-subtle bg-surface p-6 shadow-soft sm:p-10">
            <QuestionCard
              question={question}
              index={current}
              total={total}
              selectedOptionId={answers[question.id] ?? null}
              textValue={textAnswers[question.id] ?? ""}
              onSelectOption={handleSelectOption}
              onTextChange={handleTextChange}
              disabled={submitting || submitted}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => goTo(current - 1)}
              disabled={current === 0 || submitting}
            >
              <ChevronLeft className="h-5 w-5" />
              Anterior
            </Button>

            <div className="order-3 flex w-full items-center justify-center gap-2 sm:order-none sm:w-auto">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setConfirmOpen(true)}
                disabled={submitting}
              >
                <ClipboardCheck className="h-5 w-5" />
                Revisar e enviar
              </Button>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleNext}
              disabled={submitting}
            >
              {current === total - 1 ? "Revisar e enviar" : "Próxima"}
              {current === total - 1 ? (
                <Send className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* ------------------------- mapa lateral ------------------------ */}
        <aside className="hidden lg:block">
          <div className="sticky top-36 space-y-5 rounded-xl border border-subtle bg-surface p-5 shadow-soft">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-default">
                Mapa de questões
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Clique no número para pular entre as questões.
              </p>
            </div>

            <MapaQuestoes
              questions={questions}
              current={current}
              answeredIds={answeredIds}
              onJump={goTo}
            />

            <Legenda />

            <div className="border-t border-subtle pt-4">
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => setConfirmOpen(true)}
                disabled={submitting}
              >
                <ClipboardCheck className="h-4 w-4" />
                Revisar e enviar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full"
                onClick={() => router.push("/app/provas")}
                disabled={submitting}
              >
                <LogOut className="h-4 w-4" />
                Sair da prova
              </Button>
              <p className="mt-3 text-[11px] leading-relaxed text-subtle">
                As respostas só são gravadas ao enviar a prova.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* ------------------------- barra inferior ----------------------- */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-subtle bg-canvas px-4 py-3 sm:px-6 lg:left-[264px] lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/app/provas")}
            disabled={submitting}
          >
            <ArrowLeft className="h-4 w-4" />
            Sair
          </Button>

          <p className="hidden text-xs text-muted sm:block">
            {respondidas} de {total} respondidas
          </p>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Revisar e enviar
          </Button>
        </div>
      </div>

      {/* --------------------- diálogo do mapa (mobile) ----------------- */}
      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mapa de questões</DialogTitle>
            <DialogDescription>
              Toque no número para ir à questão. Você pode responder em qualquer
              ordem.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6">
            <MapaQuestoes
              questions={questions}
              current={current}
              answeredIds={answeredIds}
              onJump={goTo}
            />
            <div className="mt-4">
              <Legenda />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setMapOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------------- diálogo de revisão ---------------------- */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revisar e enviar</DialogTitle>
            <DialogDescription>
              Confira sua prova antes de enviar. Depois do envio não é possível
              alterar as respostas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-subtle bg-sunken px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
                  Respondidas
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-default">
                  {respondidas}
                  <span className="text-base font-semibold text-muted">
                    /{total}
                  </span>
                </p>
              </div>
              <div className="rounded-xl border border-subtle bg-sunken px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
                  Em branco
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-default">
                  {naoRespondidas.length}
                </p>
              </div>
            </div>

            {naoRespondidas.length > 0 ? (
              <div className="rounded-xl border border-sun-500/30 bg-sun-500/10 p-4">
                <p className="flex gap-2.5 text-sm leading-relaxed text-default">
                  <Clock className="h-4 w-4 shrink-0 text-sun-500" />
                  <span>
                    As questões{" "}
                    <strong>
                      {naoRespondidas
                        .map((q) => questions.indexOf(q) + 1)
                        .join(", ")}
                    </strong>{" "}
                    ficarão sem resposta e valerá 0 pontos.
                  </span>
                </p>
              </div>
            ) : (
              <p className="flex gap-2.5 text-sm leading-relaxed text-default">
                <Check className="h-4 w-4 shrink-0 text-brand-500" />
                Todas as questões foram respondidas. Bom trabalho!
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
            >
              Continuar revisando
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setConfirmOpen(false);
                void handleSubmit();
              }}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitting ? "Enviando…" : "Enviar prova"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
