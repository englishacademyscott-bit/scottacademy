"""Gera os ícones da PWA a partir do badge da Scott English Academy.

Entrada:  public/brand/crest.svg (escudo vetorial)
Saídas:   public/icons/*.png  +  public/favicon.ico  +  public/apple-icon.png
"""
import io
import math
import os
import subprocess

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND = os.path.join(ROOT, "public", "brand")
ICONS = os.path.join(ROOT, "public", "icons")
os.makedirs(ICONS, exist_ok=True)

S = 2048  # supersampling
WHITE = (248, 250, 252, 255)
NAVY_TOP = (30, 45, 82, 255)
NAVY_BOT = (9, 15, 30, 255)

GEORGIA_B = "C:/Windows/Fonts/georgiab.ttf"


def render_crest(size):
    """Renderiza crest.svg via sharp (node) para PNG em memória."""
    svg = os.path.join(BRAND, "crest.svg")
    out = os.path.join(BRAND, "_crest_tmp.png")
    subprocess.run(
        [
            "node", "-e",
            f"require('sharp')('{svg.replace(chr(92), '/')}',{{density:900}})"
            f".resize({size},{size},{{fit:'contain',background:{{r:0,g:0,b:0,alpha:0}}}})"
            f".png().toFile('{out.replace(chr(92), '/')}')"
        ],
        cwd=ROOT, check=True, capture_output=True,
    )
    img = Image.open(out).convert("RGBA")
    os.remove(out)
    return img


def nav_gradient(size):
    grad = Image.new("RGBA", (size, size))
    px = grad.load()
    for y in range(size):
        t = y / (size - 1)
        r = int(NAVY_TOP[0] + (NAVY_BOT[0] - NAVY_TOP[0]) * t)
        g = int(NAVY_TOP[1] + (NAVY_BOT[1] - NAVY_TOP[1]) * t)
        b = int(NAVY_TOP[2] + (NAVY_BOT[2] - NAVY_TOP[2]) * t)
        for x in range(size):
            px[x, y] = (r, g, b, 255)
    return grad


def arc_text(canvas, text, radius, size, top=True, spacing=0.0):
    """Desenha texto ao longo de um arco, tangente à circunferência.

    O avanço angular usa a largura de avanço da fonte (com kerning e
    side-bearings), enquanto o recorte usa apenas a tinta real — assim o
    espaçamento entre letras fica correto e o bloco fica centralizado.
    """
    font = ImageFont.truetype(GEORGIA_B, size)
    cx = cy = S // 2

    advances = [font.getlength(ch) for ch in text]
    total = sum(advances) + spacing * (len(text) - 1)
    total_angle = math.degrees(total / radius)

    angle = (90 + total_angle / 2) if top else (270 - total_angle / 2)
    step_dir = -1 if top else 1

    for ch, adv in zip(text, advances):
        if ch.strip():
            tile = Image.new("RGBA", (int(size * 3), int(size * 3)), (0, 0, 0, 0))
            ImageDraw.Draw(tile).text(
                (size, size), ch, font=font, fill=WHITE
            )
            bb = tile.getbbox()
            if bb is not None:
                ink = tile.crop(bb)

                th = math.radians(angle)
                if top:
                    rot = math.degrees(math.atan2(math.cos(th), math.sin(th)))
                else:
                    rot = math.degrees(math.atan2(-math.cos(th), -math.sin(th)))

                ink = ink.rotate(-rot, resample=Image.BICUBIC, expand=True)

                x = cx + radius * math.cos(th)
                y = cy - radius * math.sin(th)

                canvas.alpha_composite(
                    ink, (int(x - ink.width / 2), int(y - ink.height / 2))
                )

        angle += step_dir * math.degrees((adv + spacing) / radius)


def build_icon(size):
    canvas = Image.new("RGBA", (S, S), (0, 0, 0, 0))

    # círculo branco externo
    outer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(outer).ellipse((0, 0, S - 1, S - 1), fill=WHITE)
    canvas.alpha_composite(outer)

    # gradiente navy recortado em círculo
    grad = nav_gradient(S)
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).ellipse(
        (int(S * 0.028), int(S * 0.028), int(S * 0.972), int(S * 0.972)), fill=255
    )
    canvas.paste(grad, (0, 0), mask)

    # escudo
    crest = render_crest(int(S * 0.52))
    cx, cy = S // 2, int(S * 0.505)
    canvas.alpha_composite(crest, (cx - crest.width // 2, cy - crest.height // 2))

    # textos em arco
    arc_text(canvas, "SCOTT", radius=int(S * 0.385), size=int(S * 0.098), top=True)
    arc_text(
        canvas,
        "ENGLISH ACADEMY",
        radius=int(S * 0.415),
        size=int(S * 0.052),
        top=False,
        spacing=S * 0.005,
    )

    # anéis
    d = ImageDraw.Draw(canvas)
    d.ellipse(
        (int(S * 0.028), int(S * 0.028), int(S * 0.972), int(S * 0.972)),
        outline=WHITE, width=int(S * 0.014),
    )
    d.ellipse(
        (int(S * 0.068), int(S * 0.068), int(S * 0.932), int(S * 0.932)),
        outline=WHITE, width=int(S * 0.007),
    )

    return canvas.resize((size, size), Image.LANCZOS)


def build_maskable(size):
    """Versão maskable: mesmo badge, com margem de segurança de 20%."""
    base = build_icon(int(size * 0.62))
    canvas = Image.new("RGBA", (size, size), NAVY_BOT)
    canvas.alpha_composite(base, ((size - base.width) // 2, (size - base.height) // 2))
    return canvas


def build_apple(size):
    """Apple touch icon: fundo navy sólido (iOS nãoMask fora nada)."""
    base = build_icon(int(size * 0.78))
    canvas = Image.new("RGBA", (size, size), NAVY_BOT)
    canvas.alpha_composite(base, ((size - base.width) // 2, (size - base.height) // 2))
    return canvas


def main():
    icon512 = build_icon(512)
    icon512.save(os.path.join(ICONS, "icon-512.png"))
    print("icon-512.png")

    icon192 = icon512.resize((192, 192), Image.LANCZOS)
    icon192.save(os.path.join(ICONS, "icon-192.png"))
    print("icon-192.png")

    for s in (32, 48, 72, 96, 144, 384):
        icon512.resize((s, s), Image.LANCZOS).save(os.path.join(ICONS, f"icon-{s}.png"))
    print("icones extras")

    build_maskable(512).save(os.path.join(ICONS, "maskable-512.png"))
    build_maskable(192).save(os.path.join(ICONS, "maskable-192.png"))
    print("maskable")

    build_apple(180).save(os.path.join(ROOT, "public", "apple-icon.png"))
    print("apple-icon.png")

    # favicon.ico multi-resolução
    ico = Image.open(io.BytesIO()) if False else icon512
    ico.save(
        os.path.join(ROOT, "public", "favicon.ico"),
        sizes=[(16, 16), (32, 32), (48, 48)],
    )
    print("favicon.ico")

    icon512.convert("RGB").save(os.path.join(BRAND, "icon-512.jpg"), quality=92)
    print("brand/icon-512.jpg")


if __name__ == "__main__":
    main()
