// 딜러앱 서버 d9 시험 — 설계 21: myBills 가 열 때마다 장부로 입금 상태를 셈 (모양 그대로 + paidAt)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_dealer.json 서버/시험/청구서_입금상태_딜러_d9_시험.ts
import { store } from "./fake_supabase_dealer.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "fake"); Deno.env.set("SOLAPI_SECRET", "fake");
const far = new Date(Date.now() + 864e5).toISOString();
const A = "01020000001", SA = "a".repeat(48);
const doc = (shop: string, id: string, d: any, demo = false) => ({ shop, demo, col: "intakes", id, data: d });
const snap = (o: any) => Object.assign({ month: "2026-09", unit: "dealer", name: "김딜러", cars: 2, base: 300000, amount: 330000, paid: 0, due: 330000,
  bank: "국민 123-456", rows: [{ id: "i1", plate: "a", total: 100000 }, { id: "i2", plate: "b", total: 200000 }] }, o);
Object.assign(store, {
  dealer_otp: [] as any[], dealer_users: [{ phone: A, active: true }] as any[],
  dealer_sessions: [{ sid: SA, phone: A, expires_at: far, last_seen: new Date().toISOString() }] as any[],
  dealer_agreements: [] as any[], dealer_done: [] as any[], wash_rate: [] as any[],
  wash_shops: [{ shop: "BT", name: "브라더세차", active: true }, { shop: "OT", name: "다른세차", active: true }] as any[],
  wash_docs: [
    doc("BT", "i1", { dealer: "김딜러", total: 100000, status: "출고", memo: "비밀메모" }),
    doc("BT", "i2", { dealer: "김딜러", total: 200000, status: "수금완료", paidAt: "2026-10-05T01:00:00Z" }),
    doc("OT", "i1", { dealer: "김딜러", total: 100000, status: "수금완료", paidAt: "2026-10-09T01:00:00Z" }),   // 같은 id · 남의 업체
  ] as any[],
  wash_viewcode: [
    { code: "A".repeat(24), shop: "BT", kind: "bill", expires_at: far, to_phones: [A], data: snap({}), created_at: "2026-10-03" },
    { code: "B".repeat(24), shop: "BT", kind: "bill", expires_at: far, to_phones: [A], created_at: "2026-10-02",
      data: snap({ month: "2026-08", amount: 110000, base: 100000, paid: 110000, due: 0, rows: [{ plate: "옛", total: 100000 }] }) },   // id 없는 옛 청구서
  ] as any[],
});
globalThis.fetch = (async () => Response.json({})) as typeof fetch;
console.error = () => {};
const H: ((r: Request) => Promise<Response>)[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(Deno.env.get("DEALER_SRC") || new URL("../3_딜러앱_서버_dealer-api_d9.ts", import.meta.url).href);
const [api] = H;
const call = async (fn: string, args: unknown[] = [], token = "") =>
  await (await api(new Request("http://x", { method: "POST", body: JSON.stringify({ token, fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const KEYS = "shop,month,name,cars,amount,due,dueDate,bank,state,url,until,paidAt";
const one = async (c: string) => ((await call("myBills", [], SA)).result?.list ?? []).find((x: any) => x.url.endsWith(c.repeat(24)));
check("ping 이 d9", (await call("ping")).result?.ver === "d9");
await call("agree", [false], SA);
let x = await one("A");
check("목록 모양 그대로 + paidAt", Object.keys(x ?? {}).join(",") === KEYS, x && Object.keys(x));
check("일부 입금: state 「입금 전」 · due = 남은 110,000 · paidAt 빈칸", x?.state === "입금 전" && x?.due === 110000 && x?.amount === 330000 && x?.paidAt === "", x);
check("남의 업체 같은 id(OT/i1) 장부는 안 읽음", x?.due === 110000);
check("메모 같은 일감 칸은 안 보냄", !JSON.stringify(await call("myBills", [], SA)).includes("비밀메모"));
store.wash_docs[0].data.status = "수금완료"; store.wash_docs[0].data.paidAt = "2026-10-16T02:00:00Z";
x = await one("A");
check("업체가 수금 완료로 바꾸면 바로 「입금 확인됨」 · due 0", x?.state === "입금 확인됨" && x?.due === 0, x);
check("paidAt = 줄 일감 가운데 가장 늦은 날", x?.paidAt === "2026-10-16T02:00:00Z", x);
store.wash_docs[0].data.status = "출고";
x = await one("A");
check("수금 되돌리기도 바로 반영", x?.state === "입금 전" && x?.due === 110000 && x?.paidAt === "", x);
store.wash_docs[1].demo = true;
x = await one("A");
check("예시(demo)가 된 일감은 안 읽음 → 찍어 둔 값 (남은 330,000)", x?.state === "입금 전" && x?.due === 330000, x);
store.wash_docs[1].demo = false;
x = await one("B");
check("id 없는 옛 청구서는 찍어 둔 값 그대로 (입금 확인됨 · paidAt 빈칸)", x?.state === "입금 확인됨" && x?.due === 0 && x?.paidAt === "", x);
check("로그인 안 하면 못 봄", !!(await call("myBills", [], "")).__err);
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
