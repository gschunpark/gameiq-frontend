# GameIQ Football

Responsive React + Vite football app. The original branding and sign-in implementation are preserved. No new dependencies are required.

## Current feature direction

- Built-in football lessons and rulebook lessons have been removed from the active app.
- Training is a Coming Soon screen for a future flow where a user asks a football question and AI creates a training experience. No AI request, generation, playable content, or new XP awards are implemented.
- Rulebooks is a Coming Soon screen for future user-uploaded team rulebooks. Upload and PDF-library controls are not exposed in the active app.
- Game Scenarios remains a placeholder.
- Home and Profile no longer advertise lessons, show lesson totals, or link to the retired lesson reader. Old lesson URLs display the Training placeholder.
- Accounts, sign-in, profile editing and pictures, teams, coach/member profiles, team management, privacy, settings, password changes, logout, and account deletion remain available.
- Previously saved progress, earned XP, and uploaded files have not been cleared. Previously earned XP remains visible.

## Run and validate

```sh
npm install
npm run dev
npm run build
npm test
```

On Windows with restricted PowerShell scripts, use `npm.cmd`. Password hashing requires localhost or HTTPS. To run the data checks without test-runner subprocesses, use `node --test --test-isolation=none tests/foundation.test.js` (Node 22+).

`node tests/browser-qa.mjs` checks the production build with an installed Windows Edge, using an isolated hidden browser profile in ignored `.qa/`. It tests eight viewport sizes, unavailable lesson/upload flows, accounts, profile pictures, teams, settings, and account deletion. It needs permission to start Edge and listen on local ports 5175 and 9224.

## Data and integration boundaries

This is a browser-local development app, not production authentication. Account data lives in `localStorage` under `gameiq.local.v1`. Passwords are salted PBKDF2-SHA256 hashes, not plaintext. Existing PDF blobs remain in IndexedDB (`gameiq-files`). Clearing browser data can remove local data.

Real shared accounts, recovery emails, cross-device synchronization, shared teams, enforceable privacy/permissions, and notifications need a secure backend. The app remains a responsive web app; native iPhone/Android packaging is not configured.

## Code organization

`src/auth`, `home`, `training`, `teams`, `profiles`, `rulebooks`, `settings`, `scenarios`, `xp`, `data`, and `components` separate the main features.

The earlier static lesson implementation is retained in `src/lessons` and `src/training/LessonCatalog.jsx`, and the earlier PDF library implementation in `src/rulebooks/RulebookLibrary.jsx`, for reference. These components are not routed or exposed. Existing data-logic tests continue checking preservation of old XP and account/team behavior. Future training generation and rulebook upload work should be added only when requested.
