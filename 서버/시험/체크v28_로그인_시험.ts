// 체크 서버 v28 시험 (v26 시험 + tick 짝 맞추기) — 사무실 로그인 잠금 · 첫 비밀번호 문자 확인 (가짜 수파베이스)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v26_로그인_시험.ts
import { store } from "./fake_supabase_check.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s");
Deno.env.set("SMS_FROM", "0212345678");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v28.ts";

const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
async function pwHash(pw: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" }, key, 256);
  return hex(salt) + "$" + hex(new Uint8Array(bits));
}
const OLD = "01011110000", NEWU = "01022220000", LOCK = "01033330000";
Object.assign(store, {
  check_office: [{ id: "o1", code: "TEST", name: "시험검사소" }],
  check_user: [
    { id: "u1", office_id: "o1", phone: OLD, name: "옛직원", role: "owner", active: true, pw_hash: await pwHash("1234") },
    { id: "u2", office_id: "o1", phone: NEWU, name: "새직원", role: "staff", active: true, pw_hash: null },
    { id: "u3", office_id: "o1", phone: LOCK, name: "잠금", role: "staff", active: true, pw_hash: await pwHash("rightpw") },
  ],
  check_session: [], check_pw_first: [], check_deliv_fail: [], cgg_access: [], wash_sessions: [],
});
const sms: string[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  if (String(url).includes("solapi")) { sms.push(JSON.parse(String(init?.body)).messages[0].text); return Response.json({}); }
  throw new Error("예상 못 한 주소 " + url);
}) as typeof fetch;
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(SRC);
const chk = H[0];
async function call(fn: string, args: unknown[] = []) {
  const r = await chk(new Request("http://x", { method: "POST", body: JSON.stringify({ shop: "", token: "", fn, args }) }));
  return await r.json();
}
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}

console.log("① 원래 계정");
check("이미 정한 4자 비밀번호는 그대로 로그인", !!(await call("login", [OLD, "1234"])).result?.key);

console.log("② 잠금 (보안 방 ①)");
await Promise.all(Array.from({ length: 12 }, () => call("login", [LOCK, "badpw"])));
const lk = await call("login", [LOCK, "rightpw"]);
check("12번 한꺼번에 틀리면 맞는 비밀번호도 잠김", /잠겼습니다/.test(lk.__err ?? ""), lk);
store.check_deliv_fail = [];
check("잠금이 풀리면 다시 들어감", !!(await call("login", [LOCK, "rightpw"])).result?.key);
check("성공하면 틀린 횟수가 지워짐", !store.check_deliv_fail.some((r: any) => r.key === "office:" + LOCK));

console.log("③ 첫 비밀번호는 문자 확인 뒤 (보안 방 ②)");
check("처음 비밀번호가 6자보다 짧으면 거절", /6자 이상/.test((await call("login", [NEWU, "1234"])).__err ?? ""));
const f1 = await call("login", [NEWU, "first-pw"]);
check("처음 로그인은 열쇠 대신 「확인 번호」 안내 + __need: code", !f1.result && f1.__need === "code" && /확인 번호/.test(f1.__err), f1);
check("아직 비밀번호가 정해지지 않음 (먼저 온 사람이 바로 정하지 못함)", !store.check_user.find((u: any) => u.id === "u2").pw_hash);
const code1 = (sms.at(-1)?.match(/\d{6}/) ?? [""])[0];
check("그 휴대폰으로 확인 번호 문자가 나감", code1.length === 6);
check("확인 번호는 표에 그대로 저장되지 않음", !JSON.stringify(store.check_pw_first).includes(code1));
const f2 = await call("login", [NEWU, "other-pw"]);
const code2 = (sms.at(-1)?.match(/\d{6}/) ?? [""])[0];
check("다시 로그인하면 새 번호가 나가고 예전 번호는 못 씀", !!f2.__need && !!(await call("loginCode", [NEWU, code1 === code2 ? "000000" : code1, f2.__tick])).__err);
store.check_deliv_fail = store.check_deliv_fail.filter((r: any) => r.key !== "pwcode:" + NEWU);
const wrong = await call("loginCode", [NEWU, code2 === "111111" ? "222222" : "111111", f2.__tick]);
check("틀린 확인 번호는 거절", /맞지 않습니다/.test(wrong.__err ?? ""), wrong);
const ok2 = await call("loginCode", [NEWU, code2, f2.__tick]);
check("맞는 확인 번호면 바로 들어가짐 (first: true)", !!ok2.result?.key && ok2.result.first === true, ok2);
check("그때 적은 비밀번호가 정해짐 → 그 비밀번호로 로그인됨", !!(await call("login", [NEWU, "other-pw"])).result?.key);
check("첫 번째에 적은 비밀번호는 안 됨", !!(await call("login", [NEWU, "first-pw"])).__err);
check("한 번 쓴 확인 번호는 다시 못 씀", !!(await call("loginCode", [NEWU, code2, f2.__tick])).__err);

console.log("④ 확인 번호 찍기 막기 · 시간");
store.check_user.find((u: any) => u.id === "u2").pw_hash = null;   // 대표가 비밀번호 초기화한 셈
store.check_deliv_fail = [];
const f3 = await call("login", [NEWU, "third-pw1"]);
const code3 = (sms.at(-1)?.match(/\d{6}/) ?? [""])[0];
await Promise.all(Array.from({ length: 10 }, (_, i) => call("loginCode", [NEWU, String(100000 + i), f3.__tick])));
const late = await call("loginCode", [NEWU, code3, f3.__tick]);
check("확인 번호를 여러 번 틀리면 맞는 번호도 잠김", /잠겼습니다/.test(late.__err ?? ""), late);
store.check_deliv_fail = [];
store.check_pw_first.forEach((r: any) => (r.expires_at = new Date(Date.now() - 1000).toISOString()));
check("5분이 지나면 처음부터 다시", /시간이 지났습니다/.test((await call("loginCode", [NEWU, code3, f3.__tick])).__err ?? ""));


console.log("⑥ 바꿔치기 막기 (v28)");
for (const k of ["check_pw_first", "check_deliv_fail"]) (store as any)[k] = [];
store.check_user.find((u: any) => u.id === "u2").pw_hash = null;
const me1 = await call("login", [NEWU, "mine-pw1"]);                 // 본인
const evil = await call("login", [NEWU, "evil-pw1"]);                // 남이 중간에 다시
const codeE = (sms.at(-1)?.match(/\d{6}/) ?? [""])[0];               // 이 번호는 본인 폰으로 감
check("login 이 화면마다 다른 tick 을 줌", !!me1.__tick && !!evil.__tick && me1.__tick !== evil.__tick);
const hij = await call("loginCode", [NEWU, codeE, me1.__tick]);       // 본인이 자기 화면에 새 번호를 넣음
check("본인 화면 tick 과 짝이 안 맞으면 거절 (남의 비밀번호가 정해지지 않음)", /다시 로그인/.test(hij.__err ?? "") && !store.check_user.find((u: any) => u.id === "u2").pw_hash, hij);
check("tick 없이 부르면 거절", !!(await call("loginCode", [NEWU, codeE])).__err);
check("문자에 「본인이 로그인한 게 아니면 넣지 마세요」", /본인이 로그인한 게 아니면/.test(sms.at(-1) ?? ""));

console.log("⑤ SQL 을 안 돌렸을 때");
delete (store as any).check_pw_first;
store.check_deliv_fail = [];
check("첫 비밀번호 표가 없으면 안내하고 막음", /SQL 04/.test((await call("login", [NEWU, "third-pw1"])).__err ?? ""));

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
