// 경비실(cgg-api v1) + 체크 서버(check-api v22) 권한 시험 — 가짜 수파베이스로만 돌립니다.
// 실행:  deno run -A --import-map=서버/시험/import_map.json 서버/시험/경비실_시험.ts
import { store } from "./fake_supabase.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "fake"); Deno.env.set("SOLAPI_SECRET", "fake");
Deno.env.set("CGG_SMS_FROM", "0212345678");

/* ── 체크 비밀번호 만들기 (check-api 와 같은 방식) ── */
const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
async function pwHash(pw: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" }, key, 256);
  return hex(salt) + "$" + hex(new Uint8Array(bits));
}

/* ── 가짜 표 ── */
const P = { washOnly: "01011112222", checkOnly: "01033334444", both: "01055556666", two: "01077778888",
            stranger: "01099990000", legacy: "01012121212", admin: "01000000000" };
Object.assign(store, {
  wash_sessions: [] as any[],
  check_session: [] as any[],
  check_office: [{ id: "o1", code: "SOMCAR", name: "솜카검사소" }],
  check_user: [
    { id: "u1", office_id: "o1", phone: P.checkOnly, name: "김체크", role: "staff", active: true, pw_hash: await pwHash("check-pw") },
    { id: "u2", office_id: "o1", phone: P.both, name: "이둘다", role: "owner", active: true, pw_hash: await pwHash("both-pw") },
    { id: "u3", office_id: "o1", phone: P.washOnly, name: "정워시", role: "staff", active: true, pw_hash: await pwHash("x") },
    { id: "u4", office_id: "o1", phone: P.legacy, name: "옛체크", role: "staff", active: true, pw_hash: await pwHash("old") },
    { id: "u5", office_id: "o1", phone: P.two, name: "문자", role: "owner", active: true, pw_hash: await pwHash("two-pw") },
  ],
  cgg_access: [
    { phone: P.washOnly, name: "워시만", products: ["wash"], active: true, two_step: false, fail_count: 0 },
    { phone: P.checkOnly, name: "체크만", products: ["check"], active: true, two_step: false, fail_count: 0 },
    { phone: P.both, name: "둘다", products: ["wash", "check"], active: true, two_step: false, fail_count: 0 },
    { phone: P.two, name: "문자확인", products: ["wash", "check"], active: true, two_step: true, fail_count: 0 },
  ],
  cgg_session: [] as any[],
  cgg_tick: [] as any[],
});

/* ── 가짜 wash-api · 솔라피 ── */
const WASH_PW: Record<string, string> = { [P.washOnly]: "wash-pw", [P.both]: "both-pw", [P.two]: "two-pw", [P.admin]: "admin" };
const calls: string[] = [];
let lastSms = "";
let n = 0;
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  const u = String(url);
  const body = JSON.parse(String(init?.body ?? "{}"));
  if (u.includes("/functions/v1/wash-api")) {
    calls.push("wash:" + body.fn);
    if (body.fn === "login") {
      const [ph, pw] = body.args;
      if (WASH_PW[ph] !== pw) return Response.json({ __err: "번호 또는 비밀번호가 맞지 않습니다." });
      const sid = "W" + (++n);
      store.wash_sessions.push({ sid, phone: ph, shop: ph === P.admin ? "ADMIN" : "BROTHER", role: "owner",
                                 expires_at: new Date(Date.now() + 86400000).toISOString() });
      return Response.json({ result: { key: sid, shop: "BROTHER" } });
    }
    if (body.fn === "logout") { store.wash_sessions = store.wash_sessions.filter((s: any) => s.sid !== body.args[0]); return Response.json({ result: { ok: true } }); }
  }
  if (u.includes("solapi")) { lastSms = body.messages[0].text; calls.push("sms"); return Response.json({}); }
  throw new Error("예상 못 한 주소: " + u);
}) as typeof fetch;

/* ── 두 서버 불러오기 (Deno.serve 를 가로채서 손잡이만 받음) ── */
const H: ((r: Request) => Promise<Response>)[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import("../0_차곳간_경비실_cgg-api_v1.ts");
await import("../2_차곳간체크_서버_check-api_v22.ts");
const [cgg, chk] = H;
async function call(h: any, fn: string, args: unknown[] = [], token = "", shop = "") {
  const r = await h(new Request("http://x", { method: "POST", body: JSON.stringify({ shop, token, fn, args }) }));
  return await r.json();
}

/* ── 시험 ── */
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); }
  else { fail++; console.log("  ❌ " + name, extra); }
}
const codes = (r: any) => (r?.result?.products ?? []).map((p: any) => p.code).sort().join(",");

