"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Check, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/input";

/**
 * Componentes de renderização de questão usados pelo fluxo de provas.
 * Prefixo único "question-card" para não colidir com o design system compartilhado.
 */

export type ProvaQuestionType =
  | "MULTIPLA_ESCOLHA"
  | "VERDADEIRO_FALSO"
  | "TEXTO_LIVRE";

export type ProvaOption = {
  id: string;
  text: string;
  position: number;
};

export type ProvaQuestion = {
  id: string;
  type: ProvaQuestionType;
  prompt: string;
  points: number;
  position: number;
  options: ProvaOption[];
};

/** Mínimo de caracteres para uma resposta em texto livre ser considerada correta. */
export const MIN_FREE_TEXT_CHARS = 30;

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

const TYPE_LABEL: Record<ProvaQuestionType, string> = {
  MULTIPLA_ESCOLHA: "Escolha a alternativa correta",
  VERDADEIRO_FALSO: "Verdadeiro ou falso",
  TEXTO_LIVRE: "Resposta aberta",
};

/* ------------------------------------------------------------------ */
/* Opção clicável (cartão grande)                                     */
/* ------------------------------------------------------------------ */

function OptionCard({
  option,
  letter,
  disabled,
}: {
  option: ProvaOption;
  letter: string;
  disabled?: boolean;
}) {
  return (
    <RadioGroupPrimitive.Item
      value={option.id}
      disabled={disabled}
      asChild
    >
      <div
        className={cn(
          "group flex w-full cursor-pointer items-start gap-4 rounded-2xl border border-default bg-surface p-4 text-left",
          "transition-all duration-200 ease-[var(--ease-out-quint)]",
          "hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50/40 hover:shadow-soft",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]",
          "data-[state=checked]:border-brand-500 data-[state=checked]:bg-brand-50/70 data-[state=checked]:shadow-soft",
          "dark:hover:bg-brand-500/5 dark:data-[state=checked]:bg-brand-500/10",
          "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-default text-sm font-bold text-muted",
            "transition-colors duration-200",
            "group-data-[state=checked]:border-brand-500 group-data-[state=checked]:bg-brand-500 group-data-[state=checked]:text-white",
          )}
        >
          {letter}
        </span>
        <span className="min-w-0 flex-1 pt-1 text-[15px] font-medium leading-relaxed text-default">
          {option.text}
        </span>
        <RadioGroupPrimitive.Indicator className="mt-1 shrink-0">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
        </RadioGroupPrimitive.Indicator>
      </div>
    </RadioGroupPrimitive.Item>
  );
}

/* ------------------------------------------------------------------ */
/* Cartão principal da questão                                        */
/* ------------------------------------------------------------------ */

