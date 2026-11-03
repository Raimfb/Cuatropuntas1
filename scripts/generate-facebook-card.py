#!/usr/bin/env python3
"""
scripts/generate-facebook-card.py
Constructora Cuatropuntas SpA
Generador Gráfico de Tarjetas para Facebook (Estilo Radio Bío Bío)
Spec 027
"""

import os
import sys
import json
import argparse
from PIL import Image, ImageDraw, ImageFont

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(ROOT_DIR, "public")
POSTS_JSON_PATH = os.path.join(PUBLIC_DIR, "blog", "posts.json")
OUTPUT_DIR = os.path.join(PUBLIC_DIR, "blog", "social")
LOGO_PATH = os.path.join(PUBLIC_DIR, "logo.png")

# Palabras clave por defecto para resaltar en color cyan/naranja
HIGHLIGHT_KEYWORDS = {
    "uf", "m²", "uf/m²", "metalcom", "metalcon", "sip", "albañilería", "dom", 
    "permiso", "permisos", "regularizar", "presupuesto", "contrato", "suma", 
    "alzada", "garantía", "santiago", "precio", "precios", "costo", "costos", 
    "térmica", "aislación", "oguc", "quincho", "quinchos", "segundo", "piso", 
    "remodelación", "minvu", "ds1", "ds49", "obra", "2026", "hormigón"
}

def resolve_font(size):
    """Resuelve la fuente en Windows o Linux (GitHub Actions)"""
    candidate_paths = [
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans-Bold.ttf"
    ]
    for path in candidate_paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()

def create_card(title, background_img_path, output_path, domain="cuatropuntas.com"):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    canvas_size = (1080, 1080)
    canvas = Image.new("RGBA", canvas_size, (15, 20, 28, 255))

    # 1. Cargar y ajustar imagen de fondo manteniendo proporción y centrado
    if background_img_path and os.path.exists(background_img_path):
        bg = Image.open(background_img_path).convert("RGBA")
        bg_ratio = bg.width / bg.height
        target_ratio = canvas_size[0] / canvas_size[1]
        if bg_ratio > target_ratio:
            new_height = canvas_size[1]
            new_width = int(new_height * bg_ratio)
        else:
            new_width = canvas_size[0]
            new_height = int(new_width / bg_ratio)
        bg = bg.resize((new_width, new_height), Image.Resampling.LANCZOS)
        left = (new_width - canvas_size[0]) // 2
        top = (new_height - canvas_size[1]) // 2
        bg = bg.crop((left, top, left + canvas_size[0], top + canvas_size[1]))
        canvas.paste(bg, (0, 0))

    # 2. Gradiente oscuro inferior (smooth quadratic curve)
    gradient = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    draw_grad = ImageDraw.Draw(gradient)
    grad_start = 300
    grad_end = canvas_size[1]
    for y in range(grad_start, grad_end):
        progress = (y - grad_start) / (grad_end - grad_start)
        alpha = int(250 * (progress ** 1.35))
        draw_grad.line([(0, y), (canvas_size[0], y)], fill=(12, 17, 24, alpha))
    
    canvas = Image.alpha_composite(canvas, gradient)
    draw = ImageDraw.Draw(canvas)

    # 3. Fuentes
    font_title = resolve_font(46)
    font_domain = resolve_font(34)

    # 4. Ajuste de texto (Word Wrapping)
    margin_x = 70
    max_width = canvas_size[0] - (margin_x * 2)

    clean_title = title.strip()
    if not clean_title.startswith('"') and not clean_title.startswith('¿'):
        formatted_title = f'"{clean_title}"'
    else:
        formatted_title = clean_title

    words = formatted_title.split()
    lines = []
    current_line = []
    for word in words:
        test_line = " ".join(current_line + [word])
        bbox = draw.textbbox((0, 0), test_line, font=font_title)
        if (bbox[2] - bbox[0]) <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(current_line)
            current_line = [word]
    if current_line:
        lines.append(current_line)

    # Si supera 4 líneas, reducir interlineado para mantener armonía visual
    line_height = 58 if len(lines) > 3 else 62
    total_text_height = len(lines) * line_height
    domain_area_height = 90
    start_y = canvas_size[1] - total_text_height - domain_area_height - 60

    WHITE = (255, 255, 255, 255)
    CYAN_ACCENT = (56, 189, 248, 255) # Color cyan característico estilo Bío Bío

    for i, line_words in enumerate(lines):
        y = start_y + (i * line_height)
        cur_x = margin_x
        for word in line_words:
            word_clean = word.lower().strip('":,.-¿?!()[]')
            is_highlight = word_clean in HIGHLIGHT_KEYWORDS or any(char.isdigit() for char in word_clean)
            color = CYAN_ACCENT if is_highlight else WHITE
            draw.text((cur_x, y), word, fill=color, font=font_title)
            bbox = draw.textbbox((0, 0), word + " ", font=font_title)
            cur_x += (bbox[2] - bbox[0])

    # 5. Footer con Logo Cuatropuntas y Dominio
    domain_y = canvas_size[1] - 85
    logo_size = 54
    
    if os.path.exists(LOGO_PATH):
        try:
            logo_img = Image.open(LOGO_PATH).convert("RGBA")
            logo_img = logo_img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
            canvas.paste(logo_img, (margin_x, domain_y - 8), logo_img)
        except Exception as e:
            print(f"Advertencia cargando logo: {e}", file=sys.stderr)

    text_x = margin_x + logo_size + 16
    draw.text((text_x, domain_y), domain, fill=(245, 245, 245, 255), font=font_domain)

    # 6. Guardar en JPEG alta calidad
    final = canvas.convert("RGB")
    final.save(output_path, "JPEG", quality=92, optimize=True)
    print(f"✅ Tarjeta generada con éxito: {output_path}")
    return output_path

def main():
    parser = argparse.ArgumentParser(description="Generador Gráfico de Tarjetas Facebook para Cuatropuntas")
    parser.add_argument("--slug", help="Slug del artículo en public/blog/posts.json")
    parser.add_argument("--title", help="Título directo para la tarjeta (opcional)")
    parser.add_argument("--image", help="Ruta de imagen de fondo (opcional)")
    parser.add_argument("--output", help="Ruta de salida del archivo generado (opcional)")

    args = parser.parse_args()

    slug = args.slug
    title = args.title
    image_path = args.image
    output_path = args.output

    if slug:
        if not os.path.exists(POSTS_JSON_PATH):
            print(f"Error: No se encontró {POSTS_JSON_PATH}", file=sys.stderr)
            sys.exit(1)
        
        with open(POSTS_JSON_PATH, "r", encoding="utf-8") as f:
            posts = json.load(f)
        
        post = next((p for p in posts if p.get("slug") == slug or p.get("id") == slug), None)
        if not post:
            print(f"Error: Artículo con slug '{slug}' no encontrado en posts.json", file=sys.stderr)
            sys.exit(1)

        title = title or post.get("title")
        raw_img = post.get("image", "")
        if raw_img.startswith("/"):
            raw_img = raw_img[1:]
        image_path = image_path or os.path.join(PUBLIC_DIR, raw_img)
        output_path = output_path or os.path.join(OUTPUT_DIR, f"{slug}.jpg")

    if not title or not output_path:
        print("Error: Se requiere --slug o bien --title y --output", file=sys.stderr)
        sys.exit(1)

    create_card(title, image_path, output_path)

if __name__ == "__main__":
    main()
