"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { startAttempt } from "../../actions";

export function TentarNovamenteButton({
  examId,
  attemptsRemaining,
}: {
  examId: string;
  attemptsRemaining: number;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleClick() {
    setPending(true);
    try {
      const res = await startAttempt(examId);
      if (!res.ok) {
        toast.error("Não foi possível iniciar uma nova tentativa", {
          description: res.error,
        });
        setPending(false);
        return;
      }
      router.push(`/app/provas/${examId}/realizar`);
    } catch {
      toast.error("Não foi possível iniciar uma nova tentativa", {
        description: "Tente novamente em instantes.",
      });
      setPending(false);
    }
  }

  return (
    <Button
      variant="primary"
      size="lg"
      onClick={handleClick}
      disabled={pending || attemptsRemaining <= 0}
    >
      {pending ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <RotateCcw className="h-5 w-5" />
      )}
      {pending ? "Preparando…" : "Tentar novamente"}
    </Button>
  );
}
