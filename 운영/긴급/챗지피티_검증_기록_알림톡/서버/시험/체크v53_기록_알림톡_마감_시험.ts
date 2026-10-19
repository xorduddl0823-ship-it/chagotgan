// 체크 서버 v53 시험 — 기록·알림톡 출시 마감: rid «한 번 누름 = 한 번 처리» · 열쇠에 검사소+사람 · 빈 값이면 알림톡 대신 문자
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v53_기록_알림톡_마감_시험.ts
import { store } from "./fake_supabase_check.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s"); Deno.env.set("SMS_FROM", "0212345678");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v53.ts";
const day = new Date(Date.now() + 86400000).toISOString();
Object.assign(store, {
  check_office: [{ id: "oA", code: "TESTA", name: "시험검사소A", tel: "031-000-0001", sms_from: "0311112222", bank_fee: "국민 123-45 시험A" },
                 { id: "oB", code: "TESTB", name: "시험검사소B", tel: "031-000-0002", sms_from: "0311113333", bank_fee: "" }],
  check_user: [{ id: "uA", office_id: "oA", phone: "01000000031", name: "대표A", role: "owner", active: true, pw_hash: "x" },
               { id: "uB", office_id: "oB", phone: "01000000032", name: "대표B", role: "owner", active: true, pw_hash: "x" }],
  check_session: [{ sid: "chk_" + "a".repeat(30), phone: "01000000031", office_id: "oA", role: "owner", expires_at: day },
                  { sid: "chk_" + "b".repeat(30), phone: "01000000032", office_id: "oB", role: "owner", expires_at: day }],
  cgg_access: [], wash_sessions: [], check_log: [], check_rate: [], cgg_sendlog: [], cgg_idem: [],
  wash_hq: [{ id: 1, ata_cfg: { pfId: "PF", tpl: { bill: "T_BILL" } } }],
  check_dealer: [{ id: "dA", office_id: "oA", name: "A딜러", tel: "010-3333-4444", active: true }, { id: "dB", office_id: "oB", name: "B딜러", tel: "010-5555-6666", active: true }],
  check_invoice: [
    { id: "iA", office_id: "oA", ym: "2026-10", bill_to_id: "dA", bill_to_name: "A딜러", total_amount: 11000, view_key: "a".repeat(18), created_at: day },
    { id: "iB", office_id: "oB", ym: "2026-10", bill_to_id: "dB", bill_to_name: "B딜러", total_amount: 22000, view_key: "b".repeat(18), created_at: day },
  ],
  check_invoice_row: [{ id: "rA", invoice_id: "iA" }, { id: "rB", invoice_id: "iB" }],
});
const sent: any[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  if (String(url).includes("solapi")) {
    const b = JSON.parse(String(init?.body || "{}"));
    if (!b.messages) return Response.json({});
    sent.push(b.messages[0]); await new Promise((r) => setTimeout(r, 30));
    return Response.json({ groupInfo: { _id: "G" }, failedMessageList: [], messageList: [{ messageId: "M" + sent.length }] });
  }
  return Response.json({});
}) as typeof fetch;
console.error = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(SRC);
const TA = "chk_" + "a".repeat(30), TB = "chk_" + "b".repeat(30);
async function call(fn: string, args: unknown[] = [], token = "", rid?: string) {
  return await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop: "", token, fn, args, rid }) }))).json();
}
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const R1 = "r".repeat(24);
const inv = (id: string) => store.check_invoice.find((x: any) => x.id === id);

console.log("① 청구서 보내기 — 연속 클릭·다시 보내기(같은 rid)");
const three = await Promise.all([1, 2, 3].map(() => call("billSend", [{ ym: "2026-10", ids: ["iA"] }], TA, R1)));
check("알림톡은 한 통만", sent.length === 1 && sent[0].kakaoOptions?.templateId === "T_BILL", sent.length);
check("나머지는 «처리 중이에요» 또는 같은 답", three.every((x) => x.result || /처리 중이에요/.test(x.__err || "")), three);
const again = await call("billSend", [{ ym: "2026-10", ids: ["iA"] }], TA, R1);
check("끝난 뒤 같은 rid → 처음 답 그대로 · 다시 안 보냄", sent.length === 1 && again.result?.sent === 1, again);
check("보냄 기록은 남음(sent_at · send_how)", !!inv("iA").sent_at && inv("iA").send_how === "ata", inv("iA"));

console.log("② 열쇠에 검사소 + 사람");
const b1 = await call("billSend", [{ ym: "2026-10", ids: ["iB"] }], TB, R1);
check("B 가 같은 rid → B 것으로 새로 처리(A 답 아님)", b1.result?.sent === 1 && b1.result?.results?.[0]?.id === "iB" && sent.length === 2, b1);
check("열쇠: 제품 check · 검사소 id · 사람 · 기능 · rid", store.cgg_idem.length === 2 && store.cgg_idem.every((x: any) => x.product === "check" && ["oA", "oB"].includes(x.tenant) && /^0100000003/.test(x.who) && x.fn === "billSend"), store.cgg_idem);

console.log("③ 빈 값이면 알림톡 대신 문자 (알림톡 방 대조 3)");
const b2 = sent[1] || {};
check("B 검사소는 계좌가 비어 «-» → 알림톡 아닌 문자 · 결과 기록 lms/sms", !b2.kakaoOptions && /청구 내역/.test(String(b2.text)) && /^(lms|sms)$/.test(b1.result?.results?.[0]?.how || ""), [b2, b1.result?.results]);
check("A(값이 다 있음)는 알림톡", !!sent[0]?.kakaoOptions);

console.log("④ 실패는 기록하지 않음 → 다시 하기 가능");
const R2 = "q".repeat(24);
const f1 = await call("billSend", [{ ym: "2026-10", ids: ["iB"] }], TA, R2);   // 남의 청구서 → 거절
const f2 = await call("billSend", [{ ym: "2026-10", ids: ["iB"] }], TA, R2);
check("같은 거절 · «처리 중» 아님 · 기록 없음", !!f1.__err && !!f2.__err && !/처리 중/.test(f2.__err) && !store.cgg_idem.some((x: any) => x.rid === R2), [f1, f2]);
const n0 = sent.length;
await call("billSend", [{ ym: "2026-10", ids: ["iA"] }], TA);
check("rid 없는 예전 화면은 예전처럼(10분 막기는 그대로)", sent.length === n0, sent.length - n0);
const RS = "u".repeat(24);
store.cgg_idem.push({ product: "check", tenant: "oA", who: "01000000031", fn: "officeSave", rid: RS, state: "run", at: new Date(Date.now() - 6 * 60000).toISOString() });
const st = await call("officeSave", [{ tel: "031-777-7777" }], TA, RS);
check("(보안 방 낮음) 6분 넘게 남은 «처리 중» 줄은 다시 처리", st.result?.ok === true && store.check_office[0].tel === "031-777-7777", st);
check("저장된 답에 비밀값 이름 칸 없음", !store.cgg_idem.some((x: any) => /"[^"]*(pw|pass|secret|token|key|sid|otp)[^"]*":/i.test(JSON.stringify(x.result ?? null))));
check("판 v53", /v53/.test(JSON.stringify(await call("ping"))));

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail || pass === 0) Deno.exit(1);
