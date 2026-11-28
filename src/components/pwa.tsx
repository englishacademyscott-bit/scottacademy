"use client";

import * as React from "react";
import Image from "next/image";
import { Download, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "sea:pwa-dismissed";

export function InstallPrompt() {
  const [event, setEvent] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      if (!sessionStorage.getItem(DISMISS_KEY)) setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setEvent(null);
      toast.success("App instalado!", {
        description: "Agora você acessa a academia direto da tela inicial.",
      });
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!event) return;
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") setVisible(false);
    setEvent(null);
  };

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  if (!visible || !event) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm rounded-xl border border-subtle bg-raised p-4 shadow-lifted sm:inset-x-auto sm:right-6 sm:bottom-6">
      <div className="flex items-start gap-3">
        <Image
          src="/icons/icon-96.png"
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-default">
            Instalar o Scott English
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Abra a academia direto da tela inicial.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fechar"
          className="rounded-lg p-1 text-subtle transition-colors hover:bg-sunken hover:text-default"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <Button size="sm" className="flex-1" onClick={install}>
          <Download /> Instalar
        </Button>
        <Button size="sm" variant="ghost" onClick={dismiss}>
          Agora não
        </Button>
      </div>
    </div>
  );
}

export function UpdateBanner() {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const onUpdated = () => setShow(true);
    window.addEventListener("sea:sw-updated", onUpdated);
    return () => window.removeEventListener("sea:sw-updated", onUpdated);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3">
      <div className="flex items-center gap-3 rounded-full border border-subtle bg-raised px-4 py-2 shadow-lifted">
        <RefreshCw className="h-4 w-4 shrink-0 text-brand-500" />
        <span className="text-sm font-medium text-default">
          Nova versão disponível
        </span>
        <Button size="sm" onClick={() => window.location.reload()}>
          Atualizar
        </Button>
        <button
          type="button"
          onClick={() => setShow(false)}
          aria-label="Dispensar aviso"
          className="rounded-full p-1 text-subtle transition-colors hover:bg-sunken hover:text-default"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
