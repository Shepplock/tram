# Print Pak React rewrite — gap-closing roadmap (2026-09-03)

## Context

The React/Vite/TypeScript rewrite (`app/`) is functionally bootstrapped: the engine is fully ported and unit-tested, the core single-photo edit loop (import, camera capture, crop/rotate, tone/style sliders, single-image PNG export) works end-to-end, and it builds as an installable PWA. Two research passes (one on visual/CSS fidelity, one on feature completeness) were run against the original `index.html` to find what's left. Both converge on the same story: the underlying data/state layer is often *already there* (Zustand actions exist, engine math is ported and tested) but has no UI wired to it, and the visual styling lost a systemic, consistent "pixel console" language rather than drifting randomly. This file is the roadmap for closing both gaps, organized into phases so future work can pick it up incrementally. Per the repo owner's explicit choice, the original's **unified fixed bottom bar** (Import / Camera / Photo-Video mode toggle / Export key, all together) should be restored rather than keeping the current split (Import+Camera bar separate from an Export tab).

This is a planning/roadmap document only — nothing in this file has been implemented yet.

## Phase 0 — Visual system fix (do first: foundational, and this is what "looks worse" is about)

Root cause: the original defines one consistent tactile language — raised buttons with `box-shadow: 3px 3px 0 rgba(0,0,0,.26-.3)` (or `2px 2px 0 ...` for smaller controls), pressed state flips to `background: var(--screen); color: var(--ink); box-shadow: inset 0 0 0 2px var(--ink)` (i.e. "looks like the LCD screen when pressed"), `border-radius: 0` everywhere except round slider thumbs/shutter buttons. The rewrite's components each invented their own button treatment ad hoc, and several used the wrong CSS variables (`--well`/`--ink` at rest instead of `--shell-dark`/`--chrome`; `--accent`/`--well` pressed instead of `--screen`/`--ink`).

- **Add shared button/segment mixins** to `app/src/styles/` (e.g. `_mixins.scss`): a `pixel-button` mixin (rest: `background: var(--shell-dark); color: var(--chrome); box-shadow: 3px 3px 0 rgba(0,0,0,.26); border-radius: 0`; pressed/`[aria-pressed=true]`: `background: var(--screen); color: var(--ink); box-shadow: inset 0 0 0 2px var(--ink)`) and a smaller-control variant (`2px 2px 0 rgba(0,0,0,.22-.28)`). Apply it to every `.toggle`/`.seg`/`.btn`-equivalent class currently defined ad hoc in `TonePanel.module.scss`, `StylePanel.module.scss` (`.algoBtn`), `ExportPanel.module.scss`, `ImportBar.module.scss`, `Tabs.module.scss`.
- **Fix `.legend`** (`TonePanel.module.scss`, `StylePanel.module.scss`, `ExportPanel.module.scss`, `Tabs.module.scss`): match original's `font-size: 8.5px; letter-spacing: .2em` and restore the trailing divider line (`::after`) look.
- **Fix `.hint`/label sizing**: hints should be 10.5px (not 9.5px) at `line-height: 1.55`; slider `.label` should be 10.5px, `font-weight: 700`, `letter-spacing: .03em` (currently 400 weight, .06em) — see `Slider.module.scss`.
- **Fix `Tabs.module.scss`**: replace the underline-active-tab treatment with the original's bordered/LCD-highlight style (2px borders between tabs, active tab background `var(--screen)`/color `var(--ink)`), 8.5px/.05em text.
- **Fix Atomic skin's dead CSS** in `app/src/styles/_skins.scss`: the `[data-skin="atomic"] .wrap`/`.bar` selectors target class names (`.wrap`, `.bar`) that no longer exist (`globals.scss` uses `.app-wrap`; the bottom bar will be a CSS-module hashed class) — retarget them once the real class names are settled (see bottom-bar restoration below), or use a stable wrapper class name specifically kept unhashed for this purpose.
- **Restore circular slider thumbs**: `Slider.module.scss`'s thumb should be `border-radius: 50%`, ~36px (18px moz), with `box-shadow: 2px 2px 0 rgba(0,0,0,.32)` — matches original's circular "console key" thumbs. (Per-control letter-glyph icons inside the thumb are a separate, lower-priority item — see Phase 2.)
- **Restore checkbox-style toggles** where the original used a real checkbox look (`.check`, 24×24 box with a CSS checkmark on `:checked`) rather than a full-width pill button — currently "Invert"/"Show clipping"/"Number the frames" etc. are pill buttons; decide whether to keep the pill-button UX (arguably fine on touch) but only fix its shadow/color per the mixin above, or restore the literal checkbox look. Recommend: keep pill buttons (better touch target) but make sure they use the corrected mixin above so they at least match the rest of the button language.
- **Camera/Crop overlays**: `CameraOverlay.module.scss` / `CropOverlay.module.scss` currently hardcode raw colors (`#000`, `#C5C0B4`, `#222`/`#444`) instead of the skin CSS variables (`var(--page)`, `var(--shell)`, `var(--ink)`, `var(--accent)`) — retheme them so they respond to the active skin like the rest of the app. Restore the shutter button's halo ring (`box-shadow: 0 0 0 3px var(--shell|--accent)`), and match the original's dim overlay tint (`rgba(10,14,8,.66)`) instead of the current `rgba(0,0,0,.5)`.
- **Restore the unified fixed bottom bar** (structural + visual — see "Bottom bar restoration" below).

