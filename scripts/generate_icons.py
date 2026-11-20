"""Gera os ícones da PWA e camadas do selo animável a partir do logo oficial da Scott English Academy.

Entrada:  public/brand/profile-512.jpg (logo oficial com águia, coroa, escudo e livro)
Saídas:
  - public/brand/seal-full.png  (selo circular completo 512x512 com fundo transparente)
  - public/brand/seal-ring.png  (anel externo "SCOTT ENGLISH ACADEMY" isolado para rotação)
  - public/brand/seal-core.png  (núcleo central com águia/escudo/livro isolado)
  - public/brand/icon-512.jpg   (versão quadrada para Open Graph / perfis)
  - public/icons/*.png          (ícones PWA e maskable)
  - public/favicon.ico          (favicon multi-resolução)
  - public/apple-icon.png       (ícone iOS 180x180)
"""
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND = os.path.join(ROOT, "public", "brand")
ICONS = os.path.join(ROOT, "public", "icons")
os.makedirs(ICONS, exist_ok=True)

# Centro e raios exatos do selo em public/brand/profile-512.jpg
SRC_CX = 260.5
SRC_CY = 246.5
OUTER_R = 231.0   # Borda externa do anel branco
SPLIT_R = 110.0   # Canal azul-marinho entre o brasão central (águia) e o anel de texto ("SCOTT...")
NAVY_BG = (11, 25, 52, 255)


def extract_centered_seal(out_size=512):
    """Recorta e centraliza o selo oficial em um canvas quadrado com supersampling."""
    src_path = os.path.join(BRAND, "profile-512.jpg")
    src = Image.open(src_path).convert("RGBA")

    # Recorta uma caixa quadrada centrada em (SRC_CX, SRC_CY) de raio OUTER_R + 2px
    pad = 2.0
    r = OUTER_R + pad
    # Usa transform/EXTENT para interpolação sub-pixel precisa
    box = (SRC_CX - r, SRC_CY - r, SRC_CX + r, SRC_CY + r)
    ss = out_size * 4
    cropped = src.transform(
        (ss, ss),
        Image.Transform.EXTENT,
        box,
        resample=Image.Resampling.BICUBIC,
    )

    # Fração do raio útil dentro do canvas supersampled
    outer_frac = OUTER_R / r
    split_frac = SPLIT_R / r

    # 1. Máscara circular externa (selo completo)
    full_mask = Image.new("L", (ss, ss), 0)
    margin = int(round((1.0 - outer_frac) * ss / 2))
    ImageDraw.Draw(full_mask).ellipse(
        (margin, margin, ss - 1 - margin, ss - 1 - margin), fill=255
    )
    full_mask = full_mask.filter(ImageFilter.GaussianBlur(radius=1.5))

    seal_full = Image.new("RGBA", (ss, ss), (0, 0, 0, 0))
    seal_full.paste(cropped, (0, 0), full_mask)

    # 2. Máscara do núcleo interno (brasão da águia: 0 .. split_frac)
    core_margin = int(round((1.0 - split_frac) * ss / 2))
    core_mask = Image.new("L", (ss, ss), 0)
    ImageDraw.Draw(core_mask).ellipse(
        (core_margin, core_margin, ss - 1 - core_margin, ss - 1 - core_margin),
        fill=255,
    )
    core_mask_blur = core_mask.filter(ImageFilter.GaussianBlur(radius=1.5))

    seal_core = Image.new("RGBA", (ss, ss), (0, 0, 0, 0))
    seal_core.paste(cropped, (0, 0), core_mask_blur)

    # 3. Máscara do anel externo ("SCOTT ENGLISH ACADEMY": split_frac .. outer_frac)
    ring_mask = Image.new("L", (ss, ss), 0)
    d_ring = ImageDraw.Draw(ring_mask)
    d_ring.ellipse(
        (margin, margin, ss - 1 - margin, ss - 1 - margin), fill=255
    )
    # Deixa uma leve sobreposição de 2px no canal navy para nunca haver fresta transparente
    overlap = 3
    d_ring.ellipse(
        (
            core_margin + overlap,
            core_margin + overlap,
            ss - 1 - core_margin - overlap,
            ss - 1 - core_margin - overlap,
        ),
        fill=0,
    )
    ring_mask_blur = ring_mask.filter(ImageFilter.GaussianBlur(radius=1.2))

    seal_ring = Image.new("RGBA", (ss, ss), (0, 0, 0, 0))
    seal_ring.paste(cropped, (0, 0), ring_mask_blur)

    return (
        seal_full.resize((out_size, out_size), Image.Resampling.LANCZOS),
        seal_ring.resize((out_size, out_size), Image.Resampling.LANCZOS),
        seal_core.resize((out_size, out_size), Image.Resampling.LANCZOS),
    )


def build_maskable(seal_full, size):
    """Versão maskable: selo oficial com margem de segurança sobre fundo azul-marinho."""
    badge_size = int(round(size * 0.76))
    badge = seal_full.resize((badge_size, badge_size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), NAVY_BG)
    pos = (size - badge_size) // 2
    canvas.alpha_composite(badge, (pos, pos))
    return canvas


def build_apple(seal_full, size=180):
    """Apple touch icon: fundo azul-marinho sólido com o selo centralizado."""
    badge_size = int(round(size * 0.86))
    badge = seal_full.resize((badge_size, badge_size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), NAVY_BG)
    pos = (size - badge_size) // 2
    canvas.alpha_composite(badge, (pos, pos))
    return canvas


def main():
    seal_full, seal_ring, seal_core = extract_centered_seal(512)

    # Salva as camadas em public/brand/ para a animação da porta/cofre e uso geral
    seal_full.save(os.path.join(BRAND, "seal-full.png"))
    seal_ring.save(os.path.join(BRAND, "seal-ring.png"))
    seal_core.save(os.path.join(BRAND, "seal-core.png"))
    print("seal-full.png, seal-ring.png, seal-core.png")

    # Ícones PWA transparentes (circulares)
    seal_full.save(os.path.join(ICONS, "icon-512.png"))
    for s in (32, 48, 72, 96, 144, 192, 384):
        seal_full.resize((s, s), Image.Resampling.LANCZOS).save(
            os.path.join(ICONS, f"icon-{s}.png")
        )
    print("icons/icon-*.png")

    # Ícones maskable (Android / PWA adaptive)
    build_maskable(seal_full, 512).save(os.path.join(ICONS, "maskable-512.png"))
    build_maskable(seal_full, 192).save(os.path.join(ICONS, "maskable-192.png"))
    print("icons/maskable-*.png")

    # Apple touch icon
    build_apple(seal_full, 180).save(os.path.join(ROOT, "public", "apple-icon.png"))
    print("apple-icon.png")

    # Favicon multi-resolução
    seal_full.save(
        os.path.join(ROOT, "public", "favicon.ico"),
        sizes=[(16, 16), (32, 32), (48, 48)],
    )
    print("favicon.ico")

    # Open Graph / perfil quadrado em alta definição
    og = build_apple(seal_full, 512).convert("RGB")
    og.save(os.path.join(BRAND, "icon-512.jpg"), quality=94)
    print("brand/icon-512.jpg")


if __name__ == "__main__":
    main()
