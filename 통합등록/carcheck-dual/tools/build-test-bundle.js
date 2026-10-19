/*  대표님용 시험판 묶음 만들기 (10차 검수 보완) — 손으로 모으지 않고 매번 똑같이.
 *  실행: node tools/build-test-bundle.js [내보낼 폴더]   (기본: dist/)
 *  만드는 것: 차곳간_시험판_<날짜>.zip
 *    0_먼저읽기_화면확인_안내서.txt          ← 맨 위(풀자마자 보임)
 *    carcheck-dual-시험판/                    ← 프로그램(업무용 폴더와 이름부터 다름)
 *      test-install.json                     ← 시험판 표시: 기록 폴더를 %APPDATA%\carcheck-dual-시험판 으로 따로
 *      0_먼저읽기_화면확인_안내서.txt · 시험판_파일목록.txt · 0~9 bat · main.js …
 *  넣지 않는 것: node_modules(1_준비.bat 이 받음) · test(개발 시험) · 검수 요약 · 기록·설정·로그인 정보 파일
 *  다 만든 뒤에는 node tools/verify-test-bundle.js <zip> 로 풀어서 검사한다. */
const fs = require('fs');
const path = require('path');
const { makeZip } = require('./zip-lite');

const ROOT = path.join(__dirname, '..');
const FOLDER = 'carcheck-dual-시험판';
const GUIDE_SRC = path.join(ROOT, '..', '기획', '대표님_화면확인_안내서.md');
const GUIDE = '0_먼저읽기_화면확인_안내서.txt';
const LIST = '시험판_파일목록.txt';
//  넣는 것(이것만) — 새 파일이 생겨도 저절로 묶음에 들어가지 않게 «넣을 목록» 방식
const INCLUDE_FILES = ['main.js', 'preload.js', 'package.json', 'package-lock.json', 'README.md'];
const INCLUDE_DIRS = ['build', 'renderer', 'src', 'tools'];
const BATS = /^[0-9]_.*\.bat$/;
//  어떤 폴더 안에서도 넣지 않는 것(기록·설정·로그인 정보·임시)
const NEVER = /(^|\/)(node_modules|\.git|dist)(\/|$)|(^|\/)(config|credentials|admin)\.json$|\.jsonl$|(^|\/)diag-[^/]*\.json$|(^|\/)test-install\.json$/i;

function walk(dir, rel, out) {
  for (const n of fs.readdirSync(dir).sort()) {
    const f = path.join(dir, n), r = rel ? rel + '/' + n : n;
    if (NEVER.test(r)) continue;
    if (fs.statSync(f).isDirectory()) walk(f, r, out); else out.push(r);
  }
  return out;
}
const crlfBom = (t) => Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(String(t).replace(/\r?\n/g, '\r\n'), 'utf8')]);

function build(outDir, when = new Date()) {
  const files = [];
  INCLUDE_FILES.forEach((f) => { if (fs.existsSync(path.join(ROOT, f))) files.push(f); });
  fs.readdirSync(ROOT).filter((f) => BATS.test(f)).sort().forEach((f) => files.push(f));
  INCLUDE_DIRS.forEach((d) => { if (fs.existsSync(path.join(ROOT, d))) walk(path.join(ROOT, d), d, files); });

  const marker = Buffer.from(JSON.stringify({ dataFolder: FOLDER, note: '시험판 표시 — 이 파일이 있으면 기록 폴더를 업무용(carcheck-dual)과 따로 씁니다. 지우지 마세요.' }, null, 2) + '\n', 'utf8');
  const guide = crlfBom(fs.readFileSync(GUIDE_SRC, 'utf8'));
  const entries = [{ name: GUIDE, data: guide }];
  files.forEach((f) => entries.push({ name: FOLDER + '/' + f, data: fs.readFileSync(path.join(ROOT, f)) }));
  entries.push({ name: FOLDER + '/test-install.json', data: marker });
  entries.push({ name: FOLDER + '/' + GUIDE, data: guide });

  //  파일 목록(대표님용) — 중요한 것 설명 + 전체 목록
  const NOTE = {
    'test-install.json': '시험판 표시(지우지 마세요) — 기록 폴더를 %APPDATA%\\' + FOLDER + ' 으로 따로',
    '0_업무용기록_백업.bat': '업무용 기록을 문서\\차곳간_백업 으로 복사만(로그인 정보 제외)', '1_준비.bat': '처음 한 번(인터넷 필요)',
    '2_실행.bat': '시험판 켜기(창 제목 끝에 «시험판»)', '7_전산진단_켜기.bat': '진단 단추 켜기(시험판에서만)', '8_전산진단_끄기.bat': '진단 단추 끄기',
    '9_진단파일_검사.bat': '보내기 전 진단 기록 파일 검사([통과]/[보내지 마세요])', [GUIDE]: '화면 확인 순서(먼저 읽기)',
  };
  const listed = entries.map((e) => e.name).concat(FOLDER + '/' + LIST).sort();
  const lines = ['차곳간 시험판 묶음 — 파일 목록 (' + when.toISOString().slice(0, 10) + ')', '',
    '■ 이 묶음은 업무용 프로그램과 따로 쓰는 «시험판»이에요. 업무용 프로그램 폴더에 덮어쓰지 마세요.',
    '■ 기록 폴더: %APPDATA%\\' + FOLDER + '  (업무용 %APPDATA%\\carcheck-dual 은 읽지도 고치지도 않아요)', '',
    '[먼저 볼 것]'];
  Object.entries(NOTE).forEach(([k, v]) => lines.push('  ' + k + ' — ' + v));
  lines.push('', '[전체 ' + listed.length + '개]');
  listed.forEach((n) => lines.push('  ' + n));
  entries.push({ name: FOLDER + '/' + LIST, data: crlfBom(lines.join('\n') + '\n') });
  entries.sort((a, b) => (a.name < b.name ? -1 : 1));

  fs.mkdirSync(outDir, { recursive: true });
  const stamp = when.getFullYear() + String(when.getMonth() + 1).padStart(2, '0') + String(when.getDate()).padStart(2, '0');
  const zip = path.join(outDir, '차곳간_시험판_' + stamp + '.zip');
  fs.writeFileSync(zip, makeZip(entries, when));
  return { zip, count: entries.length, names: entries.map((e) => e.name) };
}

if (require.main === module) {
  const r = build(path.resolve(process.argv[2] || path.join(ROOT, 'dist')));
  console.log('시험판 묶음을 만들었어요: ' + r.zip + ' (파일 ' + r.count + '개)');
  console.log('다음: node tools/verify-test-bundle.js "' + r.zip + '"');
}
module.exports = { build, FOLDER, GUIDE, LIST };
