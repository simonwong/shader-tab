import {
  ShaderMount,
  grainGradientFragmentShader,
  GrainGradientShapes,
  ditheringFragmentShader,
  DitheringShapes,
  DitheringTypes,
  dotOrbitFragmentShader,
  emptyPixel,
  getShaderColorFromString,
  godRaysFragmentShader,
  meshGradientFragmentShader,
  neuroNoiseFragmentShader,
  perlinNoiseFragmentShader,
  simplexNoiseFragmentShader,
  smokeRingFragmentShader,
  warpFragmentShader,
  waterFragmentShader,
  getShaderNoiseTexture,
  type ShaderMountUniforms,
} from '@paper-design/shaders';
import {
  DITHERING_ORB,
  getEffect,
  PAPER_PALETTES,
  THEME_BRIGHTNESS,
  type EffectId,
  type Theme,
  type VariantPalette,
} from '../presets';
import { MAX_RENDER_PIXELS } from './surface';
import { loseContext } from './webgl';
import type { DriverFactory } from './types';

export type ShaderColor = [number, number, number, number];

export interface ShaderParams {
  theme: Theme;
  /** Variant id from the registry in `effects/variants.ts`. */
  variant: string;
  /** Parses a CSS colour and dims it by the theme brightness. */
  color: (value: string) => ShaderColor;
}

export interface PaperShader {
  fragmentShader: string;
  /** The shader's own uniforms for one variant and theme; may override `SIZING`. */
  uniforms: (params: ShaderParams) => ShaderMountUniforms;
  /** Paper animation milliseconds per second of the breathing clock. */
  rate: number;
  /** Scales the pointer's offset and rotation of the field; 0 ignores the pointer. */
  parallax: number;
  /** Samples Paper's noise texture as `u_noiseTexture`. */
  noise?: boolean;
  /** Image loaded as `u_image` before the first draw. */
  image?: string;
  /**
   * CSS pixels per cell of a pixelated shader (`u_pxSize`). Each cell is
   * rounded to whole device pixels, so a fractional scale such as 125% or
   * 150% keeps an even grid.
   */
  pixelSize?: (variant: string) => number;
}

/** Cover the screen, centred. Shaders set their own `u_scale`. */
const SIZING = {
  u_fit: 2,
  u_scale: 1,
  u_rotation: 0,
  u_offsetX: 0,
  u_offsetY: 0,
  u_originX: 0.5,
  u_originY: 0.5,
  u_worldWidth: 0,
  u_worldHeight: 0,
};

const GRAIN = getEffect('grain-gradient');
const DITHERING = getEffect('dithering');

/*
 * Pattern shaders size their pattern in CSS pixels from the canvas origin
 * (Paper's own default for them). Cover fit would scale the pattern with the
 * screen and shrink it to a few pixels.
 */
const PATTERN = { u_fit: 0 };

/** A variant's palette from `PAPER_PALETTES`, with its colours parsed and dimmed. */
function paletteOf(effect: EffectId, { theme, variant, color }: ShaderParams) {
  const { back, colors }: VariantPalette = PAPER_PALETTES[effect]![variant]![theme];
  return { back: color(back), colors: colors.map(color) };
}

/** Warp's pattern per variant: stripes (marble), edge (silk) or checks. */
const WARP_SHAPES: Record<string, ShaderMountUniforms> = {
  marble: {
    u_shape: 1,
    u_shapeScale: 0.12,
    u_distortion: 0.2,
    u_swirl: 0.6,
    u_swirlIterations: 10,
  },
  silk: { u_shape: 2, u_shapeScale: 0.2, u_distortion: 0.25, u_swirl: 0.45, u_swirlIterations: 8 },
  check: { u_shape: 0, u_shapeScale: 0.1, u_distortion: 0.15, u_swirl: 0.7, u_swirlIterations: 10 },
};

