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
  check_session: [{ sid: "chk_o1", phone: "01011110000", office_id: "o1", role: "owner", expires_at: day },
                  { sid: "chk_s1", phone: "01099990000", office_id: "o1", role: "staff", expires_at: day }],
  check_log: [], check_company: [{ id: "c1", office_id: "o1", name: "가나상사" }, { id: "c9", office_id: "o9", name: "남의상사" }],
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

console.log("⑤ 딜러 등록 대기 (기사가 처음 적은 번호)");
const NEW = "010-7777-8888";
const r1 = await arrive({ dealer: "새딜러", tel: NEW, comp: "가나상사" });
const r2 = await arrive({ dealer: "새딜러2", tel: "01077778888" });   // 같은 번호 · 다른 이름
check("등록 안 된 번호는 안 보냄(M2 그대로)", sent.length === 0 && r1.err === "등록된 딜러 번호가 아님" && r2.state === "못 보냄", [r1, sent.length]);
const old = await arrive({ dealer: "새딜러", tel: NEW });
old.arrived_at = new Date(Date.now() - 30 * 3600e3).toISOString();      // 30시간 전 — 다시 보내기 대상 아님
const far = await arrive({ dealer: "옛딜러", tel: "010-5555-6666" });
far.arrived_at = new Date(Date.now() - 20 * 864e5).toISOString();       // 20일 전 — 대기에도 안 보임
const pl = await callT("delivPendingDealers", [], "chk_o1");
const g = (pl.result?.list ?? []).find((x: any) => x.tel === NEW);
check("대기 목록: 번호로 한 줄 · 이름 둘 · 3건", !!g && g.n === 3 && g.names.length === 2 && g.names.includes("새딜러2"), pl);
check("14일 지난 기록은 안 보임", !(pl.result?.list ?? []).some((x: any) => x.tel === "010-5555-6666"), pl.result?.list);
check("직원은 대기 목록 못 봄", !!(await callT("delivPendingDealers", [], "chk_s1")).__err);
check("직원은 승인 못 함", !!(await callT("delivApproveDealer", [{ name: "새딜러", tel: NEW }], "chk_s1")).__err);
let ap = await callT("delivApproveDealer", [{ name: "엉뚱이름", tel: NEW }], "chk_o1");
check("대기 기록에 없는 이름은 거절(⑥)", ap.result?.results?.[0]?.ok === false && !store.check_dealer.some((d: any) => d.name === "엉뚱이름"), ap);
ap = await callT("delivApproveDealer", [{ name: "남", tel: "010-1212-3434" }], "chk_o1");
check("대기 기록에 없는 번호는 거절(⑥)", ap.result?.results?.[0]?.ok === false, ap);
check("21줄은 거절", !!(await callT("delivApproveDealer", [Array.from({ length: 21 }, () => ({ name: "새딜러", tel: NEW }))], "chk_o1")).__err);
sent.length = 0;
ap = await callT("delivApproveDealer", [{ name: "새딜러", tel: NEW, companyId: "c9" }], "chk_o1");
const nd = store.check_dealer.find((d: any) => d.name === "새딜러");
check("승인: 새 딜러로 들어감 · 남의 상사 id 는 안 붙임", !!nd && nd.tel === NEW && nd.company_id === null && nd.office_id === "o1", nd);
check("24시간 안 2건만 다시 보냄 (30시간 전 건은 안 보냄)", ap.result?.results?.[0]?.sent === 2 && sent.length === 2, [ap, sent.length]);
check("다시 보낸 건은 보냄 · 30시간 전 건은 그대로", r1.state === "보냄" && r2.state === "보냄" && old.state === "못 보냄", [r1.state, r2.state, old.state]);
check("다시 보낸 글은 서버 기록으로 · 출고안내 변수", sent[0]?.kakaoOptions?.variables?.["#{차량번호}"] === r1.plate || sent[1]?.kakaoOptions?.variables?.["#{차량번호}"] === r1.plate, sent);
check("감사 기록(번호 가림)", store.check_log.some((l: any) => l.what === "딜러 등록 승인" && l.detail?.tel === "010-****-8888"), store.check_log);
check("승인 뒤에는 대기에서 사라짐", !((await callT("delivPendingDealers", [], "chk_o1")).result?.list ?? []).some((x: any) => x.tel === NEW));
sent.length = 0;
ap = await callT("delivApproveDealer", [{ name: "새딜러", tel: NEW }], "chk_o1");
check("두 번 승인해도 다시 안 보냄", sent.length === 0 && ap.result?.results?.[0]?.ok === false, ap);
/* 기존 딜러에 번호 더하기 */
const r3 = await arrive({ dealer: "홍딜러", tel: "010-4444-5555" });
ap = await callT("delivApproveDealer", [{ name: "홍딜러", tel: "010-4444-5555", dealerId: "d1" }], "chk_o1");
const d1 = store.check_dealer.find((d: any) => d.id === "d1");
check("기존 딜러에 번호 더하기 · 딜러가 둘로 안 나뉨", (d1.tels ?? []).some((t: any) => t.tel === "010-4444-5555") && store.check_dealer.filter((d: any) => d.name === "홍딜러").length === 1 && r3.state === "보냄", [d1, r3.state]);
/* 등록 안 함 */
const r4 = await arrive({ dealer: "스팸", tel: "010-6666-7777" });
const rj = await callT("delivRejectDealer", [{ name: "스팸", tel: "010-6666-7777" }], "chk_o1");
check("등록 안 함: 대기에서 빠지고 기록은 남음 · 안 보냄", rj.result?.n === 1 && r4.state === "못 보냄" && !!store.check_deliv.find((d: any) => d.id === r4.id) &&
  !((await callT("delivPendingDealers", [], "chk_o1")).result?.list ?? []).some((x: any) => x.tel === "010-6666-7777"), rj);
check("등록 안 함 뒤에는 승인도 안 됨", (await callT("delivApproveDealer", [{ name: "스팸", tel: "010-6666-7777" }], "chk_o1")).result?.results?.[0]?.ok === false);

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
