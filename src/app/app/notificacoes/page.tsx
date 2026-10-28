import type { Metadata } from "next";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { safeCallbackUrl } from "@/lib/auth-redirect";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { markNotificationsRead } from "./actions";
export const metadata: Metadata = { title: "Notificações" };
export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await prisma.notification.findMany({ where: { userId: user.id, NOT: { title: { startsWith: "PREFERENCIA:" } } }, orderBy: { createdAt: "desc" }, take: 100 });
  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">Notificações</h1><p className="mt-2 text-sm text-muted">Avisos e atualizações da sua conta.</p></div>{items.some(item => !item.read) && <form action={markNotificationsRead}><Button type="submit" variant="secondary"><CheckCheck className="h-4 w-4" />Marcar como lidas</Button></form>}</div>{items.length ? <ul className="space-y-3">{items.map(item => <li key={item.id} className="surface-card p-5"><div className="flex items-start gap-3"><Bell className="mt-1 h-5 w-5 shrink-0 text-brand-500" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{item.title}</h2>{!item.read && <span className="rounded-full bg-brand-500/10 px-2 py-1 text-xs text-brand-600 dark:text-brand-300">Nova</span>}</div><p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted">{item.body}</p><p className="mt-3 text-xs text-subtle">{formatDateTime(item.createdAt)}</p>{item.href && <Link href={safeCallbackUrl(item.href)} className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300">Ver detalhes</Link>}</div></div></li>)}</ul> : <EmptyState icon={Bell} title="Tudo em dia" description="Suas novas notificações aparecerão aqui." />}</div>;
}
