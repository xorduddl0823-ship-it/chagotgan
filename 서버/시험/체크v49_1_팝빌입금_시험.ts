// 체크 서버 v49.1 시험 — 팝빌 계좌조회(bankPull)가 «같은 줄 막기 규칙» 없이도 입금을 넣는지 · 겹침 · 넣지 못하면 알림
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v49_1_팝빌입금_시험.ts
// CHECK_SRC 에 v49 를 넣으면 «규칙 없음» 시험이 실패해야 합니다(예전엔 조용히 0건).
import { store } from "./fake_supabase_check.ts";
Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("POPBILL_LINKID", "LID"); Deno.env.set("POPBILL_SECRET", btoa("secret"));
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v49_1.ts";
const day = new Date(Date.now() + 86400000).toISOString();
Object.assign(store, {
  check_office: [{ id: "o1", code: "GAON", name: "가온", vat_rate: 10, biz_no: "1234567890", popbill_userid: "gaon", popbill_corp: "1234567890" }],
  check_user: [{ id: "u1", office_id: "o1", phone: "01011110000", name: "대표", role: "owner", active: true, pw_hash: "x" }],
  check_session: [{ sid: "chk_own", phone: "01011110000", office_id: "o1", role: "owner", expires_at: day }],
  check_log: [], cgg_access: [], wash_sessions: [], check_rate: [],
  check_bank: [{ id: "b1", office_id: "o1", bank_code: "0004", acct_no: "12345678901", active: true, use_for: "검사비" }],
  check_deposit: [], check_invoice: [], check_dealer: [],
});
let list: any[] = [];
globalThis.fetch = (async (url: string | URL) => {
  const u = String(url);
  if (u.includes("auth.linkhub.co.kr")) return Response.json({ session_token: "TOK", expiration: new Date(Date.now() + 3600e3).toISOString() });
  if (/\/EasyFin\/Bank\/J1\/State/.test(u)) return Response.json({ jobState: 3 });
  if (/\/EasyFin\/Bank\/J1\?/.test(u)) return Response.json({ list });
  if (/\/EasyFin\/Bank\/0004\//.test(u)) return Response.json({ jobID: "J1" });
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
const tx = (serial: string, amt: number, who: string) => ({ accIn: String(amt), trdate: "20261017", trtime: "143000", trserial: serial, remark1: who, balance: "500000" });

console.log("■ «같은 줄 막기 규칙»이 없는 표(SQL 15 ③ 안 됨)");
(store as any).__depRule = { noIdx: true };
list = [tx("1", 33000, "홍딜러"), tx("2", 44000, "김딜러")];
let r = await call("bankPull", [{ days: 3 }]);
check("규칙이 없어도 입금 2건 들어감 (예전엔 조용히 0건)", r.result?.got === 2 && store.check_deposit.length === 2, [r, store.check_deposit.length]);
check("팝빌 · 확인 대기 · 계좌 갈래", store.check_deposit.every((d: any) => d.src === "팝빌" && d.state === "확인 대기" && d.kind === "검사비" && d.bank_id === "b1"));
r = await call("bankPull", [{ days: 3 }]);
check("다시 가져와도 겹치지 않음", r.result?.got === 0 && store.check_deposit.length === 2, r);
list = [tx("2", 44000, "김딜러"), tx("3", 55000, "이딜러")];
r = await call("bankPull", [{ days: 3 }]);
check("새 것만 더함", r.result?.got === 1 && store.check_deposit.length === 3, r);

console.log("■ 넣지 못하면 알림");
(store as any).__depRule = { down: true };
list = [tx("4", 66000, "박딜러")];
r = await call("bankPull", [{ days: 3 }]);
check("넣지 못한 건은 bad 로 알려 줌(조용히 버리지 않음)", r.result?.got === 0 && (r.result?.bad || []).some((b: string) => /넣지 못했/.test(b)), r);
(store as any).__depRule = {};
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
