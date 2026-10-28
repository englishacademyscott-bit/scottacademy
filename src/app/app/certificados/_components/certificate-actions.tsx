"use client";

import * as React from "react";
import { Printer, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Impressão do certificado.
 *
 * A estratégia de isolamento: o elemento do certificado é **clonado** para um
 * container `#print-root` (criado sob demanda) antes de abrir o diálogo de
 * impressão. O CSS de impressão (injetado na rota `/app/certificados`)
 * esconde tudo com `visibility: hidden` e revela apenas `#print-root`.
 * Depois da impressão o clone é removido, sem interferir no React.
 */
export function CertificatePrintButton({ certificateId }: { certificateId: string }) {
  const [printing, setPrinting] = React.useState(false);

  const handlePrint = () => {
    const source = document.getElementById(`cert-${certificateId}`);
    if (!source) return;

    const root = document.createElement("div");
    root.id = "print-root";
    const clone = source.cloneNode(true) as HTMLElement;
    clone.removeAttribute("id");
    root.appendChild(clone);
    document.body.appendChild(root);

    setPrinting(true);

    const cleanup = () => {
      root.remove();
      setPrinting(false);
    };

    window.setTimeout(() => {
      window.print();
      window.setTimeout(cleanup, 500);
    }, 80);

    // Rede de segurança caso o diálogo feche sem o timeout rodar.
    window.addEventListener("afterprint", cleanup, { once: true });
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={handlePrint}
      disabled={printing}
    >
      <Printer className="h-4 w-4" />
      Imprimir
    </Button>
  );
}

/** QR visual (decorativo) que representa a verificação do certificado. */
export function CertificateQr({ code }: { code: string }) {
  // Hash determinístico simples apenas para gerar um padrão visual estável.
  const cells = React.useMemo(() => {
    const size = 7;
    const out: boolean[][] = [];
    let seed = 0;
    for (let i = 0; i < code.length; i++) seed = (seed * 31 + code.charCodeAt(i)) % 9973;
    for (let y = 0; y < size; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < size; x++) {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        row.push(seed % 100 > 52);
      }
      out.push(row);
    }
    return out;
  }, [code]);

  return (
    <div
      className="grid h-16 w-16 grid-cols-7 gap-px rounded-md bg-white p-1"
      role="img"
      aria-label={`Código de verificação ${code}`}
    >
      {cells.map((row, y) =>
        row.map((filled, x) => (
          <span
            key={`${x}-${y}`}
            className={filled ? "bg-ink-900" : "bg-transparent"}
            aria-hidden
          />
        )),
      )}
    </div>
  );
}

export function CertificateVerificationBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
      <ShieldCheck className="h-3.5 w-3.5" />
      Verificável
    </span>
  );
}
