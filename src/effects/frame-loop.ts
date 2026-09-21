export function createFrameLoop(draw: (time: number) => void, initialFps: number) {
  let running = false;
  let drawing = false;
  let fps = initialFps;
  let frame = 0;
  let timer = 0;
  const cancel = () => { window.clearTimeout(timer); cancelAnimationFrame(frame); };
  const tick = (time: number) => {
    if (!running) return;
    const started = performance.now();
    drawing = true;
    try { draw(time); } finally { drawing = false; }
    if (running) timer = window.setTimeout(() => { frame = requestAnimationFrame(tick); }, Math.max(0, 1000 / fps - (performance.now() - started)));
  };
  return {
    start() { if (!running) { running = true; frame = requestAnimationFrame(tick); } },
    stop() { running = false; cancel(); },
    setFps(next: number) { if (next === fps) return; fps = next; if (running && !drawing) { cancel(); frame = requestAnimationFrame(tick); } },
  };
}
