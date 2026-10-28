"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  CalendarClock,
  Copy,
  FileText,
  MoreVertical,
  Undo2,
  Wallet,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toaster";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { refundPayment } from "@/app/app/pagamentos/actions";

export interface PagamentoRow {
  id: string;
  description: string;
  amountCents: number;
  status: "PENDENTE" | "PAGO" | "FALHOU" | "REEMBOLSADO";
  method: "CARTAO" | "PIX" | "BOLETO" | "ASSINATURA";
  reference: string;
  paidAt: string | null;
  dueAt: string | null;
  createdAt: string;
  courseTitle: string | null;
  student: { id: string; name: string; email: string; avatarUrl: string | null } | null;
}

const METHOD_LABEL: Record<string, string> = {
  CARTAO: "Cartão",
  PIX: "Pix",
  BOLETO: "Boleto",
  ASSINATURA: "Assinatura",
};

const STATUS_META: Record<string, { label: string; variant: "success" | "warning" | "danger" | "outline" }> = {
  PAGO: { label: "Pago", variant: "success" },
  PENDENTE: { label: "Pendente", variant: "warning" },
  FALHOU: { label: "Falhou", variant: "danger" },
  REEMBOLSADO: { label: "Reembolsado", variant: "outline" },
};

export function PagamentosView({ rows, isAdmin }: { rows: PagamentoRow[]; isAdmin: boolean }) {
  const [refundTarget, setRefundTarget] = React.useState<PagamentoRow | null>(null);
  const [refunding, setRefunding] = React.useState(false);

  const handleRefund = async () => {
    if (!refundTarget) return;
    setRefunding(true);
    const result = await refundPayment(refundTarget.id);
    setRefunding(false);
    setRefundTarget(null);
    if (result.ok) toast.success(result.message);
    else toast.error(result.error);
  };

  const copyReference = async (reference: string) => {
    try {
      await navigator.clipboard.writeText(reference);
      toast.success("Referência copiada.");
    } catch {
      toast.error("Não foi possível copiar a referência.");
    }
  };

  const pending = rows.filter((r) => r.status === "PENDENTE");

  return (
    <div className="space-y-4">
      {pending.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            {pending.length} {pending.length === 1 ? "pendência em aberto" : "pendências em aberto"}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-800/90 dark:text-amber-200/90">
            {pending.map((payment) => (
              <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{payment.description}</span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(payment.amountCents)}
                  {payment.dueAt ? ` · vence ${formatDate(payment.dueAt)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Tabela (desktop) */}
      <div className="relative hidden overflow-hidden rounded-xl border border-subtle bg-surface shadow-soft xl:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Histórico de pagamentos</caption>
          <thead>
            <tr className="border-b border-subtle bg-sunken text-left">
              {isAdmin ? (
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">
                  Aluno
                </th>
              ) : null}
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">
                Descrição
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">
                Valor
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">
                Método
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">
                Data
              </th>
              <th scope="col" className="w-16 px-4 py-3">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-subtle transition-colors last:border-0 hover:bg-sunken">
                {isAdmin ? (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={row.student?.name ?? "?"} src={row.student?.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-default">{row.student?.name}</p>
                        <p className="truncate text-xs text-muted">{row.student?.email}</p>
                      </div>
                    </div>
                  </td>
                ) : null}
                <td className="px-4 py-3">
                  <p className="font-medium text-default">{row.description}</p>
                  <p className="text-xs text-muted">
                    {row.courseTitle ? `${row.courseTitle} · ` : ""}
                    {row.reference}
                  </p>
                </td>
                <td className="px-4 py-3 font-semibold tabular-nums text-default">
                  {formatCurrency(row.amountCents)}
                </td>
                <td className="px-4 py-3 text-muted">{METHOD_LABEL[row.method]}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_META[row.status]?.variant ?? "outline"}>
                    {STATUS_META[row.status]?.label ?? row.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {row.paidAt ? formatDate(row.paidAt) : formatDate(row.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Ações do pagamento ${row.reference}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => copyReference(row.reference)}>
                        <Copy className="h-4 w-4" /> Copiar referência
                      </DropdownMenuItem>
                      {isAdmin && row.status === "PAGO" ? (
                        <DropdownMenuItem destructive onSelect={() => setRefundTarget(row)}>
                          <Undo2 className="h-4 w-4" /> Estornar
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards (mobile) */}
      <div className="space-y-3 xl:hidden">
        {rows.map((row) => (
          <div
            key={row.id}
            className={cn(
              "rounded-xl border bg-surface p-4 shadow-soft",
              row.status === "PENDENTE" ? "border-amber-300 dark:border-amber-500/40" : "border-subtle",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-default">{row.description}</p>
                <p className="truncate text-xs text-muted">
                  {row.courseTitle ? `${row.courseTitle} · ` : ""}
                  {row.reference}
                </p>
              </div>
              <Badge variant={STATUS_META[row.status]?.variant ?? "outline"}>
                {STATUS_META[row.status]?.label ?? row.status}
              </Badge>
            </div>

            {isAdmin && row.student ? (
              <p className="mt-3 flex items-center gap-2 text-xs text-muted">
                <Avatar name={row.student.name} src={row.student.avatarUrl} size="xs" />
                <span className="truncate">{row.student.name}</span>
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-subtle pt-3">
              <div>
                <p className="text-lg font-bold tabular-nums text-default">{formatCurrency(row.amountCents)}</p>
                <p className="flex items-center gap-1 text-xs text-muted">
                  <Wallet className="h-3.5 w-3.5" /> {METHOD_LABEL[row.method]}
                  {row.paidAt ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <CalendarClock className="h-3.5 w-3.5" /> {formatDate(row.paidAt)}
                    </>
                  ) : null}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Copiar referência"
                  onClick={() => copyReference(row.reference)}
                >
                  <FileText className="h-4 w-4" />
                </Button>
                {isAdmin && row.status === "PAGO" ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Estornar pagamento ${row.reference}`}
                    onClick={() => setRefundTarget(row)}
                  >
                    <ArrowDownLeft className="h-4 w-4 text-cherry-500" />
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmação de estorno */}
      <Dialog open={Boolean(refundTarget)} onOpenChange={(open) => !open && setRefundTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Estornar este pagamento?</DialogTitle>
            <DialogDescription>
              O pagamento de {refundTarget ? formatCurrency(refundTarget.amountCents) : ""} (
              {refundTarget?.reference}) passará para “Reembolsado”. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRefundTarget(null)} disabled={refunding}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRefund} disabled={refunding}>
              {refunding ? "Estornando…" : "Confirmar estorno"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
