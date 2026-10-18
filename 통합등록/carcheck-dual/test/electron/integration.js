/*  Electron 모의 통합 시험 — 진짜 Electron 창(숨김)에 흉내 세 전산 화면을 띄우고
 *  등록 흐름(register-flow) + Electron 연결 모듈(flow-adapters) + 저장 붙잡기(save-hold, 개발자 연결 Fetch)를 이어 돌린다.
 *  실제 카인포·카모두·엔트리에는 접속하지 않는다. 값은 모두 가짜.
 *  실행: npm run test:electron  (리눅스 화면 없는 곳은 xvfb 로) */
const { app, BrowserWindow } = require('electron');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createMockSites } = require('./mock-sites');
const { createJobLog } = require('../../src/core/job-log');
const { createRegisterFlow } = require('../../src/core/register-flow');
const { createElectronAdapters } = require('../../src/sites/flow-adapters');
const { mockConfig } = require('../../src/sites/site-config');
const quiet = require('../../src/sites/quiet-window');

app.commandLine.appendSwitch('disable-gpu');
const CAR = { carNo: '12가3456', vin: 'KMHXX00XXXX123456' };
const results = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function until(fn, ms = 4000) {
  const t = Date.now();
  while (Date.now() - t < ms) { const v = await fn(); if (v) return v; await sleep(50); }
  return null;
}

async function scenario(name, fn) {
  if (process.env.CC_DEBUG) console.log('START ' + name);
  try { await fn(); results.push({ ok: true, name }); }
  catch (e) { results.push({ ok: false, name, error: e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : String(e) }); }
}

/** 한 시나리오용 세트 — 숨긴 창 세 개 + 흉내 서버 + 흐름 */
async function setup(faults = {}) {
  const M = await createMockSites();
  Object.assign(M.S.faults, faults);
  const wins = {};
  for (const s of ['carinfo', 'carmodoo', 'entry']) {
    wins[s] = new BrowserWindow({ show: quiet.initialShow('auto', true), webPreferences: { contextIsolation: true, nodeIntegration: false, ...quiet.extraPrefs(true) } });
    wins[s].webContents.setWindowOpenHandler(() => ({ action: 'allow', overrideBrowserWindowOptions: quiet.popupOptions(true) }));
    await wins[s].loadURL(M.base + '/' + s);
  }
  const js = (s, code) => wins[s].webContents.executeJavaScript(code, true);
  const fillFns = {
    carinfo: async (d) => { await js('carinfo', 'carNo.value=' + JSON.stringify(d.carNo) + ';vin.value=' + JSON.stringify(d.vin) + ';1'); return { filled: ['차량번호', '차대번호'], missing: [] }; },
    carmodoo: async (d) => { await js('carmodoo', 'carNo.value=' + JSON.stringify(d.carNo) + ';1'); return { filled: ['차량번호'], missing: [] }; },
    entry: async () => ({ filled: [], missing: [] }),
  };
  const adapters = createElectronAdapters({ getWindow: (s) => wins[s], config: mockConfig(M.host), fillFns });
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cc-el-')), 'jobs.jsonl');
  const jobLog = createJobLog(file);
  const flow = createRegisterFlow({ jobLog, adapters, mock: true, now: () => new Date('2026-10-19T10:00:00') });
  const clickSave = async (s) => { await js(s, 'document.getElementById("btnSave").click();1'); };
  const settle = async (s) => until(async () => (await adapters[s].saveOutcome()).result !== 'waiting' || null);
  const done = async () => {
    for (const s of Object.keys(wins)) { try { await adapters[s].release(); } catch {} }
    for (const w of BrowserWindow.getAllWindows()) {
      if (w.isDestroyed()) continue;
      const gone = new Promise((r) => w.once('closed', r));
      w.close();
      await gone;
    }
    M.close();
  };
  return { M, wins, js, adapters, jobLog, flow, clickSave, settle, done, file };
}

async function siteRound(t, jobId, s) {
  const f = await t.flow.fill(jobId, s, CAR);
  assert.ok(f.ok, s + ' fill: ' + f.reason + ' ' + (f.missing || []).join(','));
  const a = await t.flow.allowSave(jobId, s);
  assert.ok(a.ok, s + ' allowSave: ' + a.reason);
  await t.clickSave(s);
  await sleep(150);
  await t.settle(s);
  if (s !== 'entry') await sleep(150);                                    // 목록 다시 그리기
  return t.flow.afterSave(jobId, s);
}

