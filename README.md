# printpak

Printpak turns a photo (or a live camera shot) into a dithered black-and-white
image sized for a small thermal receipt printer, and lets you print/export it.
You pick a dithering algorithm (Floyd–Steinberg, Atkinson, Bayer, halftone,
ASCII/glyph art, a Game Boy Camera look, etc.), tune white point/contrast/glitch
effects, then export a PNG (or a batch of them stitched into one strip) ready
to send to the printer.

It's built as an installable PWA — "Add to Home Screen" on iOS/Android — with
no app store, no backend, and no image ever leaving the device: everything is
computed client-side in the browser.

## Project layout

```
archive/    the original single-file implementation (index.html + sw.js +
            manifest.json), kept for reference — no longer deployed
app/        the current app: a Vite + React + TypeScript rewrite
  src/
    engine/       pure dithering/image-processing functions, unit-tested
    components/   UI (React components + CSS Modules, one per component)
    state/        Zustand stores (tone/style settings, device/paper prefs,
                   the photo batch, presets, undo/redo, UI flags…)
    hooks/        camera, import, export, live preview, etc.
    services/     framework-free helpers (export pipeline, calibration
                   chart, URL-encoded settings links, storage…)
  ROADMAP.md  the gap-closing plan this rewrite has been following
```

Everything you'll actually work on day to day lives under `app/`.

## Prerequisites

You need [Node.js](https://nodejs.org/) (which comes with `npm`). If you
don't have it yet:

- **macOS**: `brew install node` (install [Homebrew](https://brew.sh) first if
  you don't have it), or download an installer from
  [nodejs.org](https://nodejs.org/).
- **Windows/Linux**: download an installer from
  [nodejs.org](https://nodejs.org/) — pick the current **LTS** version.

Check it worked:

```sh
node --version   # v20 or newer
npm --version
```

You'll also want [Git](https://git-scm.com/) to clone the repo, and a code
editor ([VS Code](https://code.visualstudio.com/) is a good default).

## Setting up the project

```sh
git clone git@github.com:Shepplock/tram.git
cd tram/app
npm install
```

`npm install` reads `app/package.json` and downloads every dependency (React,
Vite, TypeScript, etc.) into `app/node_modules/` — this can take a minute the
first time.

## Developing

From inside `app/`:

```sh
npm run dev
```

This starts a local dev server (usually at `http://localhost:5173/`) with hot
reload — edit a file under `src/` and the browser updates instantly. Leave
this running while you work.

A few things to know:

- **Camera access needs HTTPS (or `localhost`).** Testing on your own machine
  in a browser at `localhost` works fine. To test the camera (or anything
  else) on a *phone*, you need HTTPS there too — see "Testing on a phone"
  below.
- **Run the tests**: `npx vitest run` (or `npx vitest` to watch and re-run on
  change). These cover the dithering engine — the pure math, not the UI.
- **Type-check + production build locally**: `npm run build`. This is the
  same build the deploy workflow runs; useful to catch TypeScript errors
  before pushing.
- **Preview a production build**: `npm run build && npm run preview` — serves
  the actual built output, closer to what users will get than the dev server.

## Testing on a phone

Camera and video-recording features can't be exercised on a desktop browser
alone — you'll want to load the dev server on an actual phone at some point.
The dev server already has a self-signed HTTPS certificate configured
(`@vitejs/plugin-basic-ssl` in `app/vite.config.ts`), so the simplest way is
over your local Wi-Fi, no external service needed:

1. Make sure your phone and computer are on the **same Wi-Fi network**.
2. From `app/`, run:
   ```sh
   npm run dev -- --host
   ```
3. Vite prints several `Network:` URLs, one per network interface on your
   computer — pick the one for your actual Wi-Fi adapter (commonly named
   `en0` on macOS). Ignore any `bridge*`/`utun*`/VPN-looking addresses; your
   phone can't reach those.
4. Open that `https://<lan-ip>:5173/` URL on your phone. The browser will
   warn about the self-signed certificate — this is expected (there's no
   real certificate authority behind it), tap through it once: "Advanced →
   Proceed" (Android/Chrome) or "Show Details → visit this website" (iOS
   Safari).

If your phone can't reach your computer over Wi-Fi (e.g. client-isolated
guest networks, or you're not on the same network at all), a tunnel is the
fallback — `npx cloudflared tunnel --url http://localhost:5173` or
`npx localtunnel --port 5173`, no signup needed for either. This adds a
third-party relay in the middle, though, so it's less reliable than the
same-Wi-Fi method above (it's also the reason the dev server has
`server.allowedHosts: true` in `vite.config.ts` — otherwise Vite rejects
requests carrying a tunnel's hostname).

## Deploying

The live site is <https://shepplock.github.io/tram/> (GitHub Pages).

Deployment is automatic: pushing to `main` (with changes under `app/`)
triggers `.github/workflows/deploy.yml`, which installs dependencies, runs
the test suite, builds the app, and publishes `app/dist` to GitHub Pages.
You don't need to build or deploy anything by hand — just merge your PR into
`main` and the workflow does the rest. You can also trigger it manually from
the **Actions** tab on GitHub ("Deploy to GitHub Pages" → *Run workflow*).

If you ever need to reproduce exactly what the workflow does, locally:

```sh
cd app
npm ci        # like `npm install`, but exact/reproducible from the lockfile
npx vitest run
npm run build # outputs to app/dist/
```

### One-time repo setup (already done, noted for reference)

For the workflow to be allowed to publish, the repo's **Settings → Pages**
must have "Build and deployment" → **Source** set to **"GitHub Actions"**
(not "Deploy from a branch"). If Pages ever starts serving a stale/blank
page after a deploy, that setting is the first thing to check.

## Why a rewrite?

The `archive/` folder holds the original implementation: one 114 KB
`index.html` with no build tooling, all CSS/DOM/JS inline. It worked, but was
hard to maintain and test. `app/` is a from-scratch rewrite in React +
TypeScript that keeps the same visual language and feature set (see
`app/ROADMAP.md` for the point-by-point porting plan) while making the
codebase something you can actually navigate, type-check, and unit-test.
