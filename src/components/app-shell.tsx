"use client";

import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import type { Role } from "@prisma/client";

export function AppShell({
  role,
  user,
  children,
  unreadCount = 0,
}: {
  role: Role;
  user: { name: string; email: string; image?: string | null };
  children: React.ReactNode;
  unreadCount?: number;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-dvh bg-canvas">
      {/* Desktop sidebar */}
      <aside className="hidden w-[264px] shrink-0 border-r border-white/5 lg:block">
        <div className="sticky top-0 h-dvh">
          <AppSidebar role={role} user={user} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-overlay backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[min(84vw,300px)] shadow-lifted animate-slide-in-right">
            <AppSidebar
              role={role}
              user={user}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      ) : null}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar user={user} unreadCount={unreadCount} onOpenMenu={() => setMobileOpen(true)} />
        <main className="app-main flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
