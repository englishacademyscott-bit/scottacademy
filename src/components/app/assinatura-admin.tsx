"use client";

import * as React from "react";
import { Crown, Sparkles, TrendingUp, UserCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface AdminPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  interval: "MENSAL" | "TRIMESTRAL" | "ANUAL";
  features: string[];
  highlight: boolean;
  active: boolean;
  position: number;
}

export interface AdminSubscription {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  planName: string;
  priceCents: number;
  interval: AdminPlan["interval"];
  currentPeriodEnd: string;
  startedAt: string;
}

const INTERVAL_LABEL: Record<string, string> = {
  MENSAL: "mensal",
  TRIMESTRAL: "trimestral",
  ANUAL: "anual",
};

export function AssinaturaAdmin({
  plans,
  subscriptions,
  mrrCents,
}: {
  plans: AdminPlan[];
  subscriptions: AdminSubscription[];
  mrrCents: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
      {/* Planos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-brand-500" /> Planos comerciais
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-[color:var(--border-subtle)]">
            {plans.map((plan) => (
              <li key={plan.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-default">
                      {plan.name}
                      {plan.highlight ? (
                        <Badge variant="brand">
                          <Sparkles className="h-3.5 w-3.5" /> Destaque
                        </Badge>
                      ) : null}
                      <Badge variant={plan.active ? "success" : "outline"}>
                        {plan.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </p>
                    <p className="mt-0.5 text-sm text-muted">{plan.description}</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-default">
                    {plan.priceCents > 0 ? (
                      <>
                        {formatCurrency(plan.priceCents)}
                        <span className="text-xs font-medium text-muted">/{INTERVAL_LABEL[plan.interval]}</span>
                      </>
                    ) : (
                      <span className="text-brand-600 dark:text-brand-300">Consulte com a nossa equipe</span>
                    )}
                  </p>
                </div>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="rounded-full border border-subtle bg-sunken px-2.5 py-0.5 text-xs text-muted"
                    >
                      {feature}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Assinaturas ativas */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" /> Receita recorrente (MRR)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tracking-tight text-default tabular-nums">
              {formatCurrency(mrrCents)}
            </p>
            <p className="mt-1 text-sm text-muted">
              Soma mensal normalizada das {subscriptions.length} assinaturas ativas. Planos trimestrais
              contam 1/3 e anuais 1/12 do valor.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-brand-500" /> Assinantes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {subscriptions.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted">Nenhuma assinatura ativa no momento.</p>
            ) : (
              <ul className="divide-y divide-[color:var(--border-subtle)]">
                {subscriptions.map((subscription) => (
                  <li key={subscription.id} className="flex items-center gap-3 px-6 py-3">
                    <Avatar name={subscription.name} src={subscription.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-default">{subscription.name}</p>
                      <p className="truncate text-xs text-muted">
                        {subscription.planName} · renova em {formatDate(subscription.currentPeriodEnd)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-default">
                      {formatCurrency(subscription.priceCents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
