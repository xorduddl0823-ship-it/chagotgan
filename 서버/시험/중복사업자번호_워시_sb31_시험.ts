// 워시 sb31 시험(sb29 시험 + 관리 목록 가림) — 긴급(중복 사업자번호): 남의 번호는 어디로도 못 들어감 · 업체 A/B 자료가 서로 안 보임 · 동시에 넣어도 한 곳만
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/중복사업자번호_워시_sb31_시험.ts
// WASH_SRC 에 sb27 을 넣으면 «설정에 남의 번호 남음 · 관리에서 검사 없음 · 안내 글» 시험이 실패해야 합니다(문제 재현).
import { knobs, rpcLog, store } from "./fake_supabase_wash.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("OPEN_SIGNUP", "1");
const far = new Date(Date.now() + 864e5).toISOString();
const A = "a".repeat(48), B = "b".repeat(48), ADM = "c".repeat(48), C1 = "d".repeat(48), C2 = "e".repeat(48);
const NUM = "8761202709";   // 시험용 번호(실제 업체 자료 아님)
Object.assign(store, {
  wash_hq: [{ id: 1, biz_no: "1112233333" }], biz_share_req: [], biz_share_ok: [], hq_audit: [], cgg_access: [], wash_viewcode: [], wash_otp: [], cgg_sendlog: [], wash_invites: [],
  wash_shops: [
    { shop: "SHA1", name: "시험업체A", active: true, plan: "pro", paid_until: far.slice(0, 10), owner_phone: "01000000001", biz_no: NUM, ceo: "가대표", biz_ok_at: far },
    { shop: "SHB1", name: "시험업체B", active: true, plan: "pro", paid_until: far.slice(0, 10), owner_phone: "01000000002", biz_no: null },
    { shop: "SHC1", name: "동시1", active: true, plan: "pro", paid_until: far.slice(0, 10), owner_phone: "01000000003", biz_no: null },
    { shop: "SHC2", name: "동시2", active: true, plan: "pro", paid_until: far.slice(0, 10), owner_phone: "01000000004", biz_no: null },
  ],
  check_office: [{ id: "o1", code: "CHK1", biz_no: "2223344444", popbill_corp: "" }],
  wash_users: [
    { phone: "01000000001", shop: "SHA1", role: "owner", active: true }, { phone: "01000000002", shop: "SHB1", role: "owner", active: true },
    { phone: "01000000003", shop: "SHC1", role: "owner", active: true }, { phone: "01000000004", shop: "SHC2", role: "owner", active: true },
  ],
  wash_sessions: [
    { sid: A, phone: "01000000001", shop: "SHA1", role: "owner", expires_at: far },
    { sid: B, phone: "01000000002", shop: "SHB1", role: "owner", expires_at: far },
    { sid: C1, phone: "01000000003", shop: "SHC1", role: "owner", expires_at: far },
    { sid: C2, phone: "01000000004", shop: "SHC2", role: "owner", expires_at: far },
    { sid: ADM, phone: "01099999999", shop: "ADMIN", role: "admin", expires_at: far },
  ],
  wash_docs: [
    { shop: "SHA1", demo: false, col: "intakes", id: "ia1", data: { plate: "11가1111", phone: "01077777777", memo: "A비밀" } },
    { shop: "SHA1", demo: false, col: "settings", id: "config", data: { supplier: { bizName: "시험업체A", bizNo: NUM, ceo: "가대표" } } },
    { shop: "SHB1", demo: false, col: "intakes", id: "ib1", data: { plate: "22가2222" } },
  ],
});
globalThis.fetch = (async () => Response.json({})) as typeof fetch;
console.error = () => {}; console.warn = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
const SRC = Deno.env.get("WASH_SRC") ?? new URL("../1_차곳간워시_서버_wash-api_sb31.ts", import.meta.url).href;
await import(SRC);
const call = async (fn: string, args: unknown[], token = "", shop = "") =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop, token, fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const shopRow = (s: string) => store.wash_shops.find((x: any) => x.shop === s);
const lastWrite = () => [...rpcLog].reverse().find((x) => x.fn === "wash_write")?.args;
const MSG = /이미 등록된 사업자번호예요/;

