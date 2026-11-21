import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const startedAt = Date.now();
  try {
    const [, plansCount, usersCount] = await Promise.all([
      prisma.$queryRaw`SELECT 1`,
      prisma.plan.count(),
      prisma.user.count(),
    ]);
    return NextResponse.json(
      {
        status: "ok",
        database: "up",
        keepAlive: true,
        plansCount,
        usersCount,
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        database: "down",
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      },
    );
  }
}
