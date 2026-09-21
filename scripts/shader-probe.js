(() => {
  const locations = new WeakMap();
  window.__shaderProbe = { uniforms: {}, uploads: 0, arcFrames: 0 };
  for (const name of ['WebGLRenderingContext', 'WebGL2RenderingContext']) {
    const proto = window[name]?.prototype;
    if (!proto) continue;
    const locate = proto.getUniformLocation;
    proto.getUniformLocation = function (program, name) {
      const location = locate.call(this, program, name);
      if (location) locations.set(location, name);
      return location;
    };
    for (const method of ['uniform1f', 'uniform2f', 'uniform2fv', 'uniform1fv']) {
      const original = proto[method];
      proto[method] = function (location, ...values) {
        const name = locations.get(location);
        if (name) window.__shaderProbe.uniforms[name] = method.endsWith('fv') ? Array.from(values[0]) : values.length === 1 ? values[0] : values;
        return original.call(this, location, ...values);
      };
    }
    for (const method of ['texImage2D', 'texSubImage2D']) {
      const upload = proto[method];
      proto[method] = function (...args) { window.__shaderProbe.uploads++; return upload.apply(this, args); };
    }
  }
  const fill = CanvasRenderingContext2D.prototype.fillRect;
  CanvasRenderingContext2D.prototype.fillRect = function (...args) {
    if (this.canvas.isConnected && args[0] === 0 && args[1] === 0 && args[2] === innerWidth) window.__shaderProbe.arcFrames++;
    return fill.apply(this, args);
  };
})();
