// 체크 서버 v46 시험 — 세금계산서는 입금한 곳만 · 전산외(엑셀 금액 그대로 · 계산서발행 N 은 뺌) · 보험료 부가세 · 정산 기록
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v46_세금계산서_전산외_시험.ts
import { store } from "./fake_supabase_check.ts";
Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("POPBILL_LINKID", "LID"); Deno.env.set("POPBILL_SECRET", btoa("secret"));
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v46.ts";
const day = new Date(Date.now() + 86400000).toISOString();
let seq = 0;
const car = (goods: string, extra: Record<string, unknown> = {}) => ({ id: "k" + (++seq), office_id: "o1", dealer_id: "d1",
  check_date: "2026-10-10", goods, amount: 99000, ins_fee: 12000, src: "전산", no: "N" + seq, ...extra });
Object.assign(store, {
  check_office: [{ id: "o1", code: "GAON", name: "가온", vat_rate: 10, biz_no: "1234567890", popbill_userid: "gaon", popbill_corp: "1234567890" },
                 { id: "o2", code: "OTHER", name: "남" }],
  check_user: [{ id: "u1", office_id: "o1", phone: "01011110000", name: "대표", role: "owner", active: true, pw_hash: "x" },
               { id: "u2", office_id: "o1", phone: "01022220000", name: "직원", role: "staff", active: true, pw_hash: "x" }],
  check_session: [{ sid: "chk_own", phone: "01011110000", office_id: "o1", role: "owner", expires_at: day },
                  { sid: "chk_stf", phone: "01022220000", office_id: "o1", role: "staff", expires_at: day }],
  check_log: [], cgg_access: [], wash_sessions: [], check_rate: [],
  check_price_band: [{ office_id: "o1", from_date: "2026-06-01", items: [{ code: "국산차", name: "국산차", price: 30000 }] }],
  check_invoice: [], check_invoice_row: [], check_company: [],
  check_dealer: [{ id: "d1", office_id: "o1", name: "홍딜러", active: true, issuer_kind: "dealer", issuer_name: "홍상사", issuer_biz: "2223334445" },
                 { id: "d2", office_id: "o1", name: "김딜러", active: true, issuer_kind: "dealer", issuer_name: "김상사", issuer_biz: "3334445556" }],
  check_car: [
    car("국산차"), car("국산차"),                                                   // 검사비 2 × 33,000 = 66,000
    car("국산차", { src: "전산외", amount: 55000, tax_yn: "Y" }),                   // 전산외 55,000 (부가세 포함 · 계산서 Y)
    car("국산차", { src: "전산외", amount: 22000, tax_yn: "N", tax_note: "현금" }), // 전산외 22,000 (계산서 N)
    car("국산차", { dealer_id: "d2" }),                                             // 김딜러 33,000
  ],
  check_repair: [], check_bill_override: [],
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
const pop: any[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  const u = String(url);
  if (u.includes("linkhub.co.kr") && u.includes("auth")) return Response.json({ session_token: "TOK", expiration: new Date(Date.now() + 3600e3).toISOString() });
  if (u.includes("/Taxinvoice")) { pop.push(JSON.parse(String(init?.body))); return Response.json({ code: 1, message: "ok", ntsConfirmNum: "NTS" + pop.length }); }
  return Response.json({});
}) as typeof fetch;
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

console.log("② 전산외 = 엑셀 금액 그대로");
await call("invoiceBuild", ["2026-10"]);
const hong = store.check_invoice.find((v: any) => v.bill_to_id === "d1");
const kim = store.check_invoice.find((v: any) => v.bill_to_id === "d2");
check("홍딜러: 검사비 66,000 · 전산외 77,000(55,000+22,000) · 합계 143,000", hong?.fee_amount === 66000 && hong?.ext_amount === 77000 && hong?.total_amount === 143000, hong);
const extRows = store.check_invoice_row.filter((r: any) => r.invoice_id === hong?.id && r.kind === "ext");
check("전산외 줄 단가 = 금액÷1.1 · 금액 그대로", extRows.length === 2 && extRows.some((r: any) => r.amount === 55000 && r.unit === 50000), extRows);

console.log("① 세금계산서는 입금한 곳만");
let r = await call("taxList", ["2026-10"]);
let th = (r.result ?? []).find((x: any) => x.id === hong.id);
check("taxList: 계산서 금액은 N 전산외(22,000) 뺀 121,000 · paid 0 · left 143,000", th?.total === 121000 && th?.notax === 22000 && th?.paid === 0 && th?.left === 143000, th);
check("입금 전이면 can=false · 까닭", th?.can === false && /입금 전/.test(th?.why), th);
r = await call("taxIssue", [[hong.id, kim.id]]);
check("입금 전 발급 거절 (서버에서도)", r.result?.ok === 0 && r.result.bad.length === 2 && r.result.bad.every((b: string) => /입금 전/.test(b)) && pop.length === 0, r);
check("직원은 발급 못 함", !!(await call("taxIssue", [[hong.id], "", {}, { unpaidOk: [hong.id] }], "chk_stf")).__err && pop.length === 0);
hong.paid_amount = 143000;
r = await call("taxIssue", [[hong.id]]);
check("다 입금된 홍딜러는 발급", r.result?.ok === 1 && pop.length === 1, r);
check("계산서 합계 121,000 · 전산외 줄 55,000(N 뺌)", pop[0]?.totalAmount === "121000" &&
  pop[0].detailList.some((d: any) => /전산외/.test(d.itemName) && Number(d.supplyCost) + Number(d.tax) === 55000), pop[0]?.detailList);
kim.paid_amount = 10000;
r = await call("taxIssue", [[kim.id]]);
check("일부만 입금된 김딜러는 거절", r.result?.ok === 0 && /남은 금액 23,000원/.test(r.result.bad[0]), r);
r = await call("taxIssue", [[kim.id], "", {}, { unpaidOk: [kim.id] }]);
check("대표가 «입금 전 발급»을 고르면 발급 · 표시·기록 남음", r.result?.ok === 1 && !!kim.tax_unpaid_ok_at && store.check_log.some((l: any) => l.what === "입금 전 발급"), r);

console.log("④ 보험료 부가세 설정");
r = await call("officeGet", []);
check("기본은 «미포함»", r.result?.ins_vat === "미포함", r.result?.ins_vat);
check("이상한 값 거절 · 직원 거절", !!(await call("officeSave", [{ ins_vat: "반반" }])).__err && !!(await call("officeSave", [{ ins_vat: "포함" }], "chk_stf")).__err);
let sv = await call("officeSave", [{ ins_vat: "포함" }]);
check("«포함» 저장", sv.result?.ok === true && store.check_office[0].ins_vat === "포함", sv);

console.log("②⑤ 매출(salesStat)");
r = await call("salesStat", [{}]);
let m = (r.result?.rows ?? []).find((x: any) => x.ym === "2026-10");
check("검사비 99,000(3대) · 전산외 77,000 따로 · 합계 176,000", m?.fee === 99000 && m?.ext === 77000 && m?.total === 176000, m);
check("보험료 «포함»이면 insTotal = 그대로 (5 × 12,000)", m?.ins === 60000 && m?.insTotal === 60000 && m?.insVat === "포함", m);
check("청구서 2장 · 세금계산서 2장", m?.made === 2 && m?.taxN === 2, m);
await call("officeSave", [{ ins_vat: "미포함" }]);
r = await call("salesStat", [{}]);
m = (r.result?.rows ?? []).find((x: any) => x.ym === "2026-10");
check("«미포함»이면 insTotal = ×1.1", m?.insTotal === 66000, m);

console.log("② 엑셀 올리기: 계산서발행·사유 저장");
await call("excelPut", ["전산외", [{ 성능번호: "X1", 차량번호: "12가3456", 검사일: "2026-11-02", 상품명: "국산차", 금액: "33,000", 계산서발행: "N", 사유: "<b>현금영수증</b>" }], "2026-11", {}]);
const x1 = store.check_car.find((c: any) => c.no === "X1");
check("tax_yn N · 사유 글자 거름 · src 전산외", x1?.tax_yn === "N" && !/[<>]/.test(x1?.tax_note) && x1?.src === "전산외" && x1?.amount === 33000, x1);
await call("excelPut", ["전산외", [{ 성능번호: "X2", 차량번호: "12가3457", 검사일: "2026-11-02", 상품명: "국산차", 금액: "33000" }], "2026-11", {}]);
check("비어 있으면 Y", store.check_car.find((c: any) => c.no === "X2")?.tax_yn === "Y");

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
