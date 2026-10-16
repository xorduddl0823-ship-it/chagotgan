// 체크 서버(check-api v23) 배달 기사 로그인 시험 — 가짜 수파베이스로만 돌립니다.
// 보안 재검사 2026-10-14 의 A(잠금 · 6자) · B(같은 이름 구분) · C(가입 신청 표시)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크기사_시험.ts
import { store } from "./fake_supabase_check.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");

/* ── 비밀번호 만들기 (check-api 와 같은 방식) ── */
const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
async function pwHash(pw: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" }, key, 256);
  return hex(salt) + "$" + hex(new Uint8Array(bits));
}

/* ── 가짜 표 ── */
const day = new Date(Date.now() + 86400000).toISOString();
Object.assign(store, {
  check_office: [
    { id: "o1", code: "SOMCAR", name: "솜카검사소", biz_no: "111-22-33333" },
    { id: "o2", code: "OTHER", name: "다른검사소", biz_no: "123-45-67890" },
  ],
  check_user: [
    { id: "u1", office_id: "o1", phone: "01011110000", name: "솜카사무실", role: "owner", active: true },
    { id: "u2", office_id: "o2", phone: "01022220000", name: "다른사무실", role: "owner", active: true },
  ],
  check_session: [
    { sid: "chk_o1", phone: "01011110000", office_id: "o1", role: "owner", expires_at: day },
    { sid: "chk_o2", phone: "01022220000", office_id: "o2", role: "owner", expires_at: day },
  ],
  check_deliv_driver: [
    // 예전에 4자로 정한 비밀번호 — 계속 로그인돼야 함
    { id: "d1", office_id: "o1", name: "김기사", pw_hash: await pwHash("abcd"), token: null, active: true },
    { id: "d2", office_id: "o2", name: "김기사", pw_hash: await pwHash("other-pw"), token: null, active: true },
    { id: "d3", office_id: "o1", name: "박기사", pw_hash: await pwHash("1234"), token: null, active: true },
    { id: "d4", office_id: "o1", name: "이기사", pw_hash: await pwHash("lee-pw1"), token: null, active: true },
    { id: "d5", office_id: "o2", name: "이기사", pw_hash: await pwHash("lee-pw2"), token: null, active: false },
  ],
  check_deliv_fail: [] as any[],
  check_deliv_signup: [] as any[],
});

/* ── 서버 불러오기 (Deno.serve 를 가로채서 손잡이만 받음) ── */
let H: any = null;
(Deno as any).serve = (h: any) => { H = h; return {}; };
await import("../2_차곳간체크_서버_check-api_v23.ts");
async function call(fn: string, args: unknown[] = []) {
  const r = await H(new Request("http://x", { method: "POST", body: JSON.stringify({ shop: "", token: "", fn, args }) }));
  return await r.json();
}

/* ── 시험 ── */
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); }
  else { fail++; console.log("  ❌ " + name, extra); }
}
const tokOk = (r: any) => /^T1\./.test(r?.result?.token ?? "");
const failRow = (k: string) => store.check_deliv_fail.find((r: any) => r.key === k);
const resetFail = () => { store.check_deliv_fail = []; };
const acc = async (pin: string, name: string) =>
  ((await call("deliv_accounts", [pin])).result?.rows ?? []).find((r: any) => r.이름 === name);

console.log("① 버전");
check("ping 이 v23 을 돌려줌", (await call("ping")).result?.ver?.startsWith("check-api v23"));

