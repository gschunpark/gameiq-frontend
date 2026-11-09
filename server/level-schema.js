import { z } from 'zod';
import { formation } from '../src/training/dummyLevel.js';

const text = z.string().trim().min(1).max(1200);
const id = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
const point = z.tuple([z.number().min(15).max(485), z.number().min(15).max(530)]);
const player = z.object({ id, label: z.string().min(1).max(5), side: z.enum(['offense', 'defense']), points: z.array(point).min(2).max(8) }).strict();
const actions = ['hold', 'retreat', 'runLeft', 'runRight', 'runMiddle'];
const play = z.object({
  id, title: text, situation: text, description: text, question: text,
  formation: z.enum(['shotgun', 'under']), correct: z.number().int().min(0).max(3),
  target: id, highlights: z.array(id).min(1).max(22),
  answers: z.array(z.tuple([text, id, text])).length(4),
  players: z.array(player).length(22), routes: z.record(id, z.array(point).min(2).max(8)).optional(), run: z.boolean().optional(), sticks: z.boolean().optional(),
}).strict().superRefine((p, ctx) => {
  const expected = formation(p.formation);
  const ids = new Set(p.players.map(v => v.id));
  const issue = message => ctx.addIssue({ code: 'custom', message });
  if (ids.size !== 22 || expected.some(v => !p.players.some(w => w.id === v.id && w.side === v.side))) issue('Use all 22 template player IDs and sides exactly once.');
  if (p.highlights.some(v => !ids.has(v))) issue('Highlights must reference players.');
  if (!ids.has(p.target) && p.target !== 'runLeft') issue('Target must be a player or runLeft.');
  if (p.answers.some(a => !ids.has(a[1]) && !actions.includes(a[1]))) issue('Answer actions must reference players or supported actions.');
  if (p.answers[p.correct]?.[1] !== p.target) issue('Correct answer action must equal target.');
  if (p.run && p.target !== 'runLeft') issue('The running animation requires runLeft as target.');
  if (!p.run && p.target === 'runLeft') issue('runLeft requires run=true.');
});

// The existing game stores level metadata separately from plays and playHints.
// This envelope passes those same values to the existing renderer.
export const generatedContentSchema = z.object({ title: text, plays: z.array(play).length(5), playHints: z.array(text).length(5) }).strict()
  .superRefine((v, ctx) => { if (new Set(v.plays.map(p => p.id)).size !== 5) ctx.addIssue({ code: 'custom', message: 'Play IDs must be unique.' }); });
