/**
 * Funções puras de estatística usadas pelas páginas do aluno.
 * Ficam fora de `src/lib` (compartilhado com outros agentes) para evitar
 * conflitos de edição.
 */

export interface LessonProgressRow {
  watchedPercent: number;
  completed: boolean;
  completedAt: Date | null;
  lastViewedAt: Date;
  lesson: {
    id: string;
    title: string;
    durationSec: number;
    module: { course: { id: string; title: string } };
  };
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = segunda
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function weekKey(date: Date): string {
  const d = startOfWeek(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const WEEK_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/** Rótulo curto da semana (ex.: "12/05"). */
export function weekLabel(date: Date): string {
  const d = startOfWeek(date);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

/** Semana corrente como rótulo relativo ("Esta semana", "3 semanas atrás"). */
export function relativeWeekLabel(date: Date, now = new Date()): string {
  const diffWeeks = Math.round(
    (startOfWeek(now).getTime() - startOfWeek(date).getTime()) / (7 * 24 * 3600 * 1000),
  );
  if (diffWeeks <= 0) return "Esta semana";
  if (diffWeeks === 1) return "Semana passada";
  return `${diffWeeks} semanas atrás`;
}

/**
 * Sequência (streak) de semanas consecutivas com atividade.
 * Uma semana conta como ativa se houve qualquer aula assistida nela.
 */
export function computeStreak(dates: Date[], now = new Date()): number {
  if (dates.length === 0) return 0;
  const weeks = new Set(dates.map((d) => weekKey(d)));
  const current = startOfWeek(now);

  // Se a semana atual ainda não teve atividade, conta a partir da anterior.
  let cursor = weeks.has(weekKey(current)) ? current : new Date(current.getTime() - 7 * 86400000);
  let streak = 0;
  while (weeks.has(weekKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 7 * 86400000);
  }
  return streak;
}

/** Total de semanas distintas com atividade. */
export function countActiveWeeks(dates: Date[]): number {
  return new Set(dates.map((d) => weekKey(d))).size;
}

/** Minutos efetivamente assistidos (percentual assistido × duração). */
export function watchedMinutes(progress: LessonProgressRow): number {
  const seconds = (progress.lesson.durationSec * progress.watchedPercent) / 100;
  return Math.round(seconds / 60);
}

/** Minutos de estudo agrupados por semana (últimas N semanas, ordem cronológica). */
export function weeklyMinutes(
  progress: LessonProgressRow[],
  weeks = 8,
  now = new Date(),
): { label: string; minutos: number; aulas: number }[] {
  const buckets = new Map<string, { minutos: number; aulas: number; at: Date }>();
  const current = startOfWeek(now);

  for (let i = weeks - 1; i >= 0; i--) {
    const at = new Date(current.getTime() - i * 7 * 86400000);
    buckets.set(weekKey(at), { minutos: 0, aulas: 0, at });
  }

  for (const row of progress) {
    const key = weekKey(row.lastViewedAt);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.minutos += watchedMinutes(row);
    if (row.completed) bucket.aulas += 1;
  }

  return Array.from(buckets.values()).map((b) => ({
    label: weekLabel(b.at),
    minutos: b.minutos,
    aulas: b.aulas,
  }));
}

/** Minutos de estudo agrupados por curso (decrescente). */
export function minutesByCourse(
  progress: LessonProgressRow[],
): { label: string; minutos: number }[] {
  const map = new Map<string, number>();
  for (const row of progress) {
    const course = row.lesson.module.course;
    map.set(course.title, (map.get(course.title) ?? 0) + watchedMinutes(row));
  }
  return Array.from(map.entries())
    .map(([label, minutos]) => ({ label, minutos }))
    .sort((a, b) => b.minutos - a.minutos);
}

/** Rótulo curto do mês. */
export function monthLabel(date: Date): string {
  return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
    .replace(" de ", "/")
    .replace(".", "");
}

/** Aggregation helper: soma. */
export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

export function greetingFor(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export const WEEKDAY_LABELS = WEEK_LABELS;
