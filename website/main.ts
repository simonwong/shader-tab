import { getEffect, isEffect, effectBackground, shaderGradientBackground, type EffectId, type Theme } from '../src/effects/presets';
import { createFrameLoop } from '../src/effects/frame-loop';
import { breathingTime } from '../src/effects/motion';
import type { EffectDriver, DriverFactory } from '../src/effects/drivers/types';
const host = document.querySelector<HTMLElement>('#shader')!;
const stage = document.querySelector<HTMLElement>('#preview-stage')!;
const language = document.documentElement.lang === 'en' ? 'en' : 'zh-CN';
const copy = language === 'en' ? { day: 'Light', night: 'Dark', live: 'Live shader preview', still: 'Still preview', pause: 'Pause animation', play: 'Play animation' } : { day: '日间', night: '夜间', live: '真实 shader 实时预览', still: '静态预览', pause: '暂停动画', play: '播放动画' };
const loaders: Record<EffectId, () => Promise<{ createDriver: DriverFactory }>> = {
 'grain-gradient': () => import('../src/effects/drivers/paper'), dithering: () => import('../src/effects/drivers/paper'), 'pixel-blast': () => import('../src/effects/drivers/pixel-blast'), 'data-pixel-arc': () => import('../src/effects/drivers/arc'), 'crt-terminal': () => import('../src/effects/drivers/crt'), 'shader-gradient': () => import('../src/effects/drivers/shader-gradient'),
};
const variants: Record<EffectId,string> = { 'grain-gradient': 'corners', dithering: 'swirl:4x4', 'pixel-blast': 'square', 'data-pixel-arc': 'predictive', 'crt-terminal': 'terminal', 'shader-gradient': 'sphere' };
let effect: EffectId = 'grain-gradient', theme: Theme = 'day';
let driver: EffectDriver | undefined, generation = 0, lastTime = 0, seconds = 0, visible = true, paused = false, destroyed = false;
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const pointer = { x: 0, y: 0 }, target = { x: 0, y: 0 };
const motionButton = document.querySelector<HTMLButtonElement>('#motion-toggle')!;
const themeButton = document.querySelector<HTMLButtonElement>('#theme-toggle')!;
const status = document.querySelector<HTMLElement>('#live-label')!;
const loop = createFrameLoop(time => {
 if (!driver || document.hidden || !visible || paused || motion.matches) return;
 const delta = lastTime ? Math.min((time - lastTime) / 1000, .1) : 0;
 lastTime = time; seconds += delta;
 const follow = 1 - Math.exp(-delta * 2.5);
 pointer.x += (target.x - pointer.x) * follow; pointer.y += (target.y - pointer.y) * follow;
 try { driver.render(breathingTime(seconds), delta, pointer); } catch { stopDriver(); setStatus(false); }
}, 24);
function setStatus(live: boolean) { status.textContent = live && !paused && !motion.matches ? copy.live : copy.still; stage.dataset.renderer = live ? 'live' : 'static'; }
function stopDriver() { loop.stop(); driver?.dispose(); driver = undefined; host.replaceChildren(); lastTime = 0; }
function resume() {
 loop.stop(); lastTime = 0;
 if (!driver) return;
 if (!document.hidden && visible && !paused && !motion.matches) loop.start();
 setStatus(true);
}
function resize() {
 if (!driver) return;
 const width = host.clientWidth, height = host.clientHeight;
 driver.resize(width, height, Math.min(devicePixelRatio, 1.5, Math.sqrt(2_000_000 / (width * height))));
 if (motion.matches || paused) driver.render(breathingTime(seconds), 0, pointer);
}
async function selectEffect(next: EffectId) {
 const request = ++generation;
 effect = next; stopDriver(); setStatus(false);
 const preset = getEffect(effect);
 stage.dataset.effect = effect; stage.dataset.dark = String(theme === 'night' || effect === 'crt-terminal'); stage.setAttribute('aria-label', preset.name);
 host.style.background = effect === 'shader-gradient' ? shaderGradientBackground('sphere') : effectBackground(effect, theme);
 document.querySelectorAll<HTMLButtonElement>('[data-effect].effect-picker button, .effect-picker button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.effect === effect)));
 const source = document.querySelector<HTMLAnchorElement>('#effect-source')!;
 source.href = effect === 'data-pixel-arc' ? 'https://threeui.com/backgrounds/predictive-arc/predictive' : preset.source; source.textContent = preset.sourceName;
 try {
  const { createDriver } = await loaders[effect]();
  if (request !== generation || destroyed) return;
  const layer = document.createElement('div'); layer.style.cssText = 'position:absolute;inset:0'; host.append(layer);
  const nextDriver = await createDriver(layer, effect, theme, 'sphere', variants[effect]);
  if (request !== generation || destroyed) { nextDriver.dispose(); layer.remove(); return; }
  driver = nextDriver; seconds = 0; resize(); driver.render(0, 0, pointer);
  driver.canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); if (request === generation) { stopDriver(); setStatus(false); } }, { once: true });
  setStatus(true); resume();
 } catch { if (request === generation) { stopDriver(); setStatus(false); } }
}
const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; resume(); }, { threshold: .05 }); observer.observe(stage);
const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host);
document.addEventListener('visibilitychange', resume);
motion.addEventListener('change', () => { updateMotionButton(); resume(); });
function updateMotionButton() {
 const stopped = paused || motion.matches;
 motionButton.setAttribute('aria-pressed', String(stopped)); motionButton.setAttribute('aria-label', stopped ? copy.play : copy.pause); motionButton.title = stopped ? copy.play : copy.pause;
 motionButton.disabled = motion.matches;
 motionButton.innerHTML = stopped ? '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7Z"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>';
}
motionButton.addEventListener('click', () => { paused = !paused; updateMotionButton(); resume(); });
themeButton.addEventListener('click', () => { theme = theme === 'day' ? 'night' : 'day'; themeButton.querySelector('span')!.textContent = theme === 'day' ? copy.day : copy.night; void selectEffect(effect); });
document.querySelectorAll<HTMLButtonElement>('.effect-picker button').forEach(button => button.addEventListener('click', () => { if (isEffect(button.dataset.effect)) void selectEffect(button.dataset.effect); }));
function position(event: PointerEvent) { const rect = stage.getBoundingClientRect(); return { x: (event.clientX - rect.left) / rect.width * 2 - 1, y: (event.clientY - rect.top) / rect.height * 2 - 1 }; }
stage.addEventListener('pointermove', event => { if (event.target instanceof Element && event.target.closest('button,a,.demo-popover')) return; Object.assign(target, position(event)); driver?.move?.(target); });
stage.addEventListener('pointerleave', () => { target.x = target.y = 0; });
stage.addEventListener('pointerdown', event => { if (!(event.target instanceof Element && event.target.closest('button,a,.demo-popover'))) driver?.click?.(position(event)); });
const popover = document.querySelector<HTMLElement>('#demo-popover')!;
const demoButtons = ['#demo-favorites', '#demo-grid'].map(id => document.querySelector<HTMLButtonElement>(id)!);
function closePopover() { popover.hidden = true; demoButtons.forEach(button => button.setAttribute('aria-expanded', 'false')); }
demoButtons.forEach(button => button.addEventListener('click', () => { const open = popover.hidden; closePopover(); popover.hidden = !open; button.setAttribute('aria-expanded', String(open)); }));
document.addEventListener('pointerdown', event => { if (!(event.target instanceof Element && event.target.closest('.preview-dock,.demo-popover'))) closePopover(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closePopover(); });
document.querySelector('#demo-settings')!.addEventListener('click', () => document.querySelector('#install')!.scrollIntoView({ behavior: motion.matches ? 'instant' : 'smooth' }));
window.addEventListener('pagehide', () => { destroyed = true; generation++; observer.disconnect(); resizeObserver.disconnect(); stopDriver(); });
window.addEventListener('pageshow', event => { if (event.persisted) { destroyed = false; observer.observe(stage); resizeObserver.observe(host); void selectEffect(effect); } });
updateMotionButton(); void selectEffect(effect);
