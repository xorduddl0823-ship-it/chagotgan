// 체크 서버 v33 시험 — 청구서 보내기(billSend) · 청구서 보기 보강(invoiceView) · 재검사 알림(remind*) (가짜 수파베이스 · 가짜 솔라피)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v33_청구서보내기_재검사알림_시험.ts
import { store } from "./fake_supabase_check.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s");
Deno.env.set("SMS_FROM", "0212345678");
Deno.env.set("CHECK_VIEW_IP_MAX", "5");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v33.ts";
const day = new Date(Date.now() + 86400000).toISOString();
const kst = (n = 0) => new Date(Date.now() + 9 * 3600e3 + n * 86400000).toISOString().slice(0, 10);
Object.assign(store, {
  check_office: [
    { id: "o1", code: "TEST", name: "시험검사소", tel: "031-000-0000", sms_from: "0311112222", bank_fee: "국민 123-45 시험검사소", ins_valid_days: 120 },
    { id: "o2", code: "BBB", name: "남의검사소", tel: "031-999-9999", sms_from: "0319998888", ins_valid_days: 120 },
  ],
  check_user: [
    { id: "u1", office_id: "o1", phone: "01011110000", name: "대표", role: "owner", active: true, pw_hash: "x" },
    { id: "u2", office_id: "o1", phone: "01022220000", name: "직원", role: "staff", active: true, pw_hash: "x" },
  ],
  check_session: [
    { sid: "chk_own", phone: "01011110000", office_id: "o1", role: "owner", expires_at: day },
    { sid: "chk_stf", phone: "01022220000", office_id: "o1", role: "staff", expires_at: day },
  ],
  cgg_access: [], wash_sessions: [], check_log: [], check_rate: [], cgg_sendlog: [],
  check_dealer: [
    { id: "d1", office_id: "o1", name: "홍딜러", tel: "010-3333-4444", active: true },
    { id: "d2", office_id: "o1", name: "김딜러", tel: "010-5555-6666", active: true },
    { id: "d9", office_id: "o2", name: "남의딜러", tel: "010-7777-8888", active: true },
  ],
  check_invoice: [
    { id: "i1", office_id: "o1", ym: "2026-09", bill_to_id: "d1", bill_to_name: "홍딜러", total_amount: 1234000, view_key: "abcdefghijklmnopqr", created_at: new Date().toISOString(), tax_key: "T1", members: ["홍딜러"] },
    { id: "i2", office_id: "o1", ym: "2026-09", bill_to_id: "d2", bill_to_name: "김딜러", total_amount: 50000, view_key: "bbbbbbbbbbbbbbbbbb", created_at: new Date().toISOString() },
    { id: "i9", office_id: "o2", ym: "2026-09", bill_to_id: "d9", bill_to_name: "남의딜러", total_amount: 1, view_key: "zzzzzzzzzzzzzzzzzz", created_at: new Date().toISOString() },
    { id: "iold", office_id: "o1", ym: "2026-05", bill_to_id: "d1", bill_to_name: "홍딜러", total_amount: 1, view_key: "oldoldoldoldoldold", created_at: new Date(Date.now() - 200 * 86400000).toISOString() },
  ],
  check_invoice_row: [
    { id: "r1", invoice_id: "i1", kind: "fee", dealer_name: "홍딜러", item: "국산", qty: 1, unit: 1000, amount: 1100, car_id: "c-secret" },
    { id: "r2", invoice_id: "i1", kind: "fee", dealer_name: "홍딜러", item: "국산", qty: 1, unit: 1000, amount: 1100 },
  ],
  check_car: [
    { id: "c1", office_id: "o1", dealer_id: "d1", plate: "12가3456", car_name: "쏘나타", check_date: kst(-120 + 7), vin: "VIN1" },   // 7일 남음
    { id: "c2", office_id: "o1", dealer_id: "d1", plate: "34나5678", car_name: "아반떼", check_date: kst(-120 + 6), vin: "VIN2" },   // 6일 남음
    { id: "c3", office_id: "o1", dealer_id: "d2", plate: "56다7890", car_name: "K5", check_date: kst(-120 + 50) },                 // 50일 남음 (대상 아님)
    { id: "c9", office_id: "o2", dealer_id: "d9", plate: "99라9999", car_name: "남의차", check_date: kst(-120 + 7) },
  ],
  check_remind_rule: [], check_remind_log: [], check_remind_view: [],
  wash_hq: [{ id: 1, cron_key: "CRONKEY-0123456789", ata_cfg: { pfId: "PF", tpl: { bill: "T_BILL" } } }],
});

