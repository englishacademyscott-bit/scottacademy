import { Suspense } from "react";
import type { Prisma, Role } from "@prisma/client";
import { Users } from "lucide-react";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { SectionHeader, StatCard, EmptyState } from "@/components/ui/primitives";
import { AdminUsuariosView } from "@/components/app/admin-usuarios-view";
import { QueryFilters } from "@/components/app/query-filters";

export const metadata = { title: "Usuários" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const admin = await requireRole(["ADMIN"]);
  const sp = await searchParams;

  const q = (first(sp.q) ?? "").trim();
  const roleFilter = first(sp.role) ?? "";
  const statusFilter = first(sp.status) ?? "";

  const where: Prisma.UserWhereInput = {
    ...(roleFilter ? { role: roleFilter as Role } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const users = await prisma.user.findMany({
    where,
    include: {
      _count: {
        select: { enrollments: true, attempts: true, payments: true, coursesAuthored: true },
      },
      subscription: { select: { id: true, status: true, plan: { select: { name: true } } } },
      enrollments: {
        select: { id: true, course: { select: { id: true, title: true } } },
        take: 3,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = users
    .map((user) => {
      const status =
        statusFilter === "assinatura"
          ? user.subscription?.status === "ATIVA"
          : statusFilter === "sem-assinatura"
            ? !user.subscription || user.subscription.status !== "ATIVA"
            : statusFilter === "matricula"
              ? user._count.enrollments > 0
              : statusFilter === "sem-matricula"
                ? user._count.enrollments === 0
                : true;
      return { user, status };
    })
    .filter((row) => row.status);

  const [totalUsers, byRole] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
  ]);

  const roleCounts = byRole.reduce<Record<string, number>>((acc, group) => {
    acc[group.role] = group._count._all;
    return acc;
  }, {});

  const list = rows.map(({ user }) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: user.role,
    bio: user.bio,
    phone: user.phone,
    createdAt: user.createdAt.toISOString(),
    isSelf: user.id === admin.id,
    counts: {
      enrollments: user._count.enrollments,
      attempts: user._count.attempts,
      payments: user._count.payments,
      courses: user._count.coursesAuthored,
    },
    subscription: user.subscription
      ? {
          status: user.subscription.status,
          planName: user.subscription.plan.name,
        }
      : null,
    courses: user.enrollments.map((e) => e.course.title),
  }));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Usuários"
        description="Gerencie os acessos da plataforma: papéis, matrículas e senhas."
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total de usuários" value={totalUsers} icon={Users} />
        <StatCard label="Alunos" value={roleCounts.ALUNO ?? 0} icon={Users} />
        <StatCard
          label="Professores + editores"
          value={(roleCounts.PROFESSOR ?? 0) + (roleCounts.EDITOR ?? 0)}
          icon={Users}
        />
        <StatCard label="Administradores" value={roleCounts.ADMIN ?? 0} icon={Users} />
      </div>

      <Suspense fallback={<div className="h-10" />}>
        <QueryFilters
          search={{ value: q, placeholder: "Buscar por nome ou e-mail" }}
          selects={[
            {
              name: "role",
              label: "Todos os papéis",
              value: roleFilter,
              options: [
                { value: "ALUNO", label: "Aluno" },
                { value: "PROFESSOR", label: "Professor" },
                { value: "EDITOR", label: "Editor de conteúdo" },
                { value: "ADMIN", label: "Administrador" },
              ],
            },
            {
              name: "status",
              label: "Todos os status",
              value: statusFilter,
              options: [
                { value: "assinatura", label: "Com assinatura ativa" },
                { value: "sem-assinatura", label: "Sem assinatura ativa" },
                { value: "matricula", label: "Com matrícula" },
                { value: "sem-matricula", label: "Sem matrícula" },
              ],
            },
          ]}
        />
      </Suspense>

      {list.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum usuário encontrado"
          description="Ajuste a busca ou os filtros para ver outros usuários da plataforma."
        />
      ) : (
        <AdminUsuariosView rows={list} />
      )}
    </div>
  );
}
