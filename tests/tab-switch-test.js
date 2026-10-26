// Reproduction tests for "results disappear after switching tabs" in SetFlow.
// Usage: node tabtest.js <repoDir>
// Run: npm i playwright && npx playwright install chromium && node tests/tab-switch-test.js .
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const REPO = process.argv[2];
const APP_PORT = 8800, SYNC_PORT = 8787, TOKEN = 'test-token-1234567890abcdef';
const APP = `http://localhost:${APP_PORT}/index.html`;
const SYNC = `http://localhost:${SYNC_PORT}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function staticServer() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/json', '.png': 'image/png' };
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
    if (p === '/sw.js') { res.writeHead(404); return res.end(); } // no service worker in tests
    const f = path.join(REPO, p);
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
  }).listen(APP_PORT);
}
function startSync() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sfdata-'));
  const p = spawn('node', [path.join(REPO, 'server/server.js')], {
    env: Object.assign({}, process.env, { PORT: String(SYNC_PORT), DATA_DIR: dir, SETFLOW_TOKEN: TOKEN, ALLOWED_ORIGINS: `http://localhost:${APP_PORT}` }),
    stdio: 'ignore'
  });
  return p;
}
async function serverState() {
  const r = await fetch(SYNC + '/api/state', { headers: { Authorization: 'Bearer ' + TOKEN } });
  return (await r.json()).state;
}
async function resetServer() {
  const cur = await fetch(SYNC + '/api/state', { headers: { Authorization: 'Bearer ' + TOKEN } }).then(r => r.json());
  await fetch(SYNC + '/api/state', { method: 'PUT', headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseRev: cur.rev, state: { weights: {}, lastDay: {}, history: {}, streak: 0, lastSessionDate: null, savedAt: 1, profile: { test: 1 } } }) });
}
const seed = `
  localStorage.setItem('setflow.sync', JSON.stringify({url:'${SYNC}', token:'${TOKEN}'}));
  localStorage.setItem('setflow.nologin','1');
  if(!localStorage.getItem('setflow.v1')) localStorage.setItem('setflow.v1', JSON.stringify({weights:{},lastDay:{},history:{},streak:0,lastSessionDate:null,savedAt:1,profile:{test:1}}));
  // lets the test fake tab visibility
  window.__vis='visible';
  Object.defineProperty(document,'visibilityState',{get:()=>window.__vis, configurable:true});
  Object.defineProperty(document,'hidden',{get:()=>window.__vis==='hidden', configurable:true});
`;
async function setVis(page, v) {
  await page.evaluate(v => { window.__vis = v; document.dispatchEvent(new Event('visibilitychange')); }, v);
}
async function waitSyncIdle(page) {
  await page.waitForFunction(() => !syncBusy && (syncStatus.state === 'ok' || syncStatus.state === 'err'), null, { timeout: 15000 });
}
// count done sets in an activeSession-like object
const doneCount = s => !s || !s.setLog ? 0 : Object.values(s.setLog).flat().filter(x => x && x.done).length;

async function newPage(ctx) {
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('  [page error]', e.stack.split('\n').slice(0,3).join(' | ')));
  await p.goto(APP);
  await p.waitForFunction(() => typeof syncNow === 'function' && syncStatus.state === 'ok', null, { timeout: 15000 });
  return p;
}

