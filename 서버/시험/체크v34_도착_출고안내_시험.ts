// 체크 서버 v34 시험 — 차량 도착 알림을 승인된 «차곳간_출고안내»(tpl.release)로 · 버튼 보기코드 d+열쇠 · deliv_view (운영/06 M)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v34_도착_출고안내_시험.ts
import { store } from "./fake_supabase_check.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s");
Deno.env.set("SMS_FROM", "0212345678");
Deno.env.set("PF_ID", "PF_TEST");
Deno.env.set("CHECK_VIEW_IP_MAX", "5");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v34.ts";

let shift = 0;
const realNow = Date.now;
Date.now = () => realNow() + shift;
const later = () => { shift += 61000; };

const day = new Date(Date.now() + 86400000).toISOString();
Object.assign(store, {
  check_office: [{ id: "o1", code: "TEST", name: "시험검사소", tel: "031-000-0000", sms_from: "0311112222" }],
  check_user: [{ id: "u1", office_id: "o1", phone: "01011110000", name: "대표", role: "owner", active: true, pw_hash: "x" }],
  check_session: [{ sid: "chk_o1", phone: "01011110000", office_id: "o1", role: "owner", expires_at: day }],
  check_pw_first: [], check_deliv_fail: [], cgg_access: [], wash_sessions: [], check_rate: [],
  check_deliv: [], check_deliv_dest: [], check_deliv_photo: [], check_deliv_conf: [],
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
let n = 0;
async function arrive(o: any = {}) {
  sent.length = 0;
  await call("deliv_arrive", ["chk_o1", Object.assign({ dest: "목적지" + (++n), dealer: "홍딜러", tel: "010-3333-4444",
    plate: "12가345" + n, car: "쏘나타", force: true }, o)]);
  return store.check_deliv[store.check_deliv.length - 1] ?? {};
}
const setCfg = (c: any) => { store.wash_hq[0].ata_cfg = c; later(); };
const NAMES = ["딜러명", "상사명", "차량번호", "작업내용", "목적지", "출고일시", "업체전화", "업체명", "보기코드"].map((x) => "#{" + x + "}");

console.log("① check_arrive 가 없고 release 가 있으면 출고안내 템플릿");
setCfg({ tpl: { release: "KA_RELEASE" } });
let row = await arrive({ comp: "가나상사" });
let k = sent[0]?.kakaoOptions ?? {};
check("한 번만 보냄 · 템플릿 = release 코드", sent.length === 1 && k.templateId === "KA_RELEASE" && k.pfId === "PF_TEST", sent);
check("변수 이름이 확정본 9개와 똑같음", JSON.stringify(Object.keys(k.variables ?? {}).sort()) === JSON.stringify([...NAMES].sort()), k.variables);
check("작업내용 = «성능점검 · 배달»", k.variables?.["#{작업내용}"] === "성능점검 · 배달", k.variables);
check("보기코드 = d + 이 건의 열쇠글", k.variables?.["#{보기코드}"] === "d" + row.view_key && String(row.view_key).length === 18, k.variables);
check("딜러명·상사명·차량번호·목적지 채움", k.variables?.["#{딜러명}"] === "홍딜러" && k.variables?.["#{상사명}"] === "가나상사" &&
  k.variables?.["#{차량번호}"] === row.plate && k.variables?.["#{목적지}"] === row.dest_name, k.variables);
check("출고일시 = 도착 시각(MM-DD HH:MM)", /^\d{2}-\d{2} \d{2}:\d{2}$/.test(String(k.variables?.["#{출고일시}"])), k.variables);
check("업체명·업체전화 = 검사소 값", k.variables?.["#{업체명}"] === "시험검사소" && k.variables?.["#{업체전화}"] === "031-000-0000");
check("대체 문자는 지금 도착 글 그대로 · 대신 보내기 켜짐", /도착/.test(String(sent[0]?.text)) && k.disableSms === false, sent[0]?.text);
check("방법 ata", row.state === "보냄" && row.how === "ata", row);
row = await arrive({ comp: "" });
check("상사가 없으면 «-»", sent[0]?.kakaoOptions?.variables?.["#{상사명}"] === "-", sent[0]?.kakaoOptions?.variables);

console.log("② 순서: check_arrive 가 있으면 그것이 먼저");
setCfg({ tpl: { check_arrive: "KA_ARRIVE", release: "KA_RELEASE" } });
await arrive();
check("check_arrive 먼저", sent[0]?.kakaoOptions?.templateId === "KA_ARRIVE", sent[0]?.kakaoOptions);
setCfg({ tpl: { release: "KA_RELEASE" } });

console.log("③ 알림톡이 거절되면 지금 문자로");
mode = "failed";
row = await arrive();
check("알림톡 뒤 문자 한 번", sent.length === 2 && !sent[1].kakaoOptions && row.how === "lms", sent.length);
mode = "ok";

console.log("④ 버튼이 여는 보기 — deliv_view 가 d 붙은 열쇠도 받음");
const v1 = await call("deliv_view", ["d" + row.view_key], "2.2.2.2");
check("d+열쇠로 열림", v1.result?.deliv?.plate === row.plate, v1);
const v0 = await call("deliv_view", [row.view_key], "2.2.2.2");
check("옛 주소(열쇠만)도 그대로 열림", v0.result?.deliv?.plate === row.plate, v0);
check("받는 번호는 안 보냄", !JSON.stringify(v1).includes("3333-4444") && !JSON.stringify(v1).includes("33334444"));
check("없는 열쇠는 거절", !!(await call("deliv_view", ["d" + "z".repeat(18)], "2.2.2.2")).__err);
for (let i = 0; i < 3; i++) await call("deliv_view", ["d" + row.view_key], "2.2.2.2");
check("한 아이피 하루 상한을 넘으면 거절", !!(await call("deliv_view", ["d" + row.view_key], "2.2.2.2")).__err);
check("다른 아이피는 열림", !!(await call("deliv_view", ["d" + row.view_key], "3.3.3.3")).result?.deliv);

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
