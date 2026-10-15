// 워시 sb11 시험 — 체크 열쇠(chk_)로 결제·캐시 창구: 검사소 대표만 · 이어 둔 워시 지갑으로만 · 본사만 잇기 (가짜 수파베이스)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/체크_결제지갑_시험.ts
import { knobs, store } from "./fake_supabase_wash.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s");
Deno.env.set("SMS_FROM", "0212345678");
Deno.env.set("TOSS_SECRET_KEY", "test_sk_fake");
const far = new Date(Date.now() + 864e5).toISOString(), past = new Date(Date.now() - 864e5).toISOString();
const ADM = "b".repeat(48);
const CO = "chk_" + "o".repeat(40), CS = "chk_" + "s".repeat(40), CX = "chk_" + "x".repeat(40), CN = "chk_" + "n".repeat(40), CE = "chk_" + "e".repeat(40);
Object.assign(store, {
  wash_hq: [{ id: 1, ata_cfg: {}, pg_on: true, pg_client_key: "test_ck_fake", cash_on: true }],
  wash_shops: [{ shop: "TY", name: "티와이컴퍼니", active: true, plan: "pro", paid_until: far.slice(0, 10), owner_phone: "01011112222" },
               { shop: "BT", name: "브라더세차", active: true, plan: "pro", paid_until: far.slice(0, 10), owner_phone: "01077778888" }],
  wash_plans: [{ code: "pro", name: "프로", price: 30000 }],
  wash_sessions: [{ sid: ADM, phone: "01000000000", shop: "ADMIN", role: "admin", expires_at: far }],
  check_office: [{ id: "o1", code: "TYC", name: "티와이검사소", wallet_shop: "TY" }, { id: "o2", code: "NEW", name: "새검사소", wallet_shop: null }],
  check_user: [
    { id: "u1", office_id: "o1", phone: "01011112222", role: "owner", active: true },
    { id: "u2", office_id: "o1", phone: "01033334444", role: "staff", active: true },
    { id: "u3", office_id: "o2", phone: "01055556666", role: "owner", active: true },
    { id: "u4", office_id: "o1", phone: "01099990000", role: "owner", active: true },
  ],
  check_session: [
    { sid: CO, phone: "01011112222", office_id: "o1", role: "owner", expires_at: far },
    { sid: CS, phone: "01033334444", office_id: "o1", role: "staff", expires_at: far },
    { sid: CN, phone: "01055556666", office_id: "o2", role: "owner", expires_at: far },
    { sid: CX, phone: "01099990000", office_id: "o1", role: "owner", expires_at: far },
    { sid: CE, phone: "01011112222", office_id: "o1", role: "owner", expires_at: past },
  ],
  cgg_access: [{ phone: "01099990000", products: ["wash"], active: true }],     // 명단에 있는데 체크 권한 없음
  wash_pay_order: [], wash_payments: [], wash_otp: [], wash_viewcode: [], wash_docs: [], wash_cash_log: [],
});
knobs.cash.TY = 5000;
globalThis.fetch = (async (url: string | URL) => {
  if (String(url).includes("solapi")) return Response.json({});
  throw new Error("예상 못 한 주소 " + url);
}) as typeof fetch;
console.error = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(Deno.env.get("WASH_SRC") ?? "../1_차곳간워시_서버_wash-api_sb11.ts");
const call = async (fn: string, args: unknown[], token = "", shop = "") =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop, token, fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}

console.log("① 체크 대표가 체크 열쇠로 결제 창구를 씀 → 이어 둔 지갑(TY)");
const due = await call("payDue", [], CO, "TYC");
check("payDue: 지갑 업체의 요금제·캐시", due.result?.ok && due.result.planName === "프로" && due.result.cash === 5000, due);
const ci = await call("cashInfo", [], CO, "TYC");
check("cashInfo 됨", ci.result?.ok === true, ci);
const ps = await call("payStart", ["plan", 0, 0], CO, "TYC");
check("payStart: 주문이 지갑 업체(TY)로 만들어짐 · v2 값", ps.result?.ok && store.wash_pay_order.at(-1)?.shop === "TY" && ps.result.sdk === "v2", ps);
const pm = await call("payMine", [], CO, "TYC");
check("payMine: 지갑 업체 주문만", (pm.result?.orders ?? []).length === 1, pm);
check("화면이 보낸 검사소 코드가 없으면 그 사람 세션의 검사소", (await call("payDue", [], CO, "")).result?.planName === "프로");

