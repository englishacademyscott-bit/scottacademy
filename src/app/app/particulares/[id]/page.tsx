import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import {
  ArrowLeft,
  CalendarClock,
  CircleCheck,
  CirclePlay,
  Clock,
  RefreshCw,
  Sparkles,
  TriangleAlert,
  UserRound,
  Video,
} from "lucide-react";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/primitives";
import { cn, formatDateTime, formatDuration, formatTime } from "@/lib/utils";
import {
  CancelSessionDialog,
  Countdown,
  RescheduleDialog,
  SessionDetailBody,
  SessionKindBadge,
  SessionStatusBadge,
  type SessionDTO,
} from "@/components/ui/session-kit";
import { cancelSession, rescheduleSession } from "@/app/app/particulares/actions";

export const dynamic = "force-dynamic";

export default async function PrivateLessonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const session = await prisma.scheduledSession.findUnique({
    where: { id },
    include: {
      teacher: { select: { id: true, name: true, avatarUrl: true, bio: true } },
      student: { select: { id: true, name: true } },
      course: { select: { id: true, title: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!session) notFound();

  const isParticipant =
    session.studentId === user.id ||
    session.teacherId === user.id ||
    session.createdById === user.id;
  const isAdmin = user.role === Role.ADMIN;

  if (!isParticipant && !isAdmin) notFound();

  const payload: SessionDTO = {
    id: session.id,
    title: session.title,
    description: session.description,
    kind: String(session.kind) as SessionDTO["kind"],
    status: String(session.status) as SessionDTO["status"],
    startsAt: session.startsAt.toISOString(),
    endsAt: session.endsAt.toISOString(),
    meetingUrl: session.meetingUrl,
    meetingCode: session.meetingCode,
    recordedUrl: session.recordedUrl,
    teacher: {
      id: session.teacher.id,
      name: session.teacher.name,
      avatarUrl: session.teacher.avatarUrl,
    },
    student: session.student,
    course: session.course,
    createdById: session.createdById,
  };

  const durationMin = Math.max(
    0,
    Math.round((session.endsAt.getTime() - session.startsAt.getTime()) / 60_000),
  );
  const isPast = session.endsAt.getTime() < Date.now();
  const isCancelled = session.status === "CANCELADA";

  const timeline = [
    {
      icon: Sparkles,
      title: "Aula criada",
      description: formatDateTime(session.createdAt),
      done: true,
    },
    {
      icon: CalendarClock,
      title: "Horário definido",
      description: `${formatDateTime(session.startsAt)} — ${formatTime(session.endsAt)}`,
      done: true,
    },
    {
      icon: CircleCheck,
      title: "Confirmada pelo professor",
      description:
        session.status === "AGENDADA"
          ? "Aguardando confirmação do professor."
          : "O professor confirmou a presença nesta sessão.",
      done: session.status !== "AGENDADA" && !isCancelled,
    },
    {
      icon: Clock,
      title: "Sessão realizada",
      description: isPast
        ? `A aula terminou às ${formatTime(session.endsAt)}.`
        : "O encerramento acontece ao final do horário previsto.",
      done: isPast && !isCancelled,
    },
    ...(session.recordedUrl
      ? [
          {
            icon: CirclePlay,
            title: "Gravação disponível",
            description: "Assista à aula gravada quando quiser.",
            done: true,
          },
        ]
      : []),
    ...(isCancelled
      ? [
          {
            icon: TriangleAlert,
            title: "Aula cancelada",
            description: "Esta sessão foi cancelada e não será realizada.",
            done: true,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-8">
      <Link
        href="/app/particulares"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition-colors hover:text-default"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para aulas particulares
      </Link>

      {/* Header */}
      <Card className="overflow-hidden">
        <div className="h-1.5 gradient-brand" />
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <SessionKindBadge kind={payload.kind} />
            <SessionStatusBadge status={payload.status} />
          </div>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-default">
                {session.title}
              </h1>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="h-4 w-4" />
                  {formatDateTime(session.startsAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {formatDuration(durationMin * 60)}
                </span>
                {session.student ? (
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound className="h-4 w-4" />
                    {session.student.name}
                  </span>
                ) : null}
              </p>
            </div>
            {!isPast && !isCancelled ? (
              <div className="rounded-xl border border-subtle bg-sunken px-4 py-3 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
                  Começa em
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums text-default">
                  <Countdown to={session.startsAt.toISOString()} />
                </p>
              </div>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Ações */}
          <div className="flex flex-wrap items-center gap-2">
            {session.meetingUrl ? (
              <Button asChild variant="primary">
                <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer">
                  <Video className="h-4 w-4" />
                  Entrar na aula
                </a>
              </Button>
            ) : null}

            {session.recordedUrl ? (
              <Button asChild variant="secondary">
                <a href={session.recordedUrl} target="_blank" rel="noopener noreferrer">
                  <CirclePlay className="h-4 w-4" />
                  Ver gravação
                </a>
              </Button>
            ) : null}

            {!isPast && !isCancelled ? (
              <>
                <RescheduleDialog
                  sessionId={session.id}
                  sessionTitle={session.title}
                  initialStart={session.startsAt.toISOString()}
                  durationMin={durationMin}
                  onReschedule={rescheduleSession}
                  trigger={
                    <Button variant="secondary">
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
                    <Button variant="ghost">
                      <TriangleAlert className="h-4 w-4" />
                      Cancelar aula
                    </Button>
                  }
                />
              </>
            ) : null}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            {/* Detalhes */}
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <Avatar
                  name={session.teacher.name}
                  src={session.teacher.avatarUrl}
                  size="lg"
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-default">{session.teacher.name}</p>
                  <p className="text-xs text-muted">Professor particular</p>
                </div>
              </div>

              {session.teacher.bio ? (
                <p className="text-sm leading-relaxed text-muted">{session.teacher.bio}</p>
              ) : null}

              <SessionDetailBody session={payload} />

              {isPast ? (
                <div className="rounded-xl border border-accent-200 bg-accent-50 p-4 dark:border-accent-500/30 dark:bg-accent-500/10">
                  <p className="flex items-center gap-2 text-sm font-bold text-accent-800 dark:text-accent-200">
                    <CirclePlay className="h-4 w-4" />
                    Resumo da aula
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-accent-900/80 dark:text-accent-100/80">
                    {session.description ??
                      "A sessão foi realizada conforme o agendamento. A gravação está disponível acima para revisão."}
                  </p>
                  <p className="mt-3 text-xs font-medium text-accent-700 dark:text-accent-300/80">
                    Duração total: {formatDuration(durationMin * 60)} · Professor:{" "}
                    {session.teacher.name}
                  </p>
                </div>
              ) : null}
            </div>

            {/* Timeline */}
            <div>
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-subtle">
                Histórico da sessão
              </h2>
              <ol className="relative space-y-4 border-l border-subtle pl-6">
                {timeline.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.title} className="relative">
                      <span
                        className={cn(
                          "absolute -left-[30px] flex h-6 w-6 items-center justify-center rounded-full border",
                          item.done
                            ? "border-brand-200 bg-brand-50 text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-300"
                            : "border-default bg-sunken text-subtle",
                        )}
                      >
                        <Icon className="h-3 w-3" />
                      </span>
                      <p className="text-sm font-semibold text-default">{item.title}</p>
                      <p className="text-xs text-muted">{item.description}</p>
                    </li>
                  );
                })}
              </ol>

              <div className="mt-6 rounded-xl border border-subtle bg-sunken p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
                  Criada por
                </p>
                <p className="mt-1 text-sm font-semibold text-default">
                  {session.createdBy.name}
                </p>
                <p className="mt-2 text-xs text-muted">
                  {session.course
                    ? `Vinculada ao curso ${session.course.title}.`
                    : "Aula particular avulsa, sem curso vinculado."}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!session.meetingUrl && !isPast ? (
        <EmptyState
          icon={Video}
          title="Link da aula ainda não liberado"
          description="O professor habilita o acesso à sala pouco antes do horário marcado. O código da reunião já está disponível acima."
        />
      ) : null}
    </div>
  );
}
