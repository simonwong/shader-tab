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
| `void-field-shaders.ts` | `src/shaders/neuform-isolated/` (Void Field, `sources/void-protocol.html`) | Output clamped and multiplied by `uDim`. |
| `amber-halftone-shaders.ts` | `src/shaders/neuform-isolated/` (Amber Halftone, `sources/amber-halftone.html`) | The three.js point cloud is replaced by one fullscreen fragment shader that draws the same halftone dots; colours are passed as three.js passed them (linear values written out unconverted). Output multiplied by `uDim`. |
| `crtRenderer.ts` | `src/shaders/crt/crtRenderer.ts` | Shared clock, resolution budget and pointer-following sheen. Only the Terminal screen is kept (other screens and `crtScreens.ts` removed). The text canvas is half the tube resolution and is redrawn and uploaded only when the typed text changes. Takes a colour grade (two 3x3 matrices plus a dim factor) for the theme tint and brightness. |
| `crtShaders.ts` | `src/shaders/crt/crtShaders.ts` | Sheen follows the pointer. The blinking cursor and its glow are drawn in the shader from uniforms. Final colour grade (`uGradeFirst`, `uGradeSecond`, `uDim`). |

ThreeUI code also lives outside this folder:

- `drivers/arc-particles.ts`: Signal Particles and Override Grid
  (`src/shaders/neuform-isolated/sources/signal-particles.html`,
  `override-grid.html`), ported from per-dot Canvas 2D loops to fragment shaders.
- `drivers/arc-amber.ts`: the Amber Halftone driver, drawn with raw WebGL
  instead of three.js.

## Other files

`pixel-blast.ts` is maintained separately and is not covered here; see its own
header.
