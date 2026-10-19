// 보안 방 · 2026-10-19 (2차) · 시험 업체 A/B 격리 자동 시험 — 판정 엄격판
// ─────────────────────────────────────────────────────────────
// 1차 검수(챗지피티 B01 · B02 · B07)에서 고친 것
//   - API 마다 «확정 응답 모양»을 정하고, 모르는 모양 · 빠진 칸 · HTTP 5xx · 해석 실패는 모두 «실패».
//   - 거절 시험은 서버 코드에 있는 «정해진 거절 글» 하나와 똑같을 때만 통과(글이 바뀌면 실패 → 사람이 다시 봄).
//   - 빈 목록은 «그 칸이 실제로 있는 배열/객체이고 비어 있을 때»만. 지운 수는 «칸이 있고 숫자 0»일 때만.
//   - 대조군은 «미리 만든 그 시험 자료»가 실제로 보이는지 확인하고, 지우기 · 고치기 시도 전후로 A 자료를 비교.
//   - 필수 값이 하나라도 없거나 시험 하나라도 실행되지 않으면 «미검증» 끝 코드 2 (성공 아님).
//   - 시험 환경 확인: AB_OK 글자만이 아니라, 서버가 돌려준 업체/검사소가 넣어 준 시험 코드와 같고 이름에 «시험/테스트»가 있어야 시작.
//   - 기록에는 응답 본문 · 열쇠 · 서명 주소 · 개인정보를 쓰지 않음. «HTTP 상태 · 어떤 칸이 없었는지 · 글 길이» 같은 가린 정보만.
//   - 시험기 자체 시험: `node AB_시험_업체격리.js --self-test` → 잘못된 응답 묶음이 모두 «실패»로 나와야 끝 코드 0.
// 쓰는 법 (Node 18 이상 · 꾸러미 없음 · 시험 업체에만):
//   AB_OK=시험업체만 API=https://<프로젝트>.supabase.co/functions/v1 \
//   WA_SHOP= WA_TOKEN= WA_REC=<A 차 기록 id> WA_PHOTO=<A 사진 id sb/…> WA_BIZ=<A 사업자번호> \
//   WB_SHOP= WB_TOKEN=   (B 는 사업자번호가 비어 있는 시험 업체여야 W6 이 뜻이 있음) \
//   CA_OFFICE= CA_TOKEN= CA_INVOICE=<A 청구서 id> CA_YM=<그 달 2026-10> CA_DELIV_PHOTO=<A 배달 사진 id> CA_CAR=<A 검사 기록(차) id> \
//   CB_OFFICE= CB_TOKEN= \
//   DA_TOKEN=<딜러 A 열쇠> DB_TOKEN=<딜러 B 열쇠>   (딜러 A 의 차는 WA_SHOP 의 WA_REC — 딜러 B 번호로는 안 들어온 차) \
//   node 보안/검사기록/중복사업자번호_10-19/AB_시험_업체격리.js
// 열쇠 값은 어디에도 적지 말고 그때그때 넣어요.
"use strict";
const crypto = require("crypto");

/* ── 서버 코드에 있는 거절 글 (2026-10-19 main · 바뀌면 여기도 고침) ── */
const MSG = {
  wOther: "다른 업체의 자료는 볼 수 없습니다",                         // wash 6849
  wNoCar: "그 차를 찾지 못했습니다",                                   // wash 2859
  wNoFile: "다른 업체의 파일은 볼 수 없습니다",                        // wash 656
  wBizTaken: "이 사업자번호는 다른 곳에서 쓰고 있어 쓸 수 없습니다. 우리 사업자번호가 맞다면 차곳간(010-9559-3663)으로 알려 주세요.", // wash 2541
  wHq: "차곳간 본사 계정으로 들어와야 합니다",                          // wash 4366
  cNoOffice: "이 검사소에 들어갈 권한이 없습니다.",                    // check whoIs (뒤에 괄호 번호가 붙음 → 앞부분만 비교)
  cNotMine: "이 검사소 청구서가 아닙니다.",                            // check 934
  cNoPhoto: "사진을 찾지 못했습니다.",                                  // check 3659
  dNoCar: "이 차를 찾지 못했습니다 (내 번호로 들어온 차만 볼 수 있어요)", // dealer 577
  dNoCar2: "이 차를 찾지 못했습니다",                                   // dealer 603
  cNotMyCar: "이 검사소 차가 아닙니다.",                               // check 998 (기록 고치기)
};

