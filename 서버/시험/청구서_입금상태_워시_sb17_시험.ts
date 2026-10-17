// 워시 sb17 시험 — 설계 21: viewBill 이 줄마다 일감 id 를 (확인한 것만) 남기고, 청구서 보기가 열 때마다 장부로 입금 상태를 셈
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/청구서_입금상태_워시_sb17_시험.ts
import { store } from "./fake_supabase_wash.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
const far = new Date(Date.now() + 864e5).toISOString();
const OWN = "c".repeat(48), STAFF = "d".repeat(48);
const doc = (shop: string, id: string, d: any, demo = false) => ({ shop, demo, col: "intakes", id, data: d });
Object.assign(store, {
  wash_hq: [{ id: 1 }], cgg_access: [], wash_viewcode: [] as any[],
  wash_shops: [{ shop: "BT", name: "브라더세차", active: true, plan: "pro", paid_until: far.slice(0, 10), trial_until: far },
               { shop: "OT", name: "다른세차", active: true, plan: "pro", paid_until: far.slice(0, 10) }],
  wash_sessions: [{ sid: OWN, phone: "01077778888", shop: "BT", role: "owner", expires_at: far },
                  { sid: STAFF, phone: "01011110000", shop: "BT", role: "staff", expires_at: far }],
  wash_users: [],
  wash_docs: [
    doc("BT", "i1", { plate: "11가1111", dealer: "김딜러", company: "가상사", createdAt: "2026-09-10T03:00:00Z", total: 100000, status: "출고", memo: "비밀메모", phone: "01055556666" }),
    doc("BT", "i2", { plate: "22가2222", dealer: "김딜러", company: "가상사", createdAt: "2026-09-12T03:00:00Z", total: 200000, status: "수금완료", paidAt: "2026-10-05T01:00:00Z" }),
    doc("BT", "x1", { plate: "33가3333", dealer: "박딜러", company: "가상사", createdAt: "2026-09-12T03:00:00Z", total: 50000, status: "수금완료" }),
    doc("BT", "i3", { plate: "44가4444", dealer: "김딜러", createdAt: "2026-08-20T03:00:00Z", total: 70000, status: "수금완료" }),
    doc("BT", "dm", { plate: "55가5555", dealer: "김딜러", createdAt: "2026-09-12T03:00:00Z", total: 1, status: "수금완료" }, true),
    doc("OT", "o1", { plate: "66가6666", dealer: "김딜러", createdAt: "2026-09-12T03:00:00Z", total: 1, status: "수금완료" }),
    /* 한국 시간으로는 10월 1일 새벽(UTC 9월 30일) — 화면처럼 10월로 봄 */
    doc("BT", "k1", { plate: "77가7777", dealer: "김딜러", createdAt: "2026-09-30T16:00:00Z", total: 10000, status: "출고" }),
  ],
});
globalThis.fetch = (async () => Response.json({})) as typeof fetch;
console.error = () => {}; console.warn = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(Deno.env.get("WASH_SRC") ?? "../1_차곳간워시_서버_wash-api_sb17.ts");
const call = async (fn: string, args: unknown[], token = "", shop = "") =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop, token, fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const row = (id: any, plate: string, total: number) => ({ id, plate, total, works: ["광택"] });
const bill = (name: string, rows: any[], o: any = {}) => JSON.stringify(Object.assign({ month: "2026-09", unit: "dealer", name, cars: rows.length,
  base: 300000, supply: 300000, vat: 30000, amount: 330000, paid: 0, due: 330000, taxOn: true, rows }, o));
const vcOf = (code: string) => store.wash_viewcode.find((v: any) => v.code === code);

console.log("① viewBill — 확인한 id 만 남김");
{ const pg = await call("apiVer", [], OWN, "BT"); check("ping 이 sb17", JSON.stringify(pg).includes("sb17"), pg); }
const r1 = await call("viewBill", [bill("김딜러", [row("i1", "11가1111", 100000), row("i2", "22가2222", 200000), row("x1", "33가3333", 50000),
  row("i3", "44가4444", 70000), row("dm", "55가5555", 1), row("o1", "66가6666", 1), row("i2", "22가2222", 200000), row("bad id!", "x", 1), row("nope", "x", 1)])], OWN, "BT");
