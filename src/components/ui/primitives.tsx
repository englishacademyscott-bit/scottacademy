import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-sunken before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 dark:before:via-white/10 before:to-transparent",
        className,
      )}
      {...props}
    />
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-default bg-surface/50 px-6 py-14 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300">
          <Icon className="h-7 w-7" />
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-base font-semibold text-default">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-default">{title}</h2>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  hint,
  className,
}: {
  label: string;
  value: string | number;
  delta?: { value: string; positive?: boolean };
  icon?: React.ComponentType<{ className?: string }>;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-subtle bg-surface p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lifted",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-subtle">{label}</p>
          <p className="text-3xl font-bold tracking-tight text-default tabular-nums">{value}</p>
          {hint ? <p className="text-xs text-muted">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 transition-transform duration-300 group-hover:scale-110 dark:bg-brand-500/10 dark:text-brand-300">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
      {delta ? (
        <p
          className={cn(
            "mt-3 inline-flex items-center gap-1 text-xs font-semibold",
            delta.positive === false ? "text-cherry-500" : "text-emerald-600 dark:text-emerald-400",
          )}
        >
          {delta.value}
        </p>
      ) : null}
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-500/5 blur-2xl transition-opacity duration-500 group-hover:opacity-100 opacity-0" />
    </div>
  );
}
