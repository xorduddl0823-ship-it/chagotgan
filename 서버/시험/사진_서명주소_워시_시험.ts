// 워시 서버 sb4 시험 — 사진 서명 주소 (shotLinks 창구 · 딜러 «차량 보기») · 가짜 수파베이스
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/사진_서명주소_워시_시험.ts
import { signLog, store } from "./fake_supabase_wash.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
const far = new Date(Date.now() + 864e5).toISOString(), SID = "a".repeat(48);
Object.assign(store, {
  wash_shops: [{ shop: "BT", name: "브라더세차", active: true, plan: "pro", paid_until: far, trial_until: far }],
  wash_sessions: [{ sid: SID, phone: "01011110000", shop: "BT", role: "staff", expires_at: far }],
  wash_viewcode: [{ code: "ABCDEF0123456789ABCDEF01", shop: "BT", rec_id: "i1", kind: "car", expires_at: far }],
  wash_docs: [{ shop: "BT", demo: false, col: "intakes", id: "i1", data: {
    plate: "12가3456", photoId: "sb/BT/202610/in.jpg", outPhotoId: "sb/OTHER/202610/x.jpg",
    memoPhotos: [{ id: "sb/BT/202610/m.jpg" }], addWorks: [{ id: "w1", text: "광택", photoIds: ["sb/BT/202610/w.jpg", "sb/BT/../X/y.jpg"] }] } }],
  cgg_access: [], wash_hq: [{ id: 1 }],
});
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(Deno.env.get("WASH_SRC") ?? "../1_차곳간워시_서버_wash-api_sb4.ts");
const call = async (fn: string, args: unknown[], token = "", shop = "") =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop, token, fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
console.log("① 화면용 shotLinks (로그인한 업체)");
const ids = ["sb/BT/202610/in.jpg", "sb/OTHER/202610/x.jpg", "sb/BT/../X/y.jpg", "data:abc", "OLD_DRIVE_ID"];
const sl = await call("shotLinks", [ids], SID, "BT");
const links = sl.result?.links ?? {};
check("우리 업체 사진은 서명 주소를 받음", String(links["sb/BT/202610/in.jpg"] ?? "").startsWith("https://fake/sign/wash/BT/"), sl);
check("남의 업체 사진·.. 경로·옛 드라이브는 주소를 안 줌", Object.keys(links).length === 1, links);
check("기본 유지 시간 6시간", sl.result?.ttl === 21600 && signLog.at(-1)?.ttl === 21600);
check("로그인 없이는 거절", !!(await call("shotLinks", [ids], "", "BT")).__err);
check("300장 넘게 보내도 300장까지만", (await call("shotLinks", [Array.from({ length: 400 }, (_, i) => `sb/BT/1/${i}.jpg`)], SID, "BT"), signLog.at(-1)?.paths.length === 300));
console.log("② 딜러 «차량 보기» (로그인 없음)");
const v = await call("viewCar", ["ABCDEF0123456789ABCDEF01"]);
const all = JSON.stringify(v);
check("차량 보기가 열림", v.result?.ok === true, v);
check("공개 주소가 하나도 없음", !all.includes("/object/public/"));
check("입고·맡길 때 사진은 서명 주소 (남의 업체 사진은 뺌)", (v.result?.shots ?? []).length === 2 && v.result.shots.every((s: any) => s.url.startsWith("https://fake/sign/")), v.result?.shots);
check("추가 작업 사진도 서명 주소 1장 (.. 경로는 뺌)", (v.result?.adds?.[0]?.shots ?? []).length === 1);
check("차량 보기 서명 주소는 1시간", signLog.at(-1)?.ttl === 3600);
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
