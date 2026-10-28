"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  CircleCheck,
  CirclePlay,
  Copy,
  ExternalLink,
  Link2,
  Radio,
  Sparkles,
  TriangleAlert,
  Video,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { cn, formatDateTime, formatDuration, formatTime } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * Tipos compartilhados entre páginas (server) e ilhas de UI (client)
 * ------------------------------------------------------------------ */

export type SessionStatusDTO =
  | "AGENDADA"
  | "CONFIRMADA"
  | "CONCLUIDA"
  | "CANCELADA"
  | "FALTou";

export type SessionKindDTO = "AULA_AO_VIVO" | "AULA_PARTICULAR" | "AULA_GRAVADA";

export type SessionDTO = {
  id: string;
  title: string;
  description: string | null;
  kind: SessionKindDTO;
  status: SessionStatusDTO;
  startsAt: string;
  endsAt: string;
  meetingUrl: string | null;
  meetingCode: string | null;
  recordedUrl: string | null;
  teacher: { id: string; name: string; avatarUrl: string | null };
  student: { id: string; name: string } | null;
  course: { id: string; title: string } | null;
  createdById: string;
};

export type SessionActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export const DURATION_OPTIONS = [30, 50, 60] as const;

/* ------------------------------------------------------------------ *
 * Badges
 * ------------------------------------------------------------------ */

const STATUS_META: Record<
  SessionStatusDTO,
  { label: string; variant: "brand" | "success" | "accent" | "danger" | "warning" }
> = {
  AGENDADA: { label: "Agendada", variant: "warning" },
  CONFIRMADA: { label: "Confirmada", variant: "success" },
  CONCLUIDA: { label: "Concluída", variant: "accent" },
  CANCELADA: { label: "Cancelada", variant: "danger" },
  FALTou: { label: "Faltou", variant: "danger" },
};

export function SessionStatusBadge({
  status,
  className,
}: {
  status: SessionStatusDTO;
  className?: string;
}) {
  const meta = STATUS_META[status] ?? STATUS_META.AGENDADA;
  return (
    <Badge variant={meta.variant} className={className}>
      {meta.label}
    </Badge>
  );
}

