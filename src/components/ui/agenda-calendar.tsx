"use client";

import * as React from "react";
import {
  addDays,
  addWeeks,
  format,
  isSameDay,
  isToday,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  Clock,
  Filter,
  LayoutGrid,
  List,
  Radio,
  Sparkles,
  Timer,
  UserRound,
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
} from "@/components/ui/dialog";
import { EmptyState, SectionHeader, Skeleton } from "@/components/ui/primitives";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { cn, formatDuration, formatTime } from "@/lib/utils";
import {
  CancelSessionDialog,
  Countdown,
  SessionDetailBody,
  SessionStatusBadge,
  type SessionDTO,
  type SessionKindDTO,
} from "@/components/ui/session-kit";
import { cancelSession, createSession } from "@/app/app/agenda/actions";

const HOUR_HEIGHT = 56;
const HOUR_LINES =
  "repeating-linear-gradient(to bottom, var(--border-subtle) 0px, var(--border-subtle) 1px, transparent 1px, transparent 56px)";

type ViewMode = "semana" | "lista" | "30d";
type KindFilter = "TODOS" | SessionKindDTO;

export type AgendaTeacher = { id: string; name: string; avatarUrl: string | null };
export type AgendaStudent = { id: string; name: string };
export type AgendaCourse = { id: string; title: string };

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function minutesOfDay(iso: string) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function durationMinutes(session: SessionDTO) {
  return Math.max(
    0,
    Math.round(
      (new Date(session.endsAt).getTime() - new Date(session.startsAt).getTime()) / 60_000,
    ),
  );
}

function hourRange(sessions: SessionDTO[]) {
  if (!sessions.length) return { start: 8, end: 20 };
  let min = 24;
  let max = 0;
  for (const s of sessions) {
    const start = new Date(s.startsAt);
    const end = new Date(s.endsAt);
    min = Math.min(min, start.getHours());
    max = Math.max(max, end.getHours() + (end.getMinutes() > 0 ? 1 : 0));
  }
  const start = Math.max(0, Math.min(min - 1, 20));
  const end = Math.min(24, Math.max(max + 1, start + 5));
  return { start, end: Math.max(end, start + 4) };
}

/** Distribui eventos sobrepostos do mesmo dia em colunas. */
function layoutDay(sessions: SessionDTO[]) {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  const result: { session: SessionDTO; col: number; cols: number }[] = [];
  let cluster: SessionDTO[] = [];
  let clusterEnd = 0;

  const flush = () => {
    if (!cluster.length) return;
    const columns: SessionDTO[][] = [];
    for (const session of cluster) {
      const start = new Date(session.startsAt).getTime();
      let placed = false;
      for (const column of columns) {
        const free = column.every(
          (other) => new Date(other.endsAt).getTime() <= start,
        );
        if (free) {
          column.push(session);
          placed = true;
          break;
        }
      }
      if (!placed) columns.push([session]);
    }
    columns.forEach((column, col) => {
      for (const session of column) {
        result.push({ session, col, cols: columns.length });
      }
    });
    cluster = [];
  };

  for (const session of sorted) {
    const start = new Date(session.startsAt).getTime();
    const end = new Date(session.endsAt).getTime();
    if (cluster.length && start >= clusterEnd) flush();
    cluster.push(session);
    clusterEnd = Math.max(clusterEnd, end);
  }
  flush();

  return result;
}

function groupByDay(sessions: SessionDTO[]) {
  const map = new Map<string, SessionDTO[]>();
  for (const session of sessions) {
    const key = new Date(session.startsAt).toDateString();
    const list = map.get(key) ?? [];
    list.push(session);
    map.set(key, list);
  }
  return [...map.entries()].map(([key, list]) => ({
    day: new Date(key),
    sessions: list.sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    ),
  }));
}

const KIND_STYLES: Record<SessionKindDTO, string> = {
  AULA_AO_VIVO:
    "border-brand-300 bg-brand-50 text-brand-800 dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-100",
  AULA_PARTICULAR:
    "border-pop-300 bg-pop-50 text-pop-800 dark:border-pop-500/40 dark:bg-pop-500/15 dark:text-pop-100",
  AULA_GRAVADA:
    "border-default bg-sunken text-default",
};

/* ------------------------------------------------------------------ *
 * Blocos visuais
 * ------------------------------------------------------------------ */

