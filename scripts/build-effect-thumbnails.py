from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent.parent
source = root / 'artifacts/effects'
output = root / 'src/assets/effect-thumbnails'
output.mkdir(parents=True, exist_ok=True)
ids = ['grain-gradient', 'dithering', 'pixel-blast', 'data-pixel-arc', 'crt-terminal', 'shader-gradient']
sheet = Image.new('RGB', (2160, 510), '#181a1e')
draw = ImageDraw.Draw(sheet)
for row, theme in enumerate(['day', 'night']):
    for col, effect in enumerate(ids):
        thumbnail = Image.open(source / f'{effect}-{theme}.png').convert('RGB')
        thumbnail.thumbnail((192, 120), Image.Resampling.LANCZOS)
        thumbnail.save(output / f'thumb-{effect}-{theme}.webp', quality=65, method=6)
        image = Image.open(source / f'{effect}-{theme}.png').convert('RGB')
        image.thumbnail((352, 220), Image.Resampling.LANCZOS)
        sheet.paste(image, (col * 360 + 4, row * 255 + 4))
        draw.text((col * 360 + 12, row * 255 + 232), f'{effect.upper()} / {theme}', fill='#e4e4e7')
sheet.save(root / 'artifacts/effects-overview.png')
print(f'{len(list(output.glob("*.webp")))} thumbnails, {sum(p.stat().st_size for p in output.glob("*.webp")) / 1000:.1f} KB total')
