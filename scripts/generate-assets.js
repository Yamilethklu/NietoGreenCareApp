const { execFileSync } = require('node:child_process');
const { existsSync, mkdirSync, rmSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const assetsDirectory = path.join(projectRoot, 'assets');
const rendererPath = path.join(__dirname, '.render-nieto-assets.py');

if (!existsSync(assetsDirectory)) {
  mkdirSync(assetsDirectory, { recursive: true });
}

// Pillow is available in the local Python installation. This avoids adding an
// npm dependency solely to produce static build assets. The mark is bounded by
// x/y 212–812 on the 1024 px canvas, leaving a 20.7% Android safe-zone margin.
const pillowRenderer = String.raw`from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math
import sys

ASSETS = Path(sys.argv[1])
SIZE, SCALE = 1024, 3
S, C = SIZE * SCALE, SIZE * SCALE // 2
FOREST, LEAF, WHITE = '#1B4332', '#52B788', '#FFFFFF'

def font(name, size):
    return ImageFont.truetype('C:/Windows/Fonts/' + name, size * SCALE)

def point(angle, radius):
    radians = math.radians(angle)
    return (C + int(math.cos(radians) * radius * SCALE), C + int(math.sin(radians) * radius * SCALE))

def arc_text(image, text, radius, center_angle, font_value, fill, tracking=0):
    draw = ImageDraw.Draw(image)
    widths = [draw.textlength(character, font=font_value) / SCALE + tracking for character in text]
    total = sum(widths)
    cursor = -total / 2
    for character, width in zip(text, widths):
        angle = center_angle + math.degrees((cursor + width / 2) / radius)
        glyph_box = draw.textbbox((0, 0), character, font=font_value)
        glyph = Image.new('RGBA', (glyph_box[2] - glyph_box[0] + 20 * SCALE, glyph_box[3] - glyph_box[1] + 20 * SCALE), (0, 0, 0, 0))
        ImageDraw.Draw(glyph).text((10 * SCALE - glyph_box[0], 10 * SCALE - glyph_box[1]), character, font=font_value, fill=fill)
        glyph = glyph.rotate(angle + 90, resample=Image.Resampling.BICUBIC, expand=True)
        x, y = point(angle, radius)
        image.alpha_composite(glyph, (x - glyph.width // 2, y - glyph.height // 2))
        cursor += width

def create_logo(opaque_background):
    image = Image.new('RGBA', (S, S), WHITE if opaque_background else (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    outer_radius, inner_radius = 300 * SCALE, 230 * SCALE
    draw.ellipse((C - outer_radius, C - outer_radius, C + outer_radius, C + outer_radius), fill=WHITE, outline=FOREST, width=12 * SCALE)
    draw.ellipse((C - inner_radius, C - inner_radius, C + inner_radius, C + inner_radius), outline=FOREST, width=5 * SCALE)

    arc_text(image, 'NIETO GREEN CARE LLC', 260, -90, font('arialbd.ttf', 28), FOREST, 2)
    arc_text(image, 'LAWN CARE | LANDSCAPING | MAINTENANCE', 258, 90, font('arialbd.ttf', 11), FOREST, 0.6)

    def xy(x, y): return (int((212 + x) * SCALE), int((212 + y) * SCALE))
    draw.polygon([xy(208, 407), xy(208, 201), xy(266, 201), xy(330, 309), xy(330, 201), xy(385, 201), xy(385, 407), xy(327, 407), xy(263, 299), xy(263, 407)], fill=FOREST)
    draw.polygon([xy(298, 225), xy(318, 187), xy(360, 158), xy(420, 150), xy(407, 197), xy(370, 230), xy(326, 244)], fill=LEAF)
    draw.line([xy(298, 226), xy(387, 167)], fill=FOREST, width=7 * SCALE)
    draw.line([xy(221, 424), xy(379, 424)], fill=LEAF, width=8 * SCALE)
    draw.ellipse((xy(194, 417), xy(208, 431)), fill=LEAF)
    draw.ellipse((xy(392, 417), xy(406, 431)), fill=LEAF)
    return image.resize((SIZE, SIZE), Image.Resampling.LANCZOS)

assets = {
    'icon.png': create_logo(True),
    'adaptive-icon.png': create_logo(False),
    'splash-icon.png': create_logo(False),
}

for name, image in assets.items():
    destination = ASSETS / name
    image.save(destination, 'PNG', optimize=True)
    alpha = image.getchannel('A')
    bbox = alpha.getbbox()
    if name != 'icon.png' and (bbox is None or bbox[0] < 200 or bbox[1] < 200 or bbox[2] > 824 or bbox[3] > 824):
        raise RuntimeError(f'{name} unexpectedly exceeds its safe-zone bounds: {bbox}')
    print(f'{name}: {image.size}, alpha bounds={bbox}')
`;

writeFileSync(rendererPath, pillowRenderer, 'utf8');

try {
  execFileSync('python', [rendererPath, assetsDirectory], {
    cwd: projectRoot,
    stdio: 'inherit',
  });
} finally {
  rmSync(rendererPath, { force: true });
}

console.log('Generated icon.png, adaptive-icon.png, and splash-icon.png with a 20.7% safety margin.');