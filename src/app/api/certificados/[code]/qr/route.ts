import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const normalized = code.trim().toUpperCase();
  const certificate = await prisma.certificate.findUnique({
    where: { code: normalized },
    select: { status: true },
  });
  if (!certificate || certificate.status !== "EMITIDO") {
    return new Response("Certificado não encontrado.", { status: 404 });
  }

  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const svg = await QRCode.toString(`${base}/certificados/${encodeURIComponent(normalized)}`, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#111827", light: "#FFFFFF" },
  });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
