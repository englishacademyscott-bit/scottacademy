"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cherry-500/10 text-cherry-500">
        <AlertTriangle className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-default">
          Algo deu errado
        </h1>
        <p className="mx-auto max-w-md text-muted">
          Encontramos um erro inesperado ao carregar esta página. Tente novamente — se
          persistir, fale com a gente.
        </p>
        {error.digest ? (
          <p className="font-mono text-xs text-subtle">ID: {error.digest}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" onClick={reset}>
          <RotateCcw /> Tentar novamente
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/app">Voltar ao painel</Link>
        </Button>
      </div>
    </div>
  );
}
