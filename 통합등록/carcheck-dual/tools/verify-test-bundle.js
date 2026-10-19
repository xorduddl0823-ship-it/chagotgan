/*  다 만든 시험판 묶음 검사 (10차 검수 보완) — 대표님이 받을 ZIP 을 «그대로» 풀어서 확인한다.
 *  실행: node tools/verify-test-bundle.js <zip>      (개발 PC · 리눅스 시험 환경용. 대표님은 실행하지 않음)
 *  확인하는 것
 *   1. 묶음 안 파일 — 시험판 표시(test-install.json)가 정확한지 · 안내서(0_먼저읽기)·bat·프로그램 파일이 다 있는지 · 넣으면 안 되는 것(기록·설정·로그인 정보)이 없는지
 *   2. bat — 윈도우 한국어 글자판(cp949)·줄 끝(CRLF)·«cd /d "%~dp0"»·chcp 뒤에는 영어 글자만·부르는 도구 파일이 묶음에 있는지
 *   3. 가짜 APPDATA 에 «업무용 기록 폴더(carcheck-dual)»를 만들어 두고, bat 이 부르는 명령을 묶음 폴더에서 그대로 실행
 *      (0 백업 · 7 켜기 · 8 끄기 · 9 검사) + 묶음의 프로그램을 실제로 띄워(Electron) 기록 폴더·창 제목·진단 단추·진단 기록 파일 확인
 *   4. 끝난 뒤 업무용 폴더의 모든 파일이 «한 글자도» 안 바뀌었는지(지문 비교) · 새 파일이 안 생겼는지
 *      + 업무용 폴더가 없는 PC 에서는 시험판이 그 폴더를 만들지 않는지
 *      + (strace 가 있으면) 시험판 프로그램·도구가 업무용 폴더를 «열어 보지도» 않는지(파일 열기 기록)
 *  실제 전산 주소로는 나가지 않는다(프로그램 시험 실행은 막아 둔 주소 127.0.0.1:9 를 씀). */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { extractZip } = require('./zip-lite');

const FOLDER = 'carcheck-dual-시험판';
const GUIDE = '0_먼저읽기_화면확인_안내서.txt';
const results = [];
const ok = (cond, name, info) => { results.push({ ok: !!cond, name, info }); console.log((cond ? 'ok' : 'not ok') + ' ' + results.length + ' - ' + name + (info && !cond ? '\n  # ' + info : info ? '  # ' + info : '')); return !!cond; };

const zipPath = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(zipPath)) { console.log('사용: node tools/verify-test-bundle.js <시험판 zip>'); process.exit(1); }
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-bundle-'));
const unz = path.join(work, 'unzipped');
const items = extractZip(fs.readFileSync(zipPath), unz);
const B = path.join(unz, FOLDER);
console.log('# 묶음: ' + path.basename(zipPath) + ' · 파일 ' + items.length + '개 · 푼 곳 ' + unz);

/* ── 1. 묶음 안 파일 ── */
ok(items.every((i) => i.utf8Flag), '모든 파일 이름에 UTF-8 표시(윈도우 압축 풀기에서 한글 이름이 안 깨짐)');
ok(fs.existsSync(path.join(unz, GUIDE)) && fs.existsSync(path.join(B, GUIDE)), '«0_먼저읽기» 안내서가 맨 위와 프로그램 폴더 안에 모두 있음');
const g = fs.existsSync(path.join(unz, GUIDE)) ? fs.readFileSync(path.join(unz, GUIDE)) : Buffer.alloc(0);
ok(g[0] === 0xef && g[1] === 0xbb && g[2] === 0xbf && /\r\n/.test(g.toString('utf8')), '안내서는 메모장에서 바로 열리는 글자판(UTF-8 BOM · CRLF)');
ok(['A. 준비', 'B. 차 1대 실제 등록 관찰', 'C. 보내기 전 검사', '검토용', '9_진단파일_검사.bat', '8_전산진단_끄기.bat'].every((h) => g.toString('utf8').includes(h)), '안내서에 준비·차 1대 실제 등록 관찰(카인포→경기조합→엔트리)·자동+눈 검사가 다 있음');
let marker = null;
try { marker = JSON.parse(fs.readFileSync(path.join(B, 'test-install.json'), 'utf8')); } catch {}
ok(marker && marker.dataFolder === FOLDER, 'test-install.json 이 정확히 들어 있음 — dataFolder = ' + FOLDER, JSON.stringify(marker));
ok(!fs.existsSync(path.join(unz, 'test-install.json')), 'test-install.json 은 프로그램 폴더 안에만(맨 위에는 없음)');
const NEED = ['main.js', 'preload.js', 'package.json', 'package-lock.json', 'renderer/index.html', 'renderer/app.js', 'renderer/style.css',
  'src/core/register-flow.js', 'src/sites/site-config.js', 'src/sites/diag-recorder.js', 'src/sites/diag-session.js',
  'tools/data-dir.js', 'tools/diag-on.js', 'tools/diag-check.js', 'tools/backup-data.js', 'tools/config-check.js', '시험판_파일목록.txt',
  '0_업무용기록_백업.bat', '1_준비.bat', '2_실행.bat', '7_전산진단_켜기.bat', '8_전산진단_끄기.bat', '9_진단파일_검사.bat'];
