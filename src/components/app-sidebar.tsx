"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Role } from "@prisma/client";
import {
  ChevronDown,
  LogOut,
  Settings2,
  X,
  Menu,
} from "lucide-react";
import { navByRole, ROLE_LABEL } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppSidebar({
  role,
  user,
  onNavigate,
}: {
  role: Role;
  user: { name: string; email: string; image?: string | null };
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const sections = navByRole[role] ?? navByRole.ALUNO;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-5">
        <Link href="/app" className="group flex items-center gap-2.5" onClick={onNavigate}>
          <Image
            src="/icons/icon-96.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-full shadow-[0_4px_14px_-4px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover:scale-105"
          />
          <span className="flex flex-col leading-none">
            <span className="text-sm font-bold tracking-tight text-white">
              Scott English
            </span>
            <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-300">
              Academy
            </span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        active
                          ? "bg-sidebar-active text-white"
                          : "text-slate-400 hover:bg-sidebar-hover hover:text-slate-100",
                      )}
                    >
                      {active ? (
                        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-400" />
                      ) : null}
                      <item.icon
                        className={cn(
                          "h-4.5 w-4.5 shrink-0 transition-colors",
                          active
                            ? "text-brand-300"
                            : "text-slate-500 group-hover:text-slate-300",
                        )}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge ? (
                        <span className="rounded-md bg-cherry-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cherry-400">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="shrink-0 border-t border-white/5 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-sidebar-hover">
              <Avatar name={user.name} src={user.image} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-100">
                  {user.name}
                </span>
                <span className="block truncate text-[11px] text-slate-500">
                  {ROLE_LABEL[role]}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" className="w-56">
            <DropdownMenuLabel>
              <span className="block truncate text-xs font-normal normal-case text-muted">
                {user.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/app/configuracoes">
                <Settings2 /> Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              destructive
              onSelect={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function SidebarCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
      aria-label="Fechar menu"
    >
      <X className="h-5 w-5" />
    </button>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg p-2 text-muted transition-colors hover:bg-sunken hover:text-default lg:hidden"
      aria-label="Abrir menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
