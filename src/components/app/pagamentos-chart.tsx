"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export interface RevenuePoint {
  mes: string;
  receita: number;
}

/**
 * Gráfico simples de receita por mês (recharts).
 * As cores vêm dos tokens do design system (--chart-*).
 */
export function PagamentosAdminChart({ series }: { series: RevenuePoint[] }) {
  const hasData = series.some((point) => point.receita > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receita por mês</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="h-64 w-full" role="img" aria-label="Gráfico de receita mensal">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 11, fill: "var(--fg-subtle)" }}
                  axisLine={{ stroke: "var(--border-subtle)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--fg-subtle)" }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={(value: number) => `R$ ${value.toFixed(0)}`}
                />
                <Tooltip
                  cursor={{ fill: "var(--bg-sunken)" }}
                  formatter={(value) => [formatCurrency(Math.round(Number(value) * 100)), "Receita"]}
                  contentStyle={{
                    backgroundColor: "var(--bg-raised)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 12,
                    color: "var(--fg-default)",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--fg-muted)" }}
                />
                <Bar dataKey="receita" radius={[6, 6, 0, 0]} maxBarSize={44}>
                  {series.map((point, index) => (
                    <Cell
                      key={point.mes + index}
                      fill={point.receita > 0 ? "var(--chart-1)" : "var(--border-subtle)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-muted">
            Ainda não há pagamentos confirmados para exibir no gráfico.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