/* ── 응답 읽기: {status, ok:해석됨, j} → 판정 함수가 씀 ── */
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
function shape(r) {                       // 공통: 5xx · 해석 실패 · 모양 다름은 여기서 «실패 까닭»
  if (!r || typeof r.status !== "number") return "응답 없음";
  if (r.status >= 500) return "HTTP " + r.status;
  if (!r.parsed) return "응답 해석 실패";
  if (!isObj(r.j)) return "응답이 객체가 아님";
  const k = Object.keys(r.j).filter((x) => x !== "__raw");
  if (k.length !== 1 || (k[0] !== "result" && k[0] !== "__err")) return "모르는 응답 모양(칸 " + k.length + "개)";
  return "";
}
const J = {
  /* 거절: __err 가 정해진 글과 같을 때만 */
  reject: (want, prefix) => (r) => {
    const s = shape(r); if (s) return s;
    if (!("__err" in r.j)) return "성공해 버림(거절이어야 함)";
    const e = String(r.j.__err);
    return (prefix ? e.startsWith(want) : e === want) ? "" : "거절 글이 기대와 다름(글 길이 " + e.length + ")";
  },
  /* 성공 + 결과 확인 */
  result: (check) => (r) => {
    const s = shape(r); if (s) return s;
    if (!("result" in r.j)) return "오류가 남(성공이어야 함)";
    return check(r.j.result) || "";
  },
};
const W_ME = (shop) => J.result((x) => !isObj(x) ? "모양 다름" : x.shop !== shop ? "다른 업체가 돌아옴" : !/시험|테스트|TEST/i.test(String(x.name || "")) ? "시험 업체 이름이 아님" : "");
const C_ME = (code) => J.result((x) => !isObj(x) || !isObj(x.office) ? "모양 다름" : x.office.code !== code ? "다른 검사소가 돌아옴" : !/시험|테스트|TEST/i.test(String(x.office.name || "") + String(x.office.code || "")) ? "시험 검사소가 아님" : "");
const W_LINK_OK = J.result((x) => !isObj(x) ? "모양 다름" : !/^[A-F0-9]{24}$/.test(String(x.code || "")) ? "보기 코드 모양 다름" : "");
const W_SHOT_HAS = (id) => J.result((x) => !isObj(x) || !isObj(x.links) ? "links 칸 없음" : typeof x.links[id] !== "string" || !/^https:\/\//.test(x.links[id]) ? "A 사진 주소가 안 나옴" : "");
const W_SHOT_NONE = J.result((x) => !isObj(x) || !isObj(x.links) ? "links 칸 없음" : Object.keys(x.links).length !== 0 ? "다른 업체 사진 주소가 나옴(" + Object.keys(x.links).length + "개)" : "");
const C_ROWS = J.result((x) => Array.isArray(x) ? "" : "줄 목록(배열)이 아님");
const C_DEL0 = J.result((x) => !isObj(x) ? "모양 다름" : typeof x.n !== "number" || typeof x.missing !== "number" ? "n · missing 칸 없음" : x.n !== 0 ? "지운 수 " + x.n : x.missing !== 1 ? "missing " + x.missing + "(1 이어야 함)" : "");
const W_DEL_ANY = (r) => { const s = shape(r); if (s) return s; if ("__err" in r.j) return ""; return isObj(r.j.result) && r.j.result.ok === true ? "" : "모양 다름"; };   // B 자기 칸 지우기 — 결과보다 «A 기록이 그대로인지»(W9b)가 판정
const D_CAR_OK = J.result((x) => !isObj(x) || !isObj(x.car) || typeof x.car.plate !== "string" || !x.car.plate ? "차 정보 없음" : "");

/* ── 시험 목록 (모두 필수) ── */
function plan(E) {
  const w = (shop, token, fn, args) => ({ api: "wash-api", body: { shop, token, fn, args } });
  const wOpen = (fn, args) => ({ api: "wash-api", body: { shop: "", token: "", fn, args } });
  const c = (shop, token, fn, args) => ({ api: "check-api", body: { shop, token, fn, args } });
  const d = (token, fn, args) => ({ api: "dealer-api", body: { token, fn, args } });
  return [
    /* 시험 환경 확인 — 하나라도 실패면 나머지를 하지 않고 «미검증» */
    { id: "E1", gate: 1, what: "A 워시 열쇠의 업체 = WA_SHOP · 이름에 시험", req: wOpen("me", [E.WA_TOKEN]), judge: W_ME(E.WA_SHOP) },
    { id: "E2", gate: 1, what: "B 워시 열쇠의 업체 = WB_SHOP · 이름에 시험", req: wOpen("me", [E.WB_TOKEN]), judge: W_ME(E.WB_SHOP) },
    { id: "E3", gate: 1, what: "A 체크 열쇠의 검사소 = CA_OFFICE · 시험", req: c(E.CA_OFFICE, E.CA_TOKEN, "me", []), judge: C_ME(E.CA_OFFICE) },
    { id: "E4", gate: 1, what: "B 체크 열쇠의 검사소 = CB_OFFICE · 시험", req: c(E.CB_OFFICE, E.CB_TOKEN, "me", []), judge: C_ME(E.CB_OFFICE) },
    /* 워시 */
    { id: "W0", what: "대조: A 가 A 차 기록으로 보기 코드 받음", req: w(E.WA_SHOP, E.WA_TOKEN, "viewLink", [E.WA_REC]), judge: W_LINK_OK },
    { id: "W0b", what: "대조: A 가 A 사진 서명 주소 받음", req: w(E.WA_SHOP, E.WA_TOKEN, "shotLinks", [[E.WA_PHOTO]]), judge: W_SHOT_HAS(E.WA_PHOTO) },
    { id: "W1", what: "B 열쇠 + A 업체 코드로 읽기 → 거절", req: w(E.WA_SHOP, E.WB_TOKEN, "apiLoad", []), judge: J.reject(MSG.wOther) },
    { id: "W2", what: "B 열쇠 + A 업체 코드로 쓰기 → 거절", req: w(E.WA_SHOP, E.WB_TOKEN, "apiSet", ["intakes", "ab_probe", JSON.stringify({ probe: 1 })]), judge: J.reject(MSG.wOther) },
    { id: "W3", what: "B 가 A 차 기록 id 로 보기 코드 → 못 찾음", req: w(E.WB_SHOP, E.WB_TOKEN, "viewLink", [E.WA_REC]), judge: J.reject(MSG.wNoCar) },
    { id: "W4", what: "B 가 A 사진 id 로 서명 주소 → links 가 빈 객체", req: w(E.WB_SHOP, E.WB_TOKEN, "shotLinks", [[E.WA_PHOTO]]), judge: W_SHOT_NONE },
    { id: "W5", what: "B 가 A 사진 파일 내려받기 → 거절", req: w(E.WB_SHOP, E.WB_TOKEN, "driveB64", [E.WA_PHOTO]), judge: J.reject(MSG.wNoFile) },
    { id: "W6", what: "B 가 A 사업자번호를 자기 업체에 넣기 → 겹침 거절", req: w(E.WB_SHOP, E.WB_TOKEN, "shopBiz", [{ bizNo: E.WA_BIZ }]), judge: J.reject(MSG.wBizTaken) },
    { id: "W7", what: "B 열쇠로 본사 기능 → 거절", req: w(E.WB_SHOP, E.WB_TOKEN, "hqShops", []), judge: J.reject(MSG.wHq) },
    { id: "W8", what: "B 열쇠 + ADMIN 코드 → 거절", req: w("ADMIN", E.WB_TOKEN, "hqShops", []), judge: J.reject(MSG.wOther) },
    { id: "W2b", what: "B 가 A 기록 id 로 지우기(B 자기 칸) — 뒤 W9b 로 A 기록 확인", req: w(E.WB_SHOP, E.WB_TOKEN, "apiDel", ["intakes", E.WA_REC]), judge: W_DEL_ANY },
    { id: "W9b", what: "다시 대조: A 기록이 그대로 있음(보기 코드 받힘)", req: w(E.WA_SHOP, E.WA_TOKEN, "viewLink", [E.WA_REC]), judge: W_LINK_OK },
    { id: "W9", what: "다시 대조: A 사진 주소 그대로 나옴", req: w(E.WA_SHOP, E.WA_TOKEN, "shotLinks", [[E.WA_PHOTO]]), judge: W_SHOT_HAS(E.WA_PHOTO) },
    /* 체크 */
    { id: "C0", what: "대조: A 가 A 청구서 줄 읽음(전 지문 저장)", req: c(E.CA_OFFICE, E.CA_TOKEN, "invoiceRows", [E.CA_INVOICE]), judge: C_ROWS, snap: "before" },
    { id: "C1", what: "B 열쇠 + A 검사소 코드 → 거절", req: c(E.CA_OFFICE, E.CB_TOKEN, "me", []), judge: J.reject(MSG.cNoOffice, true) },
    { id: "C2", what: "B 열쇠 + A 검사소 코드로 딜러 목록 → 거절", req: c(E.CA_OFFICE, E.CB_TOKEN, "dealers", []), judge: J.reject(MSG.cNoOffice, true) },
    { id: "C3", what: "B 가 A 청구서 id 로 줄 보기 → 거절", req: c(E.CB_OFFICE, E.CB_TOKEN, "invoiceRows", [E.CA_INVOICE]), judge: J.reject(MSG.cNotMine) },
    { id: "C4", what: "B 가 A 청구서 지우기 → n 0 · missing 1", req: c(E.CB_OFFICE, E.CB_TOKEN, "invoiceDel", [{ ym: E.CA_YM, ids: [E.CA_INVOICE] }]), judge: C_DEL0 },
    { id: "C5", what: "B 가 A 배달 사진 → 못 찾음", req: c(E.CB_OFFICE, E.CB_TOKEN, "deliv_photo", [E.CB_TOKEN, E.CA_DELIV_PHOTO]), judge: J.reject(MSG.cNoPhoto) },
    { id: "C7", what: "B 가 A 검사 기록(차) 검사비 고치기 → 거절", req: c(E.CB_OFFICE, E.CB_TOKEN, "carFeeSet", [{ carId: E.CA_CAR, fee: 1 }]), judge: J.reject(MSG.cNotMyCar) },
    { id: "C6", what: "다시 대조: A 청구서 줄이 C0 과 똑같음", req: c(E.CA_OFFICE, E.CA_TOKEN, "invoiceRows", [E.CA_INVOICE]), judge: C_ROWS, snap: "after" },
    /* 딜러 */
    { id: "D0", what: "대조: 딜러 A 가 자기 차 상세 봄", req: d(E.DA_TOKEN, "car", [E.WA_SHOP, E.WA_REC]), judge: D_CAR_OK },
    { id: "D1", what: "딜러 B 가 A 의 차 상세 → 못 찾음", req: d(E.DB_TOKEN, "car", [E.WA_SHOP, E.WA_REC]), judge: J.reject(MSG.dNoCar) },
    { id: "D2", what: "딜러 B 가 A 의 차 완료 표시 → 못 찾음", req: d(E.DB_TOKEN, "finish", [E.WA_SHOP, E.WA_REC]), judge: J.reject(MSG.dNoCar2) },
  ];
}
const NEED = ["API", "WA_SHOP", "WA_TOKEN", "WA_REC", "WA_PHOTO", "WA_BIZ", "WB_SHOP", "WB_TOKEN",
  "CA_OFFICE", "CA_TOKEN", "CA_INVOICE", "CA_YM", "CA_DELIV_PHOTO", "CA_CAR", "CB_OFFICE", "CB_TOKEN", "DA_TOKEN", "DB_TOKEN"];

/* ── 실행 ── */
async function send(fetchFn, API, q) {
  let res, txt = "";
  try { res = await fetchFn(API + "/" + q.api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(q.body) }); }
  catch (_) { return { status: 0, parsed: false }; }
  try { txt = await res.text(); } catch (_) { return { status: res.status, parsed: false }; }
  try { return { status: res.status, parsed: true, j: JSON.parse(txt) }; } catch (_) { return { status: res.status, parsed: false }; }
}
const fp = (rows) => crypto.createHash("sha256").update(JSON.stringify(rows)).digest("hex");   // 지문만 비교(기록에 안 씀)