console.log("① 남의 번호 넣기 — 서버 업체표");
let r = await call("shopBiz", [{ bizNo: "876-12-02709", ceo: "가대표" }], B, "SHB1");
check("B가 A 번호로 저장 → 거절 · 확정 안내 글", !!r.__err && MSG.test(r.__err) && !shopRow("SHB1").biz_no, r);
r = await call("shopBiz", [{ bizNo: "1112233333" }], B, "SHB1");
check("본사 번호도 거절", !!r.__err && !shopRow("SHB1").biz_no, r);
r = await call("shopBiz", [{ bizNo: "2223344444" }], B, "SHB1");
check("체크 검사소 번호도 거절", !!r.__err && !shopRow("SHB1").biz_no, r);

check("같은 제품·같은 키(A 번호 + 0000)는 요청도 안 남김 · 다른 제품(체크) 번호는 승인 요청 1건", store.biz_share_req.length === 1 &&
  store.biz_share_req[0]?.biz_no === "2223344444" && !store.biz_share_req.some((x: any) => x.biz_no === NUM), store.biz_share_req);
store.biz_share_req.length = 0;

console.log("①-2 같은 사업자의 두 번째 가게(종사업장 0002) — 본사 승인 때만");
r = await call("shopBiz", [{ bizNo: NUM, bizSub: "2" }], B, "SHB1");
check("승인 전: 거절 + «확인 요청을 남겼어요»", !!r.__err && MSG.test(r.__err) && /확인 요청을 남겼어요/.test(r.__err) && !shopRow("SHB1").biz_no, r);
check("승인 요청 1건(워시 · SHB1 · 0002 · 대기)", store.biz_share_req.length === 1 && store.biz_share_req[0]?.code === "SHB1" && store.biz_share_req[0]?.biz_sub === "0002" && store.biz_share_req[0]?.state === "wait", store.biz_share_req);
await call("shopBiz", [{ bizNo: NUM, bizSub: "0002" }], B, "SHB1");
check("다시 눌러도 요청은 하나", store.biz_share_req.length === 1, store.biz_share_req);
r = await call("shopBiz", [{ bizNo: "1112233333" }], B, "SHB1");
check("본사 번호는 요청도 안 남김", store.biz_share_req.length === 1 && !/확인 요청/.test(r.__err || ""), r);
r = await call("hqBizShareDecide", [1, true], B, "SHB1");
check("업체 열쇠로는 승인 못 함", !!r.__err && store.biz_share_req[0]?.state === "wait", r);
r = await call("hqBizShareList", ["wait"], ADM, "ADMIN");
check("관리 목록: 대기 1건 · 지금 그 번호를 쓰는 곳(A) 함께 보임", r.result?.list?.length === 1 && r.result.list[0].state === "대기" && r.result.list[0].usedBy.some((x: string) => /SHA1/.test(x)), r.result);
check("(sb31) 관리 목록 사업자번호는 가림(앞 3 · 끝 2) · 요청한 사람은 뒤 4자리 · 원래 번호가 답에 없음",
  r.result?.list?.[0]?.bizNo === NUM.slice(0, 3) + "-**-***" + NUM.slice(-2) && /^\*{4}\d{4}$/.test(r.result.list[0].who) && !JSON.stringify(r.result).includes(NUM), r.result?.list?.[0]);
