"use client";

import * as React from "react";

/**
 * Registra o service worker da PWA e estabiliza o retorno ao app após abrir
 * aplicativos externos (como o WhatsApp) no celular / PWA standalone.
 */
export function ServiceWorkerRegistrar() {
  React.useEffect(() => {
    const stabilizeOnResume = () => {
      if (document.visibilityState && document.visibilityState !== "visible") {
        return;
      }
      const active = document.activeElement;
      if (active instanceof HTMLAnchorElement || active instanceof HTMLButtonElement) {
        active.blur();
      }
    };

    const onPageShow = (event: PageTransitionEvent) => {
      stabilizeOnResume();
      // Se o navegador restaurou a página do bfcache sem conteúdo visível, força repintura limpa
      if (event.persisted) {
        document.body.style.overflow = "";
      }
    };

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", stabilizeOnResume);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
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

      return () => {
        window.removeEventListener("load", register);
        window.removeEventListener("pageshow", onPageShow);
        document.removeEventListener("visibilitychange", stabilizeOnResume);
      };
    }

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", stabilizeOnResume);
    };
  }, []);

  return null;
}
