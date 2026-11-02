// 체크 서버 v56 시험 — 배달 «도착 알림 켜기/끄기»(arrive_on · SQL 31): 대표만 바꿈 · 꺼지면 기록만 · 다시 보내기는 보냄 · 기록 check_log
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v56_도착알림_켜기끄기_시험.ts
import { store } from "./fake_supabase_check.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s");
Deno.env.set("SMS_FROM", "0212345678");
Deno.env.set("PF_ID", "PF_TEST");
Deno.env.set("CHECK_VIEW_IP_MAX", "5");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v56.ts";

let shift = 0;
const realNow = Date.now;
Date.now = () => realNow() + shift;
const later = () => { shift += 61000; };

const day = new Date(Date.now() + 86400000).toISOString();
Object.assign(store, {
  check_office: [{ id: "o1", code: "TEST", name: "시험검사소", tel: "031-000-0000", sms_from: "0311112222" }],
  check_user: [{ id: "u1", office_id: "o1", phone: "01011110000", name: "대표", role: "owner", active: true, pw_hash: "x" }],
  check_session: [{ sid: "chk_o1", phone: "01011110000", office_id: "o1", role: "owner", expires_at: day },
                  { sid: "chk_s1", phone: "01099990000", office_id: "o1", role: "staff", expires_at: day }],
  check_log: [], check_company: [{ id: "c1", office_id: "o1", name: "가나상사" }, { id: "c9", office_id: "o9", name: "남의상사" }],
  check_pw_first: [], check_deliv_fail: [], cgg_access: [], wash_sessions: [], check_rate: [],
  check_deliv: [], check_deliv_dest: [], check_deliv_photo: [], check_deliv_conf: [], cgg_idem: [], cgg_sendlog: [],
  check_dealer: [{ id: "d1", office_id: "o1", name: "홍딜러", tel: "010-3333-4444", active: true }],
  wash_hq: [{ id: 1, ata_cfg: {} }],
});
let mode: "ok" | "failed" = "ok";
const sent: any[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  if (!String(url).includes("solapi")) return Response.json({});
  const m = JSON.parse(String(init?.body)).messages?.[0];
  if (m) sent.push(m);
  if (m?.kakaoOptions && mode === "failed") return Response.json({ failedMessageList: [{ statusCode: "3104" }] });
  return Response.json({});
}) as typeof fetch;
console.error = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(SRC);
const call = async (fn: string, args: unknown[] = [], ip = "1.1.1.1") =>
  await (await H[0](new Request("http://x", { method: "POST", headers: { "cf-connecting-ip": ip },
    body: JSON.stringify({ shop: "", token: "", fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const callT = async (fn: string, args: unknown[], token: string) =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop: "", token, fn, args }) }))).json();
let n = 0;
async function arrive(o: any = {}) {
  sent.length = 0;
  await call("deliv_arrive", ["chk_o1", Object.assign({ dest: "목적지" + (++n), dealer: "홍딜러", tel: "010-3333-4444",
    plate: "12가345" + n, car: "쏘나타", force: true }, o)]);
  return store.check_deliv[store.check_deliv.length - 1] ?? {};
}
const setCfg = (c: any) => { store.wash_hq[0].ata_cfg = c; later(); };
const NAMES = ["딜러명", "상사명", "차량번호", "작업내용", "목적지", "출고일시", "업체전화", "업체명", "보기코드"].map((x) => "#{" + x + "}");


setCfg({ tpl: { release: "KA_RELEASE" } });
console.log("① 처음(칸 없음 · SQL 31 전) — 늘 켬 · 끄기 저장은 «서버 준비 중»");
(store as any).__noArriveCol = true;
let cf = await call("deliv_conf", ["chk_o1"]);
check("설정 보기: arrive_on true · arrive_ready false", cf.result?.conf?.arrive_on === true && cf.result?.conf?.arrive_ready === false, cf.result?.conf);
let sv = await call("deliv_saveConf", ["chk_o1", { arrive_on: false }]);
check("SQL 31 전에는 끄기 저장 막음(서버 준비 중 · 31번)", /준비하는 중/.test(sv.__err || "") && /31/.test(sv.__err || ""), sv);
(store as any).__noArriveCol = false;
let row = await arrive();
check("켜져 있으면 지금처럼 보냄", sent.length === 1 && row.state === "보냄", [sent.length, row.state]);

