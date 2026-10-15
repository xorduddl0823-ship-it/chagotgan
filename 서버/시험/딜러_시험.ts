// 딜러앱 서버(dealer-api d3) 보안 고침 시험 — 가짜 수파베이스로만 돌립니다.
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_dealer.json 서버/시험/딜러_시험.ts
// (다른 파일로 시험하려면 DEALER_SRC=파일주소 를 붙입니다 — 고침을 되돌려 보는 확인용)
import { rpcCalls, rpcHooks, store } from "./fake_supabase_dealer.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "fake"); Deno.env.set("SOLAPI_SECRET", "fake");
Deno.env.set("SMS_FROM", "0212345678");

/* ── 가짜 표 ── */
Object.assign(store, {
  dealer_otp: [] as any[], dealer_users: [] as any[], dealer_sessions: [] as any[],
  dealer_agreements: [] as any[], dealer_done: [] as any[], wash_shops: [] as any[], wash_docs: [] as any[],
  wash_rate: [] as any[],
});

/* ── 가짜 솔라피 ── */
const SECRET_TXT = "INVALID_API_KEY apiKey=NCS-abc 잔액부족-내부정보";
let smsMode: "ok" | "http" | "failed" = "ok";
let sms: { to: string; text: string }[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  const u = String(url);
  if (u.includes("solapi")) {
    if (smsMode === "http") return new Response(JSON.stringify({ errorCode: "x", errorMessage: SECRET_TXT }), { status: 403 });
    const m = JSON.parse(String(init?.body ?? "{}")).messages[0];
    if (smsMode === "failed")
      return Response.json({ failedMessageList: [{ statusMessage: SECRET_TXT, statusCode: "3059" }] });
    sms.push({ to: m.to, text: m.text });
    return Response.json({});
  }
  throw new Error("예상 못 한 주소: " + u);
}) as typeof fetch;

/* ── 서버 오류 기록(console.error)은 모아 둡니다 ── */
const errLog: string[] = [];
const realErr = console.error;
console.error = (...a: unknown[]) => { errLog.push(a.map((x) => x instanceof Error ? x.message : String(x)).join(" ")); };

/* ── 서버 불러오기 (Deno.serve 를 가로채서 손잡이만 받음) ── */
const H: ((r: Request) => Promise<Response>)[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
const src = Deno.env.get("DEALER_SRC") || new URL("../3_딜러앱_서버_dealer-api_d3.ts", import.meta.url).href;
await import(src);
const [api] = H;
async function call(fn: string, args: unknown[] = [], headers: Record<string, string> = {}, token = "") {
  const r = await api(new Request("http://x", { method: "POST", headers, body: JSON.stringify({ token, fn, args }) }));
  return await r.json();
}

/* ── 시험 ── */
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); }
  else { fail++; console.log("  ❌ " + name, extra); }
}
const otp = (p: string): any => store.dealer_otp.find((o: any) => o.phone === p) ?? {};
const lastCode = () => (sms[sms.length - 1]?.text.match(/\d{6}/) ?? [""])[0];
const other = (c: string) => (c === "000000" ? "111111" : "000000");
let ipN = 0;
const freshIp = () => ({ "x-forwarded-for": "10.0.0." + (++ipN) });   // 시험마다 IP 하루 한도에 걸리지 않게
async function newCode(phone: string) {
  const r = await call("sendCode", [phone], freshIp());
  return { r, code: lastCode() };
}

console.log("① 창구 열림");
const ping = await call("ping");
check("ping 이 d3 를 돌려줌", ping.result?.ver === "d3", ping);