/** Every effect this driver renders, one Paper shader each. */
export const PAPER_SHADERS: Partial<Record<EffectId, PaperShader>> = {
  'grain-gradient': {
    fragmentShader: grainGradientFragmentShader,
    rate: 350,
    /* Grain gradients ignore the pointer: shifting the field slides its per-pixel
       grain, which reads as static boiling. */
    parallax: 0,
    noise: true,
    uniforms: ({ theme, variant, color }) => {
      const [shape] = variant.split(':');
      return {
        u_scale: 1.2,
        u_colorBack: color(GRAIN.base[theme]),
        u_colors: [...GRAIN[theme].map(color), ...Array.from({ length: 4 }, () => [0, 0, 0, 0])],
        u_colorsCount: 3,
        u_softness: 0.75,
        u_intensity: 0.38,
        u_noise: 0.045,
        u_shape:
          GrainGradientShapes[shape as keyof typeof GrainGradientShapes] ??
          GrainGradientShapes.corners,
      };
    },
  },
  dithering: {
    fragmentShader: ditheringFragmentShader,
    rate: 220,
    parallax: 1,
    uniforms: ({ theme, variant, color }) => {
      const [shape = 'swirl', pattern = '8x8'] = variant.split(':');
      // Paper's Default dithering preset: finer pixels, a smaller sphere, own colours.
      const orb = variant === 'sphere:4x4';
      return {
        u_scale: orb ? 0.42 : 0.85,
        u_colorBack: color(orb ? DITHERING_ORB.back[theme] : DITHERING.base[theme]),
        u_colorFront: color(orb ? DITHERING_ORB.front[theme] : DITHERING[theme][0]),
        u_shape: DitheringShapes[shape as keyof typeof DitheringShapes] ?? DitheringShapes.swirl,
        u_type: DitheringTypes[pattern as keyof typeof DitheringTypes] ?? DitheringTypes['8x8'],
      };
    },
    pixelSize: variant => (variant === 'sphere:4x4' ? 2 : 3),
  },
  // Rates and shapes below were tuned on the candidate page (design/shader-candidates) to stay
  // under the motion budget: at most 2.5% of the screen changing per second at rest.
  'mesh-gradient': {
    fragmentShader: meshGradientFragmentShader,
    rate: 1500,
    parallax: 1,
    uniforms: params => {
      const { colors } = paletteOf('mesh-gradient', params);
      return {
        u_colors: colors,
        u_colorsCount: colors.length,
        u_distortion: 0.6,
        u_swirl: 0.08,
        // No grain: per-pixel grain on a drifting field shimmers.
        u_grainMixer: 0,
        u_grainOverlay: 0,
      };
    },
  },
  warp: {
    fragmentShader: warpFragmentShader,
    rate: 2500,
    parallax: 0.5,
    noise: true,
    uniforms: params => {
      const { colors } = paletteOf('warp', params);
      const shape = WARP_SHAPES[params.variant] ?? WARP_SHAPES.marble!;
      return {
        ...PATTERN,
        u_colors: colors,
        u_colorsCount: colors.length,
        u_proportion: 0.45,
        u_softness: 1,
        ...shape,
      };
    },
  },
  'simplex-noise': {
    fragmentShader: simplexNoiseFragmentShader,
    rate: 700,
    parallax: 0.3,
    uniforms: params => {
      const { colors } = paletteOf('simplex-noise', params);
      // Contour: three hard steps per colour, so the noise reads as terraced bands.
      return {
        ...PATTERN,
        u_scale: 0.5,
        u_colors: colors,
        u_colorsCount: colors.length,
        u_stepsPerColor: 3,
        u_softness: 0,
      };
    },
  },
  'perlin-noise': {
    fragmentShader: perlinNoiseFragmentShader,
    // Perlin's base frequency of 10 also applies to time, so its clock runs slow.
    rate: 500,
    parallax: 1,
    uniforms: params => {
      const { back, colors } = paletteOf('perlin-noise', params);
      return {
        ...PATTERN,
        u_scale: 12,
        u_colorBack: back,
        u_colorFront: colors[0]!,
        u_proportion: 0.45,
        u_softness: 1,
        u_octaveCount: 3,
        u_persistence: 0.6,
        u_lacunarity: 2,
      };
    },
  },
  'neuro-noise': {
    fragmentShader: neuroNoiseFragmentShader,
    rate: 900,
    parallax: 0.5,
    uniforms: params => {
      const { back, colors } = paletteOf('neuro-noise', params);
      const nebula = params.variant === 'nebula';
      return {
        ...PATTERN,
        u_scale: nebula ? 0.55 : 1,
        u_colorBack: back,
        u_colorMid: colors[0]!,
        u_colorFront: colors[1]!,
        u_brightness: nebula ? 0.02 : 0.05,
        u_contrast: nebula ? 0.15 : 0.3,
      };
    },
  },
  'dot-orbit': {
    fragmentShader: dotOrbitFragmentShader,
    rate: 1500,
    // Hundreds of small dots: shifting the grid moves every one of them at once.
    parallax: 0,
    noise: true,
    uniforms: params => {
      const { back, colors } = paletteOf('dot-orbit', params);
      return {
        ...PATTERN,
        u_colorBack: back,
        u_colors: colors,
        u_colorsCount: colors.length,
        u_stepsPerColor: 2,
        u_size: 0.4,
        u_sizeRange: 0.5,
        u_spreading: 0.3,
      };
    },
  },
  'smoke-ring': {
    fragmentShader: smokeRingFragmentShader,
    rate: 500,
    // Half the shift: the ring's ragged edge is detailed enough that a full one goes over budget at night.
    parallax: 0.5,
    noise: true,
    uniforms: params => {
      const { back, colors } = paletteOf('smoke-ring', params);
      // A wide ring framing the page, its middle left clear for the bookmarks.
      return {
        u_scale: 1.25,
        u_colorBack: back,
        u_colors: colors,
        u_colorsCount: colors.length,
        u_thickness: 0.5,
        u_radius: 0.45,
        u_innerShape: 0.6,
        u_noiseIterations: 5,
        u_noiseScale: 2.5,
      };
    },
  },
  'god-rays': {
    fragmentShader: godRaysFragmentShader,
    rate: 1500,
    // Thin bright rays from a fixed light: any shift or turn sweeps them across the page.
    parallax: 0,
    noise: true,
    uniforms: params => {
      const { back, colors } = paletteOf('god-rays', params);
      const [bloom, ...rays] = colors;
      // The light source sits above the top edge, so no glow lands behind the bookmarks.
      return {
        u_offsetY: 0.9,
        u_colorBack: back,
        u_colorBloom: bloom!,
        u_colors: rays,
        u_colorsCount: rays.length,
        u_bloom: 0.4,
        u_intensity: 0.55,
        u_density: 0.25,
        u_spotty: 0.25,
        u_midSize: 0.2,
        u_midIntensity: 0.25,
      };
    },
  },
  water: {
    fragmentShader: waterFragmentShader,
    rate: 150,
    parallax: 0.5,
    // Water distorts an image; an empty one leaves only the caustic light on the ground colour.
    image: emptyPixel,
    uniforms: params => {
      const { back, colors } = paletteOf('water', params);
      return {
        u_colorBack: back,
        u_colorHighlight: colors[0]!,
        u_highlights: 0.4,
        u_layering: 0.5,
        u_edges: 0,
        u_waves: 0.3,
        u_caustic: 0,
        u_size: 1,
      };
    },
  },
};

