import { ShaderMount, grainGradientFragmentShader, GrainGradientShapes, ditheringFragmentShader, DitheringShapes, DitheringTypes, getShaderColorFromString, getShaderNoiseTexture, type ShaderMountUniforms } from '@paper-design/shaders';
import { getEffect, THEME_BRIGHTNESS } from '../presets';
import { MAX_RENDER_PIXELS } from './surface';
import { loseContext } from './webgl';
import type { DriverFactory } from './types';
export const createDriver: DriverFactory = async (host, { effect, theme, variant }) => {
  const [shape = 'swirl', pattern = '4x4'] = variant.split(':');
  const grain = effect === 'grain-gradient';
  const preset = getEffect(effect);
  /* Both shaders output a blend of these colours, so dimming them dims the output. */
  const brightness = THEME_BRIGHTNESS[theme];
  const color = (value: string) => {
    const [r, g, b, a] = getShaderColorFromString(value);
    return [r * brightness, g * brightness, b * brightness, a];
  };
  const sizing = { u_fit: 2, u_scale: grain ? 1.2 : .85, u_rotation: 0, u_offsetX: 0, u_offsetY: 0, u_originX: .5, u_originY: .5, u_worldWidth: 0, u_worldHeight: 0 };
  const noise = grain ? getShaderNoiseTexture() : undefined;
  if (noise) await noise.decode();
  const uniforms: ShaderMountUniforms = grain ? {
    ...sizing, u_colorBack: color(preset.base[theme]),
    u_colors: [...preset[theme].map(color), ...Array.from({ length: 4 }, () => [0, 0, 0, 0])],
    u_colorsCount: 3, u_softness: .75, u_intensity: .38, u_noise: .045, u_shape: GrainGradientShapes[shape as keyof typeof GrainGradientShapes] ?? GrainGradientShapes.corners, u_noiseTexture: noise,
  } : {
    ...sizing, u_colorBack: color(preset.base[theme]), u_colorFront: color(preset[theme][0]),
    u_shape: DitheringShapes[shape as keyof typeof DitheringShapes] ?? DitheringShapes.swirl, u_type: DitheringTypes[pattern as keyof typeof DitheringTypes] ?? DitheringTypes['4x4'], u_pxSize: 3,
  };
  const mount = new ShaderMount(host, grain ? grainGradientFragmentShader : ditheringFragmentShader, uniforms, { antialias: false, alpha: false, powerPreference: 'low-power' }, 0, 0, 1, MAX_RENDER_PIXELS);
  let previousX = 0, previousY = 0;
  return {
    canvas: mount.canvasElement, engine: 'paper-webgl2',
    resize(width, height, density) { mount.setMaxPixelCount(Math.floor(width * height * density * density)); mount.setMinPixelRatio(density); },
    render(seconds, _delta, pointer) {
      if (Math.abs(pointer.x - previousX) + Math.abs(pointer.y - previousY) > .002) {
        mount.setUniforms({ u_offsetX: pointer.x * .06, u_offsetY: -pointer.y * .06, u_rotation: pointer.x * 5 });
        previousX = pointer.x; previousY = pointer.y;
      }
      mount.setFrame(seconds * (grain ? 350 : 220));
    },
    dispose() { mount.dispose(); loseContext(mount.canvasElement.getContext('webgl2')); },
  };
};
