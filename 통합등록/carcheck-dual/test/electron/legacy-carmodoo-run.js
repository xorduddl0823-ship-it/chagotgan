/*  기존 업무용 [경기조합만] 실제 실행 재현 (10/19 대표님 PC 오류) — 진짜 프로그램(main.js·화면)을 그대로 띄우고
 *  단추를 눌러 흉내 경기조합(mock-carmodoo.js)에 보낸다. 실제 사이트 접속 없음 · 실제 기록 폴더 안 씀(임시 폴더).
 *  사용: node test/electron/legacy-carmodoo-run.js [프로그램 폴더] [몇 번 누를지(기본 2)]
 *  필요: playwright-core(/opt/node-tools 또는 PLAYWRIGHT_CORE), xvfb(리눅스), openssl
 *  출력: 누른 횟수별 걸린 시간 · 결과 창 글 · 사이트 알림창 · 흉내 사이트가 받은 «접수 등록»·«저장»·«사진 올리기» 횟수 · 목록의 같은 차 줄 수 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createMockCarmodoo } = require('./mock-carmodoo');

const appDir = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const presses = Number(process.argv[3] || 2);
const { _electron } = require(process.env.PLAYWRIGHT_CORE || '/opt/node-tools/node_modules/playwright-core');
const electronBin = require(path.join(__dirname, '..', '..', 'node_modules', 'electron'));
const CAR = '99가9999';

(async () => {
  const M = await createMockCarmodoo({ seed: process.env.SEED === '1' ? [CAR] : [], dialogOnFill: process.env.DIALOG_ON_FILL === '1' });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-legacy-'));
  const photo = (n) => { const f = path.join(tmp, n + '.jpg'); fs.writeFileSync(f, Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==', 'base64')); return f; };
  const p1 = photo('front'), p2 = photo('back');
  //  PACKAGED_EXE 를 주면 «포장한 실행 파일»(electron-builder 결과)을 그대로 띄운다 — 프로그램 폴더 인자 없음
  const packaged = process.env.PACKAGED_EXE || '';
  const app = await _electron.launch({ executablePath: packaged || electronBin, timeout: 60000,
    args: ['--no-sandbox', '--no-proxy-server', '--ignore-certificate-errors', '--host-resolver-rules=MAP ck.carmodoo.com 127.0.0.1:' + (process.env.MOCK_DOWN === '1' ? 9 : M.port) + ',MAP ai.carinfo.co.kr 127.0.0.1:9'].concat(packaged ? [] : [appDir]),
    env: { ...process.env, XDG_CONFIG_HOME: tmp, APPDATA: tmp } });
  const dialogs = [];
  const hook = (pg) => pg.on('dialog', (d) => { dialogs.push({ at: Date.now(), type: d.type(), message: d.message(), d }); });   // 처리하지 않음 → 대표님 PC처럼 떠 있는 채로
  app.windows().forEach(hook);
  app.on('window', hook);
  const w = await app.firstWindow();
  await w.waitForSelector('#f_carNo', { timeout: 30000 });
  const pageErrors = [];
  w.on('pageerror', (e) => pageErrors.push(String(e && e.message || e).slice(0, 300)));
  w.on('console', (m) => { if (m.type() === 'error') pageErrors.push(m.text().slice(0, 300)); });
  //  필수 칸을 모두 채움(가짜 값) + 사진 두 장
  await w.evaluate(({ car, p1, p2 }) => {
    SCHEMA.groups.forEach((g) => g.fields.forEach((f) => {
      if (!f.req || String(state[f.k] || '').trim()) return;
      state[f.k] = f.type === 'date' ? '2026-10-19' : f.type === 'select' ? ((SCHEMA.opts[f.opts] || [])[0] || [''])[0] : '1';
    }));
    Object.assign(state, { carNo: car, dealerName: '시험딜러', vin: 'KMHXX00XXXX999999', memo: '전기차', photo1: p1, photo2: p2 });
  }, { car: CAR, p1, p2 });

  const out = [];
  for (let i = 1; i <= presses; i++) {
    const before = { register: M.S.registerCalls, save: M.S.saveCalls, upload: M.S.uploads, forms: M.S.newForms, dialogs: dialogs.length };
    const t0 = Date.now();
    await w.evaluate(() => { document.getElementById('report').classList.add('hidden'); document.getElementById('btn-send-cm').click(); });
    let rep = null;
    let firstDialogMs = null;
    while (Date.now() - t0 < Number(process.env.WAIT_MS || 300000) && !rep) {
      await new Promise((r) => setTimeout(r, 250));
      if (firstDialogMs == null && dialogs.length > before.dialogs) firstDialogMs = dialogs[before.dialogs].at - t0;
      rep = await w.evaluate(() => { const r = document.getElementById('report'); return r && !r.classList.contains('hidden') ? document.getElementById('report-body').innerText : null; }).catch(() => null);
    }
    out.push({ press: i, seconds: Math.round((Date.now() - t0) / 100) / 10, firstDialogSeconds: firstDialogMs == null ? null : Math.round(firstDialogMs / 100) / 10,
      registerCalls: M.S.registerCalls - before.register, saveCalls: M.S.saveCalls - before.save, uploads: M.S.uploads - before.upload, newForms: M.S.newForms - before.forms,
      dialogs: dialogs.slice(before.dialogs).map((d) => d.type + ': ' + d.message), pageErrors: pageErrors.splice(0),
      busyShown: await w.evaluate(() => !document.getElementById('busy').classList.contains('hidden') ? document.getElementById('busy-text').textContent : null).catch(() => null), report: rep ? rep.replace(/\s+/g, ' ').slice(0, 900) : '(기다린 시간 안에 결과 창이 안 뜸 — 화면은 «전송 중…»에 멈춰 있음)' });
    //  대표님처럼 알림창 [확인]을 누름(다음 누르기 전에)
    for (const d of dialogs.slice(before.dialogs)) { try { await d.d.accept(); } catch {} }
  }
  const same = M.S.records.filter((r) => r.carNo === CAR);
  console.log(JSON.stringify({ app: appDir, presses: out, sameCarRecords: same.map((r) => r.no + (r.photos ? ' 사진' + r.photos : ' 사진없음')), totals: { register: M.S.registerCalls, save: M.S.saveCalls, upload: M.S.uploads } }, null, 1));
  await app.close().catch(() => {});
  M.close();
})().catch((e) => { console.error('ERR ' + (e && e.stack || e)); process.exit(1); });
