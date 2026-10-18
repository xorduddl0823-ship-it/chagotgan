/**
 * 안전 규칙 모음 (전산과 상관없는 판단만 둔다 — Electron 없이 시험할 수 있게)
 * ------------------------------------------------------------------
 *  · 비밀번호를 넣어도 되는 화면인가 (진짜 그 사이트 주소인가)
 *  · 사이트 창에서 열어도 되는 주소인가 (javascript:·file: 등 막기)
 *  · 기록 파일에 남겨도 되는 칸만 남기기 + 오래된 기록 지우기
 *
 *  나눔 원칙(고치기 쉽게): 이 파일은 «업무 관리» 칸에 속한다. 특정 전산 이름을 모른다.
 */

/** 주소에서 host 를 꺼낸다. 못 꺼내면 '' */
function hostOf(url) {
  try { return new URL(String(url || '')).host.toLowerCase(); } catch { return ''; }
}

/**
 * 비밀번호를 넣어도 되는 주소인가.
 *  https 이고, host 가 그 사이트 홈 주소의 host 와 정확히 같을 때만.
 *  (비슷한 이름의 다른 주소 — 예: ai.carinfo.co.kr.evil.com — 는 안 됨)
 */
function isSiteUrl(url, home) {
  let u, h;
  try { u = new URL(String(url || '')); h = new URL(String(home || '')); } catch { return false; }
  if (u.protocol !== 'https:') return false;
  return u.host.toLowerCase() === h.host.toLowerCase();
}

/**
 * 사이트 창이 새 창(팝업)으로 열어도 되는 주소인가.
 *  빈 창(about:blank)은 허용 — 카인포 사진등록처럼 빈 창을 먼저 띄우고 form 을 보내는 화면이 있다.
 *  http·https 는 허용 (사이트가 쓰는 우편번호 찾기 같은 바깥 화면이 있을 수 있어 막지 않는다).
 *  그 밖의 모양(javascript:·file:·data: 등)은 막는다.
 */
function popupAllowed(url) {
  const s = String(url || '').trim();
  if (s === '' || /^about:blank$/i.test(s)) return true;
  return /^https?:\/\//i.test(s);
}

/** 기록 파일에 남기지 않는 칸 — 개인정보와 PC 안 파일 위치 */
const DROP_KEYS = ['clientName', 'dealerHp'];
const DROP_PATTERNS = [/^photo\d+$/];

/** 기록에 남길 입력값만 고른다 (원래 값은 건드리지 않는다) */
function sanitizeRecordData(data) {
  const out = {};
  Object.keys(data || {}).forEach((k) => {
    if (DROP_KEYS.includes(k)) return;
    if (DROP_PATTERNS.some((re) => re.test(k))) return;
    out[k] = data[k];
  });
  return out;
}

/**
 * 기록 줄 가운데 보관 기간(일)이 지난 것을 뺀다.
 *  날짜를 못 읽는 줄은 남긴다(함부로 지우지 않음).
 */
function pruneRecordLines(lines, days, now = Date.now()) {
  const limit = now - Math.max(1, Number(days) || 90) * 86400000;
  return (lines || []).filter((line) => {
    if (!String(line).trim()) return false;
    try {
      const t = Date.parse(JSON.parse(line).at);
      return !(t < limit);
    } catch {
      return true;
    }
  });
}

module.exports = { hostOf, isSiteUrl, popupAllowed, sanitizeRecordData, pruneRecordLines, DROP_KEYS };
