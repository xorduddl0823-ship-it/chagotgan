// 보안 방 · 2026-10-19 · 시험 업체 A/B 격리 자동 시험 (서버 방과 함께 돌림)
// ─────────────────────────────────────────────────────────────
// 무엇을: 시험 업체 B 로 로그인한 열쇠로 시험 업체 A 의 차 · 거래처 · 청구서 · 사진 · 파일을 읽거나 고치려 하면
//         서버가 모두 거절하는지 봐요. A 열쇠로 같은 것을 하면 되는지(대조)도 함께 봐요.
// 규칙:   진짜 손님 업체로 돌리지 않아요. 아래 «시험 업체» 확인 문구가 없으면 시작하지 않아요.
//         B 로 시도하는 쓰기는 «거절돼야 맞는» 것만 해요(성공하면 그 자체가 실패 보고).
// 쓰는 법 (Node 18 이상 · 덧붙일 꾸러미 없음):
//   AB_OK=시험업체만 \
//   API=https://<프로젝트>.supabase.co/functions/v1 \
//   WA_SHOP=<워시 시험 A 코드> WA_TOKEN=<A 로그인 열쇠> WA_REC=<A 차 기록 id> WA_PHOTO=<A 사진 id sb/…> WA_BIZ=<A 사업자번호> \
//   WB_SHOP=<워시 시험 B 코드> WB_TOKEN=<B 로그인 열쇠> \
//   CA_OFFICE=<체크 시험 A 코드> CA_TOKEN=<A chk_ 열쇠> CA_INVOICE=<A 청구서 id> CA_YM=<그 청구서 달 2026-10> CA_DELIV_PHOTO=<A 배달 사진 id> \
//   CB_OFFICE=<체크 시험 B 코드> CB_TOKEN=<B chk_ 열쇠> \
//   node 보안/검사기록/중복사업자번호_10-19/AB_시험_업체격리.js
// 열쇠 값은 어디에도 적지 말고 그때그때 넣어요(이 파일 · 기록 · 대화 모두 금지). 결과에는 열쇠가 찍히지 않아요.
"use strict";
const E = process.env;
if (E.AB_OK !== "시험업체만") { console.error("AB_OK=시험업체만 을 넣어야 시작해요 (진짜 손님 업체로는 돌리지 않음)"); process.exit(2); }
const API = String(E.API || "").replace(/\/$/, "");
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1$/.test(API)) { console.error("API 주소가 이상해요"); process.exit(2); }

