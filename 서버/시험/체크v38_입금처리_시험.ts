// 체크 서버 v38 시험 — 체크 v47 «입금 내역» 약속: 맞추기·되돌리기·갈래·지우기·되살리기·휴지통·은행 엑셀(겹침 막기)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v38_입금처리_시험.ts
import { store } from "./fake_supabase_check.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s");
Deno.env.set("PF_ID", "PF_HQ");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v38.ts";
const day = new Date(Date.now() + 86400000).toISOString();
const ago = (h: number) => new Date(Date.now() - h * 3600e3).toISOString();
Object.assign(store, {
  __sql13: true,
  check_office: [{ id: "o1", code: "TEST", name: "시험검사소", tel: "031-000-0000", sms_from: "0311112222" }],
  check_user: [{ id: "u1", office_id: "o1", phone: "01011110000", name: "대표", role: "owner", active: true, pw_hash: "x" },
               { id: "u2", office_id: "o1", phone: "01022220000", name: "직원", role: "staff", active: true, pw_hash: "x" }],
  check_session: [{ sid: "chk_own", phone: "01011110000", office_id: "o1", role: "owner", expires_at: day },
                  { sid: "chk_stf", phone: "01022220000", office_id: "o1", role: "staff", expires_at: day }],
  check_log: [], cgg_access: [], wash_sessions: [], check_rate: [], cgg_sendlog: [],
  wash_hq: [{ id: 1, ata_cfg: { tpl: { deposit_ok: "TPL_DEP" } } }],
  check_dealer: [{ id: "d1", office_id: "o1", name: "홍딜러", tel: "01033334444", active: true }],
  check_invoice: [{ id: "v1", office_id: "o1", ym: "2026-09", bill_to_id: "d1", bill_to_name: "홍딜러", members: [], company_name: "", total_amount: 100000, paid_amount: 0, state: "보냄", sent_at: ago(48) },
                  { id: "vx", office_id: "o2", ym: "2026-09", bill_to_id: "dx", bill_to_name: "남", members: [], total_amount: 1, paid_amount: 0, state: "보냄" }],
  check_deposit: [
    { id: "p1", office_id: "o1", sender: "김아무개", amount: 60000, tx_at: ago(5), state: "확인 대기", invoice_id: null, kind: "미분류", src: "팝빌", uniq_key: "a|1" },
    { id: "p2", office_id: "o1", sender: "이아무개", amount: 40000, tx_at: ago(4), state: "확인 대기", invoice_id: null, kind: "미분류", src: "팝빌", uniq_key: "a|2" },
    { id: "p3", office_id: "o1", sender: "(주)가나 상사", amount: 77000, tx_at: ago(3), state: "확인 대기", invoice_id: null, kind: "미분류", src: "팝빌", uniq_key: "a|3" },
    { id: "px", office_id: "o2", sender: "남", amount: 1, tx_at: ago(3), state: "확인 대기", invoice_id: null, kind: "미분류", src: "팝빌", uniq_key: "b|1" },
  ],
});
const sent: any[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  if (String(url).includes("solapi") && String(url).includes("/send")) { sent.push(JSON.parse(String(init?.body)).messages[0]); return Response.json({ failedMessageList: [], messageList: [{}] }); }
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
const P = (id: string) => store.check_deposit.find((d: any) => d.id === id);
const V = () => store.check_invoice.find((v: any) => v.id === "v1");

console.log("① 손으로 맞추기 (직원도)");
check("남의 검사소 입금이 섞이면 전체 거절", !!(await call("depositApply", [{ ids: ["p1", "px"], invoiceId: "v1" }])).__err && P("p1").state === "확인 대기");
check("남의 검사소 청구서는 거절", !!(await call("depositApply", [{ ids: ["p1"], invoiceId: "vx" }])).__err);
let r = await call("depositApply", [{ ids: ["p1"], invoiceId: "v1" }], "chk_stf");
check("직원이 맞춤 → {n, invoice}", r.result?.n === 1 && r.result?.invoice?.paid === 60000 && r.result?.invoice?.state === "수금중", r);
check("입금은 «입금 처리» · 청구서·딜러 이어짐 · 갈래 검사비", P("p1").state === "입금 처리" && P("p1").invoice_id === "v1" && P("p1").dealer_id === "d1" && P("p1").kind === "검사비", P("p1"));
check("입금확인 알림 한 번", sent.length === 1 && sent[0].kakaoOptions?.templateId === "TPL_DEP", sent.length);
r = await call("depositApply", [{ ids: ["p1"], invoiceId: "v1" }]);
check("같은 입금을 또 맞춰도 금액 안 더함", r.result?.n === 0 && V().paid_amount === 60000, [r, V()]);
await Promise.all([call("depositApply", [{ ids: ["p2"], invoiceId: "v1" }]), call("depositApply", [{ ids: ["p2"], invoiceId: "v1" }])]);
check("동시에 두 번 눌러도 한 번 · 다 들어오면 완료", V().paid_amount === 100000 && V().state === "완료" && sent.length === 2, [V(), sent.length]);

console.log("② 되돌리기 · 자동 맞추기가 다시 안 잡음 · 알림 다시 안 감");
r = await call("depositUnapply", [{ ids: ["p2"] }], "chk_stf");
check("되돌리기 → 금액 빼고 «확인 대기» · hold", r.result?.n === 1 && V().paid_amount === 60000 && V().state === "수금중" && P("p2").state === "확인 대기" && !P("p2").invoice_id && P("p2").hold === true, [r, V(), P("p2")]);
P("p2").sender = "홍딜러";
await call("depositMatch");
check("되돌린 입금은 자동 맞추기가 다시 안 잡음", P("p2").state === "확인 대기", P("p2"));
sent.length = 0;
await call("depositApply", [{ ids: ["p2"], invoiceId: "v1" }]);
check("다시 맞춰도 알림은 다시 안 감(입금마다 한 번)", sent.length === 0 && V().paid_amount === 100000, [sent.length, V()]);
await call("depositUnapply", [{ ids: ["p1", "p2"] }]);
check("다 되돌리면 0원 · 상태 «보냄»", V().paid_amount === 0 && V().state === "보냄", V());

console.log("③ 갈래 · 지우기 · 되살리기 · 휴지통");
check("모르는 갈래는 거절", !!(await call("depositKind", [{ ids: ["p3"], kind: "용돈" }])).__err);
r = await call("depositKind", [{ ids: ["p3"], kind: "정비비" }], "chk_stf");
check("갈래 바꾸기(직원도)", r.result?.n === 1 && P("p3").kind === "정비비", r);
check("직원은 지우기 못 함", !!(await call("depositDel", [{ ids: ["p3"] }], "chk_stf")).__err);
await call("depositApply", [{ ids: ["p1"], invoiceId: "v1" }]);
r = await call("depositDel", [{ ids: ["p1", "p3"] }]);
check("맞춘 것은 kept · 나머지는 «지움»(줄은 남음)", r.result?.n === 1 && r.result?.kept?.[0]?.id === "p1" && P("p3").state === "지움" && P("p1").state === "입금 처리", r);
const list = (await call("depositList", [{ days: 31 }])).result ?? [];
check("depositList 는 «지움» 을 뺌", !list.some((d: any) => d.id === "p3") && list.some((d: any) => d.id === "p1" && "invoice_id" in d), list.map((d: any) => d.id));
check("휴지통 목록(대표만)", ((await call("depositTrash")).result ?? []).some((d: any) => d.id === "p3") && !!(await call("depositTrash", [], "chk_stf")).__err);
r = await call("depositRestore", [{ ids: ["p3"] }]);
check("되살리기 → «확인 대기»", r.result?.n === 1 && P("p3").state === "확인 대기", r);

console.log("④ 은행 엑셀 넣기 (대표만 · 겹침 막기)");
const kst = (iso: string) => new Date(Date.parse(iso) + 9 * 3600e3).toISOString().slice(0, 19) + "+09:00";
const rows = [
  { tx_at: kst(ago(3)), sender: "가나상사", amount: 77000 },                    // 팝빌 p3 와 같은 날·금액·이름(공백·(주) 뗌) → dup
  { tx_at: kst(ago(2)), sender: "박새손님", amount: 33000 },                    // 새 줄
  { tx_at: kst(ago(2)), sender: "박새손님", amount: 33000 },                    // 같은 줄 두 번 → dup
  { tx_at: kst(ago(3)), sender: "가나상사", amount: 77000, force: true },       // 그래도 넣기
  { tx_at: "어제", sender: "x", amount: 1 }, { tx_at: kst(ago(1)), sender: "y", amount: -5 },
  { tx_at: kst(ago(1)), sender: "", amount: 5 }, { tx_at: kst(ago(24 * 500)), sender: "옛날", amount: 5 },
];
check("직원은 엑셀 못 넣음", !!(await call("depositImport", [{ rows }], "chk_stf")).__err);
r = await call("depositImport", [{ rows }]);
check("got 2 · dup 2 · bad 4", r.result?.got === 2 && r.result?.dup === 2 && r.result?.bad?.length === 4, r);
check("엑셀 줄은 src 엑셀 · 확인 대기", store.check_deposit.filter((d: any) => d.src === "엑셀").every((d: any) => d.state === "확인 대기" || d.state === "자동 반영") &&
  store.check_deposit.filter((d: any) => d.src === "엑셀").length === 2);
r = await call("depositImport", [{ rows: rows.slice(1, 2) }]);
check("같은 엑셀을 또 넣으면 dup", r.result?.got === 0 && r.result?.dup === 1, r);
check("1,001줄은 거절", !!(await call("depositImport", [{ rows: Array.from({ length: 1001 }, () => rows[1]) }])).__err);
check("기록이 남음", ["입금 처리", "입금 되돌림", "입금 갈래", "입금 지움", "입금 되살림", "은행 엑셀 넣기"].every((w) => store.check_log.some((l: any) => l.what === w)));
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
