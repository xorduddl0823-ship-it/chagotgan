// 체크 서버 v36 시험 — 체크 v46 «거래처 한 화면» 약속 (partnerCaps · later · more · last · 입금 한 번에 더하기 · 확인일시 모양)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v36_거래처_한화면_시험.ts
import { store } from "./fake_supabase_check.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s");
Deno.env.set("PF_ID", "PF_HQ");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v36.ts";
const day = new Date(Date.now() + 86400000).toISOString();
Object.assign(store, {
  __sql13: true,
  check_office: [{ id: "o1", code: "TEST", name: "시험검사소", tel: "031-000-0000", sms_from: "0311112222", vat_rate: 10 }],
  check_user: [{ id: "u1", office_id: "o1", phone: "01011110000", name: "대표", role: "owner", active: true, pw_hash: "x" },
               { id: "u2", office_id: "o1", phone: "01022220000", name: "직원", role: "staff", active: true, pw_hash: "x" }],
  check_session: [{ sid: "chk_own", phone: "01011110000", office_id: "o1", role: "owner", expires_at: day },
                  { sid: "chk_stf", phone: "01022220000", office_id: "o1", role: "staff", expires_at: day }],
  check_log: [], cgg_access: [], wash_sessions: [], check_rate: [], cgg_sendlog: [],
  wash_hq: [{ id: 1, ata_cfg: { tpl: { deposit_ok: "TPL_DEP" } } }],
  check_company: [{ id: "c1", office_id: "o1", name: "가나상사", biz_no: "1234567890", ceo: "김상사", addr: "서울", email: "", upte: "", jongmok: "" }],
  check_dealer: [{ id: "d1", office_id: "o1", name: "홍딜러", tel: "01033334444", company_id: "c1", issuer_kind: "company", tax_issue: true, active: true },
                 { id: "d2", office_id: "o1", name: "나중딜러", tel: "01055556666", company_id: "c1", issuer_kind: "company", tax_issue: true, active: true }],
  check_car: [{ id: "k1", office_id: "o1", dealer_id: "d1", check_date: "2026-09-03", goods: "국산", amount: 55000, ins_fee: 0 },
              { id: "k2", office_id: "o1", dealer_id: "d1", check_date: "2026-09-21", goods: "국산", amount: 55000, ins_fee: 0 },
              { id: "k3", office_id: "o1", dealer_id: "d2", check_date: "2026-09-10", goods: "국산", amount: 55000, ins_fee: 0 }],
  check_price_band: [], check_repair: [], check_bill_override: [], check_invoice: [], check_invoice_row: [], check_deposit: [],
});
const sent: any[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  if (String(url).includes("solapi") && String(url).includes("/send")) {
    const b = JSON.parse(String(init?.body)); sent.push(b.messages[0]);
    return Response.json({ groupInfo: { _id: "G" }, failedMessageList: [], messageList: [{ messageId: "M" }] });
  }
  return Response.json({});
}) as typeof fetch;
console.error = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(SRC);
const call = async (fn: string, args: unknown[] = [], token = "chk_own") =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop: "", token, fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const D = (id: string) => store.check_dealer.find((d: any) => d.id === id);

console.log("① partnerCaps · last_date");
const caps = await call("partnerCaps");
check("partnerCaps → {later, more, last}", caps.result?.later === true && caps.result?.more === true && caps.result?.last === true, caps);
const ds = (await call("dealers")).result ?? [];
check("dealers() 줄마다 last_date(마지막 검사일)", ds.find((d: any) => d.id === "d1")?.last_date === "2026-09-21" && ds.find((d: any) => d.id === "d2")?.last_date === "2026-09-10", ds);

