# GameIQ Football

Responsive React + Vite football app. The original branding and sign-in implementation are preserved. No new dependencies are required.

## Current feature direction

- Built-in football lessons and rulebook lessons have been removed from the active app.
- Training is a Coming Soon screen for a future flow where a user asks a football question and AI creates a training experience. No AI request, generation, playable content, or new XP awards are implemented.
- Rulebooks is a Coming Soon screen for future user-uploaded team rulebooks. Upload and PDF-library controls are not exposed in the active app.
- Game Scenarios remains a placeholder.
- Home and Profile no longer advertise lessons, show lesson totals, or link to the retired lesson reader. Old lesson URLs display the Training placeholder.
- Sign In and Create Account now enter a temporary preview with any details or blank fields. No account lookup, password verification, account registration, or account persistence runs. Profile, pictures, team edits, and preferences work in memory only. Logout, End Preview, or reload clears them. Password changes and recovery are unavailable until real authentication is added.
- Previously stored browser data is left untouched and is not loaded into the preview. New account or session data is never written to localStorage, sessionStorage, or IndexedDB.

## Run and validate

```sh
npm install
npm run dev
npm run build
npm test
```

On Windows with restricted PowerShell scripts, use `npm.cmd`. To run the data checks without test-runner subprocesses, use `node --test --test-isolation=none tests/foundation.test.js` (Node 22+).

`node tests/browser-qa.mjs` checks the production build with an installed Windows Edge, using an isolated hidden browser profile in ignored `.qa/`. It tests unrestricted preview entry, session-only profile/team/preferences, responsive layouts, and resets after reload/logout. Browser storage is instrumented to reject any read/write attempt during the test. It needs permission to start Edge and listen on local ports 5175 and 9224.

## Data and integration boundaries

The active app keeps its preview state in React memory only. No credentials are retained, no account record is saved, and no previous session is restored. The earlier authentication and storage adapters are retained as inactive code for future integration. Old localStorage records (`gameiq.local.v1`) and PDF blobs (`gameiq-files`) are not read, changed, or removed by preview entry.

Real shared accounts, recovery emails, cross-device synchronization, shared teams, enforceable privacy/permissions, and notifications need a secure backend. The app remains a responsive web app; native iPhone/Android packaging is not configured.

## Code organization

`src/auth`, `home`, `training`, `teams`, `profiles`, `rulebooks`, `settings`, `scenarios`, `xp`, `data`, and `components` separate the main features.

The earlier static lesson implementation is retained in `src/lessons` and `src/training/LessonCatalog.jsx`, and the earlier PDF library implementation in `src/rulebooks/RulebookLibrary.jsx`, for reference. These components are not routed or exposed. Existing data-logic tests continue checking preservation of old XP and account/team behavior. Future training generation and rulebook upload work should be added only when requested.
