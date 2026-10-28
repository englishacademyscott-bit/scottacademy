"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { startAttempt } from "../actions";

export function ComecarProvaButton({
  examId,
  resuming,
  disabled,
  label,
}: {
  examId: string;
  resuming?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleClick() {
    setPending(true);
    try {
      const res = await startAttempt(examId);
      if (!res.ok) {
        toast.error("Não foi possível iniciar a prova", {
          description: res.error,
        });
        setPending(false);
        return;
      }
      router.push(`/app/provas/${examId}/realizar`);
    } catch {
      toast.error("Não foi possível iniciar a prova", {
        description: "Tente novamente em instantes.",
      });
      setPending(false);
    }
  }

  return (
    <Button
      size="xl"
      variant="primary"
      className="w-full sm:w-auto sm:min-w-72"
      disabled={disabled || pending}
      onClick={handleClick}
    >
      {pending ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Play className="h-5 w-5" />
      )}
      {pending ? "Preparando a prova…" : (label ?? (resuming ? "Continuar prova" : "Começar prova"))}
    </Button>
  );
}
