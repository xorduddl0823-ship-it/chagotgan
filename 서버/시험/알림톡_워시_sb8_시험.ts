// 워시 서버 sb8 시험 (sb7 시험 + 알림톡 방 요청서 04: 입금됨은 요금제 건만 · 빈 값 · 「무료」 금지어 · 접속주소) — 알림톡 먼저, 안 되면 문자 (noticeAta) · 2026-10-10 확정본 변수·대체 문구 대조 · 가짜 수파베이스
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/알림톡_워시_sb8_시험.ts
import { store } from "./fake_supabase_wash.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s");
Deno.env.set("SMS_FROM", "0212345678"); Deno.env.set("PF_ID", "PF_TEST");
const far = new Date(Date.now() + 864e5).toISOString();
const ADM = "b".repeat(48), OWN = "c".repeat(48);
Object.assign(store, {
  wash_hq: [{ id: 1, ata_cfg: {} }],
  wash_shops: [{ shop: "BT", name: "브라더세차", active: true, plan: "pro", paid_until: far, trial_until: far, owner_phone: "01077778888" }],
  wash_users: [{ phone: "01055556666", shop: "BT", role: "staff", active: true }],
  wash_sessions: [
    { sid: ADM, phone: "01000000000", shop: "ADMIN", role: "admin", expires_at: far },
    { sid: OWN, phone: "01077778888", shop: "BT", role: "owner", expires_at: far },
  ],
  wash_payments: [{ id: "P1", shop: "BT", amount: 33000, status: "ready", plan: "pro" },
                  { id: "P2", shop: "BT", amount: 55000, status: "ready", plan: "", memo: "캐시 충전 입금" }],
  wash_plans: [{ code: "pro", name: "프로" }],
  wash_otp: [], cgg_access: [], wash_viewcode: [], wash_docs: [],
});
let mode: "ok" | "ataFail" = "ok";
const sent: any[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  if (String(url).includes("solapi")) {
    const m = JSON.parse(String(init?.body || "{}")).messages?.[0];
    if (m?.kakaoOptions && mode === "ataFail")
      return Response.json({ failedMessageList: [{ statusCode: "3104", statusMessage: "템플릿 변수 불일치" }] });
    sent.push(m);
    return Response.json({ groupInfo: { groupId: "G" }, messageList: {}, failedMessageList: [] });
  }
  throw new Error("예상 못 한 주소 " + url);
}) as typeof fetch;
const errs: string[] = [];
console.error = (...a: unknown[]) => { errs.push(a.map(String).join(" ")); };
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
const SRC = Deno.env.get("WASH_SRC") ?? new URL("../1_차곳간워시_서버_wash-api_sb8.ts", import.meta.url).href;
await import(SRC);
const call = async (fn: string, args: unknown[], token = "", shop = "") =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop, token, fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const reset = () => { sent.length = 0; store.wash_otp = []; store.wash_rate = []; };

console.log("① 코드가 비어 있으면 지금처럼 문자");
reset();
await call("sendCode", ["01055556666", "reset"]);
check("인증번호가 문자로 나감 (알림톡 아님)", sent.length === 1 && !sent[0].kakaoOptions && /인증번호 \d{6}/.test(sent[0].text), sent);

console.log("② 관제센터에 코드 넣기");
const sv = await call("hqAtaSave", [{ tpl: { auth: "KA01TP_OTP", cash_done: "KA01TP_CHG", pay_done: "KA01TP_PAY", release: "KA01TP_OUT", deposit_ok: "KA01TP_DEP", nope: "X" } }], ADM, "ADMIN");
check("본사 계정으로 저장됨 (모르는 이름은 버림)", sv.result?.ok && !store.wash_hq[0].ata_cfg.tpl.nope && store.wash_hq[0].ata_cfg.tpl.auth === "KA01TP_OTP", store.wash_hq[0]);
check("업체 계정은 저장 못 함", !!(await call("hqAtaSave", [{ tpl: {} }], OWN, "BT")).__err);
const gt = await call("hqAta", [], ADM, "ADMIN");
check("보기(관리 화면 모양): 15개 키(13 + check_arrive + staff_link) · pfSet · 서버 연결 9개 ready(통과 8 + staff_link)", Object.keys(gt.result?.tpls ?? {}).length === 15 && "check_arrive" in gt.result.tpls && "staff_link" in gt.result.tpls && gt.result.tpls.auth === "KA01TP_OTP" && gt.result.pfSet === true && gt.result.ready.length === (SRC.includes("sb7") ? 8 : 9) && !!gt.result.stats, gt.result);

