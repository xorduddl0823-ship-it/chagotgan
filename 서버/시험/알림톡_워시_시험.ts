// 워시 서버 sb5 시험 — 알림톡 먼저, 안 되면 문자 (noticeAta) · 가짜 수파베이스
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
await import(Deno.env.get("WASH_SRC") ?? "../1_차곳간워시_서버_wash-api_sb5.ts");
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
const sv = await call("hqAtaSave", [{ tpl: { otp: "KA01TP_OTP", charge: "KA01TP_CHG", deposit: "KA01TP_DEP", out: "KA01TP_OUT", nope: "X" } }], ADM, "ADMIN");
check("본사 계정으로 저장됨 (모르는 이름은 버림)", sv.result?.ok && !sv.result.cfg.tpl.nope && sv.result.cfg.tpl.otp === "KA01TP_OTP", sv);
check("업체 계정은 저장 못 함", !!(await call("hqAtaSave", [{ tpl: {} }], OWN, "BT")).__err);
const gt = await call("hqAtaGet", [], ADM, "ADMIN");
check("보기: 지금 아는 7개 이름과 넣은 코드 (8번째는 확정본 받으면 추가)", gt.result?.list?.length === 7 && gt.result.list.find((x: any) => x.key === "otp").code === "KA01TP_OTP", gt.result?.list?.length);

console.log("③ 인증번호 — 알림톡 먼저");
reset();
await call("sendCode", ["01055556666", "reset"]);
const k = sent[0]?.kakaoOptions;
check("알림톡으로 나감 (템플릿 코드·채널)", k?.templateId === "KA01TP_OTP" && k?.pfId === "PF_TEST", sent[0]);
check("변수 #{인증번호} 에 6자리", /^\d{6}$/.test(k?.variables?.["#{인증번호}"] ?? ""), k?.variables);
check("알림톡이 안 되면 솔라피가 문자로 대신 (disableSms:false + 문자 글)", k?.disableSms === false && /인증번호/.test(sent[0]?.text ?? ""));
reset(); mode = "ataFail";
await call("sendCode", ["01055556666", "reset"]);
check("알림톡이 거절되면 서버가 바로 문자로 보냄", sent.length === 1 && !sent[0].kakaoOptions && /인증번호 \d{6}/.test(sent[0].text), sent);
check("거절 이유는 기록에만", errs.some((e) => /noticeAta failed/.test(e)));
mode = "ok";

console.log("④ 새 안내 (충전완료·입금확인) — 알림톡 코드가 있을 때만");
reset();
await call("hqCashAdd", ["BT", 50000, 365, "계좌 입금", "paid"], ADM, "ADMIN");
const chg = sent.find((m) => m.kakaoOptions?.templateId === "KA01TP_CHG");
check("충전완료 알림톡이 업체 대표에게", chg?.to === "01077778888" && chg.kakaoOptions.variables["#{충전금액}"] === "50,000원", sent);
check("새 안내는 문자로 대신 보내지 않음 (disableSms:true · 문자 비용 안 늚)", chg?.kakaoOptions?.disableSms === true && !chg.text);
reset();
await call("hqPayMark", ["P1", "paid", "계좌이체"], ADM, "ADMIN");
const dep = sent.find((m) => m.kakaoOptions?.templateId === "KA01TP_DEP");
check("입금확인 알림톡이 업체 대표에게", dep?.to === "01077778888" && dep.kakaoOptions.variables["#{입금액}"] === "33,000원", sent);
reset();
store.wash_hq[0].ata_cfg = { tpl: { otp: "KA01TP_OTP" } };
await call("hqAtaGet", [], ADM, "ADMIN");   // 설정 다시 읽기
await call("hqCashAdd", ["BT", 10000, 365, "", "paid"], ADM, "ADMIN");
check("충전완료 코드가 없으면 업체 대표에게는 아무것도 안 보냄", !sent.some((m) => m.to === "01077778888"), sent);

console.log("⑤ 출고안내 — 화면이 ataKey 만 주면 본사 템플릿");
store.wash_hq[0].ata_cfg = { tpl: { out: "KA01TP_OUT" } };
await call("hqAtaGet", [], ADM, "ADMIN");
reset();
const o = await call("sendMsg", [JSON.stringify({ to: "01012341234", from: "x", kind: "ATA", ataKey: "out",
  text: "[브라더세차] 출고 안내", variables: { "#{업체}": "브라더세차" } })], OWN, "BT");
check("본사 채널 출고안내 템플릿으로 나감", sent[0]?.kakaoOptions?.templateId === "KA01TP_OUT" && sent[0]?.kakaoOptions?.pfId === "PF_TEST", { o, s: sent[0] });

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