const missing = NEED.filter((f) => !fs.existsSync(path.join(B, f)));
ok(!missing.length, '프로그램·도구·bat·파일 목록이 다 있음(' + NEED.length + '개)', missing.join(', '));
const BAD = /(^|\/)(node_modules|\.git)(\/|$)|(^|\/)(config|credentials|admin)\.json$|\.jsonl$|(^|\/)diag-[^/]*\.json$|(^|\/)test\//i;
const bad = items.map((i) => i.name).filter((n) => BAD.test(n));
ok(!bad.length, '넣으면 안 되는 것(기록·설정·로그인 정보·진단 기록·node_modules·개발 시험)이 없음', bad.join(', '));
const pkg = JSON.parse(fs.readFileSync(path.join(B, 'package.json'), 'utf8'));
ok(!Object.keys(pkg.dependencies || {}).length && pkg.devDependencies && pkg.devDependencies.electron, 'package.json — 1_준비.bat(npm install)으로 Electron 만 받으면 실행됨');
const listTxt = fs.readFileSync(path.join(B, '시험판_파일목록.txt'), 'utf8');
const inList = items.filter((i) => !i.name.endsWith('/')).map((i) => i.name).filter((n) => !listTxt.includes(n));
ok(!inList.length, '시험판_파일목록.txt 가 묶음의 모든 파일을 적고 있음', inList.join(', '));

/* ── 2. bat ── */
const dec = new TextDecoder('euc-kr');
const bats = {};
for (const f of fs.readdirSync(B).filter((x) => /\.bat$/.test(x))) {
  const raw = fs.readFileSync(path.join(B, f));
  const txt = dec.decode(raw);
  bats[f] = txt;
  const lines = txt.split('\r\n');
  const crlf = !/[^\r]\n/.test(raw.toString('latin1'));
  const cd = lines.includes('cd /d "%~dp0"');
  const utf8Bad = (() => { try { new TextDecoder('utf-8', { fatal: true }).decode(raw); return /[^\x00-\x7f]/.test(raw.toString('latin1')); } catch { return false; } })();
  const ci = lines.findIndex((l) => /^chcp 65001/.test(l));
  const afterAscii = ci < 0 || lines.slice(ci + 1).every((l) => /^[\x00-\x7f]*$/.test(l));
  const cmds = lines.filter((l) => /^node\s/.test(l));
  const scripts = cmds.map((l) => l.split(/\s+/)[1].replace(/\\/g, '/'));
  const there = scripts.every((s) => fs.existsSync(path.join(B, s)));
  if (/^[0789]_/.test(f)) ok(crlf && cd && !utf8Bad && afterAscii && there && cmds.length === 1,
    'bat ' + f + ' — cp949·CRLF·cd /d "%~dp0"·chcp 뒤 영어 글자만·부르는 도구(' + scripts.join(',') + ') 있음',
    JSON.stringify({ crlf, cd, utf8Bad, afterAscii, there, cmds }));
  else ok(crlf && cd, 'bat ' + f + ' — CRLF·cd /d "%~dp0"', JSON.stringify({ crlf, cd }));
}
const batCmd = (f) => { const l = bats[f].split('\r\n').find((x) => /^node\s/.test(x)); return l.split(/\s+/).slice(1).map((a, i) => (i === 0 ? a.replace(/\\/g, '/') : a)); };

