// 체크 서버 v48 시험 — 거래처에 없는 신청인도 청구서 (10월 35곳 · 3,927,000원) · 다 지운 달은 저절로 안 만듦 · 보험료 그대로
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v48_신청인청구서_시험.ts
import { store } from "./fake_supabase_check.ts";
Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v48.ts";
const day = new Date(Date.now() + 86400000).toISOString();
let seq = 0;
const car = (who: { id?: string; text?: string }, goods: string) => ({ id: "k" + (++seq), office_id: "o1", dealer_id: who.id ?? null,
  dealer_text: who.text ?? "", check_date: "2026-10-10", goods, amount: 99000, ins_fee: 12000, src: "전산" });
/* 35곳에 국산 59 · 수입 45 를 나눔 (연결된 딜러 3 + 신청인만 32) · 0원만 있는 신청인 15곳 · 선납 2 · 기타 38 */
const linked = [{ id: "d1" }, { id: "d2" }, { id: "d3" }];
const texts = Array.from({ length: 32 }, (_, i) => ({ text: "신청인" + (i + 1) }));
const who35 = [...linked, ...texts];
const cars: any[] = [];
for (let i = 0; i < 59; i++) cars.push(car(who35[i % 35], "국산차"));
for (let i = 0; i < 45; i++) cars.push(car(who35[(i + 7) % 35], "수입차"));
cars.push(car(who35[0], "선납_국산차"), car(who35[1], "선납_수입차"));
const zero15 = Array.from({ length: 15 }, (_, i) => ({ text: "재검만" + (i + 1) }));
for (let i = 0; i < 38; i++) cars.push(car(zero15[i % 15], i % 2 ? "재검" : "가성능"));
Object.assign(store, {
  check_office: [{ id: "o1", code: "GAON", name: "가온", vat_rate: 10 }],
  check_user: [{ id: "u1", office_id: "o1", phone: "01011110000", name: "대표", role: "owner", active: true, pw_hash: "x" }],
  check_session: [{ sid: "chk_own", phone: "01011110000", office_id: "o1", role: "owner", expires_at: day }],
  check_log: [], cgg_access: [], wash_sessions: [], check_rate: [],
  check_price_band: [{ office_id: "o1", from_date: "2026-06-01", items: [{ code: "국산차", name: "국산차", price: 30000 }, { code: "수입차", name: "수입차", price: 40000 }] }],
  check_invoice: [], check_invoice_row: [], check_company: [],
  check_dealer: linked.map((d, i) => ({ id: d.id, office_id: "o1", name: "연결딜러" + (i + 1), active: true })),
  check_car: cars, check_repair: [], check_bill_override: [],
});
(store as any).__rpc = {
  check_sales_raw: (a: any) => {
    const m = new Map<string, any>();
    for (const c of store.check_car.filter((x: any) => x.office_id === a.p_office)) {
      const k = String(c.check_date).slice(0, 7) + "|" + c.goods;
      const r = m.get(k) ?? { ym: String(c.check_date).slice(0, 7), goods: c.goods, n: 0, amount: 0, ins: 0, ins_n: 0, free_n: 0 };
      r.n++; r.amount += Number(c.amount) || 0; r.ins += Number(c.ins_fee) || 0; m.set(k, r);
    }
    return [...m.values()];
  },
  check_repair_raw: () => [], check_invoice_raw: () => [],
};
globalThis.fetch = (async () => Response.json({})) as typeof fetch;
console.error = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(SRC);
const call = async (fn: string, args: unknown[] = [], token = "chk_own") =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop: "", token, fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}

console.log("① 신청인만 있는 차도 청구서");
let r = await call("invoiceBuild", ["2026-10"]);
const inv = store.check_invoice.filter((v: any) => v.ym === "2026-10");
const sum = inv.reduce((t: number, v: any) => t + v.fee_amount, 0);
check("청구서 35곳(0원 15곳은 숨김) · 검사비 합계 3,927,000원", inv.length === 35 && sum === 3927000, [inv.length, sum]);
check("신청인 청구서 32곳 — 청구처 id 비움 · 이름 = 신청인 · 계산서 안 끊음", r.result?.noDealer === 32 &&
  inv.filter((v: any) => !v.bill_to_id).every((v: any) => /^신청인\d+$/.test(v.bill_to_name) && v.tax_issue === false), r.result?.noDealer);
check("국산 60 · 수입 46 (선납 포함)", inv.reduce((t: number, v: any) => t + v.dom_n, 0) === 60 && inv.reduce((t: number, v: any) => t + v.imp_n, 0) === 46);
const t1 = inv.find((v: any) => v.bill_to_name === "신청인1");
const rows = store.check_invoice_row.filter((x: any) => x.invoice_id === t1?.id);
check("신청인 청구서 줄의 딜러 이름 = 신청인", rows.length > 0 && rows.every((x: any) => x.dealer_name === "신청인1"), rows.slice(0, 2));
const vk = t1?.view_key;
await call("invoiceBuild", ["2026-10"]);
check("다시 만들어도 신청인마다 보기 주소 그대로 · 35곳 그대로", store.check_invoice.filter((v: any) => v.ym === "2026-10").length === 35 &&
  store.check_invoice.find((v: any) => v.bill_to_name === "신청인1")?.view_key === vk);
r = await call("billSend", ["2026-10", [store.check_invoice.find((v: any) => v.bill_to_name === "신청인1").id], {}]);
check("신청인 청구서는 보내기 안 됨(거래처에 넣은 뒤)", r.result?.results?.[0]?.ok === false && /거래처/.test(r.result.results[0].why), r);

console.log("② 다 지운 달은 저절로 다시 안 만듦");
const ids = store.check_invoice.filter((v: any) => v.ym === "2026-10").map((v: any) => v.id);
r = await call("invoiceDel", [{ ym: "2026-10", ids }]);
check("모두 지움 → cleared", r.result?.n === 35 && r.result?.cleared === true, r.result && { n: r.result.n, cleared: r.result.cleared });
r = await call("invoiceList", ["2026-10", true]);
check("invoiceList(auto) 는 빈 목록 · 다시 안 만듦", Array.isArray(r.result) && r.result.length === 0 && store.check_invoice.filter((v: any) => v.ym === "2026-10").length === 0, r);
await call("invoiceBuild", ["2026-10"]);
r = await call("invoiceList", ["2026-10", true]);
check("«청구서 만들기»를 누르면 다시 생김", r.result?.length === 35, r.result?.length);
const one = store.check_invoice.find((v: any) => v.ym === "2026-10");
r = await call("invoiceDel", [{ ym: "2026-10", ids: [one.id] }]);
check("일부만 지우면 cleared 아님", r.result?.n === 1 && r.result?.cleared === false, r.result);

console.log("③ 보험료는 엑셀 «성능보험료» 그대로");
r = await call("salesStat", [{}]);
const m = (r.result?.rows ?? []).find((x: any) => x.ym === "2026-10");
check("ins = 성능보험료 합계 그대로(144대 × 12,000) · 미포함이면 insTotal ×1.1", m?.ins === 144 * 12000 && m?.insTotal === Math.round(144 * 12000 * 1.1), m && { ins: m.ins, insTotal: m.insTotal });

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
