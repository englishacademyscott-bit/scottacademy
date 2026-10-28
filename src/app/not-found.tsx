import Link from "next/link";
import { Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas px-6 text-center">
      <div className="relative">
        <div className="absolute inset-0 -z-10 blur-3xl">
          <div className="mx-auto h-40 w-40 rounded-full bg-brand-500/25" />
        </div>
        <p className="gradient-text text-7xl font-black tracking-tight sm:text-8xl">
          404
        </p>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-default">
          Essa página não existe
        </h1>
        <p className="mx-auto max-w-md text-muted">
          O link pode estar quebrado ou o conteúdo foi movido. Volte para o painel e
          continue de onde parou.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/app">
            <Home /> Ir para o painel
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/app/cursos">
            <Search /> Explorar cursos
          </Link>
        </Button>
      </div>
    </div>
  );
}
