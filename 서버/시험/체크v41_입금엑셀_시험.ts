// 체크 서버 v41 시험 — TEST «은행 거래내역 엑셀 가져오기» 실패 고침: 겹침 규칙 없이 넣기 · 계좌·잔액 채움 · 까닭 갈래 쉬운 말
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v41_입금엑셀_시험.ts
import { store } from "./fake_supabase_check.ts";
Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v41.ts";
const day = new Date(Date.now() + 86400000).toISOString();
const kst = (h: number) => new Date(Date.now() - h * 3600e3 + 9 * 3600e3).toISOString().slice(0, 19) + "+09:00";
Object.assign(store, {
  __sql13: true,
  check_office: [{ id: "o1", code: "TEST", name: "시험검사소" }, { id: "o2", code: "OTHER", name: "남" }],
  check_user: [{ id: "u1", office_id: "o1", phone: "01011110000", name: "대표", role: "owner", active: true, pw_hash: "x" }],
  check_session: [{ sid: "chk_own", phone: "01011110000", office_id: "o1", role: "owner", expires_at: day }],
  check_log: [], cgg_access: [], wash_sessions: [], check_rate: [], cgg_sendlog: [],
  check_bank: [{ id: "bx", office_id: "o2", acct_no: "1", active: true }],
  check_dealer: [], check_invoice: [], check_deposit: [],
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
const plain = (m: unknown) => typeof m === "string" && !/[A-Za-z]{3,}/.test(m) && !/\d{8,}/.test(m);
const rows3 = [{ tx_at: kst(5), sender: "김손님", amount: 11000 }, { tx_at: kst(4), sender: "이손님", amount: 22000, balance: 500000 }, { tx_at: kst(3), sender: "박손님", amount: 33000 }];
const xl = () => store.check_deposit.filter((d: any) => d.src === "엑셀" && d.office_id === "o1");

console.log("① 까닭 갈래 (화면에 쉬운 말 · 영어·번호 없음)");
store.__depRule = { notNull: ["bank_id"] };
let r = await call("depositImport", [{ rows: rows3 }]);
check("계좌 없음 + 계좌 칸 꼭 채움 → «빈 칸 제한» «계좌»", /빈 칸 제한/.test(r.__err) && /계좌/.test(r.__err) && plain(r.__err) && xl().length === 0, r);
store.__depRule = { check: "src" };
r = await call("depositImport", [{ rows: rows3 }]);
check("가져온 곳 값 제한 → «값 제한» «가져온 곳»", /값 제한/.test(r.__err) && /가져온 곳/.test(r.__err) && plain(r.__err), r);
store.__depRule = { down: true };
r = await call("depositImport", [{ rows: rows3 }]);
check("그 밖의 실패 → «연결»", /까닭: 연결/.test(r.__err) && plain(r.__err), r);
r = await call("depositImport", [{ rows: rows3, bankId: "bx" }]);
check("남의 검사소 계좌를 고르면 거절", /이 검사소 계좌가 아니/.test(r.__err ?? ""), r);

console.log("② 고친 뒤 넣기");
store.__depRule = { notNull: ["bank_id"] };
store.check_bank.push({ id: "b1", office_id: "o1", acct_no: "2", active: true });
r = await call("depositImport", [{ rows: rows3 }]);
check("쓰는 계좌가 하나면 그 계좌로 채워 넣음 → got 3", r.result?.got === 3 && xl().every((d: any) => d.bank_id === "b1"), [r, xl()]);
check("잔액: 보냈으면 그대로 · 없으면 0", xl().find((d: any) => d.sender === "이손님")?.balance === 500000 && xl().find((d: any) => d.sender === "김손님")?.balance === 0, xl());
check("엑셀 줄 모양(갈래·상태·가져온 곳) 그대로", xl().every((d: any) => d.kind === "미분류" && d.state === "확인 대기" && /^x\|/.test(d.uniq_key)));
r = await call("depositImport", [{ rows: rows3 }]);
check("같은 엑셀 또 넣으면 dup 3", r.result?.got === 0 && r.result?.dup === 3, r);
store.__depRule = { blind: true };
r = await call("depositImport", [{ rows: [...rows3, { tx_at: kst(2), sender: "최손님", amount: 44000 }] }]);
check("그새 같은 줄이 들어와 있어도(미리 거르기 놓침) 한 줄씩 다시 → got 1 · dup 3", r.result?.got === 1 && r.result?.dup === 3 && xl().length === 4, [r, xl().length]);
store.__depRule = {};
store.check_bank.push({ id: "b2", office_id: "o1", acct_no: "3", active: true });
r = await call("depositImport", [{ rows: [{ tx_at: kst(1), sender: "정손님", amount: 5000 }], bankId: "b2" }]);
check("계좌가 둘이면 고른 계좌로", r.result?.got === 1 && xl().find((d: any) => d.sender === "정손님")?.bank_id === "b2", r);
r = await call("depositImport", [{ rows: [{ tx_at: kst(1), sender: "한손님", amount: 6000 }] }]);
check("계좌가 둘인데 안 고르면 비워 둠(제한 없으면 들어감)", r.result?.got === 1 && xl().find((d: any) => d.sender === "한손님")?.bank_id === null, r);
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
