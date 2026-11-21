"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  CreditCard,
  Crown,
  Receipt,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cancelSubscription, subscribeToPlan } from "@/app/app/assinatura/actions";

export interface PlanCard {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  interval: "MENSAL" | "TRIMESTRAL" | "ANUAL";
  features: string[];
  highlight: boolean;
  position: number;
}

export interface SubscriptionCard {
  id: string;
  status: "ATIVA" | "INATIVA" | "CANCELADA";
  startedAt: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  plan: {
    id: string;
    name: string;
    description: string;
    priceCents: number;
    interval: PlanCard["interval"];
    features: string[];
  };
}

export interface PaymentRow {
  id: string;
  description: string;
  amountCents: number;
  status: "PENDENTE" | "PAGO" | "FALHOU" | "REEMBOLSADO";
  method: "CARTAO" | "PIX" | "BOLETO" | "ASSINATURA";
  reference: string;
  paidAt: string | null;
  createdAt: string;
}

const INTERVAL_LABEL: Record<string, string> = {
  MENSAL: "mensal",
  TRIMESTRAL: "trimestral",
  ANUAL: "anual",
};

const METHOD_LABEL: Record<string, string> = {
  CARTAO: "Cartão",
  PIX: "Pix",
  BOLETO: "Boleto",
  ASSINATURA: "Assinatura",
};

const STATUS_BADGE: Record<string, "success" | "warning" | "danger" | "outline"> = {
  ATIVA: "success",
  INATIVA: "outline",
  CANCELADA: "danger",
  PENDENTE: "warning",
  PAGO: "success",
  FALHOU: "danger",
  REEMBOLSADO: "outline",
};