function EventBlock({
  session,
  top,
  height,
  left,
  width,
  onSelect,
}: {
  session: SessionDTO;
  top: number;
  height: number;
  left: string;
  width: string;
  onSelect: (session: SessionDTO) => void;
}) {
  const past = new Date(session.endsAt).getTime() < Date.now();
  const cancelled = session.status === "CANCELADA";

  return (
    <button
      type="button"
      onClick={() => onSelect(session)}
      aria-label={`${session.title}, ${formatTime(session.startsAt)}`}
      className={cn(
        "absolute overflow-hidden rounded-lg border px-2 py-1 text-left shadow-soft transition-all duration-200 hover:z-10 hover:-translate-y-0.5 hover:shadow-lifted focus-visible:z-10",
        KIND_STYLES[session.kind],
        past && "opacity-55",
        cancelled && "line-through opacity-45",
      )}
      style={{ top, height, left, width }}
    >
      <span className="block truncate text-[11px] font-bold leading-tight">
        {session.title}
      </span>
      <span className="block truncate text-[10px] font-medium opacity-80">
        {formatTime(session.startsAt)} · {session.teacher.name.split(" ")[0]}
      </span>
    </button>
  );
}

function UpcomingCard({
  session,
  onSelect,
}: {
  session: SessionDTO;
  onSelect: (session: SessionDTO) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(session)}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-subtle bg-surface p-4 text-left shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lifted focus-visible:outline-none"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 gradient-brand opacity-80" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {session.kind === "AULA_PARTICULAR" ? (
            <Sparkles className="h-4 w-4 text-pop-500" />
          ) : (
            <Radio className="h-4 w-4 text-brand-500" />
          )}
          <span className="text-xs font-semibold uppercase tracking-wide text-subtle">
            {session.kind === "AULA_PARTICULAR" ? "Particular" : "Ao vivo"}
          </span>
        </div>
        <SessionStatusBadge status={session.status} />
      </div>

      <div>
        <p className="line-clamp-2 text-sm font-bold leading-snug text-default">
          {session.title}
        </p>
        <p className="mt-1 text-xs text-muted">
          {formatTime(session.startsAt)} · {formatDuration(durationMinutes(session) * 60)}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-subtle pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar
            name={session.teacher.name}
            src={session.teacher.avatarUrl}
            size="xs"
          />
          <span className="truncate text-xs font-medium text-muted">
            {session.teacher.name}
          </span>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2 py-1 text-xs font-bold tabular-nums text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
          <Timer className="h-3 w-3" />
          <Countdown to={session.startsAt} />
        </span>
      </div>
    </button>
  );
}

function SessionRow({
  session,
  onSelect,
}: {
  session: SessionDTO;
  onSelect: (session: SessionDTO) => void;
}) {
  const past = new Date(session.endsAt).getTime() < Date.now();
  const cancelled = session.status === "CANCELADA";

  return (
    <button
      type="button"
      onClick={() => onSelect(session)}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-subtle bg-surface p-3 text-left shadow-soft transition-all duration-200 hover:border-strong hover:shadow-lifted focus-visible:outline-none sm:p-4",
        past && "opacity-60",
        cancelled && "line-through",
      )}
    >
      <div className="w-14 shrink-0 text-center">
        <p className="text-sm font-bold tabular-nums text-default">
          {formatTime(session.startsAt)}
        </p>
        <p className="text-[11px] text-subtle">{formatTime(session.endsAt)}</p>
      </div>
      <div className={cn("h-10 w-1 shrink-0 rounded-full", session.kind === "AULA_PARTICULAR" ? "bg-pop-400" : "bg-brand-400")} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-default">{session.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <UserRound className="h-3 w-3" />
            {session.teacher.name}
          </span>
          {session.course ? (
            <span className="inline-flex items-center gap-1 truncate">
              <CirclePlay className="h-3 w-3" />
              {session.course.title}
            </span>
          ) : null}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {session.recordedUrl ? (
          <span className="hidden items-center gap-1 rounded-full bg-accent-50 px-2 py-1 text-[11px] font-semibold text-accent-700 dark:bg-accent-500/15 dark:text-accent-200 sm:inline-flex">
            <CirclePlay className="h-3 w-3" />
            Gravação
          </span>
        ) : null}
        <SessionStatusBadge status={session.status} />
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Dialog de criação de aula
 * ------------------------------------------------------------------ */

