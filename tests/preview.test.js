import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreviewUser } from '../src/auth/preview.js';

test('preview entry works without any account details', () => {
  const user = createPreviewUser();
  assert.equal(user.firstName, 'Player');
  assert.equal(user.username, 'player');
  assert.deepEqual(user.completed, {});
});

test('preview entry ignores passwords and does not require a valid or unique account', () => {
  const details = { firstName: ' Sam ', username: 'same name', email: 'anything', password: 'secret', confirm: 'different' };
  const first = createPreviewUser(details);
  const second = createPreviewUser(details);
  assert.equal(first.firstName, 'Sam');
  assert.equal(first.email, 'anything');
  assert.notEqual(first.id, second.id);
  assert.ok(!('password' in first));
  assert.ok(!('confirm' in first));
  assert.ok(!('credentials' in first));
  assert.ok(!JSON.stringify(first).includes('secret'));
});