console.log("② 대표만 끄기 · check_log 에 전→후");
sv = await call("deliv_saveConf", ["chk_s1", { arrive_on: false }]);
check("직원은 못 바꿈", !!sv.__err && store.check_deliv_conf.every((c: any) => c.arrive_on !== false), sv);
const lg0 = store.check_log.length;
sv = await call("deliv_saveConf", ["chk_o1", { arrive_on: false }]);
check("대표가 끔", sv.result?.ok === true && store.check_deliv_conf.find((c: any) => c.office_id === "o1")?.arrive_on === false, [sv, store.check_deliv_conf]);
const lg = store.check_log.slice(lg0);
check("check_log 에 «도착 알림 끔» · 전 true → 후 false · 누가", lg.some((x: any) => /도착 알림 끔/.test(JSON.stringify(x)) && /"before":true/.test(JSON.stringify(x)) && /"after":false/.test(JSON.stringify(x))), lg);
cf = await call("deliv_conf", ["chk_o1"]);
check("설정 보기: arrive_on false · arrive_ready true", cf.result?.conf?.arrive_on === false && cf.result?.conf?.arrive_ready === true, cf.result?.conf);
const bt = await call("deliv_boot", ["chk_o1"]);
check("기사 시작 답에도 arrive_on false(«지금 알림 꺼짐» 띠)", bt.result?.arrive_on === false, bt.result?.arrive_on);
const li = await call("deliv_list", ["chk_o1", "2020-01-01", "2099-12-31"]);
check("사무실 목록 conf 에도 arrive_on false", li.result?.conf?.arrive_on === false, li.result?.conf);

console.log("③ 꺼져 있으면 도착 기록만 · 알림 안 보냄");
sent.length = 0;
const ar = await call("deliv_arrive", ["chk_o1", { dest: "끔목적지", dealer: "홍딜러", tel: "010-3333-4444", plate: "99가9999", car: "쏘나타", force: true }]);
row = store.check_deliv[store.check_deliv.length - 1];
check("문자·알림톡 0통 · 기록은 저장", sent.length === 0 && row.plate === "99가9999", sent);
check("답: ok · alarmOff · 발송결과 «꺼짐» · 발송사유 «도착 알림 꺼짐»", ar.result?.ok === true && ar.result?.alarmOff === true && ar.result?.row?.발송결과 === "꺼짐" && ar.result?.row?.발송사유 === "도착 알림 꺼짐", ar.result);
const one = await call("deliv_one", ["chk_o1", row.id]);
check("사무실에서 그 줄 보기 → 발송결과 «꺼짐»(목록도 같은 rowOut)", one.result?.row?.발송결과 === "꺼짐", one.result?.row);
const RID = "a".repeat(20) + "z1z1";
sent.length = 0;
const r1 = await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop: "", token: "", fn: "deliv_arrive", rid: RID,
  args: ["chk_o1", { dest: "끔목적지2", dealer: "홍딜러", plate: "88가8888", force: true }] }) }))).json();
const r2 = await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop: "", token: "", fn: "deliv_arrive", rid: RID,
  args: ["chk_o1", { dest: "끔목적지2", dealer: "홍딜러", plate: "88가8888", force: true }] }) }))).json();
check("rid 붙은 기록(알림 꺼짐)은 «끝남» → 같은 rid 다시 와도 기록 한 줄 · 처음 답", r1.result?.alarmOff === true && JSON.stringify(r2) === JSON.stringify(r1) &&
  store.check_deliv.filter((x: any) => x.plate === "88가8888").length === 1, [r1, r2]);

console.log("④ 사무실 «다시 보내기»는 꺼져 있어도 보냄");
sent.length = 0;
const rs = await call("deliv_resend", ["chk_o1", [row.id]]);
check("다시 보내기 → 한 통 · 그 줄 보냄", sent.length === 1 && rs.result?.sent === 1 && store.check_deliv.find((x: any) => x.id === row.id)?.state === "보냄", [rs, sent.length]);

console.log("⑤ 다시 켜기");
sv = await call("deliv_saveConf", ["chk_o1", { arrive_on: true }]);
sent.length = 0;
row = await arrive();
check("켜면 다시 보냄 · check_log «도착 알림 켬»", sv.result?.ok === true && sent.length === 1 && row.state === "보냄" && store.check_log.some((x: any) => /도착 알림 켬/.test(JSON.stringify(x))), [sv, sent.length]);
check("판 v56", /v56/.test(JSON.stringify(await call("ping"))));

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail || pass === 0) Deno.exit(1);
