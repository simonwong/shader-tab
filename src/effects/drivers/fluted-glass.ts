/*
 * Fluted Glass: the Paper Shaders fluted-glass filter over Paper's own sample
 * photo (docs/public/images/image-filters/0018.webp in paper-design/shaders,
 * Apache-2.0), with Paper's Default, Abstract and Waves presets.
 *
 * The filter has no clock, so the motion is the glass itself: the rib grid
 * (`u_shift`) slides slowly to and fro on the shared breathing clock while the
 * photo stays put. The photo is prepared once on a 2D canvas (theme tint, and
 * Abstract's blur) and uploaded as a texture a single time.
 *
 * Paper's ShaderMount only takes loaded <img> textures and owns its own frame
 * loop, so this driver runs the fragment shader itself with a minimal vertex
 * shader that computes the image UV for `fit: cover`.
 */
import {
  flutedGlassFragmentShader,
  GlassDistortionShapes,
  GlassGridShapes,
} from '@paper-design/shaders';
import photoUrl from '../../assets/fluted-glass/paper-flowers.webp?url&no-inline';
import { THEME_BRIGHTNESS, type Theme } from '../presets';
import { mountShader } from './webgl';
import type { DriverFactory } from './types';

const VERTEX = `#version 300 es
layout(location = 0) in vec2 a_position;
uniform float u_scale;
uniform vec2 u_cover;
out vec2 v_imageUV;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_imageUV = a_position * u_cover / u_scale + 0.5;
  v_imageUV.y = 1.0 - v_imageUV.y;
}
`;

interface GlassPreset {
  scale: number;
  shadows: number;
  size: number;
  angle: number;
  distortionShape: keyof typeof GlassDistortionShapes;
  highlights: number;
  shape: keyof typeof GlassGridShapes;
  distortion: number;
  blur: number;
  /** Blur baked into the photo, in photo pixels; stands in for a costly shader blur. */
  photoBlur: number;
  edges: number;
  stretch: number;
  grainMixer: number;
  grainOverlay: number;
  /** Amplitude of the rib grid's slide, in rib widths. */
  slide: number;
}

/**
 * Paper's Default, Abstract and Waves presets. Abstract's shader blur of 1
 * (up to 101 texture reads per pixel, every frame) is baked into the photo
 * once instead.
 */
const PRESETS: Record<string, GlassPreset> = {
  default: {
    scale: 1,
    shadows: 0.25,
    size: 0.5,
    angle: 0,
    distortionShape: 'prism',
    highlights: 0.1,
    shape: 'lines',
    distortion: 0.5,
    blur: 0,
    photoBlur: 0,
    edges: 0.25,
    stretch: 0,
    grainMixer: 0,
    grainOverlay: 0,
    slide: 0.5,
  },
  abstract: {
    scale: 4,
    shadows: 0,
    size: 0.7,
    angle: 30,
    distortionShape: 'flat',
    highlights: 0,
    shape: 'linesIrregular',
    distortion: 1,
    blur: 0,
    photoBlur: 12,
    edges: 0.5,
    stretch: 1,
    grainMixer: 0.1,
    grainOverlay: 0.1,
    slide: 0.5,
  },
  waves: {
    scale: 1.2,
    shadows: 0,
    size: 0.9,
    angle: 0,
    distortionShape: 'contour',
    highlights: 0,
    shape: 'wave',
    distortion: 0.5,
    blur: 0.1,
    photoBlur: 0,
    edges: 0.5,
    stretch: 1,
    grainMixer: 0,
    grainOverlay: 0.05,
    // The wave ribs bend the whole photo, so a small slide already moves most of the screen.
    slide: 0.1,
  },
};

/**
 * Multiplier over the photo per theme (with THEME_BRIGHTNESS applied on top).
 * The photo is mostly bright sky, so night dims it hard and cools it slightly.
 */
const TINT: Record<Theme, readonly [number, number, number]> = {
  day: [1, 1, 1],
  night: [0.3, 0.32, 0.38],
};
/** The photo's sky, shown where ribs near the screen edge refract past the photo. */
const SKY = [0.93, 0.96, 0.99] as const;