async function run(E, fetchFn, out) {
  const miss = NEED.filter((k) => !String(E[k] || "").trim());
  if (E.AB_OK !== "시험업체만") miss.unshift("AB_OK");
  if (miss.length) { out("미검증: 필수 값 " + miss.length + "개 없음 (" + miss.join(", ") + ")"); return 2; }
  const API = String(E.API).replace(/\/$/, "");
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1$/.test(API) && API !== "mock:") { out("미검증: API 주소 모양이 이상해요"); return 2; }
  const P = plan(E); const R = []; let snapB = null, snapA = null;
  for (const t of P) {
    const r = await send(fetchFn, API, t.req);
    let why = t.judge(r);
    if (!why && t.snap) { const f = fp(r.j.result); if (t.snap === "before") snapB = f; else { snapA = f; if (snapB === null || snapA !== snapB) why = "A 청구서 줄이 바뀜(전후 지문 다름)"; } }
    R.push({ id: t.id, what: t.what, ok: !why, why, status: r.status });
    if (t.gate && why) { out("미검증: 시험 환경 확인 실패 " + t.id + " — " + why + " (HTTP " + r.status + ")"); return 2; }
  }
  let bad = 0;
  for (const x of R) { if (!x.ok) bad++; out((x.ok ? "통과" : "실패") + "  " + x.id + "  " + x.what + (x.ok ? "" : "  — " + x.why + " (HTTP " + x.status + ")")); }
  const ran = R.length;
  out("\n필수 " + P.length + " · 실행 " + ran + " · 통과 " + (ran - bad) + " · 실패 " + bad + " · 건너뜀 0");
  if (ran !== P.length) return 2;
  return bad ? 1 : 0;
}

