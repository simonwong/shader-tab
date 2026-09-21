import { createGlassField } from './glass-optics';
export interface GlassTexture { displacement: string; highlight: string }
const textures = new Map<string, GlassTexture>();
export function getGlassTexture(width: number, height: number, radius: number): GlassTexture | undefined {
  const w = Math.round(width), h = Math.round(height), r = Math.min(Math.round(radius), w / 2, h / 2);
  const key = `${w}:${h}:${r}`;
  const saved = textures.get(key);
  if (saved) return saved;
  const field = createGlassField(w, h, r);
  const canvas = document.createElement('canvas');
  canvas.width = field.width; canvas.height = field.height;
  const context = canvas.getContext('2d');
  if (!context) return undefined;
  const encode = (pixels: Uint8ClampedArray<ArrayBuffer>) => {
    context.putImageData(new ImageData(pixels, field.width, field.height), 0, 0);
    return canvas.toDataURL('image/png');
  };
  const texture = { displacement: encode(field.displacement), highlight: encode(field.highlight) };
  if (textures.size >= 12) textures.delete(textures.keys().next().value!);
  textures.set(key, texture);
  return texture;
}
