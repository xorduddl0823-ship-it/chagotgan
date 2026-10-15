// 워시 sb13 시험 — 홈페이지 첫 결제: 가입(결제 대기) → 체험판(예시 칸·3번·AI 3번) → 결제 → 고정한 요금제로 열림 · 관리 결제 대기 목록 · 돌아 들어오는 길 막힘 · sb12 낮음 (가짜 수파베이스 · 가짜 토스)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/홈페이지_첫결제_시험.ts
import { knobs, rpcLog, store } from "./fake_supabase_wash.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s");
Deno.env.set("SMS_FROM", "0212345678");
Deno.env.set("TOSS_SECRET_KEY", "test_sk_fake");
const far = new Date(Date.now() + 864e5).toISOString();
const ADM = "b".repeat(48);
const NEW = "01033330001", NEW2 = "01033330002";
Object.assign(store, {
  wash_hq: [{ id: 1, ata_cfg: {}, open_signup: true, signup_cfg: {}, pg_on: true, pg_client_key: "test_ck", admin_phone: "01000009999" }],
  wash_plans: [{ code: "pro", name: "프로", price: 30000, active: true }, { code: "big", name: "큰", price: 90000, active: true },
               { code: "secret", name: "숨김", price: 1000, active: false }, { code: "zero", name: "공짜", price: 0, active: true }],
  wash_shops: [{ shop: "ADMIN", name: "본사", active: true }],
  wash_users: [{ phone: "01000000000", shop: "ADMIN", role: "admin", active: true }],
  wash_sessions: [{ sid: ADM, phone: "01000000000", shop: "ADMIN", role: "admin", expires_at: far }],
  wash_otp: [], wash_invites: [], wash_agreements: [], wash_payments: [], wash_pay_order: [], wash_docs: [], wash_rev: [],
  wash_viewcode: [], cgg_access: [], check_user: [{ office_id: "o1", phone: NEW, role: "staff", active: true }],
  check_office: [{ id: "o1", code: "TYC", name: "티와이", wallet_shop: null }], check_session: [], hq_audit: [], wash_trial_use: [],
});
const sms: any[] = [];
let smsFail = false;
const tossDone: Record<string, any> = {};
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  const u = String(url);
  if (u.includes("solapi")) { if (smsFail) throw new Error("끊김"); sms.push(JSON.parse(String(init?.body)).messages[0]); return Response.json({}); }
  if (u.endsWith("/v1/payments/confirm")) {
    const b = JSON.parse(String(init?.body)); tossDone[b.orderId] = 1;
    return Response.json({ status: "DONE", orderId: b.orderId, paymentKey: b.paymentKey, totalAmount: b.amount, method: "카드" });
  }
  if (u.includes("anthropic")) return new Response("{}", { status: 500 });
  throw new Error("예상 못 한 주소 " + u);
}) as typeof fetch;
console.error = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(Deno.env.get("WASH_SRC") ?? "../1_차곳간워시_서버_wash-api_sb13.ts");
let ipN = 0;
const call = async (fn: string, args: unknown[], token = "", shop = "", ip = "") =>
  await (await H[0](new Request("http://x", { method: "POST", headers: { "x-forwarded-for": ip || "10.0.0." + (++ipN) },
    body: JSON.stringify({ shop, token, fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
async function join(phone: string, plan: string, ip = "") {
  sms.length = 0;
  const c = await call("sendCode", [phone, "signup"], "", "", ip);
  const code = (sms.at(-1)?.text.match(/\d{6}/) ?? [""])[0];
  await call("verifyCode", [phone, code]);
  const r = await call("signup", [phone, "새세차", "wash", "pass-1234", "김대표", plan], "", "", ip);
  return { c, r };
}

console.log("① 가입 — 요금제 고르기");
check("숨은 요금제는 거절", /고를 수 없는/.test((await join(NEW, "secret")).r.__err ?? ""));
check("0원 요금제는 거절", /고를 수 없는/.test((await join(NEW, "zero")).r.__err ?? ""));
const j = await join(NEW, "pro");
const K = j.r.result?.key, SH = j.r.result?.shop;
check("공개 요금제 → 결제 대기로 가입 · 바로 로그인 열쇠", !!K && j.r.result.payWait === true && j.r.result.joinPlan === "pro", j.r);
const shopRow = () => store.wash_shops.find((x: any) => x.shop === SH);
check("업체: pay_wait · join_plan", shopRow()?.pay_wait === true && shopRow()?.join_plan === "pro");
const li = await call("lockInfo", [], K, SH);
check("lockInfo = pay (결제 이어 하기)", li.result?.state === "pay" && li.result.joinPlan === "pro", li);

console.log("② 결제 대기: 막히는 것 (PAYWAIT_OK 밖)");
for (const [fn, args] of [["sendMsg", ['{"to":"01000000001","from":"x","text":"hi"}']], ["cashAsk", [10000]], ["paidSay", []],
  ["viewBill", [{ name: "x", month: "2026-10" }]], ["pbIssue", [{}]], ["cashInfo", []], ["billStart", []], ["shopBiz", []]] as [string, unknown[]][]) {
  const x = await call(fn, args, K, SH);
  check(`${fn} 막힘 (__lock pay)`, x.__lock?.state === "pay", x);
}
check("월 요금이 아닌 결제(캐시 충전) 막힘", (await call("payStart", ["cash", 10000, 0], K, SH)).__lock?.state === "pay");

console.log("③ 체험판: 예시 칸으로만");
rpcLog.length = 0;
await call("apiSet", ["intakes", "i1", JSON.stringify({ plate: "12가3456" }), false], K, SH);
await call("apiDel", ["intakes", "i1", false], K, SH);
check("apiSet·apiDel(demo=false) 도 예시 칸에 씀", rpcLog.filter((x) => x.fn === "wash_write").length === 2 && rpcLog.filter((x) => x.fn === "wash_write").every((x) => x.args.p_demo === true), rpcLog);
rpcLog.length = 0;
await call("apiLoad", [false], K, SH);
check("apiLoad(false) 도 예시 칸을 읽음", rpcLog.some((x) => x.fn === "wash_load" && x.args.p_demo === true) && !rpcLog.some((x) => x.fn === "wash_load" && x.args.p_demo === false), rpcLog);
check("한 번에 51줄은 막힘", !!(await call("apiSetMany", [Array.from({ length: 51 }, (_, i) => ({ col: "x", id: "r" + i, data: "1" }))], K, SH)).__err);
check("큰 자료는 막힘", !!(await call("apiSet", ["intakes", "big", "x".repeat(30000)], K, SH)).__err);

console.log("④ 3번 세기 · AI 3번");
check("모르는 기능 이름은 거절", !!(await call("trialUse", ["hack"], K, SH)).__err);
const t = [];
for (let i = 0; i < 4; i++) t.push((await call("trialUse", ["intake"], K, SH)).result);
check("기능마다 3번 · 4번째 막힘", t[0].ok && t[2].ok && t[2].left === 0 && t[3].ok === false, t);
check("다른 기능은 따로 셈", (await call("trialUse", ["release"], K, SH)).result?.left === 2);
const ai = [];
for (let i = 0; i < 4; i++) ai.push(await call("aiJson", ["p", "b64"], K, SH));
check("AI 는 3번까지 (4번째는 결제 안내)", ai.slice(0, 3).every((x) => !x.__lock) && ai[3].__lock?.state === "pay", ai.map((x) => x.__err));

console.log("⑤ 돌아 들어오는 길도 같은 규칙");
store.wash_users.push({ phone: "01033339999", shop: SH, role: "staff", active: true });
store.wash_sessions.push({ sid: "s".repeat(48), phone: "01033339999", shop: SH, role: "staff", expires_at: far });
check("직원 열쇠로도 sendMsg 막힘", (await call("sendMsg", ['{"to":"01000000001","text":"x"}'], "s".repeat(48), SH)).__lock?.state === "pay");
check("직원 열쇠로 직원 관리(UFN) 막힘", (await call("userList", [], "s".repeat(48), SH)).__lock?.state === "pay");
store.check_office[0].wallet_shop = SH;
store.check_user.push({ office_id: "o1", phone: "01077770000", role: "owner", active: true });
store.check_session.push({ sid: "chk_" + "w".repeat(40), phone: "01077770000", office_id: "o1", role: "owner", expires_at: far });
const CK = "chk_" + "w".repeat(40);
check("체크 열쇠로 cashAsk 막힘 (지갑이 결제 대기)", (await call("cashAsk", [10000], CK, "TYC")).__lock?.state === "pay");
check("체크 열쇠로 캐시 충전 결제 막힘", (await call("payStart", ["cash", 10000, 0], CK, "TYC")).__lock?.state === "pay");
check("체크 화면 lockInfo 도 pay", (await call("lockInfo", [], CK, "TYC")).result?.state === "pay");
store.check_office[0].wallet_shop = null;

console.log("⑥ 결제 — 주문에 고정한 요금제로 열림 (바꿔치기 막기)");
check("숨은 요금제로 바꾸기 거절", !!(await call("joinPlanSet", ["secret"], K, SH)).__err);
const ps = await call("payStart", ["plan", 999, 999], K, SH);
const od = store.wash_pay_order.find((o: any) => o.order_id === ps.result?.orderId);
if (od) od.created_at = new Date().toISOString();       // 가짜 표는 만든 시각을 안 채움
check("주문: 프로 33,000 · 요금제 고정 · who=join · 캐시 안 씀", od?.amount === 33000 && od.plan_code === "pro" && od.who === "join:" + NEW && od.use_cash === 0, od);
await call("joinPlanSet", ["big"], K, SH);
check("결제 전에 큰 요금제로 바꿈", shopRow().join_plan === "big");
const pc = await call("payConfirm", [ps.result.orderId, "pk_1", 33000], K, SH);
check("결제 성공 → 결제 대기 풀림", pc.result?.ok && shopRow().pay_wait === false, { pc, row: shopRow() });
check("싼 값에 비싼 요금제 안 열림 (주문의 프로로)", shopRow().plan === "pro", shopRow());
check("이용기간 +30일", !!shopRow().paid_until);
check("예시 칸 비움", !store.wash_docs.some((d: any) => d.shop === SH && d.demo === true));
check("출입 명단: 체크 쓰는 번호라 wash+check", JSON.stringify(store.cgg_access.find((c: any) => c.phone === NEW)?.products) === '["wash","check"]', store.cgg_access);
check("이제 lockInfo 는 ok", (await call("lockInfo", [], K, SH)).result?.state === "ok");
check("결제 뒤 trialUse 는 제한 없음", (await call("trialUse", ["intake"], K, SH)).result?.left === -1);
const pr = await call("hqPayResults", ["", "", ""], ADM, "ADMIN");
const row = (pr.result?.list ?? []).find((x: any) => x.orderId === ps.result.orderId);
check("관리 결제 결과: 꼬리표 홈페이지 · 첫 결제", row?.tag === "홈페이지" && row.first === true, row);
store.pay_billing = [{ shop: "A", status: "on" }, { shop: "B", status: "off" }, { shop: "C", status: "on" }];
check("관리 결제 요약: 자동 결제 켠 업체 수 = 2", (await call("hqPayResults", ["", "", ""], ADM, "ADMIN")).result?.billingShops === 2);

console.log("⑦ 관리 — 결제 대기 목록 · 지우기");
const j2 = await join(NEW2, "pro");
const SH2 = j2.r.result?.shop, K2 = j2.r.result?.key;
const AI2 = await call("aiJson", ["p", "b64"], K2, SH2);
check("같은 대표 번호가 아니면 AI 새로 3번 (다른 번호)", !AI2.__lock);
const pw = await call("hqPayWait", [], ADM, "ADMIN");
check("결제 대기 목록에 보임", (pw.result?.list ?? []).some((x: any) => x.shop === SH2) && !(pw.result.list).some((x: any) => x.shop === SH), pw);
const ps2 = await call("payStart", ["plan", 0, 0], K2, SH2);
check("ready 주문이 있으면 못 지움", /주문이 있어/.test((await call("hqPayWaitDel", [SH2], ADM, "ADMIN")).__err ?? ""));
store.wash_pay_order.find((o: any) => o.order_id === ps2.result.orderId).status = "failed";
const del = await call("hqPayWaitDel", [SH2], ADM, "ADMIN");
check("지움: 업체·계정·로그인 · 주문은 남김 · 기록", del.result?.ok && !store.wash_shops.some((x: any) => x.shop === SH2) &&
  !store.wash_users.some((x: any) => x.shop === SH2) && !store.wash_sessions.some((x: any) => x.shop === SH2) &&
  store.wash_pay_order.some((o: any) => o.shop === SH2) && store.hq_audit.some((a: any) => a.action === "payWaitDel" && a.result === "ok"), del);
check("이용 중 업체는 여기서 못 지움", !!(await call("hqPayWaitDel", [SH], ADM, "ADMIN")).__err);
const j3 = await join(NEW2, "pro");
const ai3 = await call("aiJson", ["p", "b64"], j3.r.result?.key, j3.r.result?.shop);
check("지우고 다시 가입해도 그 번호 AI 횟수는 남음 (3번 중 1번 쓴 상태 → 2번 남음)", !ai3.__lock && store.wash_trial_use.find((x: any) => x.key === "ai:phone:" + NEW2)?.n === 2, store.wash_trial_use);

/* 보안 낮음 ①③: 주문에 요금제가 없으면 열지 않고, 목록에 «결제된 주문 있음» */
const SH3 = j3.r.result?.shop, K3 = j3.r.result?.key;
const ps3 = await call("payStart", ["plan", 0, 0], K3, SH3);
const od3 = store.wash_pay_order.find((o: any) => o.order_id === ps3.result.orderId); delete od3.plan_code;
await call("payConfirm", [ps3.result.orderId, "pk_3", 33000], K3, SH3);
check("주문에 고정 요금제가 없으면 열지 않음 (결제 대기 그대로)", store.wash_shops.find((x: any) => x.shop === SH3)?.pay_wait === true);
check("관리 결제 대기 목록에 «결제된 주문 있음»", (await call("hqPayWait", [], ADM, "ADMIN")).result?.list?.find((x: any) => x.shop === SH3)?.paidOrder === true);
console.log("⑧ 자유 가입 한도 · 스위치");
let blockedAt = 0;
for (let i = 1; i <= 7 && !blockedAt; i++) { const x = await call("sendCode", ["0104444000" + i, "signup"], "", "", "9.9.9.9"); if (x.__err) blockedAt = i; }
check("같은 IP 가입 인증은 하루 5번", blockedAt === 6, blockedAt);
store.wash_hq[0].open_signup = false;
check("스위치를 끄면 가입 코드 없는 번호는 거절", !!(await call("sendCode", ["01055550000", "signup"])).__err);
const hs = await call("hqSignup", [{ on: true, perIp: 2 }], ADM, "ADMIN");
check("관리에서 켜기·한도 바꾸기 + 기록", hs.result?.on === true && store.wash_hq[0].signup_cfg.perIp === 2 && store.hq_audit.some((a: any) => a.action === "signupCfg"), hs);

console.log("⑨ sb12 보안 낮음");
store.wash_users.push({ phone: "01088880000", shop: SH, role: "staff", active: true });
knobs.missing.add("hq_audit");
const nb = await call("hqPersonAct", ["01088880000", "kick", "wash"], ADM, "ADMIN");
check("기록을 못 남기면 바꾸지 않음", /기록을 남기지 못해/.test(nb.__err ?? ""), nb);
knobs.missing.delete("hq_audit");
store.check_deliv_driver = [{ id: "d9", office_id: "o1", name: "기사", tel: "01088880000", active: true, pw_hash: "x" }];
smsFail = true;
const dr = await call("hqPersonAct", ["01088880000", "pwReset", "driver:d9"], ADM, "ADMIN");
smsFail = false;
check("기사 임시 비밀번호 문자가 실패하면 «다시 눌러 주세요»", dr.result?.sent === false && /다시/.test(dr.result.note), dr);

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
