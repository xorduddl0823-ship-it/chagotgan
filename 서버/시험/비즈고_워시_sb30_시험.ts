// 워시 sb30 시험 — 문자 업체 고르기(솔라피/비즈고): 스위치 · 비즈고 보내기 모양 · 알림톡→문자 대체(한 요청) · 업체별 템플릿 코드 · rid 한 번 · «확인 중» · 처음 업체 고정 · 결과 채우기 · «-» 빈 칸
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/비즈고_워시_sb30_시험.ts
// 실제 발송 0 — 솔라피·비즈고 모두 가짜 응답. 비즈고 응답 모양은 공개 명세(github.com/icomm-api/bizgo-api-spec dist/openapi.yaml)의 예시와 같게 만듦.
import { store } from "./fake_supabase_wash.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s"); Deno.env.set("SMS_FROM", "0212345678");
Deno.env.set("BIZGO_API_KEY", "BZKEY-test-only");
const far = new Date(Date.now() + 864e5).toISOString();
const A = "a".repeat(48), ADM = "c".repeat(48);
Object.assign(store, {
  wash_hq: [{ id: 1, ata_cfg: { pfId: "PF_SOL", tpl: { intake: "SOL_INTAKE", release: "SOL_RELEASE" }, bizgo: { senderKey: "SK_BZ", tpl: { intake: "BZ_INTAKE" } } } }],
  cgg_access: [], wash_viewcode: [], wash_otp: [], cgg_sendlog: [], wash_sendlog: [], cgg_idem: [], hq_audit: [],
  wash_shops: [{ shop: "SHA1", name: "시험업체A", active: true, plan: "pro", paid_until: far.slice(0, 10), owner_phone: "01000000001", sms_from: "01011112222" }],
  wash_users: [{ phone: "01000000001", shop: "SHA1", role: "owner", active: true }],
  wash_sessions: [{ sid: A, phone: "01000000001", shop: "SHA1", role: "owner", expires_at: far }, { sid: ADM, phone: "01099999999", shop: "ADMIN", role: "admin", expires_at: far }],
  wash_docs: [],
});
/* 가짜 업체 — 솔라피는 늘 받음, 비즈고는 plan 차례대로(비면 ok) */
let sol = 0, bzAccepted = 0;
const bz: any[] = [], solMsgs: any[] = [], plan: string[] = [];
const reports: Record<string, any[]> = {};
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  const u = String(url);
  if (u.includes("solapi") && u.includes("/messages/v4/send")) {
    sol++; solMsgs.push(JSON.parse(String(init?.body || "{}")).messages?.[0]);
    return Response.json({ groupInfo: { groupId: "G" }, messageList: { ["S" + sol]: {} }, failedMessageList: [] });
  }
  if (u.includes("ibapi.kr") && u.includes("/report/inquiry/")) {
    const mk = decodeURIComponent(u.split("/report/inquiry/")[1]);
    return Response.json({ common: { authCode: "A000", authResult: "Success" }, data: { code: "A000", result: "SUCCESS", data: { report: reports[mk] || [] } } });
  }
  if (u.includes("ibapi.kr") && u.includes("/api/comm/v1/send/omni")) {
    const b = JSON.parse(String(init?.body || "{}"));
    const h = new Headers(init?.headers);
    bz.push({ url: u, auth: h.get("Authorization"), body: b });
    const m = plan.shift() || "ok";
    await new Promise((r) => setTimeout(r, 30));
    const to = b.destinations?.[0]?.to;
    const env = (code: string, dest?: any) => Response.json({ common: { authCode: "A000", authResult: "Success", infobankTrId: "T" },
      data: { code, result: code === "A000" ? "SUCCESS" : "FAIL", data: dest ? { destinations: [dest] } : undefined } });
    if (m === "ok") { bzAccepted++; return env("A000", { to, msgKey: "MK" + bzAccepted, code: "A000", result: "Success" }); }
    if (m === "lost") { bzAccepted++; throw new TypeError("connection reset by peer"); }
    if (m === "e502") return new Response("bad gateway", { status: 502 });
    if (m === "reject") return env("A327");                                         // 미등록 발신번호 — 받지 않음 확정
    if (m === "destfail") return env("A000", { to, code: "A306", result: "Invalid or empty 'to'" });
    if (m === "dup") return env("A000", { to, code: "A301", result: "Duplicate idempotencyKey" });
  }
  return Response.json({});
}) as typeof fetch;
console.error = () => {}; console.warn = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
const SRC = Deno.env.get("WASH_SRC") ?? new URL("../1_차곳간워시_서버_wash-api_sb30.ts", import.meta.url).href;
await import(SRC);
const call = async (fn: string, args: unknown[], rid?: string, token = A, shop = "SHA1") =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop, token, fn, args, rid }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
let n = 0;
const rid = () => (String(++n).padStart(4, "0") + "z".repeat(20)).slice(0, 24);
const sms = (text = "시험 문자", kind = "SMS") => JSON.stringify({ to: "01033334444", from: "x", kind, text, type: "시험" });
const ata = (vars: Record<string, string>, key = "intake") => JSON.stringify({ to: "01033334444", from: "x", kind: "ATA", ataKey: key, text: "대체", variables: vars, disableSms: false, type: "입고" });
const row = (r: string) => store.cgg_idem.find((x: any) => x.fn === "sendMsg" && x.rid === r);
const V = { 딜러명: "김딜러", 상사명: "한빛상사", 차량번호: "12가3456", 작업내용: "광택", 입고일시: "10/21 10:00" };

