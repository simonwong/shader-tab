(() => {
  const stats = { draws: 0, raf: 0, submitMs: 0, longTasks: [], started: performance.now() };
  // Never reset: startup long tasks would otherwise be lost by the first sample's reset().
  const startup = { longTasks: [], layerReadyMs: null };
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
  new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
      const task = { start: entry.startTime, duration: entry.duration };
      stats.longTasks.push(task);
      startup.longTasks.push(task);
    }
  }).observe({ type: 'longtask', buffered: true });
  // Works with builds that predate the `ambient:ready` mark: the first layer that turns `.ready`.
  new MutationObserver((records, observer) => {
    if (records.some(record => record.target instanceof Element && record.target.matches('.effect-layer.ready'))) {
      startup.layerReadyMs = performance.now();
      observer.disconnect();
    }
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
  // oxlint-disable-next-line unicorn/consistent-function-scoping -- the IIFE keeps this init script from adding page globals
  const mark = name => performance.getEntriesByName(name, 'mark')[0]?.startTime ?? null;
  window.__glassProbe = {
    reset() { stats.draws = stats.raf = stats.submitMs = 0; stats.longTasks = []; stats.started = performance.now(); },
    startup() {
      const readyMs = mark('ambient:ready') ?? startup.layerReadyMs;
      const before = readyMs === null ? Infinity : readyMs + 500;
      const tasks = startup.longTasks.filter(task => task.start < before);
      return {
        startMs: mark('ambient:start'), readyMs, layerReadyMs: startup.layerReadyMs,
        paints: performance.getEntriesByType('paint').map(e => ({ name: e.name, start: e.startTime })),
        longTasks: tasks, longTaskMs: tasks.reduce((sum, task) => sum + task.duration, 0),
      };
    },
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
