// 체크 v37 · 워시 sb18 시험 — 사업자등록증 tel·email·openDate 읽기 + bizVerify(국세청 상태·진위 · 대표만 · 열쇠 없으면 준비 중)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/사업자확인_v37_sb18_시험.ts
// (워시: WHICH=wash · --import-map=서버/시험/import_map_wash.json)
const WHICH = Deno.env.get("WHICH") ?? "check";
const mod = WHICH === "wash" ? await import("./fake_supabase_wash.ts") : await import("./fake_supabase_check.ts");
const store: any = (mod as any).store;
Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("ANTHROPIC_KEY", "k");
const day = new Date(Date.now() + 86400000).toISOString();
const OWN = WHICH === "wash" ? "c".repeat(48) : "chk_own", STF = WHICH === "wash" ? "d".repeat(48) : "chk_stf";
if (WHICH === "wash") {
  Object.assign(store, { wash_hq: [{ id: 1 }], wash_shops: [{ shop: "BT", name: "브라더세차", active: true, plan: "pro", paid_until: day.slice(0, 10) }],
    wash_sessions: [{ sid: OWN, phone: "01077778888", shop: "BT", role: "owner", expires_at: day },
                    { sid: STF, phone: "01033334444", shop: "BT", role: "staff", expires_at: day }],
    wash_users: [{ phone: "01033334444", shop: "BT", role: "staff", active: true }], wash_docs: [], cgg_access: [] });
} else {
  Object.assign(store, {
    check_office: [{ id: "o1", code: "TEST", name: "시험검사소" }],
    check_user: [{ id: "u1", office_id: "o1", phone: "01011110000", name: "대표", role: "owner", active: true, pw_hash: "x" },
                 { id: "u2", office_id: "o1", phone: "01022220000", name: "직원", role: "staff", active: true, pw_hash: "x" }],
    check_session: [{ sid: OWN, phone: "01011110000", office_id: "o1", role: "owner", expires_at: day },
                    { sid: STF, phone: "01022220000", office_id: "o1", role: "staff", expires_at: day }],
    check_log: [], cgg_access: [], wash_sessions: [], check_rate: [], check_usage: [],
  });
}
let answer = "", ntsStatus: any = { b_stt_cd: "01", end_dt: "" }, ntsValid = "01", ntsDown = false, ntsThrow = false, ntsBadKey = false;
const logs: string[] = [];
const asked: any[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  const u = String(url);
  if (u.includes("anthropic")) return Response.json({ content: [{ text: answer }], usage: {} });
  if (u.includes("odcloud.kr")) {
    asked.push({ u, b: JSON.parse(String(init?.body)), auth: (init?.headers as any)?.Authorization });
    if (ntsThrow) throw new TypeError("error sending request for url (" + u + "&serviceKey=" + (init?.headers as any)?.Authorization + "): dns error");
    if (ntsBadKey) return new Response(JSON.stringify({ code: -4, msg: "SERVICE_KEY_IS_NOT_REGISTERED_ERROR" }), { status: 401 });
    if (ntsDown) return new Response("{}", { status: 500 });
    if (u.includes("/status")) return Response.json({ status_code: "OK", data: [ntsStatus] });
    if (u.includes("/validate")) return Response.json({ status_code: "OK", data: [{ valid: ntsValid }] });
  }
  return Response.json({});
}) as typeof fetch;
console.error = (...a: unknown[]) => { logs.push(a.map(String).join(" ")); }; console.log = ((orig) => (...a: unknown[]) => { if (String(a[0]).startsWith("bizVerify")) return; orig(...a); })(console.log);
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(Deno.env.get("SRC") ?? (WHICH === "wash" ? "../1_차곳간워시_서버_wash-api_sb18.ts" : "../2_차곳간체크_서버_check-api_v38.ts"));
const call = async (fn: string, args: unknown[], token = OWN) =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop: WHICH === "wash" ? "BT" : "", token, fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const JPG = "/9j/" + "A".repeat(400);
if (WHICH === "check") {
  console.log("① 사업자등록증 tel·email·openDate");
  answer = JSON.stringify({ bizNo: "1238145678", bizName: "가나모터스", ceo: "김대표", addr: "서울", upte: "도매", jongmok: "중고차",
    openDate: "2015.03.02", tel: "031) 234-5678", email: "e-mail : Tax.Gana@Naver.COM (전자세금계산서)" });
  let v: any = {}; try { v = JSON.parse((await call("aiBiz", [JPG])).result); } catch (_) { /* */ }
  check("이메일은 모양으로 골라 소문자", v.email === "tax.gana@naver.com", v);
  check("지역번호 전화도 받음", v.tel === "031-234-5678", v);
  check("개업일 YYYYMMDD · start YYYY-MM-DD", v.openDate === "20150302" && v.start === "2015-03-02", v);
  answer = JSON.stringify({ bizNo: "1238145678", tel: "팩스뿐", email: "없음@", openDate: "모름" });
  try { v = JSON.parse((await call("aiBiz", [JPG])).result); } catch (_) { v = {}; }
  check("틀린 모양은 빈칸(전화·이메일·개업일)", v.tel === "" && v.email === "" && v.openDate === "", v);
  answer = JSON.stringify({ name: "홍", phone: "010-1111-2222", email: "Hong<at>x" , company: "", bizName: "", bizNo: "", addr: "" });
  try { v = JSON.parse((await call("aiCard", [JPG])).result); } catch (_) { v = {}; }
  check("명함 이메일도 같은 규칙(틀리면 빈칸)", v.email === "", v);
  answer = JSON.stringify({ name: "홍", phone: "010-1111-2222", email: "HONG@Gana.co.kr", company: "", bizName: "", bizNo: "", addr: "" });
  try { v = JSON.parse((await call("aiCard", [JPG])).result); } catch (_) { v = {}; }
  check("명함 이메일 소문자", v.email === "hong@gana.co.kr", v);
  answer = JSON.stringify({ bizNo: "1", tel: "1588-1234" });
  try { v = JSON.parse((await call("aiBiz", [JPG])).result); } catch (_) { v = {}; }
  check("1588 전화도 받음", v.tel === "1588-1234", v);
}
console.log("② bizVerify");
let r0 = await call("bizVerify", [{ no: "12345" }]);
check("열쇠가 없으면 번호가 틀려도 «준비 중»(ready:false)", r0.result?.ready === false, r0);
let r = await call("bizVerify", [{ bizNo: "123-81-45678" }]);
check("열쇠가 없으면 «준비 중»(ready:false) · 국세청 안 부름", r.result?.ready === false && asked.length === 0 && /준비 중/.test(r.result?.why), r);
Deno.env.set("NTS_API_KEY", "a+b/c==");
check("직원은 거절", !!(await call("bizVerify", [{ bizNo: "1238145678" }], STF)).__err);
r = await call("bizVerify", [{ bizNo: "123-81-45678" }]);
check("계속사업자 · 번호만이면 진위는 null", r.result?.ready === true && r.result?.state === "계속" && r.result?.match?.ceo === null && r.result?.ok === null, r);
check("열쇠는 주소가 아니라 머리글(Infuser)로 · 번호는 숫자 10자리", !asked.at(-1)?.u.includes("serviceKey") && !asked.at(-1)?.u.includes("a+b") &&
  asked.at(-1)?.auth === "Infuser a+b/c==" && asked.at(-1)?.b?.b_no?.[0] === "1238145678", asked.at(-1));
