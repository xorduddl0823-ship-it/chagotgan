// 체크 서버 v44 시험 — 가온 검사비 바로잡기 (10월 정답 3,927,000원 · 9월 7,260,000원)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v44_검사비단가_시험.ts
import { store } from "./fake_supabase_check.ts";
Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v44.ts";
const day = new Date(Date.now() + 86400000).toISOString();
/* 차를 상품명별로 n대 — 엑셀 «금액»은 일부러 크게(예전 대신 셈이면 부풀어 틀림) */
let seq = 0;
const cars = (ym: string, goods: string, n: number, extra: Record<string, unknown> = {}) =>
  Array.from({ length: n }, () => ({ id: "k" + (++seq), office_id: "o1", dealer_id: "d1", check_date: ym + "-10", goods,
    amount: 99000, ins_fee: 12000, src: "", ...extra }));
Object.assign(store, {
  check_office: [{ id: "o1", code: "GAON", name: "가온", vat_rate: 10 }, { id: "o2", code: "OTHER", name: "남" }],
  check_user: [{ id: "u1", office_id: "o1", phone: "01011110000", name: "대표", role: "owner", active: true, pw_hash: "x" },
               { id: "u2", office_id: "o1", phone: "01022220000", name: "직원", role: "staff", active: true, pw_hash: "x" }],
  check_session: [{ sid: "chk_own", phone: "01011110000", office_id: "o1", role: "owner", expires_at: day },
                  { sid: "chk_stf", phone: "01022220000", office_id: "o1", role: "staff", expires_at: day }],
  check_log: [], cgg_access: [], wash_sessions: [], check_rate: [],
  /* 가온 규칙: ~5/31 25,000·35,000 / 6/1~ 30,000·40,000 — 6월 구간 국산차는 코드가 비어 있음(이름으로 찾아야 함) */
  check_price_band: [
    { office_id: "o1", from_date: "2026-01-01", items: [{ code: "국산차", name: "국산차", price: 25000 }, { code: "수입차", name: "수입차", price: 35000 }] },
    { office_id: "o1", from_date: "2026-06-01", items: [{ code: "", name: "국산차", price: 30000 }, { code: "수입차", name: "수입차", price: 40000 }] }],
  check_invoice: [], check_invoice_row: [],
  check_dealer: [{ id: "d1", office_id: "o1", name: "홍딜러", active: true }],
  check_car: [
    // 10월: 국산 60(선납 1) · 수입 46(선납 1) · 기타 38(재검 20 · 가성능 10 · 수출 가성능 8)
    ...cars("2026-10", "국산차", 59), ...cars("2026-10", "선납_국산차", 1),
    ...cars("2026-10", "수입차", 45), ...cars("2026-10", "선납_수입차", 1),
    ...cars("2026-10", "재검", 20), ...cars("2026-10", "가성능", 10), ...cars("2026-10", "수출 가성능", 8),
    // 9월: 6,600,000원(별도) = 국산 100 × 30,000 + 수입 90 × 40,000
    ...cars("2026-09", "국산차", 100), ...cars("2026-09", "수입차", 90),
    // 5월: 옛 단가 · 모르는 상품명
    ...cars("2026-05", "국산차", 2), ...cars("2026-05", "이상한상품", 3),
    // 남의 검사소 차
    { id: "kx", office_id: "o2", dealer_id: "dx", check_date: "2026-10-10", goods: "수출 가성능", amount: 1 },
  ],
  check_repair: [], check_bill_override: [],
});
/* check_sales_raw 흉내: 달 × 상품명으로 묶음 */
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
const invOf = (ym: string) => store.check_invoice.find((v: any) => v.office_id === "o1" && v.ym === ym);

console.log("① 10월 청구서 = 나스 v150 정답");
let r = await call("invoiceBuild", ["2026-10"]);
let v = invOf("2026-10");
check("검사비 3,927,000원(부가세 포함)", v?.fee_amount === 3927000 && v?.total_amount === 3927000, v);
check("국산 60 · 수입 46 · 기타 38", v?.dom_n === 60 && v?.imp_n === 46 && v?.etc_n === 38, v);
check("수출 가성능 금액 넣을 차 8대 알려 줌 · 모르는 상품명 없음", r.result?.feeNeed === 8 && r.result?.unknown?.length === 0, r.result && { feeNeed: r.result.feeNeed, unknown: r.result.unknown });
const rows = store.check_invoice_row.filter((x: any) => x.invoice_id === v?.id);
check("재검·가성능·선납 줄은 0원", rows.filter((x: any) => /재검|가성능|선납/.test(x.item)).every((x: any) => x.amount === 0) && rows.length === 144, rows.length);

