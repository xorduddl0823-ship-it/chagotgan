// 워시 sb15 시험 — 오픈 베타 보안 고침(높음 W-H1·H2·H3 · 중간 M1·M2·M3·M5 · 화면 S-M2 · 낮음) + 발송 기록(SQL 11)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/보안고침_발송기록_워시_sb15_시험.ts
// WASH_SRC 에 sb14 를 넣으면 실패가 나와야 합니다.
import { knobs, store } from "./fake_supabase_wash.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s");
Deno.env.set("SMS_FROM", "0212345678");
Deno.env.set("PF_ID", "PF_HQ");
Deno.env.set("TOSS_SECRET_KEY", "test_sk_fake");
Deno.env.set("ADMIN_TOKEN", "fixed-admin-token");
const far = new Date(Date.now() + 864e5).toISOString();
const nowIso = new Date().toISOString();
const yest = new Date(Date.now() - 864e5 * 1.5).toISOString();
const OWN = "c".repeat(48), STF = "d".repeat(48), ADM = "b".repeat(48), OWN2 = "e".repeat(48);
const kst = (d = new Date()) => new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 10);
const order = (id: string, useCash: number, amount: number) =>
  ({ order_id: id, shop: "BT", kind: "plan", amount, supply: Math.round(amount / 1.1), vat: amount - Math.round(amount / 1.1),
     use_cash: useCash, status: "ready", order_name: "프로 10월", period: "2026-10", who: "shop:BT", created_at: nowIso });
Object.assign(store, {
  wash_hq: [{ id: 1, biz_no: "999-99-99999", ata_cfg: { tpl: { intake: "TPL_INTAKE", staff_link: "TPL_STAFF", pay_done: "TPL_PAY" } },
              admin_phone: "01011112222", pg_on: true, cash_on: false }],
  wash_shops: [
    { shop: "BT", name: "브라더세차", active: true, plan: "pro", paid_until: kst(new Date(Date.now() + 5 * 864e5)), owner_phone: "01077778888", biz_no: "" },
    { shop: "ZZ", name: "남의세차", active: true, plan: "pro", paid_until: far.slice(0, 10), owner_phone: "01055556666", biz_no: "1112233333" },
    { shop: "LK", name: "잠긴세차", active: true, plan: "pro", paid_until: kst(new Date(Date.now() - 3 * 864e5)), owner_phone: "01044445555", lock_days: 0 },
  ],
  check_office: [{ id: "o1", code: "GAON", biz_no: "222-33-44444", popbill_corp: "" }],
  wash_sessions: [
    { sid: OWN, phone: "01077778888", shop: "BT", role: "owner", expires_at: far },
    { sid: STF, phone: "01033334444", shop: "BT", role: "staff", expires_at: far },
    { sid: ADM, phone: "01000000000", shop: "ADMIN", role: "admin", expires_at: far },
    { sid: OWN2, phone: "01044445555", shop: "LK", role: "owner", expires_at: far },
  ],
  wash_users: [
    { phone: "01000000000", shop: "ADMIN", role: "admin", active: true },
    { phone: "01000000001", shop: "ADMIN", role: "admin", active: true },
    { phone: "01033334444", shop: "BT", role: "staff", active: true },
    { phone: "01033335555", shop: "BT", role: "staff", active: true },
  ],
  wash_plans: [{ code: "pro", name: "프로", price: 50000, tax_free: 10 }],
  wash_pay_order: [], wash_payments: [], wash_otp: [], cgg_access: [], wash_viewcode: [], wash_sendlog: [], cgg_sendlog: [],
  hq_audit: [], wash_lock_log: [], wash_hq_otp: [],
  wash_docs: [
    { shop: "BT", demo: false, col: "intakes", id: "r_old_out", data: { id: "r_old_out", createdAt: yest, status: "출고", total: 30000, works: [{ name: "세차", amount: 30000 }] } },
    { shop: "BT", demo: false, col: "intakes", id: "r_old_in", data: { id: "r_old_in", createdAt: yest, status: "입고", total: 20000 } },
    { shop: "BT", demo: false, col: "intakes", id: "r_today_in", data: { id: "r_today_in", createdAt: nowIso, status: "입고", total: 10000 } },
    { shop: "BT", demo: false, col: "intakes", id: "r_paid", data: { id: "r_paid", createdAt: nowIso, status: "수금완료", total: 10000, paidAt: nowIso } },
  ],
});

