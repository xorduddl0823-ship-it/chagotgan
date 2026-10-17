// 체크 서버 v34 시험 — 거래처(딜러·매매상사) 넣기·지우기 (운영/06 N · 체크/기획/2026-10-17_v44_거래처_창구_약속.md)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v34_거래처_시험.ts
import { store } from "./fake_supabase_check.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v34.ts";
const day = new Date(Date.now() + 86400000).toISOString();
Object.assign(store, {
  check_office: [{ id: "o1", code: "TEST", name: "시험검사소", tel: "031-000-0000", sms_from: "0311112222" },
                 { id: "o2", code: "OTHER", name: "남의검사소" }],
  check_user: [{ id: "u1", office_id: "o1", phone: "01011110000", name: "대표", role: "owner", active: true, pw_hash: "x" },
               { id: "u2", office_id: "o1", phone: "01022220000", name: "직원", role: "staff", active: true, pw_hash: "x" }],
  check_deliv: [], check_deliv_dest: [], check_deliv_photo: [], check_deliv_conf: [],
  check_session: [{ sid: "chk_own", phone: "01011110000", office_id: "o1", role: "owner", expires_at: day },
                  { sid: "chk_stf", phone: "01022220000", office_id: "o1", role: "staff", expires_at: day }],
  check_log: [], cgg_access: [], wash_sessions: [], check_rate: [],
  check_company: [{ id: "c1", office_id: "o1", name: "가나상사", biz_no: "", ceo: "", tel: "" },
                  { id: "cx", office_id: "o2", name: "남의상사" }],
  check_dealer: [{ id: "d1", office_id: "o1", name: "홍딜러", tel: "010-3333-4444", tels: [{ tel: "010-5555-6666" }], company_id: "c1", active: true },
                 { id: "dx", office_id: "o2", name: "남의딜러", tel: "01099990000", active: true }],
  wash_hq: [{ id: 1, ata_cfg: {} }],
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
const D = (id: string) => store.check_dealer.find((d: any) => d.id === id);

console.log("① 매매상사");
let r = await call("companies");
check("companies: 이 검사소 것만 · dealerN", JSON.stringify(r.result) === JSON.stringify([{ id: "c1", name: "가나상사", biz_no: "", ceo: "", tel: "", dealerN: 1 }]), r);
check("직원도 목록은 봄", Array.isArray((await call("companies", [], "chk_stf")).result));
check("직원은 상사 못 넣음", !!(await call("companySave", [{ name: "새상사" }], "chk_stf")).__err);
r = await call("companySave", [{ name: "  다라상사 ", biz_no: "123-45-67890", ceo: "김대표", tel: "02-111-2222" }]);
const c2 = store.check_company.find((c: any) => c.name === "다라상사");
check("상사 넣기 → {id,name} · 사업자번호 숫자만", r.result?.name === "다라상사" && !!r.result?.id && c2?.biz_no === "1234567890" && c2?.office_id === "o1", [r, c2]);
check("같은 이름이면 그 상사를 돌려줌", (await call("companySave", [{ name: "다라상사" }])).result?.id === r.result?.id && store.check_company.filter((c: any) => c.name === "다라상사").length === 1);
check("사업자번호 10자리 아니면 거절", !!(await call("companySave", [{ name: "x", biz_no: "123" }])).__err);
check("남의 검사소 상사는 못 고침", !!(await call("companySave", [{ id: "cx", name: "바꿈" }])).__err && store.check_company.find((c: any) => c.id === "cx").name === "남의상사");

console.log("② 딜러 넣기·고치기 (dealerSave 보강)");
check("직원은 dealerSave 못 함", !!(await call("dealerSave", [{ name: "직원이넣음", tel: "01012345678" }], "chk_stf")).__err);
check("남의 검사소 상사로는 못 넣음", !!(await call("dealerSave", [{ name: "새딜러", tel: "01012345678", company_id: "cx" }])).__err);
check("휴대폰 모양이 아니면 거절", !!(await call("dealerSave", [{ name: "새딜러", tel: "02-123-4567" }])).__err);
check("남의 검사소 딜러를 청구처로 못 씀", !!(await call("dealerSave", [{ name: "새딜러", tel: "01012345678", bill_to_id: "dx" }])).__err);
r = await call("dealerSave", [{ name: "새딜러이름이아주아주아주아주길어요길어요더길어", tel: "010-1234-5678", company_id: r.result?.id }]);
const nd = store.check_dealer.find((d: any) => d.tel === "01012345678");
check("딜러 넣기: 이름 20자 · 번호 숫자만 · active · 이 검사소", !!nd && nd.name.length === 20 && nd.active === true && nd.office_id === "o1", nd);
check("감사 기록(번호 가림)", store.check_log.some((l: any) => l.what === "딜러 넣음" && l.detail?.tel === "010-****-5678"), store.check_log);
r = await call("dealerSave", [{ id: "d1", name: "홍딜러", tel: "010-3333-4444", company_id: "c1" }]);
check("고칠 때 추가 번호를 안 보내면 지우지 않음", (D("d1").tels ?? []).length === 1, D("d1"));
r = await call("dealerSave", [{ id: "dx", name: "뺏기", tel: "01011112222" }]);
check("남의 검사소 딜러는 못 고침", !!r.__err && D("dx").name === "남의딜러", r);

console.log("③ 딜러 지우기 (active=false)");
check("직원은 못 지움", !!(await call("dealerDel", [{ ids: ["d1"] }], "chk_stf")).__err);
check("남의 검사소 줄이 섞이면 전체 거절", !!(await call("dealerDel", [{ ids: ["d1", "dx"] }])).__err && D("d1").active === true && D("dx").active === true);
r = await call("dealerDel", [{ ids: ["d1"] }]);
check("지우기 → {n} · 줄은 남고 active=false", r.result?.n === 1 && D("d1")?.active === false, [r, D("d1")]);
check("dealers() 에서 빠짐", !((await call("dealers")).result ?? []).some((d: any) => d.id === "d1"));
check("지운 딜러 번호로는 도착 알림 안 감(dealerTelOk)", (await call("deliv_arrive", ["chk_own", { dest: "x", dealer: "홍딜러", tel: "010-3333-4444", plate: "12가3456", force: true }]),
  (store.check_deliv ?? []).at(-1)?.err === "등록된 딜러 번호가 아님"), (store.check_deliv ?? []).at(-1));

console.log("④ 상사 지우기");
const c2id = store.check_company.find((c: any) => c.name === "다라상사").id;
check("남의 검사소 상사가 섞이면 전체 거절", !!(await call("companyDel", [{ ids: ["c1", "cx"] }])).__err && store.check_company.length === 3);
r = await call("companyDel", [{ ids: ["c1", c2id] }]);
check("쓰는 딜러가 있는 상사(다라)는 kept · 쉬는 딜러만 남은 상사(가나)는 지움",
  r.result?.n === 1 && r.result?.kept?.length === 1 && r.result.kept[0].id === c2id && r.result.kept[0].dealerN === 1 &&
  !store.check_company.some((c: any) => c.id === "c1") && D("d1").company_id === null, [r, D("d1")]);
check("직원은 못 지움", !!(await call("companyDel", [{ ids: [c2id] }], "chk_stf")).__err);
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
