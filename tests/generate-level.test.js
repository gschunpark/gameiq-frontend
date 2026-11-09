import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createApp, validateRequest } from '../server/app.js';
import { generateLevel, runFootballWorkflow, parsePredictions, requestJSON, WORKFLOW_URL } from '../server/providers.js';
import { generatedContentSchema } from '../server/level-schema.js';
import { plays, playHints, initialRun, answerPlay, advancePlay } from '../src/training/dummyLevel.js';

const fixture = JSON.parse(await readFile(new URL('./fixtures/roboflow-football.json', import.meta.url)));
const content = { title: 'Pressure reads', plays, playHints };
const env = { ROBOFLOW_API_KEY: 'test-rf', OPENAI_API_KEY: 'test-llm' };
const image = Buffer.from([255, 216, 255, 224, 255, 217]).toString('base64');
const input = { image, mimeType: 'image/jpeg', question: 'How do I beat pressure?' };
const llm = value => ({ choices: [{ message: { content: JSON.stringify(value) } }] });

test('question-only generation needs no frame or Roboflow key and skips detection', async () => {
  const questionOnly = validateRequest({ question: input.question });
  let calls = 0;
  const result = await generateLevel(questionOnly, { env: { OPENAI_API_KEY: 'test-llm' }, request: async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.openai.com/v1/chat/completions');
    assert.deepEqual(JSON.parse(options.body.messages[1].content).predictions, []);
    return llm(content);
  } });
  assert.equal(calls, 1);
  assert.equal(result.level.plays.length, 5);
  assert.deepEqual(result.predictions, []);
  assert.throws(() => validateRequest({ question: input.question, image }), { code: 'INVALID_REQUEST' });
  assert.throws(() => validateRequest({ question: input.question, mimeType: 'image/jpeg' }), { code: 'INVALID_REQUEST' });
});

test('live OAuth response fixture parses only the six needed detection fields', async () => {
  const detections = parsePredictions(fixture);
  assert.equal(detections.length, 16);
  assert.deepEqual(Object.keys(detections[0]), ['class', 'x', 'y', 'width', 'height', 'confidence']);
  const augmented = structuredClone(fixture); augmented[0].predictions.predictions[0].points = Array(500).fill([1, 2]);
  assert.deepEqual(parsePredictions(augmented), detections);
  await runFootballWorkflow(image, { key: 'secret', request: async (url, options) => {
    assert.equal(url, WORKFLOW_URL); assert.deepEqual(options.body, { inputs: { image: { type: 'base64', value: image } } }); return { outputs: fixture };
  } });
  assert.throws(() => parsePredictions([{ predictions: { predictions: [] } }]), { code: 'NO_DETECTIONS' });
  assert.throws(() => parsePredictions({}), { code: 'INVALID_WORKFLOW_OUTPUT' });
  assert.throws(() => parsePredictions([{ predictions: { predictions: [null] } }]), { code: 'INVALID_PREDICTIONS' });
});

test('schema rejects animation-breaking player references, routes, answers and duplicates', () => {
  assert.ok(generatedContentSchema.safeParse(content).success);
  for (const mutate of [v => v.plays[0].players.pop(), v => v.plays[0].players[0].points[0][0] = 999, v => v.plays[0].target = 'missing', v => v.plays[0].answers[0][1] = 'missing', v => v.plays[0].correct = 9, v => v.plays[0].players[0].id = 'QB', v => v.plays[0].highlights.push('missing')]) {
    const v = structuredClone(content); mutate(v); assert.equal(generatedContentSchema.safeParse(v).success, false);
  }
});

