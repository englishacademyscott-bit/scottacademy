import { Suspense } from "react";
import type { PaymentMethod, PaymentStatus } from "@prisma/client";
import { AlertCircle, CreditCard, Receipt, TrendingUp, Wallet } from "lucide-react";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { SectionHeader, StatCard, EmptyState } from "@/components/ui/primitives";
import { PagamentosView } from "@/components/app/pagamentos-view";
import { PagamentosAdminChart } from "@/components/app/pagamentos-chart";
import { QueryFilters } from "@/components/app/query-filters";

export const metadata = { title: "Pagamentos" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function startOfPeriod(period: string) {
  const now = new Date();
  if (period === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (period === "90d") return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  if (period === "12m") return new Date(now.getFullYear() - 1, now.getMonth(), 1);
  return null;
}

export default async function PagamentosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const sp = await searchParams;

  const status = first(sp.status) ?? "";
  const method = first(sp.metodo) ?? "";
  const period = first(sp.periodo) ?? "";
  const studentId = first(sp.aluno) ?? "";

  const from = startOfPeriod(period);

  const baseWhere = {
    ...(isAdmin ? {} : { studentId: user.id }),
    ...(status ? { status: status as PaymentStatus } : {}),
    ...(method ? { method: method as PaymentMethod } : {}),
    ...(from ? { createdAt: { gte: from } } : {}),
    ...(isAdmin && studentId ? { studentId } : {}),
  };

  const [payments, students] = await Promise.all([
    prisma.payment.findMany({
      where: baseWhere,
      include: {
        student: { select: { id: true, name: true, email: true, avatarUrl: true } },
        course: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    isAdmin
      ? prisma.user.findMany({
          where: { payments: { some: {} } },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const rows = payments.map((p) => ({
    id: p.id,
    description: p.description,
    amountCents: p.amountCents,
    status: p.status,
    method: p.method,
    reference: p.reference,
    paidAt: p.paidAt?.toISOString() ?? null,
    dueAt: p.dueAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    courseTitle: p.course?.title ?? null,
    student: isAdmin
      ? { id: p.student.id, name: p.student.name, email: p.student.email, avatarUrl: p.student.avatarUrl }
      : null,
  }));

  const totalPago = rows.filter((r) => r.status === "PAGO").reduce((s, r) => s + r.amountCents, 0);
  const totalPendente = rows
    .filter((r) => r.status === "PENDENTE")
    .reduce((s, r) => s + r.amountCents, 0);
  const totalGasto = rows.filter((r) => r.status !== "REEMBOLSADO" && r.status !== "FALHOU").reduce((s, r) => s + r.amountCents, 0);

  // Receita mensal (últimos 12 meses) para o gráfico.
  const chartData = await prisma.payment.findMany({
    where: { status: "PAGO", ...(isAdmin ? {} : { studentId: user.id }) },
    select: { amountCents: true, paidAt: true, createdAt: true },
  });

  const monthly = new Map<string, number>();
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthly.set(key, 0);
  }
  for (const payment of chartData) {
    const date = payment.paidAt ?? payment.createdAt;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (monthly.has(key)) monthly.set(key, (monthly.get(key) ?? 0) + payment.amountCents);
  }
  const revenueSeries = Array.from(monthly.entries()).map(([key, value]) => {
    const [year, month] = key.split("-");
    const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    });
    return { mes: label.replace(".", ""), receita: value / 100 };
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        title={isAdmin ? "Pagamentos" : "Meus pagamentos"}
        description={
          isAdmin
            ? "Acompanhe todos os pagamentos recebidos, estorne quando necessário e veja a receita por mês."
            : "Seu histórico de pagamentos, cobranças pendentes e comprovantes."
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isAdmin ? (
          <StatCard
            label="Total recebido"
            value={`R$ ${(totalPago / 100).toFixed(2).replace(".", ",")}`}
            icon={TrendingUp}
            hint="Pagamentos com status PAGO"
          />
        ) : (
          <StatCard
            label="Total gasto"
            value={`R$ ${(totalGasto / 100).toFixed(2).replace(".", ",")}`}
            icon={Wallet}
            hint="Pagamentos efetivados"
          />
        )}
        <StatCard
          label="Pendências"
          value={`R$ ${(totalPendente / 100).toFixed(2).replace(".", ",")}`}
          icon={AlertCircle}
          hint={`${rows.filter((r) => r.status === "PENDENTE").length} em aberto`}
        />
        <StatCard label="Pagamentos" value={rows.length} icon={Receipt} />
        <StatCard
          label="Ticket médio"
          value={
            rows.length
              ? `R$ ${((totalPago / Math.max(1, rows.filter((r) => r.status === "PAGO").length)) / 100)
                  .toFixed(2)
                  .replace(".", ",")}`
              : "—"
          }
          icon={CreditCard}
        />
      </div>

      <Suspense fallback={<div className="h-10" />}>
        <QueryFilters
          selects={[
            ...(isAdmin
              ? [
                  {
                    name: "aluno",
                    label: "Todos os alunos",
                    value: studentId,
                    options: students.map((s) => ({ value: s.id, label: s.name })),
                  },
                ]
              : []),
            {
              name: "status",
              label: "Todos os status",
              value: status,
              options: [
                { value: "PAGO", label: "Pago" },
                { value: "PENDENTE", label: "Pendente" },
                { value: "FALHOU", label: "Falhou" },
                { value: "REEMBOLSADO", label: "Reembolsado" },
              ],
            },
            {
              name: "metodo",
              label: "Todos os métodos",
              value: method,
              options: [
                { value: "CARTAO", label: "Cartão" },
                { value: "PIX", label: "Pix" },
                { value: "BOLETO", label: "Boleto" },
                { value: "ASSINATURA", label: "Assinatura" },
              ],
            },
            {
              name: "periodo",
              label: "Todo o período",
              value: period,
              options: [
                { value: "30d", label: "Últimos 30 dias" },
                { value: "90d", label: "Últimos 90 dias" },
                { value: "12m", label: "Últimos 12 meses" },
              ],
            },
          ]}
        />
      </Suspense>

      {isAdmin ? <PagamentosAdminChart series={revenueSeries} /> : null}

      {rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nenhum pagamento encontrado"
          description="Não há pagamentos para os filtros selecionados."
        />
      ) : (
        <PagamentosView rows={rows} isAdmin={isAdmin} />
      )}
    </div>
  );
}