console.log("② 막히는 경우");
check("검사소 직원(staff)은 결제 못 함", /대표만/.test((await call("payStart", ["plan", 0, 0], CS, "TYC")).__err ?? ""));
check("경비실 명단에 체크 권한이 없으면 거절", /권한이 없습니다/.test((await call("payDue", [], CX, "TYC")).__err ?? ""));
check("만료된 체크 열쇠는 거절", /로그인/.test((await call("payDue", [], CE, "TYC")).__err ?? ""));
check("남의 검사소 코드를 보내면 거절", /권한이 없습니다/.test((await call("payDue", [], CN, "TYC")).__err ?? ""));
const nl = await call("payStart", ["plan", 0, 0], CN, "NEW");
check("지갑이 안 이어진 검사소는 «준비 중» · 주문 안 만듦", nl.result?.notLinked === true && store.wash_pay_order.length === 1, nl);
check("결제 창구 말고 다른 워시 기능은 체크 열쇠로 못 부름", !!(await call("apiLoad", [], CO, "TYC")).__err);
check("자동 결제 창구도 체크 열쇠로는 못 부름 (지금은 워시만)", !!(await call("billStart", [], CO, "TYC")).__err);
check("본사 기능도 못 부름", !!(await call("hqCheckWallet", ["NEW", "TY"], CO, "TYC")).__err);

console.log("③ 워시 화면 카드 결제 payStart (홈페이지 가입 payStart 에 가려져 있던 것)");
store.wash_sessions.push({ sid: "w".repeat(48), phone: "01077778888", shop: "BT", role: "owner", expires_at: far });
const wps = await call("payStart", ["cash", 10000, 0], "w".repeat(48), "BT");
check("로그인한 워시 대표의 payStart → 카드 주문이 만들어짐", wps.result?.ok === true && !!wps.result.orderId && store.wash_pay_order.at(-1)?.shop === "BT", wps);
const hp = await call("payStart", ["01012345678", "새업체", "pro"]);
const sbOld = /sb11/.test(Deno.env.get("WASH_SRC") ?? "sb11");
check("열쇠 없는 홈페이지 payStart 는 가입 쪽으로 감 (sb12 부터는 «로그인 먼저» 안내로 꺼짐)",
  hp.result?.ok === true && (sbOld ? hp.result.orderId?.startsWith("ord_") : hp.result.login === true), hp);
console.log("④ 지갑 잇기 (본사만)");
check("없는 업체로는 못 이음", !!(await call("hqCheckWallet", ["NEW", "NOPE"], ADM, "ADMIN")).__err);
check("본사 계정(ADMIN)을 지갑으로 못 씀", !!(await call("hqCheckWallet", ["NEW", "ADMIN"], ADM, "ADMIN")).__err);
const lk = await call("hqCheckWallet", ["NEW", "BT"], ADM, "ADMIN");
check("본사가 잇기", lk.result?.ok && store.check_office.find((o: any) => o.code === "NEW").wallet_shop === "BT", lk);
check("이은 뒤에는 그 검사소 대표가 결제 가능", (await call("payDue", [], CN, "NEW")).result?.planName === "프로");
const ls = await call("hqCheckWallets", [], ADM, "ADMIN");
check("목록", (ls.result?.offices ?? []).length === 2, ls);
await call("hqCheckWallet", ["NEW", ""], ADM, "ADMIN");
check("끊으면 다시 «준비 중»", (await call("payDue", [], CN, "NEW")).result?.notLinked === true);

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
