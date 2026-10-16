// 워시 sb16 시험 — 10/16 통과 알림톡 5개(기간종료예정·이용제한시작·로그인제한예정·자료보관기한·잔액안내) 연결
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/알림톡_통과5개_sb16_시험.ts
import { knobs, store } from "./fake_supabase_wash.ts";
Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s"); Deno.env.set("SMS_FROM", "0212345678");
const kst = (ms = 0) => new Date(Date.now() + 9 * 3600e3 + ms).toISOString().slice(0, 10);
const D = 864e5;
const hh = new Date(Date.now() + 9 * 3600e3).toISOString().slice(11, 16);
const ADM = "b".repeat(48);
const base = { exp_cfg: { on: true, time: hh, days: [3, 0], balMin: 10000, cash: true }, cron_key: "CK", cash_on: true,
  lock_cfg: { on: true, days: 7, delDays: 30 }, admin_phone: "01011112222" };
Object.assign(store, {
  wash_hq: [Object.assign({ id: 1, pf_id: "PF", ata_cfg: { pfId: "PF", tpl: { expire_soon: "T_EXP", use_limit: "T_USE", balance: "T_BAL" } } }, base)],
  wash_shops: [
    { shop: "A3", name: "삼일세차", active: true, plan: "pro", paid_until: kst(3 * D), owner_phone: "01033330003" },
    { shop: "LK", name: "잠김세차", active: true, plan: "pro", paid_until: kst(-1 * D), owner_phone: "01033330004", lock_days: 7 },
    { shop: "DK", name: "정리세차", active: true, plan: "pro", paid_until: kst(-1 * D - 0), owner_phone: "01033330005" },
  ],
  wash_plans: [{ code: "pro", name: "프로", price: 50000 }],
  wash_sessions: [{ sid: ADM, phone: "01000000000", shop: "ADMIN", role: "admin", expires_at: new Date(Date.now() + D).toISOString() }],
  wash_users: [{ phone: "01000000000", shop: "ADMIN", role: "admin", active: true }],
  wash_expire_log: [], wash_lock_log: [], wash_cash_lot: [], cgg_sendlog: [],
});
knobs.cash.A3 = 3000; knobs.cash.LK = 50000; knobs.cash.DK = 50000;
const sent: any[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  const u = String(url);
  if (u.includes("solapi") && u.includes("/send")) {
    const b = JSON.parse(String(init?.body)); sent.push(b.messages[0]);
    return Response.json({ groupInfo: { _id: "G" }, failedMessageList: [], messageList: [{ messageId: "M" + sent.length, to: b.messages[0].to }] });
  }
  return Response.json({});
}) as typeof fetch;
console.error = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(Deno.env.get("WASH_SRC") ?? "../1_차곳간워시_서버_wash-api_sb16.ts");
const call = async (fn: string, args: unknown[], token = "", shop = "") =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop, token, fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") { if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); } }
const r = await call("cronExpire", ["CK"]);
const to = (p: string) => sent.filter((m) => m.to === p);
const a3 = to("01033330003");
check("기간종료예정(D-3): 알림톡 · 변수 이름 그대로", a3.some((m) => m.kakaoOptions?.templateId === "T_EXP" &&
  m.kakaoOptions.variables["#{남은일}"] === "3" && m.kakaoOptions.variables["#{무엇}"] === "이용기간" && m.kakaoOptions.variables["#{요금제}"] === "프로"), a3);
check("잔액안내: 기준 아래면 알림톡 (잔액 숫자·쉼표만)", a3.some((m) => m.kakaoOptions?.templateId === "T_BAL" && m.kakaoOptions.variables["#{잔액}"] === "3,000"), a3);
const lk = to("01033330004");
check("이용제한시작(잠긴 다음 날): 알림톡", lk.some((m) => m.kakaoOptions?.templateId === "T_USE" && /월 \d+일/.test(m.kakaoOptions.variables["#{차단일}"])), [r, lk]);
check("코드 없는 키(login_block·data_keep)는 지금처럼 문자", sent.filter((m) => !m.kakaoOptions).every((m) => /\[차곳간\]/.test(m.text)));
check("발송 기록 tpl 키", store.cgg_sendlog.some((x: any) => x.tpl === "expire_soon") && store.cgg_sendlog.some((x: any) => x.tpl === "balance"), store.cgg_sendlog.map((x: any) => x.tpl));
const before = sent.length;
await call("cronExpire", ["CK"]);
check("같은 날 다시 돌아도 잔액안내 한 번", sent.filter((m, i) => i >= before && m.kakaoOptions?.templateId === "T_BAL").length === 0);
const s2 = await call("hqExpSave", [{ balMin: 20000 }], ADM, "ADMIN");
check("관리: 잔액 기준 저장", s2.result?.cfg?.balMin === 20000, s2);
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
