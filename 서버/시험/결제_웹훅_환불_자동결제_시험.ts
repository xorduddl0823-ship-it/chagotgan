// 워시 sb10 + pay-hook p1 시험 — 웹훅(토스 조회로만) · 정리 예약 · 환불(두 번 막기·기간 빼기·안 쓴 캐시만) · 자동 결제(잠금·한 번만·재시도) · 청구서 받은 번호
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/결제_웹훅_환불_자동결제_시험.ts
import { knobs, store } from "./fake_supabase_wash.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s");
Deno.env.set("SMS_FROM", "0212345678"); Deno.env.set("PF_ID", "PF_TEST");
Deno.env.set("TOSS_SECRET_KEY", "test_sk_fake");
const encKey = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
Deno.env.set("PAY_ENC_KEY", encKey);
Deno.env.set("CGG_INTERNAL_KEY", "i".repeat(40));
const far = new Date(Date.now() + 864e5).toISOString();
const ADM = "b".repeat(48), OWN = "c".repeat(48), MGR = "d".repeat(48);
const kst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const addD = (ymd: string, n: number) => new Date(Date.parse(ymd + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const TODAY = kst();
const order = (id: string, o: any = {}) => Object.assign({ order_id: id, shop: "BT", kind: "plan", amount: 33000, supply: 30000, vat: 3000,
  use_cash: 0, status: "ready", order_name: "프로", period: TODAY.slice(0, 7), created_at: new Date(Date.now() - 3600e3).toISOString() }, o);
Object.assign(store, {
  wash_hq: [{ id: 1, ata_cfg: {}, cron_key: "CRONKEY", billing_on: false }],
  wash_shops: [{ shop: "BT", name: "브라더세차", active: true, plan: "pro", paid_until: addD(TODAY, 20), owner_phone: "01077778888" },
               { shop: "OT", name: "다른세차", active: true, plan: "pro", paid_until: addD(TODAY, 20), owner_phone: "01066667777" }],
  wash_sessions: [
    { sid: ADM, phone: "01000000000", shop: "ADMIN", role: "admin", expires_at: far },
    { sid: OWN, phone: "01077778888", shop: "BT", role: "owner", expires_at: far },
    { sid: MGR, phone: "01055554444", shop: "BT", role: "manager", expires_at: far },
  ],
  wash_users: [{ phone: "01055554444", shop: "BT", role: "manager", active: true }],
  wash_plans: [{ code: "pro", name: "프로", price: 30000 }],
  wash_pay_order: [
    order("CGG261015AAAAAAAAAA"),                                             // 웹훅: 토스에서 끝남
    order("CGG261015BBBBBBBBBB"),                                             // 웹훅: 토스에서 취소됨
    order("CGG261015CCCCCCCCCC", { status: "paid", payment_key: "pk_C" }),    // 환불(월 요금)
    order("CGG261015DDDDDDDDDD", { kind: "cash", amount: 55000, supply: 50000, vat: 5000, status: "paid", payment_key: "pk_D" }),
    order("CGG261015FFFFFFFFFF"),                                             // 웹훅: 토스 응답에 금액이 없음
    order("CGG261015EEEEEEEEEE", { created_at: new Date(Date.now() - 2 * 3600e3).toISOString() }),   // 정리 예약 대상
  ],
  wash_payments: [], pay_webhook_log: [], pay_billing: [], pay_billing_log: [],
  wash_otp: [], cgg_access: [], wash_viewcode: [], wash_docs: [],
});

/* 가짜 토스 */
const toss: { path: string; method: string; body: any; idem: string }[] = [];
const tossOrders: Record<string, any> = {
  CGG261015AAAAAAAAAA: { status: "DONE", paymentKey: "pk_A", totalAmount: 33000, method: "카드" },
  CGG261015BBBBBBBBBB: { status: "ABORTED", paymentKey: "pk_B", totalAmount: 33000 },
  CGG261015EEEEEEEEEE: { status: "DONE", paymentKey: "pk_E", totalAmount: 33000, method: "카드" },
  CGG261015FFFFFFFFFF: { status: "DONE", paymentKey: "pk_F", method: "카드" },
};
let billMode: "ok" | "fail" | "drop" = "ok";
const hookHeaders: string[] = [];
const deletedKeys: string[] = [];
const sms: any[] = [];
const H: any[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  const u = String(url);
  if (u.includes("solapi")) { sms.push(JSON.parse(String(init?.body)).messages[0]); return Response.json({}); }
  if (u.endsWith("/functions/v1/wash-api")) {
    hookHeaders.push(String((init?.headers as any)?.["x-cgg-internal"] || ""));
    return await H[0](new Request("http://x", { method: "POST", body: init?.body, headers: init?.headers as any }));
  }
  if (u.startsWith("https://api.tosspayments.com")) {
    const path = u.replace("https://api.tosspayments.com", "");
    const method = String(init?.method || "GET");
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    toss.push({ path, method, body, idem: String((init?.headers as any)?.["Idempotency-Key"] || "") });
    let m = path.match(/^\/v1\/payments\/orders\/(.+)$/);
    if (m) { const o = tossOrders[decodeURIComponent(m[1])]; return o ? Response.json({ orderId: decodeURIComponent(m[1]), ...o }) : new Response("{}", { status: 404 }); }
    m = path.match(/^\/v1\/payments\/([^/]+)\/cancel$/);
    if (m) return Response.json({ status: body.cancelAmount ? "PARTIAL_CANCELED" : "CANCELED" });
    if (path === "/v1/billing/authorizations/issue")
      return Response.json({ billingKey: "BK_SECRET_" + body.customerKey.slice(0, 4), cardCompany: "신한", cardNumber: "4330********1234" });
    m = path.match(/^\/v1\/billing\/([^/]+)$/);
    if (m && method === "DELETE") { deletedKeys.push(decodeURIComponent(m[1])); return Response.json({}); }
    if (m && method === "POST") {
      if (billMode === "drop") { const oid = body.orderId; tossOrders[oid] = { status: "DONE", paymentKey: "pk_" + oid, totalAmount: body.amount, method: "카드" }; throw new Error("connection reset"); }
      if (billMode === "fail") return new Response(JSON.stringify({ code: "REJECT_CARD_COMPANY", message: "한도 초과" }), { status: 400 });
      return Response.json({ status: "DONE", orderId: body.orderId, paymentKey: "pk_bill_" + body.orderId, totalAmount: body.amount, method: "카드" });
    }
  }
  throw new Error("예상 못 한 주소 " + u);
}) as typeof fetch;
const errs: string[] = [];
console.error = (...a: unknown[]) => { errs.push(a.map(String).join(" ")); };
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(Deno.env.get("WASH_SRC") ?? "../1_차곳간워시_서버_wash-api_sb10.ts");
await import("../4_결제_웹훅_pay-hook_p1.ts");
const [wash, hook] = H;
const call = async (fn: string, args: unknown[], token = "", shop = "") =>
  await (await wash(new Request("http://x", { method: "POST", body: JSON.stringify({ shop, token, fn, args }) }))).json();
const hookPost = async (body: unknown) => await hook(new Request("http://x", { method: "POST", body: JSON.stringify(body) }));
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const od = (id: string) => store.wash_pay_order.find((o: any) => o.order_id === id);
const shopRow = (s = "BT") => store.wash_shops.find((x: any) => x.shop === s);

console.log("① 웹훅 (pay-hook → wash-api payCheck → 토스 조회)");
let pu = shopRow().paid_until;
const ev = (oid: string, extra: any = {}) => ({ eventType: "PAYMENT_STATUS_CHANGED", data: { orderId: oid, status: "DONE", totalAmount: 1, ...extra } });
let res = await hookPost(ev("CGG261015AAAAAAAAAA"));
check("토스가 DONE 이면 반영 · 200", res.status === 200 && od("CGG261015AAAAAAAAAA").status === "paid", od("CGG261015AAAAAAAAAA"));
check("이용기간 +30일", shopRow().paid_until === addD(pu, 30), shopRow().paid_until);
const pay1 = store.wash_payments.length;
res = await hookPost(ev("CGG261015AAAAAAAAAA"));
check("같은 주문이 또 와도 한 번만 (장부 그대로)", res.status === 200 && store.wash_payments.length === pay1 && shopRow().paid_until === addD(pu, 30));
check("받은 기록 남김 (주문번호 · 결과)", store.pay_webhook_log.some((l: any) => l.order_id === "CGG261015AAAAAAAAAA" && l.result === "applied") &&
  store.pay_webhook_log.some((l: any) => l.result === "already"), store.pay_webhook_log);
await hookPost(ev("CGG261015BBBBBBBBBB", { status: "DONE" }));
check("웹훅이 DONE 이라고 해도 토스 조회가 ABORTED 면 반영 안 함 → failed", od("CGG261015BBBBBBBBBB").status === "failed", od("CGG261015BBBBBBBBBB"));
await hookPost(ev("CGG261015FFFFFFFFFF"));
check("토스 응답에 금액이 없으면 반영 안 함", od("CGG261015FFFFFFFFFF").status !== "paid", od("CGG261015FFFFFFFFFF"));
const before = store.wash_payments.length;
res = await hookPost(ev("CGG261015ZZZZZZZZZZ"));
check("모르는 주문은 무시 (200 · 반영 없음)", res.status === 200 && store.wash_payments.length === before);
res = await hookPost({ eventType: "DEPOSIT_CALLBACK", data: { orderId: "CGG261015AAAAAAAAAA" } });
check("다른 이벤트는 무시", res.status === 200);
const bad = await call("payCheck", ["'; drop table"]);
check("payCheck 는 주문번호 모양이 아니면 아무것도 안 함", bad.result?.ok === false, bad);

check("pay-hook 은 전용 열쇠를 붙여 부름 → 바깥 요청과 횟수를 따로 셈",
  hookHeaders.every((h) => h === "i".repeat(40)) && (store.wash_rate ?? []).some((r: any) => r.key === "paychk:hook"), { hookHeaders, rate: store.wash_rate });
check("pay-hook 은 보내는 IP 마다 셈", (store.wash_rate ?? []).some((r: any) => String(r.key).startsWith("hook:")));
const hk = (store.wash_rate as any[]).find((r) => String(r.key).startsWith("hook:"));
const keepN = hk.n; hk.n = 5000;
check("한 IP 가 너무 많이 보내면 429 (토스가 나중에 다시 보냄)", (await hookPost(ev("CGG261015AAAAAAAAAA"))).status === 429);
hk.n = keepN;
console.log("② 정리 예약 (30분 넘게 ready)");
const nc = await call("cronPay", ["wrong"]);
check("cron 열쇠가 틀리면 거절", !!nc.__err);
const cr = await call("cronPay", ["CRONKEY"]);
check("오래된 ready 주문을 토스에 물어 반영", od("CGG261015EEEEEEEEEE").status === "paid", { cr, o: od("CGG261015EEEEEEEEEE") });
check("자동 결제 스위치가 꺼져 있으면 자동 결제 안 돎", (cr.result?.out ?? []).includes("자동 결제 꺼짐"), cr);

console.log("③ 환불 — 월 요금 (이용기간 빼기 · 두 번 막기)");
shopRow().paid_until = addD(TODAY, 15);
const q = await call("hqPgQuote", ["CGG261015CCCCCCCCCC"], ADM, "ADMIN");
check("서버가 남은 날 비율로 권장 금액 계산 (15/30)", q.result?.suggest === 16500 && q.result?.max === 33000 && q.result?.leftDays === 15, q);
check("업체 계정은 환불 못 함", !!(await call("hqPgCancel", ["CGG261015CCCCCCCCCC"], OWN, "BT")).__err);
const over = await call("hqPgCancel", ["CGG261015CCCCCCCCCC", "고객 요청", 40000], ADM, "ADMIN");
check("결제 금액보다 많이는 못 돌려줌", /까지만/.test(over.__err ?? "") && od("CGG261015CCCCCCCCCC").status === "paid", over);
const [c1, c2] = await Promise.all([
  call("hqPgCancel", ["CGG261015CCCCCCCCCC", "고객 요청", 16500], ADM, "ADMIN"),
  call("hqPgCancel", ["CGG261015CCCCCCCCCC", "고객 요청", 16500], ADM, "ADMIN")]);
const cancels = toss.filter((t) => t.path.endsWith("/cancel"));
check("동시에 두 번 눌러도 토스 환불은 한 번", cancels.length === 1 && [c1, c2].filter((x) => x.result?.ok).length === 1, { c1, c2, n: cancels.length });
check("부분 환불 금액을 토스에 보냄 (cancelAmount)", cancels[0]?.body?.cancelAmount === 16500, cancels[0]);
check("이용기간을 되돌리지 않고 15일 «빼기»", shopRow().paid_until === TODAY, shopRow().paid_until);
check("장부에 「환불」 줄", store.wash_payments.some((p: any) => p.status === "refunded" && p.amount === 16500), store.wash_payments);
check("주문은 canceled", od("CGG261015CCCCCCCCCC").status === "canceled");

console.log("④ 환불 — 캐시 충전 (안 쓴 캐시만 · 마이너스 없음)");
knobs.cash.BT = 20000;                         // 50,000 넣었는데 30,000 씀
const q2 = await call("hqPgQuote", ["CGG261015DDDDDDDDDD"], ADM, "ADMIN");
check("한도 = 남은 충전 캐시 × 1.1 = 22,000", q2.result?.max === 22000, q2);
check("한도보다 많으면 거절", /까지만/.test((await call("hqPgCancel", ["CGG261015DDDDDDDDDD", "x", 55000], ADM, "ADMIN")).__err ?? ""));
const c3 = await call("hqPgCancel", ["CGG261015DDDDDDDDDD", "고객 요청"], ADM, "ADMIN");
check("금액을 비우면 한도만큼 환불", c3.result?.amount === 22000, c3);
check("캐시는 20,000 빠짐 (0 · 마이너스 아님)", knobs.cash.BT === 0, knobs.cash);

console.log("⑤ 자동 결제 — 스위치 · 등록 · 잠금 저장");
const off = await call("billStart", [], OWN, "BT");
check("관리 스위치가 꺼져 있으면 안 열림", off.result?.off === true, off);
store.wash_hq[0].billing_on = true;
check("매니저는 못 함 (대표만)", !!(await call("billStart", [], MGR, "BT")).__err);
const st = await call("billStart", [], OWN, "BT");
const ck = st.result?.customerKey ?? "";
check("customerKey 는 서버가 만든 무작위 값 · 창을 열기 전에 업체에 묶임",
  /^[0-9a-f-]{36}$/.test(ck) && store.pay_billing.find((b: any) => b.shop === "BT")?.customer_key === ck, st);
check("다시 열어도 같은 customerKey", (await call("billStart", [], OWN, "BT")).result?.customerKey === ck);
store.wash_hq[0].ata_cfg = { tpl: { bill_on: "KA_BILLON", bill_fail: "KA_BILLFAIL" } };
await call("hqAta", [], ADM, "ADMIN");            // 설정 다시 읽기 (1분 기억 비우기)
const iss = await call("billIssue", ["auth_123", "v1"], OWN, "BT");
const row = store.pay_billing.find((b: any) => b.shop === "BT");
check("등록됨 · 화면에는 카드사·끝 4자리만", iss.result?.ok && iss.result.cardCompany === "신한" && iss.result.last4 === "1234" && !JSON.stringify(iss).includes("BK_SECRET"), iss);
check("빌링키는 잠긴 값으로만 저장 (원문 없음)", /^v1\./.test(row.billing_key_enc) && !JSON.stringify(store).includes("BK_SECRET"), row);
check("기록(console.error)에도 빌링키 없음", !errs.some((e) => e.includes("BK_SECRET")));
const info = await call("billInfo", [], OWN, "BT");
check("billInfo 에 빌링키 없음", info.result?.on === true && !JSON.stringify(info).includes("billing") && !JSON.stringify(info).includes("BK_"), info);
check("자동 결제 등록 알림톡이 대표에게 (정보성)", sms.some((m) => m.to === "01077778888" && m.kakaoOptions?.templateId === "KA_BILLON"), sms.at(-1));
const scr = await call("sendMsg", [JSON.stringify({ to: "01012341234", from: "x", kind: "ATA", ataKey: "bill_fail", variables: { 업체명: "x", 금액: "1", 다시결제일: "x" } })], OWN, "BT");
check("화면은 서버 안내 키(bill_fail)로 공식 채널 못 보냄", !sms.some((m) => m.kakaoOptions?.templateId === "KA_BILLFAIL" && m.to === "01012341234"), scr);

console.log("⑥ 자동 결제 — 예약 실행 (한 번만 · 캐시는 성공 뒤 · 실패 재시도)");
shopRow().paid_until = TODAY;
knobs.cash.BT = 3000;
const r1 = await call("cronPay", ["CRONKEY"]);
const bo = store.wash_pay_order.filter((o: any) => o.bill_date === TODAY && o.shop === "BT");
check("오늘 끝나는 업체를 자동 결제 → +30일", bo.length === 1 && bo[0].status === "paid" && shopRow().paid_until === addD(TODAY, 30), { r1, bo, pu: shopRow().paid_until });
const bt = toss.find((t) => t.path.startsWith("/v1/billing/") && t.method === "POST" && !t.path.includes("authorizations"));
check("금액 = 요금제×1.1 − 캐시 (33,000 − 3,000)", bt?.body?.amount === 30000, bt);
check("Idempotency-Key = 주문번호", !!bt && bt.idem === bo[0].order_id, bt);
check("캐시 3,000 은 성공한 뒤 깎임", knobs.cash.BT === 0);
await call("cronPay", ["CRONKEY"]);
check("같은 날 다시 돌려도 두 번 청구 안 함", toss.filter((t) => t.path.startsWith("/v1/billing/") && t.method === "POST" && !t.path.includes("authorizations")).length === 1);
/* 응답이 끊기면(실제로는 승인됐을 수 있음) ready 로 두고 다음 정리에서 토스에 물어봄 */
store.wash_pay_order = store.wash_pay_order.filter((o: any) => o.bill_date !== TODAY);
shopRow().paid_until = TODAY; knobs.cash.BT = 0; billMode = "drop";
await call("cronPay", ["CRONKEY"]);
const dropped = store.wash_pay_order.find((o: any) => o.bill_date === TODAY && o.shop === "BT");
const bd = store.pay_billing.find((b: any) => b.shop === "BT");
check("끊김: 주문은 ready 그대로 · 실패로 안 셈", dropped?.status === "ready" && !bd.first_fail_at && Number(bd.fail_count || 0) === 0, { dropped, bd });
billMode = "ok";
dropped.created_at = new Date(Date.now() - 3600e3).toISOString();
await call("cronPay", ["CRONKEY"]);
check("다음 정리에서 토스 조회 → 실제 승인이면 반영 (+30일 · 다시 청구 안 함)", dropped.status === "paid" && shopRow().paid_until === addD(TODAY, 30) &&
  toss.filter((t) => t.method === "POST" && /^\/v1\/billing\/[^/]+$/.test(t.path) && !t.path.includes("authorizations")).length === 2, { dropped, pu: shopRow().paid_until });
/* 실패 → D+1·3·5 */
store.wash_pay_order = store.wash_pay_order.filter((o: any) => o.bill_date !== TODAY);
shopRow().paid_until = TODAY; knobs.cash.BT = 0; billMode = "fail"; sms.length = 0;
await call("cronPay", ["CRONKEY"]);
const b2 = store.pay_billing.find((b: any) => b.shop === "BT");
check("실패: 주문 failed · 실패 횟수 1 · 첫 실패일 오늘", b2.fail_count === 1 && b2.first_fail_at === TODAY &&
  store.wash_pay_order.some((o: any) => o.bill_date === TODAY && o.status === "failed"), b2);
check("실패 알림톡 (정보성 · 대표에게)", sms.some((m) => m.kakaoOptions?.templateId === "KA_BILLFAIL" && m.to === "01077778888"), sms);
const fv = sms.find((m) => m.kakaoOptions?.templateId === "KA_BILLFAIL")?.kakaoOptions?.variables ?? {};
check("실패 알림톡 변수 = 알림톡/02 새 F (업체명·결제일·요금제·금액·사유·다음시도일)",
  fv["#{업체명}"] === "브라더세차" && fv["#{요금제}"] === "프로" && fv["#{금액}"] === "33,000" && fv["#{사유}"] === "카드 한도 초과" &&
  !!fv["#{결제일}"] && !!fv["#{다음시도일}"] && Object.keys(fv).length === 6, fv);
check("사유에 영문 오류 코드 없음", !/[A-Z_]{4,}/.test(fv["#{사유}"] ?? ""));
check("캐시는 안 깎임", knobs.cash.BT === 0 && shopRow().paid_until === TODAY);
check("실패 기록 표", store.pay_billing_log.some((l: any) => l.result === "fail" && l.try_no === 1), store.pay_billing_log);
/* 다음 날들: D+2 는 안 함, D+1·3·5 만 */
const realNow = Date.now;
const tryOn = async (d: number) => {
  Date.now = () => realNow() + d * 864e5;
  const n0 = toss.filter((t) => t.method === "POST" && /^\/v1\/billing\/[^/]+$/.test(t.path) && !t.path.includes("authorizations")).length;
  await call("cronPay", ["CRONKEY"]);
  Date.now = realNow;
  return toss.filter((t) => t.method === "POST" && /^\/v1\/billing\/[^/]+$/.test(t.path) && !t.path.includes("authorizations")).length - n0;
};
sms.length = 0;
const tries = [await tryOn(1), await tryOn(2), await tryOn(3), await tryOn(4)];
const failSms = () => sms.filter((m) => m.kakaoOptions?.templateId === "KA_BILLFAIL").length;
const beforeLast = failSms();
tries.push(await tryOn(5));
check("마지막(D+5) 실패에는 실패 알림톡을 안 보냄", failSms() === beforeLast && beforeLast === 2, { beforeLast, now: failSms() });
tries.push(await tryOn(6));
check("다시 결제는 D+1·D+3·D+5 에만 (D+2·4·6 은 안 함)", JSON.stringify(tries) === "[1,0,1,0,1,0]", tries);
check("모두 실패하면 이용기간 그대로 (기존 잠금으로 넘어감)", shopRow().paid_until === TODAY);

console.log("⑦ 자동 결제 끄기");
const bkBefore = store.pay_billing.find((b: any) => b.shop === "BT").billing_key_enc;
const of = await call("billOff", [], OWN, "BT");
const b3 = store.pay_billing.find((b: any) => b.shop === "BT");
check("끄면 우리 쪽 빌링키 지움 · off", of.result?.ok && !b3.billing_key_enc && b3.status === "off", b3);
check("토스에서도 빌링키 삭제 요청", deletedKeys.some((k) => k.startsWith("BK_SECRET")), deletedKeys);
check("끈 뒤에는 예약 실행이 결제 안 함", (await tryOn(0)) === 0);
void bkBefore;

console.log("⑧ 청구서를 보낸 번호를 보기코드에 (딜러 myBills 용)");
store.wash_viewcode.push({ code: "C".repeat(24), shop: "BT", rec_id: "b1", kind: "bill", expires_at: far, to_phones: [], data: {} },
                         { code: "D".repeat(24), shop: "OT", rec_id: "b2", kind: "bill", expires_at: far, to_phones: [], data: {} });
store.wash_hq[0].ata_cfg = { tpl: { bill: "KA_BILL" } };
await call("hqAta", [], ADM, "ADMIN");
const BILLV = { 기간: "9월", 받는곳: "좋은상사", 건수: 1, 금액: "1,000", 입금기한: "10/31", 계좌: "국민", 보기코드: "C".repeat(24) };
await call("sendMsg", [JSON.stringify({ to: "010-2222-3333", from: "x", kind: "ATA", ataKey: "bill", variables: BILLV })], OWN, "BT");
check("우리 업체 청구서에 받는 번호가 적힘", JSON.stringify(store.wash_viewcode.find((v: any) => v.code === "C".repeat(24)).to_phones) === '["01022223333"]');
await call("sendMsg", [JSON.stringify({ to: "01099998888", from: "x", kind: "ATA", ataKey: "bill", variables: { ...BILLV, 보기코드: "D".repeat(24) } })], OWN, "BT");
check("남의 업체 청구서에는 안 적힘", store.wash_viewcode.find((v: any) => v.code === "D".repeat(24)).to_phones.length === 0);

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