export function SessionKindBadge({
  kind,
  className,
}: {
  kind: SessionKindDTO;
  className?: string;
}) {
  if (kind === "AULA_PARTICULAR") {
    return (
      <Badge variant="pop" className={className}>
        <Sparkles className="h-3 w-3" />
        Particular
      </Badge>
    );
  }
  if (kind === "AULA_AO_VIVO") {
    return (
      <Badge variant="brand" className={className}>
        <Radio className="h-3 w-3" />
        Ao vivo
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={className}>
      Gravada
    </Badge>
  );
}

/* ------------------------------------------------------------------ *
 * Countdown
 * ------------------------------------------------------------------ */

export function Countdown({
  to,
  className,
  emptyLabel = "—",
}: {
  to: string;
  className?: string;
  emptyLabel?: string;
}) {
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (now === null) {
    return <span className={className}>{emptyLabel}</span>;
  }

  const diff = new Date(to).getTime() - now;
  if (diff <= 0) {
    return (
      <span className={cn("font-semibold text-emerald-600 dark:text-emerald-400", className)}>
        agora
      </span>
    );
  }

  const totalMin = Math.floor(diff / 60_000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const minutes = totalMin % 60;

  const label =
    days > 0
      ? `${days}d ${hours}h`
      : hours > 0
        ? `${hours}h ${minutes}min`
        : `${minutes}min`;

  return <span className={className}>{label}</span>;
}

/* ------------------------------------------------------------------ *
 * Código da reunião (copiar)
 * ------------------------------------------------------------------ */

export function MeetingCodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Código copiado", { description: code });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar", {
        description: "Selecione o código e copie manualmente.",
      });
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-subtle bg-sunken px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
          Código da reunião
        </p>
        <p className="truncate font-mono text-sm font-semibold text-default">{code}</p>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={copy}
        aria-label={`Copiar código da reunião ${code}`}
      >
        {copied ? <CircleCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copiado" : "Copiar"}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Bloco de detalhes de uma sessão
 * ------------------------------------------------------------------ */

export function SessionDetailBody({
  session,
  actions,
}: {
  session: SessionDTO;
  actions?: React.ReactNode;
}) {
  const start = new Date(session.startsAt);
  const end = new Date(session.endsAt);
  const durationMin = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <SessionStatusBadge status={session.status} />
        <SessionKindBadge kind={session.kind} />
      </div>

      <div className="flex items-center gap-3">
        <Avatar name={session.teacher.name} src={session.teacher.avatarUrl} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-default">
            {session.teacher.name}
          </p>
          <p className="text-xs text-muted">Professor</p>
        </div>
      </div>

      {session.description ? (
        <p className="text-sm leading-relaxed text-muted">{session.description}</p>
      ) : null}

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-subtle bg-sunken p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-subtle">
            Início
          </dt>
          <dd className="mt-1 text-sm font-semibold text-default">
            {formatDateTime(session.startsAt)}
          </dd>
        </div>
        <div className="rounded-lg border border-subtle bg-sunken p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-subtle">
            Término
          </dt>
          <dd className="mt-1 text-sm font-semibold text-default">
            {formatTime(session.endsAt)}
          </dd>
        </div>
        <div className="rounded-lg border border-subtle bg-sunken p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-subtle">
            Duração
          </dt>
          <dd className="mt-1 text-sm font-semibold text-default">
            {formatDuration(durationMin * 60)}
          </dd>
        </div>
        <div className="rounded-lg border border-subtle bg-sunken p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-subtle">
            Curso
          </dt>
          <dd className="mt-1 truncate text-sm font-semibold text-default">
            {session.course ? session.course.title : "Aula avulsa"}
          </dd>
        </div>
      </dl>

      {session.student ? (
        <p className="text-xs text-muted">
          Participante: <span className="font-semibold text-default">{session.student.name}</span>
        </p>
      ) : null}

      {session.meetingUrl ? (
        <a
          href={session.meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-brand-300 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-200"
        >
          <Video className="h-4 w-4" />
          Entrar na reunião
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <p className="flex items-center gap-2 rounded-lg border border-dashed border-default px-3 py-2 text-xs text-muted">
          <Link2 className="h-4 w-4" />
          O link da reunião será disponibilizado após a confirmação do professor.
        </p>
      )}

      {session.meetingCode ? <MeetingCodeBlock code={session.meetingCode} /> : null}

      {session.recordedUrl ? (
        <a
          href={session.recordedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-accent-200 bg-accent-50 px-3 py-2 text-sm font-semibold text-accent-700 transition-colors hover:bg-accent-100 dark:border-accent-500/30 dark:bg-accent-500/15 dark:text-accent-200"
        >
          <CirclePlay className="h-4 w-4" />
          Ver gravação
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : null}

      {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Dialog de cancelamento
 * ------------------------------------------------------------------ */

export function CancelSessionDialog({
  sessionId,
  sessionTitle,
  onCancel,
  trigger,
}: {
  sessionId: string;
  sessionTitle: string;
  onCancel: (sessionId: string) => Promise<SessionActionResult>;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await onCancel(sessionId);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="h-5 w-5 text-cherry-500" />
            Cancelar aula
          </DialogTitle>
          <DialogDescription>
            Você está prestes a cancelar <strong>{sessionTitle}</strong>. Essa ação não pode
            ser desfeita e ambas as partes serão notificadas.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
            Voltar
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={pending}>
            {pending ? "Cancelando…" : "Cancelar aula"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ *
 * Dialog de reagendamento
 * ------------------------------------------------------------------ */

export function RescheduleDialog({
  sessionId,
  sessionTitle,
  initialStart,
  durationMin,
  onReschedule,
  trigger,
}: {
  sessionId: string;
  sessionTitle: string;
  initialStart: string;
  durationMin: number;
  onReschedule: (
    sessionId: string,
    startsAt: string,
    endsAt: string,
  ) => Promise<SessionActionResult>;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const initial = new Date(initialStart);
  const [date, setDate] = React.useState(() => format(initial, "yyyy-MM-dd"));
  const [time, setTime] = React.useState(() => format(initial, "HH:mm"));
  const [duration, setDuration] = React.useState(durationMin || 60);

  function submit() {
    const start = new Date(`${date}T${time}:00`);
    if (Number.isNaN(start.getTime())) {
      toast.error("Data ou horário inválidos");
      return;
    }
    const end = new Date(start.getTime() + duration * 60_000);
    startTransition(async () => {
      const result = await onReschedule(sessionId, start.toISOString(), end.toISOString());
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-brand-500" />
            Reagendar aula
          </DialogTitle>
          <DialogDescription>
            Escolha um novo horário para <strong>{sessionTitle}</strong>. O novo horário
            precisa estar livre na agenda do professor.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-6 sm:grid-cols-2">
          <Field label="Nova data">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </Field>
          <Field label="Novo horário">
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </Field>
          <Field label="Duração" className="sm:col-span-2">
            <Select value={String(duration)} onChange={(e) => setDuration(Number(e.target.value))}>
              {DURATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} minutos
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
            Voltar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Salvando…" : "Confirmar novo horário"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
