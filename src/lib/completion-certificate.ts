import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

/** Emissão idempotente; certificados revogados dependem de revisão da escola. */
export async function issueCompletionCertificate(studentId: string, courseId: string) {
  const enrollment = await prisma.enrollment.findUnique({ where: { studentId_courseId: { studentId, courseId } }, select: { status: true, progress: true } });
  if (enrollment?.status !== "CONCLUIDO" || enrollment.progress < 100) return;
  const existing = await prisma.certificate.findFirst({ where: { studentId, courseId }, select: { id: true } });
  if (existing) return;
  const code = "SEA-" + createHash("sha256").update(JSON.stringify([studentId, courseId])).digest("hex").slice(0, 24).toUpperCase();
  await prisma.certificate.upsert({ where: { code }, create: { studentId, courseId, code, status: "EMITIDO" }, update: {} });
}
