// 체크 서버 v45 시험 — 체크 v50 단추 창구(invoiceDel · invoiceUnsend · tplInfo/tplSave · feeRules · smsConf)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v45_단추창구_시험.ts
import { store } from "./fake_supabase_check.ts";
Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v45.ts";
const day = new Date(Date.now() + 86400000).toISOString();
const T = new Date().toISOString();
Object.assign(store, {
  check_office: [{ id: "o1", code: "TEST", name: "시험검사소", vat_rate: 10 }, { id: "o2", code: "OTHER", name: "남" }],
  check_user: [{ id: "u1", office_id: "o1", phone: "01011110000", name: "대표", role: "owner", active: true, pw_hash: "x" },
               { id: "u2", office_id: "o1", phone: "01022220000", name: "직원", role: "staff", active: true, pw_hash: "x" }],
  check_session: [{ sid: "chk_own", phone: "01011110000", office_id: "o1", role: "owner", expires_at: day },
                  { sid: "chk_stf", phone: "01022220000", office_id: "o1", role: "staff", expires_at: day }],
  check_log: [], cgg_access: [], wash_sessions: [], check_rate: [],
  wash_hq: [{ id: 1, ata_cfg: { pfId: "PF", tpl: { bill: "T_BILL", check_remind: "" } } }],
  check_invoice: [
    { id: "v1", office_id: "o1", ym: "2026-10", bill_to_name: "홍딜러", total_amount: 33000, state: "보냄", sent_at: T, view_at: T },
    { id: "v2", office_id: "o1", ym: "2026-10", bill_to_name: "김딜러", total_amount: 33000, tax_key: "TK1", state: "보냄", sent_at: T },
    { id: "v3", office_id: "o1", ym: "2026-10", bill_to_name: "이딜러", total_amount: 33000, paid_amount: 10000, state: "수금중", sent_at: T },
    { id: "v4", office_id: "o1", ym: "2026-10", bill_to_name: "박딜러", total_amount: 33000, state: "만듦" },
    { id: "vx", office_id: "o2", ym: "2026-10", bill_to_name: "남의딜러", total_amount: 1, state: "보냄", sent_at: T, view_at: T },
  ],
  check_invoice_row: [{ id: "r1", invoice_id: "v1", amount: 33000 }, { id: "r4", invoice_id: "v4", amount: 33000 }, { id: "rx", invoice_id: "vx", amount: 1 }],
});
globalThis.fetch = (async () => Response.json({})) as typeof fetch;
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
const inv = (id: string) => store.check_invoice.find((v: any) => v.id === id);

console.log("② invoiceUnsend");
check("직원은 못 함", !!(await call("invoiceUnsend", [{ ids: ["v1"] }], "chk_stf")).__err && !!inv("v1").sent_at);
let r = await call("invoiceUnsend", [{ ids: ["v1", "vx"] }]);
check("우리 것만 비움 → {n:1} · «보냄» → «만듦»", r.result?.n === 1 && inv("v1").sent_at === null && inv("v1").view_at === null && inv("v1").state === "만듦", [r, inv("v1")]);
check("남의 검사소 청구서는 그대로", !!inv("vx").sent_at && !!inv("vx").view_at);

console.log("① invoiceDel");
check("직원은 못 함", !!(await call("invoiceDel", [{ ym: "2026-10", ids: ["v4"] }], "chk_stf")).__err && !!inv("v4"));
check("월 모양 틀리면 거절", !!(await call("invoiceDel", [{ ym: "2026/10", ids: ["v4"] }])).__err);
check("고른 것 없으면 거절", !!(await call("invoiceDel", [{ ym: "2026-10", ids: [] }])).__err);
r = await call("invoiceDel", [{ ym: "2026-10", ids: ["v1", "v2", "v3", "v4", "vx"] }]);
check("지울 수 있는 것만 지움 → {n:2}", r.result?.n === 2 && !inv("v1") && !inv("v4"), r);
check("발급·입금된 것은 남기고 까닭", !!inv("v2") && !!inv("v3") && r.result?.kept?.length === 2 &&
  r.result.kept.some((k: any) => k.id === "v2" && /세금계산서/.test(k.why)) && r.result.kept.some((k: any) => k.id === "v3" && /입금/.test(k.why)), r.result?.kept);