console.log("① 스위치 — 없거나 이상하면 솔라피");
Deno.env.delete("MSG_VENDOR");
let s0 = sol, b0 = bz.length;
await call("sendMsg", [sms()], rid());
check("MSG_VENDOR 없음 → 솔라피", sol === s0 + 1 && bz.length === b0);
Deno.env.set("MSG_VENDOR", "BizGo2");
await call("sendMsg", [sms()], rid());
check("이상한 값(BizGo2) → 솔라피", sol === s0 + 2 && bz.length === b0);
Deno.env.set("MSG_VENDOR", "bizgo");
let R = rid();
const r1 = await call("sendMsg", [sms()], R);
const q1 = bz[bz.length - 1] || {};
check("bizgo → 비즈고로 한 번 · 솔라피 0", bz.length === b0 + 1 && sol === s0 + 2 && r1.result?.ok === true, r1);
check("주소 = 운영 https://mars.ibapi.kr/api/comm/v1/send/omni · 머리 Authorization = 열쇠 그대로(접두어 없음)", q1.url === "https://mars.ibapi.kr/api/comm/v1/send/omni" && q1.auth === "BZKEY-test-only", [q1.url, q1.auth]);
check("몸통: destinations[{to}] · messageFlow[{sms:{from,text}}]", q1.body?.destinations?.[0]?.to === "01033334444" && q1.body?.messageFlow?.length === 1 && q1.body.messageFlow[0].sms?.from === "0212345678" && /시험 문자/.test(q1.body.messageFlow[0].sms?.text || ""), q1.body);
check("업체 쪽 중복 막기: idempotencyKey(cgg-지문-차례) · idempotencyTtl 86400", /^cgg-[0-9a-f]{40}-1$/.test(q1.body?.idempotencyKey || "") && q1.body?.idempotencyTtl === 86400, q1.body);
check("보낸 기록 msg_id = «bz:msgKey»", store.cgg_sendlog.some((x: any) => x.msg_id === "bz:MK" + bzAccepted), store.cgg_sendlog.slice(-1));
Deno.env.set("BIZGO_ENV", "sandbox");
await call("sendMsg", [sms()], rid());
check("BIZGO_ENV=sandbox → https://sandbox-mars.ibapi.kr", String(bz[bz.length - 1]?.url).startsWith("https://sandbox-mars.ibapi.kr/"), bz[bz.length - 1]?.url);
Deno.env.delete("BIZGO_ENV");
await call("sendMsg", [sms("긴 글 ".repeat(40), "LMS")], rid());
const lm = bz[bz.length - 1]?.body?.messageFlow?.[0];
check("장문 → mms(사진 없음 = LMS) · 제목", !!lm?.mms && !lm.mms.fileKey && !!lm.mms.title, lm);

console.log("② 알림톡 — 비즈고 코드 · 같은 요청 안에서 문자 대체 · «-» 빈 칸");
b0 = bz.length;
await call("sendMsg", [ata(V)], rid());
const a1 = bz[bz.length - 1]?.body || {};
check("messageFlow = [알림톡(비즈고 발신프로필·비즈고 템플릿), 대체 문자] 한 요청", bz.length === b0 + 1 && a1.messageFlow?.length === 2 &&
  a1.messageFlow[0].alimtalk?.senderKey === "SK_BZ" && a1.messageFlow[0].alimtalk?.templateCode === "BZ_INTAKE" && a1.messageFlow[0].alimtalk?.msgType === "AT" && !!(a1.messageFlow[1].sms || a1.messageFlow[1].mms), a1.messageFlow);
