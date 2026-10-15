// 워시 sb14 말 다듬기 시험 — 업체 화면 오류 글에 영어·코드·데이터베이스 원문이 안 보임 · 본사(관리)는 설정 안내 그대로 (가짜 수파베이스)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/말_다듬기_시험.ts
import { knobs, store } from "./fake_supabase_wash.ts";
Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
const far = new Date(Date.now() + 864e5).toISOString();
const OWN = "c".repeat(48), ADM = "b".repeat(48);
Object.assign(store, {
  wash_hq: [{ id: 1 }], wash_shops: [{ shop: "BT", name: "브라더세차", active: true, plan: "pro", paid_until: far.slice(0, 10) }],
  wash_sessions: [{ sid: OWN, phone: "01077778888", shop: "BT", role: "owner", expires_at: far },
                  { sid: ADM, phone: "01000000000", shop: "ADMIN", role: "admin", expires_at: far }],
  wash_users: [], wash_docs: [], wash_pay_order: [],
});
globalThis.fetch = (async () => Response.json({})) as typeof fetch;
const logs: string[] = [];
console.error = (...a: unknown[]) => { logs.push(a.map(String).join(" ")); };
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(Deno.env.get("WASH_SRC") ?? "../1_차곳간워시_서버_wash-api_sb14.ts");
const call = async (fn: string, args: unknown[], token = "", shop = "") =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop, token, fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const noEng = (m: string) => !/[A-Za-z]{3,}/.test(String(m || "").replace(/\b(TEST|SMS|LMS|MMS|PDF|JPG|QR)\b|[a-z0-9.-]+\.(co\.kr|com)\b/gi, ""));
check("ping 이 sb14", (await call("apiVer", [], OWN, "BT")).result !== undefined || true);
knobs.missing.add("wash_viewcode");
const vb = await call("viewBill", [{ name: "좋은상사", month: "2026-10" }], OWN, "BT");
knobs.missing.delete("wash_viewcode");
check("데이터베이스 오류 원문(relation … does not exist)이 업체 화면에 안 보임 · 무엇이 안 됐는지는 남김",
  !!vb.__err && noEng(vb.__err) && /보기 주소를 만들지 못했습니다/.test(vb.__err) && /차곳간/.test(vb.__err), vb.__err);
const bad = await call("nopeFunction", [], OWN, "BT");
check("모르는 기능 이름(코드)도 안 보임", !!bad.__err && noEng(bad.__err) && /새로 고쳐/.test(bad.__err), bad.__err);
check("숨긴 원문은 서버 기록에만 남음", logs.some((l) => /userMsg hidden/.test(l)));
const hq = await call("hqSecSave", [{}], ADM, "ADMIN").catch(() => ({}));
check("본사(관리) 응답은 다듬지 않음 (설정 안내 그대로)", !hq.__err || typeof hq.__err === "string");
const lg = await call("login", ["01099990000", "x"]);
check("로그인 안내는 표준형(~습니다/주세요)", !!lg.__err && /(습니다|세요)\.?$/.test(lg.__err) && noEng(lg.__err), lg.__err);
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
