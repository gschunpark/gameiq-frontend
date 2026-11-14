# GameIQ Football

Responsive React + Vite football app with a standalone Express backend for AI training generation. The original branding and sign-in implementation are preserved.

## Current feature direction

- Built-in football lessons and rulebook lessons have been removed from the active app.
- Training supports a local video upload, a selected still frame, and a question to generate five animated practice scenarios. The authored demo remains available and awards 50 XP once per preview session. Generated practice awards no XP.
- Rulebooks is a Coming Soon screen for future user-uploaded team rulebooks. Upload and PDF-library controls are not exposed in the active app.
- Game Scenarios generation remains Coming Soon. Its **Open Play Editor** preview supports editing a clearly labeled authored play with routes, movement, defensive/blocking assignments, selective changes, undo/redo, clean before/after diagrams, device-local versions, and PNG export. Drawing interpretation is local geometry, not a connected AI model. See [editor integration](src/scenarios/editor/README.md).
- Home and Profile no longer advertise lessons, show lesson totals, or link to the retired lesson reader. Old lesson URLs display the Training placeholder.
- Sign In and Create Account now enter a temporary preview with any details or blank fields. No account lookup, password verification, account registration, or account persistence runs. Profile, pictures, team edits, and preferences work in memory only. Logout, End Preview, or reload clears them. Password changes and recovery are unavailable until real authentication is added.
- Previously stored account data is left untouched and is not loaded into the preview. New account or session data is never written to localStorage, sessionStorage, or IndexedDB. Explicitly saved play versions use a separate diagram-only localStorage key, `gameiq.play-versions.v1`; those diagrams survive reloads and contain no account details.

## Run and validate

```sh
npm install
npm run dev
npm run build
npm test
```

On Windows with restricted PowerShell scripts, use `npm.cmd`. To run the data checks without test-runner subprocesses, use `node --test --test-isolation=none tests/foundation.test.js` (Node 22+).

`node tests/browser-qa.mjs` checks the production build with an installed Windows Edge, using an isolated hidden browser profile in ignored `.qa/`. It tests unrestricted preview entry, session-only profile/team/preferences, responsive layouts, and resets after reload/logout. It also checks real mouse/touch play editing, selections, before/after diagrams, version persistence, warnings, and PNG downloads. Browser storage is instrumented to reject account reads/writes while allowing only the separate play-version key. It needs permission to start Edge and listen on local ports 5175 and 9224.

## Data and integration boundaries

The active app keeps its preview state in React memory only. No credentials are retained, no account record is saved, and no previous session is restored. The earlier authentication and storage adapters are retained as inactive code for future integration. Old localStorage records (`gameiq.local.v1`) and PDF blobs (`gameiq-files`) are not read, changed, or removed by preview entry.

Real shared accounts, recovery emails, cross-device synchronization, shared teams, enforceable privacy/permissions, and notifications need a secure backend. The app remains a responsive web app; native iPhone/Android packaging is not configured.

## Code organization

`src/auth`, `home`, `training`, `teams`, `profiles`, `rulebooks`, `settings`, `scenarios`, `xp`, `data`, and `components` separate the main features.

The earlier static lesson implementation is retained in `src/lessons` and `src/training/LessonCatalog.jsx`, and the earlier PDF library implementation in `src/rulebooks/RulebookLibrary.jsx`, for reference. These components are not routed or exposed. Existing data-logic tests continue checking preservation of old XP and account/team behavior. Future rulebook upload work should be added only when requested.

## Video-to-level setup

Level generation is served by the separate `gameiq-backend` repository (Express API, Roboflow + OpenAI providers, request/level validation, API keys). This repo contains only the Vite frontend.

For local development, start the backend (`npm run dev` in `gameiq-backend`, listening on `127.0.0.1:3001`), then run `npm run dev` here. Vite forwards `/api` to `127.0.0.1:3001`. Without the backend the UI still runs, but **Create my level** fails. A production host must route `/api` to the backend on the same origin; a static-only deployment cannot generate levels.

Video uploads are optional. A question-only request sends just `{ question }`. To include video context, upload a clip, scrub to a clear moment, select **Use this frame**, enter the situation and what to fix, then choose **Create my level**. Only the selected JPEG (quality 0.85, longest side at most 1280 px) leaves the browser; the video stays local. The request is `{ image: "<raw base64>", mimeType: "image/jpeg" | "image/png", question: "..." }` and the response is `{ level, predictions }` or `{ error: { code, message } }`. Generated levels use the same animated renderer and answer progression as the demo, stay in React memory, and disappear on navigation/reload. Never put provider API keys in this frontend.

Validate with `npm run build` and `npm test`. This repository has no lint script or lint configuration. `node tests/browser-qa.mjs` runs the browser regressions.