async function call(fnName, body) {
  const r = await fetch(API + "/" + fnName, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let j = {}; try { j = await r.json(); } catch (_) { j = { __err: "답을 읽지 못함 " + r.status }; }
  return j;
}
const wash = (shop, token, fn, args) => call("wash-api", { shop, token, fn, args });
const check = (shop, token, fn, args) => call("check-api", { shop, token, fn, args });
const isErr = (j) => !!(j && (j.__err || (j.result && j.result.ok === false) || j.ok === false));
const empty = (v) => v == null || (Array.isArray(v) && !v.length) || (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length);

const R = [];
async function t(id, what, run, want) {
  if (!run) { R.push({ id, what, st: "건너뜀", why: "넣은 값 없음" }); return; }
  try { const j = await run(); const ok = want(j); R.push({ id, what, st: ok ? "통과" : "실패", why: ok ? "" : JSON.stringify(j).slice(0, 160) }); }
  catch (e) { R.push({ id, what, st: "실패", why: String(e && e.message || e).slice(0, 160) }); }
}

(async () => {
  const W = { a: E.WA_SHOP, at: E.WA_TOKEN, b: E.WB_SHOP, bt: E.WB_TOKEN };
  const hasW = W.a && W.at && W.b && W.bt;
  /* 대조(A 자기 것은 됨) */
  await t("W0", "대조: A 열쇠로 A 자료 읽기 됨", hasW && (() => wash(W.a, W.at, "apiLoad", [])), (j) => !isErr(j));
  /* B → A */
  await t("W1", "B 열쇠 + A 업체 코드로 읽기 → 거절", hasW && (() => wash(W.a, W.bt, "apiLoad", [])), (j) => isErr(j));
  await t("W2", "B 열쇠 + A 업체 코드로 쓰기 → 거절", hasW && (() => wash(W.a, W.bt, "apiSet", ["intakes", "ab_probe", JSON.stringify({ probe: 1 })])), (j) => isErr(j));
  await t("W3", "B 가 A 차 기록 id 로 보기 주소 만들기 → 못 찾음", hasW && E.WA_REC && (() => wash(W.b, W.bt, "viewLink", [E.WA_REC])), (j) => isErr(j));
  await t("W4", "B 가 A 사진 id 로 서명 주소 받기 → 빈 목록", hasW && E.WA_PHOTO && (() => wash(W.b, W.bt, "shotLinks", [[E.WA_PHOTO]])),
    (j) => isErr(j) || empty(j.result && j.result.links));
  await t("W5", "B 가 A 사진 파일 내려받기 → 거절", hasW && E.WA_PHOTO && (() => wash(W.b, W.bt, "driveB64", [E.WA_PHOTO])), (j) => isErr(j));
  await t("W6", "B 가 A 사업자번호를 자기 업체에 넣기 → 거절", hasW && E.WA_BIZ && (() => wash(W.b, W.bt, "shopBiz", [{ bizNo: E.WA_BIZ }])), (j) => isErr(j));
  await t("W7", "B 열쇠로 본사 기능(hqShops) → 거절", hasW && (() => wash(W.b, W.bt, "hqShops", [])), (j) => isErr(j));
  await t("W8", "B 열쇠 + ADMIN 코드로 본사 기능 → 거절", hasW && (() => wash("ADMIN", W.bt, "hqShops", [])), (j) => isErr(j));

  const C = { a: E.CA_OFFICE, at: E.CA_TOKEN, b: E.CB_OFFICE, bt: E.CB_TOKEN };
  const hasC = C.a && C.at && C.b && C.bt;
  await t("C0", "대조: A 열쇠로 A 검사소 들어가기 됨", hasC && (() => check(C.a, C.at, "me", [])), (j) => !isErr(j));
  await t("C1", "B 열쇠 + A 검사소 코드 → 거절", hasC && (() => check(C.a, C.bt, "me", [])), (j) => isErr(j));
  await t("C2", "B 열쇠 + A 검사소 코드로 딜러 목록 → 거절", hasC && (() => check(C.a, C.bt, "dealers", [])), (j) => isErr(j));
  await t("C3", "B 가 A 청구서 id 로 줄 보기 → 빈 목록/못 찾음", hasC && E.CA_INVOICE && (() => check(C.b, C.bt, "invoiceRows", [E.CA_INVOICE])),
    (j) => isErr(j) || empty(j.rows) || empty(j.result) || (Array.isArray(j) && !j.length));
  await t("C4", "B 가 A 청구서 id 로 지우기 → 0건/거절", hasC && E.CA_INVOICE && E.CA_YM && (() => check(C.b, C.bt, "invoiceDel", [{ ym: E.CA_YM, ids: [E.CA_INVOICE] }])),
    (j) => isErr(j) || Number(j && (j.n ?? j.deleted ?? j.removed ?? 0)) === 0);   // B 검사소 안에서만 찾으므로 0건이어야 맞음
  await t("C5", "B 가 A 배달 사진 id → 못 찾음", hasC && E.CA_DELIV_PHOTO && (() => check(C.b, C.bt, "deliv_photo", [C.bt, E.CA_DELIV_PHOTO])), (j) => isErr(j));
  await t("C6", "다시 대조: A 청구서는 A 열쇠로 그대로 보임(C4 가 지우지 않았는지)", hasC && E.CA_INVOICE && (() => check(C.a, C.at, "invoiceRows", [E.CA_INVOICE])), (j) => !isErr(j));

  let bad = 0;
  for (const r of R) { if (r.st === "실패") bad++; console.log(r.st + "  " + r.id + "  " + r.what + (r.why ? "  — " + r.why : "")); }
  console.log("\n모두 " + R.length + " · 통과 " + R.filter((r) => r.st === "통과").length + " · 실패 " + bad + " · 건너뜀 " + R.filter((r) => r.st === "건너뜀").length);
  process.exit(bad ? 1 : 0);
})();
