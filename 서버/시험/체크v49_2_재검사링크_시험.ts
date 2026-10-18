// 체크 서버 v49.2 시험 — 재검사 링크 «https://check.cgg.co.kr/r/?c=열쇠» 모양 (대체 문자 · 알림톡 변수)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v49_2_재검사링크_시험.ts
// CHECK_SRC 에 v49_1 을 넣으면 «대체 문자에 주소» 시험이 실패해야 합니다(예전엔 주소 없음).
import { store } from "./fake_supabase_check.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s");
Deno.env.set("SMS_FROM", "0212345678");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v49_2.ts";
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

console.log("■ 대체 문자(알림톡 승인 전)");
sent.length = 0;
let r = await call("remindSend", [["c1", "c2"], {}], "chk_own");
const key = store.check_remind_view.at(-1)?.view_key ?? "";
const m = sent[0] || {};
check("문자로 한 통", r.sent === 1 && sent.length === 1 && !m.kakaoOptions, [r, sent]);
check("문자에 «차량 목록 https://check.cgg.co.kr/r/?c=열쇠»", /^[0-9a-z]{24}$/.test(key) && String(m.text).includes("차량 목록 https://check.cgg.co.kr/r/?c=" + key), [key, m.text]);
check("옛 모양 /r/열쇠 · /d/ · /v/ 없음", !String(m.text).includes("/r/" + key) && !/cgg\.co\.kr\/(d|v)\//.test(String(m.text)), m.text);
check("그 열쇠로 목록이 열림", (await call("remindView", [key])).cars?.length === 2);
console.log("■ 알림톡(승인 뒤) — 변수는 열쇠만 (버튼이 /r/?c=#{보기코드})");
store.wash_hq[0].ata_cfg.tpl.check_remind = "T_REMIND";
store.check_remind_log.length = 0;
sent.length = 0;
const realNow = Date.now;
Date.now = () => realNow() + 61000;
r = await call("remindSend", [["c1", "c2"], {}], "chk_own");
Date.now = realNow;
const k = sent[0] || {};
const key2 = store.check_remind_view.at(-1)?.view_key ?? "";
check("#{보기코드} = 열쇠 그대로 (주소 붙이지 않음)", k.kakaoOptions?.templateId === "T_REMIND" && k.kakaoOptions.variables?.["#{보기코드}"] === key2, k.kakaoOptions);
check("알림톡이 안 될 때 대신 갈 글에도 /r/?c= 주소", String(k.text).includes("https://check.cgg.co.kr/r/?c=" + key2), k.text);
console.log("■ 서버가 보내는 다른 주소 모양");
const src = await Deno.readTextFile(new URL(SRC, import.meta.url));
const live = src.split("\n").filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"));
check("코드에 «check.cgg.co.kr/(r|d|v)/열쇠» 모양이 없음 (?c= 만)", !live.some((l) => /check\.cgg\.co\.kr\/(r|d|v)\/[^?]/.test(l)), live.filter((l) => /check\.cgg\.co\.kr/.test(l)));
r = await call("ping");
check("판", /v49\.2|v50/.test(JSON.stringify(r)), r);

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
