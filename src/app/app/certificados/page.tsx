import Link from "next/link";
import {
  Award,
  CheckCircle2,
  GraduationCap,
  Medal,
  Sparkles,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";
import {
  CertificatePrintButton,
  CertificateQr,
  CertificateVerificationBadge,
} from "./_components/certificate-actions";

export const dynamic = "force-dynamic";

/**
 * Estilos de impressão injetados nesta rota (o `globals.css` é compartilhado
 * e não pode ser alterado por este agente).
 *
 * A regra isola o certificado: todo o resto da aplicação fica invisível
 * durante o `print`, e apenas o certificado é reposicionado no topo da página.
 */
const PRINT_STYLES = `
@media print {
  @page { size: A4 landscape; margin: 12mm; }
  html, body { background: #ffffff !important; }
  body * { visibility: hidden !important; }
  #print-root, #print-root * { visibility: visible !important; }
  #print-root {
    position: absolute !important;
    inset: 0 auto auto 0 !important;
    width: 100% !important;
    margin: 0 !important;
  }
  #print-root .print-hide { display: none !important; }
}
`;

export default async function CertificatesPage() {
  const user = await requireUser();

  const certificates = await prisma.certificate.findMany({
    where: { studentId: user.id },
    orderBy: { issuedAt: "desc" },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          subtitle: true,
          teacher: { select: { name: true } },
        },
      },
    },
  });

  const active = certificates.filter((c) => c.status === "EMITIDO");
  const revoked = certificates.filter((c) => c.status === "REVOGADO");

  return (
    <div className="space-y-6 animate-fade-up">
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />

      <header className="print-hide space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Award className="h-4 w-4" />
          <span>Conquistas</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-default sm:text-3xl">
          Certificados
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          {active.length > 0
            ? `Você tem ${active.length} ${active.length === 1 ? "certificado emitido" : "certificados emitidos"}. Cada um pode ser impresso ou salvo em PDF.`
            : "Conclua 100% das aulas de um curso para receber seu certificado."}
        </p>
      </header>

      {certificates.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Nenhum certificado ainda"
          description="Conclua todos os módulos e aulas de um curso para desbloquear seu certificado de conclusão da Scott English Academy."
          action={
            <Button asChild size="sm">
              <Link href="/app/cursos">
                <Sparkles className="h-4 w-4" />
                Escolher um curso
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {active.length > 0 ? (
            <section aria-labelledby="certificados-ativos" className="print-hide space-y-4">
              <h2 id="certificados-ativos" className="text-xl font-bold tracking-tight text-default">
                Emitidos
              </h2>
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {active.map((certificate) => (
                  <CertificateCard
                    key={certificate.id}
                    id={certificate.id}
                    code={certificate.code}
                    studentName={user.name ?? "Aluno"}
                    courseTitle={certificate.course.title}
                    courseSubtitle={certificate.course.subtitle}
                    teacherName={certificate.course.teacher.name}
                    issuedAt={certificate.issuedAt}
                    courseSlug={certificate.course.slug}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {revoked.length > 0 ? (
            <section aria-labelledby="certificados-revogados" className="print-hide space-y-4">
              <h2 id="certificados-revogados" className="text-xl font-bold tracking-tight text-default">
                Revogados
              </h2>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {revoked.map((certificate) => (
                  <li key={certificate.id}>
                    <Card className="opacity-70">
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cherry-500/10 text-cherry-600 dark:text-cherry-400">
                          <Award className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-default">
                            {certificate.course.title}
                          </p>
                          <p className="text-xs text-muted">
                            Emitido em {formatDate(certificate.issuedAt)} · {certificate.code}
                          </p>
                        </div>
                        <Badge variant="danger">Revogado</Badge>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function CertificateCard({
  id,
  code,
  studentName,
  courseTitle,
  courseSubtitle,
  teacherName,
  issuedAt,
  courseSlug,
}: {
  id: string;
  code: string;
  studentName: string;
  courseTitle: string;
  courseSubtitle: string | null;
  teacherName: string;
  issuedAt: Date;
  courseSlug: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 print-hide">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Medal className="h-4 w-4 text-sun-500" />
            Certificado de conclusão
          </CardTitle>
          <p className="text-sm text-muted">{courseTitle}</p>
        </div>
        <CertificateVerificationBadge />
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Documento imprimível */}
        <div
          id={`cert-${id}`}
          className="relative overflow-hidden rounded-xl border-2 border-sun-400 bg-gradient-to-br from-ink-900 via-ink-800 to-brand-900 p-6 text-center shadow-lifted sm:p-8"
        >
          <div className="pointer-events-none absolute inset-0 bg-dots opacity-20" aria-hidden />
          <div
            className="pointer-events-none absolute inset-3 rounded-lg border border-sun-400/40"
            aria-hidden
          />
          <div className="relative space-y-4">
            <div className="flex items-center justify-center gap-2">
              <span className="h-px flex-1 bg-sun-400/40" aria-hidden />
              <span className="rounded-full bg-sun-400/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-sun-300">
                Scott English Academy
              </span>
              <span className="h-px flex-1 bg-sun-400/40" aria-hidden />
            </div>

            <p className="text-xs font-medium uppercase tracking-[0.25em] text-ink-200">
              Certificado de conclusão
            </p>

            <p className="text-sm text-ink-200">Este certificado atesta que</p>

            <p className="font-display text-3xl font-bold tracking-tight text-sun-300 sm:text-4xl">
              {studentName}
            </p>

            <p className="mx-auto max-w-md text-sm leading-relaxed text-ink-200">
              concluiu com sucesso o curso de inglês{" "}
              <span className="font-semibold text-white">{courseTitle}</span>
              {courseSubtitle ? ` — ${courseSubtitle}` : ""}, demonstrando
              comprometimento com a fluência e a prática da língua.
            </p>

            <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-3 sm:items-end">
              <div className="text-left sm:text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-300">
                  Emissão
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {formatDate(issuedAt)}
                </p>
              </div>
              <div className="flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-sun-400 bg-sun-400/15">
                  <Medal className="h-7 w-7 text-sun-300" />
                </div>
              </div>
              <div className="text-right sm:text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-300">
                  Professor
                </p>
                <p className="mt-1 text-sm font-semibold text-white">{teacherName}</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 border-t border-sun-400/25 pt-4 sm:flex-row sm:justify-between sm:text-left">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-300">
                  Código de verificação
                </p>
                <p className="font-mono text-xs font-semibold text-sun-200">{code}</p>
              </div>
              <div>
                <CertificateQr code={code} />
              </div>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="print-hide flex flex-wrap items-center gap-2">
          <CertificatePrintButton certificateId={id} />
          <Button asChild variant="ghost" size="sm">
            <Link href={`/app/cursos/${courseSlug}`}>Ver o curso</Link>
          </Button>
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Autenticado pela plataforma
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
