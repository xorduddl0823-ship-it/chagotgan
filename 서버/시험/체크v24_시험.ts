// 체크 서버 v24 시험 — 가온 고정값 정리 (가짜 수파베이스)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v24_시험.ts
import { store } from "./fake_supabase_check.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v24.ts";

const far = new Date(Date.now() + 864e5).toISOString();
Object.assign(store, {
  check_office: [{ id: "o1", code: "GAON", name: "가온진단평가" }, { id: "o2", code: "SOMCAR", name: "솜카검사소" }],
  check_user: [
    { id: "u1", office_id: "o1", phone: "01011110000", name: "가온직원", role: "owner", active: true },
    { id: "u2", office_id: "o2", phone: "01022220000", name: "솜카직원", role: "owner", active: true },
  ],
  check_session: [
    { sid: "chk_gaon", phone: "01011110000", office_id: "o1", role: "owner", expires_at: far },
    { sid: "chk_somcar", phone: "01022220000", office_id: "o2", role: "owner", expires_at: far },
  ],
  wash_sessions: [{ sid: "WADMIN", phone: "01000000000", shop: "ADMIN", role: "admin", expires_at: far }],
  cgg_access: [], check_company: [],
});

const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(SRC);
const chk = H[0];
async function call(fn: string, args: unknown[] = [], token = "", shop = "") {
  const r = await chk(new Request("http://x", { method: "POST", body: JSON.stringify({ shop, token, fn, args }) }));
  return await r.json();
}
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}

console.log("① 관리 계정이 검사소를 안 고르면");
const a1 = await call("me", [], "WADMIN", "");
check("가온으로 열지 않고 「검사소를 골라 주세요」", /검사소를 골라/.test(a1.__err ?? "") && !a1.result, a1);
const a2 = await call("me", [], "WADMIN", "SOMCAR");
check("검사소 코드를 보내면 그 검사소로 열림", a2.result?.office?.code === "SOMCAR", a2);

console.log("④ 예전 자료 가져오기는 가온만");
const rows = [{ 상사명: "시험상사", 사업자등록번호: "1234567890" }];
const i1 = await call("importLegacy", ["company", rows], "chk_somcar");
check("다른 검사소(솜카)는 서버가 거절", /가온진단평가 검사소만/.test(i1.__err ?? ""), i1);
check("거절될 때 자료가 하나도 안 들어감", !store.check_company.some((r: any) => r.office_id === "o2"));
const i2 = await call("importLegacy", ["company", rows], "chk_gaon");
check("가온 검사소는 그대로 가져오기 됨", !i2.__err, i2);

console.log("② 사진 읽기");
const src = await Deno.readTextFile(new URL(SRC, import.meta.url));
check("사진 읽기 창구 4개가 가온 대신 aiShop(검사소 없으면 거절)을 씀",
  (src.match(/aiJson\(aiShop\(c\)/g) ?? []).length === 4 && !/\|\| "GAON"/.test(src));
const sp = await call("me", [], "chk_somcar");
check("솜카 직원은 솜카로 열림 (가온 이름 안 보임)", sp.result?.office?.code === "SOMCAR" && !JSON.stringify(sp).includes("가온"), sp);

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
