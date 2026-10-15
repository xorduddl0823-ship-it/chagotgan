// 체크 v32 시험 — 오픈 베타 보안 고침(높음 H1 · 중간 M1·M2·M3·M4 · 낮음 L3) + 발송 기록(SQL 11)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/보안고침_발송기록_체크_v32_시험.ts
// CHECK_SRC 에 v31 을 넣으면 실패가 나와야 합니다.
import { store } from "./fake_supabase_check.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s");
Deno.env.set("SMS_FROM", "0212345678");
Deno.env.set("POPBILL_LINKID", "L"); Deno.env.set("POPBILL_SECRET", "c2VjcmV0");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v32.ts";
const day = new Date(Date.now() + 86400000).toISOString();
Object.assign(store, {
  check_office: [
    { id: "o1", code: "TEST", name: "시험검사소", tel: "031-000-0000", sms_from: "0311112222", biz_no: "", popbill_corp: "", popbill_userid: "" },
    { id: "o2", code: "BBB", name: "남의검사소", tel: "031-999-9999", sms_from: "0319998888", biz_no: "555-66-77777", popbill_corp: "5556677777", popbill_userid: "bbbuser" },
  ],
  check_user: [
    { id: "u1", office_id: "o1", phone: "01011110000", name: "대표", role: "owner", active: true, pw_hash: null },
    { id: "u2", office_id: "o1", phone: "01022220000", name: "직원", role: "staff", active: true, pw_hash: "x" },
  ],
  check_session: [
    { sid: "chk_own", phone: "01011110000", office_id: "o1", role: "owner", expires_at: day },
    { sid: "chk_stf", phone: "01022220000", office_id: "o1", role: "staff", expires_at: day },
  ],
  check_pw_first: [], check_deliv_fail: [], cgg_access: [], wash_sessions: [], check_log: [],
  check_deliv: [], check_deliv_dest: [], check_deliv_photo: [], check_deliv_conf: [],
  check_dealer: [{ id: "d1", office_id: "o1", name: "홍딜러", tel: "010-3333-4444", tels: [{ tel: "010-5555-6666" }], active: true }],
  check_deliv_driver: [{ id: "dr1", office_id: "o1", name: "김기사", token: "T1.old", pw_hash: "h", active: true }],
  check_invoice: [
    { id: "i1", office_id: "o1", ym: "2026-09", bill_to_id: "d1", tax_key: "CK-1", paid_amount: 0, view_key: "VK1", total_amount: 1000 },
    { id: "i2", office_id: "o1", ym: "2026-09", bill_to_id: "d9", tax_key: null, paid_amount: 0, view_key: "VK2", total_amount: 500 },
  ],
  check_invoice_row: [], check_car: [], check_repair: [], check_price_band: [], check_company: [], check_bill_group: [],
  wash_hq: [{ id: 1, biz_no: "999-99-99999", ata_cfg: {} }],
  wash_shops: [{ shop: "WW", biz_no: "4445566666" }],
  check_rate: [], cgg_sendlog: [],
});

const sent: any[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  const u = String(url);
  if (u.includes("solapi")) {
    const b = JSON.parse(String(init?.body || "{}"));
    if (!b.messages) return Response.json({});
    sent.push(b.messages[0]);
    return Response.json({ groupInfo: { _id: "G" + sent.length }, failedMessageList: [],
      messageList: b.messages.map((m: any) => ({ messageId: "M" + sent.length, to: m.to })) });
  }
  return Response.json({ code: 1, url: "https://popbill.example/x", session_token: "t", expiration: day });
}) as typeof fetch;
const elog: string[] = []; console.error = (...a: unknown[]) => { elog.push(a.map(String).join(" ")); };
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(SRC);
async function call(fn: string, args: unknown[] = [], token = "") {
  const r = await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop: "", token, fn, args }) }));
  return await r.json();
}
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const off = (id: string) => store.check_office.find((o: any) => o.id === id);