check("변수는 replaceWords 로(«#{이름}» 모양)", a1.destinations?.[0]?.replaceWords?.["#{차량번호}"] === "12가3456", a1.destinations);
await call("sendMsg", [ata({ ...V, 상사명: "-" })], rid());
const a2 = bz[bz.length - 1]?.body || {};
check("«-» 상사명 → «개인»(알림톡 그대로)", a2.messageFlow?.[0]?.alimtalk && a2.destinations?.[0]?.replaceWords?.["#{상사명}"] === "개인", a2.destinations);
await call("sendMsg", [ata({ ...V, 작업내용: "-" })], rid());
const a3 = bz[bz.length - 1]?.body || {};
check("«-» 작업내용 → 빈 칸으로 보고 알림톡 대신 대체 문구 문자", a3.messageFlow?.length === 1 && !a3.messageFlow[0].alimtalk, a3.messageFlow);
store.wash_hq[0].ata_cfg.tpl.release = "SOL_RELEASE";
Deno.env.set("MSG_VENDOR", "solapi");
s0 = sol;
await call("sendMsg", [ata(V)], rid());
check("솔라피일 때는 솔라피 코드(SOL_INTAKE · PF_SOL)", sol === s0 + 1 && solMsgs[solMsgs.length - 1]?.kakaoOptions?.templateId === "SOL_INTAKE" && solMsgs[solMsgs.length - 1]?.kakaoOptions?.pfId === "PF_SOL", solMsgs[solMsgs.length - 1]);
Deno.env.set("MSG_VENDOR", "bizgo");
store.wash_hq[0].ata_cfg.bizgo.tpl = {};
await call("hqAtaSave", [{ tpl: { intake: "SOL_INTAKE", release: "SOL_RELEASE" } }], undefined, ADM, "ADMIN");
check("관리 저장(솔라피 칸만)이 비즈고 칸을 지우지 않음", store.wash_hq[0].ata_cfg.bizgo?.senderKey === "SK_BZ", store.wash_hq[0].ata_cfg);
await call("hqAtaSave", [{ tpl: { intake: "SOL_INTAKE" }, bizgo: { tpl: { intake: "BZ_INTAKE2" } } }], undefined, ADM, "ADMIN");
const g = await call("hqAta", [], undefined, ADM, "ADMIN");
check("관리 저장·보기: 비즈고 코드 따로(bizgo.tpls) · 업체 스위치 보임", store.wash_hq[0].ata_cfg.bizgo?.tpl?.intake === "BZ_INTAKE2" && g.result?.bizgo?.tpls?.intake === "BZ_INTAKE2" && g.result?.tpls?.intake === "SOL_INTAKE" && g.result?.vendor === "bizgo", g.result);
b0 = bz.length;
await call("sendMsg", [ata(V, "release")], rid());
const a4 = bz[bz.length - 1]?.body || {};
check("비즈고 코드가 없는 템플릿(release) → 솔라피 코드를 쓰지 않고 문자", !a4.messageFlow?.[0]?.alimtalk, a4.messageFlow);

console.log("③ rid 한 번 · DB 오류 · «확인 중»");
let ac0 = bzAccepted; R = rid();
const three = await Promise.all([1, 2, 3].map(() => call("sendMsg", [sms()], R)));
check("동시에 같은 rid 3번 → 비즈고 받음 1번", bzAccepted === ac0 + 1 && three.every((x) => x.result?.ok === true || /처리 중이에요/.test(x.__err || "")), three);
b0 = bz.length;
(store as any).__idemFail = (op: string) => op === "insert" ? { code: "57014", message: "timeout" } : null;
const d1 = await call("sendMsg", [sms()], rid());
(store as any).__idemFail = null;
check("한 번만 표 DB 오류 → 비즈고 부르지 않음 · «잠시 뒤 다시»", bz.length === b0 && /잠시 뒤 다시/.test(d1.__err || ""), d1);
for (const mode of ["e502", "lost", "dup"]) {
  R = rid(); plan.push(mode); b0 = bz.length;
  const x1 = await call("sendMsg", [sms()], R), x2 = await call("sendMsg", [sms()], R);
  check(`비즈고 ${mode} → «확인 중» · 같은 rid 다시 → 비즈고 부르지 않음`, x1.result?.unsure === true && x2.__unsure === true && bz.length === b0 + 1 && row(R)?.state === "unknown", [x1, x2]);
}