console.log("① 창구 열림");
check("ping 이 버전을 돌려줌", (await call(cgg, "ping")).result?.ver?.startsWith("cgg-api"));
check("없는 창구는 거절", !!(await call(cgg, "hqLogin")).__err);

console.log("② 로그인 — 계정마다 맞는 제품");
const rW = await call(cgg, "cggLogin", [P.washOnly, "wash-pw"]);
check("워시만 계정 → [wash]", codes(rW) === "wash", rW);
const rC = await call(cgg, "cggLogin", ["010-3333-4444", "check-pw"]);
check("체크만 계정 (번호에 - 넣어도) → [check]", codes(rC) === "check", rC);
check("체크 제품에 shop·shopName·role 이 들어 있음", rC.result?.products?.[0]?.shop === "SOMCAR" && rC.result.products[0].shopName === "솜카검사소" && !!rC.result.products[0].role);
const rB = await call(cgg, "cggLogin", [P.both, "both-pw"]);
check("둘 다 계정 → [check,wash]", codes(rB) === "check,wash", rB);
check("이름이 명단 이름으로 나옴", rB.result?.name === "둘다");
check("명단에 없는 번호는 거절", !!(await call(cgg, "cggLogin", [P.stranger, "x"])).__err);
check("비밀번호 틀리면 거절", !!(await call(cgg, "cggLogin", [P.both, "nope"])).__err);

console.log("③ cggMe · 권한 바로 반영");
const meB = await call(cgg, "cggMe", [rB.result.sid]);
check("cggMe 가 같은 목록을 돌려줌", codes(meB) === "check,wash", meB);
check("엉뚱한 sid 는 거절", !!(await call(cgg, "cggMe", ["cgg_nope"])).__err);
const accB = store.cgg_access.find((a: any) => a.phone === P.both);
accB.products = ["wash"];
const meB2 = await call(cgg, "cggMe", [rB.result.sid]);
check("체크 권한을 빼면 cggMe 에서 체크가 사라짐", codes(meB2) === "wash", meB2);
const bothCheckSid = rB.result.products.find((p: any) => p.code === "check").sid;
check("빼는 순간 그 체크 열쇠도 지워짐", !store.check_session.some((s: any) => s.sid === bothCheckSid));
accB.products = ["wash", "check"];

console.log("④ 체크 서버(check-api v22) 문지기 — 끝났다고 보는 기준");
const washOnlySid = rW.result.products[0].sid;
const r1 = await call(chk, "me", [], washOnlySid);
check("워시만 계정의 열쇠로 체크를 부르면 거절", !!r1.__err && /권한/.test(r1.__err), r1);
const r2 = await call(chk, "me", [], rC.result.products[0].sid);
check("체크만 계정의 열쇠로 체크를 부르면 통과", r2.result?.office?.code === "SOMCAR", r2);
const meB3 = await call(cgg, "cggMe", [rB.result.sid]);
const r3 = await call(chk, "me", [], meB3.result.products.find((p: any) => p.code === "wash").sid);
check("둘 다 계정은 워시 열쇠로도 체크 통과 (예전 방식 유지)", r3.result?.office?.code === "SOMCAR", r3);
// 명단에 없는 옛 체크 사용자 (체크 자체 로그인)
store.check_session.push({ sid: "chk_legacy", phone: P.legacy, office_id: "o1", role: "staff", expires_at: new Date(Date.now() + 86400000).toISOString() });
check("명단에 없는 옛 체크 사용자는 예전처럼 통과", !!(await call(chk, "me", [], "chk_legacy")).result);
// 관리(ADMIN) 열쇠
store.wash_sessions.push({ sid: "WADMIN", phone: P.admin, shop: "ADMIN", role: "admin", expires_at: new Date(Date.now() + 86400000).toISOString() });
check("관리(ADMIN) 열쇠는 그대로 통과", !!(await call(chk, "me", [], "WADMIN", "SOMCAR")).result);
// 명단에서 막힌 사람
store.cgg_access.find((a: any) => a.phone === P.checkOnly).active = false;
check("명단에서 막으면(active=false) 체크 자체 로그인도 거절", !!(await call(chk, "me", [], rC.result.products[0].sid)).__err);
check("막힌 계정은 cggMe 도 거절", !!(await call(cgg, "cggMe", [rC.result.sid])).__err);
store.cgg_access.find((a: any) => a.phone === P.checkOnly).active = true;
// 표가 아직 없을 때
const saved = store.cgg_access; delete (store as any).cgg_access;
check("표가 없을 때 워시 열쇠는 거절(안전 쪽)", !!(await call(chk, "me", [], meB3.result.products.find((p: any) => p.code === "wash").sid)).__err);
check("표가 없을 때 옛 체크 로그인은 통과", !!(await call(chk, "me", [], "chk_legacy")).result);
store.cgg_access = saved;