console.log("③ 인증번호 — 확정본 변수 #{인증번호}·#{유효시간}");
reset();
await call("sendCode", ["01055556666", "reset"]);
const k = sent[0]?.kakaoOptions;
check("알림톡으로 나감 (템플릿 코드·채널)", k?.templateId === "KA01TP_OTP" && k?.pfId === "PF_TEST", sent[0]);
check("변수 이름이 확정본과 같음 (#{인증번호} 6자리 · #{유효시간} 5)", /^\d{6}$/.test(k?.variables?.["#{인증번호}"] ?? "") && k?.variables?.["#{유효시간}"] === "5" && Object.keys(k?.variables ?? {}).length === 2, k?.variables);
check("알림톡이 안 되면 확정본 대체 문구로 (disableSms:false)", k?.disableSms === false && sent[0]?.text === "[차곳간] 인증번호 " + k?.variables?.["#{인증번호}"] + " (5분 안에 입력)", sent[0]?.text);
reset(); mode = "ataFail";
await call("sendCode", ["01055556666", "reset"]);
check("알림톡이 거절되면 서버가 바로 확정본 대체 문구로 문자", sent.length === 1 && !sent[0].kakaoOptions && /^\[차곳간\] 인증번호 \d{6} \(5분 안에 입력\)$/.test(sent[0].text), sent);
check("거절 이유는 기록에만", errs.some((e) => /noticeAta failed/.test(e)));
mode = "ok";

console.log("④ 충전완료·결제완료 — 업체 대표에게 (확정본 변수)");
reset();
await call("hqCashAdd", ["BT", 50000, 365, "계좌 입금", "paid"], ADM, "ADMIN");
const chg = sent.find((m) => m.kakaoOptions?.templateId === "KA01TP_CHG");
const cv = chg?.kakaoOptions?.variables ?? {};
check("충전완료 알림톡이 업체 대표에게", chg?.to === "01077778888", sent);
check("변수: #{업체명}·#{금액}=50,000·#{잔액}·#{사용기한} (원 글자는 본문에)", cv["#{업체명}"] === "브라더세차" && cv["#{금액}"] === "50,000" && "#{잔액}" in cv && /년|월|일|\d/.test(cv["#{사용기한}"] ?? "") && Object.keys(cv).length === 4, cv);
check("대체 문구는 확정본 모양", /^\[차곳간\] 50,000원 충전되었습니다\. 잔액 .+원\.\n문의 010-9559-3663$/.test(chg?.text ?? ""), chg?.text);
reset();
await call("hqPayMark", ["P1", "paid", "계좌이체"], ADM, "ADMIN");
const pay = sent.find((m) => m.kakaoOptions?.templateId === "KA01TP_PAY");
const pv = pay?.kakaoOptions?.variables ?? {};
check("본사 「입금됨」 표시는 결제완료 알림톡 (입금확인 아님)", pay?.to === "01077778888" && !sent.some((m) => m.kakaoOptions?.templateId === "KA01TP_DEP"), sent);
check("결제완료 변수: #{금액}=33,000·#{결제수단}=계좌이체·#{요금제}·#{이용기한}", pv["#{금액}"] === "33,000" && pv["#{결제수단}"] === "계좌이체" && "#{요금제}" in pv && "#{이용기한}" in pv && Object.keys(pv).length === 5, pv);
reset();
store.wash_hq[0].ata_cfg = { tpl: { auth: "KA01TP_OTP" } };
await call("hqAta", [], ADM, "ADMIN");
await call("hqCashAdd", ["BT", 10000, 365, "", "paid"], ADM, "ADMIN");
check("충전완료 코드가 없으면 업체 대표에게 아무것도 안 보냄 (문자 비용 안 늚)", !sent.some((m) => m.to === "01077778888"), sent);

