import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import { createApp } from '../server/app.js';
import { generateLevel, WORKFLOW_URL } from '../server/providers.js';
import { plays, playHints } from '../src/training/dummyLevel.js';

// Runs real media capture, HTTP validation and animation. Provider calls are mocked.
const qa = path.resolve('.qa'); await mkdir(qa, { recursive: true });
const fixture = JSON.parse(await readFile(new URL('./fixtures/roboflow-football.json', import.meta.url)));
let requests = 0;
const app = createApp({ generate: async input => {
  requests++;
  assert.equal(input.mimeType, 'image/jpeg');
  assert.equal(input.question, 'The quarterback faces pressure. Help me find the quick passing option.');
  await writeFile(path.join(qa, 'captured-video-frame.jpg'), Buffer.from(input.image, 'base64'));
  // Keep loading visible and exercise a recoverable empty-detection error first.
  await new Promise(r => setTimeout(r, 400));
  return generateLevel(input, { env: { ROBOFLOW_API_KEY: 'mock', OPENAI_API_KEY: 'mock' }, request: async url => url === WORKFLOW_URL
    ? { outputs: requests === 1 ? [{ predictions: { predictions: [] } }] : fixture }
    : { choices: [{ message: { content: JSON.stringify({ title: 'Generated pressure practice', plays, playHints }) } }] } });
} });
app.get('/sample.jpg', async (req, res) => { try { res.type('jpg').send(await readFile(path.join(qa, 'football-frame.jpg'))); } catch { res.sendStatus(404); } });
app.use(express.static(path.resolve('dist')));
const server = app.listen(5176, '127.0.0.1'); await new Promise(r => server.once('listening', r));
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9225', `--user-data-dir=${path.join(qa, 'edge-video-' + Date.now())}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const pause = ms => new Promise(r => setTimeout(r, ms));
let socket;
try {
  let target;
  for (let i = 0; i < 100; i++) { try { target = (await (await fetch('http://127.0.0.1:9225/json')).json()).find(t => t.type === 'page'); if (target) break; } catch {} await pause(100); }
  if (!target) throw Error('Edge debugger did not start.');
  socket = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r, j) => { socket.onopen = r; socket.onerror = j; });
  let seq = 0; const pending = new Map(); const errors = [];
  socket.onmessage = event => { const msg = JSON.parse(event.data); if (msg.id) { const p = pending.get(msg.id); if (p) { pending.delete(msg.id); msg.error ? p.reject(Error(msg.error.message)) : p.resolve(msg.result); } } else if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.text); };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  const wait = async expression => { for (let i = 0; i < 200; i++) { if (await evaluate(expression)) return; await pause(70); } throw Error('Timed out: ' + expression + '\n' + await evaluate('document.body.innerText')); };
  const click = label => evaluate(`(() => { const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}); if(!b||b.disabled) throw Error('Button unavailable: '+${JSON.stringify(label)}); b.click(); })()`);
  const has = text => `document.body.textContent.includes(${JSON.stringify(text)})`;
  const scrubPlay = () => evaluate(`(() => { const el=document.querySelector('[aria-label="Play timeline"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'100'); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate', { url: 'http://127.0.0.1:5176' }); await wait(has('Get Started'));
  await click('Sign In'); await evaluate('document.querySelector("form").requestSubmit()'); await wait(has('get after it'));
  await evaluate("location.hash='training'"); await wait('!!document.querySelector("textarea")');
  assert.equal(await evaluate('document.querySelector("textarea").placeholder'), 'first, say the scenario that is happening. Then say what you want to fix.');
  for (const width of [320, 390, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'Generator fits '+width);
  }
  const mediaInfo = await evaluate(`(async () => {
    const c=document.createElement('canvas'); c.width=1920; c.height=1080;
    const ctx=c.getContext('2d'); ctx.fillStyle='#197541'; ctx.fillRect(0,0,c.width,c.height);
    for(let i=0;i<22;i++){ctx.fillStyle=i<11?'white':'red';ctx.beginPath();ctx.arc(100+i*70,200+(i%3)*150,22,0,Math.PI*2);ctx.fill();}
    try { const image=new Image(); image.src='/sample.jpg'; await image.decode(); ctx.drawImage(image,0,0,c.width,c.height); } catch {}
    const stream=c.captureStream(15); const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'}); const chunks=[];
    recorder.ondataavailable=e=>chunks.push(e.data); const done=new Promise(r=>recorder.onstop=r); recorder.start();
    const redraw=setInterval(()=>{ctx.fillStyle='white';ctx.fillRect(0,0,2,2);},50);
    await new Promise(r=>setTimeout(r,1200)); recorder.stop(); await done; clearInterval(redraw); stream.getTracks().forEach(t=>t.stop());
    const dt=new DataTransfer(); dt.items.add(new File(chunks,'football-sample.webm',{type:'video/webm'}));
    const input=document.querySelector('input[accept="video/*"]'); input.files=dt.files; input.dispatchEvent(new Event('change',{bubbles:true}));
    return {size:dt.files[0].size,chunks:chunks.length,type:recorder.mimeType};
  })()`);
  assert.ok(mediaInfo.size > 1000, 'Sample video contains encoded frames');
  await pause(1000);
  await wait('document.querySelector("video")?.readyState >= 2');
  await evaluate('document.querySelector("video").currentTime=0.3'); await wait('!document.querySelector("video").seeking');
  await click('Use this frame'); await wait(has('Frame selected at'));
  assert.deepEqual(await evaluate('({w:document.querySelector("canvas").width,h:document.querySelector("canvas").height})'), { w: 1280, h: 720 });
  await evaluate(`(() => { const el=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,'The quarterback faces pressure. Help me find the quick passing option.');el.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await click('Create my level'); await wait(has('Reading the frame')); await wait(has('No players or objects were detected'));
  await click('Create my level'); await wait(has('Your level is ready')); assert.equal(requests, 2);
  await click('Play generated level'); await wait(has('Scenarios correct: 0/5'));
  const first = await evaluate('document.querySelector(".football-demo-field g[transform]").getAttribute("transform")'); await pause(350);
  assert.notEqual(await evaluate('document.querySelector(".football-demo-field g[transform]").getAttribute("transform")'), first, 'Generated routes animate');
  for (const [index, play] of plays.entries()) {
    await scrubPlay(); await wait('!document.querySelector(".demo-answer").disabled');
    await evaluate(`document.querySelectorAll('.demo-answer')[${play.correct}].click()`); await wait(has('Correct!'));
    await scrubPlay(); const label = index === 4 ? 'Finish Level' : 'Next Play';
    await wait(`[...document.querySelectorAll('button')].some(b=>b.textContent===${JSON.stringify(label)}&&!b.disabled)`); await click(label);
  }
  await wait(has('PRACTICE COMPLETE')); assert.equal(await evaluate('document.querySelector(".demo-results dd").textContent'), '5/5');
  await click('Return to Training'); await wait('!!document.querySelector("textarea")');
  assert.deepEqual(errors, []);
  await writeFile(path.join(qa, 'video-generator.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  console.log('PASS: WebM upload/scrub, 1280px JPEG capture, loading/error/retry, real endpoint + mocked providers, five generated animated plays, no XP, mobile layout.');
} finally {
  if (socket?.readyState === 1) { socket.send(JSON.stringify({ id: 99999, method: 'Browser.close' })); socket.close(); }
  await pause(500); edge.kill(); server.closeAllConnections(); server.close();
}
