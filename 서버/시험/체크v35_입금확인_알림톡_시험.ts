// 체크 서버 v35 시험 — 입금이 청구서에 맞춰지면 «차곳간_입금확인»(tpl.deposit_ok) 알림톡 (대표님 10/18)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v35_입금확인_알림톡_시험.ts
import { store } from "./fake_supabase_check.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s");
Deno.env.set("PF_ID", "PF_HQ");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v35.ts";
const day = new Date(Date.now() + 86400000).toISOString();
Object.assign(store, {
  check_office: [{ id: "o1", code: "TEST", name: "시험검사소", tel: "031-000-0000", sms_from: "0311112222" }],
  check_user: [{ id: "u1", office_id: "o1", phone: "01011110000", name: "대표", role: "owner", active: true, pw_hash: "x" }],
  check_session: [{ sid: "chk_own", phone: "01011110000", office_id: "o1", role: "owner", expires_at: day }],
  check_log: [], cgg_access: [], wash_sessions: [], check_rate: [], cgg_sendlog: [],
  wash_hq: [{ id: 1, ata_cfg: { tpl: { deposit_ok: "TPL_DEP" } } }],
  check_dealer: [{ id: "d1", office_id: "o1", name: "홍딜러", tel: "010-3333-4444", active: true },
                 { id: "d2", office_id: "o1", name: "번호없음", tel: "", active: true }],
  check_invoice: [
    { id: "v1", office_id: "o1", ym: "2026-09", bill_to_id: "d1", bill_to_name: "홍딜러", members: [], company_name: "", total_amount: 330000, paid_amount: 0, state: "보냄" },
    { id: "v2", office_id: "o1", ym: "2026-09", bill_to_id: "d2", bill_to_name: "번호없음", members: [], company_name: "", total_amount: 50000, paid_amount: 0, state: "보냄" },
  ],
  check_deposit: [
    { id: "p1", office_id: "o1", sender: "홍딜러", amount: 330000, tx_at: "2026-10-17T05:30:00Z", state: "확인 대기", invoice_id: null, kind: "미분류" },
    { id: "p2", office_id: "o1", sender: "번호없음", amount: 50000, tx_at: "2026-10-17T06:00:00Z", state: "확인 대기", invoice_id: null, kind: "미분류" },
  ],
});
const sent: any[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  if (String(url).includes("solapi") && String(url).includes("/send")) {
    const b = JSON.parse(String(init?.body)); sent.push(b.messages[0]);
    return Response.json({ groupInfo: { _id: "G" }, failedMessageList: [], messageList: [{ messageId: "M" + sent.length }] });
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
const NAMES = ["받는곳", "금액", "업체명", "확인일시", "기간", "업체전화"].map((x) => "#{" + x + "}").sort();
const r = await call("depositMatch");
const k = sent[0]?.kakaoOptions ?? {};
check("두 입금 모두 청구서에 맞춰짐", r.result === 2 && store.check_invoice[0].state === "완료", [r, store.check_invoice]);
check("입금확인 알림톡 한 번 · 등록 번호로 · 본사 템플릿", sent.length === 1 && sent[0].to === "01033334444" && k.templateId === "TPL_DEP" && k.pfId === "PF_HQ", sent);
check("변수 이름이 확정본 5번 6개와 같음", JSON.stringify(Object.keys(k.variables ?? {}).sort()) === JSON.stringify(NAMES), k.variables);
check("변수 값: 받는곳·금액·기간·업체", k.variables?.["#{받는곳}"] === "홍딜러" && k.variables?.["#{금액}"] === "330,000" &&
  k.variables?.["#{기간}"] === "2026년 9월" && k.variables?.["#{업체명}"] === "시험검사소" && k.variables?.["#{업체전화}"] === "031-000-0000", k.variables);
check("확인일시는 한국 시간", k.variables?.["#{확인일시}"] === "2026-10-17 14:30", k.variables?.["#{확인일시}"]);
check("대체 문자는 확정본 대체 문구", sent[0]?.text === "[차곳간] 330,000원 입금 확인되었습니다. 감사합니다.\n시험검사소 031-000-0000", sent[0]?.text);
check("번호 없는 청구처는 안 보냄(맞춰지기는 함)", store.check_invoice[1].state === "완료" && sent.length === 1);
check("기록 남음", store.check_log.some((l: any) => l.what === "입금확인 알림" && l.detail?.ok === true));
sent.length = 0;
await call("depositMatch");
check("다시 불러도 같은 입금으로 또 안 보냄", sent.length === 0, sent);
/* 동시에 두 번 — 새 입금 하나 */
store.check_invoice.push({ id: "v3", office_id: "o1", ym: "2026-10", bill_to_id: "d1", bill_to_name: "홍딜러", members: [], company_name: "", total_amount: 100000, paid_amount: 0, state: "보냄" });
store.check_invoice[0].state = "완료";
store.check_deposit.push({ id: "p3", office_id: "o1", sender: "홍딜러", amount: 40000, tx_at: "2026-10-17T07:00:00Z", state: "확인 대기", invoice_id: null, kind: "미분류" });
sent.length = 0;
await Promise.all([call("depositMatch"), call("depositMatch")]);
const v3 = store.check_invoice.find((v: any) => v.id === "v3");
check("동시에 두 번 불러도 알림 1번 · 금액 1번만 더함", sent.length === 1 && v3.paid_amount === 40000 && v3.state === "수금중", [sent.length, v3]);
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
