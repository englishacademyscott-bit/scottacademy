"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Menu,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { WhatsAppLink } from "@/components/whatsapp-link";

const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/#cursos", label: "Cursos" },
  { href: "/#aulas", label: "Aulas ao vivo" },
  { href: "/#planos", label: "Planos" },
  { href: "/sobre", label: "Sobre" },
  { href: "/#faq", label: "FAQ" },
];

export function MarketingHeader({
  isAuthenticated = false,
}: {
  isAuthenticated?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const { resolved, toggle } = useTheme();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-subtle bg-canvas/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-lg focus-visible:outline-none"
          aria-label="Scott English Academy — página inicial"
        >
          <Image
            src="/icons/icon-96.png"
            alt=""
            width={38}
            height={38}
            className="h-9.5 w-9.5 shrink-0 rounded-full shadow-soft transition-transform duration-300 group-hover:scale-105"
          />
          <span className="flex flex-col leading-none">
            <span className="text-sm font-bold tracking-tight text-default">
              Scott English Academy
            </span>
            <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
              English Academy
            </span>
          </span>
        </Link>

        <nav
          className="ml-4 hidden items-center gap-1 lg:flex"
          aria-label="Navegação principal"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors duration-200 hover:bg-sunken hover:text-default"
            >
              {link.label}
            </a>
          ))}
          <WhatsAppLink
            message="Olá! Gostaria de saber mais sobre a Scott English Academy."
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors duration-200 hover:bg-sunken hover:text-default"
          >
            Fale conosco
          </WhatsAppLink>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label={
              resolved === "dark" ? "Ativar tema claro" : "Ativar tema escuro"
            }
            className="hidden sm:inline-flex"
          >
            {resolved === "dark" ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>

          {isAuthenticated ? (
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/app">
                Abrir plataforma
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          ) : (
            <Button asChild variant="secondary" size="sm" className="hidden sm:inline-flex">
              <Link href="/login">Entrar</Link>
            </Button>
          )}

          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/cadastro">
              Começar agora
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
          >
            {open ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Menu className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      {open ? (
        <div
          id="menu-mobile"
          className="border-t border-subtle bg-canvas px-4 pb-5 pt-3 shadow-lifted lg:hidden"
        >
          <nav
            className="flex flex-col gap-1"
            aria-label="Navegação móvel"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors duration-200 hover:bg-sunken hover:text-default"
              >
                {link.label}
              </a>
            ))}
            <WhatsAppLink
              message="Olá! Gostaria de saber mais sobre a Scott English Academy."
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors duration-200 hover:bg-sunken hover:text-default"
            >
              Fale conosco
            </WhatsAppLink>
          </nav>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {isAuthenticated ? (
              <Button asChild size="md" className="col-span-2">
                <Link href="/app">
                  Abrir plataforma
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="secondary" size="md">
                  <Link href="/login">Entrar</Link>
                </Button>
                <Button asChild size="md">
                  <Link href="/cadastro">Começar</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
