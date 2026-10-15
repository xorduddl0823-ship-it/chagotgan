// 워시 sb12 시험 — 관리 한곳에서(계정·결제 결과) + 보안 조건 · 체크 잠금 안내/공지 · 옛 가입 결제 끄기 · 청구서 기한/다음 시도일 (가짜 수파베이스)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/관리_통합_시험.ts
import { knobs, store } from "./fake_supabase_wash.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s");
Deno.env.set("SMS_FROM", "0212345678");
const far = new Date(Date.now() + 864e5).toISOString();
const ADM = "b".repeat(48), OWN = "c".repeat(48);
const T = "01044445555";                      // 여러 제품을 쓰는 사람
const CO = "chk_" + "o".repeat(40), CS = "chk_" + "s".repeat(40);
const kst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const addD = (y: string, n: number) => new Date(Date.parse(y + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
Object.assign(store, {
  wash_hq: [{ id: 1, ata_cfg: {}, admin_phone: "01000009999", check_first_pw_sms: false }],
  wash_shops: [{ shop: "BT", name: "브라더세차", active: true, plan: "pro", paid_until: far.slice(0, 10), owner_phone: "01077778888" },
               { shop: "ADMIN", name: "본사", active: true }],
  wash_plans: [{ code: "pro", name: "프로", price: 30000 }],
  wash_users: [{ phone: T, shop: "BT", name: "김직원", role: "staff", active: true, pw_hash: "old" },
               { phone: "01000000000", shop: "ADMIN", name: "본사", role: "admin", active: true },
               { phone: "01000001111", shop: "ADMIN", name: "본사2", role: "admin", active: true },
               { phone: "01077778888", shop: "BT", name: "대표", role: "owner", active: true }],
  wash_sessions: [{ sid: ADM, phone: "01000000000", shop: "ADMIN", role: "admin", expires_at: far },
                  { sid: OWN, phone: "01077778888", shop: "BT", role: "owner", expires_at: far },
                  { sid: "t".repeat(48), phone: T, shop: "BT", role: "staff", expires_at: far }],
  check_office: [{ id: "o1", code: "TYC", name: "티와이검사소", wallet_shop: null, biz_no: "111-22-33333", owner_name: "김대표" },
                 { id: "o2", code: "GAON", name: "가온", wallet_shop: null }],
  check_user: [{ office_id: "o1", phone: T, name: "김직원", role: "staff", active: true, pw_hash: "aa$bb" },
               { office_id: "o2", phone: T, name: "김직원", role: "staff", active: true, pw_hash: "cc$dd" },
               { office_id: "o1", phone: "01011112222", name: "티와이대표", role: "owner", active: true }],
  check_session: [{ sid: "chk_" + "t".repeat(40), phone: T, office_id: "o1", role: "staff", expires_at: far },
                  { sid: CO, phone: "01011112222", office_id: "o1", role: "owner", expires_at: far },
                  { sid: CS, phone: T, office_id: "o1", role: "staff", expires_at: far }],
  check_deliv_driver: [{ id: "d1", office_id: "o1", name: "김기사", tel: T, active: true, token: "T1.x", pw_hash: "old" }],
  check_deliv_fail: [{ key: "office:" + T, fail_count: 5, locked_until: far }, { key: "o1:김기사", fail_count: 5 }],
  check_pw_first: [],
  dealer_users: [{ phone: T, name: "김딜러", active: true }],
  dealer_sessions: [{ sid: "dd", phone: T, expires_at: far }],
  dealer_otp: [{ phone: T, tries: 5 }],
  cgg_access: [],
  cgg_session: [{ sid: "cg", phone: T, expires_at: far }],
  wash_rate: [{ key: "pwfail:" + T, n: 10 }],
  hq_audit: [], wash_pay_order: [], wash_payments: [], wash_viewcode: [], wash_docs: [], wash_otp: [],
  wash_notice: [], wash_notice_read: [], pay_billing: [],
});
const sms: any[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  if (String(url).includes("solapi")) { sms.push(JSON.parse(String(init?.body)).messages[0]); return Response.json({}); }
  throw new Error("예상 못 한 주소 " + url);
}) as typeof fetch;
const errs: string[] = [];
console.error = (...a: unknown[]) => { errs.push(a.map(String).join(" ")); };
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(Deno.env.get("WASH_SRC") ?? "../1_차곳간워시_서버_wash-api_sb12.ts");
const call = async (fn: string, args: unknown[], token = "", shop = "") =>
  await (await H[0](new Request("http://x", { method: "POST", headers: { "user-agent": "test-agent" }, body: JSON.stringify({ shop, token, fn, args }) }))).json();
const hq = (fn: string, args: unknown[]) => call(fn, args, ADM, "ADMIN");
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}