const s1 = vcOf(String(r1.result?.code ?? ""))?.data;
const kept = (s1?.rows ?? []).map((r: any) => r.id);
check("주소가 만들어짐", !!r1.result?.url, r1);
check("이 업체·김딜러·9월 일감(i1·i2)만 남음", JSON.stringify(kept) === JSON.stringify(["i1", "i2", "", "", "", "", "", "", ""]), kept);
check("다른 딜러(x1) · 다른 달(i3) · 예시(dm) · 남의 업체(o1) · 중복 · 이상한 글자 · 없는 id 는 버림", kept.filter(Boolean).length === 2);
check("직원은 viewBill 못 함", !!(await call("viewBill", [bill("김딜러", [row("i1", "a", 1)])], STAFF, "BT")).__err);
const rk = await call("viewBill", [bill("김딜러", [row("k1", "77가7777", 10000)], { month: "2026-10", base: 10000, amount: 11000 })], OWN, "BT");
check("달은 한국 시간으로 셈 (UTC 9/30 16시 = 10월)", vcOf(rk.result?.code)?.data?.rows?.[0]?.id === "k1", vcOf(rk.result?.code)?.data);
const rc = await call("viewBill", [JSON.stringify({ month: "2026-09", unit: "company", name: "가상사", base: 350000, amount: 385000, rows: [row("i1", "a", 100000), row("x1", "b", 50000), row("i3", "c", 70000)] })], OWN, "BT");
check("상사 단위 청구서는 상사 이름으로 맞춤 (i1·x1 · 8월 i3 은 버림)", JSON.stringify(vcOf(rc.result?.code)?.data?.rows?.map((r: any) => r.id)) === '["i1","x1",""]');

console.log("② 청구서 보기 — 열 때마다 장부로 셈");
const r2 = await call("viewBill", [bill("김딜러", [row("i1", "11가1111", 100000), row("i2", "22가2222", 200000)])], OWN, "BT");
const code = String(r2.result?.code ?? "");
check("같은 청구서는 같은 주소 (내용만 새로)", code === r1.result?.code);
let v = await call("viewCar", [code]);
let b = v.result?.bill ?? {};
check("일부 입금: 입금 220,000(부가세 포함) · 남은 110,000", b.live === true && b.paid === 220000 && b.due === 110000, b);
check("줄마다 입금 여부만 더함 (i1 아직 · i2 입금)", b.rows?.[0]?.paid === false && b.rows?.[1]?.paid === true, b.rows);
check("일감 id · 메모 · 전화는 내보내지 않음", !JSON.stringify(v).includes('"id"') && !JSON.stringify(v).includes("비밀메모") && !JSON.stringify(v).includes("01055556666"));
check("다 들어오기 전 paidAt 은 빈칸", b.paidAt === "", b.paidAt);
store.wash_docs.find((d: any) => d.id === "i1").data = Object.assign(store.wash_docs.find((d: any) => d.id === "i1").data, { status: "수금완료", paidAt: "2026-10-16T02:00:00Z" });
b = (await call("viewCar", [code])).result?.bill ?? {};
check("업체가 수금 완료로 바꾸면 바로: 입금 330,000 · 남은 0", b.paid === 330000 && b.due === 0, b);
check("paidAt = 줄 일감 paidAt 가운데 가장 늦은 날", b.paidAt === "2026-10-16T02:00:00Z", b.paidAt);
store.wash_docs.find((d: any) => d.id === "i1").data.status = "출고";
b = (await call("viewCar", [code])).result?.bill ?? {};
check("수금 되돌리기도 바로 반영 (남은 110,000)", b.due === 110000, b);
const i2 = store.wash_docs.find((d: any) => d.id === "i2");
store.wash_docs = store.wash_docs.filter((d: any) => d !== i2);
b = (await call("viewCar", [code])).result?.bill ?? {};
check("지워진 일감이 있으면 찍어 둔 값 그대로 (입금 0 · 남은 330,000)", !b.live && b.paid === 0 && b.due === 330000, b);
store.wash_docs.push(i2);
i2.demo = true;
b = (await call("viewCar", [code])).result?.bill ?? {};
check("읽을 때도 예시(demo) 일감은 안 읽음 → 찍어 둔 값", !b.live && b.due === 330000, b);
i2.demo = false;
/* 옛 청구서(줄에 id 없음) */
store.wash_viewcode.push({ code: "ABCDEF0123456789ABCDEF99", shop: "BT", rec_id: "bill:old", kind: "bill", expires_at: far,
  data: { month: "2026-08", name: "김딜러", amount: 110000, paid: 110000, due: 0, rows: [{ plate: "a", total: 100000 }] } });
b = (await call("viewCar", ["ABCDEF0123456789ABCDEF99"])).result?.bill ?? {};
check("id 없는 옛 청구서는 찍어 둔 값 그대로", !b.live && b.paid === 110000 && b.due === 0 && b.rows?.[0]?.paid === undefined, b);
/* 부가세 없는 청구서 */
const r3 = await call("viewBill", [bill("김딜러", [row("i1", "a", 100000), row("i2", "b", 200000)], { month: "2026-09", unit: "dealer", base: 300000, amount: 300000, taxOn: false, name: "김딜러" })], OWN, "BT");
b = (await call("viewCar", [String(r3.result?.code)])).result?.bill ?? {};
check("부가세 없는 청구서: 입금 200,000 · 남은 100,000", b.paid === 200000 && b.due === 100000, b);

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