export function AssinaturaView({
  subscription,
  plans,
  payments,
}: {
  subscription: SubscriptionCard | null;
  plans: PlanCard[];
  payments: PaymentRow[];
}) {
  const [busyPlan, setBusyPlan] = React.useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);
  const plansRef = React.useRef<HTMLDivElement>(null);

  const isActive = subscription?.status === "ATIVA";
  const currentPlanId = subscription?.plan.id;

  const handleSubscribe = async (plan: PlanCard) => {
    setBusyPlan(plan.id);
    const result = await subscribeToPlan(plan.id);
    setBusyPlan(null);
    if (result.ok) {
      toast.success(result.message);
      if (result.redirectUrl) window.location.assign(result.redirectUrl);
    } else toast.error(result.error);
  };

  const handleCancel = async () => {
    setCancelling(true);
    const result = await cancelSubscription();
    setCancelling(false);
    setCancelOpen(false);
    if (result.ok) toast.success(result.message);
    else toast.error(result.error);
  };

  const allFeatures = Array.from(new Set(plans.flatMap((p) => p.features)));

  return (
    <div className="space-y-8">
      {/* Plano atual */}
      {subscription ? (
        <Card className="overflow-hidden">
          <div className="grid gap-0 md:grid-cols-[1.4fr_1fr]">
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-default">Seu plano: {subscription.plan.name}</h2>
                <Badge variant={STATUS_BADGE[subscription.status] ?? "outline"}>
                  {subscription.status === "ATIVA"
                    ? "Ativa"
                    : subscription.status === "CANCELADA"
                      ? "Cancelada"
                      : "Inativa"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted">{subscription.plan.description}</p>

              <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-subtle">Valor</dt>
                  <dd className="mt-1 text-lg font-bold text-default">
                    {formatCurrency(subscription.plan.priceCents)}
                    <span className="text-sm font-medium text-muted">
                      /{INTERVAL_LABEL[subscription.plan.interval]}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-subtle">Renova em</dt>
                  <dd className="mt-1 text-sm font-semibold text-default">
                    {formatDate(subscription.currentPeriodEnd)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-subtle">Desde</dt>
                  <dd className="mt-1 text-sm font-semibold text-default">{formatDate(subscription.startedAt)}</dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                >
                  <RefreshCw className="h-4 w-4" /> Trocar plano
                </Button>
                {isActive ? (
                  <Button variant="ghost" onClick={() => setCancelOpen(true)}>
                    <AlertTriangle className="h-4 w-4" /> Cancelar assinatura
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="border-t border-subtle bg-sunken p-6 md:border-l md:border-t-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtle">Incluído no plano</p>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                {subscription.plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300">
              <Crown className="h-7 w-7" />
            </div>
            <div>
              <p className="text-base font-semibold text-default">Você ainda não tem uma assinatura</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted">
                Escolha um plano abaixo e comece agora mesmo a sua jornada de inglês.
              </p>
            </div>
            <Button
              onClick={() => plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              Ver planos <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Grade de planos */}
      <div ref={plansRef} className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-default">Planos de aulas ao vivo exclusivas</h2>
          <p className="text-sm text-muted">Aulas ao vivo, exclusivas por aluno e personalizadas para você conversar e praticar. Para saber mais, entre em contato com a nossa equipe — nosso diferencial faz a diferença no seu aprendizado.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlanId && isActive;
            const wppUrl = `https://wa.me/5515998229592?text=${encodeURIComponent(`Olá! Quero saber mais sobre o ${plan.name} de aulas ao vivo exclusivas e personalizadas da Scott English Academy.`)}`;
            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${
                  plan.highlight ? "border-brand-300 ring-1 ring-brand-200 dark:border-brand-500/40 dark:ring-brand-500/20" : ""
                }`}
              >
                {plan.highlight ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-brand px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Mais escolhido
                    </span>
                  </span>
                ) : null}

                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    {plan.name}
                    {isCurrent ? <Badge variant="success">Plano atual</Badge> : null}
                  </CardTitle>
                  <p className="text-sm text-muted">{plan.description}</p>
                  {plan.priceCents > 0 ? (
                    <p className="mt-3 text-3xl font-bold tracking-tight text-default">
                      {formatCurrency(plan.priceCents)}
                      <span className="text-sm font-medium text-muted">
                        /{INTERVAL_LABEL[plan.interval]}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-3 text-sm font-semibold text-brand-600 dark:text-brand-300">
                      Atendimento exclusivo · Consulte nossa equipe
                    </p>
                  )}
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-4">
                  <ul className="flex-1 space-y-2 text-sm text-muted">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    className="w-full"
                    variant={plan.highlight ? "primary" : "secondary"}
                  >
                    <a href={wppUrl} target="_blank" rel="noopener noreferrer">
                      Falar com a nossa equipe
                    </a>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Comparativo de features */}
        {plans.length > 1 ? (
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Comparativo de benefícios</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">Comparação de benefícios entre os planos</caption>
                <thead>
                  <tr className="border-b border-subtle bg-sunken text-left">
                    <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">
                      Benefício
                    </th>
                    {plans.map((plan) => (
                      <th
                        key={plan.id}
                        scope="col"
                        className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-subtle"
                      >
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allFeatures.map((feature) => (
                    <tr key={feature} className="border-b border-subtle last:border-0">
                      <th scope="row" className="px-4 py-3 text-left text-sm font-medium text-default">
                        {feature}
                      </th>
                      {plans.map((plan) => (
                        <td key={plan.id} className="px-4 py-3 text-center">
                          {plan.features.includes(feature) ? (
                            <Check className="mx-auto h-4 w-4 text-emerald-500" aria-label="Incluído" />
                          ) : (
                            <span className="text-subtle" aria-label="Não incluído">
                              —
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-500/10 p-4 text-sm text-brand-700 dark:border-brand-500/30 dark:text-brand-300">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong className="font-semibold">Assinatura segura.</strong> Você pode alterar seu plano ou gerenciar a renovação a qualquer momento diretamente nesta página.
          </p>
        </div>
      </div>

      {/* Histórico de pagamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-brand-500" /> Histórico de pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted">Nenhum pagamento registrado ainda.</p>
          ) : (
            <ul className="divide-y divide-[color:var(--border-subtle)]">
              {payments.map((payment) => (
                <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-default">{payment.description}</p>
                    <p className="text-xs text-muted">
                      {METHOD_LABEL[payment.method]} · {payment.reference} ·{" "}
                      {payment.paidAt ? formatDate(payment.paidAt) : formatDate(payment.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold tabular-nums text-default">
                      {formatCurrency(payment.amountCents)}
                    </span>
                    <Badge variant={STATUS_BADGE[payment.status] ?? "outline"}>{payment.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Confirmação de cancelamento */}
      <Dialog open={cancelOpen} onOpenChange={(open) => !open && setCancelOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar assinatura?</DialogTitle>
            <DialogDescription>
              Você perderá o acesso aos benefícios do plano {subscription?.plan.name} ao fim do período
              atual ({subscription ? formatDate(subscription.currentPeriodEnd) : ""}). Você pode assinar
              novamente quando quiser.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6">
            <p className="flex items-start gap-2 rounded-lg border border-subtle bg-sunken p-3 text-xs text-muted">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
              O cancelamento interrompe futuras renovações. Eventuais reembolsos seguem as condições da compra e a legislação aplicável.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(false)} disabled={cancelling}>
              Manter assinatura
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? "Cancelando…" : "Cancelar assinatura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
