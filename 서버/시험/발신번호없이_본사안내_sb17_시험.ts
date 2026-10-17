// 워시 sb17 시험 — sendMsg: 본사 안내(ataKey)는 업체 발신번호(from)가 비어도 SMS_FROM 으로 (운영/06 I · 워시 v127)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/발신번호없이_본사안내_sb17_시험.ts
import { store } from "./fake_supabase_wash.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s");
Deno.env.set("SMS_FROM", "0212345678");
Deno.env.set("PF_ID", "PF_HQ");
const far = new Date(Date.now() + 864e5).toISOString();
const OWN = "c".repeat(48);
Object.assign(store, {
  wash_hq: [{ id: 1, ata_cfg: { tpl: { staff_link: "TPL_STAFF" } } }],
  wash_shops: [{ shop: "BT", name: "브라더세차", active: true, plan: "pro", paid_until: far.slice(0, 10), owner_phone: "01077778888" }],
  wash_sessions: [{ sid: OWN, phone: "01077778888", shop: "BT", role: "owner", expires_at: far }],
  wash_users: [], wash_plans: [{ code: "pro", name: "프로", price: 50000 }], wash_docs: [], cgg_access: [], wash_viewcode: [],
  wash_sendlog: [], cgg_sendlog: [],
});
const sent: any[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  const u = String(url);
  if (u.includes("/messages/v4/send")) {
    const b = JSON.parse(String(init?.body)); sent.push(b);
    return Response.json({ groupInfo: { _id: "G" + sent.length }, failedMessageList: [], messageList: b.messages.map((_: any, i: number) => ({ messageId: "M" + sent.length + "_" + i })) });
  }
  return Response.json({});
}) as typeof fetch;
console.error = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(Deno.env.get("WASH_SRC") ?? "../1_차곳간워시_서버_wash-api_sb17.ts");
const call = async (fn: string, args: unknown[]) =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop: "BT", token: OWN, fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const send = async (o: any) => { sent.length = 0; const r = await call("sendMsg", [JSON.stringify(Object.assign({ to: "01099998888", type: "시험" }, o))]); return r.result ?? r; };

let r = await send({ kind: "ATA", ataKey: "staff_link", variables: { 직원명: "홍길동" } });
let m = sent[0]?.messages?.[0];
check("from 이 비어도 본사 알림톡(ataKey)은 나감 · via ata", r.ok === true && r.via === "ata" && !!m?.kakaoOptions && m.from === "0212345678", [r, m]);
check("답 모양 {ok,id,groupId,via}", "id" in r && "groupId" in r && "via" in r, r);
store.wash_hq[0].ata_cfg = { tpl: {} };
await new Promise((x) => setTimeout(x, 0));
r = await send({ kind: "ATA", ataKey: "staff_link", variables: { 직원명: "홍길동" } });
m = sent[0]?.messages?.[0];
check("두 번째 본사 안내도 SMS_FROM 으로 나감", r.ok === true && m?.from === "0212345678", [r, m]);
r = await send({ kind: "AUTO", text: "아무 글" });
check("ataKey 없는 일반 문자는 from 이 없으면 거절 (지금처럼)", r.ok === false && /발신번호가 없습니다/.test(String(r.error)) && sent.length === 0, r);
r = await send({ kind: "ATA", text: "가짜 알림톡", variables: { a: 1 } });
check("ataKey 없는 알림톡 요청도 거절", r.ok === false && /발신번호가 없습니다/.test(String(r.error)), r);
r = await send({ kind: "ATA", ataKey: "evil_key", variables: {} });
check("목록에 없는 ataKey 도 거절", r.ok === false && /발신번호가 없습니다/.test(String(r.error)), r);
Deno.env.delete("SMS_FROM");
store.wash_hq[0].ata_cfg = { tpl: { staff_link: "TPL_STAFF" } };
r = await send({ kind: "ATA", ataKey: "staff_link", variables: { 직원명: "홍길동" } });
check("SMS_FROM 도 없으면 지금처럼 거절", r.ok === false && /발신번호가 없습니다/.test(String(r.error)) && sent.length === 0, r);
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
