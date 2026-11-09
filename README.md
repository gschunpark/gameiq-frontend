# GameIQ Football

Responsive React + Vite football app with an Express endpoint for AI training generation. The original branding and sign-in implementation are preserved.

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

Video uploads are optional. Enter a scenario and question to generate a level without selecting a file. Question-only requests contain just `{ question }`, skip Roboflow, return an empty `predictions` array, and need only `OPENAI_API_KEY`. To include video context, upload a clip and select a frame; `ROBOFLOW_API_KEY` is required only when a frame is included. **Remove selected frame** switches back to question-only generation. When sending a frame, both `image` and `mimeType` must be provided together.

Use Node 22+ and run `npm install`. Copy `.env.example` to `.env` and set `ROBOFLOW_API_KEY` (from [Roboflow settings](https://app.roboflow.com/settings/api)) and `OPENAI_API_KEY`. `OPENAI_MODEL` defaults to `gpt-4.1-mini`. These are server-only secrets: never use `VITE_` prefixes or import server modules into browser code. `.env` is already ignored. No coding-agent instruction or onboarding files exist in this checkout; this section is the integration's developer guidance.

Run `npm run dev` to start Vite and Express together. Alternatively run `npm run dev:client` and `npm run dev:server` in separate terminals. Vite forwards `/api` to `127.0.0.1:3001`; keep `PORT=3001` for this setup. `npm run start:server` runs the API without watch mode. A production host must run the Node service and route `/api` to it on the same origin; a static-only deployment cannot generate levels. This service does not implement account authentication; its per-process IP limit (10 requests/minute) is a basic development guard, not a shared production quota.

In Training, upload a video, scrub to a clear moment, select **Use this frame**, enter the situation and what to fix, then choose **Create my level**. Only the selected JPEG (quality 0.85, longest side at most 1280 px) leaves the browser; the video stays local. The endpoint accepts `{ image: "<raw base64>", mimeType: "image/jpeg" | "image/png", question: "..." }`, limits decoded images to 5 MiB and questions to 2000 characters, and rejects remote URLs. It returns `{ level, predictions }` or `{ error: { code, message } }`. Neither images nor secrets are logged or persisted.

The workflow is `gameiq-bot/american-football-vamerican-football-wo4dt-w754f-1-rfdetr-small-t1-logic`. MCP inspection confirmed one `image` input, no runtime parameters, and one `predictions` output. An OAuth base64 smoke run returned `[{ predictions: { image: { width, height }, predictions: [...] } }]`; the sanitized fixture in `tests/fixtures/roboflow-football.json` records that real response. The currently published JS SDK (`@roboflow/inference-sdk` 0.4.0) only exposes WebRTC methods, so the still-frame client uses REST with `Authorization: Bearer` and bounded retries/timeouts. Roboflow gets the frame; OpenAI gets only the question and six fields per detection (class, x, y, width, height, confidence). No polygons are retained. The workflow declares no image outputs.

`server/level-schema.js` validates the existing demo's play, player route, four-answer tuple, and hint format, including animation-safe references and coordinates. The server retries invalid LLM JSON once and supplies a unique level ID, zero XP, and section metadata. Generated levels use the same animated renderer and answer progression as the demo. Object boxes cannot establish team roles or motion: generated plays are hypothetical practice variations, not factual reconstructions. Levels stay in React memory and disappear on navigation/reload.

Validate with `npm run build` and `npm test`. This repository has no lint script or lint configuration. `node tests/video-level.browser.mjs` exercises capture from an actual browser-recorded WebM, server validation, errors, playback, and all five plays with mocked providers; it needs installed Windows Edge and permission for local ports/subprocesses. `node tests/browser-qa.mjs` runs existing regressions. For a live provider smoke test after setting `.env`, run `npm run test:smoke -- path/to/frame.jpg "Describe the scenario and what to fix"`. This prints only detection/scenario counts. OAuth MCP access is separate from the API keys needed by the local server.
