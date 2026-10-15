// 딜러앱 서버 d5 알림톡 먼저 시험 — 인증번호(sendCode)는 차곳간_인증번호 알림톡 먼저, 안 되면 문자 (가짜 수파베이스 · 가짜 솔라피)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_dealer.json 서버/시험/알림톡_딜러_시험.ts
// DEALER_SRC 에 옛 판(d4)을 넣으면 실패가 나와야 합니다.
import { store } from "./fake_supabase_dealer.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "fake"); Deno.env.set("SOLAPI_SECRET", "fake");
Deno.env.set("SMS_FROM", "0212345678");

let shift = 0;
const realNow = Date.now;
Date.now = () => realNow() + shift;

Object.assign(store, {
  dealer_otp: [] as any[], dealer_users: [] as any[], dealer_sessions: [] as any[],
  dealer_agreements: [] as any[], dealer_done: [] as any[], wash_shops: [] as any[], wash_docs: [] as any[],
  wash_rate: [] as any[], wash_hq: [{ id: 1, ata_cfg: {} }] as any[],
});

let mode: "ok" | "failed" | "http" | "throw" = "ok";
const sent: any[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  if (!String(url).includes("solapi")) throw new Error("예상 못 한 주소 " + url);
  const m = JSON.parse(String(init?.body)).messages[0];
  sent.push(m);
  if (m.kakaoOptions) {
    if (mode === "failed") return Response.json({ failedMessageList: [{ statusCode: "3104" }] });
    if (mode === "http") return new Response("{}", { status: 500 });
    if (mode === "throw") throw new Error("연결 끊김");
  }
  return Response.json({});
}) as typeof fetch;
console.error = () => {};

const H: ((r: Request) => Promise<Response>)[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(Deno.env.get("DEALER_SRC") || new URL("../3_딜러앱_서버_dealer-api_d5.ts", import.meta.url).href);
const [api] = H;
let ipN = 0;
async function call(fn: string, args: unknown[] = []) {
  const r = await api(new Request("http://x", { method: "POST", headers: { "x-forwarded-for": "10.1.0." + (++ipN) },
    body: JSON.stringify({ token: "", fn, args }) }));
  return await r.json();
}
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const setCfg = (c: any) => { store.wash_hq[0].ata_cfg = c; shift += 61000; };
let pn = 0;
const phone = () => "0105555" + String(++pn).padStart(4, "0");

console.log("① 버전");
check("ping 이 d5 이상", /^d[5-9]$/.test((await call("ping")).result?.ver ?? ""));

console.log("② 템플릿이 없으면 문자");
setCfg({});
sent.length = 0;
let p = phone();
let r = await call("sendCode", [p]);
check("문자 1번 · 알림톡 아님", !r.__err && sent.length === 1 && !sent[0].kakaoOptions, { r, sent });

console.log("③ 인증번호 템플릿 + 채널이 있으면 알림톡 먼저");
setCfg({ pfId: "PF_CFG", tpl: { auth: "KA_AUTH" } });
sent.length = 0;
p = phone();
r = await call("sendCode", [p]);
const k = sent[0]?.kakaoOptions ?? {};
const code = String(k.variables?.["#{인증번호}"] ?? "");
check("알림톡 1번만", !r.__err && sent.length === 1, { r, n: sent.length });
check("템플릿 auth · 채널 pfId · 대신 보내기 켜짐", k.templateId === "KA_AUTH" && k.pfId === "PF_CFG" && k.disableSms === false, k);
check("변수: 6자리 인증번호 · 유효시간", /^\d{6}$/.test(code) && /^\d+$/.test(String(k.variables?.["#{유효시간}"])), k.variables);
check("대신 보낼 문자 글에도 같은 번호", String(sent[0]?.text ?? "").includes(code));
check("그 번호로 확인됨", !(await call("verifyCode", [p, code])).__err);

console.log("④ 알림톡이 거절되면 문자로");
for (const md of ["failed", "http", "throw"] as const) {
  mode = md; sent.length = 0; p = phone();
  r = await call("sendCode", [p]);
  const c2 = (String(sent[1]?.text ?? "").match(/\d{6}/) ?? [""])[0];
  check(`${md}: 알림톡 시도 뒤 문자 · 오류 없음`, !r.__err && sent.length === 2 && !!sent[0].kakaoOptions && !sent[1].kakaoOptions, { r, n: sent.length });
  check(`${md}: 문자 번호로 확인됨`, !(await call("verifyCode", [p, c2])).__err);
}
mode = "ok";

console.log("⑤ 채널이 없으면 문자 · PF_ID 비밀값도 씀");
setCfg({ tpl: { auth: "KA_AUTH" } });
sent.length = 0;
r = await call("sendCode", [phone()]);
check("채널 없음 → 문자만", sent.length === 1 && !sent[0].kakaoOptions, sent);
Deno.env.set("PF_ID", "PF_ENV");
setCfg({ tpl: { auth: "KA_AUTH" } });
sent.length = 0;
r = await call("sendCode", [phone()]);
check("PF_ID 비밀값을 채널로", sent[0]?.kakaoOptions?.pfId === "PF_ENV", sent[0]?.kakaoOptions);

console.log(`\n결과: ${pass} 통과 / ${fail} 실패`);
if (fail) Deno.exit(1);
