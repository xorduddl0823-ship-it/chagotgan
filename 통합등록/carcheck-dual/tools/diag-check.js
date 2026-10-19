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

/**
 * (12차 검수) 사람 눈 검토용 글 — 자동 검사를 통과한 파일에 «들어 있는 모든 글자»를 한 줄씩 모은다.
 *  요청 주소·물음표 뒤 이름·보낸 칸 이름·응답 번호·누른 단추 글자와 이름·화면의 단추 글자·칸 이름표·표 머리글.
 *  무늬로 못 찾는 사람 이름·주소 같은 것이 섞였는지 대표님이 보내기 전에 눈으로 확인한다.
 */
function reviewText(text) {
  let d = {};
  try { d = JSON.parse(text); } catch { return '(읽을 수 없는 파일)'; }
  const lines = new Set();
  const add = (k, v) => { const s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); if (s) lines.add(k + ' | ' + s.slice(0, 120)); };
  for (const e of ((d.requests || {}).entries || [])) {
    if (e.kind === 'click') { add('누른 단추', [e.text, e.id].filter(Boolean).join(' · ')); continue; }
    add('요청', [e.method, e.host, e.path, e.status != null ? '응답 ' + e.status : ''].filter(Boolean).join(' '));
    (e.queryKeys || []).forEach((k) => add('주소 물음표 뒤 이름', k));
    (e.bodyKeys || []).forEach((k) => add('보낸 칸 이름', k));
  }
  for (const s of (d.snaps || [])) {
    for (const f of (s.frames || [])) {
      add('화면', [f.path, f.title].filter(Boolean).join(' · '));
      (f.buttons || []).forEach((b) => add('화면 단추', [b.text, b.id].filter(Boolean).join(' · ')));
      (f.fields || []).forEach((x) => add('입력 칸', [x.label, x.placeholder, x.id, x.name].filter(Boolean).join(' · ')));
      (f.tables || []).forEach((t) => add('표 머리글', (t.headers || []).join(' · ')));
    }
  }
  const out = [...lines].sort().slice(0, 3000);
  return ['[검토용] ' + (d.site || '') + ' 기록 파일에 들어 있는 글자 전부(값은 이미 가림)',
    '아래에 사람 이름 · 전화번호 · 차량번호 · 차대번호 · 주소 · 아이디처럼 보이는 것이 있으면 이 기록 파일을 보내지 마세요.',
    '단추 이름 · 칸 이름 · 주소 경로(/ct/... 같은 것)만 보이면 괜찮아요.', ''].concat(out).join('\n') + '\n';
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
    const text = fs.readFileSync(f, 'utf8');
    const found = checkFile(text);
    const keys = Object.keys(found);
    if (keys.length) bad++;
    console.log((keys.length ? '[보내지 마세요] ' : '[통과] ') + path.basename(f) + (keys.length ? ' — ' + keys.map((k) => k + ' ' + found[k] + '건').join(' · ') : ''));
    if (!keys.length) {
      //  통과한 파일만 검토용 글을 만든다(걸린 파일은 글자를 다시 꺼내지 않음)
      const rv = f.replace(/\.json$/, '.검토용.txt');
      fs.writeFileSync(rv, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(reviewText(text).replace(/\n/g, '\r\n'), 'utf8')]));
      console.log('        눈으로 확인: ' + path.basename(rv));
    }
  }
  console.log(bad ? '\n걸린 파일은 보내지 말고, 이 화면을 사진으로 보내 주세요(값은 화면에 나오지 않아요).'
    : '\n자동 검사는 모두 통과했어요. 보내기 전에 «검토용» 글 파일을 열어 사람 이름·전화번호·차량번호처럼 보이는 것이 없는지 한 번 봐 주세요.');
  process.exitCode = bad ? 2 : 0;
}
module.exports = { checkFile, reviewText };
