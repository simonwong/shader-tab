// ThreeUI, copyright Meng To. MIT; see public/licenses/threeui.txt.
// Adapted to elapsed time, shared resolution limits, and pointer-following sheen.
// Only the authored terminal screen is kept; the other ThreeUI CRT screens are retired.
import { CRT_FRAGMENT_SHADER, CRT_VERTEX_SHADER } from "./crtShaders";
import { MAX_RENDER_EDGE, MAX_RENDER_PIXELS, pixelDensity } from "../drivers/surface";
import { bindFullscreenTriangle, deleteProgram, linkProgram } from "../drivers/webgl";

export type CrtOptions = { speed: number; typeSpeed: number; motion: number; brightness: number; opacity: number; hue: number; saturation: number };
export const CRT_DEFAULTS: CrtOptions = { speed: 1, typeSpeed: 1, motion: 1, brightness: 1, opacity: 1, hue: 0, saturation: 1 };

/* Tube material for the terminal screen. */
const STYLE = {
  curve: [0.115, 0.165], scanDensity: 0.44, scanDepth: 0.12, triadCss: 3.2, grille: 0.12, chroma: 1,
  bar: 0, flicker: 0, grain: 0.006, noise: 0, vignette: 0.58, mono: 0, gain: 1.05, halo: 0.04,
  sheen: [0.55, 1.0, 0.78], room: [0.012, 0.03, 0.022],
} as const;
const SCREEN_BACKGROUND = "#03100a";
const FONT_STACK = 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace';

type Segment = { t: string; c: "p" | "d" | "a" | "h" };
const segment = (text: string, color: Segment["c"] = "p"): Segment => ({ t: text, c: color });
const dots = (count: number) => "·".repeat(count);
const LOG: Segment[][] = [
  [segment("SHADER TAB / PHOSPHOR STUDY"), segment("   GENERATIVE ART", "d")],
  [segment("ANIMATED BACKGROUND / NO COMMANDS ARE EXECUTED", "d")], [],
  [segment("Drawing soft light "), segment(dots(18), "d"), segment(" BLOOM", "a")],
  [segment("Layer 01 / emerald ribbons "), segment(dots(10), "d"), segment(" 0.32")],
  [segment("Layer 02 / phosphor grain "), segment(dots(11), "d"), segment(" 0.18")],
  [segment("Layer 03 / evening shadows "), segment(dots(10), "d"), segment(" 0.74")], [],
  [segment("One slow breath, then another.", "h")],
  [segment("Lines drift across a field of green.", "d")],
  [segment("Small points of light leave quiet trails.", "d")], [],
  [segment("PALETTE / MINT / AMBER / INK", "a")],
  [segment("FORM / CURVE / GRAIN / GLOW", "d")], [],
  [segment("A little space between things.", "h")],
];
const COLORS = {
  p: { fill: "#8df0b4", glow: "rgba(28,236,132,0.95)" },
  d: { fill: "#4f9a76", glow: "rgba(28,236,132,0.45)" },
  a: { fill: "#ffba5e", glow: "rgba(255,150,52,0.95)" },
  h: { fill: "#eafff3", glow: "rgba(120,255,190,0.95)" },
};
const lineLength = (line: Segment[]) => line.reduce((total, item) => total + item.t.length, 0);
const TOTAL = LOG.reduce((total, line) => total + lineLength(line), 0);
const MAX_CHARS = Math.max(...LOG.map(lineLength));