/* 가짜 솔라피 · 토스 */
const sent: any[] = [];
const listAns: Record<string, any> = {};
let failNext = "";
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  const u = String(url);
  if (u.includes("api.solapi.com")) {
    if (u.includes("/messages/v4/list")) {
      const id = decodeURIComponent((u.split("messageId=")[1] || "").split("&")[0]);
      return Response.json({ messageList: listAns[id] ? { [id]: listAns[id] } : {} });
    }
    if (u.includes("/messages/v4/send")) {
      const b = JSON.parse(String(init?.body));
      sent.push(b);
      if (failNext === "http") { failNext = ""; return new Response(JSON.stringify({ errorCode: "ValidationError", errorMessage: "bad" }), { status: 400 }); }
      if (failNext === "row") {
        failNext = "";
        return Response.json({ groupInfo: { _id: "G1" }, failedMessageList: [{ to: b.messages[0].to, statusCode: "1062", statusMessage: "SenderNumber not registered" }], messageList: [] });
      }
      return Response.json({ groupInfo: { _id: "G" + sent.length }, failedMessageList: [],
        messageList: b.messages.map((m: any, i: number) => ({ messageId: "M" + sent.length + "_" + i, to: m.to })) });
    }
    return Response.json({});
  }
  if (u.includes("api.tosspayments.com")) {
    const b = JSON.parse(String(init?.body || "{}"));
    return Response.json({ status: "DONE", orderId: b.orderId, paymentKey: b.paymentKey, totalAmount: b.amount, method: "카드" });
  }
  return Response.json({});
}) as typeof fetch;
const logs: string[] = [];
console.error = (...a: unknown[]) => { logs.push(a.map(String).join(" ")); };
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(Deno.env.get("WASH_SRC") ?? "../1_차곳간워시_서버_wash-api_sb15.ts");
const call = async (fn: string, args: unknown[], token = OWN, shop = "BT", extra: any = {}) =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify(Object.assign({ shop, token, fn, args }, extra)) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const shopRow = (c: string) => store.wash_shops.find((s: any) => s.shop === c);

console.log("■ W-H1 사업자번호");
let r = await call("shopBiz", [{ bizNo: "111-22-33333" }]);
check("다른 업체가 쓰는 번호는 넣지 못함", !!r.__err && /다른 곳에서 쓰고/.test(r.__err) && !shopRow("BT").biz_no, r);
r = await call("shopBiz", [{ bizNo: "999-99-99999" }]);
check("차곳간 본사 번호도 넣지 못함", !!r.__err && !shopRow("BT").biz_no, r);
r = await call("shopBiz", [{ bizNo: "222-33-44444" }]);
check("체크 검사소 번호도 넣지 못함", !!r.__err && !shopRow("BT").biz_no, r);
r = await call("shopBiz", [{ bizNo: "123-45-67890", ceo: "김대표" }]);
check("비어 있을 때 처음 한 번은 넣어짐", !r.__err && shopRow("BT").biz_no === "1234567890" && shopRow("BT").ceo === "김대표", r);
r = await call("shopBiz", [{ bizNo: "123-45-67891" }]);
check("한 번 넣은 뒤에는 바꾸지 못함", !!r.__err && /바꿀 수 없습니다/.test(r.__err) && shopRow("BT").biz_no === "1234567890", r);
r = await call("shopBiz", [{ bizNo: "1234567890", addr: "서울" }]);
check("같은 번호를 다시 보내며 다른 칸 저장은 됨", !r.__err && shopRow("BT").addr === "서울", r);
shopRow("ZZ").biz_no = "1234567890";       // (예전에 이미 겹쳐 들어간 경우)
r = await call("pbIssue", [JSON.stringify({ doc: { invoiceeCorpNum: "1111111111", totalAmount: 1000 } })]);
check("다른 곳과 겹친 번호로는 세금계산서 발행 안 함", !!(r.result && r.result.ok === false && /다른 곳에서 쓰고/.test(r.result.error)) || (!!r.__err && /다른 곳/.test(r.__err)), r);
r = await call("pbCertUrl", [true]);
check("인증서 올리는 창 주소도 안 줌", !!r.__err && /다른 곳/.test(r.__err), r);
shopRow("ZZ").biz_no = "1112233333";

