"use client";

import * as React from "react";

/**
 * Registra o service worker da PWA.
 * - Só em produção (evita cache atrapalhando o dev).
 * - Deixa o `updatefound` avisar quando há uma versão nova.
 */
export function ServiceWorkerRegistrar() {
  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          registration.addEventListener("updatefound", () => {
            const installing = registration.installing;
            if (!installing) return;
            installing.addEventListener("statechange", () => {
              if (installing.state === "installed" && navigator.serviceWorker.controller) {
                window.dispatchEvent(
                  new CustomEvent("sea:sw-updated", { detail: registration }),
                );
              }
            });
          });
        })
        .catch(() => {
          /* service worker indisponível — a aplicação segue funcionando */
        });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register);

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