console.log("■ H1 사업자번호·팝빌 칸");
let r = await call("officeSave", [{ biz_no: "555-66-77777", tel: "031-1" }], "chk_own");
check("다른 검사소 번호는 못 넣음", !!r.__err && /다른 곳/.test(r.__err) && !off("o1").biz_no, r);
r = await call("officeSave", [{ biz_no: "4445566666" }], "chk_own");
check("워시 업체 번호도 못 넣음", !!r.__err && !off("o1").biz_no, r);
r = await call("officeSave", [{ biz_no: "123-45-67890", popbill_corp: "5556677777", tel: "031-2" }], "chk_own");
check("처음 사업자번호는 넣어짐 · 팝빌 번호는 설정 저장으로 안 바뀜", !r.__err && off("o1").biz_no === "123-45-67890" && !off("o1").popbill_corp && off("o1").tel === "031-2", [r, off("o1")]);
r = await call("officeSave", [{ biz_no: "123-45-67899" }], "chk_own");
check("한 번 넣은 사업자번호는 못 바꿈", !!r.__err && /바꿀 수 없습니다/.test(r.__err) && off("o1").biz_no === "123-45-67890", r);
r = await call("officeSave", [{ popbill_userid: "bbbuser2" }], "chk_own");
check("팝빌 아이디는 비어 있을 때 처음 한 번", !r.__err && off("o1").popbill_userid === "bbbuser2", r);
r = await call("officeSave", [{ popbill_userid: "other" }], "chk_own");
check("팝빌 아이디도 한 번 넣으면 안 바뀜", off("o1").popbill_userid === "bbbuser2", off("o1"));
check("처음 넣은 번호는 «본사 확인 중»", off("o1").biz_ok_at === null, off("o1"));
r = await call("popLogin", ["LOGIN"], "chk_own");
check("본사 확인 전에는 팝빌 바로 열기 안 됨", !!r.__err && /확인하는 중/.test(r.__err), r);
off("o1").biz_ok_at = new Date().toISOString();
r = await call("popLogin", ["LOGIN"], "chk_own");
check("확인 뒤에는 «확인 중»으로 막히지 않음", !/확인하는 중/.test(String(r.__err || "")), r);
r = await call("popJoin", [{ corpNum: "5556677777", id: "abcdefg", password: "12345678" }], "chk_own");
check("팝빌 가입은 검사소 사업자번호로만", !!r.__err && /등록된 사업자번호로만/.test(r.__err), r);

console.log("■ M3 대표만");
for (const fn of ["popLogin", "taxSite", "taxPopup"]) {
  r = await call(fn, ["SBOX"], "chk_stf");
  check("직원: " + fn + " 막힘", !!r.__err && /대표님만/.test(r.__err), r);
}
r = await call("importLegacy", ["office", [{ 검사비계좌: "남의 계좌" }]], "chk_stf");
check("직원: 예전 자료로 계좌 바꾸기 막힘", !!r.__err, r);
r = await call("deliv_saveConf", ["chk_stf", { sms_text: "아무 글" }]);
check("직원: 배달 알림 설정 막힘", !!r.__err && /대표님만/.test(r.__err), r);
r = await call("deliv_accountAdd", ["chk_stf", "새기사", "abcdef12"]);
check("직원: 기사 계정 만들기 막힘", !!r.__err, r);
r = await call("deliv_accountEdit", ["chk_stf", "김기사", { 비밀번호초기화: true }]);
check("직원: 기사 계정 고치기 막힘", !!r.__err, r);
r = await call("deliv_accountAdd", ["chk_own", "김기사", "abcdef12"]);
check("L3: 대표가 비밀번호를 새로 정하면 예전 로그인(토큰) 끊김", !r.__err && store.check_deliv_driver.find((d: any) => d.name === "김기사" && d.token === null) !== undefined, store.check_deliv_driver);

