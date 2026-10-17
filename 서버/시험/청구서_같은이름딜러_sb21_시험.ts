// 워시 sb21 시험 — 딜러 단위 청구서 보기 주소: 다른 상사의 같은 이름 딜러가 서로 덮어쓰지 않음 (워시 요청 · 개인정보)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/청구서_같은이름딜러_sb21_시험.ts
import { store } from "./fake_supabase_wash.ts";
Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
const far = new Date(Date.now() + 864e5).toISOString();
const OWN = "c".repeat(48);
const doc = (id: string, d: any) => ({ shop: "BT", demo: false, col: "intakes", id, data: d });
Object.assign(store, {
  wash_hq: [{ id: 1 }], cgg_access: [], wash_viewcode: [] as any[],
  wash_shops: [{ shop: "BT", name: "브라더세차", active: true, plan: "pro", paid_until: far.slice(0, 10), trial_until: far }],
  wash_sessions: [{ sid: OWN, phone: "01077778888", shop: "BT", role: "owner", expires_at: far }], wash_users: [],
  wash_docs: [
    doc("a1", { plate: "11가1111", dealer: "박딜러", company: "샘플모터스", createdAt: "2026-09-10T03:00:00Z", total: 100000, status: "출고" }),
    doc("b1", { plate: "22나2222", dealer: "박딜러", company: "다른상사", createdAt: "2026-09-11T03:00:00Z", total: 70000, status: "출고" }),
    doc("n1", { plate: "33다3333", dealer: "박딜러", createdAt: "2026-09-12T03:00:00Z", total: 5000, status: "출고" }),
  ],
});
globalThis.fetch = (async () => Response.json({})) as typeof fetch;
console.error = () => {}; console.warn = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(Deno.env.get("WASH_SRC") ?? "../1_차곳간워시_서버_wash-api_sb21.ts");
const call = async (fn: string, args: unknown[], token = OWN, shop = "BT") =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop, token, fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const bill = (o: any) => JSON.stringify(Object.assign({ month: "2026-09", unit: "dealer", name: "박딜러", base: 1, amount: 1, rows: [] }, o));
const vc = (code: string) => store.wash_viewcode.find((v: any) => v.code === code);

const ra = await call("viewBill", [bill({ company: "샘플모터스", amount: 110000, rows: [{ id: "a1", plate: "11가1111", total: 100000 }, { id: "b1", plate: "22나2222", total: 70000 }] })]);
const rb = await call("viewBill", [bill({ company: "다른상사", amount: 77000, rows: [{ id: "b1", plate: "22나2222", total: 70000 }] })]);
check("상사가 다르면 다른 주소", !!ra.result?.code && !!rb.result?.code && ra.result.code !== rb.result.code, [ra, rb]);
check("먼저 보낸 샘플모터스 박딜러 청구서가 덮이지 않음", vc(ra.result.code)?.data?.company === "샘플모터스" && vc(ra.result.code)?.data?.amount === 110000, vc(ra.result.code)?.data);
check("열쇠는 «달|dealer|이름|상사»", vc(ra.result.code)?.rec_id === "bill:2026-09|dealer|박딜러|샘플모터스" && vc(rb.result.code)?.rec_id === "bill:2026-09|dealer|박딜러|다른상사");
check("일감 id 도 상사가 맞는 것만 (다른상사 b1 은 샘플모터스 청구서에서 뺌)", JSON.stringify(vc(ra.result.code)?.data?.rows?.map((r: any) => r.id)) === '["a1",""]', vc(ra.result.code)?.data?.rows);
const ra2 = await call("viewBill", [bill({ company: " 샘플모터스 ", amount: 120000, rows: [{ id: "a1", plate: "11가1111", total: 100000 }] })]);
check("같은 딜러가 다시 보내면 같은 주소 · 내용만 새로", ra2.result?.code === ra.result.code && vc(ra.result.code)?.data?.amount === 120000 && vc(rb.result.code)?.data?.amount === 77000, ra2);
const rn = await call("viewBill", [bill({ company: "(상사명 없음)", rows: [{ id: "n1", plate: "33다3333", total: 5000 }, { id: "a1", plate: "x", total: 1 }] })]);
const rn2 = await call("viewBill", [bill({ company: "", rows: [{ id: "n1", plate: "33다3333", total: 5000 }] })]);
check("상사 없음은 «(상사명 없음)» 이든 빈 글자든 같은 주소 · 상사 있는 일감은 뺌", rn.result?.code === rn2.result?.code && rn.result.code !== ra.result.code &&
  JSON.stringify(vc(rn.result.code)?.data?.rows?.map((r: any) => r.id)) === '["n1"]', [rn, rn2, vc(rn.result.code)?.data?.rows]);
const ro = await call("viewBill", [JSON.stringify({ month: "2026-09", unit: "dealer", name: "박딜러", base: 1, amount: 1, rows: [{ id: "a1", plate: "a", total: 1 }, { id: "b1", plate: "b", total: 1 }] })]);
check("상사를 안 보내는 옛 화면은 예전 열쇠 그대로(달|dealer|이름) · 일감 거르기도 예전처럼", vc(ro.result.code)?.rec_id === "bill:2026-09|dealer|박딜러" &&
  JSON.stringify(vc(ro.result.code)?.data?.rows?.map((r: any) => r.id)) === '["a1","b1"]', vc(ro.result.code));
const rc = await call("viewBill", [JSON.stringify({ month: "2026-09", unit: "company", name: "샘플모터스", company: "샘플모터스", base: 1, amount: 1, rows: [{ id: "a1", plate: "a", total: 1 }] })]);
check("상사 단위 열쇠는 그대로(달|company|이름)", vc(rc.result.code)?.rec_id === "bill:2026-09|company|샘플모터스", vc(rc.result.code));
const open = await call("viewCar", [ra.result.code], "", "");
check("보기 주소로 열면 샘플모터스 박딜러 청구서", open.result?.kind === "bill" && open.result?.bill?.company === "샘플모터스" && !JSON.stringify(open).includes("22나2222"), open);
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
