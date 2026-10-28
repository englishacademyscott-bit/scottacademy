"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
  VideoOff,
} from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn, formatDuration } from "@/lib/utils";
import { setLessonCompleted } from "@/app/app/aulas/actions";

export interface LessonPlayerProps {
  lessonId: string;
  title: string;
  embedSrc: string | null;
  providerLabel: string;
  durationSec: number;
  initiallyCompleted: boolean;
  initialPercent: number;
  prevLessonId: string | null;
  nextLessonId: string | null;
  prevLabel: string | null;
  nextLabel: string | null;
}

export function LessonPlayer({
  lessonId,
  title,
  embedSrc,
  providerLabel,
  durationSec,
  initiallyCompleted,
  initialPercent,
  prevLessonId,
  nextLessonId,
  prevLabel,
  nextLabel,
}: LessonPlayerProps) {
  const router = useRouter();
  const [completed, setCompleted] = React.useState(initiallyCompleted);
  const [percent, setPercent] = React.useState(initialPercent);
  const [pending, startTransition] = React.useTransition();

  const toggle = () => {
    const next = !completed;
    setCompleted(next);
    if (next) setPercent(100);
    startTransition(async () => {
      const result = await setLessonCompleted(lessonId, next, percent);
      if (!result.ok) {
        setCompleted(!next);
        setPercent(initialPercent);
        toast.error("Não foi possível atualizar o progresso");
        return;
      }
      toast.success(next ? "Aula concluída!" : "Aula desmarcada", {
        description: next
          ? "Seu progresso no curso foi recalculado."
          : "Você pode continuar assistindo quando quiser.",
      });
      router.refresh();
    });
  };

  return (
    <>
      {/* Player */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-subtle bg-ink-950 shadow-lifted">
        {embedSrc ? (
          <iframe
            src={embedSrc}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="h-full w-full"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-brand p-8 text-center">
            <div className="absolute inset-0 bg-dots opacity-30" aria-hidden />
            <VideoOff className="relative h-10 w-10 text-white/80" />
            <p className="relative max-w-md text-sm text-white/90">
              Esta aula ainda não tem vídeo publicado. Explore o material de apoio abaixo
              enquanto isso.
            </p>
          </div>
        )}
      </div>

      {/* Barra inferior sticky */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-4 border-t border-subtle bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2",
                completed
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-default text-subtle",
              )}
              aria-hidden
            >
              {completed ? <CheckCircle2 className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-default">
                  {completed ? "Aula concluída" : "Marque como concluída ao terminar"}
                </span>
                <span className="shrink-0 tabular-nums text-muted">{percent}%</span>
              </div>
              <Progress
                value={percent}
                size="sm"
                className="mt-1.5"
                aria-label="Progresso da aula"
              />
              <p className="mt-1 text-[11px] text-subtle">
                Duração: {formatDuration(durationSec)} · {providerLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {prevLessonId ? (
              <Button asChild variant="secondary" size="sm" className="flex-1 sm:flex-none">
                <Link href={`/app/aulas/${prevLessonId}`} aria-label={`Aula anterior: ${prevLabel}`}>
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </Link>
              </Button>
            ) : (
              <Button variant="secondary" size="sm" disabled className="flex-1 sm:flex-none">
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Anterior</span>
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              variant={completed ? "secondary" : "primary"}
              onClick={toggle}
              disabled={pending}
              className="flex-1 sm:flex-none"
              aria-pressed={completed}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {completed ? "Concluída" : "Marcar concluída"}
            </Button>

            {nextLessonId ? (
              <Button asChild variant="secondary" size="sm" className="flex-1 sm:flex-none">
                <Link href={`/app/aulas/${nextLessonId}`} aria-label={`Próxima aula: ${nextLabel}`}>
                  <span className="hidden sm:inline">Próxima</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button variant="secondary" size="sm" disabled className="flex-1 sm:flex-none">
                <span className="hidden sm:inline">Próxima</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
