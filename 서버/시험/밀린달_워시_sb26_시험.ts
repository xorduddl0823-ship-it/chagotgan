// 워시 sb26 시험 — 청구서 보기의 «밀린 달 목록»(설계 30 A안) · 문자 단문 90바이트 · 환불 메모를 그 업체 것만
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/밀린달_워시_sb26_시험.ts
import { store } from "./fake_supabase_wash.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s"); Deno.env.set("SMS_FROM", "0212345678");
const far = new Date(Date.now() + 864e5).toISOString();
const OWN = "c".repeat(48), ADM = "b".repeat(48);
const doc = (shop: string, id: string, d: any) => ({ shop, demo: false, col: "intakes", id, data: d });
const at = (ym: string) => ym + "-10T03:00:00Z";
Object.assign(store, {
  wash_hq: [{ id: 1, ata_cfg: {} }], cgg_access: [], wash_viewcode: [] as any[], wash_otp: [], cgg_sendlog: [],
  wash_shops: [{ shop: "BT", name: "브라더세차", active: true, plan: "pro", paid_until: far.slice(0, 10), trial_until: far, owner_phone: "01077778888" },
               { shop: "OT", name: "다른세차", active: true, plan: "pro", paid_until: far.slice(0, 10) }],
  wash_sessions: [{ sid: OWN, phone: "01077778888", shop: "BT", role: "owner", expires_at: far },
                  { sid: ADM, phone: "01000000000", shop: "ADMIN", role: "admin", expires_at: far }],
  wash_users: [], wash_payments: [], wash_pay_order: [],
  wash_docs: [
    doc("BT", "a8", { plate: "11가1111", dealer: "김딜러", company: "가상사", createdAt: at("2026-08"), total: 100000, status: "출고" }),
    doc("BT", "a9", { plate: "22가2222", dealer: "김딜러", company: "가상사", createdAt: at("2026-09"), total: 200000, status: "출고" }),
    doc("BT", "b9", { plate: "23가2323", dealer: "김딜러", company: "가상사", createdAt: at("2026-09"), total: 50000, status: "수금완료" }),
    doc("BT", "a7", { plate: "33가3333", dealer: "김딜러", company: "가상사", createdAt: at("2026-07"), total: 70000, status: "수금완료" }),
    doc("BT", "aa", { plate: "44가4444", dealer: "김딜러", company: "가상사", createdAt: at("2026-10"), total: 300000, status: "출고" }),
    doc("BT", "n9", { plate: "55가5555", dealer: "김딜러", company: "나상사", createdAt: at("2026-09"), total: 90000, status: "출고" }),   // 다른 상사 같은 이름
    doc("BT", "p9", { plate: "66가6666", dealer: "박딜러", company: "가상사", createdAt: at("2026-09"), total: 80000, status: "출고" }),
  ],
});
const sent: any[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  if (String(url).includes("solapi")) { const b = JSON.parse(String(init?.body || "{}")); sent.push(b.messages?.[0]); return Response.json({ failedMessageList: [] }); }
  return Response.json({});
}) as typeof fetch;
console.error = () => {}; console.warn = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
const SRC = Deno.env.get("WASH_SRC") ?? new URL("../1_차곳간워시_서버_wash-api_sb26.ts", import.meta.url).href;
await import(SRC);
const call = async (fn: string, args: unknown[], token = "", shop = "") =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop, token, fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const bill = (month: string, ids: [string, number][], o: any = {}) => JSON.stringify(Object.assign({ month, unit: "dealer", name: "김딜러", company: "가상사",
  cars: ids.length, base: ids.reduce((t, x) => t + x[1], 0), amount: ids.reduce((t, x) => t + x[1], 0), paid: 0,
  due: ids.reduce((t, x) => t + x[1], 0), rows: ids.map(([id, total]) => ({ id, plate: "x", total, works: ["광택"] })) }, o));
const code = async (b: string) => String((await call("viewBill", [b], OWN, "BT")).result?.code ?? "");

