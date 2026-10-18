/*  지난 기록·진단 파일 개인정보 점검 (읽기만)
 *  사용: node tools/privacy-scan.js            → %APPDATA%\carcheck-dual 를 훑어 종류별 개수만 보여 줌
 *        node tools/privacy-scan.js --backup   → 위 + backup-YYYYMMDD 폴더에 복사(원본 그대로, 로그인 정보 제외)
 *        node tools/privacy-scan.js <폴더>      → 다른 폴더를 훑음
 *  값(이름·번호)은 화면에 찍지 않는다. 지우기는 하지 않는다. */
const path = require('path');
const { scanDir, backupFiles } = require('../src/core/privacy-scan');

const args = process.argv.slice(2);
const doBackup = args.includes('--backup');
const dirArg = args.find((a) => !a.startsWith('--'));
const dir = dirArg || path.join(process.env.APPDATA || '', 'carcheck-dual');

const r = scanDir(dir);
if (r.missing) {
  console.log('폴더가 없습니다: ' + dir);
  process.exit(0);
}
console.log('점검한 폴더: ' + dir);
r.files.forEach((f) => {
  if (f.skipped) { console.log('- ' + f.name + ' : ' + f.skipped); return; }
  if (f.error) { console.log('- ' + f.name + ' : 읽지 못함(' + f.error + ')'); return; }
  const parts = Object.entries(f.counts).map(([k, v]) => k + ' ' + v + '개');
  console.log('- ' + f.name + ' (' + f.size + '바이트) : ' + (parts.length ? parts.join(', ') : '보호 대상 없음'));
});
if (doBackup) {
  const b = backupFiles(dir, r.files.filter((f) => !f.skipped && !f.error).map((f) => f.name));
  console.log('백업 폴더: ' + b.to + ' (' + b.done.length + '개 — 원본은 그대로)');
}