r = await call("hqBizShareDecide", [1, true, "같은 사업자 2호점 확인"], ADM, "ADMIN");
check("본사 승인 → 그때 B에 번호 + 종사업장 0002 · 확인됨", r.result?.ok && shopRow("SHB1").biz_no === NUM && shopRow("SHB1").biz_sub === "0002" && !!shopRow("SHB1").biz_ok_at, [r, shopRow("SHB1")]);
check("승인 목록·요청 상태·hq_audit(시도·끝) 기록", store.biz_share_ok.length === 1 && store.biz_share_req[0]?.state === "ok" &&
  store.hq_audit.filter((x: any) => x.action === "bizShareOk").map((x: any) => x.result).join() === "try,ok" && !JSON.stringify(store.hq_audit).includes(NUM), store.hq_audit);
r = await call("hqBizShareDecide", [1, true], ADM, "ADMIN");
check("이미 처리한 요청은 다시 못 함", !!r.__err, r);
shopRow("SHB1").biz_no = null; shopRow("SHB1").biz_sub = null; shopRow("SHB1").biz_ok_at = null;
store.biz_share_ok.length = 0;
await call("shopBiz", [{ bizNo: NUM, bizSub: "0003" }], B, "SHB1");
r = await call("hqBizShareDecide", [2, false, "다른 사업자"], ADM, "ADMIN");
check("거절하면 번호 안 들어감 · 상태 거절 · 기록", r.result?.state === "거절" && !shopRow("SHB1").biz_no && store.biz_share_req[1]?.state === "no" && store.hq_audit.some((x: any) => x.action === "bizShareNo" && x.result === "ok"), [r, store.biz_share_req]);

console.log("② 남의 번호 넣기 — 화면 설정(«우리 사업장»)");
rpcLog.length = 0;
r = await call("apiSet", ["settings", "config", JSON.stringify({ supplier: { bizName: "브라더 세차 광백", bizNo: "876-12-02709", ceo: "가대표" }, x: 1 })], B, "SHB1");
let w = lastWrite()?.p_rows?.[0]?.data ?? {};
check("B 설정 저장은 되지만 남의 사업자번호는 지워서 저장 (화면에 안 남음)", r.result?.ok === true && w.supplier?.bizNo === "" && w.x === 1, w);
rpcLog.length = 0;
await call("apiSetMany", [JSON.stringify([{ col: "settings", id: "config", data: { supplier: { bizNo: "9998887777", ceo: "가대표" } } }])], A, "SHA1");
w = lastWrite()?.p_rows?.[0]?.data ?? {};
check("A 설정에 다른 번호를 보내도 서버에 등록된 A 번호로 맞춤", w.supplier?.bizNo === NUM, w);
rpcLog.length = 0;
await call("apiSet", ["settings", "config", JSON.stringify({ supplier: { bizNo: NUM } }), true], B, "SHB1");
w = lastWrite();
check("예시 칸(demo)은 건드리지 않음", w?.p_demo === true && w?.p_rows?.[0]?.data?.supplier?.bizNo === NUM, w);
rpcLog.length = 0;
await call("apiSet", ["settings", "config", JSON.stringify({ supplier: { bizNo: "5556677777" } })], B, "SHB1");
check("아무도 안 쓰는 번호는 그대로 저장", lastWrite()?.p_rows?.[0]?.data?.supplier?.bizNo === "5556677777");

console.log("③ 관리(본사)에서 넣기");
r = await call("hqShopSave", ["SHB1", { bizNo: NUM }], ADM, "ADMIN");
check("관리에서도 다른 곳이 쓰는 번호는 거절 · «승인 요청»으로 안내 (예전엔 검사 없음)", !!r.__err && /다른 곳이 쓰고 있어요/.test(r.__err) && !shopRow("SHB1").biz_no, r);
r = await call("hqShopSave", ["SHB1", { bizNo: "5556677777" }], ADM, "ADMIN");
check("관리에서 안 쓰는 번호는 저장", !r.__err && shopRow("SHB1").biz_no === "5556677777", r);
const au = store.hq_audit.filter((x: any) => x.action === "shopBizSet");
check("관리의 번호 바꾸기는 감사 기록(시도·끝) · 번호는 가림", au.map((x: any) => x.result).join() === "try,ok" && au[0]?.detail?.code === "SHB1" && !JSON.stringify(au).includes("5556677777"), au);
shopRow("SHB1").biz_no = null;