console.log("⑤ 화면이 ataKey 로 — 출고안내·입금확인 (sb7: 서버가 업체·보기코드를 정함)");
store.wash_hq[0].ata_cfg = { tpl: { release: "KA01TP_OUT", deposit_ok: "KA01TP_DEP", bill: "KA01TP_BILL" } };
await call("hqAta", [], ADM, "ADMIN");
store.wash_shops[0].sms_from = "01011112222";
store.wash_docs = [{ shop: "BT", demo: false, col: "intakes", id: "i1", data: { plate: "12가3456" } }];
store.wash_viewcode = [];
const OUTV = { 딜러명: "김딜러", 상사명: "좋은상사", 차량번호: "12가3456", 작업내용: "광택", 목적지: "본사 주차장",
  출고일시: "10/15 14:00", 업체전화: "010-9999-9999", 업체명: "차곳간 본사", 보기코드: "EVILEVILEVILEVILEVILEVIL" };
reset();
await call("sendMsg", [JSON.stringify({ to: "01012341234", from: "x", kind: "ATA", ataKey: "release", rec: "i1", variables: OUTV })], OWN, "BT");
const ov = sent[0]?.kakaoOptions?.variables ?? {};
check("출고안내: 본사 템플릿 + 확정본 변수 9개", sent[0]?.kakaoOptions?.templateId === "KA01TP_OUT" && Object.keys(ov).length === 9, sent[0]);
check("업체명·업체전화는 화면 값이 아니라 서버 값 (가짜 「차곳간 본사」 못 씀)", ov["#{업체명}"] === "브라더세차" && ov["#{업체전화}"] === "010-1111-2222", ov);
const made = store.wash_viewcode.find((x: any) => x.rec_id === "i1");
check("보기코드는 화면이 준 값이 아니라 서버가 만든 그 차의 코드", !!made && ov["#{보기코드}"] === made.code && ov["#{보기코드}"] !== OUTV.보기코드, { ov, made });
check("대신 보낼 문자에도 서버가 만든 주소", (sent[0]?.text ?? "").includes("v.html?c=" + (made?.code ?? "x")), sent[0]?.text);
reset();
const noRec = await call("sendMsg", [JSON.stringify({ to: "01012341234", from: "x", kind: "ATA", ataKey: "release", variables: OUTV })], OWN, "BT");
check("입고 기록 번호 없이 출고안내는 거절 (아무것도 안 나감)", !!noRec.__err && sent.length === 0, noRec);
const other = await call("sendMsg", [JSON.stringify({ to: "01012341234", from: "x", kind: "ATA", ataKey: "release", rec: "남의차", variables: OUTV })], OWN, "BT");
check("이 업체 차가 아니면 거절", /찾지 못했습니다/.test(other.__err ?? ""), other);
reset();
const partial: any = { ...OUTV }; delete partial.목적지;
await call("sendMsg", [JSON.stringify({ to: "01012341234", from: "x", kind: "ATA", ataKey: "release", rec: "i1", variables: partial })], OWN, "BT");
check("확정본 변수가 하나라도 빠지면 알림톡 대신 문자 (실패하지 않음)", sent.length === 1 && !sent[0].kakaoOptions && /12가3456 출고되었습니다/.test(sent[0].text), sent[0]);
console.log("⑥ 청구서 — 그 업체의 살아 있는 청구서 보기코드만");
store.wash_viewcode.push({ code: "B".repeat(24), shop: "OTHER", rec_id: "b9", kind: "bill", expires_at: far },
                         { code: "C".repeat(24), shop: "BT", rec_id: "b1", kind: "bill", expires_at: far });
const BILLV = { 기간: "9월", 받는곳: "좋은상사", 건수: 12, 금액: "1,100,000", 입금기한: "10/31", 계좌: "국민 123", 보기코드: "B".repeat(24) };
reset();
const bad = await call("sendMsg", [JSON.stringify({ to: "01012341234", from: "x", kind: "ATA", ataKey: "bill", variables: BILLV })], OWN, "BT");
check("남의 업체 청구서 보기코드는 거절", /이 업체 것이 아니거나/.test(bad.__err ?? "") && sent.length === 0, bad);
reset();
await call("sendMsg", [JSON.stringify({ to: "01012341234", from: "x", kind: "ATA", ataKey: "bill", variables: { ...BILLV, 보기코드: "C".repeat(24) } })], OWN, "BT");
check("우리 업체 청구서 보기코드는 알림톡", sent[0]?.kakaoOptions?.templateId === "KA01TP_BILL" && sent[0].kakaoOptions.variables["#{보기코드}"] === "C".repeat(24), sent[0]);
console.log("⑦ 입금확인 · 권유 문구");
reset();
await call("sendMsg", [JSON.stringify({ to: "01012341234", from: "x", kind: "ATA", ataKey: "deposit_ok",
  variables: { "#{받는곳}": "좋은상사", "#{금액}": "1,100,000", "#{확인일시}": "10/15 15:00", "#{기간}": "9월" } })], OWN, "BT");
