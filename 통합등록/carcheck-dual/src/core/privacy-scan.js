/**
 * 지난 기록·진단 파일 개인정보 점검 (읽기만 — 지우거나 고치지 않는다)
 * ------------------------------------------------------------------
 *  %APPDATA%\carcheck-dual\ 의 records.jsonl · photo-probe.json · accident-probe 결과 · carinfo-parts.json 등을 훑어
 *  «어떤 종류의 정보가 몇 개 있는지»만 센다. 값 자체는 결과에 넣지 않는다(화면·대화에 개인정보가 나오지 않게).
 *
 *  보호 대상으로 세는 것:
 *    이름·연락처 칸(…Name·…Hp·Phone·Tel·Addr·Email·Birth) · 휴대폰 번호 무늬 · 사업자번호 무늬 ·
 *    차량번호 무늬(12가3456) · 차대번호 무늬(17자리) · credentials 처럼 보이는 칸(pw·password·token·cookie)
 *
 *  백업(backupFiles): 원본은 그대로 두고 «backup-YYYYMMDD» 폴더에 복사만 한다. 지우기는 하지 않는다.
 *  나눔 원칙(상용화 고려): 업무 관리 칸. 전산 이름을 모른다.
 */
const fsDefault = require('fs');
const path = require('path');

const KEY_RULES = [
  ['이름 칸', /name$/i, ['carModel', 'carModel2']],
  ['연락처 칸', /(hp|phone|tel|mobile)$/i, []],
  ['주소·전자우편·생일 칸', /(addr|address|email|birth|jumin|rrn)$/i, []],
  ['비밀번호·쿠키처럼 보이는 칸', /^(pw|pwd|password|passwd|token|cookie|session)$/i, []],
  ['사진 파일 위치 칸', /^photo\d+$/, []],
  ['차량번호 칸', /^carNo$/, []],
  ['차대번호 칸', /^vin$/i, []],
];
const VALUE_RULES = [
  ['휴대폰 번호 무늬', /01[016789][-\s]?\d{3,4}[-\s]?\d{4}/g],
  ['사업자번호 무늬', /\b\d{3}-\d{2}-\d{5}\b/g],
  ['차량번호 무늬', /\d{2,3}\s?[가-힣]\s?\d{4}/g],
  ['차대번호 무늬', /\b[A-HJ-NPR-Z0-9]{17}\b/g],
];

/** 값에서 «가린 것»(* 로 덮인 것)은 세지 않는다 */
function unmasked(v) {
  return !/^\*+.{0,4}$/.test(String(v));
}

function walk(o, keyHit, valHit) {
  if (o == null) return;
  if (Array.isArray(o)) { o.forEach((x) => walk(x, keyHit, valHit)); return; }
  if (typeof o === 'object') {
    Object.keys(o).forEach((k) => {
      const v = o[k];
      const filled = v != null && String(v).trim() !== '' && typeof v !== 'object' && unmasked(v);
      KEY_RULES.forEach(([label, re, keep]) => { if (filled && !keep.includes(k) && re.test(k)) keyHit(label); });
      walk(v, keyHit, valHit);
    });
    return;
  }
  const s = String(o);
  VALUE_RULES.forEach(([label, re]) => {
    const m = s.match(re);
    if (m) m.forEach(() => valHit(label));
  });
}

/** 한 파일을 센다. JSON / JSON 줄 모음(jsonl) 모두 받는다. 값은 돌려주지 않는다. */
function scanText(text) {
  const counts = {};
  const add = (label) => { counts[label] = (counts[label] || 0) + 1; };
  let parsed = 0, broken = 0;
  const tryOne = (t) => { try { walk(JSON.parse(t), add, add); parsed++; } catch { broken++; walk(t, add, add); } };
  const trimmed = String(text || '').trim();
  if (!trimmed) return { counts, parsed, broken };
  try { walk(JSON.parse(trimmed), add, add); parsed = 1; } catch {
    trimmed.split('\n').forEach((line) => { if (line.trim()) tryOne(line); });
  }
  return { counts, parsed, broken };
}

/** 폴더 안 .json·.jsonl 파일을 훑는다 (credentials.json 은 내용을 열지 않고 «있음»만 알림) */
function scanDir(dir, opts = {}) {
  const fs = opts.fs || fsDefault;
  let names = [];
  try { names = fs.readdirSync(dir); } catch { return { dir, files: [], missing: true }; }
  const files = [];
  names.filter((n) => /\.(json|jsonl)$/i.test(n)).sort().forEach((n) => {
    const p = path.join(dir, n);
    let size = 0;
    try { size = fs.statSync(p).size; } catch {}
    if (/^credentials\.json$/i.test(n)) {
      files.push({ name: n, size, skipped: '로그인 정보 파일 — 열지 않음(암호화 저장)' });
      return;
    }
    let text = '';
    try { text = fs.readFileSync(p, 'utf8'); } catch (e) { files.push({ name: n, size, error: e.message }); return; }
    const r = scanText(text);
    const total = Object.values(r.counts).reduce((a, b) => a + b, 0);
    files.push({ name: n, size, total, counts: r.counts });
  });
  return { dir, files };
}

/** 백업 — 원본을 지우지 않고 backup-YYYYMMDD 폴더에 복사만. 이미 같은 이름이 있으면 덮어쓰지 않음 */
function backupFiles(dir, names, opts = {}) {
  const fs = opts.fs || fsDefault;
  const d = (opts.now || (() => new Date()))();
  const tag = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  const to = path.join(dir, 'backup-' + tag);
  fs.mkdirSync(to, { recursive: true });
  const done = [];
  (names || []).forEach((n) => {
    if (/^credentials\.json$/i.test(n)) return;          // 로그인 정보는 복사하지 않음
    const src = path.join(dir, n);
    const dst = path.join(to, n);
    if (fs.existsSync(dst)) { done.push({ name: n, skipped: '이미 있음' }); return; }
    fs.copyFileSync(src, dst, fs.constants.COPYFILE_EXCL);
    done.push({ name: n, to: dst });
  });
  return { to, done };
}

module.exports = { scanText, scanDir, backupFiles };