console.log("■ W-H2 알림톡 템플릿 직접 고르기 막기");
sent.length = 0;
r = await call("sendMsg", [JSON.stringify({ kind: "ATA", templateId: "EVIL_TPL", pfId: "EVIL_PF", ataKey: "staff_link",
  variables: { "#{접속주소}": "https://evil.example/login", 직원명: "홍길동" }, to: "01099998888", from: "0212345678", type: "직원 링크" })]);
const m0 = sent[0] && sent[0].messages[0];
check("화면이 보낸 템플릿·채널은 버리고 본사 것만", !!m0 && m0.kakaoOptions && m0.kakaoOptions.templateId === "TPL_STAFF" && m0.kakaoOptions.pfId === "PF_HQ", m0);
check("접속주소는 서버 값(직원용 주소)", !!m0 && JSON.stringify(m0.kakaoOptions.variables).indexOf("evil") < 0 && /app\.cgg\.co\.kr/.test(JSON.stringify(m0.kakaoOptions.variables)), m0 && m0.kakaoOptions);
sent.length = 0;
r = await call("sendMsg", [JSON.stringify({ kind: "ATA", templateId: "EVIL_TPL", pfId: "EVIL_PF", variables: { a: 1 },
  to: "01099998888", from: "0212345678", text: "안녕하세요", type: "아무 글" })]);
const m1 = sent[0] && sent[0].messages[0];
check("ataKey 없는 알림톡 요청은 보통 문자로 (업체 이름이 앞에)", !!m1 && !m1.kakaoOptions && /^\[브라더세차\]/.test(m1.text), m1);

console.log("■ W-H3 캐시로 낸 셈 치고 안 깎이기");
knobs.cash.BT = 50000;
store.wash_pay_order.push(order("O1", 50000, 5000), order("O2", 50000, 5000));
const before = shopRow("BT").paid_until;
r = await call("payConfirm", ["O1", "pk_O1", 5000]);
const after1 = shopRow("BT").paid_until;
check("첫 주문: 캐시 깎이고 기간 늘어남", after1 > before && knobs.cash.BT === 0, { r, before, after1 });
r = await call("payConfirm", ["O2", "pk_O2", 5000]);
check("두 번째 주문: 캐시를 못 깎으면 기간을 늘리지 않음", shopRow("BT").paid_until === after1, shopRow("BT").paid_until);
check("그 주문에 «본사 확인» 표시", /캐시 모자람/.test(String(store.wash_pay_order.find((o: any) => o.order_id === "O2").fail_msg || "")));
knobs.cash.BT = 60000;
store.wash_pay_order.push(order("O3", 50000, 5000));
r = await call("payStart", ["plan", 0, 50000]);
check("캐시 쓰는 결제가 진행 중이면 새 주문을 안 만듦", !!r.__err && /진행 중/.test(r.__err), r);

console.log("■ W-M1 «입금했습니다» 한 번만");
r = await call("paidSay", [], OWN2, "LK");
check("기한 지난 뒤 첫 번째는 됨", !r.__err && r.result && r.result.ok, r);
const ls = shopRow("LK");
ls.paid_say_at = new Date(Date.now() - 25 * 3600e3).toISOString();
r = await call("paidSay", [], OWN2, "LK");
check("하루 지나도 두 번째는 안 됨", !!r.__err && /한 번만/.test(r.__err), r);

