"use client";

import { useEffect, useState } from "react";
import { toast as sonnerToast, Toaster as SonnerToaster } from "sonner";
import { useTheme } from "@/components/theme-provider";

export function Toaster() {
  const { resolved } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <>
      {mounted ? (
        <SonnerToaster
          theme={resolved}
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "rounded-xl border border-subtle bg-raised shadow-lifted text-default font-medium",
              description: "text-muted",
              actionButton: "gradient-brand text-white rounded-lg",
            },
          }}
        />
      ) : null}
    </>
  );
}

export const toast = sonnerToast;
