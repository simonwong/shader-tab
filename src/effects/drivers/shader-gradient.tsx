import { useEffect } from 'react';
import { createRoot, extend, useThree, type RootState } from '@react-three/fiber';
import { ShaderGradient, presets } from '@shadergradient/react';
import * as THREE from 'three';
import { THEME_BRIGHTNESS } from '../presets';
import { releaseCanvas } from './surface';
import type { DriverFactory } from './types';

extend({
  Mesh: THREE.Mesh,
  PlaneGeometry: THREE.PlaneGeometry,
  IcosahedronGeometry: THREE.IcosahedronGeometry,
  AmbientLight: THREE.AmbientLight,
  Group: THREE.Group,
});

/*
 * Shader Gradient's materials still `#include` chunks that current three.js no
 * longer ships (uv2_* and encodings_fragment), so three would refuse to compile
 * them. The official Canvas setup registers them as empty strings. These names
 * do not exist in three itself, so defining them cannot change any other
 * effect's shaders; the patch is applied once, on first use of this driver.
 */
const LEGACY_CHUNKS = ['uv2_pars_vertex', 'uv2_vertex', 'uv2_pars_fragment', 'encodings_fragment'];
function registerLegacyShaderChunks() {
  const chunks = THREE.ShaderChunk as unknown as Record<string, string>;
  for (const chunk of LEGACY_CHUNKS) chunks[chunk] ??= '';
}

const PRESETS = {
  plane: presets.halo.props,
  sphere: presets.pensive.props,
  waterPlane: presets.mint.props,
};
const isPresetName = (value: string): value is keyof typeof PRESETS =>
  Object.hasOwn(PRESETS, value);

/*
 * The presets are framed for a 16:10 screen. With a fixed vertical field of view
 * a wider screen shows more at the sides, and on ultrawide screens the corners
 * run past the mesh. COVERED is the largest half-diagonal, in units of the
 * half-height, that each preset fills throughout its animation (measured from
 * 4:3 to 32:9); beyond it the view is cropped (zoomed) around the centre so the
 * corners stay covered. 16:10 and narrower screens are not cropped.
 */
const COVERED: Record<keyof typeof PRESETS, number> = { plane: 2.7, sphere: 1.95, waterPlane: 2 };

/* Multiplies whatever is in the default framebuffer by `dim` (dst *= dim). */
function createDimPass(dim: number) {
  const material = new THREE.RawShaderMaterial({
    vertexShader:
      'attribute vec3 position;\nvoid main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `precision mediump float;\nvoid main() { gl_FragColor = vec4(vec3(${dim.toFixed(4)}), 1.0); }`,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.ZeroFactor,
    blendDst: THREE.SrcColorFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return {
    render(renderer: THREE.WebGLRenderer) {
      const autoClear = renderer.autoClear;
      renderer.autoClear = false;
      renderer.setRenderTarget(null);
      renderer.render(mesh, camera);
      renderer.autoClear = autoClear;
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}

export const createDriver: DriverFactory = async (host, { theme, variant }) => {
  registerLegacyShaderChunks();
  const canvas = document.createElement('canvas');
  host.append(canvas);
  const root = createRoot(canvas);
  const shape = isPresetName(variant) ? variant : 'plane';
  const preset = PRESETS[shape];
  /* Replaces a CSS brightness() filter on the effect layer. */
  const dim = createDimPass(THEME_BRIGHTNESS[theme]);
  let state: RootState;
  // R3F's unmount defers forceContextLoss by 500ms; lose the context now so a
  // quick scene switch never holds a third live WebGL context.
  const release = () => {
    dim.dispose();
    const gl = (state as RootState | undefined)?.gl;
    if (gl && !gl.getContext().isContextLost()) gl.forceContextLoss();
    root.unmount();
    releaseCanvas(canvas);
  };
  try {
    await root.configure({
      frameloop: 'never',
      linear: true,
      flat: true,
      dpr: 1,
      camera: { fov: preset.fov },
      gl: { alpha: true, antialias: false, powerPreference: 'low-power' },
      size: {
        width: host.clientWidth || innerWidth,
        height: host.clientHeight || innerHeight,
        top: 0,
        left: 0,
      },
    });
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(
        () => reject(new Error('Shader Gradient initialization timed out')),
        10_000,
      );
      function Ready() {
        const current = useThree();
        useEffect(() => {
          state = current;
          clearTimeout(timer);
          resolve();
        }, [current]);
        return null;
      }
      root.render(
        <>
          <ShaderGradient
            {...(preset as React.ComponentProps<typeof ShaderGradient>)}
            animate="off"
            enableTransition={false}
          />
          <Ready />
        </>,
      );
    });
    let time: { value: number } | undefined;
    return {
      canvas,
      engine: 'shadergradient-official',
      resize(width, height, density) {
        state.setDpr(Math.min(density, preset.pixelDensity));
        state.setSize(width, height);
        const camera = state.camera as THREE.PerspectiveCamera;
        const zoom = Math.hypot(width / height, 1) / COVERED[shape];
        if (zoom > 1)
          camera.setViewOffset(
            width * zoom,
            height * zoom,
            (width * (zoom - 1)) / 2,
            (height * (zoom - 1)) / 2,
            width,
            height,
          );
        else camera.clearViewOffset();
      },
      render(seconds) {
        if (!time) {
          const mesh = state.scene.getObjectByName('shadergradient-mesh') as THREE.Mesh | undefined;
          time = (mesh?.material as THREE.Material | undefined)?.userData.uTime;
        }
        if (time) time.value = seconds;
        state.advance(seconds);
        dim.render(state.gl);
      },
      dispose: release,
    };
  } catch (error) {
    release();
    throw error;
  }
};
