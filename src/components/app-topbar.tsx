"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { MobileMenuButton } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";

const TITLES: Record<string, string> = {
  "/app": "Visão geral",
  "/app/cursos": "Cursos",
  "/app/aulas": "Aulas",
  "/app/agenda": "Agenda ao vivo",
  "/app/particulares": "Aulas particulares",
  "/app/provas": "Provas",
  "/app/progresso": "Meu progresso",
  "/app/certificados": "Certificados",
  "/app/assinatura": "Assinatura",
  "/app/pagamentos": "Pagamentos",
  "/app/alunos": "Alunos",
  "/app/biblioteca": "Biblioteca",
  "/app/correcoes": "Correções",
  "/app/configuracoes": "Configurações",
  "/app/suporte": "Suporte",
  "/app/notificacoes": "Notificações",
};

function resolveTitle(pathname: string) {
  if (TITLES[pathname]) return TITLES[pathname];
  for (const [path, title] of Object.entries(TITLES)) {
    if (path !== "/app" && pathname.startsWith(path)) return title;
  }
  if (pathname.startsWith("/app/admin")) return "Administração";
  return "Painel";
}

export function AppTopbar({
  user,
  onOpenMenu,
  unreadCount = 0,
}: {
  user: { name: string; email: string; image?: string | null };
  onOpenMenu: () => void;
  unreadCount?: number;
}) {
  const pathname = usePathname();
  const { resolved, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-subtle bg-canvas/80 px-3 backdrop-blur-xl sm:gap-3 sm:px-6 safe-top">
      <MobileMenuButton onClick={onOpenMenu} />

      <h1 className="min-w-0 truncate text-base font-bold tracking-tight text-default lg:text-lg">
        {resolveTitle(pathname)}
      </h1>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <form action="/app/cursos" method="get" role="search" className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <Input
            name="q"
            type="search"
            placeholder="Buscar cursos..."
            className="h-9 w-44 pl-9 lg:w-64"
            aria-label="Buscar cursos"
          />
        </form>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggle}
          aria-label="Alternar tema"
          className="icon-only text-muted"
        >
          {resolved === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          asChild
          className="icon-only relative text-muted"
        >
          <Link href="/app/notificacoes" aria-label={unreadCount ? "Notificações: " + unreadCount + " não lidas" : "Notificações"}><Bell className="h-4 w-4" />
          {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-cherry-500 ring-2 ring-canvas" />}</Link>
        </Button>

        <Link href="/app/configuracoes" aria-label="Configurações da conta"><Avatar name={user.name} src={user.image} size="sm" className="ml-0.5 sm:ml-1" /></Link>
      </div>
    </header>
  );
}
