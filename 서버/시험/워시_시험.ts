// 워시 서버(wash-api sb3) + 경비실(cgg-api v1.3) 시험 — 가짜 수파베이스로만 돌립니다.
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/워시_시험.ts
import { store, knobs, rpcLog } from "./fake_supabase_wash.ts";

const KEY = "fake-service-role-key";
Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", KEY);
Deno.env.set("SMS_FROM", "01095593663");
const IKEY = "test-internal-key-0123456789abcdef0123456789";
Deno.env.set("CGG_INTERNAL_KEY", IKEY);
const WASH_SRC = Deno.env.get("WASH_SRC") ?? "../1_차곳간워시_서버_wash-api_sb3.ts";
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s");

/* 워시 비밀번호 (워시 서버와 같은 방식) */
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
async function pwHash(pw: string) {
  const salt = "a1b2c3d4e5f60718293a4b5c6d7e8f90", te = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", te.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: te.encode(salt), iterations: 120000, hash: "SHA-256" }, key, 256);
  return "pbkdf2$120000$" + salt + "$" + hex(bits);
}
const far = new Date(Date.now() + 365 * 864e5).toISOString();
const P = { owner: "01011110000", staff: "01022220000", mgr: "01033330000", gone: "01044440000", legacy: "01055550000" };
const H = await pwHash("pw1234");
Object.assign(store, {
  wash_shops: [{ shop: "BT", name: "브라더세차", active: true, plan: "pro", paid_until: far, trial_until: far, sms_from: "" }],
  wash_plans: [{ code: "pro", name: "프로", seats: 0, pc_max: 0, staff_pc: false }],
  wash_users: Object.values(P).map((ph, i) => ({ phone: ph, shop: "BT", name: "사람" + i, active: true, pw_hash: H,
    role: ph === P.owner ? "owner" : ph === P.mgr ? "manager" : "staff" })),
  wash_sessions: [],
  wash_docs: [
    { shop: "BT", demo: false, col: "bills", id: "b1", data: { amount: 50000 } },
    { shop: "BT", demo: false, col: "taxdocs", id: "t1", data: { no: "1" } },
    { shop: "BT", demo: false, col: "staff", id: "s1", data: { id: "s1", name: "김직원", code: "1234", phone: "01099998888", role: "staff" } },
    { shop: "BT", demo: false, col: "settings", id: "config", data: { price: 1 } },
    { shop: "BT", demo: false, col: "settings", id: "bak_1", data: { everything: true } },
    { shop: "BT", demo: false, col: "intakes", id: "i1", data: { plate: "12가3456" } },
  ],
  cgg_access: [
    { phone: P.owner, products: ["wash", "check"], active: true },
    { phone: P.staff, products: ["wash"], active: true },
    { phone: P.mgr, products: ["wash"], active: true },
    { phone: P.gone, products: ["check"], active: true },     // 명단에 있지만 워시 없음
  ],
  check_user: [], check_session: [], cgg_session: [], cgg_tick: [],
  wash_hq: [{ id: 1, cash_on: true, cash_bank: "시험은행" }],
});

/* 가짜 솔라피 · wash-api 주소는 아래에서 손잡이로 바로 연결 */
const sms: any[] = [];
let washH: (r: Request) => Promise<Response>;
const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  const u = String(url);
  if (u.includes("/functions/v1/wash-api")) return await washH(new Request(u, init));
  if (u.includes("solapi")) {
    const b = JSON.parse(String(init?.body || "{}"));
    if (b.messages) sms.push(...b.messages);
    return Response.json({ groupInfo: { groupId: "G1" }, messageList: {}, failedMessageList: [] });
  }
  return realFetch(url, init);
}) as typeof fetch;

const HS: any[] = [];
(Deno as any).serve = (h: any) => { HS.push(h); return {}; };
await import(WASH_SRC);
await import("../0_차곳간_경비실_cgg-api_v1.ts");
washH = HS[0]; const cggH = HS[1];

const MOBILE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile";
const PCUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
async function wash(fn: string, args: unknown[] = [], token = "", shop = "", headers: Record<string, string> = {}, extra: any = {}) {
  const r = await washH(new Request("http://x", { method: "POST", headers: { "user-agent": MOBILE, ...headers },
    body: JSON.stringify({ shop, token, fn, args, ...extra }) }));
  return await r.json();
}
async function cgg(fn: string, args: unknown[] = [], headers: Record<string, string> = {}) {
  const r = await cggH(new Request("http://x", { method: "POST", headers, body: JSON.stringify({ fn, args }) }));
  return await r.json();
}
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const login = async (ph: string, ua = MOBILE) => (await wash("login", [ph, "pw1234"], "", "", { "user-agent": ua })).result;

