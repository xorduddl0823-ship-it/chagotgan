// 체크 서버 v55 시험 — 문자 업체 고르기(솔라피/비즈고): 청구서 알림톡→문자 대체(한 요청) · 업체별 템플릿 코드 · rid 한 번 · «확인 중» · 처음 업체 고정 · 재검사 매일 자동은 비즈고 코드 기준
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/비즈고_체크_v55_시험.ts
// 실제 발송 0 — 솔라피·비즈고 모두 가짜 응답(비즈고 모양은 공개 명세 github.com/icomm-api/bizgo-api-spec 예시와 같게).
import { store } from "./fake_supabase_check.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s"); Deno.env.set("SMS_FROM", "0212345678");
Deno.env.set("BIZGO_API_KEY", "BZKEY-test-only");
Deno.env.set("MSG_VENDOR", "bizgo");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v55.ts";
const day = new Date(Date.now() + 86400000).toISOString();
Object.assign(store, {
  check_office: [{ id: "oA", code: "TESTA", name: "시험검사소A", tel: "031-000-0001", sms_from: "0311112222", bank_fee: "국민 123-45 시험A" }],
  check_user: [{ id: "uA", office_id: "oA", phone: "01000000031", name: "대표A", role: "owner", active: true, pw_hash: "x" }],
  check_session: [{ sid: "chk_" + "a".repeat(30), phone: "01000000031", office_id: "oA", role: "owner", expires_at: day }],
  cgg_access: [], wash_sessions: [], check_log: [], check_rate: [], cgg_sendlog: [], cgg_idem: [],
  wash_hq: [{ id: 1, cron_key: "CRONKEY-0123456789abc", ata_cfg: { pfId: "PF_SOL", tpl: { bill: "SOL_BILL", check_remind: "SOL_REMIND" },
                                                                 bizgo: { senderKey: "SK_BZ", tpl: { bill: "BZ_BILL" } } } }],
  check_remind_rule: [], check_remind_log: [], check_remind_view: [], check_car: [],
  check_dealer: [{ id: "dA", office_id: "oA", name: "A딜러", tel: "010-3333-4444", active: true }],
  check_invoice: [{ id: "iA", office_id: "oA", ym: "2026-10", bill_to_id: "dA", bill_to_name: "A딜러", total_amount: 11000, view_key: "a".repeat(18), created_at: day }],
  check_invoice_row: [{ id: "rA", invoice_id: "iA" }],
});
let sol = 0, bzAccepted = 0;
const bz: any[] = [], plan: string[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  const u = String(url);
  if (u.includes("solapi") && u.includes("/messages/v4/send")) { sol++; return Response.json({ groupInfo: { _id: "G" }, failedMessageList: [], messageList: [{ messageId: "S" + sol }] }); }
  if (u.includes("ibapi.kr") && u.includes("/api/comm/v1/send/omni")) {
    const b = JSON.parse(String(init?.body || "{}"));
    bz.push({ url: u, auth: new Headers(init?.headers).get("Authorization"), body: b });
    const m = plan.shift() || "ok";
    await new Promise((r) => setTimeout(r, 30));
    const to = b.destinations?.[0]?.to;
    const env = (code: string, dest?: any) => Response.json({ common: { authCode: "A000", authResult: "Success" }, data: { code, result: code, data: dest ? { destinations: [dest] } : undefined } });
    if (m === "ok") { bzAccepted++; return env("A000", { to, msgKey: "MK" + bzAccepted, code: "A000", result: "Success" }); }
    if (m === "lost") { bzAccepted++; throw new TypeError("connection reset by peer"); }
    if (m === "tpl") return env("A505");                                           // 템플릿 코드 틀림 — 받지 않음 확정
    if (m === "reject") return env("A327");
  }
  return Response.json({});
}) as typeof fetch;
console.error = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(SRC);
const TA = "chk_" + "a".repeat(30);
const call = async (fn: string, args: unknown[] = [], rid?: string) =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop: "", token: TA, fn, args, rid }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const inv = () => store.check_invoice[0];
const fresh = () => { inv().sent_at = null; inv().send_how = null; inv().send_err = null; };
const bill = (rid?: string) => call("billSend", [{ ym: "2026-10", ids: ["iA"] }], rid);
const row = (r: string) => store.cgg_idem.find((x: any) => x.fn === "billSend" && x.rid === r);
let n = 0;
const rid = () => (String(++n).padStart(4, "0") + "w".repeat(20)).slice(0, 24);

