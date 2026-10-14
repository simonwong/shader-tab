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
import { DITHERING_ORB, getEffect, THEME_BRIGHTNESS } from '../presets';
import { MAX_RENDER_PIXELS } from './surface';
import { loseContext } from './webgl';
import type { DriverFactory } from './types';
export const createDriver: DriverFactory = async (host, { effect, theme, variant }) => {
  const [shape = 'swirl', pattern = '8x8'] = variant.split(':');
  const grain = effect === 'grain-gradient';
  // Paper's Default dithering preset: finer pixels, a smaller sphere, own colours.
  const orb = !grain && variant === 'sphere:4x4';
  const preset = getEffect(effect);
  /* Both shaders output a blend of these colours, so dimming them dims the output. */
  const brightness = THEME_BRIGHTNESS[theme];
  const color = (value: string) => {
    const [r, g, b, a] = getShaderColorFromString(value);
    return [r * brightness, g * brightness, b * brightness, a];
  };
  const sizing = {
    u_fit: 2,
    u_scale: grain ? 1.2 : orb ? 0.42 : 0.85,
    u_rotation: 0,
    u_offsetX: 0,
    u_offsetY: 0,
    u_originX: 0.5,
    u_originY: 0.5,
    u_worldWidth: 0,
    u_worldHeight: 0,
  };
  const noise = grain ? getShaderNoiseTexture() : undefined;
  if (noise) await noise.decode();
  const uniforms: ShaderMountUniforms = grain
    ? {
        ...sizing,
        u_colorBack: color(preset.base[theme]),
        u_colors: [...preset[theme].map(color), ...Array.from({ length: 4 }, () => [0, 0, 0, 0])],
        u_colorsCount: 3,
        u_softness: 0.75,
        u_intensity: 0.38,
        u_noise: 0.045,
        u_shape:
          GrainGradientShapes[shape as keyof typeof GrainGradientShapes] ??
          GrainGradientShapes.corners,
        u_noiseTexture: noise,
      }
    : {
        ...sizing,
        u_colorBack: color(orb ? DITHERING_ORB.back[theme] : preset.base[theme]),
        u_colorFront: color(orb ? DITHERING_ORB.front[theme] : preset[theme][0]),
        u_shape: DitheringShapes[shape as keyof typeof DitheringShapes] ?? DitheringShapes.swirl,
        u_type: DitheringTypes[pattern as keyof typeof DitheringTypes] ?? DitheringTypes['8x8'],
        u_pxSize: orb ? 2 : 3,
      };
  const mount = new ShaderMount(
    host,
    grain ? grainGradientFragmentShader : ditheringFragmentShader,
    uniforms,
    { antialias: false, alpha: false, powerPreference: 'low-power' },
    0,
    0,
    1,
    MAX_RENDER_PIXELS,
  );
  /* Grain gradients ignore the pointer: shifting the field slides its per-pixel
     grain, which reads as static boiling. Dithering follows it gently. */
  const parallax = grain ? 0 : 1;
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
          u_offsetX: pointer.x * 0.03,
          u_offsetY: -pointer.y * 0.03,
          u_rotation: pointer.x * 2.5,
        });
        previousX = pointer.x;
        previousY = pointer.y;
      }
      mount.setFrame(seconds * (grain ? 350 : 220));
    },
    dispose() {
      mount.dispose();
      loseContext(mount.canvasElement.getContext('webgl2'));
    },
  };
};