export function createCrtRenderer(host: HTMLElement, canvas: HTMLCanvasElement, getOptions: () => CrtOptions) {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, premultipliedAlpha: false });
  if (!gl) throw new Error("CRT requires WebGL");
  const textCanvas = document.createElement("canvas");
  const textContext = textCanvas.getContext("2d");
  if (!textContext) throw new Error("CRT text canvas unavailable");

  const linked = linkProgram(gl, CRT_VERTEX_SHADER, CRT_FRAGMENT_SHADER);
  const { program } = linked;
  gl.useProgram(program);
  const buffer = bindFullscreenTriangle(gl, program, "aPos");
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const uPointer = uniform("uPointer"), uResolution = uniform("uRes"), uTime = uniform("uTime");
  const uMotion = uniform("uMotion"), uScan = uniform("uScan"), uTriad = uniform("uTriad");

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.uniform1i(uniform("uTex"), 0);
  gl.uniform2f(uniform("uCurve"), STYLE.curve[0], STYLE.curve[1]);
  gl.uniform1f(uniform("uScanDepth"), STYLE.scanDepth);
  gl.uniform1f(uniform("uGrille"), STYLE.grille);
  gl.uniform1f(uniform("uChroma"), STYLE.chroma);
  gl.uniform1f(uniform("uBar"), STYLE.bar);
  gl.uniform1f(uniform("uFlicker"), STYLE.flicker);
  gl.uniform1f(uniform("uGrain"), STYLE.grain);
  gl.uniform1f(uniform("uNoise"), STYLE.noise);
  gl.uniform1f(uniform("uVignette"), STYLE.vignette);
  gl.uniform1f(uniform("uMono"), STYLE.mono);
  gl.uniform1f(uniform("uGain"), STYLE.gain);
  gl.uniform1f(uniform("uHalo"), STYLE.halo);
  gl.uniform3f(uniform("uSheen"), STYLE.sheen[0], STYLE.sheen[1], STYLE.sheen[2]);
  gl.uniform3f(uniform("uRoom"), STYLE.room[0], STYLE.room[1], STYLE.room[2]);

  let width = 1, height = 1, cssWidth = 1, cssHeight = 1;
  let fontSize = 14, lineHeight = 20, startY = 0, charWidth = 8, caretX = 0, caretY = 0;
  let typed = 0, done = false, textDirty = true, lastTextAt = 0, lastReveal = -1, lastBlink = -1;

  const font = () => `600 ${fontSize.toFixed(2)}px ${FONT_STACK}`;
  const layout = () => {
    startY = height * 0.135;
    lineHeight = height * 0.74 / LOG.length;
    fontSize = Math.max(5, Math.min(lineHeight * 0.8, width * 0.88 / (Math.max(MAX_CHARS, 1) * 0.62)));
    textContext.font = font();
    charWidth = textContext.measureText("M").width || fontSize * 0.6;
  };
  const setStyle = (key: Segment["c"], glow: boolean) => {
    const color = COLORS[key];
    textContext.fillStyle = color.fill;
    textContext.shadowColor = glow ? color.glow : "transparent";
    textContext.shadowBlur = glow ? fontSize * 0.38 : 0;
  };
  /* two passes per glyph: a soft phosphor halo, then the same glyph re-filled with
     the shadow off so the stroke core stays crisp at any backing resolution */
  const drawScreen = (reveal: number) => {
    textContext.setTransform(1, 0, 0, 1, 0, 0);
    textContext.fillStyle = SCREEN_BACKGROUND;
    textContext.fillRect(0, 0, width, height);
    textContext.textAlign = "left";
    textContext.textBaseline = "top";
    textContext.font = font();
    const left = Math.floor((width - MAX_CHARS * charWidth) / 2);
    let remaining = reveal, y = startY;
    caretX = left;
    caretY = startY;
    for (const line of LOG) {
      const length = lineLength(line);
      const visible = reveal === Infinity ? Infinity : Math.min(remaining, length);
      let x = left, drawn = 0;
      for (const item of line) {
        let text = item.t;
        if (visible !== Infinity) {
          const rest = visible - drawn;
          if (rest <= 0) break;
          if (rest < text.length) text = text.slice(0, rest);
        }
        if (text.length) {
          setStyle(item.c, true);
          textContext.fillText(text, x, y);
          setStyle(item.c, false);
          textContext.fillText(text, x, y);
          x += charWidth * text.length;
        }
        drawn += item.t.length;
        if (visible !== Infinity && drawn >= visible) break;
      }
      caretX = x;
      caretY = y;
      if (visible !== Infinity) remaining -= visible;
      y += lineHeight;
      if (visible !== Infinity && remaining <= 0) break;
    }
  };
  const drawCursor = () => {
    const cursorWidth = Math.max(charWidth * 0.92, 4);
    textContext.shadowColor = COLORS.p.glow;
    textContext.shadowBlur = fontSize * 0.42;
    textContext.fillStyle = "#bdf8d2";
    textContext.fillRect(caretX, caretY + fontSize * 0.06, cursorWidth, fontSize * 0.96);
    textContext.shadowBlur = 0;
    textContext.fillRect(caretX, caretY + fontSize * 0.06, cursorWidth, fontSize * 0.96);
  };
  const uploadTexture = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    textDirty = false;
  };
  /* backing-store ceiling: the composite is one triangle, so the cost that matters is
     the 2D screen redraw and its upload, not the fragment pass */
  const resize = () => {
    const bounds = host.getBoundingClientRect();
    cssWidth = Math.max(1, bounds.width);
    cssHeight = Math.max(1, bounds.height);
    const density = pixelDensity(cssWidth, cssHeight);
    let nextWidth = Math.max(1, Math.round(Math.min(cssWidth * density, MAX_RENDER_EDGE)));
    let nextHeight = Math.max(1, Math.round(nextWidth * cssHeight / cssWidth));
    if (nextWidth * nextHeight > MAX_RENDER_PIXELS) {
      const fit = Math.sqrt(MAX_RENDER_PIXELS / (nextWidth * nextHeight));
      nextWidth = Math.round(nextWidth * fit);
      nextHeight = Math.round(nextHeight * fit);
    }
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }
    if (textCanvas.width !== nextWidth || textCanvas.height !== nextHeight) {
      textCanvas.width = width = nextWidth;
      textCanvas.height = height = nextHeight;
      layout();
      lastReveal = -1;
      lastBlink = -1;
      lastTextAt = 0;
      textDirty = true;
    }
    gl.useProgram(program);
    gl.viewport(0, 0, nextWidth, nextHeight);
    gl.uniform2f(uResolution, nextWidth, nextHeight);
    gl.uniform1f(uScan, Math.max(120, Math.min(cssHeight * STYLE.scanDensity, 900)));
    gl.uniform1f(uTriad, Math.max(2, STYLE.triadCss * nextWidth / cssWidth));
  };
  const maybeRedrawText = (animationMs: number, elapsedMs: number) => {
    const reveal = done ? Infinity : Math.floor(typed);
    const blink = Math.floor(animationMs / 420) % 2 === 0 ? 1 : 0;
    const due = !done ? elapsedMs - lastTextAt > 42 : blink !== lastBlink;
    if (reveal === lastReveal && blink === lastBlink && !due) return;
    if (!done && elapsedMs - lastTextAt <= 42 && reveal === lastReveal && blink === lastBlink) return;
    drawScreen(reveal);
    if (blink) drawCursor();
    lastTextAt = elapsedMs;
    lastReveal = reveal;
    lastBlink = blink;
    textDirty = true;
  };
  return {
    resize,
    render(animationMs: number, elapsedMs: number, pointer = { x: 0, y: 0 }) {
      const options = getOptions();
      const seconds = animationMs * 0.001 * options.speed;
      if (!done) {
        typed = seconds * 264 * options.typeSpeed;
        if (typed >= TOTAL) {
          typed = TOTAL;
          done = true;
        }
      }
      maybeRedrawText(animationMs, elapsedMs);
      if (textDirty) uploadTexture();
      gl.useProgram(program);
      gl.uniform2f(uPointer, pointer.x, pointer.y);
      gl.uniform1f(uTime, seconds);
      gl.uniform1f(uMotion, options.motion);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteTexture(texture);
      deleteProgram(gl, linked);
    },
  };
}
