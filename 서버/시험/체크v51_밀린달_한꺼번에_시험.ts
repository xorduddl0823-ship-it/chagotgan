// 체크 서버 v51 시험 — 밀린 달 청구서 한꺼번에(서버/설계/30 A안) · 보기 화면 밀린 달 목록 · 문자 단문 90바이트
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v51_밀린달_한꺼번에_시험.ts
import { store } from "./fake_supabase_check.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s");
Deno.env.set("SMS_FROM", "0212345678");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v51.ts";
const day = new Date(Date.now() + 86400000).toISOString();
const far = new Date(Date.now() + 30 * 86400000).toISOString();
const now = new Date().toISOString();
const inv = (id: string, ym: string, total: number, paid: number, o: any = {}) => Object.assign({ id, office_id: "o1", ym, bill_to_id: "d1",
  bill_to_name: "홍딜러", total_amount: total, paid_amount: paid, view_key: (id + "kkkkkkkkkkkkkkkkkk").slice(0, 18), view_until: far, created_at: now }, o);
Object.assign(store, {
  check_office: [{ id: "o1", code: "TEST", name: "시험검사소", tel: "031-000-0000", sms_from: "0311112222", bank_fee: "국민 123-45", ins_valid_days: 120 },
                 { id: "o2", code: "BBB", name: "남의검사소", tel: "031-999-9999", sms_from: "0319998888" }],
  check_user: [{ id: "u1", office_id: "o1", phone: "01011110000", name: "대표", role: "owner", active: true, pw_hash: "x" },
               { id: "u2", office_id: "o1", phone: "01022220000", name: "직원", role: "staff", active: true, pw_hash: "x" }],
  check_session: [{ sid: "chk_own", phone: "01011110000", office_id: "o1", role: "owner", expires_at: day },
                  { sid: "chk_stf", phone: "01022220000", office_id: "o1", role: "staff", expires_at: day }],
  cgg_access: [], wash_sessions: [], check_log: [], check_rate: [], cgg_sendlog: [],
  check_dealer: [{ id: "d1", office_id: "o1", name: "홍딜러", tel: "010-3333-4444", active: true },
                 { id: "d2", office_id: "o1", name: "김딜러", tel: "010-5555-6666", active: true }],
  check_invoice: [
    inv("a8", "2026-08", 110000, 0),
    inv("a9", "2026-09", 220000, 20000),     // 덜 받음 200,000
    inv("a7", "2026-07", 50000, 50000),      // 다 받음 — 빠짐
    inv("aa", "2026-10", 330000, 0),
    inv("b9", "2026-09", 99000, 0, { bill_to_id: "d2", bill_to_name: "김딜러" }),
    inv("z9", "2026-09", 77000, 0, { office_id: "o2" }),
  ],
  check_invoice_row: [{ id: "r1", invoice_id: "a8" }, { id: "r2", invoice_id: "a9" }, { id: "r3", invoice_id: "a9" }, { id: "r4", invoice_id: "aa" }],
  wash_hq: [{ id: 1, cron_key: "CRONKEY-0123456789", ata_cfg: { pfId: "PF", tpl: { bill: "T_BILL" } } }],
});
const sent: any[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  if (String(url).includes("solapi")) {
    const b = JSON.parse(String(init?.body || "{}"));
    if (!b.messages) return Response.json({});
    sent.push(b.messages[0]);
    return Response.json({ groupInfo: { _id: "G" }, failedMessageList: [], messageList: [{ messageId: "M" + sent.length }] });
  }
  return Response.json({});
}) as typeof fetch;
console.error = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(SRC);
let ip = 0;
async function call(fn: string, args: unknown[] = [], token = "") {
  const j = await (await H[0](new Request("http://x", { method: "POST", headers: { "x-forwarded-for": "10.1.0." + (++ip) },
    body: JSON.stringify({ shop: "", token, fn, args }) }))).json();
  return j && j.result !== undefined ? j.result : j;
}
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const I = (id: string) => store.check_invoice.find((x: any) => x.id === id);

console.log("■ 목록");
let r = await call("billBundleList", [{ dealerId: "d1" }], "chk_stf");
check("직원은 못 봄 (대표만)", !!r.__err, r);
r = await call("billBundleList", [{ dealerId: "d1" }], "chk_own");
check("덜 받은 달만 · 오래된 달부터 · 남은 금액", r.rows?.map((x: any) => x.ym).join() === "2026-08,2026-09,2026-10" &&
  r.rows[1].left === 200000 && r.left === 640000, r);

