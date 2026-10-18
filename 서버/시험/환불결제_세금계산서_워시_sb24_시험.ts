// 워시 sb24 시험 — 카드 환불한 결제(부분 포함)는 본사 → 업체 세금계산서 거절 · hqPayments 에 refunded
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/환불결제_세금계산서_워시_sb24_시험.ts
import { store } from "./fake_supabase_wash.ts";
Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("POPBILL_LINKID", "LID"); Deno.env.set("POPBILL_SECRET", btoa("secret"));
const far = new Date(Date.now() + 864e5).toISOString();
const ADM = "b".repeat(48);
Object.assign(store, {
  wash_hq: [{ id: 1, biz_no: "9999999999", biz_name: "차곳간", cash_on: false }],
  wash_shops: [{ shop: "BT", name: "브라더세차", active: true, biz_no: "1234567890", biz_ok_at: far }],
  wash_sessions: [{ sid: ADM, phone: "01000000000", shop: "ADMIN", role: "admin", expires_at: far }],
  wash_users: [{ phone: "01000000000", shop: "ADMIN", role: "admin", active: true }],
  wash_payments: [
    { id: "p1", shop: "BT", amount: 55000, status: "paid", order_id: "o1" },      // 전체 환불(canceled)
    { id: "p2", shop: "BT", amount: 55000, status: "paid", order_id: "o2" },      // 부분 환불(raw.cancel)
    { id: "p3", shop: "BT", amount: 55000, status: "paid", order_id: "o3" },      // 환불 없음
    { id: "p4", shop: "BT", amount: 55000, status: "paid" },                      // 수동 결제(주문 없음)
    { id: "r1", shop: "BT", amount: 55000, status: "refunded", memo: "카드 환불 o1 · 이용기간 -30일 · 사유" },
  ],
  wash_pay_order: [
    { order_id: "o1", shop: "BT", status: "canceled", raw: { cancel: { amount: 55000 } } },
    { order_id: "o2", shop: "BT", status: "paid", raw: { cancel: { amount: 10000 } } },
    { order_id: "o3", shop: "BT", status: "paid", raw: {} },
  ],
  wash_tax_rec: [], wash_taxlog: [], wash_rate: [], cgg_sendlog: [], hq_audit: [],
});
const pop: any[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  const u = String(url);
  if (u.includes("linkhub.co.kr") && /Token/.test(u)) return Response.json({ session_token: "TOK", expiration: new Date(Date.now() + 3600e3).toISOString() });
  if (u.includes("/Taxinvoice")) { pop.push(JSON.parse(String(init?.body))); return Response.json({ code: 1, ntsConfirmNum: "NTS" + pop.length }); }
  return Response.json({});
}) as typeof fetch;
console.error = () => {}; console.warn = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(Deno.env.get("WASH_SRC") ?? "../1_차곳간워시_서버_wash-api_sb24.ts");
const call = async (fn: string, args: unknown[]) =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop: "ADMIN", token: ADM, fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") { if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); } }
const hq = (payId: string) => call("hqTaxIssue", ["BT", { amount: 50000, payId, period: "2026-10" }]);

let r = await hq("p1");
check("전체 환불한 결제는 거절", !!r.__err && /환불/.test(r.__err) && pop.length === 0, r);
r = await hq("p2");
check("부분 환불한 결제도 거절", !!r.__err && /환불/.test(r.__err) && pop.length === 0, r);
r = await hq("p3");
check("환불 없는 카드 결제는 발행", r.result?.ok === true && pop.length === 1, r);
r = await hq("p4");
check("주문 없는 수동 결제는 지금처럼 발행", r.result?.ok === true && pop.length === 2, r);
r = await call("hqPayments", []);
const by = Object.fromEntries((r.result?.payments || []).map((p: any) => [p.id, p.refunded]));
check("hqPayments: 줄마다 refunded", by.p1 === true && by.p2 === true && by.p3 === false && by.p4 === false, by);
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
