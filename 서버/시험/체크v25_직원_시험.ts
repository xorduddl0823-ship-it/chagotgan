// 체크 서버 v25 시험 — 직원 권한 창구 (staffList · staffAdd · staffEdit) · 가짜 수파베이스
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v25_직원_시험.ts
import { store } from "./fake_supabase_check.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v25.ts";
const far = new Date(Date.now() + 864e5).toISOString();
const BOSS = "01011110000", STAFF = "01022220000", NEW = "01033330000", OTHER = "01044440000";
Object.assign(store, {
  check_office: [{ id: "o1", code: "TEST", name: "시험검사소" }, { id: "o2", code: "SOMCAR", name: "솜카검사소" }],
  check_user: [
    { id: "u1", office_id: "o1", phone: BOSS, name: "대표", role: "owner", active: true, pw_hash: "x$y" },
    { id: "u2", office_id: "o1", phone: STAFF, name: "직원", role: "staff", active: true, pw_hash: "x$y" },
    { id: "u9", office_id: "o2", phone: OTHER, name: "남의직원", role: "staff", active: true, pw_hash: "x$y" },
  ],
  check_session: [
    { sid: "chk_boss", phone: BOSS, office_id: "o1", role: "owner", expires_at: far },
    { sid: "chk_staff", phone: STAFF, office_id: "o1", role: "staff", expires_at: far },
  ],
  wash_sessions: [], check_log: [],
  cgg_access: [{ phone: NEW, products: ["wash"], active: true }],
});
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(SRC);
const chk = H[0];
async function call(fn: string, args: unknown[] = [], token = "") {
  const r = await chk(new Request("http://x", { method: "POST", body: JSON.stringify({ shop: "", token, fn, args }) }));
  return await r.json();
}
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}

console.log("① 대표만");
check("직원이 staffAdd 를 부르면 거절", /대표님만/.test((await call("staffAdd", ["새사람", NEW, "직원"], "chk_staff")).__err ?? ""));
check("직원이 staffList 를 부르면 거절", /대표님만/.test((await call("staffList", [], "chk_staff")).__err ?? ""));
const list = (await call("staffList", [], "chk_boss")).result;
check("대표는 목록을 받음 (이 검사소 2명만)", Array.isArray(list) && list.length === 2, list);
check("휴대폰 가운데가 가려짐", list?.every((x: any) => /^010-\*\*\*\*-\d{4}$/.test(x.휴대폰)) && !JSON.stringify(list).includes(STAFF));
check("내 줄에 나: Y", list?.find((x: any) => x.이름 === "대표")?.나 === "Y");

console.log("② 넣기");
const add = await call("staffAdd", ["새사람", "010-3333-0000", "직원"], "chk_boss");
check("대표가 직원을 넣음", add.result?.ok === true, add);
const nu = store.check_user.find((u: any) => u.phone === NEW && u.office_id === "o1");
if (nu && !nu.id) nu.id = "u-new";   // 실제 표는 id 를 스스로 만들어요 (가짜 표는 못 만들어서 시험에서 붙임)
check("비밀번호 없이 들어감 (처음 로그인 때 정함)", !!nu && !nu.pw_hash && nu.role === "staff" && nu.active === true, nu);
const lg = await call("login", [NEW, "newpw12", "TEST"]);
check("그 번호로 처음 로그인하면 비밀번호가 정해지고 들어가짐", !!lg.result?.key, lg);
check("명단에 있던 번호는 check 가 더해짐 (wash 는 그대로)", JSON.stringify(store.cgg_access[0].products.sort()) === '["check","wash"]', store.cgg_access[0]);
check("같은 번호를 또 넣으면 거절", /이미/.test((await call("staffAdd", ["새사람", NEW, "직원"], "chk_boss")).__err ?? ""));
check("이상한 번호는 거절", /번호/.test((await call("staffAdd", ["x", "12345", "직원"], "chk_boss")).__err ?? ""));
check("권한은 대표·직원만", /권한/.test((await call("staffAdd", ["x", "01055550000", "admin"], "chk_boss")).__err ?? ""));
await call("staffAdd", ["명단없음", "01066660000", "직원"], "chk_boss");
check("명단에 없던 번호는 명단을 새로 만들지 않음", !store.cgg_access.some((a: any) => a.phone === "01066660000"));

console.log("③ 고치기");
const nid = nu.id;
await call("staffEdit", [nid, { 사용: "N" }], "chk_boss");
check("멈추면 그 사람 로그인이 끊김", !store.check_session.some((s: any) => s.phone === NEW));
check("멈추면 다시 로그인 못 함", !!(await call("login", [NEW, "newpw12", "TEST"])).__err);
check("멈추면 명단에서 check 가 빠짐 (다른 검사소에서 안 쓰므로)", JSON.stringify(store.cgg_access[0].products) === '["wash"]', store.cgg_access[0]);
await call("staffEdit", [nid, { 사용: "Y" }], "chk_boss");
check("다시 켜면 명단에 check 가 돌아옴", store.cgg_access[0].products.includes("check"));
await call("staffEdit", [nid, { 비밀번호초기화: true }], "chk_boss");
check("비밀번호 초기화하면 비어서 다음 로그인 때 다시 정함", !store.check_user.find((u: any) => u.id === nid).pw_hash);
const self = await call("staffEdit", ["u1", { 사용: "N" }], "chk_boss");
check("자기 자신은 멈출 수 없음", /자기 자신/.test(self.__err ?? ""), self);
check("자기 자신의 대표 권한을 뺄 수 없음", /자기 자신/.test((await call("staffEdit", ["u1", { 권한: "직원" }], "chk_boss")).__err ?? ""));
check("다른 검사소 직원은 고칠 수 없음", /이 검사소의 직원이 아닙니다/.test((await call("staffEdit", ["u9", { 사용: "N" }], "chk_boss")).__err ?? ""));
check("남의 검사소 직원은 그대로", store.check_user.find((u: any) => u.id === "u9").active === true);
await call("staffEdit", ["u2", { 권한: "대표" }], "chk_boss");
check("직원을 대표로 올림", store.check_user.find((u: any) => u.id === "u2").role === "owner");
check("권한이 바뀌면 그 사람 로그인이 끊김", !store.check_session.some((s: any) => s.sid === "chk_staff"));
check("직원 작업이 기록에 남음 (번호는 가려서)", store.check_log.some((l: any) => l.what === "직원 넣기") && !JSON.stringify(store.check_log).includes(NEW));

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
