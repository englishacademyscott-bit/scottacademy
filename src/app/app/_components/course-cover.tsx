"use client";

import { useState } from "react";
import Image from "next/image";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

/** Hosts liberados para otimização via `next/image`. */
const ALLOWED_IMAGE_HOSTS = new Set([
  "images.unsplash.com",
]);

export function isOptimizableImage(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return ALLOWED_IMAGE_HOSTS.has(host);
  } catch {
    return false;
  }
}

/**
 * Capa de curso. Usa `next/image` quando a URL é de um host liberado
 * (configurado em `images.remotePatterns`) e um placeholder com gradiente
 * + `bg-dots` caso contrário — nunca `<img>` puro e nunca quebra em dark mode.
 */
export function CourseCover({
  src,
  title,
  className,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px",
  priority = false,
  icon: Icon = BookOpen,
}: {
  src?: string | null;
  title: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const optimizable = isOptimizableImage(src) && failedSrc !== src;

  if (optimizable && src) {
    return (
      <div className={cn("relative overflow-hidden bg-sunken", className)}>
        <Image
          src={src}
          alt={`Capa do curso ${title}`}
          fill
          onError={() => setFailedSrc(src)}
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-gradient-brand",
        className,
      )}
      role="img"
      aria-label={`Capa do curso ${title}`}
    >
      <div className="absolute inset-0 bg-dots opacity-40" aria-hidden />
      <Icon className="relative h-10 w-10 text-white/80" aria-hidden />
    </div>
  );
}
