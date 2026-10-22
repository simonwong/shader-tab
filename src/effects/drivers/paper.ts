import {
  ShaderMount,
  grainGradientFragmentShader,
  GrainGradientShapes,
  ditheringFragmentShader,
  DitheringShapes,
  DitheringTypes,
  getShaderColorFromString,
  getShaderNoiseTexture,
  type ShaderMountUniforms,
} from '@paper-design/shaders';
import { DITHERING_ORB, getEffect, THEME_BRIGHTNESS, type EffectId, type Theme } from '../presets';
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
        u_pxSize: orb ? 2 : 3,
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
  if (noise) await noise.decode();
  const mount = new ShaderMount(
    host,
    shader.fragmentShader,
    {
      ...SIZING,
      ...shader.uniforms({ theme, variant, color }),
      ...(noise ? { u_noiseTexture: noise } : {}),
    },
    { antialias: false, alpha: false, powerPreference: 'low-power' },
    0,
    0,
    1,
    MAX_RENDER_PIXELS,
  );
  const { parallax, rate } = shader;
  let previousX = 0,
    previousY = 0;
  return {
    canvas: mount.canvasElement,
    engine: 'paper-webgl2',
    resize(width, height, density) {
      mount.setMaxPixelCount(Math.floor(width * height * density * density));
      mount.setMinPixelRatio(density);
    },
    render(seconds, _delta, pointer) {
      if (parallax && Math.abs(pointer.x - previousX) + Math.abs(pointer.y - previousY) > 0.002) {
        // setUniforms() draws, and so does setFrame() below: write the values without
        // drawing so a moving pointer costs one draw per frame, not two.
        (mount as unknown as { setUniformValues: ShaderMount['setUniforms'] }).setUniformValues({
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