console.log("④ 같은 번호를 두 곳이 동시에");
knobs.bizUniq = true;      // SQL 24 문지기·유일 색인 흉내
const [x1, x2] = await Promise.all([
  call("shopBiz", [{ bizNo: "3334455555" }], C1, "SHC1"),
  call("shopBiz", [{ bizNo: "333-44-55555" }], C2, "SHC2")]);
const okN = [x1, x2].filter((x) => x.result?.ok).length;
const has = ["SHC1", "SHC2"].filter((s) => String(shopRow(s).biz_no || "").replace(/\D/g, "") === "3334455555").length;
check("동시에 넣어도 한 곳만 들어감 · 다른 곳은 같은 안내", okN === 1 && has === 1 && [x1, x2].some((x) => MSG.test(x.__err || "")), [x1, x2]);
knobs.bizUniq = false;

console.log("⑤ 업체 A/B 자료가 서로 안 보임 (남의 업체 ID 넣기)");
r = await call("apiLoad", [false], B, "SHA1");
check("B 열쇠로 A 업체 자료 열기 → 거절", /다른 업체의 자료는 볼 수 없습니다/.test(r.__err || ""), r);
r = await call("apiSet", ["intakes", "ia1", JSON.stringify({ plate: "바꿈" })], B, "SHA1");
check("B 열쇠로 A 업체 차량 고치기 → 거절 · A 자료 그대로", /다른 업체/.test(r.__err || "") && store.wash_docs.find((d: any) => d.id === "ia1").data.plate === "11가1111", r);
r = await call("apiLoad", [false], B, "SHB1");
check("B 자기 자료에는 A 차량·설정이 없음", !!r.result && !JSON.stringify(r.result).includes("ia1") && !JSON.stringify(r.result).includes("A비밀"), r.result);
r = await call("viewLink", ["ia1"], B, "SHB1");
check("B가 A 차량 id 로 보기 주소 만들기 → 거절", !!r.__err && !store.wash_viewcode.length, r);
r = await call("shopBiz", [{ ceo: "바꿈" }], B, "SHA1");
check("B 열쇠로 A 사업장 정보 고치기 → 거절", /다른 업체/.test(r.__err || "") && shopRow("SHA1").ceo === "가대표", r);
r = await call("hqShopSave", ["SHA1", { ceo: "바꿈" }], B, "SHB1");
check("업체 열쇠로 관리 기능 → 거절", !!r.__err && shopRow("SHA1").ceo === "가대표", r);
r = await call("apiLoad", [false], "", "SHA1");
check("열쇠 없이 A 자료 → 거절", !!r.__err, r);

console.log("⑥ 가입 — 사업자번호로 기존 업체에 붙지 않음");
store.wash_otp.push({ phone: "01055550000", verified: true, expires_at: far });
r = await call("signup", ["01055550000", "시험업체A", "wash", "pw123456", "새대표"]);
const ns = String(r.result?.shop || "");
check("같은 상호로 가입해도 새 업체가 따로 생김 (기존 A에 연결 안 됨)", !!ns && ns !== "SHA1" && store.wash_users.filter((u: any) => u.phone === "01055550000").length === 1 &&
  store.wash_users.find((u: any) => u.phone === "01055550000").shop === ns, r);
check("새 업체엔 사업자번호가 없음 (번호로 권한 안 생김)", !shopRow(ns)?.biz_no, shopRow(ns));
check("판 sb31", JSON.stringify(await call("apiVer", [], A, "SHA1")).includes("sb31"));

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail || pass === 0) Deno.exit(1);   // 하나도 안 돌았으면 실패