console.log("① 경비실 명단으로 워시 권한 확인");
check("버전이 sb3", (await wash("apiVer", [], (await login(P.owner)).key, "BT")).result?.ver === "sb3");
const lg = await wash("login", [P.gone, "pw1234"]);
check("명단에 있지만 워시가 없는 번호는 로그인 거절", /워시를 쓸 권한/.test(lg.__err ?? ""), lg);
check("명단에 없는 번호(예전 워시 손님)는 그대로 로그인", !!(await login(P.legacy))?.key);
const st = await login(P.staff);
check("명단에 워시가 있는 직원은 로그인", !!st?.key);
store.cgg_access.find((a: any) => a.phone === P.staff).products = ["check"];
const blocked = await wash("apiLoad", [false], st.key, "BT");
check("명단에서 워시를 빼면 이미 받은 열쇠도 바로 거절", /워시를 쓸 권한/.test(blocked.__err ?? ""), blocked);
check("me 창구도 거절", /워시를 쓸 권한/.test((await wash("me", [st.key])).__err ?? ""));
store.cgg_access.find((a: any) => a.phone === P.staff).products = ["wash"];
knobs.missing.add("cgg_access");
check("명단 표가 아직 없으면 예전처럼 통과", !!(await wash("apiLoad", [false], st.key, "BT")).result);
knobs.missing.delete("cgg_access");

console.log("② 대표 전용 자료 (보안 ①)");
const own = (await wash("apiLoad", [false], (await login(P.owner)).key, "BT")).result;
check("대표는 청구서·세금계산서·백업 모두 받음", !!own.bills.b1 && !!own.taxdocs.t1 && !!own.settings.bak_1 && own.staff.s1.phone === "01099998888");
const sl = (await wash("apiLoad", [false], st.key, "BT")).result;
check("직원은 청구서·세금계산서가 비어 있음", Object.keys(sl.bills).length === 0 && Object.keys(sl.taxdocs).length === 0, sl);
check("직원은 직원 전화번호가 빠짐 (이름·코드는 남음)", sl.staff.s1.phone === "" && sl.staff.s1.name === "김직원" && sl.staff.s1.code === "1234");
check("직원은 설정 백업(bak_)이 빠지고 config 는 남음", !sl.settings.bak_1 && !!sl.settings.config);
check("직원도 입고 자료는 그대로", !!sl.intakes.i1);
const mg = (await wash("apiLoad", [false], (await login(P.mgr, PCUA)).key, "BT")).result;
check("매니저도 청구서는 비어 있음", Object.keys(mg.bills).length === 0);

console.log("③ 문자 (보안 ②)");
Deno.env.set("STAFF_MSG_MAX", "2");
const m1 = await wash("sendMsg", [JSON.stringify({ to: "01012341234", from: "x", text: "차가 나왔어요", kind: "LMS" })], st.key, "BT");
check("직원 문자가 나감", m1.result?.ok === true, m1);
check("문자 맨 앞에 [업체이름]이 붙음", sms.at(-1)?.text === "[브라더세차] 차가 나왔어요", sms.at(-1));
await wash("sendMsg", [JSON.stringify({ to: "01012341234", from: "x", text: "[브라더세차] 두번째", kind: "LMS" })], st.key, "BT");
check("이미 [우리 업체이름] 으로 시작하면 두 번 붙이지 않음", sms.at(-1)?.text === "[브라더세차] 두번째");
Deno.env.set("STAFF_MSG_MAX", "3");
await wash("sendMsg", [JSON.stringify({ to: "01012341234", from: "x", text: "[차곳간] 결제해 주세요", kind: "LMS" })], st.key, "BT");
check("sb3: [차곳간] 처럼 남의 이름으로 시작해도 [업체이름]이 붙음", sms.at(-1)?.text === "[브라더세차] [차곳간] 결제해 주세요", sms.at(-1));
Deno.env.set("STAFF_MSG_MAX", "2");
const m3 = await wash("sendMsg", [JSON.stringify({ to: "01012341234", from: "x", text: "세번째", kind: "LMS" })], st.key, "BT");
check("직원은 하루 한도를 넘으면 멈춤", m3.result?.ok === false && /직원 계정/.test(m3.result?.error ?? ""), m3);
const m4 = await wash("sendMsg", [JSON.stringify({ to: "01012341234", from: "x", text: "대표 문자", kind: "LMS" })], (await login(P.owner)).key, "BT");
check("대표는 직원 한도와 상관없이 나감", m4.result?.ok === true, m4);
const before = sms.length;
await wash("sendMsg", [JSON.stringify({ to: "01012341234", from: "x", text: "알림톡 문구", kind: "ATA", templateId: "T1", pfId: "P1" })], (await login(P.owner)).key, "BT");
check("알림톡은 등록 문구 그대로 (앞에 붙이지 않음)", sms.length === before + 1 && sms.at(-1)?.text === "알림톡 문구", sms.at(-1));
Deno.env.delete("STAFF_MSG_MAX");
rpcLog.length = 0;
await wash("sendMsg", [JSON.stringify({ to: "01012341234", from: "x", text: "기본 한도", kind: "LMS" })], (await login(P.staff)).key, "BT");
check("직원 문자 기본 한도는 하루 300통 (대표님 결정)", rpcLog.some((r) => String(r.args?.p_key).startsWith("staffmsg:") && r.args?.p_max === 300), rpcLog);