console.log("① 청구서 — 비즈고 알림톡 + 대체 문자 한 요청");
fresh(); let b0 = bz.length, s0 = sol, R = rid();
const r1 = await bill(R);
const q = bz[bz.length - 1]?.body || {};
check("비즈고 한 번 · 솔라피 0 · 결과 알림톡", bz.length === b0 + 1 && sol === s0 && r1.result?.sent === 1 && r1.result?.results?.[0]?.how === "ata", r1);
check("messageFlow = [알림톡(SK_BZ · BZ_BILL · AT), 대체 문자]", q.messageFlow?.length === 2 && q.messageFlow[0].alimtalk?.senderKey === "SK_BZ" &&
  q.messageFlow[0].alimtalk?.templateCode === "BZ_BILL" && q.messageFlow[0].alimtalk?.msgType === "AT" && !!(q.messageFlow[1].sms || q.messageFlow[1].mms), q.messageFlow);
check("변수 replaceWords · 업체 쪽 중복 막기 키", q.destinations?.[0]?.replaceWords?.["#{금액}"] === "11,000" && /^cgg-[0-9a-f]{40}-1$/.test(q.idempotencyKey || ""), q);
const r2 = await bill(R);
check("같은 rid 다시 → 처음 답 · 비즈고 +0", r2.result?.sent === 1 && bz.length === b0 + 1, r2);

console.log("② 비즈고 알림톡이 «모름» → 문자로 바로 대신 안 보냄");
fresh(); b0 = bz.length; R = rid(); plan.push("lost");
const u1 = await bill(R), u2 = await bill(R);
check("한 번만 시도 · «확인 중»(unsure) · 같은 rid → __unsure · 비즈고 +0", bz.length === b0 + 1 && u1.result?.unsure === true && u2.__unsure === true && row(R)?.state === "unknown", [u1, u2]);

console.log("③ 비즈고 거절 확정 → 같은 요청 안에서 문자 · 업체 고정");
fresh(); b0 = bz.length; R = rid(); plan.push("tpl");
const t1 = await bill(R);
check("템플릿 거절(A505) → 이어서 비즈고 문자 1통", bz.length === b0 + 2 && !bz[bz.length - 1].body.messageFlow[0].alimtalk && t1.result?.sent === 1, [t1, bz.slice(-2).map((x) => x.body.messageFlow)]);
fresh(); b0 = bz.length; s0 = sol; R = rid(); plan.push("reject", "reject");
const g1 = await bill(R);
check("둘 다 거절 → «못 보냄» · retry · 업체 bizgo", g1.result?.sent === 0 && row(R)?.state === "retry" && row(R)?.result?.vendor === "bizgo", [g1, row(R)]);
Deno.env.set("MSG_VENDOR", "solapi");
const g2 = await bill(R);
check("스위치를 솔라피로 바꿔도 같은 rid 는 비즈고로만(솔라피 0)", g2.result?.sent === 1 && sol === s0 && bz.length === b0 + 3, [g2, sol - s0, bz.length - b0]);
fresh(); s0 = sol; b0 = bz.length;
const so = await bill(rid());
check("새 rid 는 솔라피 · 솔라피 코드", so.result?.sent === 1 && sol === s0 + 1 && bz.length === b0, so);
Deno.env.set("MSG_VENDOR", "bizgo");

console.log("④ 재검사 매일 자동 — 지금 업체의 코드로 판단");
const rs = await call("remindRuleSave", [{ steps: [30, 15, 7], auto: true }]);
check("비즈고에 check_remind 코드 없음 → 매일 자동 거절(솔라피 코드가 있어도)", /켤 수 없어요/.test(rs.__err || ""), rs);
store.wash_hq[0].ata_cfg.bizgo.tpl.check_remind = "BZ_REMIND";
const rs2 = await call("remindRuleSave", [{ steps: [30, 15, 7], auto: true }]);
check("비즈고 코드가 생기면 켜짐", rs2.result?.ok === true, rs2);
check("판 v55", /v55/.test(JSON.stringify(await call("ping"))));

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail || pass === 0) Deno.exit(1);
