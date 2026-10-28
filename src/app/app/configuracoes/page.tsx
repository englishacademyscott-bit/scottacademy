import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { SectionHeader } from "@/components/ui/primitives";
import { ConfiguracoesForm } from "@/components/app/configuracoes-form";

export const metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

const NEWSLETTER_TITLE = "PREFERENCIA: receber novidades";

export default async function ConfiguracoesPage() {
  const session = await requireUser();

  const [user, preference] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        phone: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.notification.findFirst({
      where: { userId: session.id, title: NEWSLETTER_TITLE },
      select: { id: true, body: true },
    }),
  ]);

  if (!user) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Configurações" />
        <p className="text-sm text-muted">Não foi possível carregar os seus dados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Configurações"
        description="Gerencie os seus dados, a sua senha e as preferências da plataforma."
      />
      <ConfiguracoesForm
        profile={{
          name: user.name,
          email: user.email,
          bio: user.bio ?? "",
          phone: user.phone ?? "",
          avatarUrl: user.avatarUrl ?? "",
        }}
        newsletter={preference?.body === "ATIVO"}
      />
    </div>
  );
}