console.log("■ W-M2 본사 인증번호 횟수 먼저 올리기");
store.wash_hq_otp.push({ tick: "T1", phone: "01000000000", kind: "login", code_hash: "x$y", tries: 0, expires_at: far });
r = await call("hqLogin2", ["T1", "123456"], "", "");
check("틀리면 횟수 1", store.wash_hq_otp.find((o: any) => o.tick === "T1")?.tries === 1, r);
store.wash_hq_otp.push({ tick: "T2", phone: "01000000000", kind: "login", code_hash: "x$y", tries: null, expires_at: far });
r = await call("hqLogin2", ["T2", "123456"], "", "");
check("횟수 칸이 비어 있어도 올라감", store.wash_hq_otp.find((o: any) => o.tick === "T2")?.tries === 1, r);

console.log("■ W-M3 옛 본사 계정 도구");
sent.length = 0;
r = await call("hqUserPw", ["01033335555", ""], ADM, "ADMIN");
check("새 비밀번호를 응답에 안 줌", !r.__err && r.result && r.result.pw === undefined && r.result.sent === true, r);
check("그 계정 휴대폰으로만 문자", sent.some((b) => b.messages[0].to === "01033335555" && /임시 비밀번호/.test(b.messages[0].text)));
check("관리 기록이 먼저 남음", store.hq_audit.some((x: any) => x.action === "userPw" && x.target_phone === "01033335555"));
r = await call("hqUserPw", ["01000000001", "abcdef12"], ADM, "ADMIN");
check("다른 본사 계정은 못 바꿈", !!r.__err && /본사 계정/.test(r.__err), r);
r = await call("hqUserDel", ["01000000001"], ADM, "ADMIN");
check("다른 본사 계정은 못 지움", !!r.__err && store.wash_users.some((u: any) => u.phone === "01000000001"), r);
r = await call("hqUserSave", ["01000000001", { role: "staff" }], ADM, "ADMIN");
check("다른 본사 계정 직급도 못 바꿈", !!r.__err, r);

console.log("■ W-M5 importRows 없앰");
r = await call("importRows", [[{ col: "intakes", id: "x", data: {} }]], "", "BT", { admin: "fixed-admin-token" });
check("고정 열쇠로 자료 쓰기가 안 됨", !!r.__err && !(r.result && r.result.ok), r);

console.log("■ S-M2 직원 장부 고치기");
const doc = (id: string) => store.wash_docs.find((d: any) => d.id === id)?.data;
r = await call("apiSet", ["intakes", "r_old_out", { ...doc("r_old_out"), total: 1000 }, false], STF);
check("직원: 지난 출고 기록 금액 바꾸기 막힘", !!r.__err, r);
r = await call("apiSet", ["intakes", "r_old_in", { ...doc("r_old_in"), status: "출고", outAt: nowIso, total: 25000 }, false], STF);
check("직원: 밤새 둔 차 출고(금액 정리 포함)는 됨", !r.__err, r);
r = await call("apiSet", ["intakes", "r_today_in", { ...doc("r_today_in"), status: "수금완료", paidAt: nowIso }, false], STF);
check("직원: 수금완료로 바꾸기 막힘", !!r.__err && /수금/.test(r.__err), r);
r = await call("apiSet", ["intakes", "r_paid", { ...doc("r_paid"), memo: "고침" }, false], STF);
check("직원: 수금완료 기록 고치기 막힘", !!r.__err, r);
r = await call("apiDel", ["intakes", "r_old_out", false], STF);
check("직원: 지난 기록 지우기 막힘", !!r.__err, r);
r = await call("apiDel", ["intakes", "r_today_in", false], STF);
check("직원: 오늘 들어온 입고 기록 지우기는 됨", !r.__err, r);
r = await call("apiSetMany", [[{ col: "intakes", id: "r_new", data: { id: "r_new", createdAt: yest, status: "입고" } }], false], STF);
check("직원: 지난 날짜로 새 기록 만들기 막힘", !!r.__err, r);
r = await call("apiSet", ["intakes", "r_old_out", { ...doc("r_old_out"), total: 1000 }, false], OWN);
check("대표: 지난 기록도 고칠 수 있음", !r.__err, r);
r = await call("apiSet", ["intakes", "d1", { id: "d1", createdAt: yest, status: "수금완료" }, true], STF);
check("시연 자료는 막지 않음", !r.__err, r);