check("남의 검사소 청구서·줄은 그대로", !!inv("vx") && store.check_invoice_row.some((x: any) => x.id === "rx") && r.result?.missing === 1, r);
check("지운 청구서의 줄도 지움 · 기록 남음", !store.check_invoice_row.some((x: any) => x.id === "r1" || x.id === "r4") && store.check_log.some((l: any) => l.what === "청구서 지움"));

console.log("③ 알림톡 템플릿 — 체크는 보기만");
r = await call("tplInfo", [], "chk_stf");
check("tplInfo: 본사 값 있음/없음만 (코드 글 없음)", r.result?.readOnly === true && r.result.profile === true && r.result.bill === true && r.result.remind === false && !JSON.stringify(r).includes("T_BILL"), r);
r = await call("tplSave", [{ profile: "X", bill: "Y" }]);
check("tplSave 는 거절 (관리에서 넣음)", !!r.__err && /관리/.test(r.__err) && store.wash_hq[0].ata_cfg.pfId === "PF", r);

console.log("④⑤ SQL 19 전");
r = await call("feeRules", []);
check("표가 없으면 «서버 준비 중» 안내", !!r.__err && /준비/.test(r.__err), r);
store.check_office_conf = [];

console.log("④ feeRules");
r = await call("feeRules", []);
check("처음 불러오기 = 꺼짐 · 빈 목록", r.result?.on === false && Array.isArray(r.result?.rules) && r.result.rules.length === 0, r);
check("직원은 저장 못 함", !!(await call("feeRules", [{ on: true, rules: [] }], "chk_stf")).__err);
check("방법·금액·비율 틀리면 거절", !!(await call("feeRules", [{ on: true, rules: [{ who: "김검사", how: "아무거나", amt: 1 }] }])).__err &&
  !!(await call("feeRules", [{ on: true, rules: [{ who: "김검사", how: "한 대마다", amt: 1.5 }] }])).__err &&
  !!(await call("feeRules", [{ on: true, rules: [{ who: "김검사", how: "검사비 %", amt: 101 }] }])).__err &&
  !!(await call("feeRules", [{ on: true, rules: [{ who: "", how: "한 대마다", amt: 1 }] }])).__err);
r = await call("feeRules", [{ on: true, rules: [{ who: "김검사<b>", how: "한 대마다", amt: 3000 }, { who: "이검사", how: "검사비 %", amt: 12.5 }] }]);
check("대표 저장 → {ok} · 이름 글자 거름", r.result?.ok === true && r.result.rules.length === 2 && !/[<>]/.test(r.result.rules[0].who), r);
check("직원은 불러오기도 못 함", !!(await call("feeRules", [], "chk_stf")).__err);
r = await call("feeRules", []);
check("대표 불러오기", r.result?.on === true && r.result.rules[1].amt === 12.5, r);

console.log("⑤ smsConf");
check("http(https 아님)·이상한 주소 거절", !!(await call("smsConf", [{ url: "http://x.com" }])).__err && !!(await call("smsConf", [{ url: "javascript:alert(1)" }])).__err);
check("직원은 저장 못 함", !!(await call("smsConf", [{ url: "https://script.google.com/macros/s/AB/exec" }], "chk_stf")).__err);
r = await call("smsConf", [{ url: "https://script.google.com/macros/s/AB/exec", pw: "secret-pw-123" }]);
check("저장 → 비밀번호는 «넣음»만 돌려줌", r.result?.ok === true && r.result.pwSet === true && !JSON.stringify(r).includes("secret-pw-123"), r);
check("직원은 수집함 설정도 못 봄", !!(await call("smsConf", [], "chk_stf")).__err);
r = await call("smsConf", []);
check("불러오기에도 비밀번호 글 없음", r.result?.url === "https://script.google.com/macros/s/AB/exec" && r.result.pwSet === true && !JSON.stringify(r).includes("secret-pw-123"), r);
check("기록에도 비밀번호 글 없음", !JSON.stringify(store.check_log).includes("secret-pw-123"));
r = await call("smsConf", [{ url: "https://script.google.com/macros/s/CD/exec" }]);
check("pw 를 빼면 비밀번호 그대로", r.result?.pwSet === true && store.check_office_conf[0].sms_pw === "secret-pw-123", r);
r = await call("smsConf", [{ pw: "" }]);
check("빈 비밀번호면 지움", r.result?.pwSet === false, r);
check("검사소마다 따로", store.check_office_conf.every((c: any) => c.office_id === "o1"));

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
