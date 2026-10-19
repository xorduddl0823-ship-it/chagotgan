// 체크 서버 v53 시험 — 긴급(중복 사업자번호): 남의 번호·팝빌 아이디는 못 넣음 · 숫자 10자리로 저장 · 동시에 넣어도 한 곳만 · 검사소 A/B 자료가 서로 안 보임
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v53_중복사업자번호_시험.ts
import { store } from "./fake_supabase_check.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v53.ts";
const day = new Date(Date.now() + 86400000).toISOString();
const NUM = "8761202709";   // 시험용 번호(실제 업체 자료 아님)
Object.assign(store, {
  check_office: [
    { id: "oA", code: "OFFA", name: "시험검사소A", biz_no: NUM, popbill_corp: NUM, popbill_userid: "testpbA", tel: "031-000-0001" },
    { id: "oB", code: "OFFB", name: "시험검사소B", biz_no: "", popbill_corp: "", popbill_userid: "", tel: "031-000-0002" },
    { id: "oC", code: "OFFC", name: "동시C", biz_no: "", popbill_corp: "", popbill_userid: "" },
    { id: "oD", code: "OFFD", name: "동시D", biz_no: "", popbill_corp: "", popbill_userid: "" },
  ],
  check_user: ["A", "B", "C", "D"].map((x, i) => ({ id: "u" + x, office_id: "o" + x, phone: "0100000000" + i, name: "대표" + x, role: "owner", active: true, pw_hash: "x" })),
  check_session: ["A", "B", "C", "D"].map((x, i) => ({ sid: "chk_" + x.toLowerCase() + "xxxxxxxxxxxxxxxxxxxx", phone: "0100000000" + i, office_id: "o" + x, role: "owner", expires_at: day })),
  biz_share_req: [], biz_share_ok: [],
  wash_hq: [{ id: 1, biz_no: "1112233333" }], wash_shops: [{ shop: "W1", biz_no: "5556677777" }],
  cgg_access: [], wash_sessions: [], check_log: [], check_rate: [], cgg_sendlog: [],
  check_dealer: [{ id: "dA", office_id: "oA", name: "A딜러", tel: "010-1111-2222", active: true }, { id: "dB", office_id: "oB", name: "B딜러", tel: "010-3333-4444", active: true }],
  check_invoice: [{ id: "iA", office_id: "oA", ym: "2026-09", bill_to_id: "dA", bill_to_name: "A딜러", total_amount: 1000, view_key: "aaaaaaaaaaaaaaaaaa", created_at: day }],
  check_invoice_row: [{ id: "rA", invoice_id: "iA", kind: "fee", item: "국산", qty: 1, unit: 1000, amount: 1000 }],
  check_car: [{ id: "cA", office_id: "oA", dealer_id: "dA", plate: "11가1111", check_date: "2026-07-01" }],
  check_remind_rule: [], check_remind_log: [], check_remind_view: [], check_deposit: [],
  check_deliv: [{ id: "vA", office_id: "oA", view_key: "vvvvvvvvvvvvvvvvvv" }], check_deliv_photo: [{ id: "pA", deliv_id: "vA", path: "vA/1.jpg", ord: 1 }],
});
globalThis.fetch = (async () => Response.json({})) as typeof fetch;
console.error = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(SRC);
const TK = (x: string) => "chk_" + x + "xxxxxxxxxxxxxxxxxxxx";
async function call(fn: string, args: unknown[] = [], token = "", shop = "") {
  const j = await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop, token, fn, args }) }))).json();
  return j && j.result !== undefined ? j.result : j;
}
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const off = (id: string) => store.check_office.find((o: any) => o.id === id);
const MSG = /이미 등록된 사업자번호예요/;

console.log("① 남의 번호·팝빌 아이디");
let r = await call("officeSave", [{ biz_no: "876-12-02709" }], TK("b"));
check("B가 A 사업자번호로 저장 → 거절 · 확정 안내 글", !!r.__err && MSG.test(r.__err) && !off("oB").biz_no, r);
r = await call("officeSave", [{ biz_no: "5556677777" }], TK("b"));
check("워시 업체 번호도 거절", !!r.__err && !off("oB").biz_no, r);
r = await call("officeSave", [{ biz_no: "1112233333" }], TK("b"));
check("차곳간 본사 번호도 거절", !!r.__err && !off("oB").biz_no, r);
r = await call("officeSave", [{ popbill_userid: "TESTPBA" }], TK("b"));
check("다른 검사소 팝빌 아이디(대소문자만 다름)도 거절", !!r.__err && !off("oB").popbill_userid, r);
r = await call("officeSave", [{ biz_no: "333-44-55555", popbill_userid: "mypb_b" }], TK("b"));
check("안 쓰는 번호는 «숫자 10자리»로 저장 · 팝빌 아이디도 저장", !r.__err && off("oB").biz_no === "3334455555" && off("oB").popbill_userid === "mypb_b", [r, off("oB")]);

console.log("①-2 같은 사업자의 다른 제품(워시 업체 번호) · 다른 종사업장 — 본사 승인 때만");
off("oB").biz_no = ""; off("oB").popbill_userid = "";
store.biz_share_req.length = 0;
r = await call("officeSave", [{ biz_no: "5556677777" }], TK("b"));
check("워시가 쓰는 번호: 거절 + 승인 요청 1건(체크 · OFFB)", !!r.__err && /확인 요청을 남겼어요/.test(r.__err) && store.biz_share_req.length === 1 &&
  store.biz_share_req[0].product === "check" && store.biz_share_req[0].code === "OFFB" && store.biz_share_req[0].biz_no === "5556677777", [r, store.biz_share_req]);
