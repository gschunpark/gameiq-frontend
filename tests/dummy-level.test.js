import test from 'node:test';
import assert from 'node:assert/strict';
import { advancePlay, answerPlay, dummyLevel, finishDummyLevel, initialRun, plays, pointOnRoute } from '../src/training/dummyLevel.js';
import { trainingStats } from '../src/xp/progress.js';

test('five distinct plays contain valid choices, 11 players per side and moving routes', () => {
  assert.equal(plays.length, 5);
  assert.equal(new Set(plays.map(p => p.id)).size, 5);
  for (const play of plays) {
    assert.equal(play.answers.length, 4);
    assert.equal(play.answers[play.correct][1], play.target);
    assert.equal(play.players.filter(p => p.side === 'offense').length, 11);
    assert.equal(play.players.filter(p => p.side === 'defense').length, 11);
    for (const player of play.players) {
      assert.notDeepEqual(pointOnRoute(player.points, 0), pointOnRoute(player.points, 1));
      assert.ok(player.points.flat().every(Number.isFinite));
    }
  }
});
test('wrong answers never advance or award progress; retry keeps the scenario and all attempts', () => {
  let run = initialRun();
  assert.equal(advancePlay(run), run);
  run = answerPlay(run, 0);
  assert.equal(run.correct, 0);
  assert.equal(run.incorrect, 1);
  assert.equal(answerPlay(run, 1), run, 'feedback prevents double answers');
  run = advancePlay(run);
  assert.equal(run.index, 0);
  assert.equal(run.selected, null);
  run = answerPlay(run, plays[0].correct);
  assert.equal(run.correct, 1);
  run = advancePlay(run);
  assert.equal(run.index, 1);
  assert.equal(run.attempts, 2);
});
test('only five correct plays complete the level; XP is added once and history survives replay', () => {
  const user = { completed: { earlier: { at: 'old', xp: 25 } }, progress: {} };
  let run = initialRun();
  assert.equal(finishDummyLevel(user, run).earned, 0);
  run = advancePlay(answerPlay(run, 0));
  for (const play of plays) {
    run = answerPlay(run, play.correct);
    assert.equal(finishDummyLevel(user, run).earned, 0);
    run = advancePlay(run);
  }
  assert.equal(run.finished, true);
  assert.equal(run.attempts, 6);
  assert.equal(run.incorrect, 1);
  assert.equal(Math.round(run.correct / run.attempts * 100), 83);
  const result = finishDummyLevel(user, run);
  assert.equal(result.earned, 50);
  assert.equal(trainingStats(result.user, []).xp, 75);
  assert.equal(result.user.completed[dummyLevel.id].scenarios, 5);
  const replay = finishDummyLevel(result.user, run);
  assert.equal(replay.earned, 0);
  assert.deepEqual(replay.user.completed, result.user.completed);
  assert.equal(trainingStats(replay.user, []).xp, 75);
});
