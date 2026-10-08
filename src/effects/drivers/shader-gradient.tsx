import { useEffect } from 'react';
import { createRoot, extend, useThree, type RootState } from '@react-three/fiber';
import { ShaderGradient, presets } from '@shadergradient/react';
import * as THREE from 'three';
import type { DriverFactory } from './types';

extend({ Mesh: THREE.Mesh, PlaneGeometry: THREE.PlaneGeometry, IcosahedronGeometry: THREE.IcosahedronGeometry, AmbientLight: THREE.AmbientLight, Group: THREE.Group });

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

const PRESETS = { plane: presets.halo.props, sphere: presets.pensive.props, waterPlane: presets.mint.props };
const isPresetName = (value: string): value is keyof typeof PRESETS => Object.hasOwn(PRESETS, value);

export const createDriver: DriverFactory = async (host, { variant }) => {
  registerLegacyShaderChunks();
  const canvas = document.createElement('canvas');
  host.append(canvas);
  const root = createRoot(canvas);
  const preset = PRESETS[isPresetName(variant) ? variant : 'plane'];
  try {
    await root.configure({
      frameloop: 'never', linear: true, flat: true, dpr: 1,
      camera: { fov: preset.fov },
      gl: { alpha: true, antialias: true, powerPreference: 'low-power' },
      size: { width: host.clientWidth || innerWidth, height: host.clientHeight || innerHeight, top: 0, left: 0 },
    });
    let state: RootState;
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('Shader Gradient initialization timed out')), 10_000);
      function Ready() {
        const current = useThree();
        useEffect(() => { state = current; clearTimeout(timer); resolve(); }, [current]);
        return null;
      }
      root.render(<><ShaderGradient {...preset as React.ComponentProps<typeof ShaderGradient>} animate="off" enableTransition={false} /><Ready /></>);
    });
    return {
      canvas, engine: 'shadergradient-official',
      resize(width, height, density) {
        state.setDpr(Math.min(density, preset.pixelDensity));
        state.setSize(width, height);
      },
      render(seconds) {
        const mesh = state.scene.getObjectByName('shadergradient-mesh') as THREE.Mesh | undefined;
        const material = mesh?.material as THREE.MeshPhysicalMaterial | undefined;
        if (material?.userData.uTime) material.userData.uTime.value = seconds;
        state.advance(seconds);
      },
      dispose() { root.unmount(); canvas.remove(); },
    };
  } catch (error) { root.unmount(); canvas.remove(); throw error; }
};
