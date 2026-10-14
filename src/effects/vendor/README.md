# Vendored renderer code

Third-party drawing code copied into Shader Tab. Each file keeps its copyright
line and a "Modified by Shader Tab" note; full license texts ship in
`public/licenses/`. See `docs/shader-license-review.md` for the license review.

## ThreeUI (MIT, copyright Meng To)

Upstream: https://github.com/MengTo/threeui (license: `public/licenses/threeui.txt`).
The code was copied on 2026-09-21; the upstream head at that time was
`68802d5428071ada5c20db8094b1649e6bb770ed` (2026-09-01). The exact commit was not
recorded when the files were copied.

| File | Upstream source | Local changes |
| --- | --- | --- |
| `dataPixelArcRenderer.ts` | `src/shaders/data-pixel-arc/dataPixelArcRenderer.ts` | Shared clock and pixel budget; hue and saturation options removed, mode replaced by a `uLight` uniform. Now a fragment shader (`DATA_PIXEL_ARC_FRAGMENT`) that draws the same cell grid and arc as the original Canvas 2D loop; output is clamped and multiplied by `uDim`. |
| `predictiveArcRenderer.ts` | `src/shaders/predictive-arc/predictiveArcRenderer.ts` | Shared clock; hue and saturation options removed, mode replaced by a `uLight` uniform. Now a fragment shader (`PREDICTIVE_ARC_FRAGMENT`) that reproduces the Canvas 2D dot draw order, additive (dark) and source-over (light) blending and Chrome's edge coverage; output multiplied by `uDim`. |
| `ribbon-field-shaders.ts` | `src/shaders/ribbon-field/ribbonFieldShaders.ts` | Added the `lightMode` branch for the day theme; output clamped and multiplied by `uDim`. |
| `void-field-shaders.ts` | `src/shaders/neuform-isolated/` (Void Field, `sources/void-protocol.html`) | Output clamped and multiplied by `uDim`. Per-frame row flicker removed; pulse at 0.4x speed; pointer shift 0.02 instead of 0.05. |
| `amber-halftone-shaders.ts` | `src/shaders/neuform-isolated/` (Amber Halftone, `sources/amber-halftone.html`) | The three.js point cloud is replaced by one fullscreen fragment shader that draws the same halftone dots; colours are passed as three.js passed them (linear values written out unconverted). Output multiplied by `uDim`. |

ThreeUI code also lives outside this folder:

- `drivers/arc-particles.ts`: Signal Particles and Override Grid
  (`src/shaders/neuform-isolated/sources/signal-particles.html`,
  `override-grid.html`), ported from per-dot Canvas 2D loops to fragment shaders.
- `drivers/arc-amber.ts`: the Amber Halftone driver, drawn with raw WebGL
  instead of three.js.

## ShaderGradient (MIT, copyright ruucm and stone-skipper)

Upstream: https://github.com/ruucm/shadergradient (license:
`public/licenses/shader-gradient.txt`). The plane and waterPlane vertex and
fragment shaders of `@shadergradient/react` are ported to WebGL1 GLSL in
`drivers/shader-gradient.ts`, not in this folder. three.js and React Three
Fiber are not used: the plane geometry, camera and ambient lighting are computed
on the CPU, the output is multiplied by the theme brightness, and a static
±0.5/255 dither is added against banding.

## Other code

Paper Shaders (Grain Gradient, Dithering, Fluted Glass) is imported from the
`@paper-design/shaders` npm package and is not copied here. The Fluted Glass
sample photo (`src/assets/fluted-glass/paper-flowers.webp`) comes from the
paper-design/shaders repository (Apache-2.0). Pixel Field
(`drivers/pixel-blast.ts`) is original Shader Tab code.