check("입금확인: 업체명·전화는 서버가 채우고 알림톡", sent[0]?.kakaoOptions?.templateId === "KA01TP_DEP" && sent[0].kakaoOptions.variables["#{업체명}"] === "브라더세차", sent[0]);
const src = await Deno.readTextFile(SRC.startsWith("file:") ? new URL(SRC) : SRC);
check("업체 대표 문자에서 「충전하기 ▶」 권유 문구가 사라짐 (주석 빼고)", !src.split("\n").filter((l) => !l.trim().startsWith("//")).some((l) => /충전하기 ▶/.test(l)));

console.log("⑧ sb8 — 입금됨은 요금제 건만");
store.wash_hq[0].ata_cfg = { tpl: { pay_done: "KA01TP_PAY", release: "KA01TP_OUT", staff_link: "KA01TP_STAFF" } };
await call("hqAta", [], ADM, "ADMIN");
reset();
await call("hqPayMark", ["P2", "paid", "계좌이체"], ADM, "ADMIN");
check("요금제 코드가 없는 건(캐시 충전 입금)은 결제완료를 안 보냄 (요금제·이용 기한 틀리게 안 찍힘)", !sent.some((m) => m.to === "01077778888"), sent);
reset();
store.wash_payments.find((p: any) => p.id === "P1").status = "ready";
await call("hqPayMark", ["P1", "paid", "계좌이체"], ADM, "ADMIN");
const pv8 = sent.find((m) => m.kakaoOptions?.templateId === "KA01TP_PAY")?.kakaoOptions?.variables ?? {};
check("요금제 건은 결제완료 · #{요금제} = 그 결제의 요금제 이름", pv8["#{요금제}"] === "프로", pv8);

console.log("⑨ sb8 — 빈 값");
const keepUntil = store.wash_shops[0].paid_until;
store.wash_shops[0].paid_until = null;
reset();
store.wash_payments.find((p: any) => p.id === "P1").status = "ready";
await call("hqPayMark", ["P1", "paid", "계좌이체"], ADM, "ADMIN");
check("업체 대표 안내에 빈 값(이용기한)이 있으면 알림톡 대신 대체 문구 문자", sent.length >= 1 && sent.filter((m) => m.to === "01077778888").every((m) => !m.kakaoOptions) && sent.some((m) => m.to === "01077778888"), sent);
store.wash_shops[0].paid_until = keepUntil;
reset();
await call("sendMsg", [JSON.stringify({ to: "01012341234", from: "x", kind: "ATA", ataKey: "release", rec: "i1", variables: { ...OUTV, 상사명: "" } })], OWN, "BT");
check("상사명이 비면 「개인」으로 알림톡", sent[0]?.kakaoOptions?.variables?.["#{상사명}"] === "개인", sent[0]);

console.log("⑩ sb8 — 「무료」 금지어");
const live = src.split("\n").filter((l) => !l.trim().startsWith("//"));
check("대표에게 가는 안내의 #{무엇}·잠금 문구에 「무료 체험」이 없음", !live.some((l) => /무엇: .*무료 체험|"trial" \? "무료 체험"/.test(l)), live.filter((l) => /무료 체험/.test(l)));

console.log("⑪ sb8 — 접속주소안내: 주소는 서버가 직원용 주소로만");
reset();
await call("sendMsg", [JSON.stringify({ to: "01055556666", from: "x", kind: "ATA", ataKey: "staff_link",
  variables: { 직원명: "김직원", 업체명: "가짜", 접속주소: "https://app.cgg.co.kr/?shop=BT&key=SECRET" } })], OWN, "BT");
const sv8 = sent[0]?.kakaoOptions?.variables ?? {};
check("열쇠 섞인 주소를 줘도 직원용 주소로 바꿔 보냄", sv8["#{접속주소}"] === "https://app.cgg.co.kr/" && !JSON.stringify(sent).includes("SECRET"), sent[0]);
check("업체명은 서버 값", sv8["#{업체명}"] === "브라더세차", sv8);
check("대신 보낼 문자에도 열쇠 없음", !(sent[0]?.text ?? "").includes("key="), sent[0]?.text);

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