/* ── 3. 가짜 PC 에서 bat 명령·프로그램 실행 ── */
function fakePc(name, withProduction) {
  const pc = path.join(work, name);
  const appdata = path.join(pc, 'AppData', 'Roaming');
  const home = path.join(pc, 'home');
  fs.mkdirSync(appdata, { recursive: true });
  fs.mkdirSync(path.join(home, 'Documents'), { recursive: true });
  const prod = path.join(appdata, 'carcheck-dual');
  if (withProduction) {
    //  업무용 기록 흉내(값은 모두 가짜) — 이 파일들이 한 글자라도 바뀌면 실패
    fs.mkdirSync(path.join(prod, 'Partitions', 'persist_carinfo'), { recursive: true });
    fs.writeFileSync(path.join(prod, 'config.json'), JSON.stringify({ vinTail: 6, autoSubmit: false, diagnose: false, flow: true }, null, 2));
    fs.writeFileSync(path.join(prod, 'credentials.json'), '{"note":"가짜 — 시험용 흉내 파일(진짜 로그인 정보 아님)"}');
    fs.writeFileSync(path.join(prod, 'jobs.jsonl'), '{"type":"start","jobId":"J-TEST","carNo":"00가0000"}\n');
    fs.writeFileSync(path.join(prod, 'records.jsonl'), '{"carNo":"00가0000","note":"가짜"}\n');
    fs.writeFileSync(path.join(prod, 'Partitions', 'persist_carinfo', 'Cookies'), 'FAKE-COOKIE-DB');
  }
  const env = { ...process.env, APPDATA: appdata, XDG_CONFIG_HOME: appdata, HOME: home, USERPROFILE: home };
  delete env.CARCHECK_SMOKE; delete env.CARCHECK_SMOKE_FLOW; delete env.CARCHECK_SMOKE_DIAG; delete env.CARCHECK_PROBE;
  return { pc, appdata, home, prod, test: path.join(appdata, FOLDER), env };
}
function fingerprint(dir) {
  const out = {};
  if (!fs.existsSync(dir)) return null;
  (function walk(d, rel) {
    for (const n of fs.readdirSync(d).sort()) {
      const f = path.join(d, n), r = rel ? rel + '/' + n : n, st = fs.statSync(f);
      if (st.isDirectory()) { out[r + '/'] = 'dir'; walk(f, r); }
      else out[r] = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') + ':' + st.size + ':' + st.mtimeMs;
    }
  })(dir, '');
  return out;
}
const HAS_STRACE = spawnSync('strace', ['-V']).status === 0;
/** 명령 실행(+ strace 로 «연 파일» 기록) → { status, out, touched: 업무용 폴더를 건드린 줄 } */
function run(pc, cmd, args, opts = {}) {
  let c = cmd, a = args;
  const trace = HAS_STRACE && opts.trace !== false ? path.join(work, 'trace-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.txt') : null;
  if (trace) { a = ['-f', '-qq', '-e', 'trace=open,openat,openat2,creat,mkdir,mkdirat,rename,renameat,renameat2,unlink,unlinkat,stat,lstat,newfstatat,statx,access,faccessat,faccessat2,readlink,readlinkat', '-o', trace, c, ...a]; c = 'strace'; }
  const r = spawnSync(c, a, { cwd: opts.cwd || B, env: { ...pc.env, ...(opts.env || {}) }, encoding: 'utf8', timeout: opts.timeout || 60000 });
  let touched = [];
  if (trace && fs.existsSync(trace)) {
    const needle = pc.prod;
    touched = fs.readFileSync(trace, 'utf8').split('\n').filter((l) => {
      const i = l.indexOf(needle);
      if (i < 0) return false;
      const nx = l[i + needle.length];
      return nx === '"' || nx === '/';                                 // carcheck-dual 자체 또는 그 안(시험판 «carcheck-dual-시험판»은 제외)
    });
  }
  return { status: r.status, out: String(r.stdout || '') + String(r.stderr || ''), touched };
}
let electron = process.env.ELECTRON_PATH || null;
if (!electron) { try { electron = require(path.join(__dirname, '..', 'node_modules', 'electron')); } catch {} }
function runApp(pc, extraEnv) {
  let cmd = electron, args = [B];
  if (process.platform === 'linux') {
    args = ['--no-sandbox', B];
    if (!process.env.DISPLAY && fs.existsSync('/usr/bin/xvfb-run')) { cmd = 'xvfb-run'; args = ['-a', electron, ...args]; }
  }
  return run(pc, cmd, args, { env: { CARCHECK_PROBE: '1', ...extraEnv }, timeout: 90000 });
}
const line = (out, k) => (out.split('\n').find((l) => l.startsWith(k)) || '');