export function QuestionCard({
  question,
  index,
  total,
  selectedOptionId,
  textValue,
  onSelectOption,
  onTextChange,
  disabled,
  showTypeLabel = true,
}: {
  question: ProvaQuestion;
  index: number;
  total: number;
  selectedOptionId?: string | null;
  textValue?: string;
  onSelectOption: (questionId: string, optionId: string) => void;
  onTextChange: (questionId: string, value: string) => void;
  disabled?: boolean;
  showTypeLabel?: boolean;
}) {
  const isText = question.type === "TEXTO_LIVRE";
  const isTrueFalse = question.type === "VERDADEIRO_FALSO";

  const verdadeiro = question.options.find((o) =>
    /^(verdadeiro|true)\b/i.test(o.text.trim()),
  );
  const falso = question.options.find((o) =>
    /^(falso|false)\b/i.test(o.text.trim()),
  );

  const length = (textValue ?? "").trim().length;
  const enough = length >= MIN_FREE_TEXT_CHARS;

  return (
    <section
      aria-labelledby={`q-${question.id}-prompt`}
      className="animate-fade-in"
    >
      <header className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-sunken px-2.5 py-0.5 text-xs font-semibold tabular-nums text-muted">
            Questão {index + 1} de {total}
          </span>
          {showTypeLabel ? (
            <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-200">
              {TYPE_LABEL[question.type]}
            </span>
          ) : null}
          <span className="inline-flex items-center rounded-full border border-subtle px-2.5 py-0.5 text-xs font-semibold tabular-nums text-muted">
            {question.points} {question.points === 1 ? "ponto" : "pontos"}
          </span>
        </div>

        <h2
          id={`q-${question.id}-prompt`}
          data-question-heading=""
          tabIndex={-1}
          className="text-xl font-semibold leading-relaxed tracking-tight text-default outline-none sm:text-2xl"
        >
          {question.prompt}
        </h2>
      </header>

      {isText ? (
        <div className="space-y-3">
          <label
            htmlFor={`q-${question.id}-textarea`}
            className="sr-only"
          >
            Sua resposta
          </label>
          <Textarea
            id={`q-${question.id}-textarea`}
            value={textValue ?? ""}
            disabled={disabled}
            maxLength={10_000}
            onChange={(e) => onTextChange(question.id, e.target.value)}
            placeholder="Escreva sua resposta em inglês…"
            className="min-h-[180px] text-base leading-relaxed"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">
              Mínimo de {MIN_FREE_TEXT_CHARS} caracteres para ser considerado
              correto.
            </p>
            <p
              className={cn(
                "text-xs font-semibold tabular-nums",
                enough ? "text-brand-600 dark:text-brand-300" : "text-subtle",
              )}
            >
              {length} / {MIN_FREE_TEXT_CHARS} caracteres
            </p>
          </div>
        </div>
      ) : (
        <RadioGroupPrimitive.Root
          value={selectedOptionId ?? ""}
          onValueChange={(value) => onSelectOption(question.id, value)}
          disabled={disabled}
          aria-label={TYPE_LABEL[question.type]}
          className="space-y-3"
        >
          {isTrueFalse && verdadeiro && falso ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <TrueFalseButton
                option={verdadeiro}
                label="Verdadeiro"
                tone="true"
                disabled={disabled}
              />
              <TrueFalseButton
                option={falso}
                label="Falso"
                tone="false"
                disabled={disabled}
              />
            </div>
          ) : (
            <div className="space-y-3">
              {question.options.map((option, i) => (
                <OptionCard
                  key={option.id}
                  option={option}
                  letter={LETTERS[i] ?? String(i + 1)}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </RadioGroupPrimitive.Root>
      )}

      {question.options.length === 0 && !isText ? (
        <p className="rounded-xl border border-dashed border-default bg-sunken p-4 text-sm text-muted">
          Esta questão não possui alternativas cadastradas.
        </p>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Botão grande Verdadeiro / Falso                                     */
/* ------------------------------------------------------------------ */

function TrueFalseButton({
  option,
  label,
  tone,
  disabled,
}: {
  option: ProvaOption;
  label: string;
  tone: "true" | "false";
  disabled?: boolean;
}) {
  return (
    <RadioGroupPrimitive.Item
      value={option.id}
      disabled={disabled}
      asChild
    >
      <div
        className={cn(
          "group flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-default bg-surface px-5 py-8",
          "transition-all duration-200 ease-[var(--ease-out-quint)]",
          "hover:-translate-y-0.5 hover:shadow-lifted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]",
          "data-[state=checked]:border-brand-500 data-[state=checked]:bg-brand-50/70",
          "dark:data-[state=checked]:bg-brand-500/10",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        {tone === "true" ? (
          <CheckCircle2 className="h-6 w-6 text-brand-500 transition-colors group-data-[state=checked]:text-brand-600" />
        ) : (
          <XCircle className="h-6 w-6 text-subtle transition-colors group-data-[state=checked]:text-brand-600" />
        )}
        <span className="text-lg font-bold text-default">{label}</span>
      </div>
    </RadioGroupPrimitive.Item>
  );
}
