import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const unreadCount = await prisma.notification.count({ where: { userId: user.id, read: false, NOT: { title: { startsWith: "PREFERENCIA:" } } } });

  return (
    <AppShell
      role={user.role}
      unreadCount={unreadCount}
      user={{ name: user.name ?? "", email: user.email ?? "", image: user.image }}
    >
      {children}
    </AppShell>
  );
}