/* ── 시험기 자체 시험: 잘못된 응답이 «통과»로 새지 않는지 ── */
async function selfTest() {
  const E = { AB_OK: "시험업체만", API: "mock:" };
  NEED.forEach((k) => { if (!E[k]) E[k] = k === "WA_PHOTO" ? "sb/TA/202610/x.jpg" : k === "CA_YM" ? "2026-10" : "T_" + k; });
  E.WA_SHOP = "TA"; E.WB_SHOP = "TB"; E.CA_OFFICE = "TESTA"; E.CB_OFFICE = "TESTB";
  const good = {   // 실제 서버가 정상일 때의 모양 — 이걸로는 모두 통과해야 함
    E1: { result: { shop: "TA", name: "시험A" } }, E2: { result: { shop: "TB", name: "시험B" } },
    E3: { result: { office: { code: "TESTA", name: "시험검사소A" } } }, E4: { result: { office: { code: "TESTB", name: "시험검사소B" } } },
    W0: { result: { code: "A".repeat(24) } }, W0b: { result: { links: { "sb/TA/202610/x.jpg": "https://x/s" } } },
    W1: { __err: MSG.wOther }, W2: { __err: MSG.wOther }, W3: { __err: MSG.wNoCar }, W4: { result: { links: {} } },
    W5: { __err: MSG.wNoFile }, W6: { __err: MSG.wBizTaken }, W7: { __err: MSG.wHq }, W8: { __err: MSG.wOther },
    W9: { result: { links: { "sb/TA/202610/x.jpg": "https://x/s2" } } },
    C0: { result: [{ id: 1, total: 5 }] }, C1: { __err: MSG.cNoOffice + " (01000000000)" }, C2: { __err: MSG.cNoOffice + " (01000000000)" },
    C3: { __err: MSG.cNotMine }, C7: { __err: MSG.cNotMyCar }, W2b: { result: { ok: true, rev: 1 } }, W9b: { result: { code: "B".repeat(24) } }, C4: { result: { n: 0, kept: [], missing: 1, cleared: 0 } }, C5: { __err: MSG.cNoPhoto },
    C6: { result: [{ id: 1, total: 5 }] }, D0: { result: { car: { plate: "12가3456" } } }, D1: { __err: MSG.dNoCar }, D2: { __err: MSG.dNoCar2 },
  };
  const P = plan(E);
  function mockFor(over) {   // over: {시험id: {status, body(문자열)}}
    let i = 0;
    return async () => { const t = P[i++]; const o = over[t.id];
      if (o) return { status: o.status || 200, text: async () => o.body };
      return { status: 200, text: async () => JSON.stringify(good[t.id]) }; };
  }
  const cases = [
    ["정상 응답 모두", {}, 0],
    ["W4 links 가 나옴 {links:[…]}", { W4: { body: JSON.stringify({ result: { links: { "sb/TA/202610/x.jpg": "https://leak" } } }) } }, 1],
    ["W4 links 칸 없음 {}", { W4: { body: JSON.stringify({ result: {} }) } }, 1],
    ["W4 배열 {links:['MOCK_URL']}", { W4: { body: JSON.stringify({ links: ["MOCK_URL"] }) } }, 1],
    ["C3 남의 줄이 나옴 {rows:[…]}", { C3: { body: JSON.stringify({ rows: [{ id: "FAKE_INV" }] }) } }, 1],
    ["C3 결과로 줄이 나옴", { C3: { body: JSON.stringify({ result: [{ id: "FAKE_INV" }] }) } }, 1],
    ["C4 {result:{deleted:1}}", { C4: { body: JSON.stringify({ result: { deleted: 1 } }) } }, 1],
    ["C4 n 1", { C4: { body: JSON.stringify({ result: { n: 1, missing: 0 } }) } }, 1],
    ["W9b A 기록이 사라짐", { W9b: { body: JSON.stringify({ __err: MSG.wNoCar }) } }, 1],
    ["C7 남의 검사 기록 고치기 성공", { C7: { body: JSON.stringify({ result: { ok: true, carId: "x", fee: 1 } }) } }, 1],
    ["W2b 모르는 모양", { W2b: { body: JSON.stringify({ result: { deleted: 1 } }) } }, 1],
    ["C6 A 줄이 바뀜", { C6: { body: JSON.stringify({ result: [{ id: 1, total: 0 }] }) } }, 1],
    ["W0 대조군 {}", { W0: { body: JSON.stringify({}) } }, 1],
    ["W0 대조군 {result:{}}", { W0: { body: JSON.stringify({ result: {} }) } }, 1],
    ["D0 대조군 빈 결과", { D0: { body: JSON.stringify({ result: {} }) } }, 1],
    ["W1 응답 해석 실패", { W1: { body: "<html>oops" } }, 1],
    ["W1 HTTP 500", { W1: { status: 500, body: JSON.stringify({ __err: MSG.wOther }) } }, 1],
    ["W1 다른 거절 글", { W1: { body: JSON.stringify({ __err: "잠시 뒤 다시" }) } }, 1],
    ["W2 성공해 버림", { W2: { body: JSON.stringify({ result: { ok: true } }) } }, 1],
    ["W1 칸이 둘", { W1: { body: JSON.stringify({ __err: MSG.wOther, result: 1 }) } }, 1],
    ["시험 환경: 이름에 시험 없음", { E1: { body: JSON.stringify({ result: { shop: "TA", name: "브라더" } }) } }, 2],
    ["시험 환경: 다른 업체", { E3: { body: JSON.stringify({ result: { office: { code: "GAON", name: "가온" } } }) } }, 2],
  ];
  let bad = 0; const sink = () => {};
  for (const [name, over, want] of cases) {
    const code = await run(E, mockFor(over), sink);
    const ok = code === want; if (!ok) bad++;
    console.log((ok ? "맞음" : "틀림") + "  " + name + " → 끝 코드 " + code + " (기대 " + want + ")");
  }
  /* 필수 값 없음 · 전부 건너뜀 → 미검증(2) */
  const c1 = await run({}, mockFor({}), sink); console.log((c1 === 2 ? "맞음" : "틀림") + "  필수 값 모두 없음 → 끝 코드 " + c1 + " (기대 2)"); if (c1 !== 2) bad++;
  const E2 = Object.assign({}, E); delete E2.DB_TOKEN;
  const c2 = await run(E2, mockFor({}), sink); console.log((c2 === 2 ? "맞음" : "틀림") + "  필수 값 하나 없음 → 끝 코드 " + c2 + " (기대 2)"); if (c2 !== 2) bad++;
  /* 기록에 본문 · 열쇠가 새지 않는지 */
  const lines = []; await run(Object.assign({}, E, { WB_TOKEN: "SECRET_TOKEN_123" }), mockFor({ W4: { body: JSON.stringify({ result: { links: { a: "https://signed.example/LEAKURL" } } }) } }), (s) => lines.push(s));
  const leak = lines.some((s) => /SECRET_TOKEN_123|LEAKURL|signed\.example/.test(s));
  console.log((leak ? "틀림" : "맞음") + "  실패 기록에 열쇠 · 서명 주소가 안 찍힘"); if (leak) bad++;
  console.log("\n시험기 자체 시험 " + (cases.length + 3) + "개 · 틀림 " + bad);
  return bad ? 1 : 0;
}

if (require.main === module) {
  (async () => {
    if (process.argv.includes("--self-test")) process.exit(await selfTest());
    process.exit(await run(process.env, fetch, (s) => console.log(s)));
  })();
}
module.exports = { run, selfTest, plan, MSG };
