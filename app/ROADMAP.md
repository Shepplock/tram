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

- [x] **Idle auto-shutoff**: stop the camera stream after 90s of inactivity while the inline live viewfinder is showing (`armIdle`/`IDLE_MS`, `index.html:1779-1799`). Done via a `pointerdown`-reset timeout in `LiveViewfinder.tsx`.
- [x] **visibilitychange/pagehide handling**: pause the stream when the tab backgrounds, resume when it foregrounds again, matching `index.html:1789-1800`. Done inside `hooks/useCamera.ts` (shared by the inline viewfinder and the camera overlay).
- [x] **Native camera fallback**: when `getUserMedia` is unavailable, fall back to a hidden `<input type=file accept=image/* capture=environment>` (the original's `#fileCam`, `index.html:1838,1877`). Done in `CameraOverlay.tsx`, reusing `useImportFiles().addFiles()`.
- [x] **In-camera tune drawer**: a collapsible drawer inside `CameraOverlay` mirroring Tone/Style (algorithm grid + White/Sky/Gamma + Pixel-or-Cell size), reusing the shared `useActiveTone()` hook (`index.html:1590-1615`). Done.
- [x] **Video recording** — implemented per the Phase 4b scope below (2026-09-03). Real-device pass (iOS Safari + Android Chrome) from that scope's build order is still outstanding.

## Phase 4b — Video recording (scoped 2026-09-03, implemented 2026-09-03)

The largest remaining feature, and the one place the rewrite still has a real capability gap rather than a styling one. Original implementation: `index.html:1895-1984` (recording pipeline), `1849-1865` (shared render loop that feeds it), `1867-1886` (mode switch wiring), markup at `646-702` (camera screen: fps segment, rec button, timer) and `722-727` (`#vid` playback modal).

### What it needs to reuse

- `device.fps` already exists in `deviceStore.ts` (`DEFAULT_DEVICE.fps = 8`) and is persisted — no store change needed there.
- `device.capture: 'photo' | 'video'` already exists and already drives the BottomBar's Photo/Video segment (Phase 0). Today "Video" is wired but inert (disabled with a "coming soon" title in `BottomBar.tsx`) — this phase is what makes it real.
- `useCamera`/`useLiveDither` (stream lifecycle + dithered render loop) stay as-is; recording taps into the same rendered frames rather than opening a second stream.
- `useActiveTone` (tone/style while framing) is unaffected — recording uses whatever `active` tone is current, same as a photo capture.

### New pieces

1. **`services/videoRecording.ts`** — pure, testable helpers:
   - `pickMimeType(): string | null` — ports the `VMIME` IIFE (`index.html:1897-1903`): probes `MediaRecorder.isTypeSupported` in order `video/mp4;codecs=avc1.42E01E`, `video/mp4`, `video/webm;codecs=vp9`, `video/webm;codecs=vp8`, `video/webm`, returns the first supported one or `null` if `window.MediaRecorder` doesn't exist. MP4 first because it's the only container iOS Photos will import via the share sheet.
   - `formatElapsed(ms): string` — ports `fmtT()` (`index.html:1918-1921`), `"● m:ss"`.
   - No DOM/canvas here — keep this file dependency-free like the rest of `services/`, same reasoning as `calibrationChart.ts`.

2. **`hooks/useVideoRecording.ts`** — owns the MediaRecorder lifecycle:
   - Holds a hidden recording `<canvas>` (ref, created once), separate from the live-preview canvas — ports `pushFrame()` (`index.html:1910-1917`): nearest-neighbor-upscales the already-dithered preview frame so the encoder gets a canvas whose shortest side is ~1080px (`k = max(1, round(1080/w))`), with `imageSmoothingEnabled = false` so upscaling doesn't blur the dither pattern into grey.
   - `start(previewCanvas: HTMLCanvasElement)`: pushes one frame immediately, then `recCanvas.captureStream(device.fps)` → `new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 })` with a fallback to the no-options constructor if that throws (mirrors the original's nested try/catch, `index.html:1926-1928`). `rec.start(300)` (300ms timeslice, so a crash/force-quit doesn't lose the whole clip).
   - A `requestAnimationFrame`-driven push loop while recording, gated to `device.fps` (reuses the same gating idea as `useLiveDither`'s `LIVE_FPS` gate, just at the recording rate instead) — this replaces the original's single shared `loop()` that gated on `recording() ? device.fps : LIVE_FPS` and called `pushFrame` inline; here it's a second small effect that reads from the existing preview canvas each tick instead of restructuring `useLiveDither`.
   - 60s hard cap via `setInterval`/timer, matching `index.html:1946`'s guard rail ("a minute is enough on a roll" — thermal-printer-strip framing, but keep the cap regardless since it's also what bounds encoder memory).
   - `stop()`: calls `rec.stop()`; `onstop` assembles `new Blob(chunks, { type: mimeType })` and resolves it to the caller.
   - Returns `{ mimeType, recording: boolean, elapsedMs: number, start, stop }`. No blob storage in the hook — the caller (CameraOverlay) receives it via a callback and owns what happens next, so this hook's job is strictly "manage the recorder", same separation `useCamera` already has from "what do you do with a shot".

3. **`components/VideoModal/VideoModal.tsx` + `.module.scss`** — playback/save screen, structurally identical to `ExportSheet` (own overlay, not sharing its store since the payload is a video blob, not canvases):
   - `<video controls loop playsInline>` bound to `URL.createObjectURL(blob)`, revoked on close and on replacing it with a new recording.
   - Info line: format (`MP4`/`WebM` from `blob.type`) · `device.fps` fps · size in MB (`(blob.size/1048576).toFixed(1)`) — ports `showVideo()` (`index.html:1951-1959`).
   - **Save video** button: `navigator.canShare?.({ files: [file] })` → `navigator.share({ files: [file] })` (this is what actually gets a video into iOS Photos); catch `AbortError` silently (user cancelled the share sheet); otherwise fall back to a synthetic `<a download>` click + `URL.revokeObjectURL` after 5s (ports `index.html:1965-1976`). This is the one save path in the whole app that *isn't* "right-click / long-press the image" — flag that in the UI copy so it doesn't read like the PNG export flow.
   - **Close** button: pauses the `<video>`, revokes the URL, unmounts.

4. **`CameraOverlay.tsx` changes**:
   - When `device.capture === 'video'` **and** `pickMimeType()` returned non-null: swap the round photo shutter for a record button (same circular button, original turns it into a rounded-square while active via `#recBtn.on` — port that as an `aria-pressed`-driven modifier class) and show the fps segment (4/8/12/24, mirrors `#camFps`) plus an "● 0:00" timer badge while recording (top-left over the stage, `index.html:240-242`).
   - When `device.capture === 'video'` but `pickMimeType()` is `null` (no `MediaRecorder`, or no supported mime — most likely: desktop Safari or an old Android WebView): behave like `capture:'photo'` instead of showing a dead button — this is the graceful-degradation path the original does once at boot (`index.html:1977-1983`) by hiding the Video mode button entirely; doing it lazily per-render here is simpler and avoids a global mutable flag.
   - Tapping record calls `useVideoRecording().start(previewCanvasRef.current)`; tapping again (or hitting the 60s cap) calls `.stop()` and receives the blob via callback, which opens `VideoModal`.
   - Recording plugs into the same idle/visibility handling already done for photos in `useCamera` — but recording specifically should also hard-stop on `visibilitychange`→hidden (the original's `stopRec()` inside the visibility handler, `index.html:1791-1794`), not just pause the stream, since a MediaRecorder left running in a backgrounded tab is exactly the kind of thing that drains a battery unnoticed. Wire this as an effect in `useVideoRecording` itself (it already owns the recorder) rather than threading it through `useCamera`.
   - The Tune drawer stays usable while recording (original doesn't block it either) — tone/style changes mid-recording just show up in the next pushed frame, which is expected/desired (it's a live effects recorder, not a strict "no changes once you hit record" tool).

5. **`BottomBar.tsx`**: remove the `disabled`/"coming soon" state on the Video mode button once recording actually works, gated on `pickMimeType() !== null` (desktop-without-MediaRecorder still sees it disabled, which is honest rather than confusing).

### Known risk areas — worth a dedicated real-device pass before calling this done

- **iOS Safari MediaRecorder/mp4 support is version-dependent.** Older iOS versions may only support WebM or nothing at all; the mime-probe handles this, but "Save" via `navigator.share` on a WebM blob may not import into Photos even though the share sheet appears — test on the actual oldest iOS version this needs to support.
- **`canvas.captureStream()` frame pacing is inconsistent cross-browser** — some browsers only emit a new frame on canvas mutation rather than at a fixed rate, which can make the requested fps a ceiling rather than a guarantee. Not fatal (the original has the same behavior), but worth confirming actual output fps roughly matches the selected one.
- **Running two canvases (dithered preview + upscaled recording buffer) concurrently** is real CPU/battery cost on top of what the live viewfinder already does — worth a quick before/after battery-drain sanity check on a phone, not just "it works in a desktop browser tab."
- **`navigator.share({ files })` is unavailable on most desktop browsers** — the download-link fallback is the actual save path there, and it's the least-tested path since development happens mostly in a desktop browser. Explicitly test the fallback, not just the primary path.
- **60s of frames at up to 1080px-upscaled canvas size held as MediaRecorder chunks** is a real memory footprint on a low-end phone; if this turns out to matter, lowering the upscale target (currently ~1080px shortest side, matching the original) is the first knob to revisit — not in scope to pre-optimize now, just flag it.

### Suggested build order (checkpointed like the earlier phases, so it can be tested incrementally rather than as one big drop)

1. `services/videoRecording.ts` (mime probe + time formatter) — no UI yet, sanity-check `pickMimeType()`'s result in the console on a couple of real browsers/devices.
2. Wire the fps segment + record-button swap in `CameraOverlay` with **no actual recording** yet (record button just logs a click) — confirms the UI/mode-switch plumbing before the harder MediaRecorder part.
3. `hooks/useVideoRecording.ts` with real start/stop, no modal yet — confirm a recording produces a non-empty Blob of the expected mime type (log size/type on stop).
4. `VideoModal` + save/share flow.
5. 60s cap + visibility/backgrounding hard-stop.
6. Real-device pass: record and save on iOS Safari and Android Chrome; confirm a saved clip actually opens/plays; confirm the desktop download fallback also produces a playable file.

## Suggested execution order

Phase 0 (visual system) and Phase 1 (batch + export correctness) are the highest-value, most self-contained next steps and pair well together in one pass. Phase 2 (live swatches/thumbs) is next since it's the app's signature visual feature. Phase 3 and Phase 4's non-video items are larger, more optional feature additions — done. Phase 4b (video recording) is scoped above and is the one remaining item; per its own build order, it should land in checkpoints rather than one drop, with a mandatory real-device (iOS + Android) pass before it's considered finished.

## Verification

- `npm test` (Vitest) must keep passing throughout — the engine layer is untouched by any of this.
- After Phase 0: visually compare each of the 5 skins side-by-side against the original `index.html` (open both, same skin selected) for button/tab/thumb/legend treatment.
- After Phase 1: import a multi-photo batch, detach one item's settings, apply-to-all from another, skip one, discard one, then export as both "single strip" (with gap + numbering) and "separate frames" (with top/bottom margins) and confirm the output actually reflects all of those settings.
- After Phase 2: switch through all 12 algorithm buttons and confirm each swatch actually shows that algorithm's own dither pattern, not a shared placeholder.
- After Phase 3: run the calibration flow (print chart → read a step → apply compensation), save/delete a preset, copy/paste a settings link between two browser tabs, and toggle the boot splash off/on.
- After Phase 4 (camera robustness): verify idle shutoff on a real device (leave the viewfinder open 90s+), background/foreground the tab while the camera is on, and confirm the native-camera fallback actually triggers when `getUserMedia` is blocked/unavailable.
- After Phase 4b (video recording): record and save a video on both iOS Safari and Android Chrome, confirm the saved clip actually opens/plays (iOS via the share sheet into Photos, Android via the download fallback), confirm the 60s cap auto-stops, and confirm backgrounding the tab mid-recording hard-stops it rather than leaving it running.

---
## Original context (superseded by the roadmap above, kept for history)

Print Pak is currently a single 114KB `index.html` file (plus `sw.js`/`manifest.json`) with no build tooling: all CSS, DOM, and two `<script>` blocks (a clean pure-function "engine" for dithering/image processing, and a much larger "app" block for state/DOM/device APIs) live inline. The person building this app has no dev experience and wants it usable on their phone (iOS + Android) without going through app store submission. The goal of this refactor is:
1. A maintainable, componentized React codebase with real separation of concerns (pure engine vs. UI vs. state vs. device-API hooks).
2. Ship it as an installable PWA (Add to Home Screen on iOS/Android) — no Apple/Google developer accounts, no store review.

## Stack decisions

- **Vite + React** — zero-config dev server/build, easiest for a project with a non-developer owner to eventually run (`npm run dev` / `npm run build`).
- **TypeScript** — the engine is full of array-shape-sensitive pure functions (canvas ImageData buffers, kernel matrices); type-checking catches the kind of bug already found in the current code (`buildChart()` references an undefined `PA` variable — a live ReferenceError bug in the "print calibration chart" feature, to be fixed during the port).
- **SCSS + CSS Modules** (one `.module.scss` per component) — preserves the existing multi-skin theming approach (CSS custom properties toggled via a `data-skin` attribute), gives real style scoping, no extra runtime cost for a canvas-heavy app. No Tailwind/styled-components.
- **Zustand** for state — split into stores that mirror the current app's module boundaries: `toneStore` (tone/style config), `deviceStore` (printer/paper prefs), `batchStore` (multi-image lot + per-item overrides), `historyStore` (undo/redo), `cameraStore` (live camera/recording), `presetsStore`.
- **vite-plugin-pwa** — generates the service worker + manifest instead of hand-maintaining `sw.js`, preserving the cache-first offline behavior.
- **Vitest** — port `tests.html`'s engine assertions (blur, all 12 dither algorithms, `expand`, GB Cam, glitch effects, full `process()` pipeline, white-point solver, calibration math) into real unit tests against the ported engine module. This removes the current fetch-and-eval-index.html hack entirely.
- **Rollout:** full rewrite in a new Vite project, built out screen by screen, validated against the current `index.html` for feature parity, then swapped in as the deployed app. The current single-file app stays as the working reference/fallback until parity is confirmed.

## Target structure

```
src/
  engine/           # pure functions, no DOM/React deps — ported ~1:1
    blur.ts
    kernels.ts        # KERNELS, BAYER, BAYER8, HALFTONE, buildBlueNoise
    dither.ts
    glitch.ts          # pixelSort, rowShear, mulberry, percentile
    process.ts         # core process() pipeline
    glyph.ts           # ASCII/glyph rendering
    gbcam.ts           # GB Cam renderer
    calibration.ts     # refCoverage, solveComp
    whitepoint.ts       # solveWhite
    index.ts
  state/
    toneStore.ts  deviceStore.ts  batchStore.ts
    historyStore.ts  cameraStore.ts  presetsStore.ts
  components/
    TitleBar/  PreviewScreen/  Filmstrip/  CoverageMeter/
    tabs/TonePanel/  tabs/StylePanel/  tabs/ExportPanel/  tabs/SettingsPanel/
    BottomBar/  CameraOverlay/  CropOverlay/  VideoModal/  ExportSheet/  BootSplash/
    (each: Component.tsx + Component.module.scss)
  hooks/
    useCamera.ts  useVideoRecording.ts  useUndoRedo.ts
    useRenderScheduler.ts  useSwatches.ts  useUrlStateSync.ts
  services/
    storage.ts        # localStorage wrapper (replaces `store` object)
    share.ts          # navigator.share / clipboard fallback
    urlState.ts        # stateToHash / hashToState
  styles/
    _skins.scss        # the 5 data-skin theme variable sets
    _mixins.scss
    globals.scss
  App.tsx
  main.tsx
public/
  manifest.json (generated/managed by vite-plugin-pwa)
  icons (existing icon-*.png assets, reused as-is)
```

## Porting plan by area

- **Engine** (`index.html:743–1313`) → `src/engine/*`: near-verbatim port, kept framework-free. Fix the `PA` undefined-variable bug in `buildChart()` while porting calibration code.
- **Screens/overlays** (`index.html:335–741`) → components listed above, 1:1 with current DOM sections (title bar, sticky preview/filmstrip/coverage meter, 4 tabs, bottom bar, camera overlay, crop overlay, video modal, export sheet, boot splash).
- **State/app logic** (`index.html:1315–2617`) → split across Zustand stores + hooks per the grouping found during exploration (undo/redo history, batch/lot management, tone/style control wiring, import pipeline, live camera module, video recording module, export module, presets, calibration, URL state sharing, swatches, boot splash chime).
- **Styling** (`index.html:11–321`) → `styles/_skins.scss` for the 5 theme variable sets (kept as CSS custom properties so runtime skin-switching still works), remaining component styles distributed into each component's `.module.scss`.
- **PWA shell** (`sw.js`, `manifest.json`) → replaced by `vite-plugin-pwa` config with equivalent cache-first strategy (ignore query-string requests, network-fallback to `index.html`, versioned cache cleanup on activate).
- **Tests** (`tests.html`) → `src/engine/*.test.ts` via Vitest, same assertions (dither coverage/threshold correctness, blue-noise determinism/permutation, glitch mean-preservation and seed-determinism, full pipeline invariants, white-point solver convergence, calibration monotonicity).

## Verification

- `npm run dev` — manually exercise the golden path (import photo → adjust tone/style → export) and edge cases (batch import with per-item overrides + undo/redo, live camera capture on a real phone over LAN/HTTPS, video recording + save/share, crop/rotate, calibration chart/test-strip, presets save/delete, skin switching, URL settings-link round-trip) against the current `index.html` for parity.
- `npm run test` (Vitest) — engine unit tests must pass, covering the same properties `tests.html` currently checks.
- `npm run build` + serve the `dist/` output over HTTPS (required for service worker + camera APIs) on an actual iOS and Android phone; confirm "Add to Home Screen" install works and the app runs offline after first load.