console.log("■ 보내기");
r = await call("billBundleSend", [{ dealerId: "d1", ids: ["a8", "a9", "b9"] }], "chk_own");
check("다른 딜러 청구서가 섞이면 전체 거절", !!r.__err && sent.length === 0, r);
r = await call("billBundleSend", [{ dealerId: "d1", ids: ["a8", "z9"] }], "chk_own");
check("남의 검사소 청구서가 섞이면 거절", !!r.__err && sent.length === 0, r);
r = await call("billBundleSend", [{ dealerId: "d1", ids: ["a7", "a8"] }], "chk_own");
check("다 받은 달이 섞이면 거절", !!r.__err && sent.length === 0, r);
r = await call("billBundleSend", [{ dealerId: "d1", ids: ["a8", "a9", "aa"], test: true }], "chk_own");
check("시험: 내 번호로 · 보냄 표시 안 함", sent.length === 1 && sent[0].to === "01011110000" && !I("a8").sent_at, [r, sent[0]?.to]);
sent.length = 0;
r = await call("billBundleSend", [{ dealerId: "d1", ids: ["a8", "a9", "aa"], due: "10월 31일" }], "chk_own");
const m = sent[0] || {}, v = m.kakaoOptions?.variables || {};
check("딜러에게 한 통 · 승인된 청구서 템플릿", r.ok === true && r.how === "ata" && sent.length === 1 && m.to === "01033334444" && m.kakaoOptions?.templateId === "T_BILL", [r, sent]);
check("#{기간} «2026년 8~10월»", v["#{기간}"] === "2026년 8~10월", v);
check("#{금액} = 남은 금액 합 640,000 · #{건수} = 4대", v["#{금액}"] === "640,000" && v["#{건수}"] === "4", v);
check("#{보기코드} = 가장 최근 달(10월) 청구서", v["#{보기코드}"] === "k" + I("aa").view_key, v);
check("세 달 모두 보냄 표시", ["a8", "a9", "aa"].every((id) => !!I(id).sent_at && I(id).send_how === "ata"), store.check_invoice);
sent.length = 0;
r = await call("billBundleSend", [{ dealerId: "d1", ids: ["a8", "a9"] }], "chk_own");
check("10분 안 다시 누르면 안 감", sent.length === 0 && /방금/.test(r.why || ""), r);
r = await call("billSend", ["2026-10", ["aa"], {}], "chk_own");
check("한 달 보내기(billSend)도 같은 10분 막기", sent.length === 0, r);

console.log("■ 기간 글");
for (const x of store.check_invoice) x.sent_at = null;
sent.length = 0;
await call("billBundleSend", [{ dealerId: "d1", ids: ["a8", "aa"] }], "chk_own");
check("띄엄띄엄이면 «2026년 10월 외 1개월»", sent[0]?.kakaoOptions?.variables?.["#{기간}"] === "2026년 10월 외 1개월", sent[0]?.kakaoOptions?.variables);
for (const x of store.check_invoice) x.sent_at = null;
store.check_invoice.push(inv("dd", "2025-12", 10000, 0));
sent.length = 0;
await call("billBundleSend", [{ dealerId: "d1", ids: ["dd", "a8", "a9", "aa"] }], "chk_own");
check("해가 바뀌면 «2025년 12월 외 …» (띄엄)", /^2026년 10월 외 3개월$/.test(sent[0]?.kakaoOptions?.variables?.["#{기간}"] ?? ""), sent[0]?.kakaoOptions?.variables);
store.check_invoice = store.check_invoice.filter((x: any) => x.id !== "dd");

console.log("■ 보기 화면 — 밀린 달 목록");
r = await call("invoiceView", ["k" + I("aa").view_key]);
check("unpaid: 같은 딜러의 다른 덜 받은 달 (다 받은 달 · 남의 딜러 · 남의 검사소 · 자기 달 없음)",
  Array.isArray(r.unpaid) && r.unpaid.map((x: any) => x.ym).join() === "2026-08,2026-09" && r.unpaid[1].left === 200000, r.unpaid);
check("그 달 보기 주소(k열쇠) · 내부 칸 없음", r.unpaid?.[0]?.view === "k" + I("a8").view_key && !/office_id|bill_to_id|"id"/.test(JSON.stringify(r.unpaid)), r.unpaid);
const keepSent = I("a9").sent_at;
I("a9").sent_at = null;
r = await call("invoiceView", ["k" + I("aa").view_key]);
check("(보안 낮음) 안 보낸 달은 목록에 없음 (초안 안 보임)", r.unpaid?.map((x: any) => x.ym).join() === "2026-08", r.unpaid);
I("a9").sent_at = keepSent;
I("a8").view_until = new Date(Date.now() - 1000).toISOString();
r = await call("invoiceView", ["k" + I("aa").view_key]);
check("기한 지난 달은 주소 없이 금액만", r.unpaid?.[0]?.view === "" && r.unpaid[0].left === 110000, r.unpaid);
r = await call("invoiceView", ["k" + I("b9").view_key]);
check("밀린 달 없으면 빈 목록", Array.isArray(r.unpaid) && r.unpaid.length === 0, r.unpaid);

console.log("■ 단문 90바이트");
store.wash_hq[0].ata_cfg = { tpl: {} };
const realNow = Date.now;
Date.now = () => realNow() + 61000;
for (const x of store.check_invoice) x.sent_at = null;
sent.length = 0;
store.check_car = [{ id: "c1", office_id: "o1", dealer_id: "d1", plate: "12가3456", check_date: new Date(realNow() + 9 * 3600e3 - 113 * 86400000).toISOString().slice(0, 10) }];
store.check_remind_rule = []; store.check_remind_log = []; store.check_remind_view = [];
await call("remindSend", [["c1"], {}], "chk_own");
Date.now = realNow;
const bytes = (t: string) => [...t].reduce((n, ch) => n + (ch.charCodeAt(0) <= 0x7f ? 1 : 2), 0);
const rm = sent[0] || {};
check("판단이 바이트 기준 (90 넘으면 LMS · 아니면 SMS)", !!rm.text && rm.type === (bytes(rm.text) > 90 ? "LMS" : "SMS"), [rm.type, bytes(String(rm.text))]);
const src = await Deno.readTextFile(new URL(SRC, import.meta.url));
check("«45글자» 판단이 남아 있지 않음", !/length > 45/.test(src));
r = await call("ping");
check("판 v51", /v51/.test(JSON.stringify(r)), r);

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
