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
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Storage.clearDataForOrigin', { origin: 'http://127.0.0.1:5175', storageTypes: 'all' });
  await send('Page.navigate', { url: 'http://127.0.0.1:5175' });
  await wait(bodyHas('Get Started'));
  await evaluate('localStorage.clear()'); await send('Page.reload'); await wait(bodyHas('Get Started'));
  for (const [width, height] of sizes) { await resize(width, height); await assertFits(`Welcome ${width}x${height}`); }
  await click('Get Started');
  for (const [width, height] of sizes) { await resize(width, height); await assertFits(`Create account ${width}x${height}`); }
  await resize(390, 844);
  pass('Welcome and account forms fit eight phone, tablet, landscape, and desktop viewports');
  for (const [name, value] of Object.entries({ firstName: 'Jordan', lastName: 'Taylor', username: 'jordan_test', email: 'jordan@test.local', password: 'TestPassword42', confirm: 'TestPassword42' })) await fill(name, value);
  await submit(); await wait(bodyHas('Let’s get after it, Jordan.'));
  assert.equal(await evaluate(`document.querySelector('.xp-value').textContent`), '0Total XP');
  pass('Welcome → account creation → Home; zero invented progress');
  for (const [width, height] of sizes) {
    await resize(width, height);
    for (const route of ['home', 'training', 'team', 'team/create', 'team/join', 'profile', 'profile/edit', 'rulebooks', 'settings', 'scenarios', 'lesson/positions']) {
      await go(route); await assertFits(`${route} ${width}x${height}`);
    }
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.bottom-nav')).display !== 'none'`), width <= 900, 'Navigation adapts to viewport');
  }
  await resize(390, 844); await go('home');
  pass('All app screens fit eight viewport sizes; navigation changes between bottom tabs and sidebar');
  await click('Explore Training'); await wait(bodyHas('COMING SOON'));
  assert.equal(await evaluate("document.querySelectorAll('.lesson-card, .answer-option, form').length"), 0);
  await go('lesson/positions'); await wait(bodyHas('Ask a question. Train your football IQ.'));
  assert.equal(await evaluate("document.querySelectorAll('.answer-option').length"), 0);
  assert.deepEqual(await evaluate("JSON.parse(localStorage.getItem('gameiq.local.v1')).users[0].completed"), {});
  pass('Training is a placeholder; old lesson routes cannot award XP');
  await go('profile/edit'); await wait(bodyHas('Save Changes'));
  const photoPath = path.join(qa, 'avatar.png');
  await writeFile(photoPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jDasAAAAASUVORK5CYII=', 'base64'));
  const photoDoc = await send('DOM.getDocument'); const photoInput = await send('DOM.querySelector', {nodeId: photoDoc.root.nodeId, selector:'input[type=file]'});
  await send('DOM.setFileInputFiles', {nodeId:photoInput.nodeId,files:[photoPath]}); await wait("!!document.querySelector('.image-input img[src^=\"data:image/\"]')");
  await fill('firstName', 'Jay'); await fill('bio', 'Ready for the next play.'); await submit(); await wait(bodyHas('Jay Taylor'));
  await go('home'); await wait(bodyHas('Let’s get after it, Jay.'));
  assert.ok(await evaluate("!!document.querySelector('.avatar-button img[src^=\"data:image/\"]')"));
  pass('Profile edits and uploaded picture update across screens');
  await go('team/create'); await wait(bodyHas('Create your team.')); await fill('name', 'Blue Hawks'); await evaluate(`document.querySelector('[name="coachSelf"]').checked=true`); await submit(); await wait(bodyHas('YOUR COACH'));
  const code = await evaluate(`document.querySelector('.invite-code').textContent`);
  assert.ok(await evaluate(bodyHas('Jay Taylor')));
  pass('Team creation, unique invitation code, and actual coach profile');
  await go('rulebooks'); await wait(bodyHas('Bring your own rulebook'));
  assert.equal(await evaluate("document.querySelectorAll('input[type=file], .lesson-card, iframe').length"), 0);
  assert.equal(await evaluate("document.body.textContent.includes('Built-in football rules')"), false);
  pass('Rulebooks shows a future upload placeholder with no rulebook lessons');
  await go('settings'); await click('Log Out'); await wait(bodyHas('Create Account')); await click('Create Account');
  for (const [name, value] of Object.entries({ firstName: 'Sam', lastName: 'Player', username: 'sam_test', email: 'sam@test.local', password: 'TestPassword42', confirm: 'TestPassword42' })) await fill(name, value);
  await submit(); await wait(bodyHas('Let’s get after it, Sam.'));
  assert.equal(await evaluate(`document.querySelector('.xp-value').textContent`), '0Total XP');
  await go('team/join'); await fill('code', code); await submit(); await wait(bodyHas('Blue Hawks'));
  assert.equal(await evaluate(`document.querySelector('.team-xp strong').textContent`), '0');
  await evaluate(`document.querySelector('.coach-card').click()`); await wait(bodyHas('Team Profile')); await evaluate(`document.querySelector('[aria-label="Close dialog"]').click()`);
  pass('Second account isolation, valid join code, team XP, and clickable coach');
  await go('scenarios'); await wait(bodyHas('Coming Soon') + ' || ' + bodyHas('COMING SOON'));
  assert.equal(await evaluate(`document.querySelectorAll('.answer-option').length`), 0);
  await go('home'); assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true);
  const mobile = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(path.join(qa, 'mobile-home.png'), Buffer.from(mobile.data, 'base64'));
  pass('Scenario placeholder and 390px mobile layout without horizontal overflow');
  await go('settings'); await click('Log Out'); await wait(bodyHas('Create Account'));
  await fill('email', 'jordan@test.local'); await fill('password', 'TestPassword42'); await submit(); await wait(bodyHas('Coach or kid?'));
  await click('I’m a coach'); await wait(bodyHas('Log in to a team')); await click('Log in to a team'); await wait(bodyHas('Blue Hawks'));
  await go('home'); await wait(bodyHas('Let’s get after it, Jay.'));
  assert.equal(await evaluate(`document.querySelector('.xp-value').textContent`), '0Total XP');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false }); await pause(100);
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true);
  const desktop = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(path.join(qa, 'desktop-home.png'), Buffer.from(desktop.data, 'base64'));
  pass('Sign-in role selection and saved account restored; 1440px desktop layout');
  await go('settings'); await click('Change Password'); await fill('current','TestPassword42'); await fill('next','ChangedPassword42'); await fill('confirm','ChangedPassword42'); await submit(); await wait(bodyHas('Password updated for this local account.'));
  await click('Privacy Settings'); await evaluate("document.querySelector('dialog input[type=checkbox]').click()"); assert.equal(await evaluate("JSON.parse(localStorage.getItem('gameiq.local.v1')).users[0].privacy.showStats"), false); await evaluate("document.querySelector('[aria-label=\"Close dialog\"]').click()");
  await click('Log Out'); await wait(bodyHas('Create Account')); await fill('email','jordan@test.local'); await fill('password','ChangedPassword42'); await submit(); await wait(bodyHas('get after it, Jay.'));
  pass('Password changes authenticate correctly and privacy preferences persist');
  await go('settings'); await click('Delete Account'); await fill('password','ChangedPassword42'); await fill('confirm','DELETE'); await submit(); await wait(bodyHas('Create Account'));
  const remaining = await evaluate("JSON.parse(localStorage.getItem('gameiq.local.v1'))"); assert.equal(remaining.users.length,1); assert.equal(remaining.teams.length,0); assert.equal(remaining.session,null);
  pass('Password-confirmed account deletion removes owned teams and retains other accounts');
  assert.deepEqual(failures, [], 'No uncaught browser exceptions');
  console.log(`${checks.length} browser checks passed. Screenshots in .qa/.`);
} finally {
  if (socket?.readyState === 1) { socket.send(JSON.stringify({ id: 99999, method: 'Browser.close' })); socket.close(); }
  await pause(800); vite.closeAllConnections(); vite.close(); edge.kill();
}
