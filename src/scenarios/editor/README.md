# Play editor integration

The editor lives inside the existing Game Scenarios screen. The surrounding navigation, screens, and white/red/yellow/blue theme are unchanged. The current app has no AI scenario generator or model backend, so the entry point explicitly uses an authored 11-on-11 example. No questions, scoring, or XP are added.

## Components and data

- `PlayEditor.jsx`: drawing tools, player selection, pending changes, review, comparisons, version library.
- `PlayField.jsx`: shared SVG renderer and PNG export; final diagrams are generated from structured play data, never from a flat AI image.
- `samplePlay.js`: authored example and reference schema.
- `recognition.js`: deterministic geometry recognition and user corrections. It is not an AI inference service.
- `geometry.js`: line simplification, rounded vector paths, intersection tests.
- `model.js`: immutable selective application, history, schema validation, and basic alignment checks.
- `versions.js`: diagram-only local persistence under `gameiq.play-versions.v1`.

A future generator can provide a supported play through:

```jsx
<PlayEditor initialPlay={scenario} onClose={closeEditor} />
```

Validate generator output with `scenarioData` first. The current format is standard 11-on-11 American football, attacking upward. Field coordinates are yards: `x=0..53⅓`, `y=0..100`; `y=0` is the attacking goal line. Five-yard lines, yard numbers, and NFL-style hash marks are rendered from coordinates. The editor crops the field to the play while including every assignment; players are schematic symbols, not scale models.

Every player and assignment has a stable ID. Assignments refer to a player ID and contain a kind (`route`, `movement`, `coverage`, `blitz`, `block`), label, and ordered points. Their first point must match the player's starting position. The field separately holds the ball, line of scrimmage, and first-down marker; player edits do not move these markings.

## Editing behavior

Choose a player and start a mouse, pen, or touch stroke on that player. Draw routes, movement, defense, or blocking paths; move players by dragging or entering coordinates. Cross-out targets existing visible assignments. If a cross-out intersects multiple assignments, none of those removals is selected automatically. Erase removes temporary changes only. Per-player assignment removal is also available without a gesture.

Drawing interpretation recognizes common go, slant, post, out, crossing, and blitz shapes. Unrecognized multi-turn paths stay custom. Suggestions can be corrected in Changes Made before applying. Curved vector corners smooth paths without showing raw strokes in the final preview.

Changes Made supports selection, Select All, Deselect All, Delete Selected, per-change deletion, and Apply Selected Changes. Applying a subset leaves other assignments untouched. Moves are applied first, and only that player's assignment origins are translated. Route edits are anchored to the final position of their own player, even if a different pending move is left unchecked.

Undo/redo covers pending edits and selection/deletion. Keyboard shortcuts are Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z, and Ctrl/Cmd+Y outside text inputs. Escape cancels an unfinished stroke. Applying creates a before/after preview; Keep Editing makes the clean preview editable and retains unselected pending instructions. Discard restores the play that was opened, without deleting saved versions.

Basic warnings cover player counts, inbounds positions, neutral-zone alignment, offensive line count, covered eligible receivers, center/ball separation, disconnected paths, and overlaps. Warnings can be corrected in the editor. Saving requires review acknowledgement when warnings remain; structurally invalid data still cannot be saved. These checks are not a complete officiating or safety system. The team's adopted rules control. Reference: [NFL rulebook](https://operations.nfl.com/rules-officiating/2026-nfl-rulebook).

## Persistence and export

Only an explicit save writes local play data. Original and updated diagrams are separate immutable versions with root and parent references, timestamps, and names. Reopening makes a version editable; Compare to Original compares it with its family root. Intermediate deletion reconnects child ancestry. Delete modified versions before deleting their original. The library currently permits up to 50 versions.

The schema strips extra fields, including account details, credentials, and raw strokes. Existing account storage is never read or written. Saved plays are device-local and visible to anyone using this browser; there are no shared accounts or cross-device sync. Corrupt storage and quota failures are surfaced without overwriting existing saved data.

PNG export rasterizes the same clean SVG to an 1800-pixel-wide image with embedded field/player coordinates and vector arrow geometry. No remote image/model service is used.

## Integration still needed

An actual AI scenario generator and model-based drawing interpretation need a backend/provider adapter, request validation, and model-output review. Replace or augment `interpretDrawing` behind that boundary; never embed provider API keys in this Vite frontend. Persisted shared versions and permissions also require a backend. The authored preview remains clearly labeled until those services exist.
