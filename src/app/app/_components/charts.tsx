"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, TrendingUp } from "lucide-react";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Paleta — lê os tokens --chart-N do design system em runtime              */
/* -------------------------------------------------------------------------- */

const FALLBACK_PALETTE = [
  "#6366f1",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];

interface ChartTheme {
  series: string[];
  muted: string;
  subtle: string;
  grid: string;
  surface: string;
  border: string;
}

const DEFAULT_THEME: ChartTheme = {
  series: FALLBACK_PALETTE,
  muted: "#64748b",
  subtle: "#94a3b8",
  grid: "rgba(148,163,184,0.16)",
  surface: "#ffffff",
  border: "rgba(148,163,184,0.22)",
};

/**
 * Resolve as variáveis CSS do design system para valores concretos.
 * `var(--chart-1)` não funciona de forma confiável como atributo SVG em
 * todos os navegadores, por isso resolvemos em runtime — o que ainda respeita
 * dark mode (os tokens mudam com o tema).
 */
function useChartTheme(): { theme: ChartTheme; ready: boolean } {
  const [theme, setTheme] = React.useState<ChartTheme>(DEFAULT_THEME);

  React.useEffect(() => {
    const read = () => {
      const styles = getComputedStyle(document.documentElement);
      const pick = (name: string, fallback: string) =>
        styles.getPropertyValue(name).trim() || fallback;
      setTheme({
        series: FALLBACK_PALETTE.map((fallback, i) =>
          pick(`--chart-${i + 1}`, fallback),
        ),
        muted: pick("--fg-muted", DEFAULT_THEME.muted),
        subtle: pick("--fg-subtle", DEFAULT_THEME.subtle),
        grid: pick("--border-subtle", DEFAULT_THEME.grid),
        surface: pick("--bg-surface", DEFAULT_THEME.surface),
        border: pick("--border-default", DEFAULT_THEME.border),
      });
    };
    read();

    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class", "style"],
    });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", read);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", read);
    };
  }, []);

  return { theme, ready: true };
}

/* -------------------------------------------------------------------------- */
/*  Tooltip customizado                                                       */
/* -------------------------------------------------------------------------- */

interface TooltipEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