console.log("① 밀린 달 목록");
const c7 = await code(bill("2026-07", [["a7", 70000]]));
const c8 = await code(bill("2026-08", [["a8", 100000]]));
const c9 = await code(bill("2026-09", [["a9", 200000], ["b9", 50000]]));
const c10 = await code(bill("2026-10", [["aa", 300000]]));
const n9 = await code(bill("2026-09", [["n9", 90000]], { company: "나상사" }));
const p9 = await code(bill("2026-09", [["p9", 80000]], { name: "박딜러" }));
for (const c of [c7, c8, c9, c10, n9, p9]) store.wash_viewcode.find((x: any) => x.code === c).to_phones = ["01033334444"];   // 보낸 청구서
check("보기 주소 6개", [c7, c8, c9, c10, n9, p9].every((x) => /^[A-F0-9]{24}$/.test(x)) && new Set([c7, c8, c9, c10, n9, p9]).size === 6);
let v = (await call("viewCar", [c10])).result ?? {};
check("10월 청구서 그대로 + unpaid", v.kind === "bill" && v.bill?.month === "2026-10" && Array.isArray(v.unpaid), v);
check("밀린 달 = 8·9월 (다 받은 7월 · 다른 상사 같은 이름 · 다른 딜러 · 자기 달 없음)", v.unpaid?.map((x: any) => x.month).join() === "2026-08,2026-09", v.unpaid);
const u9 = v.unpaid?.find((x: any) => x.month === "2026-09") ?? {};
check("9월: 청구 250,000 · 받음 50,000 · 남음 200,000 (장부로 셈)", u9.amount === 250000 && u9.paid === 50000 && u9.due === 200000, u9);
check("그 달 보기코드 · 일감 id·메모 없음", u9.code === c9 && !/a9|b9|memo/.test(JSON.stringify(v.unpaid)), v.unpaid);
store.wash_viewcode.find((x: any) => x.code === c9).to_phones = [];
v = (await call("viewCar", [c10])).result ?? {};
check("(보안 낮음) 안 보낸 달은 목록에 없음 (초안 안 보임)", v.unpaid?.map((x: any) => x.month).join() === "2026-08", v.unpaid);
store.wash_viewcode.find((x: any) => x.code === c9).to_phones = ["01033334444"];
store.wash_viewcode.find((x: any) => x.code === c8).expires_at = new Date(Date.now() - 1000).toISOString();
v = (await call("viewCar", [c10])).result ?? {};
check("기한 지난 달 주소는 목록에서 빠짐", v.unpaid?.map((x: any) => x.month).join() === "2026-09", v.unpaid);
v = (await call("viewCar", [p9])).result ?? {};
check("밀린 달 없으면 빈 목록", Array.isArray(v.unpaid) && v.unpaid.length === 0, v.unpaid);
store.wash_docs.find((d: any) => d.id === "a9").data.status = "수금완료";
v = (await call("viewCar", [c10])).result ?? {};
check("입금되면 목록에서 빠짐", Array.isArray(v.unpaid) && v.unpaid.length === 0, v.unpaid);

console.log("② 단문 90바이트");
const src = await Deno.readTextFile(new URL(SRC));
check("«45글자» 판단이 남아 있지 않음", !/length > 45/.test(src));
sent.length = 0;
await call("hqCashAdd", ["BT", 50000, 365, "계좌 입금", "paid"], ADM, "ADMIN");
const m = sent.find((x) => x?.to === "01077778888") ?? {};
const bytes = (t: string) => [...t].reduce((n, ch) => n + (ch.charCodeAt(0) <= 0x7f ? 1 : 2), 0);
check("충전완료 대체 문자(⑦ · 90바이트 안)는 단문(SMS)", !!m.text && bytes(m.text) <= 90 && m.type === "SMS", [m.type, m.text && bytes(m.text)]);

console.log("③ 환불 메모는 그 업체 것만");
store.wash_payments.push(
  { id: "q1", shop: "BT", amount: 55000, status: "paid", order_id: "oq1" },
  { id: "rq", shop: "OT", amount: 55000, status: "refunded", memo: "카드 환불 oq1 · 다른 업체 메모" });
store.wash_pay_order.push({ order_id: "oq1", shop: "BT", status: "paid", raw: {} });
let hp = await call("hqPayments", [], ADM, "ADMIN");
let by = Object.fromEntries((hp.result?.payments || []).map((p: any) => [p.id, p.refunded]));
check("다른 업체 줄의 같은 주문번호 메모로는 환불로 안 봄", by.q1 === false, by);
store.wash_payments.push({ id: "rq2", shop: "BT", amount: 55000, status: "refunded", memo: "카드 환불 oq1 · 이용기간 -10일" });
hp = await call("hqPayments", [], ADM, "ADMIN");
by = Object.fromEntries((hp.result?.payments || []).map((p: any) => [p.id, p.refunded]));
check("그 업체 환불 메모면 환불됨", by.q1 === true, by);
check("판 sb26", JSON.stringify(await call("apiVer", [], OWN, "BT")).includes("sb26"));

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