console.log("② 청구서 만들기 — «나중에» 도 지금처럼 상사로 (금액 그대로)");
await call("invoiceBuild", ["2026-09"]);
const before = JSON.stringify(store.check_invoice.map((v: any) => [v.bill_to_id, v.total_amount, v.issuer_kind, v.issuer_biz]).sort());
let r = await call("dealerSave", [{ id: "d2", name: "나중딜러", tel: "01055556666", company_id: "c1", issuer_kind: "later" }]);
check("dealerSave 가 later 를 받음", !r.__err && D("d2").issuer_kind === "later", [r, D("d2")]);
check("모르는 값은 company 로", !(await call("dealerSave", [{ id: "d1", name: "홍딜러", tel: "01033334444", company_id: "c1", issuer_kind: "evil" }])).__err && D("d1").issuer_kind === "company");
store.check_invoice = []; store.check_invoice_row = [];
await call("invoiceBuild", ["2026-09"]);
const after = JSON.stringify(store.check_invoice.map((v: any) => [v.bill_to_id, v.total_amount, v.issuer_kind, v.issuer_biz]).sort());
check("later 로 바꿔도 청구 결과(금액·발행 근거·사업자번호)가 같음", before === after && store.check_invoice.length === 2, [before, after]);
const tl = (await call("taxList", ["2026-09"])).result ?? [];
const t2 = tl.find((x: any) => x.name === "나중딜러"), t1 = tl.find((x: any) => x.name === "홍딜러");
check("홈택스 대상: 나중에 → «계산서 정보가 아직 없습니다» · 다른 딜러는 그대로", t2?.can === false && /아직 없습니다/.test(t2?.why) && t1?.can === true, tl);

console.log("③ more — 상사 addr·email·upte·jongmok · 딜러 issuer_email·upte·jongmok");
r = await call("companySave", [{ id: "c1", name: "가나상사", biz_no: "1234567890", ceo: "김상사", addr: "서울 강남", email: "tax@gana.kr", upte: "도소매", jongmok: "중고차" }]);
const cs = (await call("companies")).result ?? [];
check("companySave 가 받고 companies() 가 돌려줌", cs[0]?.email === "tax@gana.kr" && cs[0]?.upte === "도소매" && cs[0]?.jongmok === "중고차" && cs[0]?.addr === "서울 강남", [r, cs]);
r = await call("companySave", [{ id: "c1", name: "가나상사", biz_no: "1234567890" }]);
check("안 보낸 칸은 지우지 않음", store.check_company[0].email === "tax@gana.kr" && store.check_company[0].addr === "서울 강남", store.check_company[0]);
r = await call("dealerSave", [{ id: "d1", name: "홍딜러", tel: "01033334444", company_id: "c1", issuer_kind: "dealer", issuer_name: "홍모터스",
  issuer_biz: "2223344444", issuer_email: "hong@x.kr", issuer_upte: "서비스", issuer_jongmok: "중개" }]);
check("dealerSave 가 issuer_email·upte·jongmok 받음", D("d1").issuer_email === "hong@x.kr" && D("d1").issuer_upte === "서비스" && D("d1").issuer_jongmok === "중개", D("d1"));
r = await call("dealerSave", [{ id: "d1", name: "홍딜러", tel: "01033334444", company_id: "c1", issuer_kind: "dealer" }]);
check("안 보내면 그대로", D("d1").issuer_email === "hong@x.kr", D("d1"));
check("직원은 못 바꿈", !!(await call("dealerSave", [{ id: "d1", name: "x", issuer_email: "e@e" }], "chk_stf")).__err && !!(await call("companySave", [{ id: "c1", name: "가나상사", email: "e@e" }], "chk_stf")).__err);

console.log("④ 입금 — SQL 13 함수로 한 번에 더하기 · 확인일시 «10월 18일 14:30»");
const inv = store.check_invoice.find((v: any) => v.bill_to_id === "d2");
inv.paid_amount = 0; inv.state = "보냄";
store.check_deposit.push({ id: "p1", office_id: "o1", sender: "나중딜러", amount: 20000, tx_at: "2026-10-18T05:30:00Z", state: "확인 대기", invoice_id: null, kind: "미분류" },
                        { id: "p2", office_id: "o1", sender: "나중딜러", amount: 10000, tx_at: "2026-10-18T05:31:00Z", state: "확인 대기", invoice_id: null, kind: "미분류" });
sent.length = 0;
await Promise.all([call("depositMatch"), call("depositMatch")]);
check("두 입금이 겹쳐도 금액이 빠지지 않음(30,000)", inv.paid_amount === 30000, inv);
check("입금확인 알림 두 건(입금마다 한 번)", sent.length === 2, sent.length);
check("확인일시 «10월 18일 14:30»", sent.some((m: any) => m.kakaoOptions?.variables?.["#{확인일시}"] === "10월 18일 14:30"), sent.map((m: any) => m.kakaoOptions?.variables?.["#{확인일시}"]));
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
