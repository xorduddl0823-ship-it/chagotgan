// 워시 sb22 시험 — 관리 인증번호(hqLogin 로그인 · hqPhoneStart 본사 번호 바꾸기)를 알림톡 «차곳간_인증번호» 먼저
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/관리인증번호_알림톡_sb22_시험.ts
import { store } from "./fake_supabase_wash.ts";
Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s"); Deno.env.set("SMS_FROM", "0212345678");
const D = 864e5;
const ADM = "b".repeat(48);
async function pwHash(pw: string) {
  const salt = "ab".repeat(16), te = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", te.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: te.encode(salt), iterations: 120000, hash: "SHA-256" }, key, 256);
  return "pbkdf2$120000$" + salt + "$" + [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
Object.assign(store, {
  wash_hq: [{ id: 1, admin_phone: "01011112222", ata_cfg: { pfId: "PF", tpl: { auth: "T_AUTH" } } }],
  wash_users: [{ phone: "01000000000", shop: "ADMIN", name: "본사", role: "admin", active: true, pw_hash: await pwHash("hq-pw-1") }],
  wash_sessions: [{ sid: ADM, phone: "01000000000", shop: "ADMIN", role: "admin", expires_at: new Date(Date.now() + D).toISOString() }],
  wash_hq_otp: [], wash_rate: [], cgg_sendlog: [],
});
const sent: any[] = [];
let ataFail = false;
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  const u = String(url);
  if (u.includes("solapi") && u.includes("/send")) {
    const m = JSON.parse(String(init?.body)).messages[0]; sent.push(m);
    const bad = ataFail && m.kakaoOptions;
    return Response.json({ groupInfo: { _id: "G" }, failedMessageList: bad ? [{ to: m.to, statusCode: "3000" }] : [],
      messageList: bad ? [] : [{ messageId: "M" + sent.length, to: m.to }] });
  }
  return Response.json({});
}) as typeof fetch;
console.error = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
const SRC = Deno.env.get("WASH_SRC") ?? "../1_차곳간워시_서버_wash-api_sb22.ts";
await import(SRC);
const call = async (fn: string, args: unknown[], token = "", shop = "", i = 0) =>
  await (await H[i](new Request("http://x", { method: "POST", body: JSON.stringify({ shop, token, fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") { if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); } }
const last = () => sent[sent.length - 1];

console.log("■ 관리 로그인 인증번호");
let r = await call("hqLogin", ["01000000000", "hq-pw-1"]);
let m = last();
check("로그인 1단계 됨 (표 받음)", r.result?.need2 === true && !!r.result?.tick, r);
check("알림톡으로 나감 (템플릿 T_AUTH · 본사 번호로)", m?.kakaoOptions?.templateId === "T_AUTH" && m.to === "01011112222", m);
check("변수는 #{인증번호} 6자리 · #{유효시간} 5 만", /^\d{6}$/.test(m?.kakaoOptions?.variables?.["#{인증번호}"]) &&
  m.kakaoOptions.variables["#{유효시간}"] === "5" && Object.keys(m.kakaoOptions.variables).length === 2, m?.kakaoOptions);
check("알림톡 실패 시 대체 문구 = 확정본 그대로", m?.text === "[차곳간] 인증번호 " + m?.kakaoOptions?.variables?.["#{인증번호}"] + " (5분 안에 입력)", m?.text);
check("솔라피가 문자로 대신 보내게 둠 (disableSms 꺼짐)", m?.kakaoOptions?.disableSms === false);
check("응답에 인증번호 없음", !JSON.stringify(r).includes(m?.kakaoOptions?.variables?.["#{인증번호}"]), r);
check("발송 기록 tpl = auth", store.cgg_sendlog.some((x: any) => x.tpl === "auth"), store.cgg_sendlog.map((x: any) => x.tpl));

console.log("■ 알림톡 요청이 거절되면 서버가 바로 문자로");
ataFail = true;
const n0 = sent.length;
r = await call("hqLogin", ["01000000000", "hq-pw-1"]);
const after = sent.slice(n0);
check("알림톡 한 번 + 문자 한 번", after.length === 2 && !!after[0].kakaoOptions && !after[1].kakaoOptions, after);
check("문자도 확정본 대체 문구", /^\[차곳간\] 인증번호 \d{6} \(5분 안에 입력\)$/.test(after[1]?.text || ""), after[1]);
check("로그인 1단계는 그대로 됨", r.result?.need2 === true, r);
ataFail = false;

console.log("■ 본사 알림 번호 바꾸기 인증번호");
r = await call("hqPhoneStart", ["010-3333-4444"], ADM, "ADMIN");
const toNew = sent.filter((x) => x.to === "01033334444");
check("새 번호로 알림톡 (T_AUTH)", r.result?.ok !== false && toNew.length === 1 && toNew[0].kakaoOptions?.templateId === "T_AUTH", [r, toNew]);
check("예전 번호 알림은 지금처럼 문자", sent.some((x) => x.to === "01011112222" && !x.kakaoOptions && /바꾸려는 시도/.test(x.text)));

console.log("■ 템플릿 코드가 비어 있으면 지금 문자 그대로");
store.wash_hq[0].ata_cfg = { pfId: "PF", tpl: {} };
await import(SRC + "?nocode");            // 1분 기억을 비운 새 서버
const n1 = sent.length;
r = await call("hqLogin", ["01000000000", "hq-pw-1"], "", "", 1);
const s1 = sent.slice(n1);
check("문자 한 통 · 예전 문구", s1.length === 1 && !s1[0].kakaoOptions && /^\[차곳간 관리\] 인증번호 \d{6}\n5분 안에/.test(s1[0].text), s1);
check("기록 tpl = hq_auth", store.cgg_sendlog.some((x: any) => x.tpl === "hq_auth"));

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
