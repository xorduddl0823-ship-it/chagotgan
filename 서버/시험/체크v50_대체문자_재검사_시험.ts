// 체크 서버 v50 시험 — 총괄 «대체 문자 전부»: 재검사 대체 문구 = 알림톡/12 ⑦ 확정본 · 알림톡 승인 전에도 «매일 자동» 켜고 문자로 보냄
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v50_대체문자_재검사_시험.ts
// CHECK_SRC 에 v49_1 을 넣으면 «자동 켜기 · 자동 보내기 · 문구» 시험이 실패해야 합니다.
import { store } from "./fake_supabase_check.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s");
Deno.env.set("SMS_FROM", "0212345678");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v50.ts";
const day = new Date(Date.now() + 86400000).toISOString();
const kst = (n = 0) => new Date(Date.now() + 9 * 3600e3 + n * 86400000).toISOString().slice(0, 10);
Object.assign(store, {
  check_office: [{ id: "o1", code: "TEST", name: "시험검사소", tel: "031-000-0000", sms_from: "0311112222", ins_valid_days: 120 }],
  check_user: [{ id: "u1", office_id: "o1", phone: "01011110000", name: "대표", role: "owner", active: true, pw_hash: "x" }],
  check_session: [{ sid: "chk_own", phone: "01011110000", office_id: "o1", role: "owner", expires_at: day }],
  cgg_access: [], wash_sessions: [], check_log: [], check_rate: [], cgg_sendlog: [],
  check_dealer: [{ id: "d1", office_id: "o1", name: "홍딜러", tel: "010-3333-4444", active: true }],
  check_car: [
    { id: "c1", office_id: "o1", dealer_id: "d1", plate: "12가3456", car_name: "쏘나타", check_date: kst(-120 + 7) },   // 7일 남음
    { id: "c2", office_id: "o1", dealer_id: "d1", plate: "34나5678", car_name: "아반떼", check_date: kst(-120 + 7) },
  ],
  check_remind_rule: [], check_remind_log: [], check_remind_view: [],
  wash_hq: [{ id: 1, cron_key: "CRONKEY-0123456789", ata_cfg: { pfId: "PF", tpl: { bill: "T_BILL" } } }],   // check_remind 코드 없음
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
async function call(fn: string, args: unknown[] = [], token = "") {
  const j = await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop: "", token, fn, args }) }))).json();
  return j && j.result !== undefined ? j.result : j;
}
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}

console.log("■ 알림톡(check_remind) 승인 전");
let r = await call("remindRule", [], "chk_own");
check("ataReady=false (화면 안내용은 그대로)", r.ataReady === false, r);
r = await call("remindRuleSave", [{ steps: [30, 15, 7], auto: true }], "chk_own");
check("매일 자동을 켤 수 있음 (예전엔 «승인 전» 거절)", !r.__err && store.check_remind_rule[0]?.auto === true, r);
sent.length = 0;
r = await call("remindCron", ["CRONKEY-0123456789"]);
const m = sent[0] || {};
check("자동: 건너뛰지 않고 딜러에게 한 통", r.skipped === undefined && r.n === 1 && sent.length === 1 && m.to === "01033334444", [r, sent]);
check("알림톡 아니고 문자", !m.kakaoOptions, m);
check("문구 = ⑦ 확정본 «[차곳간] 업체명 성능점검 만료 N대 · 가장 빠른 만료 … · 문의 …»",
  /^\[차곳간\] 시험검사소 성능점검 만료 2대 · 가장 빠른 만료 .+ · 문의 031-000-0000$/.test(String(m.text)), m.text);
check("보낸 기록: 문자 대체로 남음(tpl check_remind_sms)", store.cgg_sendlog.some((x: any) => x.tpl === "check_remind_sms"), store.cgg_sendlog);
sent.length = 0;
r = await call("remindCron", ["CRONKEY-0123456789"]);
check("같은 날 다시 돌려도 안 감", sent.length === 0, r);

console.log("■ 승인 뒤 — 알림톡 먼저");
store.wash_hq[0].ata_cfg.tpl.check_remind = "T_REMIND";
store.check_remind_log.length = 0;
sent.length = 0;
const realNow = Date.now, skip = 61000;
Date.now = () => realNow() + skip;                       // 설정 1분 기억이 지나도록
r = await call("remindSend", [["c1", "c2"], {}], "chk_own");
Date.now = realNow;
const k = sent[0] || {};
check("알림톡으로 · 안 되면 같은 대체 문구 (disableSms:false)", k.kakaoOptions?.templateId === "T_REMIND" && k.kakaoOptions.disableSms === false &&
  /^\[차곳간\] 시험검사소 성능점검 만료 2대 · /.test(String(k.text)) && r.results?.[0]?.how === "ata", [r, k]);
r = await call("ping");
check("판 v50", /v50/.test(JSON.stringify(r)), r);

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