const sent: any[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  const u = String(url);
  if (u.includes("solapi")) {
    const b = JSON.parse(String(init?.body || "{}"));
    if (!b.messages) return Response.json({});
    sent.push(b.messages[0]);
    return Response.json({ groupInfo: { _id: "G" }, failedMessageList: [], messageList: [{ messageId: "M" + sent.length, to: b.messages[0].to }] });
  }
  return Response.json({});
}) as typeof fetch;
console.error = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(SRC);
let ipN = 0;
async function call(fn: string, args: unknown[] = [], token = "", ip = "") {
  const r = await H[0](new Request("http://x", { method: "POST", headers: { "x-forwarded-for": ip || "10.0.0." + (++ipN) },
    body: JSON.stringify({ shop: "", token, fn, args }) }));
  const j = await r.json();
  return j && j.result !== undefined ? j.result : j;             // 성공은 {result} 로 옴
}
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const inv = (id: string) => store.check_invoice.find((x: any) => x.id === id);

console.log("■ 청구서 보내기");
let r = await call("billSend", [{ ym: "2026-09", ids: ["i1"] }], "chk_stf");
check("직원은 못 보냄", !!r.__err && /대표님만/.test(r.__err), r);
r = await call("billSend", [{ ym: "2026-09", ids: ["i1", "i9"] }], "chk_own");
check("다른 검사소 청구서가 섞이면 전체 거절", !!r.__err && /섞여/.test(r.__err) && sent.length === 0, r);
r = await call("billSend", [{ ym: "2026-09", ids: ["i1"], test: true, due: "10월 25일" }], "chk_own");
const t0 = sent[0] || {};
check("내 번호로 시험: 로그인한 사람 번호로 한 통 · sent_at 안 바뀜", t0.to === "01011110000" && !inv("i1").sent_at, [r, t0.to]);
check("본사 청구서 템플릿 · 변수는 서버 값 · 보기코드 k+열쇠", t0.kakaoOptions?.templateId === "T_BILL" && t0.kakaoOptions?.pfId === "PF" &&
  t0.kakaoOptions.variables["#{보기코드}"] === "kabcdefghijklmnopqr" && t0.kakaoOptions.variables["#{금액}"] === "1,234,000" &&
  t0.kakaoOptions.variables["#{기간}"] === "2026년 9월" && t0.kakaoOptions.variables["#{건수}"] === "2" &&
  t0.kakaoOptions.variables["#{입금기한}"] === "10월 25일" && t0.kakaoOptions.variables["#{계좌}"] === "국민 123-45 시험검사소", t0.kakaoOptions);
sent.length = 0;
r = await call("billSend", [{ ym: "2026-09", ids: ["i1", "i2"], due: "<script>" }], "chk_own");
check("청구처 2곳: 등록 번호로 · 보냄 기록", r.sent === 2 && sent.map((m) => m.to).join() === "01033334444,01055556666" && !!inv("i1").sent_at && inv("i1").send_how === "ata", [r, sent.map((m) => m.to)]);
check("입금기한이 이상한 글이면 «확인 후 입금»", sent[0]?.kakaoOptions?.variables["#{입금기한}"] === "확인 후 입금", sent[0]?.kakaoOptions?.variables);
check("보기 주소 기한(약 90일) 정해짐", Date.parse(inv("i1").view_until) > Date.now() + 80 * 86400000, inv("i1").view_until);
check("발송 기록 tpl check_bill · 가린 번호", store.cgg_sendlog.some((x: any) => x.tpl === "check_bill" && x.to_mask === "010-****-4444" && x.ref === "i1"));
sent.length = 0;
r = await call("billSend", [{ ym: "2026-09", ids: ["i1"] }], "chk_own");
check("10분 안 다시 누르면 안 감", sent.length === 0 && /방금/.test(r.results?.[0]?.why || ""), r);

sent.length = 0;
store.check_invoice.push({ id: "i3", office_id: "o1", ym: "2026-09", bill_to_id: "d2", bill_to_name: "자세히 https://evil.example.com/x 보기", total_amount: 1, view_key: "cccccccccccccccccc", created_at: new Date().toISOString() });
const both = await Promise.all([call("billSend", [{ ym: "2026-09", ids: ["i3"] }], "chk_own"), call("billSend", [{ ym: "2026-09", ids: ["i3"] }], "chk_own")]);
check("보안 L2: 동시에 두 번 눌러도 한 통", sent.length === 1, [both, sent.length]);
check("보안 L1: 검사소가 쓴 글의 주소 모양은 지워서 보냄", !/evil|https?:|\.com/.test(JSON.stringify(sent[0]?.kakaoOptions?.variables || {})) &&
  !/evil/.test(String(sent[0]?.text || "")), sent[0]?.kakaoOptions?.variables);

