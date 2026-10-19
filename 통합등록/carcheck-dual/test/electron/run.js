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
const line = String(sm.stdout || '').split('\n').find((l) => l.startsWith('SMOKE main-title')) || '';
const smokeOk = /main-title=성능점검 이중등록/.test(line);
console.log((smokeOk ? 'ok' : 'not ok') + ' - 실제 프로그램(main.js)이 바뀐 코드로 뜨고 입력 화면이 열림' + (smokeOk ? '' : '\n  error: ' + (line || String(sm.stderr || '').slice(-300))));
if (!smokeOk) process.exit(1);

//  실제 프로그램의 [세 전산 자동 등록] 단추 → 엔진까지 이어지는지(실제 전산 주소는 막아 둠) —
//  실제 전산 설정이 비어 있으므로 저장 전에 «자동 등록 멈춤»과 쉬운 까닭이 나와야 정상
const sf = spawnSync(cmd, smokeArgs, { encoding: 'utf8', timeout: 90000, env: { ...process.env, CARCHECK_SMOKE: '1', CARCHECK_SMOKE_FLOW: '1' } });
const fl = String(sf.stdout || '').split('\n').find((l) => l.startsWith('SMOKE-FLOW')) || '';
//  7차: 카인포 목록 칸은 대표님 화면 사진으로 채움 → 이제는 «신규등록 요청 주소 설정 없음»(실제 화면 확인 필요)에서 멈춰야 정상
const flowOk = /button=true/.test(fl) && /자동 등록 멈춤/.test(fl) && /설정이 (아직 )?없습니다/.test(fl) && /실제 화면 확인 필요/.test(fl);
console.log((flowOk ? 'ok' : 'not ok') + ' - 실제 프로그램: [세 전산 자동 등록] → 엔진 → 설정 미확정이라 저장 전에 멈추고 쉬운 까닭 표시' + (flowOk ? '' : '\n  error: ' + (fl || String(sf.stderr || '').slice(-300))));
if (!flowOk) process.exit(1);

//  (8차) 실제 프로그램의 [전산 진단] → 카인포 진단 시작 → 진단 끝 → 기록 파일 안내(실제 전산 주소는 막아 둠)
const sd = spawnSync(cmd, smokeArgs, { encoding: 'utf8', timeout: 90000, env: { ...process.env, CARCHECK_SMOKE: '1', CARCHECK_SMOKE_DIAG: '1' } });
const dl = String(sd.stdout || '').split('\n').find((l) => l.startsWith('SMOKE-DIAG')) || '';
const diagOk = /button=true/.test(dl) && /진단 중/.test(dl) && /전산 진단 끝/.test(dl) && /diag-carinfo-/.test(dl);
console.log((diagOk ? 'ok' : 'not ok') + ' - 실제 프로그램: [전산 진단] → 카인포 진단 시작 → 진단 끝 → 기록 파일 안내' + (diagOk ? '' : '\n  error: ' + (dl || String(sd.stderr || '').slice(-300))));
if (!diagOk) process.exit(1);

//  (12차) 실제 프로그램의 «실제 등록 관찰»: 고르기 → 카인포 관찰 시작 → «전산·대상 차량» 확인 → 화면 칸 저절로 기록 → 관찰 끝 → «관찰» 기록 파일
const so = spawnSync(cmd, smokeArgs, { encoding: 'utf8', timeout: 90000, env: { ...process.env, CARCHECK_SMOKE: '1', CARCHECK_SMOKE_DIAG: '1', CARCHECK_SMOKE_OBSERVE: '1' } });
const ol = String(so.stdout || '').split('\n').find((l) => l.startsWith('SMOKE-DIAG')) || '';
const oc = String(so.stdout || '').split('\n').find((l) => l.startsWith('SMOKE-OBSERVE-CONFIRM')) || '';
const obsOk = /카인포/.test(oc) && /00가0000/.test(oc) && /실제로 등록/.test(oc) &&
  /관찰 중 —/.test(ol) && /실제 등록 관찰 끝/.test(ol) && /diag-carinfo-관찰-/.test(ol) && !/화면 칸 기록 0번/.test(ol);
console.log((obsOk ? 'ok' : 'not ok') + ' - 실제 프로그램: [실제 등록 관찰] → 전산·대상 차량 확인 → 막지 않고 기록 · 화면 칸 저절로 기록 → «관찰» 기록 파일' + (obsOk ? '' : '\n  error: ' + oc + ' / ' + (ol || String(so.stderr || '').slice(-300))));
if (!obsOk) process.exit(1);

//  (10차) 시험판 표시(test-install.json)가 있으면 기록 폴더를 업무용과 따로 쓰고 창 제목에 «시험판» — 확인 뒤 표시 파일은 지움
const marker = path.join(root, 'test-install.json');
const hadMarker = fs.existsSync(marker);
if (!hadMarker) fs.writeFileSync(marker, JSON.stringify({ dataFolder: 'carcheck-dual-시험판' }));
let ti = '';
try {
  const st = spawnSync(cmd, smokeArgs, { encoding: 'utf8', timeout: 60000, env: { ...process.env, CARCHECK_SMOKE: '1' } });
  ti = String(st.stdout || '').split('\n').find((l) => l.startsWith('SMOKE-INSTALL')) || '';
} finally { if (!hadMarker) fs.unlinkSync(marker); }
const tiOk = /wtitle=.*시험판/.test(ti) && /userData=carcheck-dual-시험판/.test(ti);
console.log((tiOk ? 'ok' : 'not ok') + ' - 시험판: 기록 폴더를 업무용(carcheck-dual)과 따로 쓰고 창 제목에 «시험판»' + (tiOk ? '' : '\n  error: ' + ti));
if (!tiOk) process.exit(1);
if (r.status !== 0) {
  const err = String(r.stderr || '').split('\n').filter((l) => !/dbus|bus\.cc|viz_main|shared_image|one_copy|Fontconfig|gpu/i.test(l)).slice(-15).join('\n');
  if (err.trim()) process.stdout.write('--- stderr ---\n' + err + '\n');
}
process.exit(r.status === 0 ? 0 : 1);
