(() => {
  const locations = new WeakMap();
  window.__shaderProbe = { uniforms: {}, uploads: 0, draws: 0, arcFrames: 0, crtTextReady: false };
  for (const contextName of ['WebGLRenderingContext', 'WebGL2RenderingContext']) {
    const proto = window[contextName]?.prototype;
    if (!proto) continue;
    const locate = proto.getUniformLocation;
    proto.getUniformLocation = function (program, name) {
      const location = locate.call(this, program, name);
      if (location) locations.set(location, name);
      return location;
    };
    for (const method of ['uniform1f', 'uniform2f', 'uniform3f', 'uniform1fv', 'uniform2fv', 'uniform4fv']) {
      const original = proto[method];
      proto[method] = function (location, ...values) {
        const uniform = locations.get(location);
        if (uniform) window.__shaderProbe.uniforms[uniform] = method.endsWith('fv') ? Array.from(values[0]) : values.length === 1 ? values[0] : values;
        return original.call(this, location, ...values);
      };
    }
    const draw = proto.drawArrays;
    proto.drawArrays = function (...args) { window.__shaderProbe.draws++; return draw.apply(this, args); };
    for (const method of ['texImage2D', 'texSubImage2D']) {
      const upload = proto[method];
      proto[method] = function (...args) { window.__shaderProbe.uploads++; return upload.apply(this, args); };
    }
  }
  const text = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (...args) {
    if (args[0] === 'A little space between things.') window.__shaderProbe.crtTextReady = true;
    return text.apply(this, args);
  };
  const fill = CanvasRenderingContext2D.prototype.fillRect;
  CanvasRenderingContext2D.prototype.fillRect = function (...args) {
    if (this.canvas.isConnected && args[0] === 0 && args[1] === 0 && args[2] === innerWidth) window.__shaderProbe.arcFrames++;
    return fill.apply(this, args);
  };
})();
