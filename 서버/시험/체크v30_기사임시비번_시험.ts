// 체크 서버 v30 시험 — 본사가 기사 비밀번호를 임시로 바꾸면(must_change) 비밀번호 바꾸기 전까지 다른 기사 기능은 막힘 (가짜 수파베이스)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v30_기사임시비번_시험.ts
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
Object.assign(store, {
  check_office: [{ id: "o1", code: "SOMCAR", name: "솜카검사소" }],
  check_user: [], check_session: [], cgg_access: [], wash_sessions: [],
  check_deliv_driver: [
    { id: "d1", office_id: "o1", name: "임시기사", pw_hash: await pwHash("tmp-pass-10"), token: null, active: true, must_change: true },
    { id: "d2", office_id: "o1", name: "보통기사", pw_hash: await pwHash("normal-pw"), token: null, active: true },
  ],
  check_deliv_fail: [], check_deliv_signup: [], check_deliv_conf: [], check_deliv_dest: [], check_dealer: [], check_deliv: [],
  wash_hq: [{ id: 1, ata_cfg: {} }],
});
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v30.ts");
const call = async (fn: string, args: unknown[] = []) =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop: "", token: "", fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
check("ping 이 v30 이상", /v3[0-9]/.test((await call("ping")).result?.ver ?? ""));
const l1 = await call("deliv_login", ["임시기사", "tmp-pass-10"]);
check("임시 비밀번호로 로그인은 됨 + mustChange 표시", !!l1.result?.token && l1.result.mustChange === true, l1);
const b1 = await call("deliv_boot", [l1.result?.token]);
check("바꾸기 전에는 다른 기능 막힘 (__need: pwchange)", b1.__need === "pwchange" && /임시 비밀번호/.test(b1.__err ?? ""), b1);
check("같은 비밀번호로는 못 바꿈", !!(await call("deliv_changePw", [l1.result?.token, "tmp-pass-10", "tmp-pass-10"])).__err);
const c1 = await call("deliv_changePw", [l1.result?.token, "tmp-pass-10", "my-new-pw1"]);
check("비밀번호 바꾸기는 됨 · 표시 지워짐", !!c1.result?.token && store.check_deliv_driver[0].must_change === false, c1);
check("바꾼 뒤에는 다른 기능 됨", !(await call("deliv_boot", [c1.result.token])).__err);
const l2 = await call("deliv_login", ["보통기사", "normal-pw"]);
check("표시 칸이 없는 기사는 예전처럼", l2.result?.mustChange === false && !(await call("deliv_boot", [l2.result.token])).__err, l2);
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
