/**
 * 안전 규칙 모음 (전산과 상관없는 판단만 둔다 — Electron 없이 시험할 수 있게)
 * ------------------------------------------------------------------
 *  · 비밀번호를 넣어도 되는 화면인가 (진짜 그 사이트 주소인가)
 *  · 사이트 창에서 열어도 되는 주소인가 (javascript:·file: 등 막기)
 *  · 기록 파일에 남겨도 되는 칸만 남기기 + 오래된 기록 지우기
 *
 *  나눔 원칙(상용화 대비): 이 파일은 «업무 관리» 칸에 속한다. 특정 전산 이름을 모른다.
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
 * 사이트 창이 새 창(팝업)으로 열어도 되는 주소인가. (2026-10-18 검수 반영 — 좁힘)
 *  · 빈 창(about:blank) — 카인포 사진등록처럼 빈 창을 먼저 띄우고 form 을 보내는 화면이 있다
 *  · 그 사이트와 같은 주소(https · 같은 host) — 사원선택·사진등록 등
 *  · 따로 허락한 주소(config.json 의 popupHosts, 예: 우편번호 찾기) — https 만
 *  그 밖(다른 사이트·http·javascript:·file:·data: 등)은 막는다. 막은 주소는 앱이 알려 준다.
 */
function popupAllowed(url, home, allowHosts) {
  const s = String(url || '').trim();
  if (s === '' || /^about:blank$/i.test(s)) return true;
  if (home && isSiteUrl(s, home)) return true;
  let u;
  try { u = new URL(s); } catch { return false; }
  if (u.protocol !== 'https:') return false;
  const host = u.host.toLowerCase();
  return (Array.isArray(allowHosts) ? allowHosts : [])
    .some((h) => String(h || '').trim().toLowerCase() === host);
}

/** 기록 파일에 남기지 않는 칸 — 사람 이름·연락처·주소와 PC 안 파일 위치 (2026-10-18 검수 반영 — 넓힘)
 *  dealerName(딜러 이름)·sangsaName(상사 이름)도 뺀다. 차량번호·차대번호·점검 값은 남긴다. */
const DROP_KEYS = ['clientName', 'dealerName', 'dealerHp', 'sangsaName'];
const DROP_PATTERNS = [/^photo\d+$/, /name$/i, /(hp|phone|tel|mobile|addr|address|email|birth|jumin|rrn)$/i];
/** 이름처럼 보여도 차 정보라 남기는 칸 */
const KEEP_KEYS = ['carModel', 'carModel2'];

/** 기록에 남길 입력값만 고른다 (원래 값은 건드리지 않는다) */
function sanitizeRecordData(data) {
  const out = {};
  Object.keys(data || {}).forEach((k) => {
    if (DROP_KEYS.includes(k)) return;
    if (!KEEP_KEYS.includes(k) && DROP_PATTERNS.some((re) => re.test(k))) return;
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
