import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, CalendarDays, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Validar certificado",
  description: "Consulta pública de certificados emitidos pela Scott English Academy.",
};

export default async function CertificateVerificationPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalized = decodeURIComponent(code).trim().toUpperCase();
  const certificate = await prisma.certificate.findUnique({
    where: { code: normalized },
    include: {
      student: { select: { name: true } },
      course: {
        select: {
          title: true,
          subtitle: true,
          durationMin: true,
          teacher: { select: { name: true } },
        },
      },
    },
  });
  if (!certificate) notFound();

  const valid = certificate.status === "EMITIDO";
  return (
    <main className="min-h-screen bg-canvas px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl gradient-brand shadow-glow">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">
            Scott English Academy
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-default">
            Validação de certificado
          </h1>
        </header>

        <Card className="overflow-hidden">
          <div className={valid ? "h-2 bg-emerald-500" : "h-2 bg-cherry-500"} />
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              <Image
                src={`/api/certificados/${encodeURIComponent(certificate.code)}/qr`}
                alt={`QR para validar o certificado ${certificate.code}`}
                width={144}
                height={144}
                unoptimized
                className="rounded-xl border border-subtle bg-white p-2"
              />
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <Badge variant={valid ? "success" : "danger"}>
                  {valid ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {valid ? "Certificado válido" : "Certificado revogado"}
                </Badge>
                <h2 className="mt-4 text-2xl font-bold text-default">{certificate.student.name}</h2>
                <p className="mt-1 text-muted">concluiu o curso</p>
                <p className="mt-1 text-lg font-semibold text-default">{certificate.course.title}</p>
                {certificate.course.subtitle ? <p className="mt-1 text-sm text-muted">{certificate.course.subtitle}</p> : null}
              </div>
            </div>

            <dl className="grid gap-4 border-t border-subtle pt-5 sm:grid-cols-2">
              <div>
                <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-subtle">
                  <CalendarDays className="h-4 w-4" /> Emissão
                </dt>
                <dd className="mt-1 font-semibold text-default">{formatDate(certificate.issuedAt)}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-subtle">
                  <Award className="h-4 w-4" /> Professor
                </dt>
                <dd className="mt-1 font-semibold text-default">{certificate.course.teacher.name}</dd>
              </div>
            </dl>

            <div className="rounded-xl bg-sunken p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtle">Código de registro</p>
              <p className="mt-1 break-all font-mono text-sm font-bold text-default">{certificate.code}</p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button asChild variant="secondary"><Link href="/">Conhecer a Scott English Academy</Link></Button>
        </div>
      </div>
    </main>
  );
}