console.log("② 같은 이름이 두 검사소에 (B)");
const amb = await call("deliv_login", ["김기사", "abcd"]);
check("코드 없이 넣으면 '회사 기사 비밀번호를 함께' 안내", /여러 회사/.test(amb.__err ?? "") && /검사소 코드/.test(amb.__err ?? ""), amb);
check("모호할 때는 시도 횟수도 안 올림", store.check_deliv_fail.length === 0);
const k1 = await call("deliv_login", ["김기사", "abcd", "somcar"]);
check("코드(소문자로 넣어도) → 솜카 김기사로 로그인", tokOk(k1), k1);
check("열쇠가 솜카 김기사(d1)에 저장", store.check_deliv_driver.find((d: any) => d.id === "d1").token === k1.result?.token);
const k2 = await call("deliv_login", ["김기사", "other-pw", "OTHER"]);
check("코드 OTHER → 다른검사소 김기사로 로그인", tokOk(k2) && store.check_deliv_driver.find((d: any) => d.id === "d2").token === k2.result?.token, k2);
const k3 = await call("deliv_login", ["김기사", "other-pw", "123-45-67890"]);
check("사업자번호(- 넣어도)로도 구분됨", tokOk(k3), k3);
const k4 = await call("deliv_login", ["김기사", "abcd", "OTHER"]);
check("다른 검사소의 비밀번호로는 안 됨", /맞지 않습니다/.test(k4.__err ?? ""), k4);
const k5 = await call("deliv_login", ["김기사", "abcd", "NOPE"]);
check("없는 코드는 거절", /회사 기사 비밀번호가 맞지 않습니다/.test(k5.__err ?? ""), k5);
const s1 = await call("deliv_login", ["박기사", "1234"]);
check("이름이 하나뿐이면 코드 없이도 예전처럼 로그인 (4자 옛 비밀번호도)", tokOk(s1), s1);
const s2 = await call("deliv_login", ["이기사", "lee-pw1"]);
check("같은 이름이 있어도 사용 중인 계정이 하나면 그 계정으로 로그인", tokOk(s2), s2);
check("없는 이름은 예전 안내", /없는 이름/.test((await call("deliv_login", ["없는사람", "xxxxxx"])).__err ?? ""));
resetFail();

console.log("③ 틀린 비밀번호 잠금 (A)");
const msgs: string[] = [];
for (let i = 0; i < 5; i++) msgs.push((await call("deliv_login", ["박기사", "wrong"])).__err ?? "");
check("5번까지는 '맞지 않습니다'", msgs.every((m) => /맞지 않습니다/.test(m)), msgs);
const lk = await call("deliv_login", ["박기사", "1234"]);
check("6번째는 맞는 비밀번호도 10분 잠김", /잠겼습니다/.test(lk.__err ?? "") && !lk.result, lk);
check("잠금은 검사소+이름 단위 — 다른 검사소 김기사·솜카 김기사는 그대로", tokOk(await call("deliv_login", ["김기사", "other-pw", "OTHER"])));
resetFail();
await Promise.all(Array.from({ length: 3 }, () => call("deliv_login", ["박기사", "wrong"])));
check("틀린 횟수가 쌓임 (3)", failRow("o1:박기사")?.fail_count === 3);
const okR = await call("deliv_login", ["박기사", "1234"]);
check("맞히면 로그인되고 횟수 줄이 지워짐", tokOk(okR) && !failRow("o1:박기사"), okR);
resetFail();
const par = await Promise.all(Array.from({ length: 12 }, () => call("deliv_login", ["박기사", "wrong"])));
const nWrong = par.filter((r) => /맞지 않습니다/.test(r.__err ?? "")).length;
const nLock = par.filter((r) => /잠겼습니다/.test(r.__err ?? "")).length;
check("한꺼번에 12번 보내도 비밀번호 확인은 5번만", nWrong === 5 && nLock === 7, { nWrong, nLock });
const lk2 = await call("deliv_login", ["박기사", "1234"]);
check("한꺼번에 보낸 뒤 맞는 비밀번호도 잠김", /잠겼습니다/.test(lk2.__err ?? ""), lk2);
failRow("o1:박기사").locked_until = new Date(Date.now() - 1000).toISOString();
const unl = await call("deliv_login", ["박기사", "1234"]);
check("10분이 지나면 다시 들어가짐", tokOk(unl), unl);
resetFail();
const savedFail = store.check_deliv_fail; delete (store as any).check_deliv_fail;
const nofn = await call("deliv_login", ["박기사", "1234"]);
check("SQL 02 를 안 돌렸으면(함수 없음) 맞는 비밀번호도 거절 + 안내", !nofn.result && /SQL 02/.test(nofn.__err ?? ""), nofn);
store.check_deliv_fail = savedFail;