console.log("② 인증번호 — 보통 흐름");
const A = "01020000001";
const a1 = await newCode(A);
check("인증번호 문자가 나감", a1.r.result?.ok === true && a1.code.length === 6, a1.r);
check("인증번호는 표에 그대로 저장되지 않음", !JSON.stringify(store.dealer_otp).includes(a1.code));
const aw = await call("verifyCode", [A, other(a1.code)]);
check("틀리면 남은 횟수(4번)와 함께 거절", /4번 더/.test(aw.__err ?? ""), aw);
check("틀린 횟수가 DB 에 1로 올라감", otp(A).tries === 1, otp(A));
check("횟수는 dealer_otp_try 함수로 올림", rpcCalls.some((c) => c.fn === "dealer_otp_try" && c.args.p_phone === A));
const aok = await call("verifyCode", [A, a1.code]);
check("맞는 번호면 로그인 열쇠를 줌", typeof aok.result?.key === "string" && aok.result.key.length >= 20, aok);
check("쓴 번호는 verified 로 표시됨", otp(A).verified === true);
const again = await call("verifyCode", [A, a1.code]);
check("한 번 쓴 번호는 다시 못 씀", /이미 쓴/.test(again.__err ?? ""), again);

console.log("③ 제한 안에서는 맞는 번호가 통과");
const B = "01020000002";
const b1 = await newCode(B);
for (let i = 0; i < 4; i++) await call("verifyCode", [B, other(b1.code)]);
const bok = await call("verifyCode", [B, b1.code]);
check("4번 틀린 뒤 5번째에 맞는 번호 → 로그인", !!bok.result?.key, bok);

console.log("④ 한꺼번에 많이 보내도 5번 제한 (보안 방 지적 1)");
const C = "01020000003";
const c1 = await newCode(C);
const burst = await Promise.all(Array.from({ length: 60 }, () => call("verifyCode", [C, other(c1.code)])));
const compared = burst.filter((r) => /인증번호가 다릅니다/.test(r.__err ?? "")).length;
const blocked = burst.filter((r) => /너무 많이 틀렸습니다/.test(r.__err ?? "")).length;
check("60번 동시에 보내도 실제로 맞춰 본 것은 5번뿐", compared === 5, { compared, blocked });
check("나머지 55번은 «너무 많이 틀렸습니다»", blocked === 55, { compared, blocked });
check("DB 의 틀린 횟수 = 보낸 횟수 60 (하나도 안 샘)", otp(C).tries === 60, otp(C));
const cAfter = await call("verifyCode", [C, c1.code]);
check("제한을 넘긴 뒤에는 맞는 번호도 거절", /너무 많이/.test(cAfter.__err ?? "") && !cAfter.result, cAfter);

const D = "01020000004";
const d1 = await newCode(D);
/* 맞는 번호를 맨 뒤에 섞어서 한꺼번에 — 앞의 틀린 시도들이 횟수를 다 쓰면 맞는 번호도 막혀야 함 */
const mixed = await Promise.all([
  ...Array.from({ length: 20 }, () => call("verifyCode", [D, other(d1.code)])),
  call("verifyCode", [D, d1.code]),
]);
const dCompared = mixed.filter((r) => /인증번호가 다릅니다/.test(r.__err ?? "") || r.result?.key).length;
check("틀린 번호 20개 + 맞는 번호 1개를 한꺼번에 → 맞춰 본 것은 5번 이하", dCompared <= 5, dCompared);

const E = "01020000005";
const e1 = await newCode(E);
const twice = await Promise.all([call("verifyCode", [E, e1.code]), call("verifyCode", [E, e1.code])]);
check("맞는 번호를 동시에 두 번 → 로그인은 한 번만", twice.filter((r) => r.result?.key).length === 1, twice);

console.log("⑤ 횟수 제한 장치 오류 → 보내지 않음 (보안 방 지적 2)");
const before = sms.length;
rpcHooks.wash_rate_bump = () => ({ data: null, error: { message: "function wash_rate_bump does not exist" } });
const rf = await call("sendCode", ["01020000006"], freshIp());
check("장치가 오류를 내면 문자를 보내지 않고 거절", !!rf.__err && !rf.result && sms.length === before, rf);
check("오류는 서버 기록에 남김", errLog.some((l) => /횟수 제한/.test(l)));
rpcHooks.wash_rate_bump = () => { throw new Error("network down"); };
const rf2 = await call("sendCode", ["01020000007"], freshIp());
check("장치 부르기가 아예 실패해도 거절", !!rf2.__err && sms.length === before, rf2);
delete rpcHooks.wash_rate_bump;
const rf3 = await call("sendCode", ["01020000006"], freshIp());
check("장치가 돌아오면 다시 보냄", rf3.result?.ok === true && sms.length === before + 1, rf3);

