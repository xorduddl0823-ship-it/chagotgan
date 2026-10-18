// 체크 서버 v49 시험 — 상사명부·딜러명부 한꺼번에 넣기(partnerImport)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v49_거래처한꺼번에_시험.ts
import { store } from "./fake_supabase_check.ts";
Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v49.ts";
const day = new Date(Date.now() + 86400000).toISOString();
Object.assign(store, {
  check_office: [{ id: "o1", code: "GAON", name: "가온" }, { id: "o2", code: "OTHER", name: "남" }],
  check_user: [{ id: "u1", office_id: "o1", phone: "01011110000", name: "대표", role: "owner", active: true, pw_hash: "x" },
               { id: "u2", office_id: "o1", phone: "01022220000", name: "직원", role: "staff", active: true, pw_hash: "x" }],
  check_session: [{ sid: "chk_own", phone: "01011110000", office_id: "o1", role: "owner", expires_at: day },
                  { sid: "chk_stf", phone: "01022220000", office_id: "o1", role: "staff", expires_at: day }],
  check_log: [], cgg_access: [], wash_sessions: [], check_rate: [],
  check_company: [{ id: "c1", office_id: "o1", name: "한빛상사", biz_no: "", ceo: "김대표", tel: "", addr: "" },
                  { id: "cx", office_id: "o2", name: "남의상사", biz_no: "1112233333" }],
  check_dealer: [{ id: "d1", office_id: "o1", name: "홍길동", company_id: "c1", tel: "", active: true },
                 { id: "dx", office_id: "o2", name: "홍길동", company_id: "cx", tel: "01099998888", active: true }],
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
const mineC = () => store.check_company.filter((c: any) => c.office_id === "o1");
const mineD = () => store.check_dealer.filter((d: any) => d.office_id === "o1");
const body = {
  companies: [
    { name: "한빛상사", bizNo: "123-45-67890", ceo: "다른대표", 회사코드: "KMD-001" },   // 있음 → 빈 칸(사업자번호)만 채움 · 대표는 안 덮음
    { name: "새봄모터스", bizNo: "222-33-44444", tel: "02-123-4567", companyCode: "X9" },
    { name: "", bizNo: "1" },                                                         // 이름 없음
    { name: "<b>굵은</b>상사", bizNo: "12345" },                                       // 글자 거름 · 번호 틀림
  ],
  dealers: [
    { name: "홍길동", tel: "010-1111-2222", company: "한빛상사", code: "D-1" },        // 있음 → 휴대폰만 채움
    { name: "이순신", phone: "01033334444", company: "새봄모터스" },
    { name: "강감찬", tel: "02-555", company: "명부에없는상사" },                        // 번호 틀림 · 상사 새로
    { name: "" },
  ],
};
console.log("■ 권한 · 미리 세기");
check("직원은 못 함", !!(await call("partnerImport", [body], "chk_stf")).__err);
let r = await call("partnerImport", [Object.assign({ dryRun: true }, body)]);
check("dryRun: 세기만 · 아무것도 안 바뀜", r.result?.dryRun === true && r.result.companies.add === 3 && r.result.dealers.add === 2 && mineC().length === 1 && mineD().length === 1, r.result);
console.log("■ 넣기");
r = await call("partnerImport", [body]);
const hb = mineC().find((c: any) => c.name === "한빛상사");
check("있는 상사는 빈 칸만 채움(대표 이름은 그대로)", hb?.biz_no === "1234567890" && hb?.ceo === "김대표" && r.result?.companies.fill === 1, hb);
check("새 상사 3곳(명부 2 + 딜러에만 나온 1)", r.result?.companies.add === 3 && mineC().length === 4 && mineC().some((c: any) => c.name === "명부에없는상사"), mineC().map((c: any) => c.name));
check("< > 거르고 · 틀린 사업자번호는 빼고 넣음 · 까닭", mineC().some((c: any) => c.name === "b 굵은 /b 상사" && c.biz_no === "") && r.result.companies.bad.some((b: any) => /10자리/.test(b.why)) && r.result.companies.bad.some((b: any) => /비어/.test(b.why)), [mineC().map((c: any) => c.name), r.result.companies.bad]);
check("회사코드 같은 칸은 저장 안 함", !JSON.stringify(store.check_company).includes("KMD-001") && !JSON.stringify(store.check_company).includes("X9") && !JSON.stringify(store.check_dealer).includes("D-1"));
const hong = mineD().find((d: any) => d.name === "홍길동");
check("있는 딜러(이름+상사 같음)는 휴대폰만 채움", hong?.id === "d1" && hong?.tel === "01011112222" && r.result.dealers.fill === 1, hong);
const lee = mineD().find((d: any) => d.name === "이순신");
const sb = mineC().find((c: any) => c.name === "새봄모터스");
check("새 딜러는 소속 상사에 이어짐", !!lee && !!sb && lee.company_id === sb.id && lee.tel === "01033334444", [lee, sb?.id]);
const kang = mineD().find((d: any) => d.name === "강감찬");
check("틀린 휴대폰은 빼고 넣음 · 까닭", kang?.tel === "" && r.result.dealers.bad.some((b: any) => /휴대폰/.test(b.why)), [kang, r.result.dealers.bad]);
check("남의 검사소 상사·딜러는 그대로", store.check_dealer.find((d: any) => d.id === "dx").tel === "01099998888" && store.check_company.find((c: any) => c.id === "cx").name === "남의상사");
r = await call("partnerImport", [body]);
check("같은 명부를 다시 넣으면 새로 안 늘어남", r.result?.companies.add === 0 && r.result?.dealers.add === 0 && mineC().length === 4 && mineD().length === 3, r.result);
check("기록 남음", store.check_log.some((l: any) => l.what === "거래처 한꺼번에 넣음"));
check("빈 요청 거절", !!(await call("partnerImport", [{}])).__err);
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
