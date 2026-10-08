import * as THREE from 'three';
import { EffectComposer, EffectPass, RenderPass } from 'postprocessing';
import { createTouchTexture, createLiquidEffect, VERTEX_SRC, FRAGMENT_SRC, MAX_CLICKS } from '../vendor/pixel-blast';
import { getEffect } from '../presets';
import type { DriverFactory } from './types';
export const createDriver: DriverFactory = (host, { effect, theme, variant }) => {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' });
  const canvas = renderer.domElement;
  host.append(canvas);
  host.style.backgroundColor = getEffect(effect).base[theme];
  renderer.setClearAlpha(0);
  const uniforms = {
    uResolution: { value: new THREE.Vector2() }, uTime: { value: 0 }, uColor: { value: new THREE.Color(getEffect(effect)[theme][0]) },
    uClickPos: { value: Array.from({ length: MAX_CLICKS }, () => new THREE.Vector2(-1, -1)) },
    uClickTimes: { value: new Float32Array(MAX_CLICKS).fill(-1000) }, uShapeType: { value: Math.max(0, ['square', 'circle', 'triangle', 'diamond'].indexOf(variant ?? 'square')) },
    uPixelSize: { value: 3 }, uScale: { value: 2 }, uDensity: { value: 1 }, uPixelJitter: { value: 0 },
    uEnableRipples: { value: 1 }, uRippleSpeed: { value: .3 }, uRippleThickness: { value: .1 }, uRippleIntensity: { value: .25 }, uEdgeFade: { value: .2 },
  };
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const material = new THREE.ShaderMaterial({ vertexShader: VERTEX_SRC, fragmentShader: FRAGMENT_SRC, uniforms, transparent: true, depthTest: false, depthWrite: false, glslVersion: THREE.GLSL3 });
  const geometry = new THREE.PlaneGeometry(2, 2);
  scene.add(new THREE.Mesh(geometry, material));
  const touch = createTouchTexture();
  const liquid = createLiquidEffect(touch.texture, { strength: .025, freq: 2 });
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new EffectPass(camera, liquid));
  let clickIndex = 0;
  return {
    canvas, engine: 'three-postprocessing',
    resize(width, height, density) {
      renderer.setPixelRatio(density); composer.setSize(width, height);
      uniforms.uResolution.value.set(canvas.width, canvas.height); uniforms.uPixelSize.value = 3 * density;
    },
    render(seconds, delta) { uniforms.uTime.value = 21 + seconds * .5; liquid.uniforms.get('uTime')!.value = seconds; touch.update(delta); composer.render(delta); },
    move(pointer) { touch.addTouch({ x: (pointer.x + 1) / 2, y: (1 - pointer.y) / 2 }); },
    click(pointer) {
      uniforms.uClickPos.value[clickIndex]!.set((pointer.x + 1) / 2 * canvas.width, (1 - pointer.y) / 2 * canvas.height);
      uniforms.uClickTimes.value[clickIndex] = uniforms.uTime.value; clickIndex = (clickIndex + 1) % MAX_CLICKS;
    },
    dispose() { composer.dispose(); touch.texture.dispose(); geometry.dispose(); material.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); },
  };
};
