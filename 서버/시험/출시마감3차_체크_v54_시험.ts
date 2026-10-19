// 체크 서버 v54 시험 — 출시마감 3차 [2]: 청구서 보내기는 «한 번만 표»를 못 잡으면 안 보냄 · 받았는지 모름은 «확인 중»(자동 재발송 · 문자 바로 대신 없음) · 실패 확정만 같은 rid 로 다시
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/출시마감3차_체크_v54_시험.ts
// «받음 수» = 가짜 문자 업체(솔라피)가 실제로 받은 메시지 수 — 이것이 늘지 않아야 «두 번 안 나감»이에요.
import { store } from "./fake_supabase_check.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s"); Deno.env.set("SMS_FROM", "0212345678");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v54.ts";
const day = new Date(Date.now() + 86400000).toISOString();
Object.assign(store, {
  check_office: [{ id: "oA", code: "TESTA", name: "시험검사소A", tel: "031-000-0001", sms_from: "0311112222", bank_fee: "국민 123-45 시험A" }],
  check_user: [{ id: "uA", office_id: "oA", phone: "01000000031", name: "대표A", role: "owner", active: true, pw_hash: "x" }],
  check_session: [{ sid: "chk_" + "a".repeat(30), phone: "01000000031", office_id: "oA", role: "owner", expires_at: day }],
  cgg_access: [], wash_sessions: [], check_log: [], check_rate: [], cgg_sendlog: [], cgg_idem: [],
  wash_hq: [{ id: 1, ata_cfg: { pfId: "PF", tpl: { bill: "T_BILL" } } }],
  check_dealer: [{ id: "dA", office_id: "oA", name: "A딜러", tel: "010-3333-4444", active: true }],
  check_invoice: [{ id: "iA", office_id: "oA", ym: "2026-10", bill_to_id: "dA", bill_to_name: "A딜러", total_amount: 11000, view_key: "a".repeat(18), created_at: day }],
  check_invoice_row: [{ id: "rA", invoice_id: "iA" }],
});
/* 가짜 문자 업체: plan 차례대로(비면 ok) — ok 받음 · lost 받은 뒤 답 끊김 · e502 업체 오류(모름) · e400 받지 않음(확정) */
let accepted = 0;
const plan: string[] = [], seen: any[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  const u = String(url);
  if (u.includes("solapi") && u.includes("/messages/v4/send")) {
    const b = JSON.parse(String(init?.body || "{}"));
    const m = plan.shift() || "ok";
    seen.push({ m, ata: !!b.messages?.[0]?.kakaoOptions });
    await new Promise((r) => setTimeout(r, 30));
    if (m === "ok") { accepted++; return Response.json({ groupInfo: { _id: "G" }, failedMessageList: [], messageList: [{ messageId: "M" + accepted }] }); }
    if (m === "lost") { accepted++; throw new TypeError("connection reset by peer"); }
    if (m === "e502") return new Response("bad gateway", { status: 502 });
    if (m === "e400") return new Response(JSON.stringify({ errorCode: "ValidationError" }), { status: 400 });
  }
  return Response.json({});
}) as typeof fetch;
console.error = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(SRC);
const TA = "chk_" + "a".repeat(30);
async function call(fn: string, args: unknown[] = [], rid?: string) {
  return await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop: "", token: TA, fn, args, rid }) }))).json();
}
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const inv = () => store.check_invoice[0];
const fresh = () => { inv().sent_at = null; inv().send_how = null; inv().send_err = null; seen.length = 0; };   // 10분 막기 풀고 새로
const bill = (rid?: string) => call("billSend", [{ ym: "2026-10", ids: ["iA"] }], rid);
const row = (rid: string) => store.cgg_idem.find((x: any) => x.fn === "billSend" && x.rid === rid);
let n = 0;
const rid = () => (String(++n).padStart(4, "0") + "y".repeat(20)).slice(0, 24);

console.log("① 보통 다시 누름 · 동시에 3번 → 받음 1번");
fresh(); let a0 = accepted, R = rid();
const three = await Promise.all([1, 2, 3].map(() => bill(R)));
check("동시에 같은 rid 3번 → 받음 1번(알림톡)", accepted === a0 + 1 && seen.length === 1 && seen[0].ata, [accepted - a0, seen]);
check("나머지는 «처리 중이에요» 또는 같은 답", three.every((x) => x.result?.sent === 1 || /처리 중이에요/.test(x.__err || "")), three);
const rep = await bill(R);
check("끝난 뒤 같은 rid(답을 못 받아 다시) → 처음 답 그대로 · 받음 +0", rep.result?.sent === 1 && accepted === a0 + 1, rep);

