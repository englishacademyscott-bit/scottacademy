"use client";

import * as React from "react";

const DEFAULT_PHONE = "5515998229592";
const DEFAULT_MESSAGE = "Olá! Gostaria de saber mais sobre a Scott English Academy.";

export interface WhatsAppLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  phone?: string;
  message?: string;
}

/**
 * Link seguro para WhatsApp compatível com Desktop, navegadores mobile,
 * WebViews (Instagram/Facebook) e PWA instalado (standalone Android/iOS).
 *
 * Evita abrir abas órfãs `target="_blank"` com `wa.me` dentro da PWA — o que
 * causava erro de protocolo (`whatsapp://`) na tela intermediária e deixava
 * uma janela em branco/tremendo ao retornar do WhatsApp para o aplicativo.
 */
export const WhatsAppLink = React.forwardRef<HTMLAnchorElement, WhatsAppLinkProps>(
  ({ phone, message = DEFAULT_MESSAGE, onClick, children, ...props }, ref) => {
    const cleanPhone = (
      phone ||
      process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ||
      DEFAULT_PHONE
    ).replace(/\D/g, "");
    const encodedText = encodeURIComponent(message);
    const webHref = `https://wa.me/${cleanPhone}?text=${encodedText}`;

    const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) return;

      event.preventDefault();
      event.currentTarget.blur();

      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const isAndroid = /Android/i.test(ua);
      const isIOS = /iPhone|iPad|iPod/i.test(ua);

      if (isAndroid) {
        if (/Firefox/i.test(ua)) {
          window.location.assign(
            `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`,
          );
          return;
        }
        const fallbackUrl = encodeURIComponent(window.location.href);
        const intentUrl = `intent://send?phone=${cleanPhone}&text=${encodedText}#Intent;scheme=whatsapp;S.browser_fallback_url=${fallbackUrl};end`;
        window.location.assign(intentUrl);
        return;
      }

      if (isIOS) {
        window.location.assign(
          `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`,
        );
        return;
      }

      window.open(webHref, "_blank", "noopener,noreferrer");
    };

    return (
      <a
        ref={ref}
        href={webHref}
        rel="noopener noreferrer"
        onClick={handleClick}
        {...props}
      >
        {children}
      </a>
    );
  },
);

WhatsAppLink.displayName = "WhatsAppLink";
