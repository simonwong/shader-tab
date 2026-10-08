// ThreeUI, copyright Meng To. MIT; see public/licenses/threeui.txt.
import * as THREE from 'three';
import { vertex, fragment } from '../vendor/amber-halftone-shaders';
import { ARC_SURFACE } from '../presets';
import type { DriverFactory } from './types';
export const createDriver: DriverFactory = (host, { theme }) => {
  const light = theme === 'day';
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' });
  const canvas = renderer.domElement; host.append(canvas);
  renderer.setClearColor(ARC_SURFACE[theme], 1);
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 10);
  camera.position.z = 1;
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, transparent: true,
    uniforms: { time: { value: 0 }, pixelRatio: { value: 1 }, color1: { value: new THREE.Color(light ? 0xb45309 : 0xfbbf24) }, color2: { value: new THREE.Color(light ? 0x1a1f2a : 0xffffff) } } });
  const points = new THREE.Points(geometry, material); scene.add(points);
  return {
    canvas, engine: 'threeui-three',
    resize(width, height, density) {
      renderer.setPixelRatio(density); renderer.setSize(width, height, false); material.uniforms.pixelRatio!.value = density;
      const aspect = width / height; camera.left = -aspect; camera.right = aspect; camera.updateProjectionMatrix();
      const positions: number[] = [], scales: number[] = [], spacing = .085;
      for (let x = -Math.ceil(aspect / spacing); x <= Math.ceil(aspect / spacing); x++) for (let y = -13; y <= 13; y++) { positions.push(x * spacing, y * spacing, 0); scales.push(1); }
      geometry.dispose(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('scale', new THREE.Float32BufferAttribute(scales, 1)); geometry.computeBoundingSphere();
    },
    render(seconds, delta, pointer) { material.uniforms.time!.value = seconds; points.position.set(pointer.x * .025, -pointer.y * .025, 0); renderer.render(scene, camera); },
    dispose() { geometry.dispose(); material.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); },
  };
};