r = await call("bizVerify", [{ no: "123-81-45678", ceo: "김대표", start: "2015-03-02" }]);
check("체크 약속 모양({no, ceo, start}) · 진위 확인 → match {ceo:true, start:true}", r.result?.match?.ceo === true && r.result?.match?.start === true && asked.at(-1)?.b?.businesses?.[0]?.start_dt === "20150302" && asked.at(-1)?.b?.businesses?.[0]?.p_nm === "김대표", r);
ntsValid = "02";
r = await call("bizVerify", [{ bizNo: "1238145678", ceo: "엉뚱", openDate: "20150302" }]);
check("안 맞으면 match {false, false}", r.result?.match?.ceo === false && r.result?.ok === false, r);
ntsStatus = { b_stt_cd: "03", end_dt: "20240115" };
r = await call("bizVerify", [{ bizNo: "1238145678" }]);
check("폐업 · since(폐업일)", r.result?.state === "폐업" && r.result?.since === "2024-01-15" && r.result?.closedAt === "2024-01-15", r);
ntsStatus = { b_stt_cd: "", tax_type: "국세청에 등록되지 않은 사업자등록번호입니다." };
r = await call("bizVerify", [{ bizNo: "1238145678", ceo: "김", openDate: "20150302" }]);
check("등록 안 된 번호 → 없음 · 진위는 안 물음", r.result?.state === "없음" && r.result?.match?.ceo === null, r);
ntsThrow = true;
r = await call("bizVerify", [{ bizNo: "1238145678" }]);
check("연결 오류: ready:false · 쉬운 글 · 기록·답에 열쇠가 없음", !r.__err && r.result?.ready === false && /연결하지 못했어요/.test(r.result?.why) &&
  !logs.join("\n").includes("a+b/c==") && !JSON.stringify(r).includes("a+b/c=="), [r, logs]);
ntsThrow = false; ntsBadKey = true;
r = await call("bizVerify", [{ bizNo: "1238145678" }]);
check("열쇠가 틀리면 «열쇠 확인 필요» 쉬운 글", r.result?.ready === false && /열쇠가 맞지 않아요/.test(r.result?.why), r);
ntsBadKey = false; ntsDown = true;
r = await call("bizVerify", [{ bizNo: "1238145678" }]);
check("국세청이 안 되면 ready:false (오류로 막지 않음)", !r.__err && r.result?.ready === false && /500/.test(r.result?.why), r);
r = await call("bizVerify", [{ bizNo: "12345" }]);
check("10자리가 아니면 없음", r.result?.state === "없음", r);
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