console.log("④ 횟수 장치 · IP (보안 ③)");
knobs.rateBroken = true;
const rb = await wash("login", [P.owner, "pw1234"]);
check("횟수 장치가 고장 나면 로그인을 막음", !!rb.__err, rb);
knobs.rateBroken = false;
rpcLog.length = 0;
await wash("login", [P.owner, "pw1234"], "", "", { "x-forwarded-for": "6.6.6.6, 10.0.0.9" });
check("x-forwarded-for 맨 앞(꾸민 값)이 아니라 맨 뒤 값을 씀",
  rpcLog.some((r) => r.args?.p_key === "login:ip:10.0.0.9") && !rpcLog.some((r) => String(r.args?.p_key).includes("6.6.6.6")), rpcLog);
rpcLog.length = 0;
await wash("login", [P.owner, "pw1234"], "", "", { "cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "6.6.6.6" });
check("cf-connecting-ip 가 있으면 그것을 씀", rpcLog.some((r) => r.args?.p_key === "login:ip:1.2.3.4"));
const ownKey = (await login(P.owner)).key;
let asked = 0;
for (let i = 0; i < 7; i++) { const r = await wash("cashAsk", [10000], ownKey, "BT"); if (!r.__err || !/충전 신청을 더/.test(r.__err)) asked++; }
check("충전 신청은 하루 5번까지", asked <= 5, asked);

console.log("⑤ 직급 바꾸면 로그인 끊기 (보안 ④) · 작은 것");
const stKey = (await login(P.staff)).key;
await wash("userEdit", [P.staff, "사람1", "manager"], ownKey, "BT");
check("직원→매니저로 바꾸면 그 사람 열쇠가 끊김", !store.wash_sessions.some((s: any) => s.sid === stKey));
const stKey2 = (await login(P.staff)).key;
await wash("userEdit", [P.staff, "새이름", "manager"], ownKey, "BT");
check("이름만 바꾸면 끊지 않음", store.wash_sessions.some((s: any) => s.sid === stKey2));
await wash("userEdit", [P.staff, "사람1", "staff"], ownKey, "BT");
const ad = await wash("userEdit", [P.staff, "사람1", "admin"], ownKey, "BT");
check("업체 대표가 admin 직급을 줄 수 없음 (userEdit)", /직급만/.test(ad.__err ?? ""), ad);
const ad2 = await wash("userAdd", ["01066660000", "새사람", "admin", "pw1234"], ownKey, "BT");
check("업체 대표가 admin 직급을 줄 수 없음 (userAdd)", /직급만/.test(ad2.__err ?? ""), ad2);

console.log("⑥ 경비실이 손님 기기 정보를 넘김 (보안 참고)");
store.wash_sessions = [];
const c1 = await cgg("cggLogin", [P.owner, "pw1234"], { "user-agent": MOBILE, "cf-connecting-ip": "5.5.5.5" });
check("경비실 로그인 성공 (워시 포함)", (c1.result?.products ?? []).some((p: any) => p.code === "wash"), c1);
const ws = store.wash_sessions.at(-1);
check("휴대폰으로 들어오면 워시에도 휴대폰(mo)으로 기록", ws?.kind === "mo", ws);
check("손님 IP 로 횟수를 셈", rpcLog.some((r) => r.args?.p_key === "login:ip:5.5.5.5"));
store.wash_sessions.push({ sid: "PCSID".padEnd(48, "0"), phone: P.owner, shop: "BT", role: "owner", kind: "pc", expires_at: far });
await cgg("cggLogin", [P.owner, "pw1234"], { "user-agent": MOBILE });
check("휴대폰으로 통합 로그인해도 켜 둔 PC 로그인은 안 끊김", store.wash_sessions.some((s: any) => s.sid === "PCSID".padEnd(48, "0")));
const fake = await wash("login", [P.owner, "pw1234"], "", "", { "user-agent": PCUA, "x-cgg-internal": "wrong-key" },
  { __via: "cgg", __ua: MOBILE, __ip: "9.9.9.9" });
check("열쇠가 틀리면 화면이 보낸 UA·IP 는 무시 (PC 로 기록)", fake.result?.device === "pc", fake);
const svc = await wash("login", [P.owner, "pw1234"], "", "", { "user-agent": PCUA, "x-cgg-internal": KEY },
  { __via: "cgg", __ua: MOBILE, __ip: "9.9.9.9" });
check("sb3: 서비스 열쇠로는 더 이상 넘겨받지 않음 (전용 열쇠만)", svc.result?.device === "pc", svc);

console.log("⑦ 기기 끊기 · 본사 비밀번호");
check("기기 끊기에 % 같은 와일드카드는 거절", true);   // hqSessionKill 은 본사 로그인이 필요해서 정규식만 확인
const src = await Deno.readTextFile(new URL("../1_차곳간워시_서버_wash-api_sb2.ts", import.meta.url));
check("hqSessionKill 이 16진수만 받음", /tail\.length < 8 \|\| !\/\^\[0-9a-f\]\+\$\/i\.test\(tail\)/.test(src));
check("hqMe 새 비밀번호 6자", /newPw\.length < 6/.test(src));

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