async function loadPhoto(): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = 'async';
  image.src = photoUrl;
  await image.decode();
  return image;
}

/** The photo with the theme tint and optional blur baked in, ready to upload. */
function preparePhoto(image: HTMLImageElement, theme: Theme, blur: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Canvas 2D is unavailable');
  if (blur) {
    // Draw slightly oversized so the blur does not pull in a dark edge.
    const margin = blur * 2;
    context.filter = `blur(${blur}px)`;
    context.drawImage(
      image,
      -margin,
      -margin,
      canvas.width + margin * 2,
      canvas.height + margin * 2,
    );
    context.filter = 'none';
  } else context.drawImage(image, 0, 0);
  const brightness = THEME_BRIGHTNESS[theme];
  const [r, g, b] = TINT[theme].map(value => Math.round(value * brightness * 255));
  context.globalCompositeOperation = 'multiply';
  context.fillStyle = `rgb(${r} ${g} ${b})`;
  context.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

export const createDriver: DriverFactory = async (host, { theme, variant }) => {
  const preset = PRESETS[variant] ?? PRESETS.default!;
  const photo = preparePhoto(await loadPhoto(), theme, preset.photoBlur);
  const photoAspect = photo.width / photo.height;
  return mountShader(host, {
    engine: 'paper-fluted-glass',
    context: 'webgl2',
    vertex: VERTEX,
    fragment: flutedGlassFragmentShader,
    attribute: 'a_position',
    setup(gl, uniform, resources) {
      resources.onDispose(() => {
        photo.width = photo.height = 1;
      });
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, resources.texture());
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, photo);

      const brightness = THEME_BRIGHTNESS[theme];
      gl.uniform1i(uniform('u_image'), 0);
      gl.uniform1f(uniform('u_scale'), preset.scale);
      gl.uniform1f(uniform('u_imageAspectRatio'), photoAspect);
      const tint = TINT[theme];
      gl.uniform4f(
        uniform('u_colorBack'),
        ...(SKY.map((value, index) => value * tint[index]! * brightness) as [
          number,
          number,
          number,
        ]),
        1,
      );
      gl.uniform4f(uniform('u_colorShadow'), 0, 0, 0, 1);
      gl.uniform4f(uniform('u_colorHighlight'), brightness, brightness, brightness, 1);
      gl.uniform1f(uniform('u_shadows'), preset.shadows);
      gl.uniform1f(uniform('u_size'), preset.size);
      gl.uniform1f(uniform('u_angle'), preset.angle);
      gl.uniform1f(uniform('u_shape'), GlassGridShapes[preset.shape]);
      gl.uniform1f(uniform('u_distortionShape'), GlassDistortionShapes[preset.distortionShape]);
      gl.uniform1f(uniform('u_distortion'), preset.distortion);
      gl.uniform1f(uniform('u_highlights'), preset.highlights);
      gl.uniform1f(uniform('u_blur'), preset.blur);
      gl.uniform1f(uniform('u_edges'), preset.edges);
      gl.uniform1f(uniform('u_stretch'), preset.stretch);
      gl.uniform1f(uniform('u_grainMixer'), preset.grainMixer);
      gl.uniform1f(uniform('u_grainOverlay'), preset.grainOverlay);
      for (const side of ['Left', 'Right', 'Top', 'Bottom'])
        gl.uniform1f(uniform(`u_margin${side}`), 0);
      const resolution = uniform('u_resolution'),
        pixelRatio = uniform('u_pixelRatio'),
        cover = uniform('u_cover'),
        shift = uniform('u_shift');

      return {
        resize({ pixelWidth, pixelHeight, width, height, density }) {
          gl.uniform2f(resolution, pixelWidth, pixelHeight);
          gl.uniform1f(pixelRatio, density);
          // Half the photo's UV range visible across the screen for `fit: cover`.
          const aspect = width / height;
          gl.uniform2f(
            cover,
            aspect > photoAspect ? 0.5 : (0.5 * aspect) / photoAspect,
            aspect > photoAspect ? (0.5 * photoAspect) / aspect : 0.5,
          );
        },
        frame(seconds) {
          gl.uniform1f(shift, preset.slide * Math.sin(seconds));
        },
      };
    },
  });
};