function CreateSessionDialog({
  open,
  onOpenChange,
  teachers,
  students,
  courses,
  isAdmin,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teachers: AgendaTeacher[];
  students: AgendaStudent[];
  courses: AgendaCourse[];
  isAdmin: boolean;
}) {
  const [pending, setPending] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [date, setDate] = React.useState(() => format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = React.useState("19:00");
  const [duration, setDuration] = React.useState(60);
  const [teacherId, setTeacherId] = React.useState(teachers[0]?.id ?? "");
  const [studentId, setStudentId] = React.useState("");
  const [courseId, setCourseId] = React.useState("");
  const [meetingUrl, setMeetingUrl] = React.useState("");
  const [meetingCode, setMeetingCode] = React.useState("");

  async function submit() {
    const startsAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(startsAt.getTime())) {
      toast.error("Data ou horário inválidos");
      return;
    }
    const endsAt = new Date(startsAt.getTime() + duration * 60_000);

    setPending(true);
    const result = await createSession({
      title,
      description,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      teacherId: teacherId || null,
      studentId: studentId || null,
      courseId: courseId || null,
      meetingUrl: meetingUrl || null,
      meetingCode: meetingCode || null,
      kind: "AULA_AO_VIVO",
    });
    setPending(false);

    if (result.ok) {
      toast.success(result.message);
      setOpenChange(false);
      setTitle("");
      setDescription("");
    } else {
      toast.error(result.message);
    }
  }

  function setOpenChange(value: boolean) {
    onOpenChange(value);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-brand-500" />
            Nova aula ao vivo
        </DialogTitle>
          <DialogDescription>
            Crie uma sessão na agenda. O aluno recebe o acesso assim que a aula for
            publicada.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-6 sm:grid-cols-2">
          <Field label="Título" className="sm:col-span-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Live — Conversação: tema da semana"
              required
            />
          </Field>
          <Field label="Descrição" className="sm:col-span-2">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que será trabalhado nesta aula?"
            />
          </Field>
          <Field label="Data">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Horário">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="Duração">
            <Select value={String(duration)} onChange={(e) => setDuration(Number(e.target.value))}>
              <option value="30">30 minutos</option>
              <option value="50">50 minutos</option>
              <option value="60">60 minutos</option>
              <option value="90">90 minutos</option>
            </Select>
          </Field>
          <Field label="Professor">
            <Select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              disabled={!isAdmin}
            >
              {isAdmin ? <option value="">Selecione</option> : null}
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Aluno (opcional)">
            <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Aula aberta</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Curso (opcional)">
            <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">Sem curso</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Link da reunião (opcional)">
            <Input
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://meet.google.com/..."
            />
          </Field>
          <Field label="Código da reunião (opcional)" className="sm:col-span-2">
            <Input
              value={meetingCode}
              onChange={(e) => setMeetingCode(e.target.value)}
              placeholder="SEA-XXXXXX"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending || title.trim().length < 3}>
            {pending ? "Criando…" : "Criar aula"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ *
 * Componente principal
 * ------------------------------------------------------------------ */

export function AgendaCalendar({
  sessions,
  teachers,
  students = [],
  courses = [],
  canCreate = false,
  isAdmin = false,
}: {
  sessions: SessionDTO[];
  teachers: AgendaTeacher[];
  students?: AgendaStudent[];
  courses?: AgendaCourse[];
  canCreate?: boolean;
  isAdmin?: boolean;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [view, setView] = React.useState<ViewMode>("semana");
  const [weekStart, setWeekStart] = React.useState<Date | null>(null);
  const [kindFilter, setKindFilter] = React.useState<KindFilter>("TODOS");
  const [teacherFilter, setTeacherFilter] = React.useState("TODOS");
  const [selected, setSelected] = React.useState<SessionDTO | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    setMounted(true);
    setWeekStart((current) => current ?? startOfWeek(new Date(), { weekStartsOn: 1 }));
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const base = weekStart ?? startOfWeek(new Date(), { weekStartsOn: 1 });

  const filtered = React.useMemo(
    () =>
      sessions.filter((session) => {
        if (kindFilter !== "TODOS" && session.kind !== kindFilter) return false;
        if (teacherFilter !== "TODOS" && session.teacher.id !== teacherFilter) return false;
        return true;
      }),
    [sessions, kindFilter, teacherFilter],
  );

  const weekDays = React.useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(base, index)),
    [base],
  );

  const weekSessions = React.useMemo(
    () =>
      filtered.filter((session) => {
        const date = new Date(session.startsAt);
        return weekDays.some((day) => isSameDay(day, date));
      }),
    [filtered, weekDays],
  );

  const upcoming = React.useMemo(
    () =>
      filtered
        .filter(
          (session) =>
            new Date(session.startsAt).getTime() > Date.now() &&
            session.status !== "CANCELADA",
        )
        .sort(
          (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        )
        .slice(0, 4),
    [filtered],
  );

  const next30 = React.useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = addDays(start, 30);
    return filtered.filter((session) => {
      const time = new Date(session.startsAt).getTime();
      return time >= start.getTime() && time < end.getTime();
    });
  }, [filtered]);

  const { start: startHour, end: endHour } = React.useMemo(
    () => hourRange(weekSessions.length ? weekSessions : next30),
    [weekSessions, next30],
  );

  const bodyHeight = (endHour - startHour) * HOUR_HEIGHT;

  const days30 = React.useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 30 }, (_, index) => addDays(start, index));
  }, []);

  const weekLabel = `${format(base, "d 'de' MMM", { locale: ptBR })} — ${format(
    addDays(base, 6),
    "d 'de' MMM 'de' yyyy",
    { locale: ptBR },
  )}`;

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-default sm:text-3xl">
            Agenda ao vivo
          </h1>
          <p className="text-sm text-muted">
            Aulas lives, workshops e aulas particulares — tudo em um só calendário.
          </p>
        </div>
        {canCreate ? (
          <Button onClick={() => setCreateOpen(true)}>
            <CalendarPlus className="h-4 w-4" />
            Nova aula
          </Button>
        ) : null}
      </div>

      {/* Próximas aulas */}
      <section aria-labelledby="proximas-aulas" className="space-y-4">
        <SectionHeader
          title="Próximas aulas"
          description="As sessões mais próximas de você, com contagem regressiva."
        />
        {!mounted ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-[168px] rounded-xl" />
            ))}
          </div>
        ) : upcoming.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {upcoming.map((session) => (
              <UpcomingCard
                key={session.id}
                session={session}
                onSelect={setSelected}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="Nenhuma aula agendada no momento"
            description="Assim que uma sessão for publicada para você, ela aparece aqui com o link de acesso."
          />
        )}
      </section>

      {/* Controles */}
      <section className="space-y-4" aria-label="Controles do calendário">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-subtle bg-surface p-3 shadow-soft">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Semana anterior"
              onClick={() => setWeekStart(subWeeks(base, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Próxima semana"
              onClick={() => setWeekStart(addWeeks(base, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="ml-1">
              <p className="text-sm font-semibold capitalize text-default">{weekLabel}</p>
              <button
                type="button"
                onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300"
              >
                Ir para a semana atual
              </button>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Modo de visualização"
            className="inline-flex items-center gap-1 rounded-xl bg-sunken p-1"
          >
            {(
              [
                { id: "semana", label: "Semana", icon: LayoutGrid },
                { id: "lista", label: "Lista", icon: List },
                { id: "30d", label: "30 dias", icon: CalendarDays },
              ] as const
            ).map((option) => {
              const Icon = option.icon;
              const active = view === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setView(option.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all",
                    active
                      ? "bg-surface text-default shadow-soft"
                      : "text-muted hover:text-default",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-subtle bg-surface p-3 shadow-soft">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-subtle">
            <Filter className="h-4 w-4" />
            Filtros
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: "TODOS", label: "Todos os tipos" },
                { id: "AULA_AO_VIVO", label: "Ao vivo" },
                { id: "AULA_PARTICULAR", label: "Particulares" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={kindFilter === option.id}
                onClick={() => setKindFilter(option.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                  kindFilter === option.id
                    ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-200"
                    : "border-default text-muted hover:border-strong hover:text-default",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <label className="ml-auto flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-subtle">
            Professor
            <Select
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              className="h-9 w-auto min-w-[160px] text-sm"
              aria-label="Filtrar por professor"
            >
              <option value="TODOS">Todos os professores</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </section>

      {/* Visualização */}
      <section aria-label="Calendário de aulas">
        {!mounted ? (
          <div className="space-y-3">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-[420px] rounded-xl" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nenhuma aula encontrada"
            description="Não há sessões para os filtros selecionados nesta período. Ajuste os filtros ou navegue por outras semanas."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setKindFilter("TODOS");
                  setTeacherFilter("TODOS");
                }}
              >
                Limpar filtros
              </Button>
            }
          />
        ) : (
          <>
            {/* Grade da semana (desktop) */}
            <div
              className={cn(
                "overflow-hidden rounded-xl border border-subtle bg-surface shadow-soft",
                view === "semana" ? "hidden lg:block" : "hidden",
              )}
            >
              {weekSessions.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="Sem aulas nesta semana"
                  description="Navegue para a semana anterior ou seguinte usando as setas acima."
                  className="border-0"
                />
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[880px]">
                    <div
                      className="grid border-b border-subtle"
                      style={{ gridTemplateColumns: "64px repeat(7, minmax(0, 1fr))" }}
                    >
                      <div />
                      {weekDays.map((day) => (
                        <div
                          key={day.toISOString()}
                          className={cn(
                            "border-l border-subtle px-2 py-3 text-center",
                            isToday(day) && "bg-brand-50 dark:bg-brand-500/10",
                          )}
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
                            {format(day, "EEE", { locale: ptBR })}
                          </p>
                          <p
                            className={cn(
                              "mt-0.5 text-lg font-bold tabular-nums",
                              isToday(day)
                                ? "text-brand-600 dark:text-brand-300"
                                : "text-default",
                            )}
                          >
                            {format(day, "d", { locale: ptBR })}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div
                      className="grid"
                      style={{ gridTemplateColumns: "64px repeat(7, minmax(0, 1fr))" }}
                    >
                      <div className="relative" style={{ height: bodyHeight }}>
                        {Array.from(
                          { length: endHour - startHour + 1 },
                          (_, index) => startHour + index,
                        ).map((hour) => (
                          <span
                            key={hour}
                            className="absolute right-3 -translate-y-1/2 text-[11px] font-medium tabular-nums text-subtle"
                            style={{ top: (hour - startHour) * HOUR_HEIGHT }}
                          >
                            {String(hour).padStart(2, "0")}:00
                          </span>
                        ))}
                      </div>

                      {weekDays.map((day) => {
                        const daySessions = weekSessions.filter((session) =>
                          isSameDay(day, new Date(session.startsAt)),
                        );
                        const positioned = layoutDay(daySessions);
                        const showNow =
                          now !== null &&
                          isToday(day) &&
                          minutesOfDay(new Date(now).toISOString()) >= startHour * 60 &&
                          minutesOfDay(new Date(now).toISOString()) <= endHour * 60;

                        return (
                          <div
                            key={day.toISOString()}
                            className={cn(
                              "relative border-l border-subtle",
                              isToday(day) && "bg-brand-50/40 dark:bg-brand-500/5",
                            )}
                            style={{ height: bodyHeight, backgroundImage: HOUR_LINES }}
                          >
                            {positioned.map(({ session, col, cols }) => {
                              const top =
                                ((minutesOfDay(session.startsAt) - startHour * 60) / 60) *
                                HOUR_HEIGHT;
                              const height = Math.max(
                                26,
                                (durationMinutes(session) / 60) * HOUR_HEIGHT - 4,
                              );
                              const width = 100 / cols;
                              return (
                                <EventBlock
                                  key={session.id}
                                  session={session}
                                  top={top}
                                  height={height}
                                  left={`calc(${col * width}% + 2px)`}
                                  width={`calc(${width}% - 4px)`}
                                  onSelect={setSelected}
                                />
                              );
                            })}

                            {showNow ? (
                              <div
                                className="pointer-events-none absolute left-0 right-0 z-20 h-px bg-cherry-500"
                                style={{
                                  top:
                                    ((minutesOfDay(new Date(now).toISOString()) -
                                      startHour * 60) /
                                      60) *
                                    HOUR_HEIGHT,
                                }}
                              >
                                <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-cherry-500" />
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Lista (mobile no modo semana, desktop no modo lista) */}
            <div className={cn(view === "semana" ? "lg:hidden" : "hidden")}>
              <div className="space-y-6">
                {groupByDay(weekSessions).map(({ day, sessions: daySessions }) => (
                  <div key={day.toISOString()} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold capitalize text-default">
                        {format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}
                      </h3>
                      {isToday(day) ? (
                        <Badge variant="brand">Hoje</Badge>
                      ) : null}
                      <span className="text-xs text-subtle">
                        {daySessions.length} {daySessions.length === 1 ? "aula" : "aulas"}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {daySessions.map((session) => (
                        <SessionRow
                          key={session.id}
                          session={session}
                          onSelect={setSelected}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {weekSessions.length === 0 ? (
                  <EmptyState
                    icon={CalendarDays}
                    title="Sem aulas nesta semana"
                    description="Navegue para outra semana ou ajuste os filtros."
                  />
                ) : null}
              </div>
            </div>

            {/* Modo lista (próximas 30 dias, linha compacta) */}
            <div className={cn(view === "lista" ? "block" : "hidden")}>
              {next30.length ? (
                <div className="space-y-2">
                  {next30.map((session) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      onSelect={setSelected}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={List}
                  title="Nada agendado nos próximos 30 dias"
                  description="Assim que houver uma nova sessão, ela aparece aqui automaticamente."
                />
              )}
            </div>

            {/* Modo 30 dias (agrupado por dia) */}
            <div className={cn(view === "30d" ? "block" : "hidden")}>
              <div className="space-y-6">
                {days30.map((day) => {
                  const daySessions = next30.filter((session) =>
                    isSameDay(day, new Date(session.startsAt)),
                  );
                  if (!daySessions.length) return null;
                  return (
                    <div key={day.toISOString()} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold capitalize text-default">
                          {format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}
                        </h3>
                        {isToday(day) ? <Badge variant="brand">Hoje</Badge> : null}
                        <span className="text-xs text-subtle">
                          {daySessions.length}{" "}
                          {daySessions.length === 1 ? "aula" : "aulas"}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {daySessions.map((session) => (
                          <SessionRow
                            key={session.id}
                            session={session}
                            onSelect={setSelected}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {next30.length === 0 ? (
                  <EmptyState
                    icon={CalendarDays}
                    title="Agenda livre nos próximos 30 dias"
                    description="Aproveite para revisar o conteúdo gravado ou agendar uma aula particular."
                  />
                ) : null}
              </div>
            </div>
          </>
        )}
      </section>

      {/* Detalhe da sessão */}
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-w-xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selected.kind === "AULA_PARTICULAR" ? (
                    <Sparkles className="h-5 w-5 text-pop-500" />
                  ) : (
                    <Radio className="h-5 w-5 text-brand-500" />
                  )}
                  {selected.title}
                </DialogTitle>
                <DialogDescription>
                  {formatTime(selected.startsAt)} — {formatTime(selected.endsAt)} ·{" "}
                  {formatDuration(durationMinutes(selected) * 60)}
                </DialogDescription>
              </DialogHeader>
              <div className="px-6 pb-2">
                <SessionDetailBody
                  session={selected}
                  actions={
                    <>
                      {selected.meetingUrl ? (
                        <Button asChild variant="primary">
                          <a href={selected.meetingUrl} target="_blank" rel="noopener noreferrer">
                            <Video className="h-4 w-4" />
                            Entrar na aula
                          </a>
                        </Button>
                      ) : null}
                      {selected.recordedUrl ? (
                        <Button asChild variant="secondary">
                          <a
                            href={selected.recordedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <CirclePlay className="h-4 w-4" />
                            Ver gravação
                          </a>
                        </Button>
                      ) : null}
                      {selected.status !== "CANCELADA" &&
                      selected.status !== "CONCLUIDA" ? (
                        <CancelSessionDialog
                          sessionId={selected.id}
                          sessionTitle={selected.title}
                          onCancel={cancelSession}
                          trigger={
                            <Button variant="ghost">
                              <Clock className="h-4 w-4" />
                              Cancelar aula
                            </Button>
                          }
                        />
                      ) : null}
                    </>
                  }
                />
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {canCreate ? (
        <CreateSessionDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          teachers={teachers}
          students={students}
          courses={courses}
          isAdmin={isAdmin}
        />
      ) : null}
    </div>
  );
}
