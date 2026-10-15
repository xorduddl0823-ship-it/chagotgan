// 체크 서버 v29 알림톡 먼저 시험 — 차량 도착 알림(notifyOne) · 사무실 첫 비밀번호 확인 번호 (가짜 수파베이스 · 가짜 솔라피)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/알림톡_체크_시험.ts
// CHECK_SRC 에 옛 판(v28)을 넣으면 실패가 나와야 합니다.
import { store } from "./fake_supabase_check.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s");
Deno.env.set("SMS_FROM", "0212345678");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v29.ts";

/* 1분 기억을 건너뛰려고 시계를 앞으로 돌립니다 */
let shift = 0;
const realNow = Date.now;
Date.now = () => realNow() + shift;
const later = () => { shift += 61000; };

const day = new Date(Date.now() + 86400000).toISOString();
Object.assign(store, {
  check_office: [{ id: "o1", code: "TEST", name: "시험검사소", tel: "031-000-0000", sms_from: "0311112222" }],
  check_user: [
    { id: "u1", office_id: "o1", phone: "01011110000", name: "대표", role: "owner", active: true, pw_hash: null },
    { id: "u2", office_id: "o1", phone: "01022220000", name: "새직원", role: "staff", active: true, pw_hash: null },
  ],
  check_session: [{ sid: "chk_o1", phone: "01011110000", office_id: "o1", role: "owner", expires_at: day }],
  check_pw_first: [], check_deliv_fail: [], cgg_access: [], wash_sessions: [],
  check_deliv: [], check_deliv_dest: [], check_deliv_photo: [], check_deliv_conf: [],
  /* v32(보안 M2): 도착 알림은 등록된 딜러 번호로만 나가므로 딜러를 등록해 둠 */
  check_dealer: [{ id: "d1", office_id: "o1", name: "홍딜러", tel: "010-3333-4444", active: true }],
  wash_hq: [{ id: 1, ata_cfg: {} }],
});

/* 가짜 솔라피 — 알림톡(kakaoOptions 있음)은 mode 대로, 문자는 늘 성공 */
let mode: "ok" | "failed" | "http" | "throw" = "ok";
const sent: any[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  if (!String(url).includes("solapi")) throw new Error("예상 못 한 주소 " + url);
  const m = JSON.parse(String(init?.body)).messages[0];
  sent.push(m);
  if (m.kakaoOptions) {
    if (mode === "failed") return Response.json({ failedMessageList: [{ statusCode: "3104", statusMessage: "템플릿 없음" }] });
    if (mode === "http") return new Response("{}", { status: 500 });
    if (mode === "throw") throw new Error("연결 끊김");
  }
  return Response.json({});
}) as typeof fetch;
console.error = () => {};

const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(SRC);
const chk = H[0];
async function call(fn: string, args: unknown[] = []) {
  const r = await chk(new Request("http://x", { method: "POST", body: JSON.stringify({ shop: "", token: "", fn, args }) }));
  return await r.json();
}
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
let n = 0;
async function arrive() {
  sent.length = 0;
  const r = await call("deliv_arrive", ["chk_o1", { dest: "목적지" + (++n), dealer: "홍딜러", tel: "010-3333-4444",
    plate: "12가345" + n, car: "쏘나타", force: true }]);
  const row = store.check_deliv[store.check_deliv.length - 1] ?? {};
  return { r, row };
}
const setCfg = (c: any) => { store.wash_hq[0].ata_cfg = c; later(); };

console.log("① 템플릿이 없으면 지금처럼 문자");
setCfg({});
let a = await arrive();
check("솔라피 1번 · 알림톡 아님", sent.length === 1 && !sent[0].kakaoOptions, sent);
check("보냄 · 방법 lms", a.row.state === "보냄" && a.row.how === "lms", a.row);

console.log("② 본사 채널 템플릿(check_arrive)이 있으면 알림톡 먼저");
Deno.env.set("PF_ID", "PF_TEST");
setCfg({ tpl: { check_arrive: "KA_ARRIVE" } });
a = await arrive();
const k = sent[0]?.kakaoOptions ?? {};
check("한 번만 보냄 (알림톡 성공)", sent.length === 1, sent.length);
check("템플릿 = check_arrive 코드 · 채널 = PF_ID", k.templateId === "KA_ARRIVE" && k.pfId === "PF_TEST", k);
check("대신 보내기 켜짐 (disableSms: false)", k.disableSms === false, k);
check("대신 보낼 문자 글이 들어감", /도착/.test(String(sent[0]?.text)), sent[0]?.text);
check("보기코드 = 이 건의 view_key", k.variables?.["#{보기코드}"] === a.row.view_key && !!a.row.view_key, k.variables);
check("업체명·업체전화는 검사소 값", k.variables?.["#{업체명}"] === "시험검사소" && k.variables?.["#{업체전화}"] === "031-000-0000", k.variables);
check("딜러명·차량번호·차명·목적지·도착시각 채움",
  ["#{딜러명}", "#{차량번호}", "#{차명}", "#{목적지}", "#{도착시각}"].every((x) => String(k.variables?.[x] ?? "").length > 0), k.variables);