console.log("④ 받지 않음 확정 → 다시 · 처음 고른 업체로만");
R = rid(); plan.push("reject"); b0 = bz.length; s0 = sol;
const f1 = await call("sendMsg", [sms()], R);
check("비즈고가 거절(A327) → «못 보냄» · retry · 업체 bizgo 적어 둠", f1.result?.ok === false && !f1.result?.unsure && row(R)?.state === "retry" && row(R)?.result?.vendor === "bizgo", [f1, row(R)]);
Deno.env.set("MSG_VENDOR", "solapi");
const f2 = await call("sendMsg", [sms()], R);
check("스위치를 솔라피로 바꿔도 같은 rid 는 비즈고로만 다시(솔라피 0)", f2.result?.ok === true && bz.length === b0 + 2 && sol === s0, [f2, sol - s0]);
const f3 = await call("sendMsg", [sms()], R);
check("끝난 rid 다시 → 처음 답 · 어느 업체도 안 부름", f3.result?.ok === true && bz.length === b0 + 2 && sol === s0, f3);
Deno.env.set("MSG_VENDOR", "bizgo");
R = rid(); plan.push("destfail");
const f4 = await call("sendMsg", [sms()], R);
check("수신자 거절(A306) → «못 보냄» · retry", f4.result?.ok === false && row(R)?.state === "retry", f4);
Deno.env.delete("BIZGO_API_KEY"); b0 = bz.length; R = rid();
const f5 = await call("sendMsg", [sms()], R);
check("비즈고 열쇠 없음 → 비즈고 부르지 않고 솔라피로(바뀐 점: 준비 안 되면 솔라피)", bz.length === b0 && f5.result?.ok === true && /^S/.test(f5.result?.id || ""), [f5, row(R)]);
Deno.env.set("BIZGO_API_KEY", "BZKEY-test-only");
const f6 = await call("sendMsg", [JSON.stringify({ to: "01033334444", from: "x", kind: "SMS", text: "예약", scheduledDate: new Date(Date.now() + 864e5).toISOString() })], rid());
check("비즈고 예약 문자 → 보내지 않음(솔라피에서만)", bz.length === b0 && f6.result?.ok === false && /예약/.test(f6.result?.error || ""), f6);

console.log("⑤ 결과 채우기(비즈고 리포트 조회)");
const old = new Date(Date.now() - 5 * 60000).toISOString();
store.cgg_sendlog.push(
  { id: 9001, product: "wash", msg_id: "bz:MKA", via: "ata", result: "wait", at: old },
  { id: 9002, product: "wash", msg_id: "bz:MKB", via: "ata", result: "wait", at: old },
  { id: 9003, product: "wash", msg_id: "bz:MKC", via: "sms", result: "wait", at: old },
  { id: 9004, product: "check", msg_id: "bz:MKD", via: "ata", result: "wait", at: old });
reports.MKA = [{ msgKey: "MKA", serviceType: "ALIMTALK", reportCode: "10000", reportText: "성공" }];
reports.MKB = [{ msgKey: "MKB", serviceType: "ALIMTALK", reportCode: "63020", reportText: "알림톡 수신 차단" }, { msgKey: "MKB", serviceType: "SMS", reportCode: "10000", reportText: "성공" }];
reports.MKC = [{ msgKey: "MKC", serviceType: "SMS", reportCode: "23003", reportText: "수신번호 형식 오류" }];
reports.MKD = [{ msgKey: "MKD", serviceType: "ALIMTALK", reportCode: "63020", reportText: "알림톡 수신 차단" }];
await call("hqSendCheck", [], undefined, ADM, "ADMIN");
const lg = (id: number) => store.cgg_sendlog.find((x: any) => x.id === id) || {};
check("알림톡 도착(10000 ALIMTALK) → ata", lg(9001).result === "ata", lg(9001));
check("알림톡 실패 뒤 문자 도착 → «문자 대체»(sms)", lg(9002).result === "sms", lg(9002));
check("문자 실패(23003) → fail · 쉬운 글", lg(9003).result === "fail" && /수신번호/.test(lg(9003).err || ""), lg(9003));
check("알림톡만 실패하고 대체 결과 아직 → 기다림(wait) · 체크 줄도 같이 채움", lg(9004).result === "wait", lg(9004));

