// 딜러앱 서버 d9 시험 — 긴급 검증(업체·사람 격리): 딜러 A/B 가 서로의 차 · 청구서 · 사진을 보거나 고칠 수 없음 (가짜 자료)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_dealer.json 서버/시험/업체격리_딜러_d9_시험.ts
import { store } from "./fake_supabase_dealer.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
const far = new Date(Date.now() + 864e5).toISOString();
const PA = "01020000001", PB = "01020000002", SA = "a".repeat(48), SB = "b".repeat(48);
const doc = (shop: string, id: string, d: any) => ({ shop, demo: false, col: "intakes", id, data: d });
const bill = (name: string) => ({ month: "2026-09", unit: "dealer", name, cars: 1, base: 100000, amount: 110000, paid: 0, due: 110000, rows: [{ plate: "x", total: 100000 }] });
Object.assign(store, {
  dealer_otp: [], dealer_users: [{ phone: PA, active: true }, { phone: PB, active: true }],
  dealer_sessions: [{ sid: SA, phone: PA, expires_at: far, last_seen: new Date().toISOString() }, { sid: SB, phone: PB, expires_at: far, last_seen: new Date().toISOString() }],
  dealer_agreements: [], dealer_done: [], wash_rate: [],
  wash_shops: [{ shop: "SHA1", name: "시험업체A", active: true }, { shop: "SHB1", name: "시험업체B", active: true }],
  wash_docs: [
    doc("SHA1", "ca1", { plate: "11가1111", phone: PA, dealer: "A딜러", memo: "A비밀", photoId: "sb/SHA1/ca1.jpg", outPhotoId: "sb/SHB1/남의폴더.jpg", createdAt: "2026-10-10T01:00:00Z" }),
    doc("SHB1", "cb1", { plate: "22나2222", phone: PB, dealer: "B딜러", memo: "B비밀", photoId: "sb/SHB1/cb1.jpg", createdAt: "2026-10-10T01:00:00Z" }),
  ],
  wash_viewcode: [
    { code: "A".repeat(24), shop: "SHA1", kind: "bill", expires_at: far, to_phones: [PA], data: bill("A딜러"), created_at: "2026-10-03" },
    { code: "B".repeat(24), shop: "SHB1", kind: "bill", expires_at: far, to_phones: [PB], data: bill("B딜러"), created_at: "2026-10-03" },
  ],
});
const signed: string[] = [];
globalThis.fetch = (async () => Response.json({})) as typeof fetch;
console.error = () => {};
const H: ((r: Request) => Promise<Response>)[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(Deno.env.get("DEALER_SRC") || new URL("../3_딜러앱_서버_dealer-api_d9.ts", import.meta.url).href);
const [api] = H;
const call = async (fn: string, args: unknown[] = [], token = "") =>
  await (await api(new Request("http://x", { method: "POST", body: JSON.stringify({ token, fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
await call("agree", [{ terms: true, privacy: true, age: true }], SA);
await call("agree", [{ terms: true, privacy: true, age: true }], SB);
const agreed = (store.dealer_agreements as any[]).length;

console.log("■ 대조군 — A 는 자기 것이 보임 (빈 결과로 통과시키지 않음)");
let r = await call("cars", [], SA);
check("동의 기록 2건(시험 준비 확인)", agreed >= 2, store.dealer_agreements);
check("A 차 목록 = 정확히 A 차 1대(11가1111)", Array.isArray(r.result?.list) && r.result.list.length === 1 && r.result.list[0].plate === "11가1111", r);
r = await call("myBills", [], SA);
check("A 청구서 = 정확히 1장(시험업체A)", Array.isArray(r.result?.list) && r.result.list.length === 1 && r.result.list[0].shop === "시험업체A", r);
r = await call("car", ["SHA1", "ca1"], SA);
check("A 차 상세가 열림", r.result?.car?.plate === "11가1111", r);
const shots: string[] = (r.result?.shots ?? []).map((x: any) => String(x.url));
check("사진은 그 업체 폴더 것만(남의 폴더 경로가 섞여 있어도 서명 안 함)", shots.length === 1 && shots[0].includes("SHA1/ca1.jpg") && !shots.some((u) => u.includes("SHB1")), shots);

console.log("■ A 가 B 것을 — 보기 · 고치기");
r = await call("cars", [], SA);
check("A 목록에 B 차 없음", !JSON.stringify(r).includes("22나2222") && !JSON.stringify(r).includes("B비밀"), r);
r = await call("myBills", [], SA);
check("A 청구서에 B 청구서 없음", !JSON.stringify(r).includes("B".repeat(24)) && !JSON.stringify(r).includes("시험업체B"), r);
r = await call("car", ["SHB1", "cb1"], SA);
check("A 가 B 차 id 로 상세 → 거절(찾지 못함) · 내용 없음", /찾지 못했습니다/.test(r.__err || "") && !r.result && !JSON.stringify(r).includes("B비밀"), r);
const doneBefore = JSON.stringify(store.dealer_done);
r = await call("finish", ["SHB1", "cb1"], SA);
check("A 가 B 차 «완료» 표시 → 거절 · 기록 그대로", /찾지 못했습니다/.test(r.__err || "") && JSON.stringify(store.dealer_done) === doneBefore, r);
r = await call("car", ["SHA1", "cb1"], SA);
check("업체 코드를 바꿔 넣어도 거절", /찾지 못했습니다/.test(r.__err || ""), r);

console.log("■ 열쇠");
r = await call("cars", [], "");
check("열쇠 없이 → 거절(다시 로그인)", r.__login === true && !r.result, r);
r = await call("cars", [], "x".repeat(48));
check("없는 열쇠 → 거절", r.__login === true && !r.result, r);

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail || pass === 0) Deno.exit(1);
