// 워시 sb16 시험 — 비밀값 ANTHROPIC_MODEL 을 점으로 적어도(claude-haiku-5.5) 하이픈으로 고쳐 부름 (10/17 시험에서 찾은 404)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/번호판_모델이름_sb16_시험.ts
import { store } from "./fake_supabase_wash.ts";
Deno.env.set("SUPABASE_URL", "http://fake.local"); Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("ANTHROPIC_KEY", "k"); Deno.env.set("ANTHROPIC_MODEL", "claude-haiku-5.5");
const far = new Date(Date.now() + 864e5).toISOString();
const OWN = "c".repeat(48);
Object.assign(store, { wash_hq: [{ id: 1 }], wash_shops: [{ shop: "BT", name: "브라더세차", active: true, plan: "pro", paid_until: far.slice(0, 10) }],
  wash_sessions: [{ sid: OWN, phone: "01077778888", shop: "BT", role: "owner", expires_at: far }], wash_users: [], wash_docs: [], cgg_access: [] });
let model = "";
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  if (String(url).includes("anthropic")) { model = JSON.parse(String(init?.body)).model; return Response.json({ content: [{ text: '{"plate":"12가3456"}' }] }); }
  return Response.json({});
}) as typeof fetch;
console.error = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(Deno.env.get("WASH_SRC") ?? "../1_차곳간워시_서버_wash-api_sb16.ts");
const r = await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop: "BT", token: OWN, fn: "aiJson", args: ["번호판", "AAAA"] }) }))).json();
const ok = model === "claude-haiku-5-5" && /12가3456/.test(String(r.result));
console.log((ok ? "  ✅" : "  ❌") + " 점 표기 모델 이름을 하이픈으로 고쳐 부름", model, r);
console.log(`\n결과: ${ok ? 1 : 0}개 통과, ${ok ? 0 : 1}개 실패`);
if (!ok) Deno.exit(1);
