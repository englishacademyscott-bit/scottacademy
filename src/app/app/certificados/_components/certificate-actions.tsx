"use client";

import * as React from "react";
import Image from "next/image";
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

/** QR real para a página pública de validação do certificado. */
export function CertificateQr({ code }: { code: string }) {
  return (
    <Image
      src={`/api/certificados/${encodeURIComponent(code)}/qr`}
      alt={`QR para validar o certificado ${code}`}
      width={64}
      height={64}
      unoptimized
      className="h-16 w-16 rounded-md bg-white p-1"
    />
  );
}

export function CertificateVerificationBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
      <ShieldCheck className="h-3.5 w-3.5" />
      Emitido pela plataforma
    </span>
  );
}
