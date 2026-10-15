// 체크 서버 급한 고침 v21.2 (운영 v21 + 사무실 로그인 잠금) · v27 (자기 비밀번호 초기화 막기) 시험
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크_급한고침_v27_시험.ts
//   CHECK_SRC 로 고를 판을 바꿀 수 있어요 (기본: v21.2 와 v27 을 차례로 시험)
import { store } from "./fake_supabase_check.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
async function pwHash(pw: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" }, key, 256);
  return hex(salt) + "$" + hex(new Uint8Array(bits));
}
const far = new Date(Date.now() + 864e5).toISOString();
const A = "01011110000", B = "01022220000", C = "01033330000";
async function reset() {
  for (const k of Object.keys(store)) delete (store as any)[k];
  Object.assign(store, {
    check_office: [{ id: "o1", code: "TEST", name: "시험검사소" }],
    check_user: [
      { id: "u1", office_id: "o1", phone: A, name: "대표", role: "owner", active: true, pw_hash: await pwHash("1234") },
      { id: "u2", office_id: "o1", phone: B, name: "새직원", role: "staff", active: true, pw_hash: null },
      { id: "u3", office_id: "o1", phone: C, name: "둘째대표", role: "owner", active: true, pw_hash: await pwHash("abcdef") },
    ],
    check_session: [{ sid: "chk_boss", phone: A, office_id: "o1", role: "owner", expires_at: far }],
    check_deliv_fail: [], check_log: [], cgg_access: [], wash_sessions: [],
  });
}
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
async function load(src: string) { await import(src + "?" + H.length); return H[H.length - 1]; }
async function call(h: any, fn: string, args: unknown[] = [], token = "") {
  const r = await h(new Request("http://x", { method: "POST", body: JSON.stringify({ shop: "", token, fn, args }) }));
  return await r.json();
}

const ONLY = Deno.env.get("CHECK_SRC");
if (!ONLY || ONLY.includes("v21_2")) {
  console.log("① 급한 고침 v21.2 (운영 v21 + 잠금)");
  await reset();
  const h = await load(ONLY ?? "../2_차곳간체크_서버_check-api_v21_2.ts");
  check("버전 글자", /v21\.2/.test((await call(h, "ping")).result?.ver ?? ""));
  check("이미 정한 4자 비밀번호는 그대로", !!(await call(h, "login", [A, "1234"])).result?.key);
  await Promise.all(Array.from({ length: 12 }, () => call(h, "login", [C, "wrongpw"])));
  check("12번 한꺼번에 틀리면 맞는 비밀번호도 잠김", /잠겼습니다/.test((await call(h, "login", [C, "abcdef"])).__err ?? ""));
  store.check_deliv_fail = [];
  check("잠금이 풀리면 들어가고 횟수가 지워짐", !!(await call(h, "login", [C, "abcdef"])).result?.key && !store.check_deliv_fail.length);
  check("처음 정하는 비밀번호가 6자보다 짧으면 거절", /6자 이상/.test((await call(h, "login", [B, "1234"])).__err ?? ""));
  check("처음 비밀번호 6자 이상은 예전처럼 바로 정해짐 (문자 확인은 새 판에서)", !!(await call(h, "login", [B, "newpw1"])).result?.key);
  delete (store as any).check_deliv_fail;
  check("잠금 SQL 을 안 돌렸으면 막고 안내", /SQL 02/.test((await call(h, "login", [A, "1234"])).__err ?? ""));
}
if (!ONLY || ONLY.includes("v27")) {
  console.log("② v27 자기 비밀번호 초기화 막기");
  await reset();
  const h = await load(ONLY ?? "../2_차곳간체크_서버_check-api_v27.ts");
  const self = await call(h, "staffEdit", ["u1", { 비밀번호초기화: true }], "chk_boss");
  check("대표가 자기 비밀번호를 초기화하면 거절", /자기 비밀번호/.test(self.__err ?? ""), self);
  check("대표 비밀번호는 그대로 남음", !!store.check_user.find((u: any) => u.id === "u1").pw_hash);
  const other = await call(h, "staffEdit", ["u3", { 비밀번호초기화: true }], "chk_boss");
  check("다른 사람(둘째 대표) 비밀번호 초기화는 됨", other.result?.ok === true && !store.check_user.find((u: any) => u.id === "u3").pw_hash, other);
}
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