/* ---------- TEST 1: two SetFlow tabs (or tab + installed app) ---------- */
async function test1(browser) {
  console.log('\nTEST 1: два відкриті вікна SetFlow, перемикання між ними');
  await resetServer();
  const ctx = await browser.newContext(); await ctx.addInitScript(seed);
  const A = await newPage(ctx);
  // Tab A: start day A and open the first exercise (like an old tab left open on the workout)
  await A.evaluate(() => { startDay('A'); finishWarmup(); openExercise(allExIds()[0]); });
  await sleep(3500); await waitSyncIdle(A);
  // user switches to tab B
  await setVis(A, 'hidden');
  const B = await newPage(ctx);
  await B.evaluate(() => { resumeSession(); openExercise(allExIds()[0]); });
  // logs 3 sets and 2 sets on the next exercise
  await B.evaluate(() => {
    const ids = allExIds();
    openExercise(ids[0]); const n0 = session.setLog[effId(ids[0])].length;
    for (let i = 0; i < Math.min(3, n0); i++) toggleDone(effId(ids[0]), i);
    openExercise(ids[1]); toggleDone(effId(ids[1]), 0); toggleDone(effId(ids[1]), 1);
  });
  await sleep(3500); await waitSyncIdle(B);
  const before = doneCount((await serverState()).activeSession);
  console.log('  у вкладці B відмічено підходів, на сервері:', before);
  // switch B -> A -> B
  await setVis(B, 'hidden');
  await setVis(A, 'visible'); await sleep(300); await waitSyncIdle(A);
  console.log('  A після повернення (state):', doneCount(await A.evaluate(() => state.activeSession)), '| A в памʼяті (session):', doneCount(await A.evaluate(() => session)));
  await setVis(A, 'hidden'); await sleep(3500); await waitSyncIdle(A);
  console.log('  сервер після того як A сховалась:', doneCount((await serverState()).activeSession));
  await setVis(B, 'visible'); await sleep(300); await waitSyncIdle(B);
  const afterB = doneCount(await B.evaluate(() => state.activeSession));
  console.log('  B state після повернення:', afterB, '| B в памʼяті (екран):', doneCount(await B.evaluate(() => session)));
  // iOS silently kills the backgrounded page (no pagehide), user opens the app again
  const cdp = await ctx.newCDPSession(B); cdp.send('Page.crash').catch(() => {}); await sleep(500);
  await A.close({ runBeforeUnload: false }).catch(() => {});
  const C = await newPage(ctx);
  const afterReload = doneCount(await C.evaluate(() => state.activeSession));
  console.log('  після повторного відкриття додатку збережено підходів:', afterReload);
  const lost = afterReload < before;
  console.log(lost ? `  РЕЗУЛЬТАТ: ВІДТВОРЕНО. Було ${before} підходів, лишилось ${afterReload}` : '  РЕЗУЛЬТАТ: втрат немає');
  await ctx.close();
  return lost;
}

/* ---------- TEST 2: one tab, finish the workout while a sync is in flight ---------- */
async function test2(browser) {
  console.log('\nTEST 2: одна вкладка, повернення в додаток і завершення тренування поки йде синхронізація');
  await resetServer();
  const ctx = await browser.newContext(); await ctx.addInitScript(seed);
  const P = await newPage(ctx);
  await P.evaluate(() => {
    startDay('A'); finishWarmup();
    const ids = allExIds(); openExercise(ids[0]);
    const id = effId(ids[0]); session.setLog[id].forEach((_, i) => toggleDone(id, i));
  });
  await sleep(3500); await waitSyncIdle(P);
  // slow network: each request to the server takes ~800 ms (Tailscale Funnel to a Mac mini)
  await P.evaluate(() => { const f = window.fetch; window.fetch = (...a) => new Promise(r => setTimeout(r, 800)).then(() => f(...a)); });
  // marks one more set and right away switches to YouTube (the 2.5 s sync timer has not fired yet)
  await P.evaluate(() => { const ids = allExIds(); openExercise(ids[1]); toggleDone(effId(ids[1]), 0); clearTimeout(syncTimer); });
  await setVis(P, 'hidden'); await P.evaluate(() => clearTimeout(syncTimer)); await setVis(P, 'visible');  // ...and came back
  await sleep(1100);                                              // GET done, PUT in flight
  await P.evaluate(() => finishSession());                        // taps "Завершити"
  const histNow = await P.evaluate(() => Object.values(state.history).flat().length);
  await sleep(1500); await waitSyncIdle(P);
  await sleep(3500); await waitSyncIdle(P);
  const histAfter = await P.evaluate(() => Object.values(state.history).flat().length);
  const srv = await serverState();
  const srvHist = Object.values(srv.history || {}).flat().length;
  console.log('  записів в історії одразу після "Завершити":', histNow, '| після синхронізації локально:', histAfter, '| на сервері:', srvHist);
  console.log('  незавершене тренування знову зʼявилось:', !!(await P.evaluate(() => state.activeSession)));
  const lost = histAfter < histNow;
  console.log(lost ? '  РЕЗУЛЬТАТ: ВІДТВОРЕНО. Завершене тренування зникло з історії' : '  РЕЗУЛЬТАТ: втрат немає');
  await ctx.close();
  return lost;
}


