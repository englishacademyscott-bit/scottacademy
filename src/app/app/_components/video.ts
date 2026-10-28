/**
 * Normaliza URLs de vídeo para o formato de embed do player.
 *
 * O banco de dados guarda `Lesson.videoUrl` em formatos variados:
 *  - https://www.youtube.com/embed/VIDEO_ID   (já é embed)
 *  - https://www.youtube.com/watch?v=VIDEO_ID  (URL normal)
 *  - https://youtu.be/VIDEO_ID                (URL curta)
 *  - https://vimeo.com/123456                 (outro provider)
 *
 * Retorna `null` quando não há URL utilizável, para o player exibir
 * um estado elegante em vez de um iframe quebrado.
 */
export interface EmbedInfo {
  src: string;
  provider: "youtube" | "vimeo" | "outro";
  title: string;
}

const YOUTUBE_ID = /^[a-zA-Z0-9_-]{11}$/;

function extractYouTubeId(raw: string): string | null {
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.slice(1);
      return YOUTUBE_ID.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v");
        return id && YOUTUBE_ID.test(id) ? id : null;
      }
      if (url.pathname.startsWith("/embed/")) {
        const id = url.pathname.slice("/embed/".length).split("/")[0];
        return YOUTUBE_ID.test(id) ? id : null;
      }
      if (url.pathname.startsWith("/shorts/")) {
        const id = url.pathname.slice("/shorts/".length).split("/")[0];
        return YOUTUBE_ID.test(id) ? id : null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Converte uma URL de vídeo em uma URL de embed segura.
 * Retorna `null` se a URL não for interpretável.
 */
export function toEmbedUrl(raw: string | null | undefined): EmbedInfo | null {
  if (!raw || !raw.trim()) return null;
  const value = raw.trim();

  const youtubeId = extractYouTubeId(value);
  if (youtubeId) {
    return {
      src: `https://www.youtube.com/embed/${youtubeId}`,
      provider: "youtube",
      title: "Player de vídeo",
    };
  }

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = url.pathname.split("/").filter(Boolean).pop() ?? "";
      return {
        src: `https://player.vimeo.com/video/${id}`,
        provider: "vimeo",
        title: "Player de vídeo",
      };
    }

    // Player genérico: só allowlists de embeddings conhecidos.
    const ALLOWED = [
      "google.com",
      "www.google.com",
      "youtube-nocookie.com",
      "www.youtube-nocookie.com",
      "loom.com",
      "www.loom.com",
      "player.vimeo.com",
      "w.soundcloud.com",
      "player.twitch.tv",
      "iframe.mediadelivery.net",
    ];
    if (ALLOWED.includes(host)) {
      return { src: value, provider: "outro", title: "Player de vídeo" };
    }
  } catch {
    return null;
  }

  return null;
}

/** Título curto exibido no card da aula. */
export function videoLabel(raw: string | null | undefined): string {
  const info = toEmbedUrl(raw);
  if (!info) return "Vídeo";
  if (info.provider === "youtube") return "YouTube";
  if (info.provider === "vimeo") return "Vimeo";
  return "Player externo";
}
