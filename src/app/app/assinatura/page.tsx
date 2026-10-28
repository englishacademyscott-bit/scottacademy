import { Suspense } from "react";
import { CreditCard, Sparkles, Users, Wallet } from "lucide-react";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { SectionHeader, StatCard } from "@/components/ui/primitives";
import { AssinaturaView } from "@/components/app/assinatura-view";
import { AssinaturaAdmin } from "@/components/app/assinatura-admin";
import { QueryFilters } from "@/components/app/query-filters";

export const metadata = { title: "Assinatura" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AssinaturaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const plans = await prisma.plan.findMany({
    orderBy: { position: "asc" },
  });

  if (user.role === "ADMIN") {
    const [subscriptions, payments, activeUsers] = await Promise.all([
      prisma.subscription.findMany({
        where: { status: "ATIVA" },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          plan: { select: { id: true, name: true, priceCents: true, interval: true } },
        },
        orderBy: { currentPeriodEnd: "asc" },
      }),
      prisma.payment.findMany({
        where: { status: "PAGO" },
        select: { amountCents: true, paidAt: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where: { role: "ALUNO" } }),
    ]);

    const mrrCents = subscriptions.reduce((sum, s) => {
      const price = s.plan.priceCents;
      if (s.plan.interval === "MENSAL") return sum + price;
      if (s.plan.interval === "TRIMESTRAL") return sum + price / 3;
      return sum + price / 12;
    }, 0);

    const totalReceived = payments.reduce((sum, p) => sum + p.amountCents, 0);

    const statusFilter = first(sp.status) ?? "";

    const filtered = subscriptions.filter((s) => {
      if (!statusFilter) return true;
      if (statusFilter === "renovando") {
        return s.currentPeriodEnd.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
      }
      return true;
    });

    return (
      <div className="space-y-6">
        <SectionHeader
          title="Assinaturas"
          description="Planos comerciais, assinaturas ativas e receita recorrente da plataforma."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="MRR"
            value={`R$ ${(Math.round(mrrCents) / 100).toFixed(2).replace(".", ",")}`}
            icon={Wallet}
            hint="Receita mensal recorrente"
          />
          <StatCard
            label="Assinaturas ativas"
            value={subscriptions.length}
            icon={Users}
            hint={`${activeUsers} alunos na base`}
          />
          <StatCard
            label="Planos comercializados"
            value={plans.filter((p) => p.active).length}
            icon={CreditCard}
            hint={`${plans.length} cadastrados`}
          />
          <StatCard
            label="Total recebido"
            value={`R$ ${(totalReceived / 100).toFixed(2).replace(".", ",")}`}
            icon={Sparkles}
            hint="Pagamentos confirmados"
          />
        </div>

        <Suspense fallback={<div className="h-10" />}>
          <QueryFilters
            selects={[
              {
                name: "status",
                label: "Todas as assinaturas",
                value: statusFilter,
                options: [{ value: "renovando", label: "Renovam em até 30 dias" }],
              },
            ]}
          />
        </Suspense>

        <AssinaturaAdmin
          plans={plans.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            description: p.description,
            priceCents: p.priceCents,
            interval: p.interval,
            features: p.features,
            highlight: p.highlight,
            active: p.active,
            position: p.position,
          }))}
          subscriptions={filtered.map((s) => ({
            id: s.id,
            userId: s.user.id,
            name: s.user.name,
            email: s.user.email,
            avatarUrl: s.user.avatarUrl,
            planName: s.plan.name,
            priceCents: s.plan.priceCents,
            interval: s.plan.interval,
            currentPeriodEnd: s.currentPeriodEnd.toISOString(),
            startedAt: s.startedAt.toISOString(),
          }))}
          mrrCents={Math.round(mrrCents)}
        />
      </div>
    );
  }

  const [subscription, payments] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId: user.id },
      include: { plan: true },
    }),
    prisma.payment.findMany({
      where: { studentId: user.id },
      orderBy: { createdAt: "desc" },
      take: 24,
    }),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Assinatura e planos"
        description="Escolha o plano ideal para a sua jornada de inglês."
      />

      <AssinaturaView
        subscription={
          subscription
            ? {
                id: subscription.id,
                status: subscription.status,
                startedAt: subscription.startedAt.toISOString(),
                currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
                cancelledAt: subscription.cancelledAt?.toISOString() ?? null,
                plan: {
                  id: subscription.plan.id,
                  name: subscription.plan.name,
                  description: subscription.plan.description,
                  priceCents: subscription.plan.priceCents,
                  interval: subscription.plan.interval,
                  features: subscription.plan.features,
                },
              }
            : null
        }
        plans={plans
          .filter((p) => p.active)
          .map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            description: p.description,
            priceCents: p.priceCents,
            interval: p.interval,
            features: p.features,
            highlight: p.highlight,
            position: p.position,
          }))}
        payments={payments.map((p) => ({
          id: p.id,
          description: p.description,
          amountCents: p.amountCents,
          status: p.status,
          method: p.method,
          reference: p.reference,
          paidAt: p.paidAt?.toISOString() ?? null,
          createdAt: p.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