### Bottom bar restoration (decided: restore original layout)

- Replace the current split (`ImportBar` standalone + Export living in `ExportPanel` tab) with one fixed bottom bar component (new `components/BottomBar/BottomBar.tsx`) containing: Import button, Camera button (opens `CameraOverlay`, replacing the "tap the live viewfinder" entry point as the primary way in, though tapping the inline preview can still work too), a Photo/Video mode segmented toggle (bound to `deviceStore.device.capture`), and an accent "Export"/key button (`background: var(--accent); color: #fff`) that triggers the same export flow currently in `ExportPanel`'s button.
- `position: fixed; bottom: 0`, `border-top: 3px solid var(--shell-line)`, buttons use the `2px 2px 0 rgba(0,0,0,.3)` shadow variant, matching `index.html:204-217`.
- Decide whether the Export *tab* still exists for paper-width/margins/gap/numbering settings (recommended: yes — those are settings, not the action) while the actual "Export" trigger moves to the bottom bar's key button, mirroring the original's split between `#p-exp` (settings panel) and `#export2`/bottom-bar export action.
- The Photo/Video mode toggle in the bottom bar is what should gate whether `CameraOverlay` opens in photo-shutter mode or video-record mode (ties into Phase 3's video recording work — until that lands, Video mode can be present but inert/disabled).

## Phase 1 — Batch workflow + real export pipeline (highest-value functional gap)

The store actions already exist (`useBatchStore`'s `detachCurrent`, `applyToAll`, `toggleSkip`, `removeCurrent` in `app/src/state/batchStore.ts`) but are never called from any component — and `ExportPanel` lets you edit `device.gap`/`device.num`/`device.mtop`/`device.mbot`/`device.outMode` but the actual `doExport()` in `app/src/components/ExportPanel/ExportPanel.tsx` only renders the single current item to PNG, silently ignoring all of them.

- **Lot bar UI**: add a row of buttons (Detach / Apply to all / Skip / Discard) near the filmstrip in `PreviewScreen.tsx`, visible when `items.length > 1` (mirrors original's `.lotbar`, `index.html:1541,1563-1577`), wired to the existing `batchStore` actions.
- **Fix per-item state desync**: `TonePanel.tsx`'s glitch-enabled toggle is local `useState` derived once from the initial tone, not re-synced when `cur`/`item.own` changes — switching between batch items with different glitch settings won't update the toggle. Recompute it (or make it a derived value, not stored state) from `active.gsort`/`active.gshear` on every render.
- **Real export pipeline**: port `renderOne`/`buildStrip`/`withMargins`/frame-numbering from `index.html:2002-2098,2332-2342` into a `services/export.ts` — render every non-skipped batch item, compose them per `device.outMode` ('bande' = one vertical strip with `device.gap`px white between frames + optional numbering; 'frames' = separate PNGs), apply `device.mtop`/`device.mbot` white margins via `withMargins`.
- **Export sheet modal**: add a small modal (`components/ExportSheet/ExportSheet.tsx`) showing the rendered output(s) with prev/next paging for multi-frame output, save-instructions text (matches `index.html:2037-2049`), before triggering the actual download.
- **Fix export summary math**: `ExportPanel`'s summary line should show frame count, excluded-frame count, and total mm/px of paper (`index.html:2051-2077`'s `updateExpInfo()`), not just a static width/mode string.

## Phase 2 — Live style swatches + slider thumb icons (the app's core "wow" feature)

- **Live per-algorithm swatches**: `StylePanel.tsx`'s `.algoBtn` currently renders an identical static CSS gradient (`repeating-linear-gradient`) for all 12 styles. Port `swatch()`/`drawSwatches()`/`scheduleSwatches()` from `index.html:2486-2529`: render a small `<canvas>` per algorithm button, actually dithered with that algorithm via the engine, redrawn on resize/cell-size change (debounced). This is the single highest-impact visual fix for the app's actual purpose (comparing dither styles).
- **Slider thumb glyph icons**: port `THUMB`/`thumbURI`/`paintThumbs()` from `index.html:2531-2554` — a 36px circular SVG data-URI thumb per control with a letter glyph (S/W/G/D/C/P/E/V/M/H/N/T/B), skin-color-aware. Lower priority than the swatches; can follow once Phase 0's circular-thumb base styling is in.

## Phase 3 — Settings panel: calibration, presets, sharing, boot splash

Currently there is no 4th "Settings" tab at all; several of these have their math already ported and tested in `app/src/engine/calibration.ts` but no UI surfaces them.

- **Settings tab**: add a 4th tab (`components/SettingsPanel/SettingsPanel.tsx`) to the `Tabs` list in `App.tsx`.
- **Calibration UI**: "Print the chart" button (port `buildChart()`, `index.html:2344-2371`, fixing the original's `PA`-undefined bug already fixed in the engine port), "Print test strip" button (port `buildTest()`, `index.html:2372-2421`), and the mid-grey compensation slider + Apply button wired to the already-ported `engine/calibration.ts`'s `solveComp`/`refCoverage` (`index.html:2422-2437`).
- **Presets**: new `state/presetsStore.ts` (factory list of 5 named presets + save/delete, persisted like the original's `trame:presets` key, `index.html:2101-2136`), with a chip-list UI (`.chip`/`.preset-list` styling from `index.html:178-181`) at the top of `TonePanel.tsx` (mirrors original's placement under "Start here").
- **URL settings-link sharing**: port `stateToHash`/`hashToState`/`URLKEYS`/`DEVKEYS` (`index.html:2450-2483`) into `services/urlState.ts`, plus a "Copy settings link" button with clipboard-copy feedback.
- **Boot splash**: a boot overlay component with the animated wordmark + two-note Web Audio chime (gesture-armed for iOS) + a Settings toggle to disable it, persisted like the original's `trame:boot` key (`index.html:2557-2616`).
- **Undo/redo**: new `state/historyStore.ts` — debounced (350ms) commit snapshots, 40-deep stack, Undo/Redo buttons (mirrors `index.html:1444-1479,2167-2178`). Note this interacts with Phase 1's lot bar (discard/detach should also push history).

## Phase 4 — Camera robustness + video recording

- **Idle auto-shutoff**: stop the camera stream after 90s of inactivity while the inline live viewfinder is showing (`armIdle`/`IDLE_MS`, `index.html:1779-1799`) — currently the stream runs indefinitely.
- **visibilitychange/pagehide handling**: pause the stream (and any recording) when the tab backgrounds, resume the live viewfinder when it foregrounds again, matching `index.html:1789-1800`.
- **Native camera fallback**: when `getUserMedia` is unavailable, fall back to a hidden `<input type=file accept=image/* capture=camera>` (the original's `#fileCam`, `index.html:1838,1877`) instead of just failing.
- **In-camera tune drawer**: mirror the tone/style controls into a collapsible drawer inside `CameraOverlay` (`index.html:1590-1615`) so settings can be adjusted while framing, without leaving the camera view.
- **Video recording** (largest single remaining feature — treat as its own sub-project): port the `MediaRecorder` pipeline from `index.html:1895-1984` — mime-type negotiation (MP4 preferred for iOS Photos compatibility), canvas `captureStream`, a record button + timer + 60s cap, save/share via `navigator.share` with a download-link fallback, and a video-playback modal (`components/VideoModal/VideoModal.tsx`) before saving. This is the one item big enough to warrant its own dedicated planning/implementation pass rather than a quick add-on.

## Suggested execution order

Phase 0 (visual system) and Phase 1 (batch + export correctness) are the highest-value, most self-contained next steps and pair well together in one pass. Phase 2 (live swatches/thumbs) is next since it's the app's signature visual feature. Phases 3 and 4 are larger, more optional feature additions best tackled as separate, later passes — Phase 4's video recording in particular should get its own scoped plan when picked up.

## Verification

- `npm test` (Vitest) must keep passing throughout — the engine layer is untouched by any of this.
- After Phase 0: visually compare each of the 5 skins side-by-side against the original `index.html` (open both, same skin selected) for button/tab/thumb/legend treatment.
- After Phase 1: import a multi-photo batch, detach one item's settings, apply-to-all from another, skip one, discard one, then export as both "single strip" (with gap + numbering) and "separate frames" (with top/bottom margins) and confirm the output actually reflects all of those settings.
- After Phase 2: switch through all 12 algorithm buttons and confirm each swatch actually shows that algorithm's own dither pattern, not a shared placeholder.
- After Phase 3: run the calibration flow (print chart → read a step → apply compensation), save/delete a preset, copy/paste a settings link between two browser tabs, and toggle the boot splash off/on.
- After Phase 4: verify idle shutoff on a real device (leave the viewfinder open 90s+), background/foreground the tab while the camera is on, and record + save a video on both iOS and Android.
