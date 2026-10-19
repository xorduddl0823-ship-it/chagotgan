/*  Electron 모의 통합 시험 실행기
 *  · 프로그램 폴더에서 `npm run test:electron`
 *  · Electron 은 프로그램 본체 준비(1_준비.bat = npm install)로 이미 받아져 있어야 한다
 *  · 리눅스처럼 화면이 없는 곳에서는 xvfb-run 으로 띄운다(윈도우 PC 에서는 그냥 띄움 — 창은 숨겨진 채로 돈다) */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

let electron;
try { electron = require('electron'); } catch {
  console.log('not ok 1 - Electron 이 없습니다. 프로그램 폴더에서 1_준비.bat(npm install)을 먼저 해 주세요.');
  process.exit(1);
}
const script = path.join(__dirname, 'integration.js');
const args = [script];
let cmd = electron;
let full = args;
if (process.platform === 'linux') {
  full = ['--no-sandbox', ...args];
  if (!process.env.DISPLAY && fs.existsSync('/usr/bin/xvfb-run')) { cmd = 'xvfb-run'; full = ['-a', electron, ...full]; }
}
const r = spawnSync(cmd, full, { encoding: 'utf8', timeout: 180000 });
const out = String(r.stdout || '');
process.stdout.write(out.split('\n').filter((l) => /^(ok|not ok|#|  error|INFO)/.test(l)).join('\n') + '\n');

//  실제 프로그램(main.js)이 바뀐 코드로 뜨는지 — 임시 기록 폴더로 띄워 입력 화면이 뜨면 바로 끝냄(사이트 접속 없음)
const root = path.join(__dirname, '..', '..');
const smokeArgs = full.slice(0, full.length - args.length).concat([root]);
const sm = spawnSync(cmd, smokeArgs, { encoding: 'utf8', timeout: 60000, env: { ...process.env, CARCHECK_SMOKE: '1' } });
const line = String(sm.stdout || '').split('\n').find((l) => l.startsWith('SMOKE')) || '';
const smokeOk = /main-title=성능점검 이중등록/.test(line);
console.log((smokeOk ? 'ok' : 'not ok') + ' - 실제 프로그램(main.js)이 바뀐 코드로 뜨고 입력 화면이 열림' + (smokeOk ? '' : '\n  error: ' + (line || String(sm.stderr || '').slice(-300))));
if (!smokeOk) process.exit(1);

//  실제 프로그램의 [세 전산 자동 등록] 단추 → 엔진까지 이어지는지(실제 전산 주소는 막아 둠) —
//  실제 전산 설정이 비어 있으므로 저장 전에 «자동 등록 멈춤»과 쉬운 까닭이 나와야 정상
const sf = spawnSync(cmd, smokeArgs, { encoding: 'utf8', timeout: 90000, env: { ...process.env, CARCHECK_SMOKE: '1', CARCHECK_SMOKE_FLOW: '1' } });
const fl = String(sf.stdout || '').split('\n').find((l) => l.startsWith('SMOKE-FLOW')) || '';
const flowOk = /button=true/.test(fl) && /자동 등록 멈춤/.test(fl) && /카인포 목록 칸 설정이 아직 없습니다/.test(fl);
console.log((flowOk ? 'ok' : 'not ok') + ' - 실제 프로그램: [세 전산 자동 등록] → 엔진 → 설정 미확정이라 저장 전에 멈추고 쉬운 까닭 표시' + (flowOk ? '' : '\n  error: ' + (fl || String(sf.stderr || '').slice(-300))));
if (!flowOk) process.exit(1);
if (r.status !== 0) {
  const err = String(r.stderr || '').split('\n').filter((l) => !/dbus|bus\.cc|viz_main|shared_image|one_copy|Fontconfig|gpu/i.test(l)).slice(-15).join('\n');
  if (err.trim()) process.stdout.write('--- stderr ---\n' + err + '\n');
}
process.exit(r.status === 0 ? 0 : 1);