//  ── PC 1: 업무용 기록이 있는 PC ──
const P = fakePc('pc-with-production', true);
const before = fingerprint(P.prod);
console.log('# 가짜 업무용 기록 폴더: 파일 ' + Object.keys(before).filter((k) => !k.endsWith('/')).length + '개(설정·가짜 로그인 정보·작업 기록·사이트 로그인 상태 흉내)');

//  0_업무용기록_백업.bat — 업무용 폴더를 «읽어서» 복사만(이 bat 만 업무용을 읽음 · 고치지 않음)
const r0 = run(P, 'node', batCmd('0_업무용기록_백업.bat'), { trace: false });
const bk = path.join(P.home, 'Documents', '차곳간_백업');
const bkDir = fs.existsSync(bk) ? fs.readdirSync(bk).map((n) => path.join(bk, n))[0] : null;
const bkFiles = bkDir ? fingerprint(bkDir) : {};
ok(r0.status === 0 && /백업했어요/.test(r0.out) && bkDir, '0_업무용기록_백업.bat — 업무용 기록을 문서\\차곳간_백업 으로 복사', r0.out.trim().split('\n')[0]);
ok(bkFiles['config.json'] && bkFiles['jobs.jsonl'] && !bkFiles['credentials.json'] && !Object.keys(bkFiles).some((k) => /^Partitions/.test(k)),
  '백업에 설정·작업 기록은 있고 로그인 정보(credentials.json)·사이트 로그인 상태(Partitions)는 없음', Object.keys(bkFiles).join(', '));
ok(JSON.stringify(fingerprint(P.prod)) === JSON.stringify(before), '백업 뒤 업무용 폴더 그대로(복사만)');

//  대조 시험 — 파일 열기 기록이 «업무용 폴더를 여는 것»을 실제로 잡아내는지(백업은 업무용을 읽으므로 잡혀야 정상)
if (HAS_STRACE) {
  const rc = run(P, 'node', batCmd('0_업무용기록_백업.bat'));
  ok(rc.touched.length > 0, '(대조) 파일 열기 기록 장치가 업무용 폴더 읽기를 잡아냄 — 백업 bat 은 읽으므로 잡혀야 정상', '잡힌 줄 ' + rc.touched.length);
}

//  7_전산진단_켜기.bat
const r7 = run(P, 'node', batCmd('7_전산진단_켜기.bat'));
let cfg7 = null; try { cfg7 = JSON.parse(fs.readFileSync(path.join(P.test, 'config.json'), 'utf8')); } catch {}
ok(r7.status === 0 && /켰어요/.test(r7.out) && cfg7 && cfg7.diagnose === true, '7_전산진단_켜기.bat — 시험판 기록 폴더(' + FOLDER + ')의 설정만 켬', r7.out.trim());
ok(!r7.touched.length, '7_전산진단_켜기.bat 은 업무용 폴더를 열어 보지도 않음' + (HAS_STRACE ? '(파일 열기 기록)' : '(strace 없음 — 확인 못 함)'), r7.touched.slice(0, 3).join(' | '));