r = await call("officeSave", [{ biz_no: NUM }], TK("b"));
check("같은 제품·같은 키(A 번호 + 0000)는 요청 없음", !/확인 요청/.test(r.__err || "") && store.biz_share_req.length === 1, [r, store.biz_share_req]);
r = await call("officeSave", [{ biz_no: NUM, biz_sub: "0002" }], TK("b"));
check("다른 종사업장(0002)은 거절 + 요청", !!r.__err && store.biz_share_req.length === 2 && store.biz_share_req[1].biz_sub === "0002", store.biz_share_req);
r = await call("officeSave", [{ biz_no: NUM, biz_sub: "12a" }], TK("b"));
check("종사업장번호가 숫자가 아니면 거절", !!r.__err && /종사업장번호/.test(r.__err), r);
store.biz_share_ok.push({ product: "check", code: "OFFB", biz_no: "5556677777", biz_sub: "0000" });
r = await call("officeSave", [{ biz_no: "5556677777" }], TK("b"));
check("본사가 승인한 뒤에는 그 번호로 저장됨", !r.__err && off("oB").biz_no === "5556677777", [r, off("oB")]);
store.biz_share_ok.length = 0; off("oB").biz_no = "";
r = await call("officeSave", [{ biz_no: "333-44-55555", popbill_userid: "mypb_b" }], TK("b"));

console.log("② 같은 번호를 두 곳이 동시에");
(store as any).__bizUniq = true;    // SQL 24 문지기 흉내
const [x1, x2] = await Promise.all([call("officeSave", [{ biz_no: "7778899999" }], TK("c")), call("officeSave", [{ biz_no: "777-88-99999" }], TK("d"))]);
const has = ["oC", "oD"].filter((id) => String(off(id).biz_no || "").replace(/\D/g, "") === "7778899999").length;
check("동시에 넣어도 한 곳만 · 다른 곳은 같은 안내", has === 1 && [x1, x2].filter((x) => x.ok).length === 1 && [x1, x2].some((x) => MSG.test(x.__err || "")), [x1, x2]);
(store as any).__bizUniq = false;

console.log("②-2 기사 «회사 비밀번호»가 두 검사소가 함께 쓰는 사업자번호일 때 (보안 C5)");
store.check_office.push({ id: "oE", code: "OFFE", name: "같은번호E", biz_no: "4445566666" }, { id: "oF", code: "OFFF", name: "같은번호F", biz_no: "444-55-66666" });
(store as any).check_deliv_driver = (store as any).check_deliv_driver ?? []; (store as any).check_deliv_signup = (store as any).check_deliv_signup ?? [];
r = await call("deliv_signup", ["4445566666", "홍기사", "pw123456!"]);
check("가입: 골라 잡지 않고 거절(«검사소 코드를 넣어 주세요») · 아무 데도 안 들어감", /검사소 코드/.test(r.__err || "") && !(store as any).check_deliv_signup.length, r);
r = await call("deliv_login", ["홍기사", "pw123456!", "4445566666"]);
check("로그인: 같은 번호 두 곳이면 거절", /검사소 코드/.test(r.__err || ""), r);
r = await call("deliv_signup", ["offe", "홍기사", "pw123456!"]);
check("검사소 코드로는 그 검사소에만 가입 신청(사무실 승인 대기)", !!r.__err && /사무실/.test(r.__err) && (store as any).check_deliv_signup.length === 1 && (store as any).check_deliv_signup[0].office_id === "oE", [r, (store as any).check_deliv_signup]);

console.log("③ 검사소 A/B 자료가 서로 안 보임 (남의 ID 넣기)");
r = await call("invoiceRows", ["iA"], TK("b"));
check("B가 A 청구서 줄 읽기 → 거절", !!r.__err, r);
r = await call("invoiceRekey", ["iA"], TK("b"));
check("B가 A 청구서 주소 새로 만들기 → 거절 · A 열쇠 그대로", !!r.__err && store.check_invoice[0].view_key === "aaaaaaaaaaaaaaaaaa", r);
r = await call("billSend", [{ ym: "2026-09", ids: ["iA"] }], TK("b"));
check("B가 A 청구서 보내기 → 거절", !!r.__err, r);
r = await call("remindSend", [["cA"], {}], TK("b"));
check("B가 A 차량 재검사 알림 → 거절", !!r.__err, r);
r = await call("billBundleList", [{ dealerId: "dA" }], TK("b"));
check("B가 A 딜러의 밀린 청구서 → 빈 목록", Array.isArray(r.rows) && r.rows.length === 0, r);
r = await call("sendLogList", [{}], TK("b"), "OFFA");
check("요청에 A 검사소 코드를 넣으면 → 거절(권한 없음)", /권한이 없습니다/.test(r.__err || ""), r);
r = await call("officeSave", [{ tel: "02-999-9999" }], TK("b"), "OFFA");
check("요청에 A 코드를 넣고 설정 저장 → 거절 · A·B 모두 그대로", /권한이 없습니다/.test(r.__err || "") && off("oA").tel === "031-000-0001" && off("oB").tel === "031-000-0002", [r, off("oA").tel, off("oB").tel]);
r = await call("officeSave", [{ tel: "x" }]);
check("열쇠 없이 → 거절", !!r.__err, r);

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
