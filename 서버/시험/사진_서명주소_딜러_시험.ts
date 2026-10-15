// 딜러 서버 d4 시험 — 차 사진을 서명 주소로 (가짜 수파베이스)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_dealer.json 서버/시험/사진_서명주소_딜러_시험.ts
import { rpcHooks, signLog, store } from "./fake_supabase_dealer.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
const P = "01012345678", far = new Date(Date.now() + 864e5).toISOString();
Object.assign(store, {
  dealer_users: [{ phone: P, name: "딜러", active: true }],
  dealer_sessions: [{ sid: "S".repeat(40), phone: P, expires_at: far, last_seen: new Date().toISOString() }],
  dealer_agreements: [{ phone: P, terms_ver: "d1-2026-10", privacy_ver: "d1-2026-10", what: "agree", agreed_at: new Date().toISOString() }],
  dealer_done: [], wash_shops: [], wash_rate: [],
});
rpcHooks["dealer_cars"] = () => ({ data: [{ shop: "BT", id: "r1", shop_name: "브라더", data: {
  plate: "12가3456", photoId: "sb/BT/202610/a.jpg", memoPhotos: ["sb/OTHER/202610/x.jpg", { id: "sb/BT/202610/b.jpg" }],
  outPhotoId: "sb/BT/../ZZ/c.jpg", createdAt: "2026-10-15" } }], error: null });
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
const src = Deno.env.get("DEALER_SRC") || new URL("../3_딜러앱_서버_dealer-api_d4.ts", import.meta.url).href;
await import(src);
const r = await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ token: "S".repeat(40), fn: "car", args: ["BT", "r1"] }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const urls: string[] = (r.result?.shots ?? []).map((s: any) => s.url);
check("차 상세가 열림", !!r.result?.car, r);
check("사진은 공개 주소가 아니라 서명 주소", urls.length > 0 && urls.every((u) => u.startsWith("https://fake/sign/")) && !JSON.stringify(r).includes("/object/public/"), urls);
check("그 업체(BT) 폴더 사진 2장만 (남의 업체·.. 경로는 뺌)", urls.length === 2, urls);
check("서명 주소는 1시간", signLog.at(-1)?.ttl === 3600);
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