//  묶음의 프로그램 실제 실행(진단 켜짐)
let app1 = null;
if (electron) {
  app1 = runApp(P, {});
  const pl = line(app1.out, 'SMOKE-PROBE'), il = line(app1.out, 'SMOKE-INSTALL');
  ok(pl.includes('userDataFull=' + P.test + ' '), '프로그램 실행 — 기록 폴더 = %APPDATA%\\' + FOLDER + '(업무용과 따로)', pl);
  ok(/wtitle=.*시험판\(업무용과 기록 따로\)/.test(il), '프로그램 창 제목 끝에 «시험판(업무용과 기록 따로)»', il);
  ok(/diagButton=true/.test(pl), '7번으로 켠 뒤 프로그램에 [전산 진단 (저장 안 함)] 단추가 보임', pl);
  ok(!app1.touched.length, '프로그램은 업무용 폴더를 열어 보지도 않음' + (HAS_STRACE ? '(파일 열기 기록)' : '(strace 없음 — 확인 못 함)'), app1.touched.slice(0, 3).join(' | '));
  //  진단 한 번(카인포 — 막아 둔 주소) → 기록 파일이 시험판 기록 폴더 diag\ 에 생기는지
  const app2 = runApp(P, { CARCHECK_SMOKE_DIAG: '1' });
  const dl = line(app2.out, 'SMOKE-DIAG');
  const diagDir = path.join(P.test, 'diag');
  const diagFiles = fs.existsSync(diagDir) ? fs.readdirSync(diagDir).filter((f) => /^diag-carinfo-.*\.json$/.test(f)) : [];
  ok(/진단 중/.test(dl) && /전산 진단 끝/.test(dl) && diagFiles.length === 1, '진단 시작 → 진단 끝 → 기록 파일이 시험판 기록 폴더(diag\\)에 생김', dl.slice(0, 200));
  ok(!app2.touched.length, '진단 중에도 업무용 폴더를 열어 보지 않음', app2.touched.slice(0, 3).join(' | '));
  //  (12차) 관찰 기록 한 번 → «관찰» 기록 파일이 시험판 기록 폴더에
  const app4 = runApp(P, { CARCHECK_SMOKE_DIAG: '1', CARCHECK_SMOKE_OBSERVE: '1' });
  const ol = line(app4.out, 'SMOKE-DIAG');
  const obsFiles = fs.existsSync(diagDir) ? fs.readdirSync(diagDir).filter((f) => /^diag-carinfo-관찰-.*\.json$/.test(f)) : [];
  ok(/관찰 중 —/.test(ol) && /실제 등록 관찰 끝/.test(ol) && obsFiles.length === 1, '실제 등록 관찰 시작(대상 차량 확인) → 관찰 끝 → «관찰» 기록 파일이 시험판 기록 폴더(diag\\)에 생김', ol.slice(0, 200));
  ok(!app4.touched.length, '관찰 기록 중에도 업무용 폴더를 열어 보지 않음', app4.touched.slice(0, 3).join(' | '));
} else ok(false, '프로그램 실행 확인 — Electron 이 없어 못 함(1_준비 뒤 다시)');

//  9_진단파일_검사.bat — 위에서 생긴 진짜 진단 기록 파일 + 일부러 넣은 «걸려야 하는» 가짜 파일
const r9a = run(P, 'node', batCmd('9_진단파일_검사.bat'));
ok(r9a.status === 0 && /\[통과\] diag-carinfo-/.test(r9a.out) && /모두 통과/.test(r9a.out), '9_진단파일_검사.bat — 프로그램이 만든 진단 기록 파일은 [통과]', r9a.out.trim().split('\n').slice(0, 3).join(' / '));
const reviews = fs.existsSync(path.join(P.test, 'diag')) ? fs.readdirSync(path.join(P.test, 'diag')).filter((f) => /\.검토용\.txt$/.test(f)) : [];
ok(reviews.length >= 2 && reviews.every((f) => /검토용/.test(fs.readFileSync(path.join(P.test, 'diag', f), 'utf8').slice(0, 40))), '9_진단파일_검사.bat — 통과한 파일마다 «검토용» 글 파일(사람 눈 확인용)을 만듦', reviews.join(', '));
fs.mkdirSync(path.join(P.test, 'diag'), { recursive: true });
fs.writeFileSync(path.join(P.test, 'diag', 'diag-entry-가짜검사용.json'), JSON.stringify({ site: 'entry', note: '담당 010-1234-5678 · JSESSIONID=ABCDEF0123456789 · KMHXX00XXXX123456' }));
const r9b = run(P, 'node', batCmd('9_진단파일_검사.bat'));
ok(r9b.status === 2 && /\[보내지 마세요\] diag-entry-가짜검사용\.json/.test(r9b.out) && !/010-1234-5678|ABCDEF0123456789|KMHXX00XXXX123456/.test(r9b.out),
  '9_진단파일_검사.bat — 개인정보·세션 값이 든 파일은 [보내지 마세요] · 값은 화면에 안 나옴', r9b.out.trim().split('\n').slice(0, 4).join(' / '));
