/** Permite apenas destinos internos da área autenticada. */
export function safeCallbackUrl(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/app") || value.includes("\\")) return "/app";
  try {
    const url = new URL(value, "https://academy.local");
    if (url.origin !== "https://academy.local" || (url.pathname !== "/app" && !url.pathname.startsWith("/app/"))) return "/app";
    return url.pathname + url.search + url.hash;
  } catch { return "/app"; }
}
