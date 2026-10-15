// 딜러앱 서버 d6 시험 — myBills: 청구서를 받은 휴대폰 번호 = 로그인한 딜러 번호인 것만 (가짜 수파베이스)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_dealer.json 서버/시험/딜러_청구서목록_시험.ts
import { store } from "./fake_supabase_dealer.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "fake"); Deno.env.set("SOLAPI_SECRET", "fake");
Deno.env.set("SMS_FROM", "0212345678");
const far = new Date(Date.now() + 864e5).toISOString(), past = new Date(Date.now() - 864e5).toISOString();
const A = "01020000001", B = "01020000002";
const SA = "a".repeat(48), SB = "b".repeat(48);
const snap = (o: any) => Object.assign({ month: "2026-09", unit: "dealer", name: "김딜러", cars: 3, amount: 330000, paid: 0, due: 330000,
  bank: "국민 123-456 브라더세차", rows: [] }, o);
Object.assign(store, {
  dealer_otp: [] as any[], dealer_users: [{ phone: A, active: true }, { phone: B, active: true }] as any[],
  dealer_sessions: [{ sid: SA, phone: A, expires_at: far, last_seen: new Date().toISOString() },
                    { sid: SB, phone: B, expires_at: far, last_seen: new Date().toISOString() }] as any[],
  dealer_agreements: [] as any[], dealer_done: [] as any[], wash_rate: [] as any[], wash_docs: [] as any[],
  wash_shops: [{ shop: "BT", name: "브라더세차", active: true, owner_phone: "01077778888" },
               { shop: "OT", name: "다른세차", active: true, owner_phone: "01066667777" }] as any[],
  wash_viewcode: [
    { code: "A".repeat(24), shop: "BT", kind: "bill", expires_at: far, to_phones: [A], data: snap({}), created_at: "2026-10-01" },
    { code: "B".repeat(24), shop: "OT", kind: "bill", expires_at: far, to_phones: [B], data: snap({ name: "김딜러" }), created_at: "2026-10-02" },  // 같은 이름 다른 딜러
    { code: "C".repeat(24), shop: "OT", kind: "bill", expires_at: far, to_phones: [A, B], data: snap({ amount: 110000, paid: 110000, due: 0 }), created_at: "2026-10-03" },
    { code: "D".repeat(24), shop: "BT", kind: "bill", expires_at: past, to_phones: [A], data: snap({}), created_at: "2026-09-01" },   // 기한 지남
    { code: "E".repeat(24), shop: "BT", kind: "car", expires_at: far, to_phones: [A], data: {}, created_at: "2026-10-04" },          // 청구서 아님
    { code: "F".repeat(24), shop: "BT", kind: "bill", expires_at: far, to_phones: [], data: snap({ name: "김딜러" }), created_at: "2026-10-05" },  // 받는 번호 없음(이름만 같음)
  ] as any[],
});
globalThis.fetch = (async () => Response.json({})) as typeof fetch;
console.error = () => {};
const H: ((r: Request) => Promise<Response>)[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(Deno.env.get("DEALER_SRC") || new URL("../3_딜러앱_서버_dealer-api_d6.ts", import.meta.url).href);
const [api] = H;
const call = async (fn: string, args: unknown[] = [], token = "") =>
  await (await api(new Request("http://x", { method: "POST", body: JSON.stringify({ token, fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
check("ping 이 d6 이상", /^d[6-9]$/.test((await call("ping")).result?.ver ?? ""));
check("약관 동의 전에는 못 봄", !!(await call("myBills", [], SA)).__err);
await call("agree", [false], SA); await call("agree", [false], SB);
const a = await call("myBills", [], SA);
const la = a.result?.list ?? [];
check("딜러 A: 자기 번호로 온 청구서 2장만 (기한 지남·차량 보기·번호 없는 것 빼고)", la.length === 2, la);
check("딜러 A 에게 딜러 B(같은 이름) 청구서가 안 섞임", !la.some((x: any) => x.url.endsWith("B".repeat(24))), la);
check("업체 이름 · 월 · 대수 · 금액 · 계좌 · 상태 · 주소", la.some((x: any) => x.shop === "브라더세차" && x.month === "2026-09" && x.cars === 3 &&
  x.amount === 330000 && x.bank.includes("국민") && x.state === "입금 전" && x.url === "https://app.cgg.co.kr/v.html?c=" + "A".repeat(24)), la);
check("다 낸 청구서는 「입금 확인됨」", la.some((x: any) => x.url.endsWith("C".repeat(24)) && x.state === "입금 확인됨"), la);
check("업체 대표 전화는 안 보냄", !JSON.stringify(a).includes("01077778888") && !JSON.stringify(a).includes("01066667777"));
const b = await call("myBills", [], SB);
check("딜러 B: 자기 것 2장 (B · C)", (b.result?.list ?? []).length === 2 && !(b.result.list).some((x: any) => x.url.endsWith("A".repeat(24))), b);
check("로그인 안 하면 못 봄", !!(await call("myBills", [], "")).__err);
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
