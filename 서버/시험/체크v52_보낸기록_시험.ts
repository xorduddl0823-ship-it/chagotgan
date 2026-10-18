// 체크 서버 v52 시험 — 설정 › 알림 «보낸 기록»(sendLogList): 이 검사소 것만 · 대표만 · 번호 가림 · 본문 없음 · 날짜·종류·결과 거르기
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v52_보낸기록_시험.ts
import { store } from "./fake_supabase_check.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v52.ts";
const day = new Date(Date.now() + 86400000).toISOString();
const ago = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
const log = (o: any) => Object.assign({ product: "check", shop: "TEST", tpl: "check_bill", to_mask: "010-****-4444", via: "ata", final_via: "",
  result: "ata", err: "", ref: "i1", vars: ["기간", "금액"], msg_id: "M1", at: ago(0) }, o);
Object.assign(store, {
  check_office: [{ id: "o1", code: "TEST", name: "시험검사소" }, { id: "o2", code: "BBB", name: "남의검사소" }],
  check_user: [{ id: "u1", office_id: "o1", phone: "01011110000", name: "대표", role: "owner", active: true, pw_hash: "x" },
               { id: "u2", office_id: "o1", phone: "01022220000", name: "직원", role: "staff", active: true, pw_hash: "x" }],
  check_session: [{ sid: "chk_own", phone: "01011110000", office_id: "o1", role: "owner", expires_at: day },
                  { sid: "chk_stf", phone: "01022220000", office_id: "o1", role: "staff", expires_at: day }],
  cgg_access: [], wash_sessions: [], check_log: [], check_rate: [],
  cgg_sendlog: [
    log({}),
    log({ tpl: "check_remind_sms", via: "lms", result: "sms", ref: "d1", at: ago(1) }),
    log({ tpl: "check_arrive_sms", via: "sms", result: "fail", err: "받는 번호가 없는 번호예요", at: ago(2) }),
    log({ tpl: "check_bill", result: "wait", at: ago(3) }),
    log({ tpl: "check_bill", at: ago(20) }),                                   // 기본(7일) 밖
    log({ shop: "BBB", tpl: "check_bill", ref: "남의것" }),                      // 남의 검사소
    log({ product: "wash", shop: "TEST", tpl: "pay_done", ref: "워시것" }),      // 같은 코드라도 워시
  ],
});
globalThis.fetch = (async () => Response.json({})) as typeof fetch;
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

let r = await call("sendLogList", [{}], "chk_stf");
check("직원은 못 봄 (대표만)", !!r.__err, r);
r = await call("sendLogList", [{}]);
check("로그인 없이는 못 봄", !!r.__err, r);
r = await call("sendLogList", [{}], "chk_own");
check("기본 7일 · 이 검사소 체크 것만 4줄 (남의 검사소 · 워시 · 7일 밖 없음)", r.list?.length === 4 && !JSON.stringify(r).includes("남의것") && !JSON.stringify(r).includes("워시것"), r);
check("새것부터 · 칸 모양(createdAt·type·tpl·to·kind·status·err·ref)", r.list[0].type === "청구서" && r.list[0].status === "알림톡 도착" && r.list[0].kind === "알림톡" &&
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(r.list[0].createdAt) && r.list[0].to === "010-****-4444", r.list[0]);
const rm = r.list.find((x: any) => x.tpl === "check_remind") ?? {};
check("_sms 꼬리는 떼고 이름 · 문자 대체 · 장문", rm.type === "재검사 안내" && rm.status === "문자 대체" && rm.kind === "장문", rm);
const ar = r.list.find((x: any) => x.tpl === "check_arrive") ?? {};
check("실패는 쉬운 말 오류 그대로", ar.status === "실패" && ar.err === "받는 번호가 없는 번호예요" && ar.type === "차량 도착 안내", ar);
check("숫자: 도착 1 · 문자 대체 1 · 실패 1 · 대기 1", JSON.stringify(r.sums) === JSON.stringify({ sent: 1, sub: 1, fail: 1, wait: 1, skip: 0 }), r.sums);
check("번호 원문 · 변수 · 메시지 번호 안 나감", !/01033334444|"vars"|msgId|msg_id|M1/.test(JSON.stringify(r)), r);
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const back = (d: number) => new Date(Date.now() + 9 * 3600e3 - d * 86400000).toISOString().slice(0, 10);
r = await call("sendLogList", [{ from: back(30), to: today }], "chk_own");
check("날짜를 넓히면 20일 전 것도", r.list?.length === 5, r.list?.length);
r = await call("sendLogList", [{ from: back(30), to: today, tpl: "check_bill" }], "chk_own");
check("종류 거르기(청구서)", r.list?.length === 3 && r.list.every((x: any) => x.tpl === "check_bill"), r.list);
r = await call("sendLogList", [{ from: back(30), to: today, result: "실패" }], "chk_own");
check("결과 거르기(실패 · 한글로도)", r.list?.length === 1 && r.list[0].status === "실패", r.list);
r = await call("sendLogList", [{ from: back(100), to: today }], "chk_own");
check("92일 넘으면 거절", !!r.__err && /92일/.test(r.__err), r);
r = await call("sendLogList", [{ from: today, to: back(3) }], "chk_own");
check("시작일이 끝일보다 늦으면 거절", !!r.__err, r);
r = await call("sendLogList", [{ tpl: "x'); drop", result: "<b>" }], "chk_own");
check("이상한 거르기 값은 무시(기본 목록)", Array.isArray(r.list), r);
r = await call("ping");
check("판 v52", /v52/.test(JSON.stringify(r)), r);

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
