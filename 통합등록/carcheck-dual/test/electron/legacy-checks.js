/*  기존 업무용 [경기조합만] 실행 시험(13·14차) — legacy-carmodoo-run.js 를 상황별로 돌려 «중복 접수 0 · 빨리 멈춤»을 확인한다.
 *  run.js(npm run test:electron) 끝에서 부른다. 실제 사이트 접속 없음.
 *  준비물이 없으면(playwright-core·openssl) 실패로 알린다 — 조용히 건너뛰지 않음.
 *  PACKAGED_EXE 를 주면 포장한 실행 파일로 같은 시험을 한다(윈도우 EXE 검증용). */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const runner = path.join(__dirname, 'legacy-carmodoo-run.js');
const appDir = path.join(__dirname, '..', '..');
const useXvfb = process.platform === 'linux' && !process.env.DISPLAY && fs.existsSync('/usr/bin/xvfb-run');

function run(env, presses) {
  const cmd = useXvfb ? 'xvfb-run' : process.execPath;
  const args = (useXvfb ? ['-a', process.execPath] : []).concat([runner, appDir, String(presses)]);
  const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: 400000, env: { ...process.env, WAIT_MS: '120000', ...env } });
  const out = String(r.stdout || '');
  const i = out.indexOf('{');
  try { return JSON.parse(out.slice(i)); } catch { return { error: (out + String(r.stderr || '')).slice(-600) }; }
}

const CASES = [
  { name: '[경기조합만] 3번(사진 2장) → 새 접수 0건 · 사진은 자동으로 올리지 않음', env: {}, presses: 3,
    ok: (d) => d.totals.register === 0 && d.sameCarRecords.length === 0 && /자동으로 올리지 않아요/.test(d.presses[0].report) },
  { name: '같은 차 오늘 접수가 이미 있음 → 새 접수를 열지 않고 멈춤', env: { SEED: '1' }, presses: 1,
    ok: (d) => d.totals.register === 0 && d.presses[0].newForms === 0 && /오늘 접수가 이미 있어요/.test(d.presses[0].report) },
  { name: '같은 차가 리스트 2쪽에 있음(전체 13건 중 10건만 보임) → 새 접수를 열지 않고 멈춤', env: { SEED: '1', OTHERS: '12', PAGE_SIZE: '10' }, presses: 1,
    ok: (d) => d.presses[0].newForms === 0 && /여러 쪽이에요\(전체 13건 중 10건만 보임\)/.test(d.presses[0].report) },
  { name: '리스트 전체 건수(Total)를 못 읽음 → 새 접수를 열지 않고 멈춤', env: { NO_TOTAL: '1' }, presses: 1,
    ok: (d) => d.presses[0].newForms === 0 && /전체 건수\(Total\)를 읽지 못해/.test(d.presses[0].report) },
  { name: '경기조합 화면이 안 열림 → 10초 안에 오류 결과(먹통 없음)', env: { MOCK_DOWN: '1' }, presses: 1,
    ok: (d) => d.presses[0].seconds < 10 && /사이트 화면을 열지 못했어요/.test(d.presses[0].report) },
  { name: '값 넣는 중 사이트 알림창 → 10초 안에 멈춤 · 알림창은 그대로(사람이 누름)', env: { DIALOG_ON_FILL: '1' }, presses: 1,
    ok: (d) => d.presses[0].seconds < 10 && /사이트 알림창이 떠서 멈췄어요/.test(d.presses[0].report) && d.presses[0].dialogs.length >= 1 },
];

let bad = 0;
for (const c of CASES) {
  const d = run(c.env, c.presses);
  let pass = false;
  try { pass = !d.error && c.ok(d); } catch {}
  if (!pass) bad++;
  console.log((pass ? 'ok' : 'not ok') + ' - (기존 기능) ' + c.name + (pass ? '' : '\n  error: ' + (d.error || JSON.stringify(d).slice(0, 600))));
}
process.exitCode = bad ? 1 : 0;