console.log("⑥ 관리(본사) 화면에서 고르기 — 표 cgg_msg_vendor · 워시·체크 따로 · hq_audit");
Deno.env.delete("MSG_VENDOR");
store.wash_hq[0].ata_cfg.bizgo.senderKey = "SK_BZ";
let st = await call("hqMsgVendor", [], undefined, ADM, "ADMIN");
check("처음(표에 줄 없음) → 워시·체크 모두 solapi · 강제값 없음 · 비즈고 준비 됨", st.result?.wash === "solapi" && st.result?.check === "solapi" && st.result?.force === "" && st.result?.bizgo?.ok === true, st.result);
s0 = sol; b0 = bz.length;
await call("sendMsg", [sms()], rid());
check("표에 줄 없음 → 솔라피로 보냄", sol === s0 + 1 && bz.length === b0);
const own = await call("hqMsgVendorSet", [{ product: "wash", vendor: "bizgo" }], undefined, A, "SHA1");
check("업체 대표 계정은 못 바꿈(본사만)", !!own.__err && !store.cgg_msg_vendor?.length, own);
const badp = await call("hqMsgVendorSet", [{ product: "park", vendor: "bizgo" }], undefined, ADM, "ADMIN");
check("이상한 제품 이름 → 거절", /워시·체크/.test(badp.__err || ""), badp);
const au0 = store.hq_audit.length;
st = await call("hqMsgVendorSet", [{ product: "wash", vendor: "bizgo" }], undefined, ADM, "ADMIN");
check("본사가 워시=비즈고로 바꿈 · 체크는 그대로 솔라피", st.result?.wash === "bizgo" && st.result?.check === "solapi" && store.cgg_msg_vendor.find((x: any) => x.product === "wash")?.vendor === "bizgo", st);
const au = store.hq_audit.slice(au0);
check("hq_audit 에 누가·전→후(try → ok)", au.length === 2 && au.every((x: any) => x.action === "msgVendorSet" && x.product === "wash" && x.who === "01099999999" && x.detail?.before === "solapi" && x.detail?.after === "bizgo") && au[0].result === "try" && au[1].result === "ok", au);
s0 = sol; b0 = bz.length;
await call("sendMsg", [sms()], rid());
check("바꾼 뒤 워시 보내기 → 비즈고", bz.length === b0 + 1 && sol === s0);
Deno.env.set("MSG_VENDOR", "solapi");
await call("sendMsg", [sms()], rid());
check("비상용 강제값 MSG_VENDOR=solapi 가 표보다 먼저", sol === s0 + 1 && bz.length === b0 + 1);
Deno.env.delete("MSG_VENDOR");
Deno.env.delete("BIZGO_API_KEY");
const nr = await call("hqMsgVendorSet", [{ product: "check", vendor: "bizgo" }], undefined, ADM, "ADMIN");
check("비즈고 준비 안 됨(열쇠 없음) → 저장 거절 «비즈고 준비가 안 됐어요»", /비즈고 준비가 안 됐어요/.test(nr.__err || "") && /열쇠/.test(nr.__err || "") && !store.cgg_msg_vendor.some((x: any) => x.product === "check" && x.vendor === "bizgo"), nr);
s0 = sol; b0 = bz.length;
await call("sendMsg", [sms()], rid());
check("이미 비즈고인데 열쇠가 없어짐 → 솔라피로 보내고 hq_audit 에 남김", sol === s0 + 1 && bz.length === b0 && store.hq_audit.some((x: any) => x.action === "msgVendorFallback" && x.product === "wash"), store.hq_audit.slice(-1));
Deno.env.set("BIZGO_API_KEY", "BZKEY-test-only");
store.wash_hq[0].ata_cfg.bizgo.tpl = {};
const nt = await call("hqMsgVendorSet", [{ product: "check", vendor: "bizgo" }], undefined, ADM, "ADMIN");
check("템플릿 코드 0개 → 저장 거절", /템플릿 코드/.test(nt.__err || ""), nt);
store.cgg_msg_vendor.find((x: any) => x.product === "wash").vendor = "kakao";
await call("hqMsgVendor", [], undefined, ADM, "ADMIN");
s0 = sol; b0 = bz.length;
await call("sendMsg", [sms()], rid());
check("표 값이 이상함(kakao) → 솔라피", sol === s0 + 1 && bz.length === b0);
check("판 sb30", JSON.stringify(await call("apiVer", [])).includes("sb30"));

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail || pass === 0) Deno.exit(1);
