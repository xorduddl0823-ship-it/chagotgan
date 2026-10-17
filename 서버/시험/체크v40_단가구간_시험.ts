// 체크 서버 v40 시험 — 체크 v48 «단가 구간»(priceList·priceSave·priceDel) + invoiceRows·deliv_photo 범위 확인
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v40_단가구간_시험.ts
import { store } from "./fake_supabase_check.ts";
Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v40.ts";
const day = new Date(Date.now() + 86400000).toISOString();
Object.assign(store, {
  check_office: [{ id: "o1", code: "TEST", name: "시험검사소", vat_rate: 10 }, { id: "o2", code: "OTHER", name: "남" }],
  check_user: [{ id: "u1", office_id: "o1", phone: "01011110000", name: "대표", role: "owner", active: true, pw_hash: "x" },
               { id: "u2", office_id: "o1", phone: "01022220000", name: "직원", role: "staff", active: true, pw_hash: "x" }],
  check_session: [{ sid: "chk_own", phone: "01011110000", office_id: "o1", role: "owner", expires_at: day },
                  { sid: "chk_stf", phone: "01022220000", office_id: "o1", role: "staff", expires_at: day }],
  check_log: [], cgg_access: [], wash_sessions: [], check_rate: [],
  check_price_band: [{ office_id: "o1", from_date: "2026-01-01", items: [{ code: "D", name: "국산", price: 40000 }] },
                     { office_id: "o2", from_date: "2026-01-01", items: [{ code: "D", name: "남의 국산", price: 1 }] }],
  check_invoice: [{ id: "vx", office_id: "o2", ym: "2026-09", total_amount: 1 }],
  check_invoice_row: [{ id: "r1", invoice_id: "vx", item: "남의 줄", amount: 1 }],
  check_deliv: [{ id: "dx", office_id: "o2" }], check_deliv_photo: [{ id: "phx", deliv_id: "dx", path: "o2/a.jpg" }],
  check_dealer: [{ id: "d1", office_id: "o1", name: "홍딜러", active: true }],
  check_car: [{ id: "k1", office_id: "o1", dealer_id: "d1", check_date: "2026-09-10", goods: "D", amount: 0, ins_fee: 0 }],
  check_repair: [], check_bill_override: [],
});
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
const mine = () => store.check_price_band.filter((b: any) => b.office_id === "o1");
console.log("① 단가 구간");
let r = await call("priceList", [], "chk_stf");
check("priceList: 직원도 봄 · 이 검사소 것만", r.result?.length === 1 && r.result[0].from_date === "2026-01-01" && r.result[0].items[0].price === 40000, r);
check("직원은 저장 못 함", !!(await call("priceSave", [{ from: "2026-10-01", items: [{ code: "D", name: "국산", price: 45000 }] }], "chk_stf")).__err);
r = await call("priceSave", [{ from: "2026-10-01", items: [{ code: "D", name: "국산 <b>", price: 45000 }, { code: "I", name: "수입", price: 60000 }] }]);
check("대표 저장 → {ok} · 새 구간 · 이름 글자 거름", r.result?.ok === true && mine().length === 2 && /^국산\s+b$/.test(mine().find((b: any) => b.from_date === "2026-10-01")?.items?.[0]?.name ?? ""), [r, mine()]);
r = await call("priceSave", [{ from: "2026-10-01", items: [{ code: "D", name: "국산", price: 46000 }] }]);
check("같은 날짜면 바꿈(새로 안 늘어남)", mine().length === 2 && mine().find((b: any) => b.from_date === "2026-10-01")?.items?.length === 1, mine());
check("단가 0 · 소수 · 1천만 넘음 거절", !!(await call("priceSave", [{ from: "2026-11-01", items: [{ name: "a", price: 0 }] }])).__err &&
  !!(await call("priceSave", [{ from: "2026-11-01", items: [{ name: "a", price: 1.5 }] }])).__err && !!(await call("priceSave", [{ from: "2026-11-01", items: [{ name: "a", price: 10_000_001 }] }])).__err);
check("항목 0개·51개 · 이름 빔 · 같은 항목 두 번 · 날짜 틀림 거절", !!(await call("priceSave", [{ from: "2026-11-01", items: [] }])).__err &&
  !!(await call("priceSave", [{ from: "2026-11-01", items: Array.from({ length: 51 }, (_, i) => ({ code: "c" + i, name: "n" + i, price: 1 })) }])).__err &&
  !!(await call("priceSave", [{ from: "2026-11-01", items: [{ code: "x", name: "", price: 1 }] }])).__err &&
  !!(await call("priceSave", [{ from: "2026-11-01", items: [{ code: "D", name: "a", price: 1 }, { code: "D", name: "b", price: 2 }] }])).__err &&
  !!(await call("priceSave", [{ from: "2026/11/01", items: [{ name: "a", price: 1 }] }])).__err);
console.log("② 청구서 만들기가 새 단가를 씀");
await call("invoiceBuild", ["2026-09"]);
const inv = store.check_invoice.find((v: any) => v.office_id === "o1");
check("9월 차는 1월 구간(40,000 + 부가세) 그대로", inv?.total_amount === 44000, inv);
console.log("③ 지우기");
check("직원은 못 지움", !!(await call("priceDel", [{ from: ["2026-10-01"] }], "chk_stf")).__err);
check("다 지우면 거절(하나는 남김)", !!(await call("priceDel", [{ from: ["2026-01-01", "2026-10-01"] }])).__err && mine().length === 2);
r = await call("priceDel", [{ from: ["2026-10-01", "2099-01-01"] }]);
check("하나 지움 → {n:1} · 남의 검사소 구간은 그대로", r.result?.n === 1 && mine().length === 1 && store.check_price_band.some((b: any) => b.office_id === "o2"), [r, store.check_price_band]);
check("기록 남음", store.check_log.some((l: any) => l.what === "단가 구간 저장") && store.check_log.some((l: any) => l.what === "단가 구간 지움"));
console.log("④ 범위 확인 (체크 방 지적)");
r = await call("invoiceRows", ["vx"]);
check("다른 검사소 세션으로 남의 청구서 줄을 부르면 거절", !!r.__err && !JSON.stringify(r).includes("남의 줄"), r);
const own = store.check_invoice.find((v: any) => v.office_id === "o1");
r = await call("invoiceRows", [own.id]);
check("우리 청구서 줄은 줌", Array.isArray(r.result) && r.result.length >= 1, r);
r = await call("deliv_photo", ["chk_own", "phx"]);
check("남의 검사소 배달 사진은 안 줌", !!r.__err || !r.result?.url, r);
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