console.log("⑥ IP 는 꾸밀 수 없는 값만 (보안 방 지적 2)");
const ipKeys = () => rpcCalls.filter((c) => c.fn === "wash_rate_bump" && /otp:ip:/.test(c.args.p_key)).map((c) => c.args.p_key);
rpcCalls.length = 0;
await call("sendCode", ["01020000010"], { "x-forwarded-for": "1.1.1.1, 203.0.113.9" });
await call("sendCode", ["01020000011"], { "x-forwarded-for": "6.6.6.6,203.0.113.9" });
await call("sendCode", ["01020000012"], { "x-forwarded-for": "203.0.113.9" });
const k = ipKeys();
check("맨 왼쪽을 바꿔도 같은 IP 로 셈 (맨 오른쪽 값)", k.length === 3 && k.every((x) => x === "d:otp:ip:203.0.113.9"), k);
rpcCalls.length = 0;
await call("sendCode", ["01020000013"], { "cf-connecting-ip": "198.51.100.7", "x-forwarded-for": "1.1.1.1, 203.0.113.9" });
check("cf-connecting-ip 가 있으면 그것을 씀", ipKeys()[0] === "d:otp:ip:198.51.100.7", ipKeys());
rpcCalls.length = 0;
await call("sendCode", ["01020000014"]);
check("머리글이 없으면 \"0\"", ipKeys()[0] === "d:otp:ip:0", ipKeys());
Deno.env.set("DEALER_OTP_MAX_IP_DAY", "3");
store.wash_rate = [];
const spoof = [];
for (let i = 0; i < 4; i++)
  spoof.push(await call("sendCode", ["0102000002" + i], { "x-forwarded-for": `9.9.9.${i}, 192.0.2.50` }));
check("맨 왼쪽을 매번 바꿔도 IP 하루 한도(3번)에 걸림", spoof.slice(0, 3).every((r) => r.result?.ok) && /너무 많이/.test(spoof[3].__err ?? ""), spoof);
Deno.env.delete("DEALER_OTP_MAX_IP_DAY");

console.log("⑦ 솔라피 오류 원문은 화면에 안 보냄 (보안 방 지적 3)");
errLog.length = 0;
smsMode = "http";
const s1 = await call("sendCode", ["01020000030"], freshIp());
check("솔라피가 오류(403)를 내면 짧은 안내만", s1.__err === "문자를 보내지 못했습니다. 잠시 뒤 다시 해 주세요.", s1);
check("응답에 솔라피 원문이 없음", !JSON.stringify(s1).includes("INVALID_API_KEY") && !JSON.stringify(s1).includes("솔라피"), s1);
check("원문은 서버 기록에만 남음", errLog.some((l) => l.includes("INVALID_API_KEY")), errLog);
smsMode = "failed";
const s2 = await call("sendCode", ["01020000031"], freshIp());
check("보내기 실패 목록이 와도 짧은 안내만", s2.__err === "문자를 보내지 못했습니다. 잠시 뒤 다시 해 주세요." && !JSON.stringify(s2).includes("INVALID_API_KEY"), s2);
smsMode = "ok";

console.log("⑧ 인증 횟수 함수(SQL)가 아직 없을 때");
const F = "01020000040";
const f1 = await newCode(F);
rpcHooks.dealer_otp_try = () => ({ data: null, error: { message: "Could not find the function public.dealer_otp_try(p_phone)" } });
const fx = await call("verifyCode", [F, f1.code]);
check("함수가 없으면 맞는 번호라도 로그인하지 않음 (안전 쪽)", !fx.result && /sql\/03/.test(fx.__err ?? ""), fx);
delete rpcHooks.dealer_otp_try;

console.error = realErr;
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
