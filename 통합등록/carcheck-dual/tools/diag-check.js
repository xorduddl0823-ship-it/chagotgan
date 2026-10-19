/*  진단 기록 파일 따로 검사 (10차) — 보내기 «전»에 대표님 PC에서 한 번 더.
 *  기록 폴더의 diag\ 안 파일을 하나씩 열어, 고객정보·차대번호·인증정보·세션정보로 보이는 것이 있는지 «개수만» 센다(값은 화면에 안 냄).
 *  하나라도 걸리면 «보내지 마세요». 지우거나 고치지 않는다.
 *  실행: 9_진단파일_검사.bat  (또는 node tools/diag-check.js [파일...]) */
const fs = require('fs');
const path = require('path');
const { checkDiag } = require('../src/sites/diag-recorder');
const { scanText } = require('../src/core/privacy-scan');

//  인증·세션 정보로 보이는 이름(이름 자체가 기록에 있으면 값이 함께 있을 수 있어 표시)
const AUTH = [
  ['세션 쿠키 이름(JSESSIONID 등)', /\b(JSESSIONID|PHPSESSID|ASP\.NET_SessionId|connect\.sid|SESSION)\s*[=:]/gi],
  ['인증 머리글(Authorization·Bearer)', /\b(Authorization|Bearer\s+[A-Za-z0-9._\-]{10,})/g],
  ['쿠키 머리글(Set-Cookie·Cookie:)', /\b(Set-Cookie|Cookie)\s*:/g],
  ['문자 인증번호 모양(인증번호 6자리)', /인증\s*번호[^0-9]{0,10}\d{4,8}/g],
];

function checkFile(text) {
  const found = {};
  const add = (k, n) => { found[k] = (found[k] || 0) + n; };
  Object.entries(checkDiag(text)).forEach(([k, n]) => add(k, n));
  //  기존 개인정보 점검의 «값 무늬»만(휴대폰·사업자번호·차량번호·차대번호) — «칸 이름» 규칙은 진단 파일의 id·name(입력 칸 이름)을
  //  개인정보로 잘못 세므로 쓰지 않는다. 가린 «[가림]»은 무늬가 아니어서 세지 않음
  const s = scanText(text);
  Object.entries(s.counts || {}).forEach(([k, n]) => { if (/무늬/.test(k)) add('점검: ' + k, n); });
  AUTH.forEach(([k, re]) => { const m = String(text).match(re); if (m) add(k, m.length); });
  //  코드 원본이 들어 있으면 안 됨(10차 — 주소 글자만 남김)
  if (/"code"\s*:\s*"/.test(text)) add('사이트 코드 원본', 1);
  return found;
}

if (require.main === module) {
  const { dataDir } = require('./data-dir');
  let files = process.argv.slice(2);
  if (!files.length) {
    const dir = path.join(dataDir(), 'diag');
    files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^diag-.*\.json$/.test(f)).map((f) => path.join(dir, f)) : [];
    console.log('기록 폴더: ' + dir);
  }
  if (!files.length) { console.log('검사할 진단 기록 파일이 없어요.'); process.exit(0); }
  let bad = 0;
  for (const f of files) {
    const found = checkFile(fs.readFileSync(f, 'utf8'));
    const keys = Object.keys(found);
    if (keys.length) bad++;
    console.log((keys.length ? '[보내지 마세요] ' : '[통과] ') + path.basename(f) + (keys.length ? ' — ' + keys.map((k) => k + ' ' + found[k] + '건').join(' · ') : ''));
  }
  console.log(bad ? '\n걸린 파일은 보내지 말고, 이 화면을 사진으로 보내 주세요(값은 화면에 나오지 않아요).' : '\n모두 통과했어요. 파일을 보내도 돼요.');
  process.exitCode = bad ? 2 : 0;
}
module.exports = { checkFile };
