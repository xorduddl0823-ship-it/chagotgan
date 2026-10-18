/**
 * 로그인 정보 보관
 * ------------------------------------------------------------------
 * 설계 문서 D4 는 원래 "비밀번호를 프로그램이 저장하지 않는다" 였다.
 * 자동 로그인을 넣기로 하면서 그 결정을 바꾸되, 평문으로는 두지 않는다.
 *
 *   · Electron 의 safeStorage 로 암호화해서 저장한다.
 *     윈도우에서는 DPAPI 를 쓰므로 이 PC의 이 윈도우 계정에서만 풀린다.
 *     파일을 다른 PC 나 다른 계정으로 옮기면 읽히지 않는다.
 *   · 암호화를 쓸 수 없는 환경이면 저장을 거부한다. 평문으로 떨어뜨리지 않는다.
 *   · 화면으로 비밀번호를 되돌려 주지 않는다. "저장됨" 여부만 알려준다.
 *   · 기록(로그)이나 결과창에 비밀번호를 남기지 않는다.
 *
 * 파일:  %APPDATA%\carcheck-dual\credentials.json
 *        { "carmodoo": { "id": "...", "pw": "<암호문 base64>" }, "carinfo": { … } }
 */
const fs = require('fs');

const SITES = ['carmodoo', 'carinfo'];

function readRaw(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

/** 저장된 것이 있는지만 알려준다 (비밀번호 자체는 절대 내보내지 않는다) */
function summary(file) {
  const raw = readRaw(file);
  const out = {};
  SITES.forEach((s) => {
    const e = raw[s] || {};
    out[s] = { id: String(e.id || ''), hasPw: !!e.pw };
  });
  return out;
}

/**
 * 저장한다.
 * @param patch { carmodoo?: {id, pw}, carinfo?: {id, pw} }
 *        pw 가 undefined 면 기존 비밀번호를 그대로 둔다 (빈 문자열이면 지운다).
 */
function save(file, patch, safeStorage) {
  if (!safeStorage || !safeStorage.isEncryptionAvailable()) {
    return { ok: false, error: '이 PC에서는 비밀번호를 안전하게 암호화할 수 없어 저장하지 않았습니다.' };
  }
  const raw = readRaw(file);

  SITES.forEach((s) => {
    const p = patch && patch[s];
    if (!p) return;
    const cur = raw[s] || {};
    const next = { id: String(p.id || '').trim() };

    if (p.pw === undefined || p.pw === null) {
      if (cur.pw) next.pw = cur.pw;                 // 손대지 않음
    } else if (String(p.pw) === '') {
      // 비우면 지운다
    } else {
      next.pw = safeStorage.encryptString(String(p.pw)).toString('base64');
    }
    raw[s] = next;
  });

  fs.writeFileSync(file, JSON.stringify(raw, null, 2), 'utf8');
  return { ok: true, creds: summary(file) };
}

/** 로그인에 쓸 실제 값. 이 함수의 결과는 화면으로 보내지 않는다. */
function load(file, site, safeStorage) {
  const e = readRaw(file)[site];
  if (!e || !e.id || !e.pw) return null;
  if (!safeStorage || !safeStorage.isEncryptionAvailable()) return null;
  try {
    return { id: e.id, pw: safeStorage.decryptString(Buffer.from(e.pw, 'base64')) };
  } catch {
    return null;   // 다른 PC/계정으로 옮겨온 파일 등
  }
}

module.exports = { summary, save, load, SITES };