console.log("② «한 번만 표» DB 오류 → 받음 0번");
fresh(); a0 = accepted;
(store as any).__idemFail = (op: string) => op === "insert" ? { code: "42501", message: "permission denied for table cgg_idem" } : null;
const d1 = await bill(rid());
check("표 넣기가 23505 아닌 오류(권한) → 보내지 않고 «잠시 뒤 다시»", /잠시 뒤 다시/.test(d1.__err || "") && accepted === a0 && seen.length === 0, [d1, seen]);
const d2 = await call("officeSave", [{ tel: "031-777-7777" }], rid());
check("기록 저장은 지금 정책 그대로(처리)", d2.result?.ok === true && store.check_office[0].tel === "031-777-7777", d2);
(store as any).__idemFail = null;
const keep = store.cgg_idem; delete (store as any).cgg_idem;
const d3 = await bill(rid());
check("표가 아예 없음(SQL 26 전) → 보내지 않고 «잠시 뒤 다시»", /잠시 뒤 다시/.test(d3.__err || "") && accepted === a0 && seen.length === 0, d3);
store.cgg_idem = keep;

console.log("③ 받은 뒤 답 끊김 · 완료 저장 실패 · 중간에 끊김 → 다시 해도 받음 +0");
fresh(); a0 = accepted; R = rid(); plan.push("lost");
const l1 = await bill(R);
check("알림톡을 받은 뒤 답 끊김 → 문자로 바로 대신 보내지 않음(보내기 시도 1번)", seen.length === 1 && seen[0].ata && accepted === a0 + 1, seen);
check("답에 «확인 중» · 청구서는 «checking» · 보냄 시각 남김(10분 막기)", l1.result?.checking === true && l1.result?.results?.[0]?.unknown === true && inv().send_how === "checking" && !!inv().sent_at, [l1, inv()]);
const l2 = await bill(R);
check("같은 rid 로 다시 → «확인 중 — 보낸 기록에서 확인» · 받음 +0 · 줄 그대로(unknown)", l2.__checking === true && accepted === a0 + 1 && row(R)?.state === "unknown", [l2, row(R)]);
const l3 = await bill(rid());
check("새 rid 로 바로 다시 눌러도 10분 막기로 받음 +0", accepted === a0 + 1 && seen.length === 1, l3);
fresh(); a0 = accepted; R = rid(); plan.push("e502");
const e1 = await bill(R);
check("업체 쪽 5xx(모름) → 문자 바로 대신 없음 · «확인 중»", seen.length === 1 && e1.result?.checking === true && row(R)?.state === "unknown", [seen, e1]);
fresh(); a0 = accepted; R = rid();
(store as any).__idemFail = (op: string, p: any) => op === "update" && p?.state === "done" ? { code: "08006", message: "connection failure" } : null;
const s1 = await bill(R);
(store as any).__idemFail = null;
check("보냈는데 «끝남» 저장 실패 → 답에 «확인 중» · 받음 1번", s1.result?.checking === true && accepted === a0 + 1 && row(R)?.state === "unknown", [s1, row(R)]);
inv().sent_at = null;   // 10분 막기가 없더라도
const s2 = await bill(R);
check("같은 rid 로 다시 → «확인 중» · 받음 +0(10분 막기 없이도)", s2.__checking === true && accepted === a0 + 1, s2);
fresh(); R = rid(); a0 = accepted;
store.cgg_idem.push({ product: "check", tenant: "oA", who: "01000000031", fn: "billSend", rid: R, state: "run", at: new Date(Date.now() - 30 * 60000).toISOString() });
const k1 = await bill(R);
check("보내던 중 서버가 끊겨 남은 줄(30분) → «확인 중» · 지우지도 다시 보내지도 않음", k1.__checking === true && accepted === a0 && row(R)?.state === "run", k1);

console.log("④ 알림톡 거절 확정 → 같은 rid 안에서 문자로 · 모두 거절 → 같은 rid 로 다시 하면 한 번");
fresh(); a0 = accepted; R = rid(); plan.push("e400");
const f1 = await bill(R);
check("알림톡이 거절(4xx 확정) → 같은 요청 안에서 대체 문자 1통 · 받음 1번", seen.length === 2 && seen[0].ata && !seen[1].ata && accepted === a0 + 1 && f1.result?.sent === 1, [seen, f1]);
fresh(); a0 = accepted; R = rid(); plan.push("e400", "e400");
const g1 = await bill(R);
check("알림톡·문자 모두 거절 → «못 보냄» · 받음 0 · 보냄 기록 되돌림 · 줄은 «다시 가능»", g1.result?.sent === 0 && accepted === a0 && !inv().sent_at && row(R)?.state === "retry", [g1, inv(), row(R)]);
seen.length = 0;
const g2 = await bill(R);
check("같은 rid 로 다시 → 이번엔 보냄 · 받음 1번", g2.result?.sent === 1 && accepted === a0 + 1 && row(R)?.state === "done", g2);
const g3 = await bill(R);
check("또 같은 rid → 처음 성공 답 · 받음 +0", g3.result?.sent === 1 && accepted === a0 + 1, g3);
fresh(); a0 = accepted; R = rid(); plan.push("e400", "e400");
await bill(R);
const many = await Promise.all([1, 2, 3, 4].map(() => bill(R)));
check("«다시 가능» 줄을 동시에 4번 다시 잡음 → 받음 1번", accepted === a0 + 1 && many.every((x) => x.result?.sent === 1 || /처리 중이에요/.test(x.__err || "")), [accepted - a0, many]);
check("판 v54", /v54/.test(JSON.stringify(await call("ping"))));

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail || pass === 0) Deno.exit(1);