ok(!r9b.touched.length && !r9a.touched.length, '9_진단파일_검사.bat 은 업무용 폴더를 열어 보지도 않음', r9b.touched.slice(0, 3).join(' | '));
fs.unlinkSync(path.join(P.test, 'diag', 'diag-entry-가짜검사용.json'));

//  8_전산진단_끄기.bat
const r8 = run(P, 'node', batCmd('8_전산진단_끄기.bat'));
let cfg8 = null; try { cfg8 = JSON.parse(fs.readFileSync(path.join(P.test, 'config.json'), 'utf8')); } catch {}
ok(r8.status === 0 && /껐어요/.test(r8.out) && cfg8 && cfg8.diagnose === false, '8_전산진단_끄기.bat — 시험판 설정만 끔', r8.out.trim());
ok(!r8.touched.length, '8_전산진단_끄기.bat 은 업무용 폴더를 열어 보지도 않음', r8.touched.slice(0, 3).join(' | '));
if (electron) {
  const app3 = runApp(P, {});
  ok(/diagButton=false/.test(line(app3.out, 'SMOKE-PROBE')), '8번으로 끈 뒤 프로그램에 진단 단추가 안 보임', line(app3.out, 'SMOKE-PROBE'));
}

//  업무용 폴더 — 모든 시험이 끝난 뒤에도 한 글자도 안 바뀜
const after = fingerprint(P.prod);
const diff = Object.keys({ ...before, ...after }).filter((k) => before[k] !== after[k]);
ok(!diff.length, '모든 시험 뒤 업무용 기록 폴더의 파일·폴더 ' + Object.keys(before).length + '개가 그대로(내용·크기·고친 시각 · 새 파일 없음)', diff.join(', '));
const madeHere = fs.readdirSync(P.appdata).sort();
console.log('# 가짜 APPDATA 안: ' + madeHere.join(', '));

//  ── PC 2: 업무용 프로그램을 쓴 적 없는 PC — 시험판이 업무용 폴더를 만들지 않아야 ──
const Q = fakePc('pc-without-production', false);
run(Q, 'node', batCmd('7_전산진단_켜기.bat'));
if (electron) runApp(Q, {});
run(Q, 'node', batCmd('9_진단파일_검사.bat'));
run(Q, 'node', batCmd('8_전산진단_끄기.bat'));
ok(!fs.existsSync(Q.prod) && fs.existsSync(Q.test), '업무용 폴더가 없는 PC — 시험판은 업무용 폴더(carcheck-dual)를 만들지 않고 시험판 폴더만 씀', fs.readdirSync(Q.appdata).join(', '));

//  ── 업무용 프로그램(시험판 표시 없음)에서는 진단 켜기가 안 됨 ──
const noMark = path.join(work, 'no-marker');
fs.cpSync(B, noMark, { recursive: true });
fs.unlinkSync(path.join(noMark, 'test-install.json'));
const R = fakePc('pc-production-copy', true);
const fr = fingerprint(R.prod);
const rn = run(R, 'node', batCmd('7_전산진단_켜기.bat'), { cwd: noMark, trace: false });
ok(rn.status === 1 && /시험판이 아니에요/.test(rn.out) && JSON.stringify(fingerprint(R.prod)) === JSON.stringify(fr), '시험판 표시가 없는 폴더(업무용)에서는 7번이 진단을 켜지 않고 업무용 설정도 안 바꿈', rn.out.trim().split('\n')[0]);

const bad2 = results.filter((r) => !r.ok);
console.log('\n# 결과: ' + (results.length - bad2.length) + ' / ' + results.length + ' 통과' + (HAS_STRACE ? ' (파일 열기 기록: strace 사용)' : ''));
process.exit(bad2.length ? 1 : 0);
