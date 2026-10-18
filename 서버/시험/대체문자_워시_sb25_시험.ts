// 워시 서버 sb25 시험 — 총괄 «대체 문자 전부»: 알림톡 코드·채널 ID 가 없어도 결제완료·충전완료·자동결제등록·자동결제실패가
//   확정 대체 문구(알림톡/12_전체_점검표.md ⑦)로 문자 발송 · 보낸 기록 via 로 알림톡/문자 구분 · 환불 판단 하나로
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/대체문자_워시_sb25_시험.ts
// WASH_SRC 에 sb24 를 넣으면 «코드 없음» 시험이 실패해야 합니다(예전엔 안 나감).
import { knobs, store } from "./fake_supabase_wash.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s");
Deno.env.set("SMS_FROM", "0212345678");                 // 채널 ID(PF_ID) 는 일부러 안 넣음
Deno.env.set("TOSS_SECRET_KEY", "test_sk_fake");
Deno.env.set("PAY_ENC_KEY", btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))));
const far = new Date(Date.now() + 864e5).toISOString();
const ADM = "b".repeat(48), OWN = "c".repeat(48);
const kst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const TODAY = kst();
Object.assign(store, {
  wash_hq: [{ id: 1, ata_cfg: {}, cron_key: "CRONKEY", billing_on: true }],
  wash_shops: [{ shop: "BT", name: "브라더세차", active: true, plan: "pro", paid_until: far, trial_until: far, owner_phone: "01077778888" }],
  wash_users: [],
  wash_sessions: [
    { sid: ADM, phone: "01000000000", shop: "ADMIN", role: "admin", expires_at: far },
    { sid: OWN, phone: "01077778888", shop: "BT", role: "owner", expires_at: far },
  ],
  wash_payments: [{ id: "P1", shop: "BT", amount: 33000, status: "ready", plan: "pro" }],
  wash_plans: [{ code: "pro", name: "프로", price: 30000 }],
  wash_pay_order: [], pay_billing: [], pay_billing_log: [], pay_webhook_log: [],
  wash_otp: [], cgg_access: [], wash_viewcode: [], wash_docs: [], cgg_sendlog: [],
});
let billFail = false;
const sent: any[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  const u = String(url);
  if (u.includes("solapi")) {
    const b = JSON.parse(String(init?.body || "{}"));
    sent.push(b.messages?.[0] ?? b.message ?? b);
    return Response.json({ groupInfo: { groupId: "G" }, messageList: {}, failedMessageList: [] });
  }
  if (u.startsWith("https://api.tosspayments.com")) {
    const path = u.replace("https://api.tosspayments.com", "");
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    if (path === "/v1/billing/authorizations/issue")
      return Response.json({ billingKey: "BK_X_" + body.customerKey.slice(0, 4), cardCompany: "신한", cardNumber: "4330********1234" });
    if (/^\/v1\/billing\/[^/]+$/.test(path) && init?.method === "POST") {
      if (billFail) return new Response(JSON.stringify({ code: "REJECT_CARD_COMPANY", message: "한도 초과" }), { status: 400 });
      return Response.json({ status: "DONE", orderId: body.orderId, paymentKey: "pk_" + body.orderId, totalAmount: body.amount, method: "카드" });
    }
    return Response.json({});
  }
  throw new Error("예상 못 한 주소 " + u);
}) as typeof fetch;
console.error = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
const SRC = Deno.env.get("WASH_SRC") ?? new URL("../1_차곳간워시_서버_wash-api_sb25.ts", import.meta.url).href;
await import(SRC);
const call = async (fn: string, args: unknown[], token = "", shop = "") =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop, token, fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const owner = () => sent.filter((m) => m?.to === "01077778888");
const reset = () => { sent.length = 0; store.cgg_sendlog.length = 0; };
const logOf = (tpl: string) => store.cgg_sendlog.filter((x: any) => x.tpl === tpl);

console.log("① 코드도 채널 ID 도 없을 때 — 충전완료 · 결제완료");
reset();
await call("hqAta", [], ADM, "ADMIN");
await call("hqCashAdd", ["BT", 50000, 365, "계좌 입금", "paid"], ADM, "ADMIN");
let m = owner().find((x) => /충전되었습니다/.test(x.text ?? ""));
check("충전완료가 문자로 나감 (예전엔 안 나감)", !!m && !m.kakaoOptions, sent);
check("문구 = ⑦ 확정본", /^\[차곳간\] 50,000원 충전되었습니다\. 잔액 .+원\.\n문의 010-9559-3663$/.test(m?.text ?? ""), m?.text);
check("보낸 기록: tpl=cash_done · via=sms (알림톡과 구분)", logOf("cash_done").some((x: any) => x.via === "sms" || x.via === "lms") && !logOf("cash_done").some((x: any) => x.via === "ata"), store.cgg_sendlog);
reset();
await call("hqPayMark", ["P1", "paid", "계좌이체"], ADM, "ADMIN");
m = owner().find((x) => /결제 완료/.test(x.text ?? ""));
check("결제완료가 문자로 나감", !!m && !m.kakaoOptions, sent);
check("문구 = ⑦ 확정본", /^\[차곳간\] 33,000원 결제 완료\. 이용 기한 .+까지\.\n문의 010-9559-3663$/.test(m?.text ?? ""), m?.text);
check("보낸 기록: tpl=pay_done · via=sms", logOf("pay_done").some((x: any) => x.via === "sms" || x.via === "lms"), store.cgg_sendlog);