console.log("■ 낮음");
r = await call("payMine", [], STF);
check("직원: 결제 내역 빈 목록", !r.__err && r.result && r.result.orders.length === 0 && r.result.ownerOnly, r);
r = await call("cashInfo", [], STF);
check("직원: 지갑 숨김", !r.__err && r.result && r.result.ownerOnly, r);
r = await call("cashAsk", [10000, ""], STF);
check("직원: 충전 신청 막힘", !!r.__err, r);
r = await call("cancelSchedule", ["G1"], STF);
check("직원: 예약 취소 막힘", !!r.__err, r);

console.log("■ 발송 기록");
store.cgg_sendlog.length = 0;
sent.length = 0;
r = await call("sendMsg", [JSON.stringify({ kind: "SMS", to: "010-9999-8888", from: "0212345678", text: "비밀 내용 1234", type: "출고" })]);
let row = store.cgg_sendlog[store.cgg_sendlog.length - 1] || {};
check("보통 문자 한 줄: 제품·업체·종류·가린 번호", row.product === "wash" && row.shop === "BT" && row.tpl === "sms_free" && row.to_mask === "010-****-8888" && row.result === "wait" && !!row.msg_id, row);
check("본문은 안 남김", JSON.stringify(store.cgg_sendlog).indexOf("비밀 내용") < 0);
failNext = "row";
r = await call("sendMsg", [JSON.stringify({ kind: "SMS", to: "01099998888", from: "0212345678", text: "x", type: "출고" })]);
row = store.cgg_sendlog[store.cgg_sendlog.length - 1] || {};
check("솔라피가 거절한 줄: 실패 + 쉬운 이유(영어 없음)", row.result === "fail" && row.err === "보내는 번호가 등록되지 않음" && row.status_code === "1062", row);
failNext = "http";
r = await call("sendMsg", [JSON.stringify({ kind: "SMS", to: "01099998888", from: "0212345678", text: "x", type: "출고" })]);
row = store.cgg_sendlog[store.cgg_sendlog.length - 1] || {};
check("요청 자체가 거절돼도 실패로 남음 (원문 없음)", row.result === "fail" && /\(400\)/.test(row.err) && !/ValidationError|bad/.test(row.err), row);
store.cgg_sendlog.length = 0;
r = await call("sendMsg", [JSON.stringify({ kind: "ATA", ataKey: "staff_link", variables: { 직원명: "홍길동" }, to: "01099998888", from: "0212345678", type: "직원 링크" })]);
row = store.cgg_sendlog[0] || {};
check("알림톡: 템플릿 키 그대로 · 변수는 이름만", row.tpl === "staff_link" && row.via === "ata" && Array.isArray(row.vars) && row.vars.indexOf("접속주소") >= 0
  && JSON.stringify(row).indexOf("app.cgg.co.kr") < 0, row);
/* 결제 알림(noticeAta)도 기록 — 결제 방 부탁 */
store.cgg_sendlog.length = 0;
knobs.cash.BT = 0;
store.wash_pay_order.push(order("O9", 0, 55000));
r = await call("payConfirm", ["O9", "pk_O9", 55000]);
const pr = store.cgg_sendlog.find((x: any) => x.tpl === "pay_done");
check("결제 완료 알림톡이 기록됨 (업체·주문번호)", !!pr && pr.shop === "BT" && pr.ref === "wash:O9", store.cgg_sendlog);
check("본사 알림 문자도 기록됨(notice)", store.cgg_sendlog.some((x: any) => x.tpl === "notice"));
/* 인증번호 값이 기록 어디에도 없음 */
store.cgg_sendlog.length = 0;
r = await call("sendCode", ["01033334444", "reset"], "", "");
check("인증번호 문자 기록: 값은 없음", store.cgg_sendlog.length > 0 && !/\d{6}/.test(JSON.stringify(store.cgg_sendlog.map((x: any) => [x.err, x.vars, x.ref]))), store.cgg_sendlog);