console.log("① 사람 보기 hqPerson");
check("번호 일부로는 못 찾음", /전체/.test((await hq("hqPerson", ["4445555"])).__err ?? ""));
check("업체 계정은 못 봄", !!(await call("hqPerson", [T], OWN, "BT")).__err);
const pv = await hq("hqPerson", [T]);
const r = pv.result ?? {};
check("워시·체크(2곳)·기사·딜러를 모두 보여 줌", r.wash?.length === 1 && r.check?.length === 2 && r.drivers?.length === 1 && r.dealer?.name === "김딜러", r);
check("비밀번호 해시·열쇠 원본은 안 내려감", !JSON.stringify(pv).includes("aa$bb") && !JSON.stringify(pv).includes("T1.x") && !JSON.stringify(pv).includes("t".repeat(40)), pv);
check("로그인 수 · 잠금 상태", r.sessions?.wash === 1 && r.sessions?.check === 2 && r.locks?.wash === true && r.locks?.check === true, r);
check("조회도 기록 (누가·IP·UA·sid 끝)", store.hq_audit.some((x: any) => x.action === "view" && x.target_phone === T && x.who === "01000000000" && x.ua === "test-agent" && x.sid_tail === ADM.slice(-6)), store.hq_audit);

console.log("② 바꾸기 hqPersonAct — 지킴");
check("본인 번호는 못 바꿈", /본인/.test((await hq("hqPersonAct", ["01000000000", "stop", "all"])).__err ?? ""));
check("본사 사람(ADMIN)은 못 바꿈", /본사/.test((await hq("hqPersonAct", ["01000001111", "kick", "all"])).__err ?? ""));
check("모르는 동작 거절", !!(await hq("hqPersonAct", [T, "delete", "all"])).__err);

console.log("③ 멈추기 · 끊기");
sms.length = 0;
const st = await hq("hqPersonAct", [T, "stop", "check:TYC"]);
check("체크 TYC 만 멈춤 (가온은 그대로)", st.result?.ok && store.check_user.find((u: any) => u.office_id === "o1" && u.phone === T).active === false &&
  store.check_user.find((u: any) => u.office_id === "o2").active === true, store.check_user);
check("멈추면 체크 로그인 끊김", !store.check_session.some((x: any) => x.phone === T));
check("당사자에게 안내 문자", sms.some((m) => m.to === T && /이용 멈춤/.test(m.text)), sms);
check("기록 남음", store.hq_audit.some((x: any) => x.action === "stop" && x.product === "check:TYC" && x.result === "ok"));
await hq("hqPersonAct", [T, "stop", "wash"]);
check("워시 멈춤 + 워시 로그인 끊김", store.wash_users.find((u: any) => u.phone === T).active === false && !store.wash_sessions.some((x: any) => x.phone === T));
await hq("hqPersonAct", [T, "resume", "all"]);
check("모두 다시 열기", store.wash_users.find((u: any) => u.phone === T).active === true && store.check_user.filter((u: any) => u.phone === T).every((u: any) => u.active) &&
  store.dealer_users[0].active === true && store.check_deliv_driver[0].active === true);
await hq("hqPersonAct", [T, "kick", "all"]);
check("모두 끊기 (딜러·경비실·기사 열쇠)", !store.dealer_sessions.length && !store.cgg_session.length && store.check_deliv_driver[0].token === null);

console.log("④ 잠금 풀기");
await hq("hqPersonAct", [T, "unlock", "all"]);
check("워시·체크·기사·딜러 틀린 횟수 지움", !store.wash_rate.some((x: any) => x.key === "pwfail:" + T) && !store.check_deliv_fail.length && store.dealer_otp[0].tries === 0, { r: store.wash_rate, f: store.check_deliv_fail });

