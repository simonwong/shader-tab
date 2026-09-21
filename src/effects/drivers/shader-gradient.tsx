import { useEffect } from 'react';
import { createRoot, extend, useThree, type RootState } from '@react-three/fiber';
import { ShaderGradient, presets } from '@shadergradient/react';
import * as THREE from 'three';
import type { DriverFactory } from './types';

extend({ Mesh: THREE.Mesh, PlaneGeometry: THREE.PlaneGeometry, IcosahedronGeometry: THREE.IcosahedronGeometry, AmbientLight: THREE.AmbientLight, Group: THREE.Group });
// Match the official Canvas compatibility setup while the shared clock owns rendering.
for (const chunk of ['uv2_pars_vertex', 'uv2_vertex', 'uv2_pars_fragment', 'encodings_fragment']) {
  (THREE.ShaderChunk as unknown as Record<string, string>)[chunk] = '';
}

const variants = { plane: presets.halo.props, sphere: presets.pensive.props, waterPlane: presets.mint.props };

export const createDriver: DriverFactory = async (host, _effect, _theme, shape = 'plane') => {
  const canvas = document.createElement('canvas');
  host.append(canvas);
  const root = createRoot(canvas);
  const preset = variants[shape];
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
