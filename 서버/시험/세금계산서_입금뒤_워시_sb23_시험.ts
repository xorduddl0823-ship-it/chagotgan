// 워시 sb23 시험 — 대표님 규칙 «입금 전 세금계산서 발급 없음» (업체 → 딜러 pbIssue · 본사 → 업체 hqTaxIssue)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/세금계산서_입금뒤_워시_sb23_시험.ts
import { store } from "./fake_supabase_wash.ts";
Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("POPBILL_LINKID", "LID"); Deno.env.set("POPBILL_SECRET", btoa("secret"));
const far = new Date(Date.now() + 864e5).toISOString();
const OWN = "c".repeat(48), ADM = "b".repeat(48), OWN2 = "e".repeat(48);
const BILL = "A".repeat(24), BILL_OLD = "B".repeat(24), BILL_ZZ = "C".repeat(24);
Object.assign(store, {
  wash_hq: [{ id: 1, biz_no: "9999999999", biz_name: "차곳간", cash_on: false }],
  wash_shops: [
    { shop: "BT", name: "브라더세차", active: true, plan: "pro", paid_until: far.slice(0, 10), owner_phone: "01077778888", biz_no: "1234567890", biz_ok_at: far },
    { shop: "ZZ", name: "남의세차", active: true, plan: "pro", paid_until: far.slice(0, 10), owner_phone: "01055556666", biz_no: "1112233333", biz_ok_at: far },
  ],
  wash_sessions: [
    { sid: OWN, phone: "01077778888", shop: "BT", role: "owner", expires_at: far },
    { sid: OWN2, phone: "01055556666", shop: "ZZ", role: "owner", expires_at: far },
    { sid: ADM, phone: "01000000000", shop: "ADMIN", role: "admin", expires_at: far },
  ],
  wash_users: [{ phone: "01000000000", shop: "ADMIN", role: "admin", active: true }],
  wash_docs: [
    { shop: "BT", demo: false, col: "intakes", id: "j1", data: { status: "수금완료", total: 50000, paidAt: "2026-10-10" } },
    { shop: "BT", demo: false, col: "intakes", id: "j2", data: { status: "출고", total: 50000 } },
  ],
  wash_viewcode: [
    { code: BILL, shop: "BT", kind: "bill", expires_at: far, data: { amount: 110000, base: 100000, rows: [{ id: "j1" }, { id: "j2" }] } },
    { code: BILL_OLD, shop: "BT", kind: "bill", expires_at: far, data: { amount: 55000, rows: [{ car: "옛 줄(id 없음)" }] } },
    { code: BILL_ZZ, shop: "ZZ", kind: "bill", expires_at: far, data: { amount: 1000, rows: [] } },
  ],
  wash_payments: [
    { id: "pay1", shop: "BT", amount: 55000, status: "paid" },
    { id: "pay2", shop: "BT", amount: 55000, status: "ready" },
    { id: "pay3", shop: "ZZ", amount: 55000, status: "paid" },
  ],
  wash_plans: [{ code: "pro", name: "프로", tax_free: 100 }],
  wash_taxlog: [], wash_rate: [], cgg_sendlog: [], hq_audit: [],
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
await import(Deno.env.get("WASH_SRC") ?? "../1_차곳간워시_서버_wash-api_sb23.ts");
const call = async (fn: string, args: unknown[], token = OWN, shop = "BT") =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop, token, fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") { if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); } }
const doc = (total: number) => ({ invoiceeCorpNum: "2223334445", invoiceeCorpName: "홍상사", totalAmount: String(total), supplyCostTotal: String(Math.round(total / 1.1)), remark1: "홍딜러 10월" });
const issue = async (o: any, token = OWN, shop = "BT") => { const r = await call("pbIssue", [JSON.stringify(o)], token, shop); return r.result ?? r; };

console.log("■ 업체 → 딜러 (pbIssue)");
let r = await issue({ doc: doc(110000) });
check("청구서(보기코드) 없이 보내면 거절", r.ok === false && /어느 청구서/.test(r.error) && pop.length === 0, r);
r = await issue({ bill: BILL, doc: doc(110000) });
check("일감 하나가 아직 입금 전이면 거절 · 남은 금액", r.ok === false && r.unpaid === true && /입금 전/.test(r.error) && /55,000원/.test(r.error) && pop.length === 0, r);
r = await issue({ bill: BILL_OLD, doc: doc(55000) });
check("입금 상태를 셀 수 없는 옛 청구서는 거절", r.ok === false && /셀 수 없/.test(r.error) && pop.length === 0, r);
r = await issue({ bill: BILL_ZZ, doc: doc(1000) });
check("남의 업체 청구서는 거절", r.ok === false && /이 업체 청구서가 아닙니다/.test(r.error) && pop.length === 0, r);
(store.wash_docs as any[]).find((d) => d.id === "j2").data.status = "수금완료";
r = await issue({ bill: BILL, doc: doc(99000) });
check("다 입금됐어도 금액이 다르면 거절", r.ok === false && /다릅니다/.test(r.error) && pop.length === 0, r);
r = await issue({ bill: BILL, doc: doc(110000) });
check("다 입금 + 금액 같음 → 발행", r.ok === true && pop.length === 1, r);

console.log("■ 본사 → 업체 (hqTaxIssue)");
const hq = async (v: any) => { const x = await call("hqTaxIssue", ["BT", v], ADM, "ADMIN"); return x; };
r = await hq({ amount: 50000, period: "2026-10" });
check("결제 번호 없으면 거절", !!r.__err && /어느 결제/.test(r.__err) && pop.length === 1, r);
r = await hq({ amount: 50000, payId: "pay2" });
check("결제 전(ready)이면 거절", !!r.__err && /결제\(입금\) 전/.test(r.__err) && pop.length === 1, r);
r = await hq({ amount: 50000, payId: "pay3" });
check("다른 업체 결제는 거절", !!r.__err && /이 업체의 결제/.test(r.__err) && pop.length === 1, r);
r = await hq({ amount: 40000, payId: "pay1" });
check("금액이 다르면 거절 (44,000 ≠ 55,000)", !!r.__err && /다릅니다/.test(r.__err) && pop.length === 1, r);
r = await hq({ amount: 50000, payId: "pay1", period: "2026-10" });
check("결제 완료 + 금액 같음 → 발행 · 비고에 결제 번호", r.result?.ok === true && pop.length === 2 && /^결제 pay1/.test(pop[1].remark1), [r, pop[1]?.remark1]);
r = await hq({ amount: 50000, payId: "pay1", period: "2026-10", force: true });
check("같은 결제로 다시(«그대로 다시 보내기» 포함)는 거절", !!r.__err && /이미/.test(r.__err) && pop.length === 2, r);

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