console.log("② 9월 = 7,260,000원(포함)");
await call("invoiceBuild", ["2026-09"]);
check("9월 검사비 7,260,000원", invOf("2026-09")?.fee_amount === 7260000, invOf("2026-09"));

console.log("③ 모르는 상품명은 0원 + unknown");
r = await call("invoiceBuild", ["2026-05"]);
check("5월: 옛 단가 25,000 × 2 = 55,000원 · 모르는 것 0원", invOf("2026-05")?.fee_amount === 55000, invOf("2026-05"));
check("unknown: [{goods:'이상한상품', n:3}]", JSON.stringify(r.result?.unknown) === JSON.stringify([{ goods: "이상한상품", n: 3 }]), r.result?.unknown);

console.log("④ 수출 가성능 손 입력 (carFeeSet)");
const ex = store.check_car.filter((c: any) => c.office_id === "o1" && c.goods === "수출 가성능");
check("직원은 못 넣음", !!(await call("carFeeSet", [{ carId: ex[0].id, fee: 50000 }], "chk_stf")).__err && ex[0].fee_manual === undefined);
check("남의 검사소 차는 거절", !!(await call("carFeeSet", [{ carId: "kx", fee: 50000 }])).__err && store.check_car.find((c: any) => c.id === "kx").fee_manual === undefined);
check("음수·소수·1천만 넘음 거절", !!(await call("carFeeSet", [{ carId: ex[0].id, fee: -1 }])).__err &&
  !!(await call("carFeeSet", [{ carId: ex[0].id, fee: 1.5 }])).__err && !!(await call("carFeeSet", [{ carId: ex[0].id, fee: 10_000_001 }])).__err);
r = await call("carFeeSet", [{ carId: ex[0].id, fee: 50000 }]);
check("대표가 넣음 → {ok} · 기록", r.result?.ok === true && ex[0].fee_manual === 50000 && store.check_log.some((l: any) => l.what === "검사비 손 입력"), r);
r = await call("invoiceBuild", ["2026-10"]);
check("청구서에 반영: 3,927,000 + 55,000 = 3,982,000원 · 남은 7대", invOf("2026-10")?.fee_amount === 3982000 && r.result?.feeNeed === 7, [invOf("2026-10")?.fee_amount, r.result?.feeNeed]);

console.log("⑤ 매출(salesStat)도 같은 셈");
r = await call("salesStat", [{}]);
const row = (ym: string) => (r.result?.rows ?? []).find((x: any) => x.ym === ym);
check("10월 매출 검사비 3,982,000원 · 국산 60 · 수입 46 · 기타 38", row("2026-10")?.fee === 3982000 && row("2026-10")?.dom === 60 && row("2026-10")?.imp === 46 && row("2026-10")?.etc === 38, row("2026-10"));
check("9월 매출 7,260,000원 (청구서와 같음)", row("2026-09")?.fee === 7260000, row("2026-09"));
check("5월 매출 55,000원 · 모르는 상품명 알려 줌", row("2026-05")?.fee === 55000 && row("2026-05")?.unknown?.[0]?.goods === "이상한상품" && row("2026-05")?.unknown?.[0]?.n === 3, row("2026-05"));
check("10월 금액 넣을 차 7대", row("2026-10")?.feeNeed === 7, row("2026-10"));
r = await call("carFeeSet", [{ carId: ex[0].id, fee: null }]);
check("빈 값이면 지움(단가표대로)", r.result?.ok === true && ex[0].fee_manual === null, r);

console.log("⑥ 단가 0원 저장 (재검·가성능)");
r = await call("priceSave", [{ from: "2026-11-01", items: [{ code: "국산차", name: "국산차", price: 30000 }, { code: "재검", name: "재검", price: 0 }] }]);
check("0원 받음", r.result?.ok === true, r);
check("음수·소수는 여전히 거절", !!(await call("priceSave", [{ from: "2026-11-01", items: [{ name: "a", price: -1 }] }])).__err &&
  !!(await call("priceSave", [{ from: "2026-11-01", items: [{ name: "a", price: 1.5 }] }])).__err);

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
