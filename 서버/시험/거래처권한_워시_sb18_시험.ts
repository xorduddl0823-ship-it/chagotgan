// 워시 sb18 시험 — 거래처(companies·dealers): 직원은 새로 넣기만 · 고치기·지우기는 매니저 이상 (보안 낮음)
// (가짜 수파베이스는 wash_write 를 저장하지 않아서, 됨/거절 답으로만 봐요)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/거래처권한_워시_sb18_시험.ts
import { store } from "./fake_supabase_wash.ts";
Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
const far = new Date(Date.now() + 864e5).toISOString();
const OWN = "c".repeat(48), MGR = "m".repeat(48), STF = "d".repeat(48);
Object.assign(store, {
  wash_hq: [{ id: 1 }], cgg_access: [], wash_viewcode: [],
  wash_shops: [{ shop: "BT", name: "브라더세차", active: true, plan: "pro", paid_until: far.slice(0, 10) }],
  wash_sessions: [{ sid: OWN, phone: "01077778888", shop: "BT", role: "owner", expires_at: far },
                  { sid: MGR, phone: "01055556666", shop: "BT", role: "manager", expires_at: far },
                  { sid: STF, phone: "01033334444", shop: "BT", role: "staff", expires_at: far }],
  wash_users: [{ phone: "01055556666", shop: "BT", role: "manager", active: true }, { phone: "01033334444", shop: "BT", role: "staff", active: true }],
  wash_docs: [{ shop: "BT", demo: false, col: "dealers", id: "d1", data: { id: "d1", name: "홍딜러", phone: "01011112222" } },
              { shop: "BT", demo: false, col: "companies", id: "c1", data: { id: "c1", name: "가나상사" } }],
});
globalThis.fetch = (async () => Response.json({})) as typeof fetch;
console.error = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(Deno.env.get("WASH_SRC") ?? "../1_차곳간워시_서버_wash-api_sb18.ts");
const call = async (fn: string, args: unknown[], token: string) =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop: "BT", token, fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const doc = (col: string, id: string) => store.wash_docs.find((d: any) => d.col === col && d.id === id && !d.demo);
check("직원: 새 딜러 넣기는 됨(입고 중 새 딜러)", !(await call("apiSet", ["dealers", "d2", { id: "d2", name: "새딜러" }, false], STF)).__err);
check("직원: 있는 딜러 고치기는 거절", !!(await call("apiSet", ["dealers", "d1", { id: "d1", name: "바꿈" }, false], STF)).__err && doc("dealers", "d1")?.data?.name === "홍딜러");
check("직원: 딜러 지우기는 거절", !!(await call("apiDel", ["dealers", "d1", false], STF)).__err && !!doc("dealers", "d1"));
check("직원: 여러 줄에 있는 상사가 섞여도 거절", !!(await call("apiSetMany", [[{ col: "companies", id: "c2", data: { id: "c2" } }, { col: "companies", id: "c1", data: { id: "c1", name: "x" } }], false], STF)).__err);
check("직원: 시연 자료는 막지 않음", !(await call("apiSet", ["dealers", "d1", { id: "d1", name: "시연" }, true], STF)).__err);
check("매니저: 고치기 됨", !(await call("apiSet", ["dealers", "d1", { id: "d1", name: "매니저고침" }, false], MGR)).__err);
check("대표: 지우기 됨", !(await call("apiDel", ["companies", "c1", false], OWN)).__err);
check("직원: 입고 같은 다른 표는 그대로", !(await call("apiSet", ["memos", "m1", { id: "m1", text: "x" }, false], STF)).__err);
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
