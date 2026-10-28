"use client";

import * as React from "react";
import { registerLessonView } from "@/app/app/aulas/actions";

/**
 * Registra a visita à aula assim que o player é montado.
 * Roda no cliente (useEffect) para não haver escrita durante o render
 * do Server Component.
 */
export function LessonViewTracker({ lessonId }: { lessonId: string }) {
  React.useEffect(() => {
    void registerLessonView(lessonId);
  }, [lessonId]);

  return null;
}