export const createDriver: DriverFactory = async (host, { effect, theme, variant }) => {
  const shader = PAPER_SHADERS[effect];
  if (!shader) throw new Error(`No Paper shader for effect ${effect}`);
  /* Every shader here outputs a blend of its colours, so dimming them dims the output. */
  const brightness = THEME_BRIGHTNESS[theme];
  const color = (value: string): ShaderColor => {
    const [r, g, b, a] = getShaderColorFromString(value);
    return [r * brightness, g * brightness, b * brightness, a];
  };
  const noise = shader.noise ? getShaderNoiseTexture() : undefined;
  const image = shader.image === undefined ? undefined : new Image();
  if (image) image.src = shader.image!;
  await Promise.all([noise?.decode(), image?.decode()]);
  const pixelSize = shader.pixelSize?.(variant);
  const mount = new ShaderMount(
    host,
    shader.fragmentShader,
    {
      ...SIZING,
      ...(pixelSize ? { u_pxSize: pixelSize } : {}),
      ...shader.uniforms({ theme, variant, color }),
      ...(noise ? { u_noiseTexture: noise } : {}),
      ...(image ? { u_image: image } : {}),
    },
    { antialias: false, alpha: false, powerPreference: 'low-power' },
    0,
    0,
    1,
    MAX_RENDER_PIXELS,
  );
  const { parallax, rate } = shader;
  const setUniformValues = (mount as unknown as { setUniformValues: ShaderMount['setUniforms'] })
    .setUniformValues;
  let previousX = 0,
    previousY = 0;
  return {
    canvas: mount.canvasElement,
    engine: 'paper-webgl2',
    resize(width, height, density) {
      if (pixelSize) {
        // Paper multiplies u_pxSize by its render scale, which equals `density` here.
        const devicePixels = Math.max(1, Math.round(pixelSize * density));
        setUniformValues({ u_pxSize: devicePixels / density });
      }
      mount.setMaxPixelCount(Math.floor(width * height * density * density));
      mount.setMinPixelRatio(density);
    },
    render(seconds, _delta, pointer) {
      if (parallax && Math.abs(pointer.x - previousX) + Math.abs(pointer.y - previousY) > 0.002) {
        // setUniforms() draws, and so does setFrame() below: write the values without
        // drawing so a moving pointer costs one draw per frame, not two.
        setUniformValues({
          u_offsetX: pointer.x * 0.03 * parallax,
          u_offsetY: -pointer.y * 0.03 * parallax,
          u_rotation: pointer.x * 2.5 * parallax,
        });
        previousX = pointer.x;
        previousY = pointer.y;
      }
      mount.setFrame(seconds * rate);
    },
    dispose() {
      mount.dispose();
      loseContext(mount.canvasElement.getContext('webgl2'));
    },
  };
};
