// 체크 서버 v43 시험 — 맞출 때 서버가 «미분류 → 검사비» 로 바꾼 갈래는 되돌리면 «미분류» 로 · 사람이 고른 갈래는 그대로 · SQL 16 전에도 돌아감
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v43_되돌리면_갈래_시험.ts
import { store } from "./fake_supabase_check.ts";
Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v43.ts";
const day = new Date(Date.now() + 86400000).toISOString();
const ago = (h: number) => new Date(Date.now() - h * 3600e3).toISOString();
const dep = (id: string, sender: string, kind: string) => ({ id, office_id: "o1", sender, amount: 10000, tx_at: ago(2), state: "확인 대기", invoice_id: null, kind, src: "팝빌", uniq_key: "u|" + id });
Object.assign(store, {
  __sql13: true,
  check_office: [{ id: "o1", code: "TEST", name: "시험검사소" }],
  check_user: [{ id: "u1", office_id: "o1", phone: "01011110000", name: "대표", role: "owner", active: true, pw_hash: "x" }],
  check_session: [{ sid: "chk_own", phone: "01011110000", office_id: "o1", role: "owner", expires_at: day }],
  check_log: [], cgg_access: [], wash_sessions: [], check_rate: [], cgg_sendlog: [], wash_hq: [{ id: 1 }],
  check_dealer: [{ id: "d1", office_id: "o1", name: "홍딜러", active: true }],
  check_invoice: [{ id: "v1", office_id: "o1", ym: "2026-09", bill_to_id: "d1", bill_to_name: "홍딜러", members: [], company_name: "", total_amount: 1000000, paid_amount: 0, state: "보냄" }],
  check_deposit: [dep("p1", "김손님", "미분류"), dep("p2", "이손님", "정비비"), dep("p3", "박손님", "미분류"), dep("p4", "홍딜러", "미분류"), dep("p5", "최손님", "미분류")],
});
globalThis.fetch = (async () => Response.json({})) as typeof fetch;
console.error = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(SRC);
const call = async (fn: string, args: unknown[] = []) =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop: "", token: "chk_own", fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const P = (id: string) => store.check_deposit.find((d: any) => d.id === id);
await call("depositApply", [{ ids: ["p1", "p2"], invoiceId: "v1" }]);
check("맞추면 미분류 → 검사비 · 정비비는 그대로", P("p1").kind === "검사비" && P("p2").kind === "정비비", [P("p1"), P("p2")]);
await call("depositUnapply", [{ ids: ["p1", "p2"] }]);
check("되돌리면 서버가 바꾼 것만 «미분류» 로 · 정비비는 그대로", P("p1").kind === "미분류" && P("p2").kind === "정비비" && P("p1").kind_auto === false, [P("p1"), P("p2")]);
await call("depositKind", [{ ids: ["p3"], kind: "검사비" }]);
await call("depositApply", [{ ids: ["p3"], invoiceId: "v1" }]);
await call("depositUnapply", [{ ids: ["p3"] }]);
check("사람이 «검사비» 로 고른 뒤 맞추고 되돌리면 «검사비» 그대로", P("p3").kind === "검사비", P("p3"));
await call("depositMatch");
check("자동 맞추기도 미분류 → 검사비", P("p4").state === "자동 반영" && P("p4").kind === "검사비", P("p4"));
await call("depositUnapply", [{ ids: ["p4"] }]);
check("자동으로 맞춘 것을 되돌려도 «미분류» 로", P("p4").kind === "미분류" && P("p4").state === "확인 대기", P("p4"));
await call("depositApply", [{ ids: ["p1"], invoiceId: "v1" }]);
await call("depositKind", [{ ids: ["p1"], kind: "정비비" }]);
await call("depositUnapply", [{ ids: ["p1"] }]);
check("맞춘 뒤 사람이 갈래를 바꾸면 되돌려도 그 갈래", P("p1").kind === "정비비", P("p1"));
store.__noKindAuto = true;
let r = await call("depositApply", [{ ids: ["p5"], invoiceId: "v1" }]);
const r2 = await call("depositUnapply", [{ ids: ["p5"] }]);
check("SQL 16 전: 맞추기·되돌리기는 그대로 됨(갈래는 «검사비» 로 남음 — 예전과 같음)", r.result?.n === 1 && r2.result?.n === 1 && P("p5").state === "확인 대기" && P("p5").kind === "검사비", [r, r2, P("p5")]);
check("금액은 다 되돌려져 0원", store.check_invoice[0].paid_amount === 0, store.check_invoice[0]);
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