test('generation repairs invalid output once and returns a playable level without awarding XP', async () => {
  let calls = 0;
  const result = await generateLevel(input, { env, request: async (url, options) => {
    calls++;
    if (url === WORKFLOW_URL) return { outputs: fixture };
    assert.ok(!JSON.stringify(options.body).includes(image));
    return calls === 2 ? llm({ title: 'broken' }) : llm(content);
  } });
  assert.equal(calls, 3); assert.equal(result.level.xp, 0); assert.equal(result.level.plays.length, 5);
  let run = initialRun();
  for (const play of result.level.plays) run = advancePlay(answerPlay(run, play.correct, result.level.plays), result.level.plays);
  assert.equal(run.finished, true);
  await assert.rejects(generateLevel(input, { env, request: async url => url === WORKFLOW_URL ? { outputs: fixture } : llm({}) }), { code: 'INVALID_LEVEL' });
  await assert.rejects(generateLevel(input, { env: {} }), { code: 'CONFIGURATION' });
});

test('HTTP transport uses header auth, retries transient failures, and sanitizes provider errors', async () => {
  let calls = 0; const delays = [];
  const value = await requestJSON(WORKFLOW_URL, { key: 'secret', body: { inputs: {} }, provider: 'Roboflow', delay: async ms => delays.push(ms), fetchImpl: async (url, options) => {
    assert.ok(!url.includes('secret')); assert.ok(!options.body.includes('secret')); assert.equal(options.headers.Authorization, 'Bearer secret');
    return ++calls < 3 ? new Response('private upstream details', { status: 500 }) : Response.json({ outputs: fixture });
  } });
  assert.ok(value.outputs); assert.equal(calls, 3); assert.deepEqual(delays, [400, 800]);
  for (const [status, code] of [[401, 'PROVIDER_AUTH'], [403, 'PROVIDER_AUTH'], [400, 'PROVIDER_HTTP'], [429, 'PROVIDER_HTTP'], [500, 'PROVIDER_HTTP']]) {
    await assert.rejects(requestJSON('https://example.test', { key: 'secret', body: {}, provider: 'Roboflow', retries: 0, fetchImpl: async () => new Response('secret', { status }) }), { code });
  }
  await assert.rejects(requestJSON('https://example.test', { key: 'secret', body: {}, provider: 'Roboflow', retries: 0, fetchImpl: async () => { throw Error('timeout private'); } }), { code: 'PROVIDER_UNAVAILABLE' });
});

test('request rejects URLs, invalid formats, size and question violations', () => {
  assert.equal(validateRequest(input).image, image);
  const boundary = Buffer.alloc(5 * 1024 * 1024);
  boundary[0] = 255; boundary[1] = 216; boundary[2] = 255; boundary[boundary.length - 2] = 255; boundary[boundary.length - 1] = 217;
  assert.equal(validateRequest({ ...input, image: boundary.toString('base64') }).image.length, Math.ceil(boundary.length / 3) * 4);
  assert.throws(() => validateRequest({ ...input, image: Buffer.concat([boundary, Buffer.from([0])]).toString('base64') }), { code: 'IMAGE_TOO_LARGE' });
  for (const value of [{ ...input, image: 'https://example.test/frame.jpg' }, { ...input, mimeType: 'image/webp' }, { ...input, question: ' ' }, { ...input, question: 'x'.repeat(2001) }, { ...input, image: Buffer.from('not an image').toString('base64') }, { ...input, image: 'A'.repeat(8 * 1024 * 1024) }]) assert.throws(() => validateRequest(value));
});

test('endpoint smoke: validates input, returns level and predictions, limits requests, sanitizes failures', async t => {
  let called = 0;
  const app = createApp({ rateLimitMax: 3, generate: async value => { called++; assert.equal(value.image, image); return { level: { ...content, id: 'generated-test' }, predictions: parsePredictions(fixture) }; } });
  const server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r)); t.after(() => server.close());
  const post = body => fetch(`http://127.0.0.1:${server.address().port}/api/generate-level`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  const success = await post(input); assert.equal(success.status, 200); assert.equal(success.headers.get('cache-control'), 'no-store');
  const data = await success.json(); assert.ok(data.level); assert.equal(data.predictions.length, 16);
  assert.equal((await post({ ...input, image: 'bad' })).status, 400);
  assert.equal((await post('{')).status, 400);
  assert.equal((await post(input)).status, 429); assert.equal(called, 1);
});
