import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from 'react';
import { GlassPanel } from './GlassPanel';
import { createLiquidMaps, type LiquidShape } from './liquid-glass-maps';

/** Inward shift of the backdrop at the rim: a share of the corner radius, at most 16 CSS px. */
const REFRACTION = 0.75;
const MAX_REFRACTION = 16;
/** Rim depth that bends the backdrop, as a share of the corner radius. */
const BEVEL = 0.8;

interface LiquidTexture {
  width: number;
  height: number;
  refraction: number;
  displacement: string;
  light: string;
  shade: string;
}

// Chrome applies SVG reference filters in backdrop-filter; other engines fall back to the frosted glass.
const SUPPORTED =
  typeof CSS !== 'undefined' && CSS.supports('backdrop-filter', 'url(#liquid-glass)');
const textures = new Map<string, Promise<LiquidTexture>>();
let filterCount = 0;

function encode(pixels: Uint8ClampedArray<ArrayBuffer>, width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No 2D context for the liquid glass maps.');
  context.putImageData(new ImageData(pixels, width, height), 0, 0);
  return canvas.toDataURL('image/png');
}

// Chrome draws a filter image blank until it is decoded, so maps are handed out decoded.
async function decode(url: string) {
  const image = new Image();
  image.src = url;
  await image.decode();
}

function liquidTexture(shape: LiquidShape): Promise<LiquidTexture> {
  const key = `${shape.width}:${shape.height}:${shape.radius}:${shape.density}`;
  const saved = textures.get(key);
  if (saved) return saved;
  const texture = (async () => {
    const maps = createLiquidMaps(shape);
    const result = {
      width: shape.width,
      height: shape.height,
      refraction: Math.min(MAX_REFRACTION, shape.radius * REFRACTION),
      displacement: encode(maps.displacement, maps.width, maps.height),
      light: encode(maps.light, maps.width, maps.height),
      shade: encode(maps.shade, maps.width, maps.height),
    };
    await Promise.all([result.displacement, result.light, result.shade].map(decode));
    return result;
  })();
  texture.catch(() => textures.delete(key));
  if (textures.size >= 8) textures.delete(textures.keys().next().value!);
  textures.set(key, texture);
  return texture;
}

function measure(element: HTMLElement): LiquidShape | undefined {
  const width = Math.round(element.offsetWidth),
    height = Math.round(element.offsetHeight);
  if (!width || !height) return undefined;
  const radius = Math.min(
    parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0,
    height / 2,
  );
  return {
    width,
    height,
    radius,
    density: Math.min(2, Math.max(1, Math.round(devicePixelRatio * 2) / 2)),
    bevel: Math.max(4, radius * BEVEL),
  };
}

/**
 * Glass that bends the backdrop at its rim. The backdrop is blurred, then an
 * SVG displacement map shifts it inward near the outline; a specular stroke
 * and side shade sit on top. Where SVG backdrop filters are unsupported it
 * stays frosted glass.
 */
export function LiquidGlassPanel({
  className = '',
  style,
  children,
  ...props
}: ComponentPropsWithoutRef<'div'>) {
  const ref = useRef<HTMLDivElement>(null);
  const [id] = useState(() => `liquid-glass-${++filterCount}`);
  const [shape, setShape] = useState<LiquidShape>();
  const [texture, setTexture] = useState<LiquidTexture>();

  useEffect(() => {
    const element = ref.current;
    if (!SUPPORTED || !element) return;
    const update = () => {
      const next = measure(element);
      setShape(current => {
        const same =
          next &&
          current &&
          (Object.keys(next) as (keyof LiquidShape)[]).every(key => next[key] === current[key]);
        return same ? current : next;
      });
    };
    update();
    // Maps stretch with the box, so a size in motion (the source pill widening) keeps the
    // current maps and only the settled size gets new ones.
    let settle: ReturnType<typeof setTimeout> | undefined;
    const observer = new ResizeObserver(() => {
      clearTimeout(settle);
      settle = setTimeout(update, 150);
    });
    observer.observe(element);
    // Device pixel ratio changes with browser zoom and moving between displays; the query
    // only matches the ratio it was made for, so each change watches the new one.
    let ratio: MediaQueryList | undefined;
    const watchRatio = () => {
      ratio?.removeEventListener('change', onRatio);
      ratio = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
      ratio.addEventListener('change', onRatio);
    };
    const onRatio = () => {
      watchRatio();
      update();
    };
    watchRatio();
    return () => {
      clearTimeout(settle);
      observer.disconnect();
      ratio?.removeEventListener('change', onRatio);
    };
  }, []);

  useEffect(() => {
    if (!shape) return;
    let current = true;
    liquidTexture(shape).then(
      next => current && setTexture(next),
      (error: unknown) => console.warn('Could not prepare the liquid glass maps.', error),
    );
    return () => {
      current = false;
    };
  }, [shape]);

  const liquidStyle = texture && {
    '--liquid-filter': `url(#${id})`,
    '--liquid-light': `url("${texture.light}")`,
    '--liquid-shade': `url("${texture.shade}")`,
  };
  return (
    <GlassPanel
      ref={ref}
      className={`liquid-glass ${className}`}
      data-liquid={texture ? 'ready' : undefined}
      style={{ ...style, ...(liquidStyle as CSSProperties) }}
      {...props}
    >
      {children}
      {texture && (
        <svg className="liquid-glass-defs" aria-hidden="true" width="0" height="0">
          <filter
            id={id}
            x="0"
            y="0"
            width="1"
            height="1"
            filterUnits="objectBoundingBox"
            primitiveUnits="objectBoundingBox"
            colorInterpolationFilters="sRGB"
          >
            <feImage
              href={texture.displacement}
              x="0"
              y="0"
              width="1"
              height="1"
              preserveAspectRatio="none"
              result="map"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="map"
              scale={(texture.refraction * 2) / texture.width}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>
      )}
    </GlassPanel>
  );
}