console.log("■ 청구서 보기 (로그인 없이)");
r = await call("invoiceView", ["kabcdefghijklmnopqr"]);
check("k 코드로 열림 · 정한 칸만 (검사소 id·열쇠·세금계산서 칸 없음)", !!r.invoice && r.invoice.office_id === undefined && r.invoice.view_key === undefined &&
  r.invoice.tax_key === undefined && r.invoice.total_amount === 1234000 && r.rows.length === 2 && r.rows[0].car_id === undefined, r);
check("열어봄 기록", Number(inv("i1").view_n) >= 1);
r = await call("invoiceView", ["oldoldoldoldoldold"]);
check("기한 지난 청구서는 «만료»만", r.expired === true && !r.invoice, r);
for (let i = 0; i < 5; i++) await call("invoiceView", ["bbbbbbbbbbbbbbbbbb"], "", "9.9.9.9");
r = await call("invoiceView", ["bbbbbbbbbbbbbbbbbb"], "", "9.9.9.9");
check("같은 IP 하루 한도", !!r.__err && /잠시 뒤/.test(r.__err), r);
r = await call("invoiceRekey", ["i1"], "chk_stf");
check("주소 새로 만들기: 직원 막힘", !!r.__err);
r = await call("invoiceRekey", ["i1"], "chk_own");
const r2 = await call("invoiceView", ["kabcdefghijklmnopqr"]);
check("주소 새로 만들면 예전 주소는 안 열림", r.ok === true && !!r2.__err && inv("i1").view_key !== "abcdefghijklmnopqr", [r, r2]);

console.log("■ 재검사 알림");
r = await call("remindRule", [], "chk_own");
check("기본 규칙 30·15·7 · 자동 꺼짐 · 템플릿 없음", JSON.stringify(r.steps) === "[30,15,7]" && r.auto === false && r.ataReady === false, r);
r = await call("remindRuleSave", [{ steps: [30, 15, 7], auto: true }], "chk_own");
check("템플릿 승인 전에는 매일 자동 못 켬", !!r.__err && /승인/.test(r.__err), r);
r = await call("remindList", [{ range: "30" }], "chk_own");
check("목록: 7일·6일 남은 차 (50일 남은 차·남의 차 없음)", Array.isArray(r) && r.length === 2 && r.every((x: any) => x.dealerId === "d1" && x.step === 7 && x.dealer === "홍딜러"), r);
r = await call("remindSend", [{ dealerIds: ["d1", "d9"] }], "chk_own");
check("다른 검사소 딜러가 섞이면 거절", !!r.__err, r);
sent.length = 0;
r = await call("remindSend", [{ dealerIds: ["d1"] }], "chk_own");
const m = sent[0] || {};
check("딜러 한 명에 한 통 (차 2대 묶음) · 템플릿 없어 문자", r.sent === 1 && sent.length === 1 && m.to === "01033334444" && !m.kakaoOptions && /2대/.test(m.text), [r, m]);
check("문자에 차대번호·전화 원문 없음", !/VIN|3333-4444/.test(String(m.text)));
sent.length = 0;
r = await call("remindSend", [{ dealerIds: ["d1"] }], "chk_own");
check("같은 날 다시 눌러도 안 감", sent.length === 0, r);
const vk = store.check_remind_view[0]?.view_key;
r = await call("remindView", [vk]);
check("보기 주소: 그 딜러 차만 · 차대번호 없음", r.dealer === "홍딜러" && r.cars.length === 2 && !JSON.stringify(r).includes("VIN") && !JSON.stringify(r).includes("남의차"), r);
store.check_remind_view[0].expires_at = new Date(Date.now() - 1000).toISOString();
r = await call("remindView", [vk]);
check("30일 지나면 «만료»만", r.expired === true && !r.cars, r);
r = await call("remindOff", [{ carIds: ["c3", "c9"], off: true }], "chk_own");
check("알림 빼기: 이 검사소 차만", r.n === 1 && store.check_car.find((c: any) => c.id === "c9").remind_off === undefined, r);
r = await call("remindCron", ["wrong"]);
check("자동: 열쇠가 틀리면 거절", !!r.__err, r);
r = await call("remindCron", ["CRONKEY-0123456789"]);
check("자동: 템플릿 승인 전이면 건너뜀", r.skipped !== undefined, r);
r = await call("ping");
check("판 v33", /v33/.test(JSON.stringify(r)), r);

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
