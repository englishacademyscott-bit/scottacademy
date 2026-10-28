"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, PlayCircle } from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { enrollInCourse, unenrollFromCourse } from "@/app/app/cursos/actions";

export function EnrollButton({
  courseId,
  enrolled,
  completed,
  progress,
}: {
  courseId: string;
  enrolled: boolean;
  completed: boolean;
  progress: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const handleEnroll = () => {
    startTransition(async () => {
      const result = await enrollInCourse(courseId);
      if (result.ok) {
        toast.success("Inscrição concluída", {
          description: "O curso já está disponível em Meus cursos.",
        });
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleUnenroll = () => {
    startTransition(async () => {
      const result = await unenrollFromCourse(courseId);
      if (result.ok) {
        toast.success("Inscrição cancelada");
        router.refresh();
      }
    });
  };

  if (!enrolled) {
    return (
      <Button size="lg" onClick={handleEnroll} disabled={pending} className="w-full sm:w-auto">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
        Inscrever-se
      </Button>
    );
  }

  if (completed || progress >= 100) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
          <a href="#conteudo">
            <CheckCircle2 className="h-4 w-4" />
            Concluído — rever conteúdo
          </a>
        </Button>
        <Button
          variant="ghost"
          size="lg"
          onClick={handleUnenroll}
          disabled={pending}
          className="w-full sm:w-auto"
        >
          Cancelar inscrição
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button asChild size="lg" className="w-full sm:w-auto">
        <a href="#conteudo">
          <PlayCircle className="h-4 w-4" />
          Continuar ({progress}%)
        </a>
      </Button>
      <Button
        variant="ghost"
        size="lg"
        onClick={handleUnenroll}
        disabled={pending}
        className="w-full sm:w-auto"
      >
        Cancelar inscrição
      </Button>
    </div>
  );
}
