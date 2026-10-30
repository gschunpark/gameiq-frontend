import assert from 'node:assert/strict';

export async function checkDummyLevel({ evaluate, wait, click, go, bodyHas, resize, assertFits, pass }) {
  const scrub = () => evaluate(`(() => {const el=document.querySelector('[aria-label="Play timeline"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'100');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const answer = index => evaluate(`document.querySelectorAll('.demo-answer')[${index}].click()`);
  await go('training'); await click('Start Level'); await wait(bodyHas('Scenarios correct: 0/5'));
  const start = await evaluate("document.querySelector('.football-demo-field g[transform]').getAttribute('transform')");
  await new Promise(resolve => setTimeout(resolve, 350));
  assert.notEqual(await evaluate("document.querySelector('.football-demo-field g[transform]').getAttribute('transform')"), start, 'players really move');
  for (const width of [320, 375, 390, 430]) { await resize(width, 844); await assertFits('Football level ' + width); }
  await wait("!document.querySelector('.demo-answer').disabled"); await answer(0); await wait(bodyHas('Incorrect.'));
  assert.equal(await evaluate("document.querySelector('[role=progressbar]').getAttribute('aria-valuenow')"), '0');
  assert.equal(await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Try Again').disabled"), true);
  await wait(bodyHas('2 / 2 · CORRECT DECISION'));
  await wait("[...document.querySelectorAll('button')].some(b=>b.textContent==='Try Again'&&!b.disabled)");
  await click('Try Again'); await wait(bodyHas('Scenarios correct: 0/5'));
  assert.equal(await evaluate("document.querySelectorAll('.demo-answer').length"), 4);
  for (const [i, choice] of [1, 2, 0, 3, 1].entries()) {
    await scrub(); await wait("!document.querySelector('.demo-answer').disabled"); await answer(choice); await wait(bodyHas('Correct!'));
    assert.equal(await evaluate("document.querySelector('[role=progressbar]').getAttribute('aria-valuenow')"), String((i + 1) * 20));
    await scrub(); const next = i === 4 ? 'Finish Level' : 'Next Play';
    await wait(`[...document.querySelectorAll('button')].some(b=>b.textContent===${JSON.stringify(next)}&&!b.disabled)`); await click(next);
  }
  await wait(bodyHas('LEVEL COMPLETE!')); await wait(bodyHas('+50 XP EARNED'));
  assert.ok(await evaluate("document.querySelector('.demo-results').textContent.includes('83%')"));
  assert.ok(await evaluate("document.querySelector('.demo-results').textContent.includes('Total attempts6')"));
  await click('Return to Training'); await wait(bodyHas('Training history: Completed'));
  await go('home'); assert.equal(await evaluate("document.querySelector('.xp-value').textContent"), '50Total XP');
  await go('profile'); await wait(bodyHas('Total XP: 50'));
  await go('training'); await click('Replay Level');
  for (const [i, choice] of [1, 2, 0, 3, 1].entries()) {
    await scrub(); await wait("!document.querySelector('.demo-answer').disabled"); await answer(choice); await wait(bodyHas('Correct!')); await scrub();
    const next = i === 4 ? 'Finish Level' : 'Next Play'; await wait(`[...document.querySelectorAll('button')].some(b=>b.textContent===${JSON.stringify(next)}&&!b.disabled)`); await click(next);
  }
  await wait(bodyHas('50 XP ALREADY EARNED'));
  await go('home'); assert.equal(await evaluate("document.querySelector('.xp-value').textContent"), '50Total XP');
  pass('Dummy level animates, retries wrong answers, counts five correct plays, records history and awards 50 XP only once; fits iPhone and Android widths');
  await go('settings'); await click('Log Out');
}
