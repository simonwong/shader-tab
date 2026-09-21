(() => {
  const stats = { draws: 0, raf: 0, submitMs: 0, longTasks: [], started: performance.now() };
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = callback => raf(time => { stats.raf++; callback(time); });
  for (const name of ['WebGLRenderingContext', 'WebGL2RenderingContext']) {
    const proto = window[name]?.prototype;
    if (!proto) continue;
    for (const method of ['drawArrays', 'drawElements']) {
    const draw = proto[method];
    proto[method] = function (...args) {
      const start = performance.now();
      const result = draw.apply(this, args);
      stats.draws++;
      stats.submitMs += performance.now() - start;
      return result;
    };
    }
  }
  const fill = CanvasRenderingContext2D.prototype.fillRect;
  CanvasRenderingContext2D.prototype.fillRect = function (...args) {
    if (this.canvas.isConnected && args[0] === 0 && args[1] === 0 && args[2] === innerWidth) stats.draws++;
    return fill.apply(this, args);
  };
  new PerformanceObserver(list => stats.longTasks.push(...list.getEntries().map(e => ({ start: e.startTime, duration: e.duration })))).observe({ type: 'longtask', buffered: true });
  window.__glassProbe = {
    reset() { stats.draws = stats.raf = stats.submitMs = 0; stats.longTasks = []; stats.started = performance.now(); },
    read() {
      const canvas = document.querySelector('.ambient-background canvas');
      return { ...stats, elapsedMs: performance.now() - stats.started, buffer: canvas ? [canvas.width, canvas.height] : null,
        renderer: document.querySelector('.ambient-background')?.dataset.renderer,
        paints: performance.getEntriesByType('paint').map(e => ({ name: e.name, start: e.startTime })),
        scripts: performance.getEntriesByType('resource').filter(e => e.initiatorType === 'script').map(e => ({ name: e.name.split('/').pop(), bytes: e.decodedBodySize })),
        heapBytes: performance.memory?.usedJSHeapSize };
    }
  };
})();
