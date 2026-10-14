(() => {
  const locations = new WeakMap();
  window.__shaderProbe = { uniforms: {}, uploads: 0, draws: 0 };
  for (const contextName of ['WebGLRenderingContext', 'WebGL2RenderingContext']) {
    const proto = window[contextName]?.prototype;
    if (!proto) continue;
    const locate = proto.getUniformLocation;
    proto.getUniformLocation = function (program, name) {
      const location = locate.call(this, program, name);
      if (location) locations.set(location, name);
      return location;
    };
    for (const method of [
      'uniform1f',
      'uniform2f',
      'uniform3f',
      'uniform1fv',
      'uniform2fv',
      'uniform4fv',
    ]) {
      const original = proto[method];
      proto[method] = function (location, ...values) {
        const uniform = locations.get(location);
        if (uniform)
          window.__shaderProbe.uniforms[uniform] = method.endsWith('fv')
            ? Array.from(values[0])
            : values.length === 1
              ? values[0]
              : values;
        return original.call(this, location, ...values);
      };
    }
    for (const method of ['drawArrays', 'drawElements']) {
      const draw = proto[method];
      proto[method] = function (...args) {
        window.__shaderProbe.draws++;
        return draw.apply(this, args);
      };
    }
    for (const method of ['texImage2D', 'texSubImage2D']) {
      const upload = proto[method];
      proto[method] = function (...args) {
        window.__shaderProbe.uploads++;
        return upload.apply(this, args);
      };
    }
  }
})();