console.log("⑤ 비밀번호 초기화");
const ck = await hq("hqPersonAct", [T, "pwReset", "check:TYC"]);
check("체크: 관리 스위치(첫 비밀번호 문자 확인)가 꺼져 있으면 거절", /운영 중일 때만/.test(ck.__err ?? "") && store.check_user[0].pw_hash === "aa$bb", ck);
await hq("hqCheckPwSms", [true]);
const ck2 = await hq("hqPersonAct", [T, "pwReset", "check:TYC"]);
check("체크: 켜면 비밀번호 비움 (본인이 문자 확인으로 정함) · 가온은 그대로", ck2.result?.ok && store.check_user[0].pw_hash === null && store.check_user[1].pw_hash === "cc$dd", store.check_user);
const wp = await hq("hqPersonAct", [T, "pwReset", "wash"]);
const wu = store.wash_users.find((u: any) => u.phone === T);
check("워시: 못 쓰는 값으로 바꿈 · 응답에 비밀번호 없음", wp.result?.ok && wu.pw_hash !== "old" && !/pw"/.test(JSON.stringify(wp)), wp);
sms.length = 0;
const dp = await hq("hqPersonAct", [T, "pwReset", "driver:d1"]);
const tmp = (sms.find((m) => m.to === T && /임시 비밀번호/.test(m.text))?.text.match(/임시 비밀번호 (\S+)/) ?? ["", ""])[1];
const drv = store.check_deliv_driver[0];
check("기사: 임시 비밀번호는 기사 휴대폰 문자로만 (10자)", tmp.length === 10 && dp.result?.sent === true, { dp, sms });
check("응답·기록·서버 로그에 임시 비밀번호 없음", !JSON.stringify(dp).includes(tmp) && !JSON.stringify(store.hq_audit).includes(tmp) && !errs.some((e) => e.includes(tmp)));
check("기사: 바로 바꾸기 표시 · 열쇠 지움 · 체크 모양 해시", drv.must_change === true && drv.token === null && /^[0-9a-f]{32}\$[0-9a-f]{64}$/.test(drv.pw_hash), drv);

console.log("⑥ 제품 열기·닫기 (출입 명단)");
const g1 = await hq("hqPersonAct", [T, "grant", "wash"]);
check("명단에 처음 넣을 때는 확인을 먼저 물음 (빠진 제품이 막힘)", g1.result?.confirm === true && !store.cgg_access.length, g1);
await hq("hqPersonAct", [T, "grant", "wash", true]);
check("확인하면 넣음", JSON.stringify(store.cgg_access[0]?.products) === '["wash"]');
await hq("hqPersonAct", [T, "grant", "check"]);
check("줄이 있으면 더하기", JSON.stringify(store.cgg_access[0].products) === '["wash","check"]');
store.check_session.push({ sid: "chk_" + "z".repeat(40), phone: T, office_id: "o1", role: "staff", expires_at: far });
await hq("hqPersonAct", [T, "revoke", "check"]);
check("닫으면 빼고 그 제품 로그인 끊기", JSON.stringify(store.cgg_access[0].products) === '["wash"]' && !store.check_session.some((x: any) => x.phone === T));
check("관리 권한 같은 다른 값은 못 넣음", !!(await hq("hqPersonAct", [T, "grant", "admin"])).__err);

console.log("⑦ 시간당 횟수 제한");
sms.length = 0;
let blocked = "";
for (let i = 0; i < 40 && !blocked; i++) { const x = await hq("hqPersonAct", [T, "kick", "dealer"]); if (x.__err) blocked = x.__err; }
check("한 시간에 너무 많으면 멈춤", /횟수/.test(blocked), blocked);
check("대표님(본사 번호)께 문자 한 번", sms.filter((m) => m.to === "01000009999" && /너무 많아/.test(m.text)).length === 1, sms.filter((m) => m.to === "01000009999"));

console.log("⑧ 기록 보기 — 지우는 창구 없음");
const au = await hq("hqAudit", [T]);
check("이 번호 기록만", (au.result?.list ?? []).length > 5 && au.result.list.every((x: any) => x.target_phone === T));
check("기록 지우기·고치기 창구 없음", !!(await hq("hqAuditDel", [1])).__err && !!(await hq("hqAuditSave", [1])).__err);

console.log("⑨ 결제 결과 한곳 hqPayResults");
const at = new Date().toISOString();
store.wash_pay_order.push(
  { order_id: "CGG1", shop: "BT", kind: "plan", amount: 33000, status: "paid", who: "shop:BT", created_at: at, paid_at: at, period: "2026-10" },
  { order_id: "CGG2", shop: "BT", kind: "plan", amount: 33000, status: "paid", who: "check:TYC", created_at: at, paid_at: at + "1" },
  { order_id: "CGB3", shop: "BT", kind: "plan", amount: 33000, status: "paid", who: "billing", created_at: at, paid_at: at + "2" },
  { order_id: "CGG4", shop: "BT", kind: "cash", amount: 55000, status: "paid", who: "join:01099990000", created_at: at, paid_at: at + "3" });
store.wash_payments.push({ id: "L1", shop: "BT", amount: 33000, status: "paid", order_id: "CGG1", created_at: at },
                         { id: "L2", shop: "BT", amount: 16500, status: "refunded", created_at: at, memo: "카드 환불" },
                         { id: "L3", shop: "BT", amount: 40000, status: "paid", created_at: at, method: "계좌이체" });
store.wash_viewcode.push({ code: "V".repeat(24), shop: "BT", kind: "bill", created_at: at, to_phones: ["01022223333"],
  data: { name: "김딜러", month: "2026-09", amount: 330000, paid: 0 } });
const pr = await hq("hqPayResults", ["", "", ""]);
const L = pr.result?.list ?? [];
const tagOf = (id: string) => L.find((x: any) => x.orderId === id)?.tag;
check("꼬리표: 워시 · 체크 · 검사소명 · 자동 결제 · 홈페이지", tagOf("CGG1") === "워시" && tagOf("CGG2") === "체크 · 티와이검사소" && tagOf("CGB3") === "자동 결제" && tagOf("CGG4") === "홈페이지", L);
check("카드 주문과 같은 장부 줄은 한 번만", L.filter((x: any) => x.orderId === "CGG1").length === 1);
check("환불 · 계좌 입금 줄", L.some((x: any) => x.tag === "환불" && x.amount === 16500) && L.some((x: any) => x.tag === "계좌 입금" && x.amount === 40000));
const db = L.find((x: any) => x.tag === "딜러 청구서");
check("딜러 청구서: 상태·참고 금액·딜러명 · 딜러 번호 없음 · 합계에서 빠짐", db?.refOnly === true && db.status === "입금 전" && db.dealer === "김딜러" &&
  !JSON.stringify(pr).includes("01022223333") && pr.result.sum === 33000 * 3 + 55000 + 40000, { db, sum: pr.result?.sum });
check("첫 결제 표시", L.find((x: any) => x.orderId === "CGG1")?.first === true && L.find((x: any) => x.orderId === "CGG2")?.first === false);
check("꼬리표로 걸러보기", (await hq("hqPayResults", ["", "", "체크"])).result.list.every((x: any) => String(x.tag).startsWith("체크")));

console.log("⑩ 체크 화면의 잠금 안내·공지 (체크 열쇠 → 워시 서버)");
store.check_session.push({ sid: CS, phone: T, office_id: "o1", role: "staff", expires_at: far });
store.check_user.forEach((u: any) => (u.active = true));
store.cgg_access[0].products = ["wash", "check"];   // ⑥ 에서 닫은 체크를 다시 연 셈
const ln = await call("lockInfo", [], CS, "TYC");
check("직원도 잠금 안내를 봄 · 지갑이 없으면 잠금 없음", ln.result?.state === "ok" && ln.result?.notLinked === true, ln);
check("공지 목록 (직원도)", (await call("noticeList", [], CS, "TYC")).result?.ok === true);
check("«입금했습니다»(paidSay)는 대표만", /대표만/.test((await call("paidSay", [], CS, "TYC")).__err ?? ""));
check("검사소 사업자번호·대표를 지갑 목록에", (await hq("hqCheckWallets", [])).result?.offices?.find((o: any) => o.code === "TYC")?.bizNo === "111-22-33333");

console.log("⑪ 옛 로그인 전 가입 결제는 꺼짐");
const op = await call("payStart", ["01012345678", "새업체", "pro"]);
check("로그인 먼저 안내 · 결제 줄 안 만듦", op.result?.login === true && !store.wash_payments.some((p: any) => p.phone === "01012345678"), op);

console.log("⑫ 청구서 입금 기한 · 자동 결제 다음 시도일");
const vb = await call("viewBill", [{ name: "좋은상사", month: "2026-10", amount: 1000, dueDate: "2026-10-31" }], OWN, "BT");
check("청구서 묶음에 입금 기한 저장", store.wash_viewcode.find((v: any) => v.code === vb.result?.code)?.data?.dueDate === "2026-10-31", vb);
await call("viewBill", [{ name: "나쁜상사", month: "2026-10", amount: 1000, dueDate: "<script>" }], OWN, "BT");
check("날짜 모양이 아니면 빈칸", store.wash_viewcode.at(-1)?.data?.dueDate === "");
store.pay_billing.push({ shop: "BT", status: "on", first_fail_at: addD(kst(), -2), customer_key: "x" });
const bi = await call("billInfo", [], OWN, "BT");
check("billInfo.nextTry = 첫 실패일 + 3일 (오늘 기준 다음)", bi.result?.nextTry === addD(kst(), 1), bi);

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