console.log("■ M2 아무 번호로 보내기 막기");
r = await call("deliv_saveConf", ["chk_own", { from_tel: "0101231234" }]);
check("보내는 번호는 검사소 번호만", !!r.__err && /등록된 번호/.test(r.__err), r);
r = await call("deliv_saveConf", ["chk_own", { from_tel: "031-111-2222", ata_pf: "EVIL", ata_tpl: "MYTPL" }]);
check("검사소 번호는 됨 · 채널(ata_pf)은 안 받음", !r.__err && store.check_deliv_conf[0]?.ata_pf === undefined, [r, store.check_deliv_conf]);
sent.length = 0;
r = await call("deliv_arrive", ["chk_own", { dest: "목적지1", dealer: "모르는사람", tel: "010-7777-8888", plate: "12가3456", force: true }]);
const last = () => store.check_deliv[store.check_deliv.length - 1] ?? {};
check("등록 안 된 번호로는 안 보냄", sent.length === 0 && last().state === "못 보냄" && /등록된 딜러/.test(last().err), last());
r = await call("deliv_arrive", ["chk_own", { dest: "목적지2", dealer: "홍딜러", tel: "010-5555-6666", plate: "12가3457", force: true }]);
check("등록된 딜러(추가 번호 포함)에게는 보냄", sent.length === 1 && last().state === "보냄", last());
check("보내는 번호는 검사소 번호", sent[0]?.from === "0311112222", sent[0]);
store.check_rate.forEach((x: any) => { if (/^arrive:o:o1:/.test(x.key)) x.n = 1000; });
sent.length = 0;
r = await call("deliv_arrive", ["chk_own", { dest: "목적지3", dealer: "홍딜러", tel: "010-3333-4444", plate: "12가3458", force: true }]);
check("검사소 하루 상한을 넘으면 안 보냄", sent.length === 0 && /다 씀/.test(last().err), [last().err, store.check_rate]);
store.check_rate.length = 0;

console.log("■ M4 청구서 다시 만들기");
r = await call("invoiceBuild", ["2026-09"], "chk_stf");
check("직원: 이미 만든 달 다시 만들기 막힘", !!r.__err && /대표님만/.test(r.__err) && store.check_invoice.length === 2, r);
r = await call("invoiceBuild", ["2026-09"], "chk_own");
check("대표: 발급된 청구서는 남고, 발급 안 된 것만 지움", !r.__err && store.check_invoice.some((i: any) => i.id === "i1") && !store.check_invoice.some((i: any) => i.id === "i2"), [r, store.check_invoice]);

console.log("■ M1 첫 비밀번호 확인 문자");
store.cgg_sendlog.length = 0;
sent.length = 0;
r = await call("login", ["01011110000", "abcdefgh1"]);
check("확인 번호 문자 나감", r.__need === "code" && sent.length === 1, r);
const fails = () => store.check_deliv_fail.find((x: any) => x.key === "pwcode:01011110000");
for (let i = 0; i < 3; i++) await call("loginCode", ["01011110000", "000000", r.__tick]);
const before = Number(fails()?.fail_count || 0);
const r2 = await call("login", ["01011110000", "abcdefgh1"]);
check("다시 로그인해도 틀린 횟수가 0으로 안 돌아감", Number(fails()?.fail_count || 0) >= before && before >= 3, [before, fails()]);
for (let i = 0; i < 5; i++) { store.check_deliv_fail.length = 0; await call("login", ["01011110000", "abcdefgh1"]); }
store.check_deliv_fail.length = 0;
const r3 = await call("login", ["01011110000", "abcdefgh1"]);
check("하루 확인 문자 상한(5)", !!r3.__err && /더 보낼 수 없습니다/.test(r3.__err), r3);
void r2;

console.log("■ 발송 기록");
const rows = store.cgg_sendlog;
check("첫 비밀번호 문자 기록: 제품 체크 · 검사소 · 가린 번호", rows.length > 0 && rows[0].product === "check" && rows[0].shop === "TEST" && rows[0].to_mask === "010-****-0000", rows[0]);
check("인증번호 값은 기록에 없음", !/\d{6}/.test(JSON.stringify(rows.map((x: any) => [x.err, x.vars, x.ref, x.tpl]))));
store.cgg_sendlog.length = 0;
await call("deliv_arrive", ["chk_own", { dest: "목적지4", dealer: "홍딜러", tel: "010-3333-4444", plate: "12가3459", force: true }]);
const ar = store.cgg_sendlog[0] || {};
check("차량 도착 문자 기록 (검사소 · 도착 번호 참고)", ar.product === "check" && ar.shop === "TEST" && /^check_arrive/.test(ar.tpl) && ar.to_mask === "010-****-4444" && !!ar.ref, ar);
r = await call("ping");
check("판 v32", /v32/.test(JSON.stringify(r)), r);

if (fail) console.log(elog.slice(-8).join("\n"));
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