check("방법 ata 로 남음", a.row.state === "보냄" && a.row.how === "ata", a.row);

console.log("③ 검사소 설정이 「문자」여도 템플릿이 있으면 알림톡 먼저");
store.check_deliv_conf = [{ office_id: "o1", way: "sms", fallback: false, sms_text: "", from_tel: "", photo_on: true }];
a = await arrive();
check("way=sms 여도 알림톡", !!sent[0]?.kakaoOptions && a.row.how === "ata", sent);

console.log("④ 알림톡이 거절되면 문자로 이어서");
for (const md of ["failed", "http", "throw"] as const) {
  mode = md;
  a = await arrive();
  check(`${md}: 알림톡 시도 뒤 문자 한 번 더`, sent.length === 2 && !!sent[0].kakaoOptions && !sent[1].kakaoOptions, sent.length);
  check(`${md}: 결과는 보냄(문자)`, a.row.state === "보냄" && a.row.how === "lms", a.row);
}
mode = "ok";

console.log("⑤ 본사 템플릿이 없으면 검사소 템플릿(ata_tpl) — 대신 보내기 늘 켜짐");
setCfg({});
store.check_deliv_conf = [{ office_id: "o1", way: "ata", fallback: false, ata_tpl: "OFFICE_TPL", ata_pf: "", photo_on: true }];
a = await arrive();
const k2 = sent[0]?.kakaoOptions ?? {};
check("검사소 템플릿 · 채널은 PF_ID 로 채움", k2.templateId === "OFFICE_TPL" && k2.pfId === "PF_TEST", k2);
check("fallback=false 여도 disableSms: false", k2.disableSms === false, k2);
check("대신 보낼 문자 글이 들어감", String(sent[0]?.text ?? "").length > 0);
check("링크 변수 = view_key", k2.variables?.["#{링크}"] === a.row.view_key, k2.variables);

console.log("⑥ 채널(PF)이 없으면 문자");
Deno.env.delete("PF_ID");
setCfg({ tpl: { check_arrive: "KA_ARRIVE" } });
store.check_deliv_conf = [];
a = await arrive();
check("채널 없음 → 문자만", sent.length === 1 && !sent[0].kakaoOptions, sent);
setCfg({ pfId: "PF_CFG", tpl: { check_arrive: "KA_ARRIVE" } });
a = await arrive();
check("관제센터 설정 pfId 를 씀", sent[0]?.kakaoOptions?.pfId === "PF_CFG", sent[0]?.kakaoOptions);

console.log("⑦ 사무실 첫 비밀번호 확인 번호 — 인증번호 알림톡 먼저");
setCfg({ pfId: "PF_CFG", tpl: { auth: "KA_AUTH" } });
sent.length = 0;
const f1 = await call("login", ["01022220000", "first-pw"]);
const ka = sent[0]?.kakaoOptions ?? {};
const code = String(ka.variables?.["#{인증번호}"] ?? "");
check("확인 번호 안내 (__need: code)", f1.__need === "code", f1);
check("알림톡 1번 · 템플릿 auth", sent.length === 1 && ka.templateId === "KA_AUTH" && ka.disableSms === false, sent);
check("변수: 6자리 인증번호 · 유효시간", /^\d{6}$/.test(code) && String(ka.variables?.["#{유효시간}"] ?? "").length > 0, ka.variables);
check("대신 보낼 문자에도 같은 번호", String(sent[0]?.text ?? "").includes(code));
check("그 번호로 확인되면 들어가짐", !!(await call("loginCode", ["01022220000", code, f1.__tick])).result?.key);
mode = "failed";
store.check_user.find((u: any) => u.id === "u1").pw_hash = null;
sent.length = 0;
const f2 = await call("login", ["01011110000", "owner-pw"]);
check("알림톡 거절 → 문자로 한 번 더", sent.length === 2 && !sent[1].kakaoOptions, sent.length);
const code2 = (String(sent[1]?.text ?? "").match(/\d{6}/) ?? [""])[0];
check("문자 번호로 확인되면 들어가짐", !!(await call("loginCode", ["01011110000", code2, f2.__tick])).result?.key);
mode = "ok";

console.log(`\n결과: ${pass} 통과 / ${fail} 실패`);
if (fail) Deno.exit(1);
