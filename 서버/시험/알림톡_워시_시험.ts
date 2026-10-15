// 워시 서버 sb6 시험 — 알림톡 먼저, 안 되면 문자 (noticeAta) · 2026-10-10 확정본 변수·대체 문구 대조 · 가짜 수파베이스
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/알림톡_워시_시험.ts
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
  wash_payments: [{ id: "P1", shop: "BT", amount: 33000, status: "ready" }],
  wash_otp: [], cgg_access: [],
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
await import(Deno.env.get("WASH_SRC") ?? "../1_차곳간워시_서버_wash-api_sb6.ts");
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
const sv = await call("hqAtaSave", [{ tpl: { otp: "KA01TP_OTP", charge: "KA01TP_CHG", pay: "KA01TP_PAY", out: "KA01TP_OUT", deposit: "KA01TP_DEP", nope: "X" } }], ADM, "ADMIN");
check("본사 계정으로 저장됨 (모르는 이름은 버림)", sv.result?.ok && !sv.result.cfg.tpl.nope && sv.result.cfg.tpl.otp === "KA01TP_OTP", sv);
check("업체 계정은 저장 못 함", !!(await call("hqAtaSave", [{ tpl: {} }], OWN, "BT")).__err);
const gt = await call("hqAtaGet", [], ADM, "ADMIN");
check("보기: 통과 8개 이름과 넣은 코드", gt.result?.list?.length === 8 && gt.result.list.find((x: any) => x.key === "otp").code === "KA01TP_OTP", gt.result?.list?.map((x: any) => x.name));

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
store.wash_hq[0].ata_cfg = { tpl: { otp: "KA01TP_OTP" } };
await call("hqAtaGet", [], ADM, "ADMIN");
await call("hqCashAdd", ["BT", 10000, 365, "", "paid"], ADM, "ADMIN");
check("충전완료 코드가 없으면 업체 대표에게 아무것도 안 보냄 (문자 비용 안 늚)", !sent.some((m) => m.to === "01077778888"), sent);

console.log("⑤ 화면이 ataKey 로 — 출고안내·입금확인");
store.wash_hq[0].ata_cfg = { tpl: { out: "KA01TP_OUT", deposit: "KA01TP_DEP" } };
await call("hqAtaGet", [], ADM, "ADMIN");
const OUTV = { 딜러명: "김딜러", 상사명: "좋은상사", 차량번호: "12가3456", 작업내용: "광택", 목적지: "본사 주차장",
  출고일시: "10/15 14:00", 업체전화: "010-1111-2222", 업체명: "브라더세차", 보기코드: "ABCDEF" };
reset();
await call("sendMsg", [JSON.stringify({ to: "01012341234", from: "x", kind: "ATA", ataKey: "out", variables: OUTV })], OWN, "BT");
check("출고안내: 본사 템플릿 + 확정본 변수 9개", sent[0]?.kakaoOptions?.templateId === "KA01TP_OUT" && Object.keys(sent[0]?.kakaoOptions?.variables ?? {}).length === 9 && sent[0].kakaoOptions.variables["#{보기코드}"] === "ABCDEF", sent[0]);
check("출고안내 대체 문구에 도착 사진 주소", /v\.html\?c=ABCDEF/.test(sent[0]?.text ?? ""), sent[0]?.text);
reset();
const partial: any = { ...OUTV }; delete partial.보기코드;
await call("sendMsg", [JSON.stringify({ to: "01012341234", from: "x", kind: "ATA", ataKey: "out", variables: partial })], OWN, "BT");
check("확정본 변수가 하나라도 빠지면 알림톡 대신 문자 (실패하지 않음)", sent.length === 1 && !sent[0].kakaoOptions && /12가3456 출고되었습니다/.test(sent[0].text), sent[0]);
reset();
await call("sendMsg", [JSON.stringify({ to: "01012341234", from: "x", kind: "ATA", ataKey: "deposit",
  variables: { "#{받는곳}": "좋은상사", "#{금액}": "1,100,000", "#{업체명}": "브라더세차", "#{확인일시}": "10/15 15:00", "#{기간}": "9월", "#{업체전화}": "010-1111-2222" } })], OWN, "BT");
check("입금확인(업체→거래처): #{…} 모양으로 보내도 알림톡", sent[0]?.kakaoOptions?.templateId === "KA01TP_DEP" && sent[0].kakaoOptions.variables["#{받는곳}"] === "좋은상사", sent[0]);

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