console.log("② 자동 결제 카드 등록 · 자동 결제 실패 (코드 없음)");
const st = await call("billStart", [], OWN, "BT");
reset();
const iss = await call("billIssue", ["auth_1", "v1"], OWN, "BT");
m = owner().find((x) => /자동 결제 카드 등록/.test(x.text ?? ""));
check("등록됨", iss.result?.ok === true && !!st.result?.customerKey, iss);
check("자동결제등록 문자 = ⑦ 확정본(업체명 없음)", !!m && !m.kakaoOptions && /^\[차곳간\] 자동 결제 카드 등록\(신한\)\. 다음 결제 .+\. 문의 010-9559-3663$/.test(m.text) && !m.text.includes("브라더세차"), sent);
check("보낸 기록: tpl=bill_on · via=sms", logOf("bill_on").some((x: any) => x.via === "sms" || x.via === "lms"), store.cgg_sendlog);
store.wash_shops[0].paid_until = TODAY;
knobs.cash.BT = 0;
billFail = true;
reset();
await call("cronPay", ["CRONKEY"]);
m = owner().find((x) => /자동 결제 실패/.test(x.text ?? ""));
check("자동결제실패 문자 = ⑦ 확정본(업체명·이용요금 없음)", !!m && !m.kakaoOptions && /^\[차곳간\] 자동 결제 실패\(.+\)\. 다음 시도 .+\. 문의 010-9559-3663$/.test(m.text) && !/브라더세차|이용요금/.test(m.text), sent);
check("보낸 기록: tpl=bill_fail · via=sms", logOf("bill_fail").some((x: any) => x.via === "sms" || x.via === "lms"), store.cgg_sendlog);
billFail = false;

console.log("③ 코드·채널 ID 가 있으면 알림톡 (기록 via=ata)");
store.wash_hq[0].ata_cfg = { pfId: "PF_TEST", tpl: { pay_done: "KA_PAY", cash_done: "KA_CHG" } };
await call("hqAta", [], ADM, "ADMIN");
reset();
await call("hqCashAdd", ["BT", 10000, 365, "", "paid"], ADM, "ADMIN");
m = owner().find((x) => x.kakaoOptions?.templateId === "KA_CHG");
check("알림톡으로 나감 · 안 되면 대체 문구(disableSms:false)", !!m && m.kakaoOptions.disableSms === false && /충전되었습니다/.test(m.text), sent);
check("보낸 기록: via=ata", logOf("cash_done").some((x: any) => x.via === "ata"), store.cgg_sendlog);
console.log("④ 코드는 있는데 채널 ID 가 없으면 → 문자");
store.wash_hq[0].ata_cfg = { tpl: { pay_done: "KA_PAY", cash_done: "KA_CHG" } };
await call("hqAta", [], ADM, "ADMIN");
reset();
await call("hqCashAdd", ["BT", 10000, 365, "", "paid"], ADM, "ADMIN");
check("채널 ID 없음 → 대체 문구 문자", owner().some((x) => !x.kakaoOptions && /충전되었습니다/.test(x.text ?? "")), sent);

console.log("⑤ 문구 대조 (⑦ 표와 글자까지)");
const src = await Deno.readTextFile(SRC.startsWith("file:") ? new URL(SRC) : SRC);
check("bill_on 문구", src.includes('sms: "[차곳간] 자동 결제 카드 등록(#{카드}). 다음 결제 #{다음결제일}. 문의 010-9559-3663"'));
check("bill_fail 문구", src.includes('sms: "[차곳간] 자동 결제 실패(#{사유}). 다음 시도 #{다음시도일}. 문의 010-9559-3663"'));
check("«코드 없으면 안 나감» 길이 없음", !/if \(!smsIfNoCode\)/.test(src));

console.log("⑥ 환불 판단 하나로 — 주문 상태엔 흔적이 없어도 «카드 환불 주문번호 ·» 기록이 있으면 환불됨");
store.wash_payments.push(
  { id: "p9", shop: "BT", amount: 55000, status: "paid", order_id: "o9" },
  { id: "p8", shop: "BT", amount: 55000, status: "paid", order_id: "o8" },
  { id: "r9", shop: "BT", amount: 20000, status: "refunded", memo: "카드 환불 o9 · 이용기간 -10일 · 사유" });
store.wash_pay_order.push({ order_id: "o9", shop: "BT", status: "paid", raw: {} }, { order_id: "o8", shop: "BT", status: "paid", raw: {} });
Object.assign(store.wash_hq[0], { biz_no: "9999999999", biz_name: "차곳간" });
Object.assign(store.wash_shops[0], { biz_no: "1234567890", biz_ok_at: far });
const hp = await call("hqPayments", [], ADM, "ADMIN");
const by = Object.fromEntries((hp.result?.payments || []).map((p: any) => [p.id, p.refunded]));
check("목록: 환불 기록 있는 결제 = refunded (세금계산서 거절과 같은 판단)", by.p9 === true && by.p8 === false, by);
const tx = await call("hqTaxIssue", ["BT", { amount: 50000, payId: "p9", period: "2026-10" }], ADM, "ADMIN");
check("그 결제로 세금계산서는 거절", !!tx.__err && /환불/.test(tx.__err), tx);

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
