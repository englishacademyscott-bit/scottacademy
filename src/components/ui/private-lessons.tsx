"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  CalendarClock,
  CirclePlay,
  Clock,
  GraduationCap,
  RefreshCw,
  Sparkles,
  Star,
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
import { cn, formatCurrency, formatDateTime, formatDuration } from "@/lib/utils";
import {
  CancelSessionDialog,
  Countdown,
  RescheduleDialog,
  SessionStatusBadge,
  type SessionDTO,
} from "@/components/ui/session-kit";
import {
  bookPrivateLesson,
  cancelSession,
  rescheduleSession,
} from "@/app/app/particulares/actions";

export type TeacherDTO = {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  rating: number | null;
  ratingCount: number;
  courseCount: number;
  specialty: string | null;
};

/** Valor de referência exibido na interface (não vem do banco). */
const REFERENCE_PRICE_CENTS = 12000;

function durationMinutes(session: SessionDTO) {
  return Math.max(
    0,
    Math.round(
      (new Date(session.endsAt).getTime() - new Date(session.startsAt).getTime()) / 60_000,
    ),
  );
}

/* ------------------------------------------------------------------ *
 * Cartão de professor
 * ------------------------------------------------------------------ */

function TeacherCard({
  teacher,
  onBook,
}: {
  teacher: TeacherDTO;
  onBook: (teacherId: string) => void;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-subtle bg-surface p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lifted">
      <div className="flex items-start gap-3">
        <Avatar name={teacher.name} src={teacher.avatarUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-default">{teacher.name}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            {teacher.specialty ? (
              <span className="inline-flex items-center gap-1">
                <GraduationCap className="h-3 w-3" />
                {teacher.specialty}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <UserRound className="h-3 w-3" />
              {teacher.courseCount} {teacher.courseCount === 1 ? "curso" : "cursos"}
            </span>
          </p>
        </div>
      </div>

      {teacher.bio ? (
        <p className="line-clamp-3 text-sm leading-relaxed text-muted">{teacher.bio}</p>
      ) : (
        <p className="text-sm italic text-subtle">
          Este professor ainda não adicionou uma apresentação.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-subtle pt-4">
        <div className="space-y-0.5">
          <p className="flex items-center gap-1.5 text-sm font-bold text-default">
            <Star className="h-4 w-4 fill-sun-400 text-sun-400" />
            {teacher.rating ? teacher.rating.toFixed(1).replace(".", ",") : "—"}
            <span className="text-xs font-medium text-subtle">
              ({teacher.ratingCount} {teacher.ratingCount === 1 ? "avaliação" : "avaliações"})
            </span>
          </p>
          <p className="text-xs text-subtle">
            {formatCurrency(REFERENCE_PRICE_CENTS)}/h · valor de referência, a combinar
          </p>
        </div>
        <Button onClick={() => onBook(teacher.id)}>
          <CalendarClock className="h-4 w-4" />
          Agendar aula
        </Button>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ *
 * Card de aula particular (minhas aulas)
 * ------------------------------------------------------------------ */

function PrivateLessonCard({
  session,
}: {
  session: SessionDTO;
}) {
  const start = new Date(session.startsAt);
  const end = new Date(session.endsAt);
  const minutes = durationMinutes(session);
  const past = end.getTime() < Date.now();
  const cancelled = session.status === "CANCELADA";

  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-subtle bg-surface p-4 shadow-soft transition-all duration-300 hover:shadow-lifted sm:p-5",
        past && !cancelled && "opacity-70",
        cancelled && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="pop">
              <Sparkles className="h-3 w-3" />
              Particular
            </Badge>
            <SessionStatusBadge status={session.status} />
          </div>
          <h3 className="mt-2 text-base font-bold leading-snug text-default">
            {session.title}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4" />
              {formatDateTime(session.startsAt)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {formatDuration(minutes * 60)}
            </span>
          </p>
        </div>
        {!past && !cancelled ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold tabular-nums text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
            <Timer className="h-3.5 w-3.5" />
            <Countdown to={session.startsAt} />
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-subtle bg-sunken p-3">
        <Avatar name={session.teacher.name} src={session.teacher.avatarUrl} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-default">
            {session.teacher.name}
          </p>
          <p className="text-xs text-muted">Professor particular</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {session.meetingUrl ? (
          <Button asChild variant="primary" size="sm">
            <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer">
              <Video className="h-4 w-4" />
              Entrar na aula
            </a>
          </Button>
        ) : null}

        {session.recordedUrl ? (
          <Button asChild variant="secondary" size="sm">
            <a href={session.recordedUrl} target="_blank" rel="noopener noreferrer">
              <CirclePlay className="h-4 w-4" />
              Ver gravação
            </a>
          </Button>
        ) : null}

        {!past && !cancelled ? (
          <>
            <RescheduleDialog
              sessionId={session.id}
              sessionTitle={session.title}
              initialStart={session.startsAt}
              durationMin={minutes}
              onReschedule={rescheduleSession}
              trigger={
                <Button variant="secondary" size="sm">
                  <RefreshCw className="h-4 w-4" />
                  Reagendar
                </Button>
              }
            />
            <CancelSessionDialog
              sessionId={session.id}
              sessionTitle={session.title}
              onCancel={cancelSession}
              trigger={
                <Button variant="ghost" size="sm">
                  <Clock className="h-4 w-4" />
                  Cancelar
                </Button>
              }
            />
          </>
        ) : null}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ *
 * Modal de agendamento (2 etapas)
 * ------------------------------------------------------------------ */

function BookingDialog({
  open,
  onOpenChange,
  teachers,
  defaultTeacherId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teachers: TeacherDTO[];
  defaultTeacherId: string | null;
}) {
  const [step, setStep] = React.useState<"form" | "confirm">("form");
  const [pending, setPending] = React.useState(false);
  const [teacherId, setTeacherId] = React.useState(defaultTeacherId ?? "");
  const [date, setDate] = React.useState(() => format(addDaysSafe(new Date(), 1), "yyyy-MM-dd"));
  const [time, setTime] = React.useState("18:00");
  const [duration, setDuration] = React.useState(60);
  const [topic, setTopic] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setStep("form");
      setTeacherId(defaultTeacherId ?? teachers[0]?.id ?? "");
    }
  }, [open, defaultTeacherId, teachers]);

  const teacher = teachers.find((item) => item.id === teacherId) ?? null;

  async function confirmBooking() {
    setPending(true);
    const result = await bookPrivateLesson({
      teacherId,
      date,
      time,
      durationMin: duration,
      topic,
    });
    setPending(false);

    if (result.ok) {
      toast.success(result.message);
      onOpenChange(false);
      setTopic("");
    } else {
      toast.error(result.message);
      setStep("form");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-pop-500" />
            {step === "form" ? "Agendar aula particular" : "Confirme seu agendamento"}
          </DialogTitle>
          <DialogDescription>
            {step === "form"
              ? "Escolha o professor, o melhor horário e o tema da sua aula de inglês."
              : "Revise os dados antes de confirmar. O professor recebe o agendamento imediatamente."}
          </DialogDescription>
        </DialogHeader>

        {step === "form" ? (
          <div className="grid gap-4 px-6 sm:grid-cols-2">
            <Field label="Professor" className="sm:col-span-2">
              <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                {teachers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Data">
              <Input
                type="date"
                value={date}
                min={format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </Field>
            <Field label="Horário">
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </Field>
            <Field label="Duração" className="sm:col-span-2">
              <Select
                value={String(duration)}
                onChange={(e) => setDuration(Number(e.target.value))}
              >
                <option value="30">30 minutos</option>
                <option value="50">50 minutos</option>
                <option value="60">60 minutos</option>
              </Select>
            </Field>
            <Field
              label="Tema / objetivo da aula"
              hint="Opcional — ajuda o professor a preparar o material."
              className="sm:col-span-2"
            >
              <Textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex.: revisão de inglês para entrevista de emprego"
              />
            </Field>
          </div>
        ) : (
          <div className="space-y-3 px-6">
            <dl className="divide-y divide-subtle rounded-xl border border-subtle bg-sunken">
              {[
                { label: "Professor", value: teacher?.name ?? "—" },
                { label: "Data", value: date.split("-").reverse().join("/") },
                { label: "Horário", value: `${time} · ${duration} minutos` },
                { label: "Tema", value: topic.trim() || "Tema a definir com o professor" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-subtle">
                    {row.label}
                  </dt>
                  <dd className="truncate text-sm font-semibold text-default">{row.value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-muted">
              O valor de referência é {formatCurrency(REFERENCE_PRICE_CENTS)}/hora, a combinar
              diretamente com o professor.
            </p>
          </div>
        )}

        <DialogFooter>
          {step === "form" ? (
            <>
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setStep("confirm")} disabled={!teacherId}>
                Continuar
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setStep("form")} disabled={pending}>
                Voltar
              </Button>
              <Button onClick={confirmBooking} disabled={pending}>
                {pending ? "Agendando…" : "Confirmar agendamento"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function addDaysSafe(date: Date, days: number) {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

/* ------------------------------------------------------------------ *
 * Componente principal
 * ------------------------------------------------------------------ */

export function PrivateLessons({
  teachers,
  sessions,
}: {
  teachers: TeacherDTO[];
  sessions: SessionDTO[];
}) {
  const [mounted, setMounted] = React.useState(false);
  const [bookingOpen, setBookingOpen] = React.useState(false);
  const [selectedTeacher, setSelectedTeacher] = React.useState<string | null>(null);

  React.useEffect(() => setMounted(true), []);

  const now = Date.now();
  const upcoming = sessions
    .filter((session) => new Date(session.endsAt).getTime() >= now)
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  const past = sessions
    .filter((session) => new Date(session.endsAt).getTime() < now)
    .sort(
      (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
    );

  function openBooking(teacherId: string | null) {
    setSelectedTeacher(teacherId);
    setBookingOpen(true);
  }

  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-default sm:text-3xl">
          Aulas particulares
        </h1>
        <p className="text-sm text-muted">
          Sessões 1:1 com nossos professores para um acompanhamento totalmente
          personalizado.
        </p>
      </div>

      {/* Catálogo de professores */}
      <section aria-labelledby="catalogo-professores" className="space-y-4">
        <SectionHeader
          title="Nossos professores"
          description="Escolha quem te acompanha melhor e agende seu horário."
        />
        {teachers.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {teachers.map((teacher) => (
              <TeacherCard
                key={teacher.id}
                teacher={teacher}
                onBook={(id) => openBooking(id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={UserRound}
            title="Nenhum professor disponível"
            description="Estamos cadastrando novos professores. Enquanto isso, acompanhe as aulas ao vivo na agenda."
          />
        )}
      </section>

      {/* Minhas aulas */}
      <section aria-labelledby="minhas-aulas" className="space-y-4">
        <SectionHeader
          title="Minhas aulas particulares"
          description="Acompanhe as próximas sessões e consulte as gravações anteriores."
        />

        {!mounted ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1].map((index) => (
              <Skeleton key={index} className="h-[220px] rounded-xl" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Você ainda não tem aulas particulares"
            description="Escolha um professor acima e agende sua primeira sessão 1:1."
            action={
              teachers.length ? (
                <Button onClick={() => openBooking(teachers[0].id)}>
                  <CalendarClock className="h-4 w-4" />
                  Agendar minha primeira aula
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="space-y-8">
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-subtle">
                Próximas aulas
              </h3>
              {upcoming.length ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {upcoming.map((session) => (
                    <PrivateLessonCard key={session.id} session={session} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={CalendarClock}
                  title="Nenhuma aula futura"
                  description="Agende uma nova sessão com o professor de sua preferência."
                />
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-subtle">
                Aulas anteriores
              </h3>
              {past.length ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {past.map((session) => (
                    <PrivateLessonCard key={session.id} session={session} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Clock}
                  title="Sem histórico por enquanto"
                  description="As aulas que você já fez aparecem aqui com o link da gravação."
                />
              )}
            </div>
          </div>
        )}
      </section>

      <BookingDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        teachers={teachers}
        defaultTeacherId={selectedTeacher}
      />
    </div>
  );
}