/* ---------- TEST 3: finished workout must not come back after an app switch ---------- */
async function test3(browser) {
  console.log('\nTEST 3: після "Завершити" перемикання вкладки не воскрешає тренування');
  await resetServer();
  const ctx = await browser.newContext(); await ctx.addInitScript(seed);
  const P = await newPage(ctx);
  await P.evaluate(() => { startDay('A'); finishWarmup(); const ids = allExIds(); openExercise(ids[0]); const id = effId(ids[0]); toggleDone(id, 0); finishSession(); });
  await setVis(P, 'hidden'); await sleep(3500); await waitSyncIdle(P); await setVis(P, 'visible'); await sleep(300); await waitSyncIdle(P);
  const back = !!(await P.evaluate(() => state.activeSession));
  const srv = await serverState();
  console.log('  незавершене тренування зʼявилось знову:', back, '| на сервері:', !!srv.activeSession);
  await ctx.close();
  return back || !!srv.activeSession;
}
/* ---------- TEST 4: both tabs log different sets, nothing is lost ---------- */
async function test4(browser) {
  console.log('\nTEST 4: дві вкладки відмічають різні підходи одного тренування');
  await resetServer();
  const ctx = await browser.newContext(); await ctx.addInitScript(seed);
  const A = await newPage(ctx);
  await A.evaluate(() => { startDay('A'); finishWarmup(); });
  await sleep(3500); await waitSyncIdle(A);
  const B = await newPage(ctx);
  await B.evaluate(() => { resumeSession(); const ids = allExIds(); openExercise(ids[1]); const id = effId(ids[1]); toggleDone(id, 0); toggleDone(id, 1); });
  await A.evaluate(() => { const ids = allExIds(); openExercise(ids[0]); const id = effId(ids[0]); toggleDone(id, 0); toggleDone(id, 1); toggleDone(id, 2); });
  for (const [x, y] of [[A, B], [B, A], [A, B]]) { await setVis(x, 'hidden'); await sleep(3000); await waitSyncIdle(x); await setVis(y, 'visible'); await sleep(300); await waitSyncIdle(y); }
  await sleep(3500);
  const srv = doneCount((await serverState()).activeSession);
  const a = doneCount(await A.evaluate(() => session)), b = doneCount(await B.evaluate(() => session));
  console.log('  очікується 5 | сервер:', srv, '| вкладка A:', a, '| вкладка B:', b);
  await ctx.close();
  return !(srv === 5 && a === 5 && b === 5);
}

(async () => {
  const st = staticServer(); const sync = startSync(); await sleep(800);
  const browser = await chromium.launch();
  const runs = Number(process.env.RUNS || 1);
  let r1 = 0, r2 = 0, r3 = 0, r4 = 0;
  try {
    for (let k = 0; k < runs; k++) { if (await test1(browser)) r1++; if (await test2(browser)) r2++; if (await test3(browser)) r3++; if (await test4(browser)) r4++; }
    console.log(`\nПІДСУМОК (скільки разів дані зіпсувались): тест1 ${r1}/${runs}, тест2 ${r2}/${runs}, тест3 ${r3}/${runs}, тест4 ${r4}/${runs}`);
  } finally { await browser.close(); sync.kill(); st.close(); }
})();
