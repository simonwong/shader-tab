# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Shader Tab (the repo name and older docs say Glass Tab) is a Chrome MV3 new-tab extension: WebGL backgrounds plus local bookmark navigation, built on WXT and React. `docs/` is written in Chinese. Read `docs/architecture.md` before changing storage, the background lifecycle, frame rates or shuffle behaviour; `docs/development.md` covers setup, the website and the browser review scripts.

## Done

A change is done when `pnpm check` passes. It is the CI gate: lint, format check, typecheck, tests, production build, then the build assertions in `scripts/check-build.mjs`.

## Running and testing

- One test file: `pnpm vitest run src/effects/variants.test.ts`; one test: add `-t '<name>'`. Tests are `src/**/*.test.ts` and run in `node`, with no DOM.
- `pnpm dev` serves the page at `http://localhost:4317/src/entrypoints/newtab/index.html`. In a plain browser tab it runs on the preview platform: sample bookmarks and a separate localStorage namespace. Real bookmarks need `.output/chrome-mv3-dev` loaded unpacked at `chrome://extensions`.
- The browser review scripts (`scripts/review-*`, `capture-*`, `measure-*`, `diagnose-*`) drive an isolated Chrome through the `agent-browser` CLI and sit outside `pnpm check`. Each needs either `pnpm dev` on 4317 or a fresh `pnpm build`; the 专项验证 table in `docs/development.md` says which. Output goes to `artifacts/`.

## Sources of truth

Edit these; the rest derives from them.

- `EFFECT_VARIANTS` in `src/effects/variants.ts`: every background variant. Shuffle storage, renderer dispatch, source badges, CSS fallbacks and the review scripts all read it.
- `src/i18n/en.ts`: the `Messages` type the other seven locale files implement.
- `scripts/localization/legal-copy.mjs`: `pnpm locales` generates `public/_locales/` and the legal HTML (`public/privacy.html`, `public/licenses.html`, `public/locales/**`) from it. `dev`, `build` and `zip` regenerate them on every run.
- `src/effects/vendor/README.md`: the record of upstream renderer code and its local changes, covering `vendor/` and the ThreeUI ports in `drivers/arc-*.ts`. Those files keep their upstream copyright line and a "Modified by Shader Tab" note.

## Where behaviour lives

Change and test these modules through their own interface; their callers are thin.

- `src/platform/storage.ts`: everything stored: favorites, preferences, shuffle draws, legacy migrations and the Web Locks around them. `chrome.ts` and `preview.ts` only adapt `chrome.storage.local` and localStorage to its `Store` interface. Tests: `storage.test.ts`, over an in-memory store.
- `src/features/preferences/background-picker.ts`: the page's background: effect from the weighted pool, variant from the shuffle bag, reshuffle, hide and pin. `use-effect-selection.ts` is only its React binding. Tests: `background-picker.test.ts`.
- `mountShader` in `src/effects/drivers/webgl.ts`: every raw WebGL driver mounts through it. It owns the context, canvas size and viewport, the draw call and the release of GPU objects; a driver supplies uniforms, geometry and per-frame logic in `setup`.

## Invariants

- Platform seam: UI code reaches Chrome only through the `Platform` interface (`src/platform/types.ts`). `src/platform/index.ts` picks the Chrome implementation in the extension, the preview one in dev web pages, and an "unavailable" stub in a production build outside Chrome.
- Storage: `chrome.storage.local` only, unsynced; Chrome's bookmark tree is read-only to the extension. Keys carry versions (`favorites:v2`, `preference:v1:<field>`, `effect-variant:shuffle:v1:<effect>`), and readers migrate old values and drop unknown ones, so a format change ships with a read-time migration. Favorites, preferences and shuffle bags change inside `navigator.locks` because tabs share the store; lock names (`glass-tab:…`) are part of the format, since tabs of the old and new version run side by side after an update.
- Preview namespace: the `glass-tab-preview:` localStorage prefix and `glass-tab:preview-` lock names stay in `src/platform/preview.ts`. The review scripts write that prefix directly, and `check-build.mjs` fails if it reaches the production bundle.
- First paint: `src/entrypoints/newtab/boot.ts` mirrors the resolved theme, locale, messages and static background colours into localStorage `shader-tab:boot:v1` and applies them synchronously before React renders (the CSP rules out inline scripts). Whatever shapes the first frame goes through this cache.
- Offline: permissions are exactly `bookmarks`, `storage`, `favicon`, and the CSP sets `connect-src 'self'`. Fonts, shaders and images ship in the package; favicons come from Chrome's local `_favicon` cache.
- Bundle budget: renderers, settings, the bookmark menu and non-English dictionaries load by dynamic import. `check-build.mjs` holds first-screen JS under 265 KB, asserts that settings, the bookmark menu and onboarding stay dynamic imports, and fails if three.js or ShaderGradient's React package ships.

## Dependencies

- Pick versions published at least two weeks ago. Exact pins in `package.json` stay exact.
- Upgrading a rendering or first-paint dependency (`react`, `react-dom`, `@paper-design/shaders`, `@base-ui/react`) goes in its own commit, followed by `pnpm review:variants` and `pnpm perf:measure`.

## Website and records

- `website/` is its own pnpm workspace package and holds `cf` and `wrangler`. Run them as `pnpm -C website exec cf ...`: from the repo root, cf builds the whole repo as a Vite project.
- `docs/verification.md` gets one new section per release; earlier sections keep the numbers of their version.