console.log("⑤ 문자 6자리 (two_step 계정)");
const t1 = await call(cgg, "cggLogin", [P.two, "two-pw"]);
check("tick 과 가린 번호를 돌려줌", !!t1.result?.tick && t1.result.to === "010-****-8888", t1);
const code = (lastSms.match(/\d{6}/) ?? [""])[0];
check("문자가 나감", code.length === 6);
check("확인 번호는 표에 그대로 저장되지 않음", !JSON.stringify(store.cgg_tick).includes(code));
const wrong = await call(cgg, "cggLogin2", [t1.result.tick, code === "000000" ? "111111" : "000000"]);
check("틀린 번호는 남은 횟수와 함께 거절", /남은 횟수 4번/.test(wrong.__err ?? ""), wrong);
const t2 = await call(cgg, "cggLogin2", [t1.result.tick, code]);
check("맞는 번호면 [check,wash]", codes(t2) === "check,wash", t2);
check("한 번 쓴 tick 은 다시 못 씀", !!(await call(cgg, "cggLogin2", [t1.result.tick, code])).__err);

console.log("⑥ 잠금");
for (let i = 0; i < 5; i++) await call(cgg, "cggLogin", [P.checkOnly, "bad"]);
const locked = await call(cgg, "cggLogin", [P.checkOnly, "check-pw"]);
check("5번 틀리면 맞는 비밀번호도 잠시 막힘", /잠겼습니다/.test(locked.__err ?? ""), locked);
const accC = store.cgg_access.find((a: any) => a.phone === P.checkOnly);
accC.locked_until = null; accC.fail_count = 0;
await Promise.all(Array.from({ length: 12 }, () => call(cgg, "cggLogin", [P.checkOnly, "bad"])));
const locked2 = await call(cgg, "cggLogin", [P.checkOnly, "check-pw"]);
check("한꺼번에 12번 보내도 잠금이 걸림 (보안 방 지적 2)", /잠겼습니다/.test(locked2.__err ?? ""), locked2);
accC.locked_until = null; accC.fail_count = 0;
const okAfter = await call(cgg, "cggLogin", [P.checkOnly, "check-pw"]);
check("잠금이 풀리면 다시 들어가지고 횟수가 0으로 돌아감", codes(okAfter) === "check" && accC.fail_count === 0, okAfter);

console.log("⑥-2 배달 기사 가입 (보안 방 지적 1)");
store.check_office.push({ id: "o2", code: "OTHER", name: "다른검사소" });
store.check_deliv_driver = [{ id: "d1", office_id: "o2", name: "홍기사", pw_hash: null, token: null, active: true }];
const su = await call(chk, "deliv_signup", ["SOMCAR", "새기사", "1234"]);
check("가입하면 열쇠를 주지 않고 '사무실 승인 대기' 안내", !!su.__err && /사무실/.test(su.__err) && !su.result, su);
const mine = store.check_deliv_driver.find((d: any) => d.name === "새기사");
check("가입한 기사는 멈춤(active=false) 상태로 저장", mine?.active === false && !mine?.token);
const li = await call(chk, "deliv_login", ["새기사", "1234"]);
check("승인 전에는 로그인 거절", !!li.__err && /멈춘/.test(li.__err), li);
mine.active = true;
const li2 = await call(chk, "deliv_login", ["새기사", "1234"]);
check("사무실이 [사용]으로 바꾸면 로그인되고 열쇠를 받음", /^T1\./.test(li2.result?.token ?? ""), li2);
await call(chk, "deliv_signup", ["SOMCAR", "홍기사", "9999"]);
const hong = store.check_deliv_driver.find((d: any) => d.id === "d1");
check("다른 검사소에 등록된 같은 이름을 가로챌 수 없음", hong.pw_hash === null && hong.active === true);

console.log("⑦ 로그아웃");
const before = store.wash_sessions.length;
const out = await call(cgg, "cggLogout", [rB.result.sid]);
check("cggLogout 성공", out.result?.ok === true);
check("통합 로그인 기록이 지워짐", !store.cgg_session.some((s: any) => s.sid === rB.result.sid));
check("워시 열쇠도 닫힘 (wash-api logout 부름)", store.wash_sessions.length === before - 1 && calls.includes("wash:logout"));
check("로그아웃 뒤 cggMe 는 거절", !!(await call(cgg, "cggMe", [rB.result.sid])).__err);
check("없는 sid 로그아웃도 조용히 성공", (await call(cgg, "cggLogout", ["nope"])).result?.ok === true);

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
