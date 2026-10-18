// 워시 sb27 시험 — 밀린 달 한꺼번에: sendMsg(bill)의 codes:[…] 로 묶인 달 코드에도 받은 번호 남김(같은 업체·같은 받는 곳·기한 안만)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/밀린달_받은번호_워시_sb27_시험.ts
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
const SRC = Deno.env.get("WASH_SRC") ?? new URL("../1_차곳간워시_서버_wash-api_sb27.ts", import.meta.url).href;
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

const c8 = await code(bill("2026-08", [["a8", 100000]]));
const c9 = await code(bill("2026-09", [["a9", 200000], ["b9", 50000]]));
const c10 = await code(bill("2026-10", [["aa", 300000]]));
const n9 = await code(bill("2026-09", [["n9", 90000]], { company: "나상사" }));
const p9 = await code(bill("2026-09", [["p9", 80000]], { name: "박딜러" }));
store.wash_viewcode.push({ code: "F".repeat(24), shop: "OT", rec_id: store.wash_viewcode.find((x: any) => x.code === c9).rec_id, kind: "bill", expires_at: far, data: {} });
const tp = (c: string) => store.wash_viewcode.find((x: any) => x.code === c)?.to_phones ?? [];
console.log("① 보내기 전");
let v = (await call("viewCar", [c10])).result ?? {};
check("아무것도 안 보냈으면 밀린 달 목록 없음", Array.isArray(v.unpaid) && v.unpaid.length === 0, v.unpaid);
console.log("② 최근 달 코드로 한 통 + codes");
const VARS = { 기간: "2026년 8~10월", 받는곳: "김딜러", 건수: 4, 금액: "550,000", 입금기한: "10/31", 계좌: "국민 123", 보기코드: c10 };
sent.length = 0;
const r = await call("sendMsg", [JSON.stringify({ to: "01033334444", from: "x", kind: "ATA", ataKey: "bill", variables: VARS,
  codes: [c8, c9, n9, p9, "F".repeat(24), "bad", c10] })], OWN, "BT");
check("한 통만 나감 (보내기는 그대로)", sent.length === 1 && sent[0].to === "01033334444", [r, sent.length]);
check("최근 달 코드에 받은 번호", tp(c10).includes("01033334444"), tp(c10));
check("묶인 8·9월 코드에도 받은 번호", tp(c8).includes("01033334444") && tp(c9).includes("01033334444"), [tp(c8), tp(c9)]);
check("다른 상사 같은 이름 · 다른 딜러 · 다른 업체 코드엔 안 남김", !tp(n9).length && !tp(p9).length && !tp("F".repeat(24)).length, [tp(n9), tp(p9), tp("F".repeat(24))]);
v = (await call("viewCar", [c10])).result ?? {};
check("보기 화면 밀린 달 목록에 8·9월", v.unpaid?.map((x: any) => x.month).join() === "2026-08,2026-09", v.unpaid);
console.log("③ 기한 지난 코드 · codes 없음");
store.wash_viewcode.find((x: any) => x.code === c8).to_phones = [];
store.wash_viewcode.find((x: any) => x.code === c8).expires_at = new Date(Date.now() - 1000).toISOString();
await call("sendMsg", [JSON.stringify({ to: "01099990000", from: "x", kind: "ATA", ataKey: "bill", variables: VARS, codes: [c8] })], OWN, "BT");
check("기한 지난 코드엔 안 남김", !tp(c8).length, tp(c8));
await call("sendMsg", [JSON.stringify({ to: "01088887777", from: "x", kind: "ATA", ataKey: "bill", variables: VARS })], OWN, "BT");
check("codes 없으면 예전처럼 최근 달만", tp(c10).includes("01088887777") && !tp(c9).includes("01088887777"), [tp(c10), tp(c9)]);
check("판 sb27", JSON.stringify(await call("apiVer", [], OWN, "BT")).includes("sb27"));

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