console.log("④ 새 비밀번호 6자 이상 (A)");
const su5 = await call("deliv_signup", ["SOMCAR", "새기사", "12345"]);
check("가입: 5자 비밀번호 거절", /6자 이상/.test(su5.__err ?? ""), su5);
check("가입 거절이면 기사가 만들어지지 않음", !store.check_deliv_driver.some((d: any) => d.name === "새기사"));
const cp5 = await call("deliv_changePw", [s1.result.token, "1234", "12345"]);
check("비밀번호 바꾸기: 5자 거절", /6자 이상/.test(cp5.__err ?? ""), cp5);
const cp6 = await call("deliv_changePw", [s1.result.token, "1234", "park-123"]);
check("비밀번호 바꾸기: 6자 이상은 됨", tokOk(cp6), cp6);
check("바꾼 비밀번호로 로그인", tokOk(await call("deliv_login", ["박기사", "park-123"])));
const ad5 = await call("deliv_accountAdd", ["chk_o1", "정기사", "12345", "01000000000"]);
check("사무실 기사 등록: 5자 비밀번호 거절", /6자 이상/.test(ad5.__err ?? ""), ad5);
check("사무실 기사 등록: 비밀번호 비우면 됨", (await call("deliv_accountAdd", ["chk_o1", "정기사", ""])).result?.ok === true);
check("사무실 기사 등록: 6자 비밀번호는 됨", (await call("deliv_accountAdd", ["chk_o1", "한기사", "han-123"])).result?.ok === true);
check("사무실 등록 기사(6자) 로그인", tokOk(await call("deliv_login", ["한기사", "han-123"])));
check("기사 열쇠로는 사무실 기사 등록 불가", !!(await call("deliv_accountAdd", [s1.result.token, "x", ""])).__err);

console.log("⑤ 미리 등록된 이름으로 가입 → 「가입신청」 표시 (C)");
check("등록만 된 기사는 가입신청 표시 없음", (await acc("chk_o1", "정기사"))?.가입신청 === "");
const su = await call("deliv_signup", ["somcar", "정기사", "jung-123"]);
check("가입하면 '사무실 승인 대기' 안내", /가입 신청이 됐습니다/.test(su.__err ?? ""), su);
const j = await acc("chk_o1", "정기사");
check("사무실 목록에 가입신청 Y · 사용 N", j?.가입신청 === "Y" && j?.사용 === "N", j);
check("다른 기사는 가입신청 빈칸", (await acc("chk_o1", "박기사"))?.가입신청 === "");
check("다른 검사소 목록에는 안 보임", !(await acc("chk_o2", "정기사")));
check("승인 전 로그인 거절", /멈춘/.test((await call("deliv_login", ["정기사", "jung-123"])).__err ?? ""));
await call("deliv_accountEdit", ["chk_o1", "정기사", { 사용: "Y" }]);
const j2 = await acc("chk_o1", "정기사");
check("[사용]으로 승인하면 가입신청 표시가 지워짐", j2?.가입신청 === "" && j2?.사용 === "Y" &&
  !store.check_deliv_signup.some((r: any) => r.name === "정기사"), j2);
check("승인 뒤 가입한 비밀번호로 로그인", tokOk(await call("deliv_login", ["정기사", "jung-123"])));
await call("deliv_signup", ["SOMCAR", "완전새기사", "brand-new"]);
check("처음 보는 이름으로 가입해도 가입신청 Y", (await acc("chk_o1", "완전새기사"))?.가입신청 === "Y");
await call("deliv_accountEdit", ["chk_o1", "완전새기사", { 이름: "새이름기사" }]);
check("이름을 바꾸면 표시도 따라감", (await acc("chk_o1", "새이름기사"))?.가입신청 === "Y");
await call("deliv_accountEdit", ["chk_o1", "새이름기사", { 비밀번호초기화: true }]);
check("비밀번호 초기화하면 표시가 지워짐", (await acc("chk_o1", "새이름기사"))?.가입신청 === "");
const savedSign = store.check_deliv_signup; delete (store as any).check_deliv_signup;
const suNo = await call("deliv_signup", ["SOMCAR", "표없음기사", "nosign-1"]);
check("표가 없으면 가입을 받지 않음 (표시 없는 승인 대기 방지)", /SQL 02/.test(suNo.__err ?? "") &&
  !store.check_deliv_driver.some((d: any) => d.name === "표없음기사"), suNo);
check("표가 없어도 사무실 목록은 그대로 보임", (await acc("chk_o1", "박기사"))?.가입신청 === "");
store.check_deliv_signup = savedSign;

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
