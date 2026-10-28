"use client";

import * as React from "react";
import type { Role } from "@prisma/client";
import {
  BookOpen,
  Check,
  Copy,
  Eye,
  KeyRound,
  Mail,
  MoreVertical,
  Phone,
  ShieldCheck,
  UserCog,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, Select } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { formatDate } from "@/lib/utils";
import { changeUserRole, resetUserPassword } from "@/app/app/admin/actions";

export interface UsuarioRow {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
  bio: string | null;
  phone: string | null;
  createdAt: string;
  isSelf: boolean;
  counts: { enrollments: number; attempts: number; payments: number; courses: number };
  subscription: { status: string; planName: string } | null;
  courses: string[];
}

const ROLE_LABEL: Record<Role, string> = {
  ALUNO: "Aluno",
  PROFESSOR: "Professor",
  EDITOR: "Editor de conteúdo",
  ADMIN: "Administrador",
};

const ROLE_VARIANT: Record<Role, "brand" | "accent" | "pop" | "danger"> = {
  ALUNO: "brand",
  PROFESSOR: "accent",
  EDITOR: "pop",
  ADMIN: "danger",
};

export function AdminUsuariosView({ rows }: { rows: UsuarioRow[] }) {
  const [detail, setDetail] = React.useState<UsuarioRow | null>(null);
  const [roleTarget, setRoleTarget] = React.useState<UsuarioRow | null>(null);
  const [newRole, setNewRole] = React.useState<Role>("ALUNO");
  const [passwordTarget, setPasswordTarget] = React.useState<UsuarioRow | null>(null);
  const [temporaryPassword, setTemporaryPassword] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const openRoleDialog = (row: UsuarioRow) => {
    setNewRole(row.role);
    setRoleTarget(row);
  };

  const handleRoleChange = async () => {
    if (!roleTarget) return;
    setBusy(true);
    const result = await changeUserRole({ userId: roleTarget.id, role: newRole });
    setBusy(false);
    setRoleTarget(null);
    if (result.ok) toast.success(result.message);
    else toast.error(result.error);
  };

  const handleResetPassword = async () => {
    if (!passwordTarget) return;
    setBusy(true);
    const result = await resetUserPassword({ userId: passwordTarget.id });
    setBusy(false);
    setPasswordTarget(null);
    if (result.ok && result.temporaryPassword) {
      setTemporaryPassword(result.temporaryPassword);
      toast.success(result.message);
    } else if (!result.ok) {
      toast.error(result.error);
    }
  };

  const copyPassword = async () => {
    if (!temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      toast.success("Senha temporária copiada.");
    } catch {
      toast.error("Não foi possível copiar a senha.");
    }
  };

  return (
    <>
      {/* Tabela (desktop) */}
      <div className="relative hidden overflow-hidden rounded-xl border border-subtle bg-surface shadow-soft xl:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Usuários da plataforma</caption>
          <thead>
            <tr className="border-b border-subtle bg-sunken text-left">
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">
                Usuário
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">
                Papel
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">
                Atividade
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">
                Assinatura
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">
                Cadastro
              </th>
              <th scope="col" className="w-16 px-4 py-3">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-subtle transition-colors last:border-0 hover:bg-sunken">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={row.name} src={row.avatarUrl} size="sm" />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate font-medium text-default">
                        {row.name}
                        {row.isSelf ? <Badge variant="outline">você</Badge> : null}
                      </p>
                      <p className="truncate text-xs text-muted">{row.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={ROLE_VARIANT[row.role]}>{ROLE_LABEL[row.role]}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {row.counts.enrollments} matrículas · {row.counts.attempts} tentativas ·{" "}
                  {row.counts.payments} pagamentos
                </td>
                <td className="px-4 py-3">
                  {row.subscription ? (
                    <div>
                      <Badge variant={row.subscription.status === "ATIVA" ? "success" : "outline"}>
                        {row.subscription.planName}
                      </Badge>
                      <p className="mt-0.5 text-xs text-subtle">{row.subscription.status}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-subtle">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted">{formatDate(row.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Ações para ${row.name}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setDetail(row)}>
                        <Eye className="h-4 w-4" /> Ver detalhe
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={row.isSelf} onSelect={() => openRoleDialog(row)}>
                        <UserCog className="h-4 w-4" /> Alterar papel
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        destructive
                        disabled={row.isSelf}
                        onSelect={() => setPasswordTarget(row)}
                      >
                        <KeyRound className="h-4 w-4" /> Redefinir senha
                      </DropdownMenuItem>
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
          <div key={row.id} className="rounded-xl border border-subtle bg-surface p-4 shadow-soft">
            <div className="flex items-start gap-3">
              <Avatar name={row.name} src={row.avatarUrl} size="md" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate font-semibold text-default">
                  {row.name}
                  {row.isSelf ? <Badge variant="outline">você</Badge> : null}
                </p>
                <p className="truncate text-xs text-muted">{row.email}</p>
              </div>
              <Badge variant={ROLE_VARIANT[row.role]}>{ROLE_LABEL[row.role]}</Badge>
            </div>

            <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-subtle pt-3 text-center">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-subtle">Matrículas</dt>
                <dd className="text-sm font-bold text-default">{row.counts.enrollments}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-subtle">Provas</dt>
                <dd className="text-sm font-bold text-default">{row.counts.attempts}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-subtle">Pagamentos</dt>
                <dd className="text-sm font-bold text-default">{row.counts.payments}</dd>
              </div>
            </dl>

            <div className="mt-3 flex items-center justify-end gap-1">
              <Button variant="ghost" size="sm" onClick={() => setDetail(row)}>
                <Eye className="h-4 w-4" /> Detalhe
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={row.isSelf}
                onClick={() => openRoleDialog(row)}
              >
                <UserCog className="h-4 w-4" /> Papel
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={row.isSelf}
                onClick={() => setPasswordTarget(row)}
              >
                <KeyRound className="h-4 w-4" /> Senha
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Detalhe */}
      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-lg">
          {detail ? (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3 pr-8">
                  <Avatar name={detail.name} src={detail.avatarUrl} size="lg" />
                  <div className="min-w-0">
                    <DialogTitle>{detail.name}</DialogTitle>
                    <DialogDescription className="mt-1 flex flex-col gap-1">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" /> {detail.email}
                      </span>
                      {detail.phone ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" /> {detail.phone}
                        </span>
                      ) : null}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 px-6 pb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={ROLE_VARIANT[detail.role]}>{ROLE_LABEL[detail.role]}</Badge>
                  <Badge variant="outline">Desde {formatDate(detail.createdAt)}</Badge>
                  {detail.subscription ? (
                    <Badge variant={detail.subscription.status === "ATIVA" ? "success" : "outline"}>
                      Plano {detail.subscription.planName}
                    </Badge>
                  ) : null}
                </div>

                {detail.bio ? (
                  <p className="rounded-lg border border-subtle bg-sunken p-3 text-sm text-muted">{detail.bio}</p>
                ) : null}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Matrículas", value: detail.counts.enrollments },
                    { label: "Tentativas", value: detail.counts.attempts },
                    { label: "Pagamentos", value: detail.counts.payments },
                    { label: "Cursos", value: detail.counts.courses },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-lg border border-subtle p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">{stat.label}</p>
                      <p className="text-xl font-bold tabular-nums text-default">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {detail.courses.length > 0 ? (
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                      <BookOpen className="h-3.5 w-3.5" /> Cursos matriculados
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                      {detail.courses.map((course) => (
                        <li
                          key={course}
                          className="rounded-full border border-subtle bg-sunken px-2.5 py-0.5 text-xs text-muted"
                        >
                          {course}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Alterar papel */}
      <Dialog open={Boolean(roleTarget)} onOpenChange={(open) => !open && setRoleTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar papel</DialogTitle>
            <DialogDescription>
              O papel define o que {roleTarget?.name} pode acessar na plataforma.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6">
            <Field label="Novo papel">
              <Select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
                <option value="ALUNO">Aluno</option>
                <option value="PROFESSOR">Professor</option>
                <option value="EDITOR">Editor de conteúdo</option>
                <option value="ADMIN">Administrador</option>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRoleTarget(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={handleRoleChange} disabled={busy}>
              {busy ? "Salvando…" : "Salvar papel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar reset de senha */}
      <Dialog open={Boolean(passwordTarget)} onOpenChange={(open) => !open && setPasswordTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Redefinir senha?</DialogTitle>
            <DialogDescription>
              Uma senha temporária será gerada para {passwordTarget?.name}. A senha atual deixa de
              funcionar imediatamente.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6">
            <p className="flex items-start gap-2 rounded-lg border border-subtle bg-sunken p-3 text-xs text-muted">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              Compartilhe a senha temporária com o usuário por um canal seguro. Ela não poderá ser
              recuperado depois.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPasswordTarget(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={handleResetPassword} disabled={busy}>
              {busy ? "Gerando…" : "Redefinir senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Senha temporária */}
      <Dialog open={Boolean(temporaryPassword)} onOpenChange={(open) => !open && setTemporaryPassword(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Senha temporária</DialogTitle>
            <DialogDescription>
              Envie esta senha ao usuário. Ela dá acesso imediato à conta.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6">
            <div className="flex items-center gap-2 rounded-lg border border-subtle bg-sunken p-3">
              <code className="flex-1 font-mono text-sm text-default">{temporaryPassword}</code>
              <Button variant="secondary" size="icon-sm" aria-label="Copiar senha" onClick={copyPassword}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-subtle">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              O usuário pode alterá-la depois em Configurações.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setTemporaryPassword(null)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