export function ChartTooltip({
  active,
  payload,
  label,
  unit,
  valueFormatter,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  unit?: string;
  valueFormatter?: (value: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="min-w-[9rem] rounded-xl border border-subtle bg-surface px-3 py-2.5 shadow-lifted">
      {label !== undefined && label !== null ? (
        <p className="mb-1.5 text-xs font-semibold text-default">{label}</p>
      ) : null}
      <div className="space-y-1">
        {payload.map((entry, index) => {
          const numeric =
            typeof entry.value === "number" ? entry.value : Number(entry.value ?? 0);
          const formatted = valueFormatter
            ? valueFormatter(numeric)
            : `${numeric.toLocaleString("pt-BR")}${unit ? ` ${unit}` : ""}`;
          return (
            <div key={`${entry.dataKey ?? index}`} className="flex items-center gap-2 text-xs">
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted">{entry.name}</span>
              <span className="ml-auto font-semibold tabular-nums text-default">
                {formatted}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shell compartilhado                                                       */
/* -------------------------------------------------------------------------- */

export function ChartFrame({
  title,
  description,
  action,
  isEmpty,
  emptyTitle,
  emptyDescription,
  className,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-subtle bg-surface p-5 shadow-soft sm:p-6",
        className,
      )}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold tracking-tight text-default">
            {title}
          </h3>
          {description ? (
            <p className="text-sm text-muted">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {isEmpty ? (
        <EmptyState
          icon={BarChart3}
          title={emptyTitle ?? "Nada para exibir ainda"}
          description={emptyDescription}
          className="border-0 bg-transparent py-10"
        />
      ) : (
        children
      )}
    </section>
  );
}

function ChartSkeleton({ height = 260 }: { height?: number }) {
  return <Skeleton className="w-full" style={{ height }} />;
}

/* -------------------------------------------------------------------------- */
/*  Gráficos                                                                   */
/* -------------------------------------------------------------------------- */

export interface WeeklyStudyPoint {
  label: string;
  minutos: number;
  aulas: number;
}

export function WeeklyStudyChart({
  data,
  height = 280,
}: {
  data: WeeklyStudyPoint[];
  height?: number;
}) {
  const { theme } = useChartTheme();
  const isEmpty = data.length === 0 || data.every((d) => d.minutos === 0 && d.aulas === 0);

  if (isEmpty) {
    return (
      <ChartFrame
        title="Progresso semanal"
        description="Minutos de estudo e aulas concluídas por semana"
        isEmpty
        emptyTitle="Sem atividade registrada"
        emptyDescription="Assista a uma aula para começar a construir seu histórico."
      >
        <span />
      </ChartFrame>
    );
  }

  return (
    <ChartFrame
      title="Progresso semanal"
      description="Minutos de estudo e aulas concluídas por semana"
    >
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke={theme.grid} strokeDasharray="0" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: theme.subtle, fontSize: 12 }}
              dy={6}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: theme.subtle, fontSize: 12 }}
              width={48}
            />
            <Tooltip
              cursor={{ fill: theme.grid, opacity: 0.4 }}
              content={
                <ChartTooltip
                  valueFormatter={(v) =>
                    v >= 60 ? `${Math.floor(v / 60)}h ${v % 60}min` : `${v}min`
                  }
                />
              }
            />
            <Legend
              verticalAlign="top"
              height={32}
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => (
                <span style={{ color: theme.muted, fontSize: 12 }}>{value}</span>
              )}
            />
            <Bar
              dataKey="minutos"
              name="Minutos"
              fill={theme.series[0]}
              radius={[6, 6, 0, 0]}
              maxBarSize={38}
            />
            <Bar
              dataKey="aulas"
              name="Aulas concluídas"
              fill={theme.series[1]}
              radius={[6, 6, 0, 0]}
              maxBarSize={38}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export interface CourseTimePoint {
  label: string;
  minutos: number;
}

export function CourseTimeChart({
  data,
  height = 280,
}: {
  data: CourseTimePoint[];
  height?: number;
}) {
  const { theme } = useChartTheme();
  const isEmpty = data.length === 0 || data.every((d) => d.minutos === 0);

  if (isEmpty) {
    return (
      <ChartFrame
        title="Distribuição de tempo por curso"
        description="Onde seu tempo de estudo está indo"
        isEmpty
        emptyTitle="Sem tempo registrado"
        emptyDescription="Continue estudando para ver a distribuição por curso."
      >
        <span />
      </ChartFrame>
    );
  }

  return (
    <ChartFrame
      title="Distribuição de tempo por curso"
      description="Onde seu tempo de estudo está indo"
    >
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
          >
            <CartesianGrid horizontal={false} stroke={theme.grid} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fill: theme.subtle, fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              width={140}
              tick={{ fill: theme.muted, fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: theme.grid, opacity: 0.4 }}
              content={
                <ChartTooltip
                  valueFormatter={(v) =>
                    v >= 60 ? `${Math.floor(v / 60)}h ${v % 60}min` : `${v}min`
                  }
                />
              }
            />
            <Bar dataKey="minutos" name="Tempo de estudo" radius={[0, 6, 6, 0]} maxBarSize={26}>
              {data.map((entry, index) => (
                <Cell
                  key={entry.label}
                  fill={theme.series[index % theme.series.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export interface StudyAreaPoint {
  label: string;
  horas: number;
}

export function StudyTimeAreaChart({
  data,
  height = 300,
}: {
  data: StudyAreaPoint[];
  height?: number;
}) {
  const { theme } = useChartTheme();
  const gradientId = React.useId();
  const isEmpty = data.length === 0 || data.every((d) => d.horas === 0);

  if (isEmpty) {
    return (
      <ChartFrame
        title="Horas de estudo por semana"
        description="Evolução do seu tempo de estudo"
        isEmpty
        emptyTitle="Sem horas de estudo"
        emptyDescription="Assista às aulas e seu histórico aparece aqui."
      >
        <span />
      </ChartFrame>
    );
  }

  return (
    <ChartFrame
      title="Horas de estudo por semana"
      description="Evolução do seu tempo de estudo"
    >
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.series[0]} stopOpacity={0.35} />
                <stop offset="100%" stopColor={theme.series[0]} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={theme.grid} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: theme.subtle, fontSize: 12 }}
              dy={6}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: theme.subtle, fontSize: 12 }}
              width={48}
            />
            <Tooltip
              cursor={{ stroke: theme.series[0], strokeWidth: 1, strokeDasharray: "4 4" }}
              content={<ChartTooltip valueFormatter={(v) => `${v}h`} />}
            />
            <Area
              type="monotone"
              dataKey="horas"
              name="Horas"
              stroke={theme.series[0]}
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              activeDot={{ r: 5, strokeWidth: 2, stroke: theme.surface }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export interface ProgressBarsPoint {
  label: string;
  concluidas: number;
  pendentes: number;
}

export function ProgressBarsChart({
  data,
  height = 300,
}: {
  data: ProgressBarsPoint[];
  height?: number;
}) {
  const { theme } = useChartTheme();
  const isEmpty = data.length === 0;

  if (isEmpty) {
    return (
      <ChartFrame
        title="Aulas por curso"
        description="Concluídas versus pendentes"
        isEmpty
        emptyTitle="Nenhum curso por aqui"
        emptyDescription="Inscreva-se em um curso para acompanhar seu avanço."
      >
        <span />
      </ChartFrame>
    );
  }

  return (
    <ChartFrame title="Aulas por curso" description="Concluídas versus pendentes">
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke={theme.grid} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: theme.subtle, fontSize: 12 }}
              dy={6}
              interval={0}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: theme.subtle, fontSize: 12 }}
              width={40}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: theme.grid, opacity: 0.4 }}
              content={<ChartTooltip />}
            />
            <Legend
              verticalAlign="top"
              height={32}
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => (
                <span style={{ color: theme.muted, fontSize: 12 }}>{value}</span>
              )}
            />
            <Bar
              dataKey="concluidas"
              name="Concluídas"
              stackId="a"
              fill={theme.series[2]}
              radius={[0, 0, 0, 0]}
              maxBarSize={46}
            />
            <Bar
              dataKey="pendentes"
              name="Pendentes"
              stackId="a"
              fill={theme.series[3]}
              radius={[6, 6, 0, 0]}
              maxBarSize={46}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export interface ExamScorePoint {
  label: string;
  nota: number;
  passou: boolean;
}

export function ExamScoreChart({
  data,
  height = 300,
}: {
  data: ExamScorePoint[];
  height?: number;
}) {
  const { theme } = useChartTheme();
  const isEmpty = data.length === 0;

  if (isEmpty) {
    return (
      <ChartFrame
        title="Evolução nas provas"
        description="Sua nota ao longo do tempo"
        isEmpty
        emptyTitle="Nenhuma prova realizada"
        emptyDescription="Assim que você fizer uma prova, a evolução aparece aqui."
      >
        <span />
      </ChartFrame>
    );
  }

  return (
    <ChartFrame
      title="Evolução nas provas"
      description="Sua nota ao longo do tempo"
      action={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sunken px-2.5 py-1 text-xs font-semibold text-muted">
          <TrendingUp className="h-3.5 w-3.5" />
          {data.length} {data.length === 1 ? "tentativa" : "tentativas"}
        </span>
      }
    >
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke={theme.grid} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: theme.subtle, fontSize: 12 }}
              dy={6}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: theme.subtle, fontSize: 12 }}
              width={40}
            />
            <Tooltip
              cursor={{ stroke: theme.series[0], strokeWidth: 1, strokeDasharray: "4 4" }}
              content={
                <ChartTooltip
                  valueFormatter={(v) => `${v}%`}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="nota"
              name="Nota"
              stroke={theme.series[0]}
              strokeWidth={2.5}
              dot={{ r: 4, fill: theme.series[0], strokeWidth: 2, stroke: theme.surface }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function SimpleBarChart({
  title,
  data,
  height = 280,
  seriesName,
  unit,
}: {
  title?: string;
  data: { label: string; value: number }[];
  height?: number;
  seriesName: string;
  unit?: string;
}) {
  const { theme } = useChartTheme();
  const isEmpty = data.length === 0;

  if (isEmpty) {
    return (
      <ChartFrame title={title ?? seriesName} isEmpty emptyTitle="Sem dados para o período">
        <span />
      </ChartFrame>
    );
  }

  return (
    <ChartFrame title={title ?? seriesName}>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke={theme.grid} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: theme.subtle, fontSize: 12 }}
              dy={6}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: theme.subtle, fontSize: 12 }}
              width={40}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: theme.grid, opacity: 0.4 }}
              content={<ChartTooltip unit={unit} />}
            />
            <Bar dataKey="value" name={seriesName} fill={theme.series[0]} radius={[6, 6, 0, 0]} maxBarSize={42} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export { ChartSkeleton };
