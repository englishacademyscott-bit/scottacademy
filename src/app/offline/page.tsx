import Link from "next/link";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Sem conexão",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
        <WifiOff className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-default">
          Você está offline
        </h1>
        <p className="mx-auto max-w-md text-muted">
          Não foi possível carregar esta página. As aulas que você já abriu continuam
          disponíveis — reconecte para continuar estudando.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/app">
            <RefreshCw /> Tentar novamente
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/">Ir para o início</Link>
        </Button>
      </div>
    </div>
  );
}