app.whenReady().then(async () => {
  await scenario('정상: 숨긴 창에서 카인포 → 카모두 → 엔트리 세 곳 같은 번호로 끝나고, 창은 한 번도 보이거나 초점을 받지 않음', async () => {
    const t = await setup();
    const { jobId } = await t.flow.start(CAR);
    const pre = await t.flow.entryPrecheck(jobId);
    assert.ok(pre.ok, pre.reason);
    const r1 = await siteRound(t, jobId, 'carinfo');
    assert.deepStrictEqual(r1, { ok: true, checkNo: 'T-0201' });
    const r2 = await siteRound(t, jobId, 'carmodoo');
    assert.deepStrictEqual(r2, { ok: true, checkNo: 'T-0201' });
    assert.strictEqual(await t.js('carmodoo', 'autoNo.checked'), false, '«자동 부여» 꺼짐');
    await t.wins.entry.reload(); await sleep(300);
    const r3 = await siteRound(t, jobId, 'entry');
    assert.deepStrictEqual(r3, { ok: true, checkNo: 'T-0201' });
    assert.ok(t.flow.finish(jobId).ok);
    assert.deepStrictEqual(t.M.S.saves, { carinfo: 1, carmodoo: 1, entry: 1 });
    for (const s of Object.keys(t.wins)) assert.strictEqual(t.wins[s].isVisible(), false, s + ' 창이 보이면 안 됨');
    assert.strictEqual(BrowserWindow.getFocusedWindow(), null, '초점을 가져간 창 없음');
    await t.done();
  });

  await scenario('허락 전 [저장] 클릭은 개발자 연결에서 실제로 막혀 서버에 닿지 않음', async () => {
    const t = await setup();
    const { jobId } = await t.flow.start(CAR);
    await t.flow.fill(jobId, 'carinfo', CAR);
    await t.clickSave('carinfo');
    await sleep(400);
    assert.strictEqual(t.M.S.saves.carinfo, 0);
    assert.strictEqual(await t.js('carinfo', 'msg.textContent'), 'blocked');
    await t.done();
  });

  await scenario('두 번 클릭: 한 번 허락에 서버 저장 한 번만', async () => {
    const t = await setup();
    const { jobId } = await t.flow.start(CAR);
    await t.flow.fill(jobId, 'carinfo', CAR);
    await t.flow.allowSave(jobId, 'carinfo');
    await t.clickSave('carinfo'); await t.clickSave('carinfo');
    await sleep(400);
    assert.strictEqual(t.M.S.saves.carinfo, 1);
    await t.done();
  });

  await scenario('서버가 저장하고 500 을 돌려줌 → 불확실 → 다시 저장 금지 → 목록 확인으로 저장 확인 (두 번 등록 없음)', async () => {
    const t = await setup({ carinfo500: true });
    const { jobId } = await t.flow.start(CAR);
    const r = await siteRound(t, jobId, 'carinfo');
    assert.strictEqual(r.uncertain, true, JSON.stringify(r));
    assert.strictEqual((await t.flow.allowSave(jobId, 'carinfo')).ok, false);
    const c = await t.flow.confirmFromList(jobId, 'carinfo');
    assert.deepStrictEqual(c, { ok: true, checkNo: 'T-0201' });
    assert.strictEqual(t.M.S.saves.carinfo, 1);
    await t.done();
  });

  await scenario('다른 주소 팝업으로 저장 → 팝업에도 붙어 막고 «알 수 없는 저장 경로»로 멈춤', async () => {
    const t = await setup();
    const { jobId } = await t.flow.start(CAR);
    await t.flow.fill(jobId, 'carinfo', CAR);
    await t.flow.allowSave(jobId, 'carinfo');
    await t.js('carinfo', 'document.getElementById("btnPopup").click();1');
    await sleep(800);
    assert.strictEqual(t.M.S.saves.foreign || 0, 0, '다른 주소로 저장이 나가지 않음');
    const r = await t.flow.afterSave(jobId, 'carinfo');
    assert.strictEqual(r.stopped, true, JSON.stringify(r));
    assert.match(r.reason, /localhost/);
    BrowserWindow.getAllWindows().forEach((w) => assert.strictEqual(w.isVisible(), false, '팝업도 숨김'));
    await t.done();
  });

  await scenario('엔트리 다음 번호가 다른 차 번호 → 끌어온 차량이 달라 저장 허락 안 함', async () => {
    const t = await setup();
    t.M.S.carinfo.push(['T-0150', '99다9999', 'KMHZZ00ZZZZ999999', '2026-10-19', '완료']);
    const { jobId } = await t.flow.start(CAR);
    await siteRound(t, jobId, 'carinfo');
    await siteRound(t, jobId, 'carmodoo');
    t.M.S.faults.entryNext = 'T-0150';
    await t.wins.entry.reload(); await sleep(300);
    await t.flow.fill(jobId, 'entry', CAR);
    const a = await t.flow.allowSave(jobId, 'entry');
    assert.strictEqual(a.ok, false);
    assert.strictEqual(t.M.S.saves.entry, 0);
    await t.done();
  });

  await scenario('엔트리 로그아웃 → 로그인 요청, 값 넣기 안 함', async () => {
    const t = await setup();
    const { jobId } = await t.flow.start(CAR);
    await siteRound(t, jobId, 'carinfo');
    await siteRound(t, jobId, 'carmodoo');
    t.M.S.faults.entryLoggedOut = true;
    await t.wins.entry.reload(); await sleep(300);
    const f = await t.flow.fill(jobId, 'entry', CAR);
    assert.strictEqual(f.needLogin, true);
    await t.done();
  });

  await scenario('끝난 뒤 봉인: 카인포 저장이 끝난 창에서 다시 [저장]을 눌러도 서버에 닿지 않음 (중복 저장 막기)', async () => {
    const t = await setup();
    const { jobId } = await t.flow.start(CAR);
    const r = await siteRound(t, jobId, 'carinfo');
    assert.strictEqual(r.ok, true, JSON.stringify(r));
    await t.clickSave('carinfo');
    await sleep(400);
    assert.strictEqual(t.M.S.saves.carinfo, 1, '두 번째 저장이 서버에 닿으면 안 됨');
    assert.strictEqual(await t.js('carinfo', 'msg.textContent'), 'blocked');
    await t.done();
  });

  await scenario('통제기를 먼저 걸고 값 넣기: 값 넣는 중 [저장] 클릭도 막힘', async () => {
    const t = await setup();
    const { jobId } = await t.flow.start(CAR);
    const orig = t.adapters.carinfo.fill;
    t.adapters.carinfo.fill = async (d, e) => { await t.clickSave('carinfo'); await sleep(300); return orig(d, e); };
    await t.flow.fill(jobId, 'carinfo', CAR);
    assert.strictEqual(t.M.S.saves.carinfo, 0);
    await t.done();
  });

  await scenario('팝업의 «첫 요청»이 저장(POST)인 경우: 잠긴 동안 서버에 닿지 않는지 + 저장 단계면 사람 확인으로', async () => {
    const t = await setup();
    const { jobId } = await t.flow.start(CAR);
    await t.flow.fill(jobId, 'carinfo', CAR);
    //  ① 잠긴 동안(허락 전) 팝업으로 바로 저장 시도
    await t.js('carinfo', 'document.getElementById("btnPopupPost").click();1');
    await sleep(900);
    const leakedLocked = t.M.S.saves.carinfo;
    //  ② 허락 뒤 팝업으로 바로 저장
    await t.flow.allowSave(jobId, 'carinfo');
    await t.js('carinfo', 'document.getElementById("btnPopupPost").click();1');
    await sleep(900);
    await t.settle('carinfo');
    const r = await t.flow.afterSave(jobId, 'carinfo');
    console.log('INFO 팝업 첫 요청: 잠긴 동안 서버 도착 ' + leakedLocked + '건 · 허락 뒤 결과 ' + JSON.stringify({ manual: r.manual, saves: t.M.S.saves.carinfo }));
    assert.strictEqual(leakedLocked, 0, '잠긴 동안 팝업 첫 요청이 새어 나감');
    assert.strictEqual(r.manual, true, '팝업 저장은 자동으로 끝내지 않고 사람 확인: ' + JSON.stringify(r));
    await t.done();
  });

  await scenario('창 초점 없이 개발자 연결로 보낸 엔터를 숨긴 창의 페이지가 «진짜 키»로 받음', async () => {
    const M = await createMockSites();
    const w = new BrowserWindow({ show: false, webPreferences: { ...quiet.extraPrefs(true) } });
    await w.loadURL(M.base + '/carinfo');
    await quiet.cdpKey(w.webContents, 'Enter');
    const k = await until(() => w.webContents.executeJavaScript('window.__key||null'));
    assert.deepStrictEqual(k, { key: 'Enter', trusted: true });
    assert.strictEqual(w.isVisible(), false);
    assert.strictEqual(BrowserWindow.getFocusedWindow(), null);
    w.destroy(); M.close();
  });

  results.forEach((r, i) => console.log((r.ok ? 'ok ' : 'not ok ') + (i + 1) + ' - ' + r.name + (r.ok ? '' : '\n  error: ' + r.error)));
  const fail = results.filter((r) => !r.ok).length;
  console.log('# tests ' + results.length + '\n# pass ' + (results.length - fail) + '\n# fail ' + fail);
  app.exit(fail ? 1 : 0);
});