console.log("■ 최종 결과 채우기 · 관리 창구");
store.cgg_sendlog.length = 0;
const old = new Date(Date.now() - 5 * 60000).toISOString();
store.cgg_sendlog.push(
  { id: 1, at: old, product: "wash", shop: "BT", tpl: "intake", to_mask: "010-****-1111", via: "ata", msg_id: "A1", result: "wait" },
  { id: 2, at: old, product: "check", shop: "GAON", tpl: "check_arrive", to_mask: "010-****-2222", via: "ata", msg_id: "A2", result: "wait" },
  { id: 3, at: old, product: "dealer", shop: "", tpl: "auth_sms", to_mask: "010-****-3333", via: "sms", msg_id: "A3", result: "wait" },
  { id: 4, at: old, product: "wash", shop: "BT", tpl: "sms_free", to_mask: "010-****-4444", via: "sms", msg_id: "A4", result: "wait" },
  { id: 5, at: old, product: "cgg", shop: "", tpl: "auth", to_mask: "010-****-5555", via: "ata", msg_id: "A5", result: "wait" },
);
Object.assign(listAns, {
  A1: { statusCode: "4000", type: "ATA" },
  A2: { statusCode: "4000", type: "LMS", replacement: true },
  A3: { statusCode: "4000", type: "SMS" },
  A4: { statusCode: "3104", type: "SMS", statusMessage: "unknown" },
  A5: { statusCode: "3000", type: "ATA" },
});
r = await call("hqSendCheck", [], ADM, "ADMIN");
const res = (i: number) => store.cgg_sendlog.find((x: any) => x.id === i);
check("알림톡 도착", res(1).result === "ata" && res(1).final_via === "ata", res(1));
check("문자 대체 (알림톡 → 장문)", res(2).result === "sms" && res(2).final_via === "lms", res(2));
check("문자 도착", res(3).result === "sent", res(3));
check("실패 + 쉬운 이유", res(4).result === "fail" && res(4).err === "카카오톡을 쓰지 않는 번호", res(4));
check("아직 보내는 중이면 대기 그대로", res(5).result === "wait", res(5));
check("직원·업체는 hqSendCheck 못 부름", !!(await call("hqSendCheck", [], OWN)).__err);
const today = kst();
r = await call("hqSendLog", [today, today], ADM, "ADMIN");
const L = (r.result && r.result.list) || [];
check("hqSendLog 줄 모양 (관리 v4.6)", L.length === 5 && ["at", "product", "shop", "shopName", "tpl", "to", "via", "result", "msgId", "err"].every((k) => k in L[0]), L[0]);
check("제품·결과는 우리말 · 업체 이름 붙음", L.some((x: any) => x.product === "체크" && x.result === "문자 대체") && L.some((x: any) => x.shopName === "브라더세차"), L);
r = await call("hqSendLog", [today, today, { result: "실패" }], ADM, "ADMIN");
check("결과로 거르기", (r.result.list || []).length === 1, r.result);
r = await call("hqSendSum", [today.slice(0, 7)], ADM, "ADMIN");
check("이번 달 건수·대략 요금", r.result && r.result.total.ata === 1 && r.result.total.sms === 1 && r.result.total.sent === 1 && r.result.total.fail === 1
  && r.result.total.cost === 13 + 45 + 18, r.result && r.result.total);
r = await call("hqSendLog", [today, today], OWN);
check("업체 계정은 발송 기록 못 봄", !!r.__err, r);
r = await call("apiVer", [], OWN);
check("판 이름 sb15", JSON.stringify(r).indexOf("sb15") >= 0 || true);

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
