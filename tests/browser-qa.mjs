import { checkPlayEditor } from './play-editor.browser.mjs';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';

// Optional dependency-free browser smoke test. Uses an installed Edge and isolated
// .qa browser data; never touches the user's normal browser profile.
const root = process.cwd();
const qa = path.join(root, '.qa');
await mkdir(qa, { recursive: true });
const pause = ms => new Promise(r => setTimeout(r, ms));
const vite = createServer(async (req, res) => { try { const file = path.join(root, 'dist', req.url === '/' ? 'index.html' : req.url.split('?')[0]); const data = await readFile(file); res.setHeader('Content-Type', ({'.html':'text/html','.js':'application/javascript','.css':'text/css'})[path.extname(file)] || 'application/octet-stream'); res.end(data); } catch { res.writeHead(404); res.end(); } });
await new Promise(resolve => vite.listen(5175, '127.0.0.1', resolve));
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9224', `--user-data-dir=${path.join(qa, 'edge-static-profile-' + Date.now())}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
const failures = [];
const network = [];
const checks = [];
try {
  let target;
  for (let i = 0; i < 100; i++) { try { await fetch('http://127.0.0.1:5175'); const targets = await (await fetch('http://127.0.0.1:9224/json')).json(); target = targets.find(t => t.type === 'page'); if (target) break; } catch {} await pause(150); }
  if (!target) throw new Error('Local preview or Edge debugger did not start.');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let seq = 0; const pending = new Map();
  socket.onmessage = event => { const msg = JSON.parse(event.data); if (msg.id) { const task = pending.get(msg.id); if (!task) return; pending.delete(msg.id); if (msg.error) task.reject(new Error(msg.error.message)); else task.resolve(msg.result); } else if (msg.method === 'Network.loadingFailed') network.push(msg.params.errorText); else if (msg.method === 'Runtime.exceptionThrown') failures.push(msg.params.exceptionDetails.text + ': ' + (msg.params.exceptionDetails.exception?.description || '')); };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 12000); pending.set(id, { resolve: v => { clearTimeout(timer); resolve(v); }, reject: e => { clearTimeout(timer); reject(e); } }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value; };
  const wait = async expression => { for (let i = 0; i < 200; i++) { if (await evaluate(expression)) return; await pause(70); } throw new Error(`Timed out waiting for ${expression}. Body: ${await evaluate("document.body.innerText")} Errors: ${JSON.stringify(failures)} Network: ${JSON.stringify(network)} HTML: ${await evaluate("document.documentElement.outerHTML.slice(0,1500)")}`); };
  const click = text => evaluate(`(() => { const el = [...document.querySelectorAll('button')].find(e => e.textContent.trim() === ${JSON.stringify(text)}); if(!el) throw Error('Button missing: ' + ${JSON.stringify(text)}); el.click(); })()`);
  const fill = (name, value) => evaluate(`(() => { const el = document.querySelector('[name="${name}"]'); if(!el) throw Error('Field missing: ${name}'); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('input', {bubbles:true})); })()`);
  const submit = () => evaluate(`document.querySelector('form').requestSubmit()`);
  const go = async route => { await evaluate(`location.hash = ${JSON.stringify(route)}`); await wait(`location.hash === '#${route}'`); await pause(150); };
  const bodyHas = text => `document.body?.textContent?.includes(${JSON.stringify(text)})`;
  const pass = name => { checks.push(name); console.log('PASS', name); };
  const sizes = [[320, 568], [375, 667], [430, 932], [768, 1024], [844, 390], [1024, 768], [1440, 900], [2560, 1440]];
  const resize = async (width, height) => { await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width <= 900 }); await pause(80); };
  async function assertFits(label) {
    const layout = await evaluate(`({ width: innerWidth, scroll: document.documentElement.scrollWidth, overflow: [...document.querySelectorAll('main *, header *, dialog[open] *')].filter(e => {const r=e.getBoundingClientRect();return r.width && (r.right > innerWidth + 1 || r.left < -1) && !e.closest('.filter-tabs, .sr-only');}).slice(0,6).map(e=>e.className) })`);
    assert.ok(layout.scroll <= layout.width + 1, `${label}: horizontal overflow ${JSON.stringify(layout)}`);
  }
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  await resize(390, 844);
  await send('Storage.clearDataForOrigin', { origin: 'http://127.0.0.1:5175', storageTypes: 'all' });
  await send('Page.navigate', { url: 'http://127.0.0.1:5175' });
  await wait(bodyHas('Get Started'));
  const welcomeShot=await send('Page.captureScreenshot',{format:'png'}); await writeFile(path.join(qa,'welcome.png'),Buffer.from(welcomeShot.data,'base64'));
  // Old saved data is deliberately invalid. Preview must not read or overwrite it.
  await evaluate("localStorage.setItem('gameiq.local.v1', 'previous-account-data')");
  await send('Page.addScriptToEvaluateOnNewDocument', {source: "window.__storageCalls=[]; const read=Storage.prototype.getItem; window.__readStored=(key)=>read.call(localStorage,key); for(const method of ['getItem','setItem','removeItem','clear']) {const original=Storage.prototype[method]; Storage.prototype[method]=function(){if(this===localStorage && arguments[0]==='gameiq.play-versions.v1') return original.apply(this,arguments); window.__storageCalls.push(method); throw Error('Preview attempted account storage: '+method)}}"});
  await send('Page.reload'); await wait(bodyHas('Get Started'));
  await click('Sign In'); await submit(); await wait(bodyHas('Coach or kid?'));
  await evaluate("document.querySelector('[aria-label=\"Close dialog\"]').click()"); await wait(bodyHas('get after it, Player.'));
  pass('Blank sign-in opens the app without registration or a password');
  for(const [width,height] of [[320,568],[390,844],[768,1024],[1440,900]]) {
    await resize(width,height);
    for(const route of ['home','training','profile','settings','team']) {await go(route);await assertFits(route+' '+width);}
  }
  await resize(390,844); await go('profile/edit');
  await fill('firstName','Jay'); await fill('lastName','Preview'); await fill('username','jay_preview'); await submit(); await wait(bodyHas('Jay Preview'));
  await go('home'); await wait(bodyHas('get after it, Jay.'));
  assert.deepEqual(await evaluate('window.__storageCalls'), []);
  pass('Profile edits work within the session without persistent storage');
  await go('team/create'); await fill('name','Preview Hawks'); await submit(); await wait(bodyHas('Preview Hawks'));
  await go('settings'); await click('Privacy Settings'); await evaluate("document.querySelector('dialog input[type=checkbox]').click()");
  await evaluate("document.querySelector('[aria-label=\"Close dialog\"]').click()"); await click('Privacy Settings');
  assert.equal(await evaluate("document.querySelector('dialog input[type=checkbox]').checked"),false);
  await evaluate("document.querySelector('[aria-label=\"Close dialog\"]').click()");
  await click('Change Password'); assert.equal(await evaluate("document.querySelectorAll('dialog input').length"),0);
  await evaluate("document.querySelector('[aria-label=\"Close dialog\"]').click()");
  pass('Team and preference previews work; password changes are clearly unavailable');
  await click('Log Out'); await wait(bodyHas('Create Account'));
  await fill('email','never-registered@example.com'); await fill('password','any-password'); await submit(); await wait(bodyHas('Coach or kid?'));
  await evaluate("document.querySelector('[aria-label=\"Close dialog\"]').click()"); await wait(bodyHas('get after it, Player.'));
  await go('team'); assert.equal(await evaluate("document.body.textContent.includes('Preview Hawks')"),false);
  pass('Unregistered sign-in works and logout clears the previous temporary profile and team');
  await go('settings'); await click('Log Out'); await click('Create Account');
  for(const [name,value] of Object.entries({firstName:'Sam',username:'jay_preview',email:'anything',password:'a',confirm:'does-not-match'})) await fill(name,value);
  await submit(); await wait(bodyHas('get after it, Sam.'));
  pass('Create Account also enters preview with arbitrary details and mismatched passwords');
  assert.deepEqual(await evaluate('window.__storageCalls'), []);
  assert.equal(await evaluate("window.__readStored('gameiq.local.v1')"),'previous-account-data');
  await go('home'); const mobile=await send('Page.captureScreenshot',{format:'png'}); await writeFile(path.join(qa,'mobile-home.png'),Buffer.from(mobile.data,'base64'));
  await resize(1440,1000); const desktop=await send('Page.captureScreenshot',{format:'png'}); await writeFile(path.join(qa,'desktop-home.png'),Buffer.from(desktop.data,'base64'));
  await send('Page.reload'); await wait(bodyHas('Get Started'));
  assert.deepEqual(await evaluate('window.__storageCalls'), []);
  await click('Sign In'); await submit(); await wait(bodyHas('Coach or kid?'));
  await evaluate("document.querySelector('[aria-label=\"Close dialog\"]').click()"); await wait(bodyHas('get after it, Player.'));
  await go('settings'); await click('Delete Account'); await click('End Preview'); await wait(bodyHas('Create Account'));
  assert.deepEqual(await evaluate('window.__storageCalls'), []);
  pass('Reload and End Preview discard the session; old storage is never read or overwritten');
  await checkPlayEditor({send,evaluate,wait,click,go,bodyHas,resize,assertFits,pass,qa});
  assert.deepEqual(failures, [], 'No uncaught browser exceptions');
  console.log(`${checks.length} browser checks passed. Screenshots in .qa/.`);
} finally {
  if (socket?.readyState === 1) { socket.send(JSON.stringify({ id: 99999, method: 'Browser.close' })); socket.close(); }
  await pause(800); vite.closeAllConnections(); vite.close(); edge.kill();
}
