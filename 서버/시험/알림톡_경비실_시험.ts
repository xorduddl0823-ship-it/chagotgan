// 경비실 cgg-api v1.4 알림톡 먼저 시험 — 문자 확인(two_step) 번호는 차곳간_인증번호 알림톡 먼저, 안 되면 문자 (가짜 수파베이스 · 가짜 솔라피)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map.json 서버/시험/알림톡_경비실_시험.ts
// CGG_SRC 에 옛 판(v1.3)을 넣으면 실패가 나와야 합니다.
import { store } from "./fake_supabase.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "fake"); Deno.env.set("SOLAPI_SECRET", "fake");
Deno.env.set("CGG_SMS_FROM", "0212345678");

const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
async function pwHash(pw: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" }, key, 256);
  return hex(salt) + "$" + hex(new Uint8Array(bits));
}
const PH = "01077778888";
Object.assign(store, {
  wash_sessions: [] as any[], check_session: [] as any[],
  check_office: [{ id: "o1", code: "SOMCAR", name: "솜카검사소" }],
  check_user: [{ id: "u1", office_id: "o1", phone: PH, name: "문자", role: "owner", active: true, pw_hash: await pwHash("two-pw") }],
  cgg_access: [{ phone: PH, name: "문자확인", products: ["check"], active: true, two_step: true, fail_count: 0 }],
  cgg_session: [] as any[], cgg_tick: [] as any[],
  wash_hq: [{ id: 1, ata_cfg: {} }] as any[],
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
await import(Deno.env.get("CGG_SRC") || "../0_차곳간_경비실_cgg-api_v1.ts");
const [cgg] = H;
async function call(fn: string, args: unknown[] = []) {
  const r = await cgg(new Request("http://x", { method: "POST", body: JSON.stringify({ shop: "", token: "", fn, args }) }));
  return await r.json();
}
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
async function login() { sent.length = 0; return await call("cggLogin", [PH, "two-pw"]); }
const ok2 = async (t: any, code: string) => !!(await call("cggLogin2", [t.result?.tick, code])).result?.sid;

console.log("① 버전");
check("ping 이 v1.4", /v1\.4/.test((await call("ping")).result?.ver ?? ""));

console.log("② 템플릿이 없으면 문자");
let t = await login();
check("문자 1번 · 알림톡 아님", !!t.result?.tick && sent.length === 1 && !sent[0].kakaoOptions, { t, sent });

console.log("③ 인증번호 템플릿 + 채널이 있으면 알림톡 먼저");
store.wash_hq[0].ata_cfg = { pfId: "PF_CFG", tpl: { auth: "KA_AUTH" } };
t = await login();
const k = sent[0]?.kakaoOptions ?? {};
const code = String(k.variables?.["#{인증번호}"] ?? "");
check("알림톡 1번만", !!t.result?.tick && sent.length === 1, { t, n: sent.length });
check("템플릿 auth · 채널 pfId · 대신 보내기 켜짐", k.templateId === "KA_AUTH" && k.pfId === "PF_CFG" && k.disableSms === false, k);
check("변수: 6자리 인증번호 · 유효시간 5", /^\d{6}$/.test(code) && k.variables?.["#{유효시간}"] === "5", k.variables);
check("대신 보낼 문자 글에도 같은 번호", String(sent[0]?.text ?? "").includes(code));
check("그 번호로 들어가짐", await ok2(t, code));

console.log("④ 알림톡이 거절되면 문자로");
for (const md of ["failed", "http", "throw"] as const) {
  mode = md;
  t = await login();
  const c2 = (String(sent[1]?.text ?? "").match(/\d{6}/) ?? [""])[0];
  check(`${md}: 알림톡 시도 뒤 문자`, !!t.result?.tick && sent.length === 2 && !!sent[0].kakaoOptions && !sent[1].kakaoOptions, { t, n: sent.length });
  check(`${md}: 문자 번호로 들어가짐`, await ok2(t, c2));
}
mode = "ok";

console.log("⑤ 채널 · 보내는 번호");
store.wash_hq[0].ata_cfg = { tpl: { auth: "KA_AUTH" } };
t = await login();
check("채널 없음 → 문자만", sent.length === 1 && !sent[0].kakaoOptions, sent);
Deno.env.set("PF_ID", "PF_ENV");
t = await login();
check("PF_ID 비밀값을 채널로", sent[0]?.kakaoOptions?.pfId === "PF_ENV", sent[0]?.kakaoOptions);
Deno.env.delete("CGG_SMS_FROM"); Deno.env.set("SMS_FROM", "0233334444");
t = await login();
check("CGG_SMS_FROM 이 없으면 SMS_FROM 으로 보냄", !!t.result?.tick && sent[0]?.from === "0233334444", { t, from: sent[0]?.from });
delete (store as any).wash_hq;
t = await login();
check("설정 표가 없어도 문자로", !!t.result?.tick && sent.length === 1 && !sent[0].kakaoOptions, { t, sent });

console.log(`\n결과: ${pass} 통과 / ${fail} 실패`);
if (fail) Deno.exit(1);
