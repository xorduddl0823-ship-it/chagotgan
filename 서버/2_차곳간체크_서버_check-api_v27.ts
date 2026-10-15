// ============================================================
//  차곳간체크 — 수파베이스 Edge Function  check-api
//  차곳간 wash-api 와 같은 프로젝트에 따로 둡니다. wash-api 는 손대지 않습니다.
//  부르는 방식은 wash-api 와 똑같습니다:  POST { shop, token, fn, args:[...] }
//
//  배포:
//    supabase functions deploy check-api --no-verify-jwt
//  비밀값 (서버에만 둡니다) — 전부 티와이컴퍼니(차곳간) 것 하나로 공용:
//    ANTHROPIC_KEY, ANTHROPIC_MODEL(기본 claude-haiku-5.5), AI_MAX_DAY(기본 200)
//      ← 사진 읽기 (차곳간워시와 같은 열쇠 · 같은 방식)
//    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//    POPBILL_LINKID, POPBILL_SECRET(또는 POPBILL_SECRETKEY)  ← 티와이컴퍼니 연동신청 값
//    SOLAPI_KEY, SOLAPI_SECRET              ← 티와이컴퍼니 솔라피 계정
//  검사소마다 다른 값은 비밀값이 아니라 check_office 표에 둡니다:
//    biz_no(사업자번호) · popbill_userid(팝빌 회원아이디) · sms_from(보내는 번호)
//  v27 (2026-10-15): 보안 방 보류 사유 ③ — 직원 권한에서 자기 자신의 「비밀번호초기화」를 막음
//    (자기 비밀번호 바꾸기는 기존 비밀번호 확인이 있는 따로 창구로 — 다음 판). 새 SQL 없음.
//  v26 (2026-10-15): 보안 방 요청 — 사무실 로그인(login) 5번 틀리면 10분 잠금(check_deliv_attempt 재사용, 열쇠 office:번호).
//    비밀번호가 빈 계정(새 직원 · 초기화)은 처음 비밀번호(6자 이상)를 문자 6자리 확인 뒤에 정함 → 새 창구 loginCode.
//    배포 전에 서버/sql/02 와 서버/sql/04_체크_첫비밀번호_문자확인.sql 실행. 문자 보내는 번호는 비밀값 SMS_FROM(워시와 같은 이름) → 없으면 검사소 sms_from.
//  v25 (2026-10-15): 체크 방 요청(2026-10-15) — 「직원 권한」 창구 staffList · staffAdd · staffEdit (대표만). 새 SQL 없음.
//    직원은 비밀번호 없이 넣고 처음 로그인 때 정함(지금 로그인 규칙 그대로). 자기 자신을 멈추거나 대표 권한을 빼지 못함.
//    경비실 명단(cgg_access): 그 번호가 이미 명단에 있으면 check 를 더하고/빼고, 없으면 만들지 않음(체크 로그인은 그대로 됨).
//  v24 (2026-10-15): 체크 방 요청(2026-10-14) — 「가온」 고정값 정리. 새 SQL 없음.
//    ① 관리(ADMIN) 계정이 검사소를 안 고르면 가온으로 열지 않고 「검사소를 골라 주세요」
//    ② 사진 읽기(aiJson·aiPlate·aiCard·aiBiz)는 검사소를 모르면 거절 (가온 한도를 대신 쓰지 않음)
//    ④ 예전 자료 가져오기(importLegacy)는 가온(GAON) 검사소만 — 화면에서 숨기는 것과 별도로 서버가 막음
//    (③ 기사를 검사소까지 보고 찾기는 v22·v23 에서 끝)
//  v23 (2026-10-15): 배포 전에 서버/sql/02_체크_기사_로그인_보안.sql 을 SQL Editor 에서 한 번 실행해야 합니다.
//    기사 로그인 5번 틀리면 10분 잠금 · 같은 이름은 회사 기사 비밀번호로 구분 · 새 비밀번호 6자 이상 ·
//    사무실 기사 목록에 「가입신청」 표시 (보안 재검사 2026-10-14 A·B·C)
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const VER = "check-api v27 · 2026-10-15 (자기 비밀번호 초기화 막기)";
const JSON_HEAD = { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" };

/* ───────── 작은 도구들 ───────── */
const S = (v: unknown) => String(v ?? "").trim();
const N = (v: unknown) => Math.round(Number(String(v ?? "").replace(/[^0-9.-]/g, "")) || 0);
const norm = (v: unknown) => S(v).replace(/\s|\(주\)|㈜|주식회사/g, "");
const ymOf = (d: string) => S(d).slice(0, 7);
function ok(result: unknown) { return new Response(JSON.stringify({ result }), { headers: JSON_HEAD }); }
function err(message: string, code = 200) {
  return new Response(JSON.stringify({ __err: message }), { status: code, headers: JSON_HEAD });
}

/* ───────── 로그인 · 권한 ─────────
   차곳간(wash) 계정을 그대로 씁니다. 세션 열쇠(sid)로 사람을 찾고,
   그 사람이 들어갈 수 있는 검사소(office)를 돌려줍니다. */
/* ───────── 비밀번호 섞기 (PBKDF2) ───────── */
async function pwHash(pw: string, saltHex = "") {
  const salt = saltHex ? hex2b(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" }, key, 256);
  return b2hex(salt) + "$" + b2hex(new Uint8Array(bits));
}
async function pwOk(pw: string, stored: string) {
  const [saltHex, want] = S(stored).split("$");
  if (!saltHex || !want) return false;
  const made = await pwHash(pw, saltHex);
  return made.split("$")[1] === want;
}
function b2hex(b: Uint8Array) { return [...b].map((x) => x.toString(16).padStart(2, "0")).join(""); }
function hex2b(h: string) {
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
  return out;
}

/** 사무실 로그인 시도 횟수 — 비밀번호를 보기 전에 올립니다 (기사 로그인과 같은 함수 · 5번 틀리면 10분 잠금) */
async function officeAttempt(key: string) {
  const { data, error } = await db.rpc("check_deliv_attempt", { p_key: key });
  if (error) throw new Error("서버 준비 중입니다 (로그인 보안 SQL 02 를 먼저 실행해야 합니다). 대표님께 알려 주세요.");
  if (data === false) throw new Error("비밀번호를 여러 번 틀려 10분 동안 잠겼습니다. 잠시 뒤 다시 해 주세요.");
}
async function officeAttemptOk(key: string) {
  await db.from("check_deliv_fail").delete().eq("key", key);
}
/** 확인 번호가 필요할 때 — 화면이 확인 번호 칸을 열 수 있게 __need: "code" 를 함께 보냅니다 */
class NeedCode extends Error { need = "code"; }
const FIRST_PW_MIN = 6;
const FIRST_CODE_MIN = 5;
async function sha256hex(s: string) {
  return b2hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))));
}
function sameText(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
async function usersOf(phone: string) {
  const { data: users } = await db.from("check_user")
    .select("id, office_id, phone, name, role, active, pw_hash, check_office(*)")
    .eq("phone", phone).eq("active", true);
  if (!users?.length) throw new Error("들어갈 수 있는 검사소가 없습니다. 대표님께 권한을 받아 주세요.");
  return users;
}
function pickUser(users: any[], shopCode: string) {
  const code = S(shopCode).toUpperCase();
  return code ? users.find((u: any) => S(u.check_office?.code).toUpperCase() === code) ?? users[0] : users[0];
}
async function openSession(phone: string, me: any, users: any[], ua: string, first: boolean) {
  const sid = "chk_" + b2hex(crypto.getRandomValues(new Uint8Array(24)));
  const exp = new Date(Date.now() + 14 * 86400000).toISOString();
  await db.from("check_session").delete().eq("phone", phone);
  await db.from("check_session").insert({
    sid, phone, office_id: me.office_id, role: S(me.role) || "staff",
    ua: S(ua).slice(0, 250), expires_at: exp,
  });
  await db.from("check_user").update({ last_in: new Date().toISOString() }).eq("id", me.id);
  return {
    ok: true, key: sid, expires: exp,
    who: S(me.name) || phone, role: S(me.role) || "staff",
    shop: S(me.check_office?.code), shopName: S(me.check_office?.name),
    offices: users.map((u: any) => ({ code: S(u.check_office?.code), name: S(u.check_office?.name) })),
    first,
  };
}

/** 로그인 — [휴대폰, 비밀번호, (검사소코드)]
 *  v26: 5번 틀리면 10분 잠금. 비밀번호를 아직 안 정한 분은 휴대폰 문자 확인 뒤에 정해집니다 (loginCode). */
async function login(_c: Ctx, phoneRaw: string, pwRaw: string, shopCode = "", ua = "") {
  const phone = S(phoneRaw).replace(/[^0-9]/g, "");
  const pw = S(pwRaw);
  if (phone.length < 10) throw new Error("휴대폰 번호를 다시 확인해 주세요.");
  if (pw.length < 4) throw new Error("비밀번호는 4자 이상으로 적어 주세요.");
  await officeAttempt("office:" + phone);

  const users = await usersOf(phone);
  const me: any = pickUser(users, shopCode);

  if (!S(me.pw_hash)) {
    /* 처음 비밀번호 — 바로 정하지 않고 휴대폰으로 확인 번호를 보냅니다 (번호를 아는 다른 사람이 먼저 정하지 못하게) */
    if (pw.length < FIRST_PW_MIN) throw new Error(`처음 정하는 비밀번호는 ${FIRST_PW_MIN}자 이상으로 적어 주세요.`);
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
    await db.from("check_pw_first").delete().eq("phone", phone);
    const { error } = await db.from("check_pw_first").insert({
      phone, user_id: S(me.id), code_hash: await sha256hex(phone + ":" + code), pw_hash: await pwHash(pw),
      expires_at: new Date(Date.now() + FIRST_CODE_MIN * 60000).toISOString(),
    });
    if (error) throw new Error("서버 준비 중입니다 (첫 비밀번호 SQL 04 를 먼저 실행해야 합니다). 대표님께 알려 주세요.");
    await officeAttemptOk("pwcode:" + phone);
    const from = (Deno.env.get("SMS_FROM") ?? "").replace(/[^0-9]/g, "") || S(me.check_office?.sms_from).replace(/[^0-9]/g, "");
    if (!from) throw new Error("문자 보내는 번호가 서버에 없습니다. 대표님께 알려 주세요.");
    try {
      await solapi("POST", "/messages/v4/send-many/detail", { messages: [{ to: phone, from, type: "SMS",
        text: `[차곳간체크] 확인 번호 ${code} (${FIRST_CODE_MIN}분 안에 넣어 주세요)` }] });
    } catch (e) {
      console.error("first-pw sms", e);
      throw new Error("확인 문자를 보내지 못했습니다. 잠시 뒤 다시 해 주세요.");
    }
    throw new NeedCode("처음 쓰는 비밀번호예요. 휴대폰으로 보낸 확인 번호 6자리를 넣어 주세요.");
  }
  if (!(await pwOk(pw, me.pw_hash))) throw new Error("번호 또는 비밀번호가 맞지 않습니다.");
  await officeAttemptOk("office:" + phone);
  return await openSession(phone, me, users, ua, false);
}

/** 처음 비밀번호 확인 — [휴대폰, 확인번호 6자리, (검사소코드)] → 맞으면 login 때 적은 비밀번호가 정해지고 바로 들어갑니다 */
async function loginCode(_c: Ctx, phoneRaw: string, codeRaw: string, shopCode = "", ua = "") {
  const phone = S(phoneRaw).replace(/[^0-9]/g, "");
  const code = S(codeRaw).replace(/[^0-9]/g, "");
  if (phone.length < 10) throw new Error("휴대폰 번호를 다시 확인해 주세요.");
  await officeAttempt("pwcode:" + phone);
  const { data: t } = await db.from("check_pw_first").select("*").eq("phone", phone).maybeSingle();
  if (!t || new Date(S(t.expires_at)).getTime() < Date.now()) {
    if (t) await db.from("check_pw_first").delete().eq("phone", phone);
    throw new Error("확인 시간이 지났습니다. 처음부터 다시 로그인해 주세요.");
  }
  if (!sameText(await sha256hex(phone + ":" + code), S(t.code_hash)))
    throw new Error("확인 번호가 맞지 않습니다.");
  await db.from("check_pw_first").delete().eq("phone", phone);
  await officeAttemptOk("pwcode:" + phone);
  await officeAttemptOk("office:" + phone);
  const users = await usersOf(phone);
  const me: any = users.find((u: any) => S(u.id) === S(t.user_id)) ?? pickUser(users, shopCode);
  if (S(me.pw_hash)) throw new Error("이미 비밀번호가 정해진 계정입니다. 그 비밀번호로 로그인해 주세요.");
  await db.from("check_user").update({ pw_hash: t.pw_hash }).eq("id", me.id);
  return await openSession(phone, me, users, ua, true);
}

/** 나가기 */
async function logout(ctx: Ctx, key: string) {
  await db.from("check_session").delete().eq("sid", S(key));
  void ctx; return { ok: true };
}

/** 체크를 써도 되는 계정인지 경비실 명단으로 확인합니다.
 *  - 명단에 있으면: active 이고 products 에 check 가 있어야 통과
 *  - 명단에 없으면: 체크 자체 로그인(chk_)은 예전처럼 통과, 워시 로그인 열쇠로는 거절
 *    (워시만 가진 계정이 워시 열쇠로 체크를 부르는 길을 막습니다) */
async function needCheck(phone: string, ownLogin: boolean) {
  const { data: acc, error } = await db.from("cgg_access")
    .select("products, active").eq("phone", phone).maybeSingle();
  if (error) {
    if (ownLogin) return;
    throw new Error("서버 준비 중입니다 (cgg_access 표 없음). 대표님께 알려 주세요.");
  }
  if (!acc) {
    if (ownLogin) return;
    throw new Error("이 계정은 체크를 쓸 권한이 없습니다. 대표님께 권한을 받아 주세요.");
  }
  const list: string[] = Array.isArray(acc.products) ? acc.products : [];
  if (acc.active === false || !list.includes("check"))
    throw new Error("이 계정은 체크를 쓸 권한이 없습니다. 대표님께 권한을 받아 주세요.");
}

async function whoIs(shop: string, token: string) {
  const sid = S(token);
  if (!sid) throw new Error("로그인이 필요합니다.");

  let phone = "", isAdmin = false;

  // ① 차곳간체크 자체 로그인
  if (sid.startsWith("chk_")) {
    const { data: cs } = await db.from("check_session")
      .select("sid, phone, office_id, role, expires_at").eq("sid", sid).maybeSingle();
    if (!cs) throw new Error("로그인이 풀렸습니다. 다시 로그인해 주세요.");
    if (cs.expires_at && new Date(cs.expires_at).getTime() < Date.now())
      throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
    phone = S(cs.phone).replace(/[^0-9]/g, "");
  } else {
    // ② 차곳간(워시) 로그인도 그대로 받습니다
    const { data: ses } = await db.from("wash_sessions")
      .select("sid, phone, shop, role, expires_at").eq("sid", sid).maybeSingle();
    if (!ses) throw new Error("로그인이 풀렸습니다. 다시 로그인해 주세요.");
    if (ses.expires_at && new Date(ses.expires_at).getTime() < Date.now())
      throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
    phone = S(ses.phone).replace(/[^0-9]/g, "");
    isAdmin = S(ses.shop).toUpperCase() === "ADMIN";
  }

  // ①-2 경비실 출입 명단(cgg_access) — 체크 권한이 있는 계정만 (v22)
  if (!isAdmin) await needCheck(phone, sid.startsWith("chk_"));

  // ② 어느 검사소로 들어갈지 — 화면이 보낸 shop(검사소 코드)이 없으면 그 사람의 첫 검사소
  let office: any = null;
  const code = S(shop).toUpperCase();
  if (code) {
    const { data } = await db.from("check_office").select("*").eq("code", code).maybeSingle();
    office = data;
  }
  if (!office) {
    const { data: mine } = await db.from("check_user")
      .select("office_id, role, check_office(*)").eq("phone", phone).eq("active", true).limit(1);
    office = mine?.[0]?.check_office ?? null;
  }
  if (!office) {
    if (!isAdmin) throw new Error("들어갈 수 있는 검사소가 없습니다. 대표님께 권한을 받아 주세요.");
    /* v24: 예전에는 가온(GAON)으로 열었습니다. 다른 검사소 자료가 섞이지 않게 직접 고르게 합니다 */
    throw new Error("검사소를 골라 주세요. (관리 계정은 들어갈 검사소 코드를 함께 보내야 합니다)");
  }
  if (!office) throw new Error("검사소를 찾지 못했습니다.");

  // ③ 그 검사소에 들어갈 수 있는 사람인지 (차곳간 본사 ADMIN 은 모두 가능)
  let role = "staff";
  if (isAdmin) role = "owner";
  else {
    const { data: me } = await db.from("check_user").select("role, name, active")
      .eq("office_id", office.id).eq("phone", phone).maybeSingle();
    if (!me || me.active === false) throw new Error("이 검사소에 들어갈 권한이 없습니다. (" + phone + ")");
    role = S(me.role) || "staff";
  }
  return { office, who: phone, role };
}

/* ============================================================
   1. 거래처 · 딜러 · 청구처(묶음)
   ============================================================ */

/** 딜러 목록 — 청구처(묶음)까지 같이 돌려줍니다 */
async function dealers(ctx: Ctx) {
  const { data } = await db.from("check_dealer")
    .select("*, company:check_company(id,name,biz_no), billTo:bill_to_id(id,name)")
    .eq("office_id", ctx.office.id).order("name");
  return data ?? [];
}

/** 딜러 한 명 저장 (청구처 · 발행처 포함) */
async function dealerSave(ctx: Ctx, row: Record<string, unknown>) {
  const body = {
    office_id: ctx.office.id,
    name: S(row.name),
    company_id: row.company_id ?? null,
    tel: S(row.tel),
    tels: row.tels ?? [],
    bill_to_id: row.bill_to_id ?? null,          // ← 청구처 (비우면 자기 자신)
    issuer_kind: S(row.issuer_kind) || "company",
    issuer_name: S(row.issuer_name),
    issuer_biz: S(row.issuer_biz),
    issuer_ceo: S(row.issuer_ceo),
    issuer_addr: S(row.issuer_addr),
    tax_issue: row.tax_issue !== false,
    memo: S(row.memo),
  };
  if (!body.name) throw new Error("딜러 이름을 넣어 주세요.");
  if (row.id) {
    const { data, error } = await db.from("check_dealer").update(body).eq("id", row.id)
      .eq("office_id", ctx.office.id).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  const { data, error } = await db.from("check_dealer").insert(body).select().single();
  if (error) throw new Error(error.message);
  return data;
}

/** 여러 딜러를 한 청구처로 묶기 / 풀기
 *  scope: "always" = 거래처에 기억 (다음 달부터 계속)
 *         "month"  = 이번 달만 (check_bill_override)
 *  billToId 가 비면 묶음을 풉니다. */
async function billGroupSet(ctx: Ctx, dealerIds: string[], billToId: string | null, scope: string, ym: string) {
  const ids = (dealerIds || []).filter(Boolean);
  if (!ids.length) throw new Error("묶을 딜러를 골라 주세요.");
  if (billToId && ids.includes(billToId)) throw new Error("청구처로 고른 딜러는 묶을 목록에서 빼 주세요.");
  if (scope === "month") {
    if (!ym) throw new Error("어느 달인지 알려 주세요.");
    const rows = ids.map((id) => ({ office_id: ctx.office.id, ym, dealer_id: id, bill_to_id: billToId }));
    const { error } = await db.from("check_bill_override").upsert(rows, { onConflict: "office_id,ym,dealer_id" });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await db.from("check_dealer").update({ bill_to_id: billToId })
      .in("id", ids).eq("office_id", ctx.office.id);
    if (error) throw new Error(error.message);
  }
  await log(ctx, billToId ? "청구처 묶기" : "청구처 풀기", { ids, billToId, scope, ym });
  return { ok: true, n: ids.length };
}

/** 묶기 추천 — 발행처 사업자등록번호가 같은데 청구처가 나뉜 곳 */
async function billGroupHints(ctx: Ctx) {
  const list = await dealers(ctx);
  const by: Record<string, { biz: string; issuer: string; names: string[]; ids: string[] }> = {};
  for (const d of list as any[]) {
    const biz = S(d.issuer_biz) || S(d.company?.biz_no);
    if (!biz || d.bill_to_id) continue;
    (by[biz] ||= { biz, issuer: S(d.issuer_name) || S(d.company?.name), names: [], ids: [] });
    by[biz].names.push(d.name); by[biz].ids.push(d.id);
  }
  return Object.values(by).filter((g) => g.names.length > 1);
}

/* ============================================================
   2. 청구서 만들기 — 여기서 묶음이 적용됩니다
   ============================================================ */

/** 그달 청구처 지도: 딜러 id → 청구처 딜러 id
 *  ① 거래처에 기억해 둔 bill_to_id 를 먼저 쓰고
 *  ② 이번 달만 바꾼 것(check_bill_override)이 있으면 그것이 이깁니다. */
async function billMap(ctx: Ctx, ym: string) {
  const list = await dealers(ctx) as any[];
  const map = new Map<string, string>();
  for (const d of list) map.set(d.id, d.bill_to_id || d.id);
  const { data: ov } = await db.from("check_bill_override").select("dealer_id,bill_to_id")
    .eq("office_id", ctx.office.id).eq("ym", ym);
  for (const o of ov ?? []) map.set(o.dealer_id, o.bill_to_id || o.dealer_id);
  // 두 단계(가→나→다)로 이어진 묶음도 끝까지 따라갑니다
  const head = (id: string, depth = 0): string => {
    const next = map.get(id) || id;
    return (next === id || depth > 5) ? id : head(next, depth + 1);
  };
  const out = new Map<string, string>();
  for (const d of list) out.set(d.id, head(d.id));
  return { map: out, dealers: new Map(list.map((d) => [d.id, d])) };
}

/** 청구서 보기 주소에 쓰는 열쇠글 (사람마다 다릅니다) */
function viewKey() {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return [...b].map((x) => x.toString(36).padStart(2, "0")).join("").slice(0, 18);
}

/** 단가표에서 그 검사일에 맞는 단가 찾기 */
function priceOf(bands: any[], date: string, code: string) {
  const b = bands.filter((x) => x.from_date <= date).sort((a, z) => a.from_date < z.from_date ? 1 : -1)[0];
  const it = (b?.items ?? []).find((i: any) => S(i.code) === S(code));
  return it ? { name: S(it.name), price: N(it.price) } : null;
}

/** 월별 청구서 만들기 */
async function invoiceBuild(ctx: Ctx, ym: string, opt: Record<string, unknown> = {}) {
  if (!/^\d{4}-\d{2}$/.test(S(ym))) throw new Error("청구 월을 2026-09 모양으로 알려 주세요.");
  const vat = 1 + (Number(ctx.office.vat_rate ?? 10) / 100);
  const { map, dealers: dmap } = await billMap(ctx, ym);
  const { data: bands } = await db.from("check_price_band").select("*").eq("office_id", ctx.office.id);
  const from = ym + "-01", to = ymNext(ym);

  const { data: cars } = await db.from("check_car").select("*")
    .eq("office_id", ctx.office.id).gte("check_date", from).lt("check_date", to);
  const { data: reps } = await db.from("check_repair").select("*")
    .eq("office_id", ctx.office.id).eq("bill_month", ym);

  type Grp = {
    head: any; members: Set<string>; fee: number; ext: number; rep: number;
    dom: number; imp: number; etc: number; rows: any[];
  };
  const G = new Map<string, Grp>();
  const grp = (dealerId: string) => {
    const headId = map.get(dealerId) || dealerId;
    const head = dmap.get(headId);
    if (!head) return null;
    let g = G.get(headId);
    if (!g) { g = { head, members: new Set(), fee: 0, ext: 0, rep: 0, dom: 0, imp: 0, etc: 0, rows: [] }; G.set(headId, g); }
    const me = dmap.get(dealerId);
    if (me) g.members.add(me.name);
    return g;
  };

  for (const c of cars ?? []) {
    if (!c.dealer_id) continue;
    const g = grp(c.dealer_id); if (!g) continue;
    const pr = priceOf(bands ?? [], c.check_date, c.goods);
    // 선납_* 는 검사비를 이미 받은 건이라 건수만 세고 금액은 0원 (재검과 같은 방식)
    const pre = /^선납/.test(S(c.goods));
    const unit = pre ? 0 : (pr ? pr.price : Math.max(0, Math.round(N(c.amount) / vat) - N(c.ins_fee)));
    const amount = Math.round(unit * vat);
    const kind = S(c.src) === "전산외" ? "ext" : "fee";
    if (kind === "ext") g.ext += amount; else g.fee += amount;
    const nm = S(pr?.name || c.goods);
    if (nm.includes("국산")) g.dom++; else if (nm.includes("수입")) g.imp++; else g.etc++;
    g.rows.push({ kind, dealer_name: dmap.get(c.dealer_id)?.name ?? "", item: nm || S(c.goods),
      qty: 1, unit, amount, car_id: c.id });
  }
  for (const r of reps ?? []) {
    if (r.exempt) continue;
    if (!r.dealer_id) continue;
    const g = grp(r.dealer_id); if (!g) continue;
    g.rep += N(r.amount);
    g.rows.push({ kind: "repair", dealer_name: dmap.get(r.dealer_id)?.name ?? "",
      item: S(r.reason) || "정비비", qty: 1, unit: N(r.amount), amount: N(r.amount), repair_id: r.id });
  }

  // 이번 달 것을 지우고 새로 씁니다 (같은 달을 다시 만들어도 쌓이지 않게)
  const { data: old } = await db.from("check_invoice").select("id").eq("office_id", ctx.office.id).eq("ym", ym);
  if (old?.length) await db.from("check_invoice").delete().in("id", old.map((x) => x.id));

  const keepZero = opt.keepZero === true;
  const made: any[] = [];
  for (const g of G.values()) {
    const total = g.fee + g.ext + g.rep;
    if (!total && !keepZero) continue;
    const comp = g.head.company_id ? (await db.from("check_company").select("name,biz_no")
      .eq("id", g.head.company_id).maybeSingle()).data : null;
    const issuerKind = S(g.head.issuer_kind) || "company";
    const inv = {
      office_id: ctx.office.id, ym,
      bill_to_id: g.head.id, bill_to_name: g.head.name,
      members: [...g.members].sort((a, b) => a === g.head.name ? -1 : b === g.head.name ? 1 : a.localeCompare(b, "ko")),
      company_name: S(comp?.name),
      issuer_kind: issuerKind,
      issuer_name: issuerKind === "dealer" ? S(g.head.issuer_name) : (issuerKind === "company" ? S(comp?.name) : ""),
      issuer_biz: issuerKind === "dealer" ? S(g.head.issuer_biz) : (issuerKind === "company" ? S(comp?.biz_no) : ""),
      fee_amount: g.fee, ext_amount: g.ext, repair_amount: g.rep, total_amount: total,
      dom_n: g.dom, imp_n: g.imp, etc_n: g.etc,
      tax_issue: g.head.tax_issue !== false && issuerKind !== "none",
      view_key: viewKey(),
    };
    const { data: saved, error } = await db.from("check_invoice").insert(inv).select().single();
    if (error) throw new Error(error.message);
    if (g.rows.length) {
      const rows = g.rows.map((r) => ({ ...r, invoice_id: saved.id }));
      await db.from("check_invoice_row").insert(rows);
    }
    made.push(saved);
  }
  await log(ctx, "청구서 만듦", { ym, n: made.length });
  made.sort((a, b) => b.total_amount - a.total_amount);
  return { ym, n: made.length, list: made };
}

/** 청구서 목록 (묶음·포함 딜러까지) */
async function invoiceList(ctx: Ctx, ym: string, auto?: boolean) {
  const { data } = await db.from("check_invoice").select("*")
    .eq("office_id", ctx.office.id).eq("ym", ym).order("total_amount", { ascending: false });
  if ((data ?? []).length || auto === false) return data ?? [];
  /* 아직 안 만든 달이면, 그 달 차가 있을 때 저절로 만들어 줍니다 */
  const { count } = await db.from("check_car").select("id", { count: "exact", head: true })
    .eq("office_id", ctx.office.id).gte("check_date", ym + "-01").lt("check_date", ymNext(ym))
    .not("dealer_id", "is", null);
  if (!count) return [];
  const built = await invoiceBuild(ctx, ym);
  return built.list ?? [];
}

/** 이 달 자료가 청구서보다 새것인지 (엑셀을 다시 올렸을 때 알려 주려고) */
async function billState(ctx: Ctx, ym: string) {
  const from = S(ym) + "-01", to = ymNext(S(ym));
  const { data: inv } = await db.from("check_invoice").select("created_at")
    .eq("office_id", ctx.office.id).eq("ym", S(ym)).order("created_at").limit(1);
  const { count: cars } = await db.from("check_car").select("id", { count: "exact", head: true })
    .eq("office_id", ctx.office.id).gte("check_date", from).lt("check_date", to);
  const { count: linked } = await db.from("check_car").select("id", { count: "exact", head: true })
    .eq("office_id", ctx.office.id).gte("check_date", from).lt("check_date", to)
    .not("dealer_id", "is", null);
  const builtAt = inv?.[0]?.created_at ?? null;
  let stale = false;
  if (builtAt) {
    const { count: newer } = await db.from("check_car").select("id", { count: "exact", head: true })
      .eq("office_id", ctx.office.id).gte("check_date", from).lt("check_date", to)
      .gt("created_at", builtAt);
    stale = (newer ?? 0) > 0;
  }
  return { ym: S(ym), cars: cars ?? 0, linked: linked ?? 0, noDealer: (cars ?? 0) - (linked ?? 0),
    built: !!builtAt, builtAt: builtAt ? fmtTs(new Date(new Date(builtAt).getTime() + KST)) : "",
    stale };
}

/** 청구서 한 장의 내역 */
async function invoiceRows(ctx: Ctx, invoiceId: string) {
  const { data } = await db.from("check_invoice_row").select("*").eq("invoice_id", invoiceId);
  return data ?? [];
}

/** 알림톡·문자 버튼이 여는 청구서 한 장 — 로그인 없이 열쇠글로만 봅니다 */
async function invoiceView(_c: Ctx, key: string) {
  const k = S(key).replace(/[^A-Za-z0-9_-]/g, "");
  if (k.length < 8) throw new Error("주소가 올바르지 않습니다.");
  const { data: inv } = await db.from("check_invoice").select("*").eq("view_key", k).maybeSingle();
  if (!inv) throw new Error("청구서를 찾지 못했습니다. 주소를 다시 확인해 주세요.");
  const { data: rows } = await db.from("check_invoice_row").select("*").eq("invoice_id", inv.id);
  const { data: off } = await db.from("check_office")
    .select("name, biz_no, owner_name, tel, bank_fee, bank_repair").eq("id", inv.office_id).maybeSingle();
  await db.from("check_invoice").update({
    view_at: new Date().toISOString(), view_n: N(inv.view_n) + 1,
  }).eq("id", inv.id);
  return { invoice: inv, rows: rows ?? [], office: off ?? {} };
}

/** 들어온 돈 목록 */
async function depositList(ctx: Ctx, opt: { days?: number } = {}) {
  const days = Math.min(120, Math.max(1, opt.days ?? 31));
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await db.from("check_deposit").select("*")
    .eq("office_id", ctx.office.id).gte("tx_at", since)
    .order("tx_at", { ascending: false }).limit(1000);
  return data ?? [];
}

/** 청구서 화면에서 청구처 바꾸기 (그 자리에서 다시 만듭니다) */
async function invoiceMove(ctx: Ctx, ym: string, dealerIds: string[], billToId: string | null, scope: string) {
  await billGroupSet(ctx, dealerIds, billToId, scope || "month", ym);
  return await invoiceBuild(ctx, ym);
}

/* ============================================================
   3. 팝빌 — 링크허브 토큰 방식
   ============================================================
   · 링크아이디 · 비밀키 : 티와이컴퍼니(운영사) 것 하나를 모든 검사소가 같이 씁니다.
   · 사업자번호 · 회원아이디 : 검사소마다 다르므로 check_office 에서 꺼내 씁니다.
   · 연동테스트 : check_office.popbill_test 가 참이면 팝빌 테스트 서버로 붙습니다.
     (테스트는 test.popbill.com 에서 만든 아이디 · 사업자번호를 씁니다)
   ------------------------------------------------------------
   순서 : ① auth.linkhub.co.kr 에서 토큰 받기 → ② 팝빌에 Bearer 로 부르기
   ============================================================ */
const POPBILL = {
  linkId: Deno.env.get("POPBILL_LINKID") ?? "",
  /* 비밀값 이름이 POPBILL_SECRET 이든 POPBILL_SECRETKEY 든 둘 다 받습니다 */
  secret: Deno.env.get("POPBILL_SECRETKEY") ?? Deno.env.get("POPBILL_SECRET") ?? "",
};
const LH_AUTH = "https://auth.linkhub.co.kr";
const LH_VER = "2.0";
/** 계좌조회(180) · 세금계산서(110) 를 한 토큰으로 같이 씁니다 */
const POP_SCOPES = ["member", "110", "180"];

function popHost(test: boolean) {
  return test ? "https://popbill-test.linkhub.co.kr" : "https://popbill.linkhub.co.kr";
}
function popService(test: boolean) { return test ? "POPBILL_TEST" : "POPBILL"; }

/** 이 검사소의 팝빌 정보 (사업자번호 · 회원아이디 · 테스트 여부) */
function popWho(office: any) {
  const corp = S(office?.popbill_corp || office?.biz_no).replace(/[^0-9]/g, "");
  const user = S(office?.popbill_userid);
  const test = office?.popbill_test === true;
  if (!POPBILL.linkId || !POPBILL.secret)
    throw new Error("팝빌 연동값(티와이컴퍼니)이 서버에 없습니다. POPBILL_LINKID · POPBILL_SECRETKEY 를 넣어 주세요.");
  if (!corp) throw new Error("이 검사소의 사업자번호가 비어 있습니다. 설정 → 팝빌에서 넣어 주세요.");
  if (!user) throw new Error("이 검사소의 팝빌 회원아이디가 비어 있습니다. 설정 → 팝빌에서 넣어 주세요.");
  return { corp, user, test };
}

/* 토큰은 사업자번호 + 서버별로 따로 담아 둡니다 (보통 1시간짜리) */
const popTokens = new Map<string, { token: string; until: number }>();

async function sha256b64(s: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return btoa(String.fromCharCode(...new Uint8Array(h)));
}
function b64bytes(s: string) {
  const bin = atob(s); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function hmacB64(secretB64: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", b64bytes(secretB64),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(mac)));
}

/** ① 링크허브에서 토큰 받기 */
async function popToken(corp: string, test: boolean): Promise<string> {
  const ck = (test ? "T|" : "P|") + corp;
  const got = popTokens.get(ck);
  if (got && got.until > Date.now() + 60_000) return got.token;

  const svc = popService(test);
  const uri = "/" + svc + "/Token";
  const body = JSON.stringify({ access_id: corp, scope: POP_SCOPES });
  const xDate = new Date().toISOString();
  const digest = await sha256b64(body);
  const target = ["POST", digest, xDate, LH_VER, uri].join("\n");
  const sign = await hmacB64(POPBILL.secret, target);

  const res = await fetch(LH_AUTH + uri, {
    method: "POST",
    headers: {
      "x-lh-date": xDate, "x-lh-version": LH_VER,
      "Authorization": "LINKHUB " + POPBILL.linkId + " " + sign,
      "Content-Type": "application/json; charset=utf-8",
    },
    body,
  });
  const txt = await res.text();
  let j: any = null; try { j = JSON.parse(txt); } catch { /* 아래에서 알림 */ }
  if (!j || !j.session_token) throw new Error(popWhy(txt, corp, test));
  const until = Date.parse(S(j.expiration)) || (Date.now() + 50 * 60_000);
  popTokens.set(ck, { token: S(j.session_token), until });
  return S(j.session_token);
}

/** 팝빌이 돌려준 오류를 사람 말로 */
function popWhy(txt: string, corp: string, test: boolean) {
  const m = S(txt);
  const where = test ? "연동테스트(test.popbill.com)" : "실제 팝빌(www.popbill.com)";
  if (/-10001|not\s*joined|가입/i.test(m))
    return `${where} 에 사업자번호 ${corp} 로 가입된 회원이 없습니다. 그쪽에서 먼저 가입하고, 사업자번호가 같은지 보세요. (${m.slice(0,120)})`;
  if (/-10003|-10002|linkid|secret|인증/i.test(m))
    return `팝빌 링크아이디 · 비밀키가 맞지 않습니다. 수파베이스 비밀값 POPBILL_LINKID · POPBILL_SECRETKEY 를 보세요. (${m.slice(0,120)})`;
  if (/-10015|ip/i.test(m))
    return `팝빌에서 이 서버 아이피를 막고 있습니다. 팝빌 › 연동정보에서 «IP 제한»을 꺼 주세요. (${m.slice(0,120)})`;
  return "팝빌에 들어가지 못했습니다 : " + m.slice(0, 200);
}

/** ② 팝빌 부르기 (Bearer) */
async function popCall(path: string, method: string, body: string, office: any, over = "") {
  const w = popWho(office);
  const tk = await popToken(w.corp, w.test);
  const head: Record<string, string> = {
    "Authorization": "Bearer " + tk,
    "x-pb-userid": w.user,
    "Content-Type": "application/json; charset=utf-8",
  };
  if (over) head["X-HTTP-Method-Override"] = over;   // ISSUE · DELETE 같은 것
  const res = await fetch(popHost(w.test) + path, {
    method, headers: head, body: body || undefined,
  });
  const txt = await res.text();
  let j: any = null; try { j = JSON.parse(txt); } catch { /* 아래에서 */ }
  if (j === null) throw new Error("팝빌 응답을 읽지 못했습니다 : " + txt.slice(0, 200));
  if (j.code !== undefined && N(j.code) < 0) throw new Error("팝빌 : " + S(j.message) + " (" + S(j.code) + ")");
  return j;
}

/** 토큰 없이 부르는 팝빌 (회원가입 · 아이디 확인 · 회원 확인) */
async function popOpen(path: string, method: string, body: string, test: boolean) {
  if (!POPBILL.linkId) throw new Error("서버에 팝빌 링크아이디가 없습니다.");
  const res = await fetch(popHost(test) + path, {
    method, headers: { "Content-Type": "application/json; charset=utf-8" },
    body: body || undefined,
  });
  const txt = await res.text();
  let j: any = null; try { j = JSON.parse(txt); } catch { /* 아래에서 */ }
  if (j === null) throw new Error("팝빌 응답을 읽지 못했습니다 : " + txt.slice(0, 200));
  return j;
}

/** 이 사업자번호가 이미 팝빌 회원인지 */
async function popMember(ctx: Ctx, corpNum?: string) {
  const test = ctx.office.popbill_test === true;
  const corp = S(corpNum || ctx.office.popbill_corp || ctx.office.biz_no).replace(/[^0-9]/g, "");
  if (corp.length !== 10) throw new Error("사업자번호를 - 없이 10자리로 넣어 주세요.");
  const j = await popOpen(`/Join?CorpNum=${corp}&LID=${encodeURIComponent(POPBILL.linkId)}`, "GET", "", test);
  /* code 1 = 이미 가입됨 · -11000012 = 아직 아님 */
  const code = N(j?.code);
  return { corp, test, joined: code === 1, code, message: S(j?.message) };
}

/** 쓰려는 아이디가 비어 있는지 */
async function popIdCheck(ctx: Ctx, id: string) {
  const test = ctx.office.popbill_test === true;
  const j = await popOpen("/IDCheck?ID=" + encodeURIComponent(S(id)), "GET", "", test);
  const code = N(j?.code);
  return { free: code === 1, code, message: S(j?.message) };
}

/** 이 검사소를 팝빌 회원으로 가입시킵니다 (연동사 = 티와이컴퍼니 밑으로) */
async function popJoin(ctx: Ctx, form: any) {
  if (ctx.role !== "owner") throw new Error("대표님만 가입시킬 수 있습니다.");
  const o = ctx.office;
  const test = o.popbill_test === true;
  const corp = S(form?.corpNum || o.biz_no).replace(/[^0-9]/g, "");
  const id = S(form?.id), pw = S(form?.password);
  if (corp.length !== 10) throw new Error("사업자번호를 - 없이 10자리로 넣어 주세요.");
  if (id.length < 6) throw new Error("아이디는 6자 이상으로 적어 주세요.");
  if (pw.length < 8) throw new Error("비밀번호는 8자 이상으로 적어 주세요.");
  const body = {
    LinkID: POPBILL.linkId,
    CorpNum: corp,
    CEOName: S(form?.ceoName || o.owner_name),
    CorpName: S(form?.corpName || o.name),
    Addr: S(form?.addr || o.addr),
    BizType: S(form?.bizType || o.biz_type),
    BizClass: S(form?.bizClass || o.biz_class),
    ID: id, Password: pw,
    ContactName: S(form?.contactName || o.tax_contact || o.owner_name),
    ContactEmail: S(form?.contactEmail || o.tax_email),
    ContactTEL: S(form?.contactTel || o.tel),
  };
  for (const k of ["CEOName","CorpName","Addr","BizType","BizClass","ContactName","ContactEmail","ContactTEL"]) {
    if (!S((body as any)[k])) throw new Error("빠진 칸이 있습니다 : " + k + " — 설정 → 거래처에서 먼저 채워 주세요.");
  }
  const j = await popOpen("/Join", "POST", JSON.stringify(body), test);
  if (N(j?.code) !== 1) throw new Error("팝빌 : " + S(j?.message) + " (" + S(j?.code) + ")");
  /* 가입에 성공하면 이 검사소 설정에 바로 적어 둡니다 (비밀번호는 저장하지 않습니다) */
  await db.from("check_office").update({ popbill_corp: corp, popbill_userid: id, popbill_corp_name: S(body.CorpName) })
    .eq("id", o.id);
  popTokens.clear();
  await log(ctx, "팝빌 회원가입", { corp, id });   /* 비밀번호는 적지 않습니다 */
  return { ok: true, corp, id };
}

/* ───────── 팝빌 연동 상태 · 계좌 ───────── */

/** 설정 → 팝빌 화면에 보여 줄 것 전부 */
async function popInfo(ctx: Ctx) {
  const o = ctx.office;
  const out: any = {
    corp: S(o.popbill_corp || o.biz_no), user: S(o.popbill_userid),
    corpName: S(o.popbill_corp_name) || S(o.name),
    officeCorp: S(o.biz_no).replace(/[^0-9]/g, ""),
    officeName: S(o.name),
    test: o.popbill_test === true,
    keyReady: !!(POPBILL.linkId && POPBILL.secret),
    linked: false, why: "", point: null as number | null,
    partnerPoint: null as number | null,
    bankCharge: null as any, taxCharge: null as any,
    joined: null as boolean | null,
  };
  if (!out.keyReady) { out.why = "서버에 팝빌 링크아이디 · 비밀키가 없습니다."; return out; }
  if (!out.corp || !out.user) { out.why = "사업자번호와 팝빌 회원아이디를 넣어 주세요."; return out; }
  try {
    const w = popWho(o);
    const tk = await popToken(w.corp, w.test);
    out.linked = !!tk;
    out.joined = true;
    /* ① 이 회원(검사소)의 포인트 */
    try {
      const r = await fetch(LH_AUTH + "/" + popService(w.test) + "/Point",
        { headers: { "Authorization": "Bearer " + tk } });
      const j = await r.json();
      out.point = N(j?.remainPoint);
    } catch { /* 없어도 괜찮습니다 */ }
    /* ② 파트너(티와이컴퍼니) 포인트 — 요금은 여기서 빠집니다 */
    try {
      const r = await fetch(LH_AUTH + "/" + popService(w.test) + "/PartnerPoint",
        { headers: { "Authorization": "Bearer " + tk } });
      const j = await r.json();
      out.partnerPoint = N(j?.remainPoint);
    } catch { /* 없어도 괜찮습니다 */ }
    try { out.bankCharge = await popCall("/EasyFin/Bank/ChargeInfo", "GET", "", o); } catch { /* 미신청일 수 있음 */ }
    try { out.taxCharge = await popCall("/Taxinvoice/ChargeInfo", "GET", "", o); } catch { /* 미신청일 수 있음 */ }
  } catch (e) {
    out.why = (e as Error).message;
    /* 아직 팝빌 회원이 아닌지 확인해 둡니다 — 화면에서 «회원으로 추가» 를 띄우려고 */
    try { out.joined = (await popMember(ctx, out.corp)).joined; } catch { /* 넘어갑니다 */ }
  }
  return out;
}

/** 팝빌에 등록해 둔 계좌 목록 (팝빌 사이트에서 먼저 등록해야 보입니다) */
async function popBanks(ctx: Ctx) {
  const list = await popCall("/EasyFin/Bank/ListBankAccount", "GET", "", ctx.office);
  return (Array.isArray(list) ? list : []).map((b: any) => ({
    bankCode: S(b.bankCode), acctNo: S(b.accountNumber), name: S(b.accountName),
    type: S(b.accountType), state: N(b.state), use: S(b.contractState || ""),
    until: S(b.contractEndDate || ""),
  }));
}

/** 우리 표에 담아 둔 계좌 (실제로 가져올 계좌) */
async function bankList(ctx: Ctx) {
  const { data } = await db.from("check_bank").select("*")
    .eq("office_id", ctx.office.id).order("use_for");
  return (data ?? []).map((b: any) => ({
    id: S(b.id), bankCode: S(b.bank_code), bankName: S(b.bank_name), acctNo: S(b.acct_no),
    nickname: S(b.nickname), useFor: S(b.use_for) || "검사비",
    active: b.active !== false, lastAt: b.last_at ? fmtTs(new Date(new Date(b.last_at).getTime() + KST)) : "",
  }));
}
async function bankSave(ctx: Ctx, row: any) {
  if (ctx.role !== "owner") throw new Error("대표님만 고칠 수 있습니다.");
  const acct = S(row?.acctNo).replace(/[^0-9]/g, "");
  if (!acct) throw new Error("계좌번호를 넣어 주세요.");
  if (!S(row?.bankCode)) throw new Error("기관코드를 넣어 주세요. (팝빌에 등록된 계좌에서 고르면 저절로 들어갑니다)");
  const up: any = {
    office_id: ctx.office.id, bank_code: S(row.bankCode), bank_name: S(row.bankName),
    acct_no: acct, nickname: S(row.nickname), use_for: S(row.useFor) || "검사비",
    active: row.active !== false,
  };
  const { error } = await db.from("check_bank").upsert(up, { onConflict: "office_id,acct_no" });
  if (error) throw new Error(error.message);
  await log(ctx, "팝빌 계좌 저장", { acct, use: up.use_for });
  return { ok: true };
}
async function bankDel(ctx: Ctx, id: string) {
  if (ctx.role !== "owner") throw new Error("대표님만 지울 수 있습니다.");
  await db.from("check_bank").delete().eq("office_id", ctx.office.id).eq("id", S(id));
  return { ok: true };
}

/** 수집 요청 → 상태 확인 → 거래내역 가져오기 (한 번에) */
async function bankPull(ctx: Ctx, opt: { days?: number } = {}) {
  const days = Math.min(31, Math.max(1, opt.days ?? 7));
  popWho(ctx.office);                                  // 설정이 비어 있으면 여기서 멈춥니다
  const { data: accts } = await db.from("check_bank").select("*")
    .eq("office_id", ctx.office.id).eq("active", true);
  if (!accts?.length) throw new Error("가져올 계좌가 없습니다. 설정 → 팝빌에서 계좌를 넣어 주세요.");
  const end = new Date(), start = new Date(Date.now() - days * 86400000);
  const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  let got = 0; const bad: string[] = [];
  for (const a of accts) {
    try {
      // ① 수집 요청
      const job = await popCall(
        `/EasyFin/Bank/${a.bank_code}/${a.acct_no}?SDate=${ymd(start)}&EDate=${ymd(end)}`,
        "POST", "", ctx.office);
      const jobId = S(job?.jobID ?? job?.jobId);
      if (!jobId) { bad.push(S(a.acct_no) + " 수집 요청이 안 됐습니다"); continue; }
      // ② 끝날 때까지 잠깐 기다립니다 (보통 몇 초)
      let done = false;
      for (let i = 0; i < 12; i++) {
        const st = await popCall(`/EasyFin/Bank/${jobId}/State`, "GET", "", ctx.office);
        if (N(st?.jobState) === 3) { done = true; break; }
        if (N(st?.errorCode) < 0) { bad.push(S(a.acct_no) + " : " + S(st?.errorReason)); break; }
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (!done) { bad.push(S(a.acct_no) + " 수집이 아직 안 끝났습니다. 조금 뒤 다시 눌러 주세요."); continue; }
      // ③ 거래내역 가져오기 (입금만)
      const res = await popCall(`/EasyFin/Bank/${jobId}?TradeType=I&Page=1&PerPage=500&Order=D`,
        "GET", "", ctx.office);
      for (const t of res?.list ?? []) {
        const amount = N(t.accIn);
        if (!amount) continue;
        const uniq = `${a.acct_no}|${S(t.trdate)}${S(t.trserial)}|${amount}`;
        const row = {
          office_id: ctx.office.id, bank_id: a.id,
          tx_at: toTs(S(t.trdate), S(t.trtime)), sender: S(t.remark1) || S(t.remark2),
          amount, balance: N(t.balance), kind: S(a.use_for) || "미분류",
          state: "확인 대기", src: "팝빌", uniq_key: uniq,
        };
        const { error } = await db.from("check_deposit")
          .upsert(row, { onConflict: "office_id,uniq_key", ignoreDuplicates: true });
        if (!error) got++;
      }
      await db.from("check_bank").update({ last_job: jobId, last_at: new Date().toISOString() }).eq("id", a.id);
    } catch (e) { bad.push(S(a.acct_no) + " : " + (e as Error).message); }
  }
  const matched = await depositMatch(ctx);
  await log(ctx, "팝빌 계좌조회", { got, matched, bad });
  return { got, matched, bad };
}
function toTs(d: string, t: string) {
  const s = `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T${(t||"000000").slice(0,2)}:${(t||"000000").slice(2,4)}:00+09:00`;
  return new Date(s).toISOString();
}


/* ============================================================
   3-2. 솔라피 — 문자 보내기
   열쇠는 티와이컴퍼니 것 하나를 모두가 같이 쓰고,
   '보내는 번호'만 검사소마다 다릅니다 (가온 = 010-9695-3663).
   ============================================================ */
const SOLAPI = {
  key: Deno.env.get("SOLAPI_KEY") ?? "",
  secret: Deno.env.get("SOLAPI_SECRET") ?? "",
};
function smsFrom(office: any) {
  const from = S(office?.sms_from).replace(/[^0-9]/g, "");
  if (!SOLAPI.key || !SOLAPI.secret)
    throw new Error("솔라피 연동값(티와이컴퍼니)이 서버에 없습니다. SOLAPI_KEY · SOLAPI_SECRET 을 넣어 주세요.");
  if (!from) throw new Error("이 검사소의 보내는 번호가 비어 있습니다. 설정 → 검사소 정보에서 넣어 주세요.");
  return from;
}

/** 들어온 입금을 청구서와 맞춰 봅니다 (입금자명 → 청구처 · 포함 딜러) */
async function depositMatch(ctx: Ctx) {
  const { data: waits } = await db.from("check_deposit").select("*")
    .eq("office_id", ctx.office.id).eq("state", "확인 대기").is("invoice_id", null).limit(500);
  if (!waits?.length) return 0;
  const { data: invs } = await db.from("check_invoice").select("*")
    .eq("office_id", ctx.office.id).in("state", ["만듦", "보냄", "수금중"]);
  let n = 0;
  for (const dep of waits) {
    const who = norm(dep.sender);
    if (!who) continue;
    const hit = (invs ?? []).find((v) =>
      norm(v.bill_to_name) === who ||
      (v.members ?? []).some((m: string) => norm(m) === who) ||
      norm(v.company_name) === who);
    if (!hit) continue;
    const paid = N(hit.paid_amount) + N(dep.amount);
    await db.from("check_deposit").update({
      invoice_id: hit.id, dealer_id: hit.bill_to_id, state: "자동 반영",
      kind: dep.kind === "미분류" ? "검사비" : dep.kind,
    }).eq("id", dep.id);
    await db.from("check_invoice").update({
      paid_amount: paid, state: paid >= N(hit.total_amount) ? "완료" : "수금중",
    }).eq("id", hit.id);
    hit.paid_amount = paid; n++;
  }
  return n;
}

/* ============================================================
   4. 자료 옮기기 (가온정산 전체 옮기기 파일 받기)
   ============================================================ */
/** 가온정산 예전 자료 가져오기 — v24: 가온(GAON) 검사소만 (대표님 결정 2026-10-14) */
const LEGACY_OFFICE = "GAON";
async function importLegacy(ctx: Ctx, part: string, rows: any[]) {
  if (S(ctx?.office?.code).toUpperCase() !== LEGACY_OFFICE)
    throw new Error("예전 자료 가져오기는 가온진단평가 검사소만 쓸 수 있습니다.");
  if (!Array.isArray(rows) || !rows.length) return { n: 0 };
  let n = 0;
  if (part === "company") {
    for (const r of rows) {
      await db.from("check_company").upsert({
        office_id: ctx.office.id, name: S(r.상사명 || r.name), biz_no: S(r.사업자등록번호 || r.biz_no),
        ceo: S(r.대표자 || r.ceo), addr: S(r.주소 || r.addr), tel: S(r.전화 || r.tel),
        manager: S(r.담당자), manager_tel: S(r.담당자휴대폰),
      }, { onConflict: "office_id,name" });
      n++;
    }
  } else if (part === "dealer") {
    for (const r of rows) {
      const comp = S(r.소속 || r.상호 || r.company);
      const { data: c } = comp
        ? await db.from("check_company").select("id").eq("office_id", ctx.office.id).eq("name", comp).maybeSingle()
        : { data: null };
      await db.from("check_dealer").upsert({
        office_id: ctx.office.id, name: S(r.딜러 || r.name), company_id: c?.id ?? null,
        tel: S(r.휴대폰 || r.tel), tels: r.추가번호 ?? [],
        issuer_kind: S(r.발행근거) === "딜러 사업자" ? "dealer" : (S(r.발행근거) === "미등록" ? "none" : "company"),
        issuer_name: S(r.발행처 || r.issuer_name), issuer_biz: S(r.사업자등록번호 || r.issuer_biz),
        tax_issue: S(r.계산서발행여부) !== "미발행",
      }, { onConflict: "office_id,name,company_id" });
      n++;
    }
  } else if (part === "band") {
    // 단가표 — [{from:"2026-06-01", items:[{code,name,price}]}]
    for (const b of rows) {
      const from = S(b.from || b.from_date).slice(0, 10);
      if (!from) continue;
      await db.from("check_price_band").upsert({
        office_id: ctx.office.id, from_date: from, items: b.items ?? [],
      }, { onConflict: "office_id,from_date" });
      n++;
    }
  } else if (part === "office") {
    // 검사소 정보 — 가온정산 '공급자'
    const o = rows[0] ?? {};
    const up: Record<string, unknown> = {};
    if (S(o.상호)) up.name = S(o.상호);
    if (S(o.사업자등록번호)) up.biz_no = S(o.사업자등록번호);
    if (S(o.대표자)) up.owner_name = S(o.대표자);
    if (S(o.연락처)) up.tel = S(o.연락처);
    if (S(o.검사비계좌)) up.bank_fee = S(o.검사비계좌);
    if (S(o.정비비계좌)) up.bank_repair = S(o.정비비계좌);
    if (Object.keys(up).length) {
      await db.from("check_office").update(up).eq("id", ctx.office.id);
      n++;
    }
  } else if (part === "car") {
    const chunk = 500;
    for (let i = 0; i < rows.length; i += chunk) {
      const part2 = rows.slice(i, i + chunk).map((r: any) => ({
        office_id: ctx.office.id,
        no: S(r.성능번호) || ("@" + S(r.차량번호) + "/" + S(r.검사일).slice(0, 10)),
        vin: S(r.차대번호), plate: S(r.차량번호),
        car_name: S(r.차명), check_date: S(r.검사일).slice(0, 10), comp_text: S(r.회사명),
        dealer_text: S(r.신청인), goods: S(r.상품명), amount: N(r.금액), ins_fee: N(r.성능보험료),
        ins_pay: (["Y", "N", "P"].includes(S(r.보험료납부).toUpperCase()) ? S(r.보험료납부).toUpperCase() : "N"),
      })).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.check_date));
      if (!part2.length) continue;
      const { error } = await db.from("check_car")
        .upsert(part2, { onConflict: "office_id,no,check_date", ignoreDuplicates: true });
      if (error) throw new Error("차량 올리기 : " + error.message);
      n += part2.length;
    }
    await linkCars(ctx);
  }
  await log(ctx, "자료 옮기기", { part, n });
  return { n };
}

/** 이름으로 올라온 차량에 딜러·상사를 이어 붙입니다 */
async function linkCars(ctx: Ctx) {
  /* 표 안에서 한 번에 이어붙입니다 (14,000대도 몇 초).
     8번 SQL 을 아직 안 돌리셨으면 예전 방식으로 돌아갑니다. */
  try {
    const { data, error } = await db.rpc("check_link_cars", { p_office: ctx.office.id });
    if (error) throw new Error(error.message);
    const r: any = Array.isArray(data) ? data[0] : data;
    return N(r?.dealer_linked);
  } catch (e) {
    if (!/check_link_cars|function|does not exist/i.test(S((e as Error).message))) throw e;
    return await linkCarsSlow(ctx);
  }
}

/** 예전 방식 — 8번 SQL 을 아직 안 돌리셨을 때만 씁니다 */
async function linkCarsSlow(ctx: Ctx) {
  const { data: ds } = await db.from("check_dealer").select("id,name,company_id").eq("office_id", ctx.office.id);
  const { data: cs } = await db.from("check_company").select("id,name,name_norm").eq("office_id", ctx.office.id);
  const dByName = new Map((ds ?? []).map((d) => [S(d.name).trim(), d]));
  const cByNorm = new Map((cs ?? []).map((c) => [S(c.name_norm), c]));
  let done = 0, from = 0;
  for (let round = 0; round < 60; round++) {
    const { data: cars } = await db.from("check_car").select("id,dealer_text,comp_text")
      .eq("office_id", ctx.office.id).is("dealer_id", null)
      .order("id").range(from, from + 999);
    if (!cars?.length) break;
    for (const c of cars) {
      const d = dByName.get(S(c.dealer_text).trim());
      const co = cByNorm.get(norm(c.comp_text));
      if (d || co) {
        await db.from("check_car").update({
          dealer_id: d?.id ?? null, company_id: co?.id ?? d?.company_id ?? null }).eq("id", c.id);
        done++;
      }
    }
    from += 1000;              /* 못 찾은 줄에 걸려 멈추지 않게 계속 넘어갑니다 */
    if (cars.length < 1000) break;
  }
  return done;
}

/** 지금 들어 있는 자료가 몇 줄인지 */
async function dataCount(ctx: Ctx) {
  const one = async (t: string) => {
    const { count } = await db.from(t).select("id", { count: "exact", head: true })
      .eq("office_id", ctx.office.id);
    return count ?? 0;
  };
  return {
    상사: await one("check_company"), 딜러: await one("check_dealer"),
    차량: await one("check_car"), 단가표: await one("check_price_band"),
    청구서: await one("check_invoice"),
  };
}


/* ============================================================
   5-2. 엑셀 올리기 · 보험료 미납 대조
   화면(브라우저)이 엑셀을 읽어 줄 목록으로 바꿔 보내 주면,
   서버는 그것만 표에 넣습니다.
   ============================================================ */
/** 그 달의 다음 달 1일 — 9월처럼 30일까지인 달을 «-31» 로 찾다가
    «없는 날짜» 오류가 나서 그 달이 통째로 빠지던 것을 막습니다. */
function ymNext(ym: string) {
  const y = Number(S(ym).slice(0, 4)), m = Number(S(ym).slice(5, 7));
  if (!y || !m) return "9999-12-31";
  const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
  return ny + "-" + String(nm).padStart(2, "0") + "-01";
}
function ymPick(v: unknown) {
  const d = S(v).slice(0, 10);
  return /^\d{4}-\d{2}/.test(d) ? d.slice(0, 7) : "";
}

/** 엑셀 줄 올리기 — kind : 접수리스트 · 전산외 · 정비비 · 청구보험료 */
async function excelPut(ctx: Ctx, kind: string, rows: any[], ym?: string, meta?: any) {
  const k = S(kind);
  const file = S(meta?.file);
  const last = meta?.last !== false;        /* 마지막 묶음일 때만 기록을 남깁니다 */
  const total = N(meta?.total);
  if (!Array.isArray(rows) || !rows.length) {
    if (last && file) {
      await db.from("check_upload").insert({ office_id: ctx.office.id, kind: k,
        file_name: file, rows_n: total, ym: S(ym), who: ctx.who });
    }
    return { n: 0, kind: k };
  }
  let n = 0;

  if (k === "접수리스트" || k === "전산외") {
    const src = k === "전산외" ? "전산외" : "전산";
    const chunk = 500;
    for (let i = 0; i < rows.length; i += chunk) {
      const part = rows.slice(i, i + chunk).map((r: any) => ({
        office_id: ctx.office.id,
        no: S(r.성능번호) || ("@" + S(r.차량번호) + "/" + S(r.검사일).slice(0, 10)),
        vin: S(r.차대번호), plate: S(r.차량번호), car_name: S(r.차명),
        check_date: S(r.검사일).slice(0, 10), comp_text: S(r.회사명), dealer_text: S(r.신청인),
        goods: S(r.상품명), amount: N(r.금액), ins_fee: N(r.성능보험료),
        ins_pay: (["Y", "N", "P"].includes(S(r.보험료납부).toUpperCase()) ? S(r.보험료납부).toUpperCase() : "N"),
        src,
      })).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.check_date));
      if (!part.length) continue;
      const { error } = await db.from("check_car")
        .upsert(part, { onConflict: "office_id,no,check_date" });
      if (error) throw new Error("차량 올리기 : " + error.message);
      n += part.length;
    }
    if (last) await linkCars(ctx);      /* 다 올라간 뒤 한 번만 이어붙입니다 */

  } else if (k === "정비비") {
    const { data: ds } = await db.from("check_dealer").select("id,name,company_id").eq("office_id", ctx.office.id);
    const dByName = new Map((ds ?? []).map((d: any) => [S(d.name), d]));
    const put = rows.map((r: any) => {
      const date = S(r.작업일 || r.검사일).slice(0, 10);
      const d = dByName.get(S(r.신청인 || r.딜러));
      return {
        office_id: ctx.office.id,
        work_date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
        bill_month: S(ym) || ymPick(date),
        plate: S(r.차량번호), car_name: S(r.차명),
        dealer_id: d?.id ?? null, company_id: d?.company_id ?? null,
        dealer_text: S(r.신청인 || r.딜러),
        reason: S(r.작업내용 || r.내용 || r.항목) || "정비비",
        amount: N(r.금액), exempt: S(r.면제).toUpperCase() === "Y", src: "엑셀",
      };
    }).filter((x) => x.amount > 0 && x.bill_month);
    if (put.length) {
      /* 같은 달 엑셀을 다시 올리면 그 달 것을 갈아 끼웁니다 (첫 묶음에서만) */
      if (meta?.first !== false) {
        const months = [...new Set(put.map((x) => x.bill_month))];
        await db.from("check_repair").delete().eq("office_id", ctx.office.id)
          .in("bill_month", months).eq("src", "엑셀");
      }
      const { error } = await db.from("check_repair").insert(put);
      if (error) throw new Error("정비비 올리기 : " + error.message);
      n = put.length;
    }

  } else if (k === "청구보험료") {
    const month = S(ym) || ymPick(rows[0]?.검사일);
    const put = rows.map((r: any) => ({
      office_id: ctx.office.id, ym: month,
      no: S(r.성능번호), vin: S(r.차대번호), plate: S(r.차량번호),
      car_name: S(r.차명), dealer_text: S(r.신청인), comp_text: S(r.회사명),
      check_date: /^\d{4}-\d{2}-\d{2}$/.test(S(r.검사일).slice(0, 10)) ? S(r.검사일).slice(0, 10) : null,
      amount: N(r.성능보험료 || r.보험료 || r.금액), matched: false, state: null as string | null,
    })).filter((x) => x.no || x.vin || x.plate);
    if (put.length) {
      if (meta?.first !== false) {
        await db.from("check_ins").delete().eq("office_id", ctx.office.id).eq("ym", month);
      }
      const { error } = await db.from("check_ins").upsert(put, { onConflict: "office_id,ym,no,vin" });
      if (error) throw new Error("청구보험료 올리기 : " + error.message);
      n = put.length;
      if (last) { try { await insMatch(ctx, month); } catch { /* 대조는 다시 눌러도 됩니다 */ } }
    }
  } else {
    throw new Error("무슨 엑셀인지 모르겠습니다 : " + k);
  }

  if (last && file) {
    await db.from("check_upload").insert({ office_id: ctx.office.id, kind: k,
      file_name: file, rows_n: total || n, ym: S(ym), who: ctx.who });
  }
  await log(ctx, "엑셀 올리기", { kind: k, n });
  return { n, kind: k };
}

/** 올린 엑셀 기록 */
async function uploadList(ctx: Ctx) {
  const { data } = await db.from("check_upload").select("*")
    .eq("office_id", ctx.office.id).order("created_at", { ascending: false }).limit(200);
  return (data ?? []).map((u: any) => ({
    kind: S(u.kind), name: S(u.file_name), n: N(u.rows_n), ym: S(u.ym), who: S(u.who),
    at: fmtTs(new Date(new Date(u.created_at).getTime() + KST)),
  }));
}

/** 보험료 미납 대조 — 올려 둔 청구보험료를 접수리스트에서 찾습니다 */
async function insMatch(ctx: Ctx, ym: string) {
  const month = S(ym);
  const list: any[] = [];
  for (let i = 0; i < 20; i++) {
    const { data: p } = await db.from("check_ins").select("*")
      .eq("office_id", ctx.office.id).eq("ym", month).order("id").range(i * 1000, i * 1000 + 999);
    if (!p?.length) break;
    list.push(...p);
    if (p.length < 1000) break;
  }
  if (!list?.length) return { n: 0, rows: [] };

  /* 보험사 청구서에는 여러 달에 점검한 차가 섞여 옵니다.
     그래서 그 달 차만 보지 않고 «올라온 차 전부» 에서 찾습니다. */
  const want = new Set<string>(), wantVin = new Set<string>(), wantPlate = new Set<string>();
  for (const r of list) {
    if (S(r.no)) want.add(S(r.no));
    if (S(r.vin)) wantVin.add(S(r.vin).toUpperCase());
    if (S(r.plate)) wantPlate.add(plateNorm(r.plate));
  }
  const cars: any[] = [];
  const pull = async (col: string, vals: string[]) => {
    for (let i = 0; i < vals.length; i += 300) {
      const { data: p } = await db.from("check_car")
        .select("id,no,vin,plate,car_name,dealer_text,comp_text,ins_fee,ins_pay")
        .eq("office_id", ctx.office.id).in(col, vals.slice(i, i + 300));
      if (p?.length) cars.push(...p);
    }
  };
  if (wantVin.size) await pull("vin", [...wantVin]);
  if (want.size) await pull("no", [...want]);
  if (wantPlate.size) await pull("plate", [...wantPlate]);
  const byNo = new Map<string, any>(), byVin = new Map<string, any>(), byPlate = new Map<string, any>();
  for (const c of cars ?? []) {
    if (S(c.no)) byNo.set(S(c.no), c);
    if (S(c.vin)) byVin.set(S(c.vin).toUpperCase(), c);
    if (S(c.plate)) byPlate.set(plateNorm(c.plate), c);
  }
  /* ── 룰 ──────────────────────────────────────────────
     우리가 실제로 받은 것은 카모두 «보험료납부 = Y» 뿐입니다.
     보험사가 청구했는데 우리 기록이 N(못 받음) · P(면제) 라면
     그 건은 보험사에 «청구 취소» 를 넣어야 합니다.
     금액 차이(우리가 받은 돈 − 보험사 청구액)는 우리 몫이라 틀린 게 아닙니다.
     ─────────────────────────────────────────────────── */
  const out: any[] = [];
  for (const r of list) {
    let hit: any = null, how = "못 찾음";
    /* 찾는 순서 — 차대번호 ▸ 성능번호 ▸ 차량번호
       차량번호는 중간에 바뀔 수 있습니다(우리에겐 구 번호, 보험사 청구서엔 신 번호).
       차대번호는 차가 사라질 때까지 안 바뀌므로 이것을 가장 먼저 봅니다.
       차량번호로만 찾은 건은 «확인 권함»으로 표시해 사람이 한 번 보게 합니다. */
    if (S(r.vin) && byVin.get(S(r.vin).toUpperCase())) { hit = byVin.get(S(r.vin).toUpperCase()); how = "차대번호"; }
    else if (S(r.no) && byNo.get(S(r.no))) { hit = byNo.get(S(r.no)); how = "성능번호"; }
    else if (S(r.plate) && byPlate.get(plateNorm(r.plate))) { hit = byPlate.get(plateNorm(r.plate)); how = "차량번호"; }

    const pay = S(hit?.ins_pay).toUpperCase();
    const state = !hit ? "못 찾음"
      : pay === "Y" ? "맞음"
      : pay === "P" ? "취소 요청 (면제 P)"
      : "취소 요청 (못 받음 N)";

    await db.from("check_ins").update({
      matched: !!hit, car_id: hit?.id ?? null, state, how, pay: pay || null,
      ours: N(hit?.ins_fee),
    }).eq("id", r.id);

    out.push({
      plate: S(hit?.plate || r.plate), no: S(r.no || hit?.no), vin: S(r.vin),
      car: S(hit?.car_name || r.car_name),
      dealer: S(hit?.dealer_text || r.dealer_text),
      comp: S(hit?.comp_text || r.comp_text),
      date: S(r.check_date).slice(0, 10),
      ins: N(r.amount), ours: N(hit?.ins_fee), pay, how, state,
    });
  }
  const box = (st: string) => {
    const g = out.filter((x) => x.state === st);
    let ins = 0, ours = 0;
    for (const x of g) { ins += x.ins; ours += x.ours; }
    return { n: g.length, ins, ours };
  };
  const ok = box("맞음"), cn = box("취소 요청 (못 받음 N)"),
        cp = box("취소 요청 (면제 P)"), nf = box("못 찾음");
  let insAll = 0; for (const x of out) insAll += x.ins;
  const how = { 차대번호: 0, 성능번호: 0, 차량번호: 0, "못 찾음": 0 } as Record<string, number>;
  for (const x of out) how[x.how] = (how[x.how] ?? 0) + 1;
  await log(ctx, "보험료 대조", { ym: month, n: out.length, 취소: cn.n + cp.n });
  return { n: out.length, ym: month, rows: out, insAll,
    ok, cancelN: cn, cancelP: cp, notFound: nf, how,
    margin: ok.ours - ok.ins };
}

/** 이미 대조해 둔 결과 보기 */
async function insList(ctx: Ctx, ym: string) {
  const data: any[] = [];
  for (let i = 0; i < 20; i++) {
    const { data: p } = await db.from("check_ins")
      .select("*, car:car_id(plate,car_name,dealer_text,comp_text,ins_fee)")
      .eq("office_id", ctx.office.id).eq("ym", S(ym)).order("id").range(i * 1000, i * 1000 + 999);
    if (!p?.length) break;
    data.push(...p);
    if (p.length < 1000) break;
  }
  return (data ?? []).map((r: any) => ({
    plate: S(r.car?.plate || r.plate), no: S(r.no), vin: S(r.vin),
    car: S(r.car?.car_name || r.car_name),
    dealer: S(r.car?.dealer_text || r.dealer_text),
    comp: S(r.car?.comp_text || r.comp_text),
    date: S(r.check_date).slice(0, 10),
    ins: N(r.amount), ours: N(r.ours) || N(r.car?.ins_fee),
    pay: S(r.pay), how: S(r.how) || "",
    state: S(r.state) || "아직 대조 안 함",
  }));
}

/** 딜러를 못 찾은 차가 몇 대인지 (청구서가 비는 가장 큰 까닭) */
async function carHealth(ctx: Ctx, ym: string) {
  const from = S(ym) + "-01", to = ymNext(S(ym));
  const one = async (q: any) => (await q).count ?? 0;
  const base = () => db.from("check_car").select("id", { count: "exact", head: true })
    .eq("office_id", ctx.office.id).gte("check_date", from).lt("check_date", to);
  const all = await one(base());
  const noDealer = await one(base().is("dealer_id", null));
  let top: { name: string; n: number }[] = [];
  try {
    const { data: miss } = await db.rpc("check_missing_dealers", { p_office: ctx.office.id, p_ym: S(ym) });
    top = (miss ?? []).slice(0, 15).map((r: any) => ({ name: S(r.name) || "(비어 있음)", n: N(r.n) }));
  } catch { /* 10번 SQL 전이면 비워 둡니다 */ }
  /* 전체 기간도 같이 */
  const allCnt = await (async () => {
    const q = db.from("check_car").select("id", { count: "exact", head: true }).eq("office_id", ctx.office.id);
    return { total: (await q).count ?? 0,
      noDealer: (await db.from("check_car").select("id", { count: "exact", head: true })
        .eq("office_id", ctx.office.id).is("dealer_id", null)).count ?? 0 };
  })();
  return { ym: S(ym), all, noDealer, ok: all - noDealer, top,
    allTotal: allCnt.total, allNoDealer: allCnt.noDealer };
}

/** 딜러 이어붙이기를 다시 돌립니다 */
async function relink(ctx: Ctx) {
  const n = await linkCars(ctx);
  return { n };
}

/** 접수리스트에는 있는데 거래처에 없는 «신청인» 을 딜러로 한꺼번에 넣습니다 */
async function dealerAddMissing(ctx: Ctx, ym?: string) {
  if (ctx.role !== "owner") throw new Error("대표님만 넣을 수 있습니다.");
  const { data: miss, error } = await db.rpc("check_missing_dealers",
    { p_office: ctx.office.id, p_ym: S(ym) || null });
  if (error) throw new Error("이름 모으기 : " + error.message + " (10번 SQL 을 돌리셨는지 봐 주세요)");
  if (!miss?.length) return { n: 0, made: [], linked: 0 };

  const { data: have } = await db.from("check_dealer").select("name").eq("office_id", ctx.office.id);
  const haveSet = new Set((have ?? []).map((d: any) => S(d.name).trim()));
  const { data: comps } = await db.from("check_company").select("id,name,name_norm").eq("office_id", ctx.office.id);
  const cByNorm = new Map((comps ?? []).map((c: any) => [S(c.name_norm), c]));

  const made: string[] = [];
  const put: any[] = [];
  for (const r of miss) {
    const nm = S(r.name).trim();
    if (!nm || haveSet.has(nm)) continue;
    const top = S(r.comp).trim();
    let compId: string | null = cByNorm.get(norm(top))?.id ?? null;
    if (!compId && top) {
      const { data: nc } = await db.from("check_company")
        .upsert({ office_id: ctx.office.id, name: top }, { onConflict: "office_id,name" })
        .select("id,name_norm").single();
      if (nc) { compId = nc.id; cByNorm.set(S(nc.name_norm), nc); }
    }
    put.push({ office_id: ctx.office.id, name: nm, company_id: compId,
               issuer_kind: compId ? "company" : "none", tax_issue: true, active: true });
    made.push(nm);
  }
  for (let i = 0; i < put.length; i += 500) {
    const { error: e2 } = await db.from("check_dealer")
      .upsert(put.slice(i, i + 500), { onConflict: "office_id,name,company_id", ignoreDuplicates: true });
    if (e2) throw new Error("딜러 넣기 : " + e2.message);
  }
  const linked = await linkCars(ctx);
  await log(ctx, "없는 딜러 넣기", { n: made.length, linked });
  return { n: made.length, made: made.slice(0, 50), linked };
}


/* ============================================================
   5-3. 매출 — 달마다 몇 대 · 얼마
   ============================================================
   엑셀(접수리스트)이 곧 자료입니다. 청구서를 만들지 않아도
   차량 표에서 바로 세기 때문에 올리는 즉시 반영됩니다.
   금액은 청구서와 똑같이 «단가표» 를 써서 셉니다.
   ============================================================ */
async function salesStat(ctx: Ctx, _opt?: any) {
  const { data: bands } = await db.from("check_price_band").select("*").eq("office_id", ctx.office.id);
  const vat = 1 + (Number(ctx.office.vat_rate ?? 10) / 100);

  /* 표 안에서 달×상품명으로 묶어 받아 옵니다 — 몇 줄 안 되니 잘릴 일이 없습니다 */
  const { data: raw, error: e1 } = await db.rpc("check_sales_raw", { p_office: ctx.office.id });
  if (e1) throw new Error("매출 세기 : " + e1.message + " (10번 SQL 을 돌리셨는지 봐 주세요)");

  type M = { ym: string; n: number; dom: number; imp: number; etc: number;
             fee: number; ins: number; rep: number; repN: number; insN: number; free: number };
  const M = new Map<string, M>();
  const get = (ym: string) => {
    let m = M.get(ym);
    if (!m) { m = { ym, n: 0, dom: 0, imp: 0, etc: 0, fee: 0, ins: 0, rep: 0, repN: 0, insN: 0, free: 0 }; M.set(ym, m); }
    return m;
  };

  for (const r of raw ?? []) {
    const ym = S(r.ym);
    if (!/^\d{4}-\d{2}$/.test(ym)) continue;
    const m = get(ym);
    const n = N(r.n), goods = S(r.goods);
    m.n += n;
    const pre = /^선납/.test(goods);
    /* 그 달 첫날 기준 단가 (단가는 달 단위로 바뀝니다) */
    const pr = priceOf(bands ?? [], ym + "-01", goods);
    let feeSum = 0;
    if (!pre) {
      if (pr) feeSum = Math.round(pr.price * vat) * n;
      else feeSum = Math.max(0, Math.round(N(r.amount) / vat) - N(r.ins)) ;   /* 단가표에 없는 것만 되돌려 셈 */
    }
    m.fee += feeSum;
    const nm = S(pr?.name || goods);
    if (nm.includes("국산")) m.dom += n; else if (nm.includes("수입")) m.imp += n; else m.etc += n;
    m.ins += N(r.ins); m.insN += N(r.ins_n); m.free += N(r.free_n);
  }

  /* 정비비 */
  const { data: reps } = await db.rpc("check_repair_raw", { p_office: ctx.office.id });
  for (const r of reps ?? []) {
    const ym = S(r.ym).slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(ym)) continue;
    const m = get(ym); m.rep += N(r.amount); m.repN += N(r.n);
  }

  /* 청구·수금 */
  const { data: invs } = await db.rpc("check_invoice_raw", { p_office: ctx.office.id });
  const paid = new Map<string, { bill: number; got: number }>();
  for (const v of invs ?? []) paid.set(S(v.ym), { bill: N(v.bill), got: N(v.got) });

  const rows = [...M.values()].sort((a, b) => a.ym < b.ym ? 1 : -1);   /* 최근 달이 위로 */
  const out = rows.map((m, i) => {
    const total = m.fee + m.rep;
    const prev = rows[i + 1];
    const prevTot = prev ? prev.fee + prev.rep : 0;
    const yoy = rows.find((x) => x.ym === String(Number(m.ym.slice(0, 4)) - 1) + m.ym.slice(4));
    const yoyTot = yoy ? yoy.fee + yoy.rep : 0;
    const p = paid.get(m.ym);
    return {
      ym: m.ym, n: m.n, dom: m.dom, imp: m.imp, etc: m.etc,
      fee: m.fee, rep: m.rep, repN: m.repN, ins: m.ins, insN: m.insN, free: m.free,
      total,
      avg: m.n ? Math.round(total / m.n) : 0,
      mom: prevTot ? Math.round((total - prevTot) / prevTot * 1000) / 10 : null,
      momN: prev && prev.n ? Math.round((m.n - prev.n) / prev.n * 1000) / 10 : null,
      yoy: yoyTot ? Math.round((total - yoyTot) / yoyTot * 1000) / 10 : null,
      bill: p?.bill ?? 0, got: p?.got ?? 0,
    };
  });

  const yearSum: Record<string, { n: number; fee: number; rep: number; ins: number; total: number }> = {};
  for (const r of out) {
    const y = r.ym.slice(0, 4);
    const s2 = yearSum[y] ?? { n: 0, fee: 0, rep: 0, ins: 0, total: 0 };
    s2.n += r.n; s2.fee += r.fee; s2.rep += r.rep; s2.ins += r.ins; s2.total += r.total;
    yearSum[y] = s2;
  }
  return { rows: out, years: yearSum };
}

/* ───────── 검사소 정보 (설정 화면) ───────── */
const OFFICE_FIELDS = ["name","biz_no","owner_name","tel","bank_fee","bank_repair",
                       "vat_rate","ins_valid_days","popbill_corp","popbill_userid","popbill_test",
                       "sms_from","biz_type","biz_class","addr","tax_email","tax_contact","popbill_corp_name"];

/** 이 검사소의 설정을 보여줍니다 (열쇠값은 서버에만 있어 안 보냅니다) */
async function officeGet(ctx: Ctx) {
  const o: any = {};
  for (const k of OFFICE_FIELDS) o[k] = ctx.office[k] ?? "";
  o.code = ctx.office.code;
  o.popbill_test = ctx.office.popbill_test === true;
  o.popbill_ready = !!(POPBILL.linkId && POPBILL.secret);
  o.solapi_ready = !!(SOLAPI.key && SOLAPI.secret);
  return o;
}

/** 검사소 설정 고치기 — 대표만 */
async function officeSave(ctx: Ctx, body: any) {
  if (ctx.role !== "owner") throw new Error("대표님만 고칠 수 있습니다.");
  const up: any = {};
  for (const k of OFFICE_FIELDS) if (body?.[k] !== undefined) up[k] = body[k];
  if (!Object.keys(up).length) return { ok: true };
  const { error } = await db.from("check_office").update(up).eq("id", ctx.office.id);
  if (error) throw new Error(error.message);
  await log(ctx, "검사소 설정 고침", Object.keys(up));
  return { ok: true };
}


/* ============================================================
   3-3. 팝빌 — 전자세금계산서 (정발행)
   ============================================================
   청구서 한 장 = 세금계산서 한 장 입니다.
   · 공급자  : 이 검사소 (가온진단평가)
   · 공급받는자 : 청구서의 발행처(딜러 사업자 또는 매매상사)
   · 문서번호(invoicerMgtKey) 는 «CK-달-청구서앞자리» 로 만들어 다시 못 쓰게 합니다.
   ============================================================ */
function taxKeyOf(inv: any) {
  return ("CK" + S(inv.ym).replace("-", "") + "-" + S(inv.id).replace(/-/g, "").slice(0, 10)).toUpperCase();
}
function onlyNum(v: unknown) { return S(v).replace(/[^0-9]/g, ""); }

/** 발급 대상 목록 — 그 달 청구서에서 사업자번호가 있는 것만 */
async function taxList(ctx: Ctx, ym: string) {
  const { data: invs } = await db.from("check_invoice").select("*")
    .eq("office_id", ctx.office.id).eq("ym", S(ym)).order("total_amount", { ascending: false });
  const { data: comps } = await db.from("check_company").select("name,biz_no,ceo,addr")
    .eq("office_id", ctx.office.id);
  const byName = new Map((comps ?? []).map((c: any) => [S(c.name), c]));
  const vat = 1 + (Number(ctx.office.vat_rate ?? 10) / 100);
  return (invs ?? []).map((v: any) => {
    const comp = byName.get(S(v.company_name));
    const biz = onlyNum(v.issuer_biz);
    const total = N(v.total_amount);
    const supply = Math.round(total / vat), tax = total - supply;
    const mem = (v.members ?? []).filter((m: string) => S(m) !== S(v.bill_to_name));
    return {
      id: S(v.id), name: S(v.bill_to_name), members: mem.join(" · "),
      writeDate: ymEnd(S(v.ym)),
      comp: S(v.company_name), issuer: S(v.issuer_name) || S(comp?.name),
      biz, ceo: S(comp?.ceo), addr: S(comp?.addr),
      total, supply, tax,
      can: !!(biz.length === 10 && v.tax_issue !== false && total > 0),
      why: !biz ? "사업자번호가 없습니다" : biz.length !== 10 ? "사업자번호가 10자리가 아닙니다"
         : v.tax_issue === false ? "계산서 안 끊음으로 되어 있습니다"
         : total <= 0 ? "금액이 0원입니다" : "",
      key: S(v.tax_key), state: S(v.tax_state), at: v.tax_at ? fmtTs(new Date(new Date(v.tax_at).getTime() + KST)) : "",
      ntsid: S(v.tax_ntsid), err: S(v.tax_err),
    };
  });
}

/** 세금계산서 발급 (팝빌 즉시발급) */
/** 그 달의 마지막 날 — 작성일자 기본값 */
function ymEnd(ym: string) {
  const y = Number(S(ym).slice(0, 4)), m = Number(S(ym).slice(5, 7));
  if (!y || !m) return "";
  const d = new Date(Date.UTC(y, m, 0));
  return d.toISOString().slice(0, 10);
}
/** 청구처마다 작성일자를 따로 받을 수 있습니다 — dates = { 청구서id: "2026-09-30" } */
async function taxIssue(ctx: Ctx, ids: string[], writeDate?: string, dates?: Record<string, string>) {
  if (ctx.role !== "owner") throw new Error("대표님만 발급할 수 있습니다.");
  const o = ctx.office;
  /* 팝빌은 «로그인한 회원 사업자번호» 로만 발급해 줍니다.
     그래서 공급자 사업자번호는 검사소 사업자번호가 아니라 팝빌 회원 사업자번호를 씁니다. */
  const me = popWho(o);
  if (!S(o.biz_no)) throw new Error("우리 사업자번호가 비어 있습니다. 설정 → 거래처에서 넣어 주세요.");
  const list = (ids ?? []).map(S).filter(Boolean);
  if (!list.length) throw new Error("발급할 청구서를 골라 주세요.");

  const { data: invs } = await db.from("check_invoice").select("*")
    .eq("office_id", o.id).in("id", list);
  const { data: comps } = await db.from("check_company").select("name,biz_no,ceo,addr")
    .eq("office_id", o.id);
  const byName = new Map((comps ?? []).map((c: any) => [S(c.name), c]));
  const vat = 1 + (Number(o.vat_rate ?? 10) / 100);
  const wdOf = (v: any) => {
    const one = S(dates?.[S(v.id)]) || S(writeDate) || ymEnd(S(v.ym));
    return one.replace(/-/g, "");
  };

  let ok = 0; const bad: string[] = [];
  for (const v of invs ?? []) {
    try {
      if (S(v.tax_key) && /발급|전송/.test(S(v.tax_state)))
        throw new Error("이미 발급된 청구서입니다");
      const biz = onlyNum(v.issuer_biz);
      if (biz.length !== 10) throw new Error("공급받는자 사업자번호가 10자리가 아닙니다");
      const total = N(v.total_amount);
      if (total <= 0) throw new Error("금액이 0원입니다");
      const supply = Math.round(total / vat), tax = total - supply;
      const comp = byName.get(S(v.company_name));
      const key = taxKeyOf(v);

      /* 명세 — 검사비 · 전산외 · 정비비를 한 줄씩 */
      const detail: any[] = []; let n = 1;
      const cars = N(v.dom_n) + N(v.imp_n) + N(v.etc_n);
      const line = (nm: string, amt: number, qty: number) => {
        if (!amt) return;
        const sp = Math.round(amt / vat);
        detail.push({ serialNum: n++, itemName: nm, qty: String(qty || 1),
          unitCost: String(qty ? Math.round(sp / qty) : sp),
          supplyCost: String(sp), tax: String(amt - sp),
          remark: S(v.ym) + " 분" });
      };
      line("자동차 성능점검 수수료", N(v.fee_amount), cars);
      line("성능점검 수수료(전산외)", N(v.ext_amount), 0);
      line("정비비", N(v.repair_amount), 0);

      const ti: any = {
        writeDate: wdOf(v), chargeDirection: "정과금", issueType: "정발행",
        purposeType: "청구", taxType: "과세",
        invoicerMgtKey: key,
        invoicerCorpNum: me.corp,
        invoicerCorpName: S(o.popbill_corp_name) || S(o.name),
        invoicerCEOName: S(o.owner_name) || S(o.name),
        invoicerAddr: S(o.addr), invoicerBizType: S(o.biz_type), invoicerBizClass: S(o.biz_class),
        invoicerContactName: S(o.tax_contact) || S(o.owner_name),
        invoicerTEL: S(o.tel), invoicerEmail: S(o.tax_email),
        invoiceeType: "사업자",
        invoiceeCorpNum: biz,
        invoiceeCorpName: S(v.issuer_name) || S(v.company_name) || S(v.bill_to_name),
        invoiceeCEOName: S(comp?.ceo) || S(v.bill_to_name),
        invoiceeAddr: S(comp?.addr),
        invoiceeContactName1: S(v.bill_to_name),
        supplyCostTotal: String(supply), taxTotal: String(tax), totalAmount: String(total),
        detailList: detail.length ? detail : [{
          serialNum: 1, itemName: "자동차 성능점검 수수료", qty: "1",
          unitCost: String(supply), supplyCost: String(supply), tax: String(tax),
        }],
      };
      const r = await popCall("/Taxinvoice", "POST", JSON.stringify(ti), o, "ISSUE");
      await db.from("check_invoice").update({
        tax_key: key, tax_state: "발급", tax_at: new Date().toISOString(),
        tax_ntsid: S(r?.ntsConfirmNum), tax_err: "",
      }).eq("id", v.id);
      ok++;
    } catch (e) {
      const msg = (e as Error).message;
      bad.push(S(v.bill_to_name) + " : " + msg);
      await db.from("check_invoice").update({ tax_state: "실패", tax_err: msg }).eq("id", v.id);
    }
  }
  await log(ctx, "세금계산서 발급", { ok, bad });
  return { ok, bad };
}

/** 이 청구처는 계산서를 안 받습니다 (거래처에도 같이 저장합니다) */
async function taxSkip(ctx: Ctx, invoiceId: string, off: boolean) {
  if (ctx.role !== "owner") throw new Error("대표님만 바꿀 수 있습니다.");
  const { data: v } = await db.from("check_invoice").select("id,bill_to_id,bill_to_name")
    .eq("office_id", ctx.office.id).eq("id", S(invoiceId)).maybeSingle();
  if (!v) throw new Error("그 청구서를 찾지 못했습니다.");
  await db.from("check_invoice").update({ tax_issue: !off }).eq("id", v.id);
  if (v.bill_to_id) {
    await db.from("check_dealer").update({ tax_issue: !off })
      .eq("office_id", ctx.office.id).eq("id", v.bill_to_id);
  }
  await log(ctx, off ? "계산서 안 받음" : "계산서 다시 받음", { who: S(v.bill_to_name) });
  return { ok: true };
}

/** 팝빌 화면 주소 — SBOX(매출문서함) · WRITE(직접 쓰기) · TBOX(임시문서함) */
async function taxSite(ctx: Ctx, togo: string) {
  const t = S(togo).toUpperCase();
  if (!["TBOX", "SBOX", "SWBOX", "PBOX", "PWBOX", "WRITE"].includes(t))
    throw new Error("어느 화면인지 알 수 없습니다 : " + t);
  const r = await popCall("/Taxinvoice?TG=" + t, "GET", "", ctx.office);
  return { url: S(r?.url) };
}

/** 발급한 계산서들의 국세청 전송 상태를 다시 읽어 옵니다 */
async function taxState(ctx: Ctx, ym: string) {
  const { data: invs } = await db.from("check_invoice").select("id,tax_key,bill_to_name")
    .eq("office_id", ctx.office.id).eq("ym", S(ym)).not("tax_key", "is", null);
  let n = 0;
  for (const v of invs ?? []) {
    if (!S(v.tax_key)) continue;
    try {
      const r = await popCall("/Taxinvoice/SELL/" + encodeURIComponent(S(v.tax_key)), "GET", "", ctx.office);
      await db.from("check_invoice").update({
        tax_state: S(r?.stateMemo) || S(r?.stateCode), tax_ntsid: S(r?.ntsconfirmNum ?? r?.ntsConfirmNum),
      }).eq("id", v.id);
      n++;
    } catch { /* 한 장 실패해도 넘어갑니다 */ }
  }
  return { n };
}

/** 팝빌 세금계산서 상세 화면을 여는 주소 (30초만 살아 있습니다) */
async function taxPopup(ctx: Ctx, id: string) {
  const { data: v } = await db.from("check_invoice").select("tax_key")
    .eq("office_id", ctx.office.id).eq("id", S(id)).maybeSingle();
  if (!v || !S(v.tax_key)) throw new Error("아직 발급하지 않은 청구서입니다.");
  const r = await popCall("/Taxinvoice/SELL/" + encodeURIComponent(S(v.tax_key)) + "?TG=POPUP", "GET", "", ctx.office);
  return { url: S(r?.url) };
}

/** 팝빌 홈페이지로 바로 들어가는 주소 (로그인 없이) */
async function popLogin(ctx: Ctx, togo: string) {
  const w = popWho(ctx.office);
  const tk = await popToken(w.corp, w.test);
  const r = await fetch(LH_AUTH + "/" + popService(w.test) + "/URL?TG=" + encodeURIComponent(S(togo) || "LOGIN"),
    { headers: { "Authorization": "Bearer " + tk } });
  const j = await r.json();
  return { url: S(j?.url) };
}

/* ───────── 기록 ───────── */
type Ctx = { office: any; who: string; role: string };

/* ============================================================
   v25. 검사소 직원 권한 — 대표(owner)만
   ============================================================ */
function ownerOnly(ctx: Ctx) {
  if (S(ctx?.role) !== "owner") throw new Error("대표님만 직원 권한을 바꿀 수 있습니다.");
}
function phoneNorm(v: unknown) {
  const p = S(v).replace(/[^0-9]/g, "");
  if (!/^01[0-9]{8,9}$/.test(p)) throw new Error("휴대폰 번호를 다시 확인해 주세요.");
  return p;
}
function phoneMask(p: string) {
  const d = S(p).replace(/[^0-9]/g, "");
  return d.length >= 10 ? d.slice(0, 3) + "-****-" + d.slice(-4) : "****";
}
const ROLE_KO: Record<string, string> = { owner: "대표", staff: "직원" };
function roleOf(v: unknown) {
  const r = S(v).toLowerCase();
  if (r === "owner" || r === "대표") return "owner";
  if (r === "staff" || r === "직원" || !r) return "staff";
  throw new Error("권한은 대표 또는 직원만 고를 수 있습니다.");
}
/** 경비실 명단 맞추기 — 명단에 있는 번호만 check 를 더하거나 뺍니다 (없으면 만들지 않음).
 *  뺄 때는 그 사람이 다른 검사소에서 아직 쓰고 있으면 그대로 둡니다. */
async function cggSync(phone: string) {
  const { data: acc, error } = await db.from("cgg_access").select("products").eq("phone", phone).maybeSingle();
  if (error || !acc) return;
  const { data: live } = await db.from("check_user").select("id").eq("phone", phone).eq("active", true);
  const want = (live ?? []).length > 0;
  const list: string[] = Array.isArray(acc.products) ? acc.products.filter((x: string) => x !== "check") : [];
  if (want) list.push("check");
  await db.from("cgg_access").update({ products: list, updated_at: new Date().toISOString() }).eq("phone", phone);
}
async function staffOf(ctx: Ctx, id: string) {
  const { data } = await db.from("check_user").select("id, office_id, phone, name, role, active")
    .eq("id", S(id)).eq("office_id", ctx.office.id).maybeSingle();
  if (!data) throw new Error("이 검사소의 직원이 아닙니다.");
  return data;
}

/** 직원 목록 — [] → [{id, 이름, 휴대폰(가림), 권한, 사용, 비밀번호, 마지막로그인, 나}] */
async function staffList(ctx: Ctx) {
  ownerOnly(ctx);
  const { data } = await db.from("check_user").select("id, phone, name, role, active, pw_hash, last_in")
    .eq("office_id", ctx.office.id);
  return (data ?? []).map((u: any) => ({
    id: S(u.id), 이름: S(u.name), 휴대폰: phoneMask(u.phone), 권한: ROLE_KO[S(u.role)] ?? "직원",
    사용: u.active === false ? "N" : "Y", 비밀번호: S(u.pw_hash) ? "정함" : "처음 로그인 때 정함",
    마지막로그인: S(u.last_in), 나: S(u.phone) === S(ctx.who) ? "Y" : "",
  }));
}

/** 직원 넣기 — [이름, 휴대폰, 권한(대표/직원)]. 비밀번호는 비워 두고 처음 로그인 때 정합니다 */
async function staffAdd(ctx: Ctx, nameRaw: string, phoneRaw: string, roleRaw: string) {
  ownerOnly(ctx);
  const name = S(nameRaw), phone = phoneNorm(phoneRaw), role = roleOf(roleRaw);
  if (!name) throw new Error("이름을 넣어 주세요.");
  if (name.length > 20) throw new Error("이름이 너무 깁니다.");
  const { data: had } = await db.from("check_user").select("id, active")
    .eq("office_id", ctx.office.id).eq("phone", phone).maybeSingle();
  if (had) throw new Error(had.active === false
    ? "이미 있던 직원입니다. 목록에서 [사용]으로 다시 켜 주세요."
    : "이미 이 검사소의 직원입니다.");
  const row: Record<string, unknown> = { office_id: ctx.office.id, phone, name, role, active: true };
  let { error } = await db.from("check_user").insert(row);
  if (error && /null value in column "id"/i.test(S(error.message))) {
    ({ error } = await db.from("check_user").insert({ id: crypto.randomUUID(), ...row }));
  }
  if (error) throw new Error("직원을 넣지 못했습니다: " + error.message);
  await cggSync(phone);
  await log(ctx, "직원 넣기", { name, phone: phoneMask(phone), role });
  return { ok: true };
}

/** 직원 고치기 — [id, {권한?, 사용?, 비밀번호초기화?}] */
async function staffEdit(ctx: Ctx, id: string, patch: any) {
  ownerOnly(ctx);
  const u: any = await staffOf(ctx, id);
  const me = S(u.phone) === S(ctx.who);
  const up: Record<string, unknown> = {};
  if (patch?.권한 !== undefined) up.role = roleOf(patch.권한);
  if (patch?.사용 !== undefined) up.active = S(patch.사용) !== "N";
  if (patch?.비밀번호초기화) up.pw_hash = null;
  if (!Object.keys(up).length) return { ok: true };
  if (me && (up.active === false || up.role === "staff"))
    throw new Error("자기 자신은 멈추거나 대표 권한을 뺄 수 없습니다.");
  if (me && up.pw_hash === null)   // v27
    throw new Error("자기 비밀번호는 여기서 초기화할 수 없습니다. (로그인한 채로 비밀번호 바꾸기를 써 주세요)");
  /* 검사소에 쓰는 대표가 한 명은 남아야 합니다 */
  const losesOwner = S(u.role) === "owner" && u.active !== false && (up.role === "staff" || up.active === false);
  if (losesOwner) {
    const { data: owners } = await db.from("check_user").select("id")
      .eq("office_id", ctx.office.id).eq("role", "owner").eq("active", true);
    if ((owners ?? []).filter((o: any) => S(o.id) !== S(u.id)).length < 1)
      throw new Error("대표가 한 명은 있어야 합니다.");
  }
  const { error } = await db.from("check_user").update(up).eq("id", u.id).eq("office_id", ctx.office.id);
  if (error) throw new Error(error.message);
  /* 권한·사용·비밀번호가 바뀌면 그 사람의 이 검사소 로그인을 끊습니다 */
  await db.from("check_session").delete().eq("phone", S(u.phone)).eq("office_id", ctx.office.id);
  if (up.active !== undefined) await cggSync(S(u.phone));
  await log(ctx, "직원 고치기", { name: S(u.name), phone: phoneMask(u.phone), ...up, pw_hash: up.pw_hash === null ? "초기화" : undefined });
  return { ok: true };
}

async function log(ctx: Ctx, what: string, detail: unknown) {
  await db.from("check_log").insert({ office_id: ctx.office.id, who: ctx.who, what, detail });
}


/* ============================================================
   5. 차량 배달 알림 (모듈 2) — 구글 스크립트에서 그대로 옮김
   · 번호판 읽기 : OCR.space → 앤트로픽 (차곳간워시와 같은 방식)
   · 사진 보관   : 구글 드라이브 → 수파베이스 저장소 (check-deliv)
   · 화면(기사앱·사무실)이 쓰는 이름과 돌려주는 모양은 그대로 둡니다
   ============================================================ */
const DELIV_BUCKET = "check-deliv";
const LOG_HEAD = ["배달ID","도착일시","딜러","상사","딜러연락처","차량번호","차대번호","차명","성능번호",
  "목적지","목적지분류","기사","위도","경도","위치정확도(m)","사진ID","추가사진ID","번호판읽기",
  "발송방법","발송결과","발송사유","메시지ID","보낸일시","상태","메모"];

/* ───────── 작은 도구 ───────── */
const KST = 9 * 3600000;
function kstNow() { return new Date(Date.now() + KST); }
function fmtTs(d: Date) {
  const z = (n: number) => String(n).padStart(2, "0");
  return d.getUTCFullYear() + "-" + z(d.getUTCMonth() + 1) + "-" + z(d.getUTCDate()) + " " +
         z(d.getUTCHours()) + ":" + z(d.getUTCMinutes()) + ":" + z(d.getUTCSeconds());
}
function ymdK(d: Date) { return fmtTs(d).slice(0, 10); }
function plateNorm(v: unknown) { return S(v).replace(/[\s\-]/g, ""); }
function telFmt(v: unknown) {
  const n = S(v).replace(/[^0-9]/g, "");
  if (n.length === 11) return n.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  if (n.length === 10) return n.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
  return S(v);
}
/** 글자에서 한국 번호판 모양만 골라냅니다 (12가3456 · 123가4567 · 서울12가3456) */
function platesFrom(text: string) {
  const out: string[] = [];
  const re = /(\d{2,3})\s*([가-힣])\s*(\d{4})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(S(text))) !== null) {
    const p = m[1] + m[2] + m[3];
    if (!out.includes(p)) out.push(p);
  }
  return out;
}
/** 하루 한도 — check_rate_bump 가 아직 없으면 막지 않고 통과시킵니다 */
async function rateOk(key: string, max: number) {
  try {
    const { data, error } = await db.rpc("check_rate_bump", { p_key: key, p_max: max });
    if (error) return true;
    return data !== false;
  } catch (_) { return true; }
}
function env(k: string, d = "") { return Deno.env.get(k) ?? d; }

/* ───────── 기사 로그인 ───────── */
function tokenOf(name: string, hash: string) {
  return "T1." + btoa(unescape(encodeURIComponent(name))).replace(/=+$/, "") + "." + S(hash).slice(0, 16);
}
/** pin = 기사 토큰(T1.…) 또는 사무실 로그인 열쇠 */
async function delivWho(pin: string, need: "driver" | "office" = "driver") {
  const p = S(pin);
  if (p.startsWith("T1.")) {
    if (need === "office") throw new Error("사무실 화면은 차곳간체크로 로그인해야 합니다.");
    const { data: d } = await db.from("check_deliv_driver")
      .select("*, check_office(*)").eq("token", p).maybeSingle();
    if (!d || d.active === false) throw new Error("로그인이 풀렸습니다. 다시 로그인해 주세요.");
    return { office: d.check_office, who: S(d.name), driverId: S(d.id) };
  }
  const ctx = await whoIs("", p);
  return { office: ctx.office, who: S(ctx.who), driverId: "" };
}
async function delivConf(officeId: string) {
  const { data } = await db.from("check_deliv_conf").select("*").eq("office_id", officeId).maybeSingle();
  return data ?? { way: "sms", fallback: false, sms_text: "", from_tel: "",
                   ai_on: true, ai_max_day: 400, photo_on: true };
}

/* v23: 기사 비밀번호 — 새로 정하는 비밀번호는 6자 이상 (이미 쓰던 4~5자 비밀번호는 그대로 로그인 가능) */
const DRV_PW_MIN = 6;
function drvPwCheck(p: string) {
  if (S(p).length < DRV_PW_MIN) throw new Error(`비밀번호는 ${DRV_PW_MIN}자 이상으로 적어 주세요.`);
}
/** 회사 기사 비밀번호 → 검사소. 검사소 코드(GAON, 대소문자 상관없음) 또는 사업자번호 숫자(10자리) 둘 다 받습니다 */
async function officeByPin(companyPin: string) {
  const raw = S(companyPin);
  const code = raw.toUpperCase();
  const digits = raw.replace(/[^0-9]/g, "");
  let off: any = null;
  if (code) {
    const { data } = await db.from("check_office").select("id,code,biz_no").eq("code", code).maybeSingle();
    off = data;
  }
  if (!off && digits.length >= 10) {
    const { data: all } = await db.from("check_office").select("id,code,biz_no");
    off = (all ?? []).find((o: any) => S(o.biz_no).replace(/[^0-9]/g, "") === digits) ?? null;
  }
  return off;
}
/* v23: 틀린 횟수 세기 — 검사소+이름마다 하나. 비밀번호를 보기 전에 데이터베이스 함수가 한 번에 올립니다
   (한꺼번에 보내도 새지 않음). 5번까지 시도 가능, 5번째에 10분 잠금. 성공하면 지웁니다. */
const LOCK_MIN_DRV = 10;
const failKey = (officeId: string, name: string) => S(officeId) + ":" + S(name);

/** 기사 로그인 — [이름, 비밀번호, (회사 기사 비밀번호 = 검사소 코드 또는 사업자번호)]
 *  v23: 같은 이름이 여러 검사소에 있으면 회사 기사 비밀번호로 구분합니다. 안 넣어도 이름이 하나뿐이면 예전처럼 들어갑니다. */
async function deliv_login(_c: Ctx, name: string, pw: string, officeCode?: string) {
  const nm = S(name), p = S(pw);
  if (!nm || !p) throw new Error("이름과 비밀번호를 넣어 주세요.");
  let d: any = null;
  if (S(officeCode)) {
    const off = await officeByPin(S(officeCode));
    if (!off) throw new Error("회사 기사 비밀번호가 맞지 않습니다. 사무실에 물어 보세요.");
    const { data } = await db.from("check_deliv_driver").select("*")
      .eq("office_id", off.id).eq("name", nm).maybeSingle();
    d = data;
  } else {
    const { data: rows } = await db.from("check_deliv_driver").select("*").eq("name", nm);
    const all = rows ?? [];
    const live = all.filter((r: any) => r.active !== false);
    if (live.length > 1 || (!live.length && all.length > 1))
      throw new Error("같은 이름의 기사가 여러 회사에 있습니다. 회사 기사 비밀번호(검사소 코드)를 함께 넣어 주세요.");
    d = live[0] ?? all[0] ?? null;
  }
  if (!d) throw new Error("없는 이름입니다. 처음이면 [계정 만들기]를 눌러 주세요.");
  if (d.active === false) throw new Error("사용이 멈춘 계정입니다. 사무실에 물어 보세요.");
  if (!S(d.pw_hash)) throw new Error("비밀번호가 초기화되었습니다. [계정 만들기]에서 새 비밀번호를 정해 주세요.");
  // v23: 비밀번호를 보기 전에 시도 횟수부터 올립니다. 함수가 없으면 문을 닫는 쪽(거절)
  const key = failKey(d.office_id, d.name);
  const { data: can, error: aerr } = await db.rpc("check_deliv_attempt", { p_key: key });
  if (aerr) throw new Error("서버 준비 중입니다 (기사 로그인 보안 SQL 02 를 먼저 실행해야 합니다). 대표님께 알려 주세요.");
  if (can === false)
    throw new Error(`비밀번호를 여러 번 틀려 ${LOCK_MIN_DRV}분 동안 잠겼습니다. 잠시 뒤 다시 해 주세요.`);
  if (!(await pwOk(p, d.pw_hash))) throw new Error("비밀번호가 맞지 않습니다.");
  await db.from("check_deliv_fail").delete().eq("key", key);
  const tk = tokenOf(nm, d.pw_hash);
  await db.from("check_deliv_driver").update({ token: tk, last_in: new Date().toISOString() }).eq("id", d.id);
  return { ok: true, name: nm, token: tk };
}
async function deliv_signup(_c: Ctx, companyPin: string, name: string, pw: string) {
  const nm = S(name), p = S(pw);
  if (!nm) throw new Error("이름을 넣어 주세요.");
  if (nm.length > 20) throw new Error("이름이 너무 깁니다.");
  drvPwCheck(p);
  const off = await officeByPin(companyPin);
  if (!off) throw new Error("회사 기사 비밀번호가 맞지 않습니다. 사무실에 물어 보세요.");
  const h = await pwHash(p);
  /* v22: 이름은 이 검사소 안에서만 찾고, 가입한 계정은 사무실이 [사용]으로 바꿔 줄 때까지 멈춰 둡니다.
     (회사 기사 비밀번호만 알면 아무나 기사 열쇠를 받아 배달 목록을 보던 길을 막음) */
  const { data: had } = await db.from("check_deliv_driver").select("*")
    .eq("office_id", off.id).eq("name", nm).maybeSingle();
  if (had && S(had.pw_hash)) throw new Error("이미 있는 이름입니다. [로그인]으로 들어가세요.");
  /* v23: 「가입 신청」 표시를 먼저 남깁니다 — 사무실 목록에 따로 보여서, 승인 전에 그 기사에게 직접 물어볼 수 있게.
     표시를 못 남기면 가입도 받지 않습니다 (표시 없는 승인 대기가 생기지 않도록) */
  const { error: serr } = await db.from("check_deliv_signup").upsert(
    { office_id: off.id, name: nm, requested_at: new Date().toISOString() }, { onConflict: "office_id,name" });
  if (serr) throw new Error("서버 준비 중입니다 (기사 로그인 보안 SQL 02 를 먼저 실행해야 합니다). 대표님께 알려 주세요.");
  if (had) {
    await db.from("check_deliv_driver").update({ pw_hash: h, token: null, active: false }).eq("id", had.id);
  } else {
    await db.from("check_deliv_driver").insert({ office_id: off.id, name: nm, pw_hash: h, token: null, active: false });
  }
  throw new Error("가입 신청이 됐습니다. 사무실에서 [사용]으로 바꿔 주면 [로그인]으로 들어올 수 있어요.");
}
async function deliv_changePw(_c: Ctx, token: string, oldPw: string, newPw: string) {
  const w = await delivWho(token);
  const { data: d } = await db.from("check_deliv_driver").select("*").eq("id", w.driverId).maybeSingle();
  if (!d || !(await pwOk(S(oldPw), d.pw_hash))) throw new Error("지금 비밀번호가 맞지 않습니다.");
  drvPwCheck(S(newPw));
  const h = await pwHash(S(newPw));
  const tk = tokenOf(w.who, h);
  await db.from("check_deliv_driver").update({ pw_hash: h, token: tk }).eq("id", d.id);
  return { ok: true, name: w.who, token: tk };
}

/* ───────── 줄 모양 바꾸기 (표 ↔ 화면) ───────── */
function rowOut(r: any, photos: any[]) {
  const main = photos.find((p) => N(p.ord) === 0);
  const more = photos.filter((p) => N(p.ord) > 0).map((p) => S(p.id));
  return {
    배달ID: S(r.id), 도착일시: fmtTs(new Date(new Date(r.arrived_at).getTime() + KST)),
    딜러: S(r.dealer_name), 상사: S(r.company_name), 딜러연락처: telFmt(r.tel),
    차량번호: S(r.plate), 차대번호: "", 차명: S(r.car_name), 성능번호: "",
    목적지: S(r.dest_name), 목적지분류: "", 기사: S(r.driver_name),
    위도: "", 경도: "", "위치정확도(m)": "",
    사진ID: main ? S(main.id) : "", 추가사진ID: more.join(","),
    번호판읽기: S(r.plate_ocr) ? (S(r.plate_ocr) === S(r.plate) ? "자동" : "고침") : "직접",
    발송방법: S(r.how).toUpperCase(), 발송결과: S(r.state) === "보냄" ? "성공" : (S(r.state) === "못 보냄" ? "실패" : ""),
    발송사유: S(r.err), 메시지ID: "", 보낸일시: r.sent_at ? fmtTs(new Date(new Date(r.sent_at).getTime() + KST)) : "",
    상태: S(r.state) === "취소" ? "취소" : (r.trashed ? "삭제" : ""), 메모: S(r.memo),
    _view: S(r.view_key), _viewAt: r.view_at ? fmtTs(new Date(new Date(r.view_at).getTime() + KST)) : "",
  };
}
async function rowsBetween(officeId: string, from: string, to: string, trash = false) {
  const f = S(from) || ymdK(kstNow());
  const t = S(to) || f;
  const { data } = await db.from("check_deliv").select("*")
    .eq("office_id", officeId).eq("trashed", trash)
    .gte("arrived_at", f + "T00:00:00+09:00").lte("arrived_at", t + "T23:59:59+09:00")
    .order("arrived_at", { ascending: true }).limit(3000);
  const ids = (data ?? []).map((r) => r.id);
  const { data: ph } = ids.length
    ? await db.from("check_deliv_photo").select("id,deliv_id,ord").in("deliv_id", ids)
    : { data: [] as any[] };
  return (data ?? []).map((r) => rowOut(r, (ph ?? []).filter((p) => p.deliv_id === r.id)));
}

/* ───────── 사진 ───────── */
function b64bin(b64: string) {
  const raw = S(b64).replace(/^data:[^,]+,/, "");
  const bin = atob(raw);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function photoPut(delivId: string, b64: string, ord: number) {
  const bytes = b64bin(b64);
  const path = delivId + "/" + ord + ".jpg";
  const { error } = await db.storage.from(DELIV_BUCKET)
    .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error("사진 저장 실패 : " + error.message);
  const { data } = await db.from("check_deliv_photo")
    .insert({ deliv_id: delivId, ord, path, bytes: bytes.length }).select("id").single();
  return S(data?.id);
}
async function deliv_photo(_c: Ctx, pin: string, photoId: string) {
  await delivWho(pin);
  const { data: p } = await db.from("check_deliv_photo").select("path").eq("id", S(photoId)).maybeSingle();
  if (!p) throw new Error("사진을 찾지 못했습니다.");
  const { data: signed } = await db.storage.from(DELIV_BUCKET).createSignedUrl(p.path, 3600);
  /* 화면이 <img src=…> 로 바로 쓰도록 b64 자리에도 주소를 넣어 줍니다 */
  return { ok: true, url: S(signed?.signedUrl), b64: S(signed?.signedUrl) };
}

/* ───────── 사진 읽기 (Claude) — 차곳간워시와 똑같은 방식 ─────────
   앱이 보낸 사진을 읽어 JSON 글자 하나로 돌려줍니다.
   prompt : 무엇을 읽을지 시키는 글
   b64    : 사진을 base64 로 바꾼 글자 (앞의 data:image/... 는 떼고 보냅니다) */
/** 모델 이름 — claude-haiku-5.5 처럼 점을 찍어도 claude-haiku-5-5 로 고쳐 씁니다 */
function aiModel() {
  const m = env("ANTHROPIC_MODEL", "claude-haiku-5-5").trim();
  return m.replace(/(\d)\.(\d)/g, "$1-$2");
}
/** 무엇이 잘못됐는지 쉬운 말로 */
function aiWhy(msg: string) {
  const m = S(msg);
  if (/invalid x-api-key|authentication|401/i.test(m)) return "AI 열쇠가 잘못되었습니다 (ANTHROPIC_KEY 확인)";
  if (/not_found|404|model/i.test(m)) return "AI 모델 이름이 맞지 않습니다 (ANTHROPIC_MODEL 확인) — " + aiModel();
  if (/credit|billing|402/i.test(m)) return "AI 잔액이 부족합니다";
  if (/429|rate_limit/i.test(m)) return "잠시 뒤에 다시 해주세요";
  if (/한도/.test(m)) return m;
  return m || "원인 모름";
}
function aiShop(c: Ctx) {
  const code = S(c?.office?.code);
  if (!code) throw new Error("검사소를 알 수 없어 사진 읽기를 할 수 없습니다. 다시 로그인해 주세요.");
  return code;
}
async function aiJson(shop: string, prompt: string, b64: string) {
  const key = env("ANTHROPIC_KEY");
  if (!key) throw new Error("ANTHROPIC_KEY 가 없습니다");

  /* 업체당 하루 한도 — 요금이 새지 않게 합니다 */
  if (!await rateOk("ai:" + shop, Number(env("AI_MAX_DAY", "200"))))
    throw new Error("오늘 번호판 자동읽기 한도를 다 썼습니다. 번호를 직접 적어 주세요");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: aiModel(),
      max_tokens: 500,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg",
          data: S(b64).replace(/^data:[^,]+,/, "") } },
        { type: "text", text: prompt },
      ] }],
    }),
  });

  const j: any = await res.json().catch(() => ({}));
  if (!j.content) throw new Error(aiWhy((j.error?.message || "") + " " + res.status));

  /* 쓴 만큼 적어 둡니다 (실패해도 그냥 넘어갑니다) */
  try {
    await db.from("check_usage").insert({
      shop, kind: "ai",
      in_tok: j.usage?.input_tokens || 0,
      out_tok: j.usage?.output_tokens || 0,
    });
  } catch (_) { /* 기록 실패는 무시 */ }

  let text = j.content.map((c: any) => c.text || "").join("").trim();
  text = text.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  JSON.parse(text);          /* 모양이 틀리면 여기서 걸립니다 */
  return text;
}

/* 시키는 글 — 차곳간워시에서 다듬은 원문. 토씨를 바꾸지 마세요 */
const PLATE_PROMPT =
  "아래 사진은 한국 중고차 사진입니다. 번호판에 적힌 차량번호를 읽어 주세요.\n" +
  "JSON 하나만 답하세요. 다른 말은 쓰지 마세요.\n" +
  '형식: {"plate":"12가3456","sure":true}\n' +
  "- 지역명(서울, 경기 등)이 번호판에 있으면 앞에 붙여 적으세요.\n" +
  "- 공백 없이 붙여 쓰세요.\n" +
  '- 번호판이 안 보이거나 확실하지 않으면 {"plate":"","sure":false}';

const CARD_PROMPT =
  "명함 사진입니다. 적힌 내용을 읽어 JSON 하나로만 답하세요. 다른 말은 쓰지 마세요.\n" +
  '형식: {"name":"이름","phone":"010-0000-0000","company":"회사(상사)명","bizName":"상호","bizNo":"000-00-00000","email":"","addr":""}\n' +
  "- 없는 값은 빈 문자열로 두세요.\n" +
  "- 휴대폰은 010으로 시작하는 번호를 고르세요.";

const BIZ_PROMPT =
  "사업자등록증(또는 홈택스 출력물) 사진입니다. 적힌 내용을 읽어 JSON 하나로만 답하세요. 다른 말은 쓰지 마세요.\n" +
  '형식: {"bizNo":"000-00-00000","bizName":"상호","ceo":"대표자","addr":"사업장 주소","upte":"업태","jongmok":"종목"}\n' +
  "- 없는 값은 빈 문자열로 두세요.";

/** 기사앱이 부르는 번호판 읽기 — 화면 코드를 그대로 두려고 모양을 맞춰 돌려줍니다 */
async function deliv_readPlate(_c: Ctx, pin: string, b64: string) {
  const w = await delivWho(pin);
  const conf = await delivConf(w.office.id);
  if (conf.ai_on === false) return { ok: true, engine: "꺼둠", plates: [], text: "" };
  try {
    const raw = await aiJson(S(w.office.code) || S(w.office.id), PLATE_PROMPT, b64);
    const v = JSON.parse(raw);
    const p = S(v.plate).replace(/\s/g, "");
    return { ok: true, engine: "Claude", sure: v.sure !== false,
             plates: p ? [p] : [], text: raw.slice(0, 300) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ───────── 문자 · 알림톡 보내기 ───────── */
const solaHex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
async function solaHmac(keyBytes: Uint8Array, msg: Uint8Array) {
  const k = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return await crypto.subtle.sign("HMAC", k, msg);
}
async function solapiAuth() {
  const key = Deno.env.get("SOLAPI_KEY") ?? "", secret = Deno.env.get("SOLAPI_SECRET") ?? "";
  if (!key || !secret) throw new Error("SOLAPI_KEY / SOLAPI_SECRET 를 넣어주세요");
  const date = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const salt = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
  const te = new TextEncoder();
  const sig = solaHex(await solaHmac(te.encode(secret), te.encode(date + salt)));
  return `HMAC-SHA256 apiKey=${key}, date=${date}, salt=${salt}, signature=${sig}`;
}
async function solapi(method: string, path: string, payload?: unknown) {
  const res = await fetch("https://api.solapi.com" + path, {
    method, headers: { Authorization: await solapiAuth(), "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const body = await res.text();
  if (res.status >= 300) throw new Error("솔라피 " + res.status + " : " + body);
  return body ? JSON.parse(body) : {};
}
/** 솔라피에 사진을 올려 두고 그 번호(fileId)를 받습니다 — MMS 에 붙일 때 씁니다 */
async function solapiPhoto(b64: string, name = "car.jpg") {
  const data = S(b64).replace(/^data:[^,]+,/, "");
  if (!data) return "";
  try {
    const r: any = await solapi("POST", "/storage/v1/files", { file: data, name, type: "MMS" });
    return S(r?.fileId);
  } catch (_) { return ""; }   /* 사진이 안 올라가도 글자는 보냅니다 */
}
/** 저장소에 넣어 둔 사진을 base64 로 다시 꺼냅니다 (다시 보내기용) */
async function photoB64(delivId: string) {
  const { data: p } = await db.from("check_deliv_photo").select("path")
    .eq("deliv_id", delivId).eq("ord", 0).maybeSingle();
  if (!p) return "";
  const { data: f } = await db.storage.from(DELIV_BUCKET).download(p.path);
  if (!f) return "";
  const buf = new Uint8Array(await f.arrayBuffer());
  let bin = ""; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin);
}

/** 문구에 값 채우기 */
function fillText(tpl: string, v: Record<string, string>) {
  let t = S(tpl);
  for (const k of Object.keys(v)) t = t.split("[" + k + "]").join(v[k]);
  return t;
}
/** 한 건 보내기 — 돌려주는 모양은 구글 스크립트와 같습니다 */
async function notifyOne(office: any, conf: any, row: any, viewKey: string, photo = "") {
  const to = S(row.tel).replace(/[^0-9]/g, "");
  if (!to) return { ok: false, why: "연락처 없음", how: "" };
  const from = S(conf.from_tel || office.sms_from).replace(/[^0-9]/g, "");
  if (!from) return { ok: false, why: "보내는 번호 없음", how: "" };

  const text = fillText(conf.sms_text || "[우리 회사] 차량 도착 안내\n\n[딜러] 님\n[차량번호] [차명] 차량이 [목적지]에 도착했습니다.\n\n· 도착 [도착 시각]\n· 기사 [기사]\n\n사진은 아래 주소에서 보실 수 있습니다.\n[사진 주소]\n문의 : [우리 연락처]", {
    "우리 회사": S(office.name), "딜러": S(row.dealer_name), "상사": S(row.company_name),
    "차량번호": S(row.plate), "차명": S(row.car_name), "목적지": S(row.dest_name),
    "도착 시각": fmtTs(new Date(new Date(row.arrived_at).getTime() + KST)).slice(5, 16),
    "기사": S(row.driver_name),
    "사진 주소": "https://check.cgg.co.kr/d/" + viewKey,
    "우리 연락처": S(office.tel),
  });

  const way = S(conf.way) || "sms";
  try {
    if (way === "ata" && S(conf.ata_tpl)) {
      await solapi("POST", "/messages/v4/send-many/detail", { messages: [{
        to, from, kakaoOptions: { pfId: S(conf.ata_pf), templateId: S(conf.ata_tpl),
          variables: { "#{업체명}": S(office.name), "#{딜러}": S(row.dealer_name),
            "#{차량번호}": S(row.plate), "#{차명}": S(row.car_name), "#{목적지}": S(row.dest_name),
            "#{도착시각}": fmtTs(new Date(new Date(row.arrived_at).getTime() + KST)).slice(5, 16),
            "#{기사}": S(row.driver_name), "#{연락처}": S(office.tel), "#{링크}": viewKey },
          disableSms: conf.fallback !== true },
      }] });
      return { ok: true, why: "", how: "ata" };
    }
    /* 사진 붙여 보내기가 켜져 있고 사진이 있으면 MMS 로 같이 보냅니다 */
    const wantPhoto = conf.photo_on !== false;
    const fileId = (wantPhoto && photo) ? await solapiPhoto(photo, S(row.plate) || "car.jpg") : "";
    const msg: any = { to, from, text, subject: "차량 도착 안내" };
    if (fileId) { msg.type = "MMS"; msg.imageId = fileId; }
    else { msg.type = text.length > 45 ? "LMS" : "SMS"; }
    await solapi("POST", "/messages/v4/send-many/detail", { messages: [msg] });
    return { ok: true, why: "", how: fileId ? "mms" : (text.length > 45 ? "lms" : "sms") };
  } catch (e) {
    return { ok: false, why: e instanceof Error ? e.message : String(e), how: way };
  }
}

/* ───────── 첫 화면 열기 ───────── */
async function deliv_boot(_c: Ctx, pin: string, driver?: string) {
  const w = await delivWho(pin);
  const conf = await delivConf(w.office.id);
  const { data: dests } = await db.from("check_deliv_dest").select("*")
    .eq("office_id", w.office.id).eq("active", true).order("ord");
  const { data: dealers } = await db.from("check_dealer")
    .select("id,name,tel,tels,company_id,check_company(name)").eq("office_id", w.office.id).eq("active", true);
  const today = ymdK(kstNow());
  const rows = await rowsBetween(w.office.id, today, today);
  const freq: Record<string, number> = {}; const recent: string[] = [];
  const { data: last500 } = await db.from("check_deliv").select("dest_name")
    .eq("office_id", w.office.id).eq("trashed", false)
    .order("arrived_at", { ascending: false }).limit(500);
  for (const r of last500 ?? []) {
    const d = S(r.dest_name); if (!d) continue;
    freq[d] = (freq[d] ?? 0) + 1;
    if (!recent.includes(d) && recent.length < 40) recent.push(d);
  }
  return {
    ok: true, ver: VER, me: w.who, company: S(w.office.name),
    dests: (dests ?? []).map((d) => ({ 목적지: S(d.name), 분류: S(d.kind), 사용: "Y" })),
    dealers: (dealers ?? []).map((d: any) => ({
      딜러: S(d.name), 상사: S(d.check_company?.name), 연락처: telFmt(d.tel),
      추가번호: (d.tels ?? []).map((t: any) => telFmt(t?.tel)).filter(Boolean).join(","),
    })),
    cars: [], today: rows, shared: { freq, recent },
    test: false, testTo: "", gps: true, how: S(conf.way).toUpperCase(),
    dupMin: 10, syncAt: "",
  };
}
async function deliv_cars(_c: Ctx, pin: string) {
  const w = await delivWho(pin);
  const since = ymdK(new Date(Date.now() + KST - 120 * 86400000));
  const { data } = await db.from("check_car").select("plate,car_name,dealer_text,comp_text,no,check_date")
    .eq("office_id", w.office.id).gte("check_date", since).limit(8000);
  return { ok: true, cars: (data ?? []).map((c) => ({
    차량번호: plateNorm(c.plate), 차명: S(c.car_name), 딜러: S(c.dealer_text),
    상사: S(c.comp_text), 성능번호: S(c.no), 검사일: S(c.check_date),
  })) };
}

/* ───────── 도착 등록 + 알림 보내기 ───────── */
async function deliv_arrive(_c: Ctx, pin: string, rec: any) {
  const w = await delivWho(pin);
  const conf = await delivConf(w.office.id);
  rec = rec ?? {};
  const plate = plateNorm(rec.plate);
  if (!S(rec.dest)) throw new Error("목적지를 골라 주세요.");
  if (!S(rec.dealer) && !S(rec.tel).replace(/[^0-9]/g, "")) throw new Error("딜러 이름이나 연락처를 넣어 주세요.");

  /* 같은 차·같은 목적지를 방금 보냈는지 */
  const dupMin = 10;
  if (!rec.force && dupMin > 0) {
    const since = new Date(Date.now() - dupMin * 60000).toISOString();
    const q = db.from("check_deliv").select("arrived_at")
      .eq("office_id", w.office.id).eq("dest_name", S(rec.dest))
      .neq("state", "취소").gte("arrived_at", since);
    const { data: dup } = plate ? await q.eq("plate", plate) : await q.eq("dealer_name", S(rec.dealer));
    if (dup?.length) {
      return { ok: false, dup: true, at: fmtTs(new Date(new Date(dup[dup.length - 1].arrived_at).getTime() + KST)) };
    }
  }

  /* 목적지가 새 것이면 더합니다 */
  await db.from("check_deliv_dest").upsert(
    { office_id: w.office.id, name: S(rec.dest), kind: S(rec.destKind) },
    { onConflict: "office_id,name", ignoreDuplicates: true });

  /* 딜러 이어 붙이기 */
  const { data: dl } = S(rec.dealer)
    ? await db.from("check_dealer").select("id,tel").eq("office_id", w.office.id).eq("name", S(rec.dealer)).maybeSingle()
    : { data: null };

  const when = new Date();
  const vkey = viewKey();
  const row: any = {
    office_id: w.office.id, arrived_at: when.toISOString(),
    driver_id: w.driverId || null, driver_name: S(w.who || rec.driver),
    plate, plate_ocr: S(rec.plateOcr || (S(rec.plateHow) === "자동" ? plate : "")),
    car_name: S(rec.car), dealer_id: dl?.id ?? null, dealer_name: S(rec.dealer),
    company_name: S(rec.comp), tel: telFmt(rec.tel || dl?.tel),
    dest_name: S(rec.dest), gps: (rec.lat && rec.lng) ? (rec.lat + "," + rec.lng) : "",
    memo: S(rec.memo), state: "대기", how: S(conf.way) || "sms", view_key: vkey,
  };
  const { data: saved, error } = await db.from("check_deliv").insert(row).select().single();
  if (error) throw new Error(error.message);

  /* 사진 — 첫 장은 번호판용, 뒤 2장은 보관용 */
  if (rec.photo) { try { await photoPut(saved.id, rec.photo, 0); } catch (_) { /* 사진 실패는 알림을 막지 않습니다 */ } }
  const more = (rec.photos ?? []).slice(0, 2);
  for (let i = 0; i < more.length; i++) {
    if (!more[i]) continue;
    try { await photoPut(saved.id, more[i], i + 1); } catch (_) { /* 넘어갑니다 */ }
  }

  /* 보내기 — 첫 사진을 문자에 붙입니다 */
  const s = await notifyOne(w.office, conf, saved, vkey, S(rec.photo));
  await db.from("check_deliv").update({
    state: s.ok ? "보냄" : "못 보냄", how: s.how || row.how,
    err: s.why, sent_at: s.ok ? new Date().toISOString() : null,
  }).eq("id", saved.id);

  const { data: fin } = await db.from("check_deliv").select("*").eq("id", saved.id).maybeSingle();
  const { data: ph } = await db.from("check_deliv_photo").select("id,deliv_id,ord").eq("deliv_id", saved.id);
  await log({ office: w.office, who: w.who, role: "driver" } as Ctx, "차량 도착", { plate, dest: S(rec.dest), ok: s.ok });
  return { ok: true, row: rowOut(fin, ph ?? []) };
}

/* ───────── 목록 · 고치기 ───────── */
async function deliv_mylist(_c: Ctx, pin: string, from: string, to: string, driver?: string) {
  const w = await delivWho(pin);
  let rows = await rowsBetween(w.office.id, from, to);
  if (S(driver)) rows = rows.filter((r) => r.기사 === S(driver));
  return { ok: true, rows };
}
async function deliv_list(_c: Ctx, pin: string, from: string, to: string, trash?: boolean) {
  const w = await delivWho(pin);
  const rows = await rowsBetween(w.office.id, from, to, trash === true);
  const conf = await delivConf(w.office.id);
  const { data: dests } = await db.from("check_deliv_dest").select("*").eq("office_id", w.office.id).order("ord");
  const { count: trashN } = await db.from("check_deliv").select("id", { count: "exact", head: true })
    .eq("office_id", w.office.id).eq("trashed", true);
  const { count: dealerN } = await db.from("check_dealer").select("id", { count: "exact", head: true })
    .eq("office_id", w.office.id);
  const { count: carN } = await db.from("check_car").select("id", { count: "exact", head: true })
    .eq("office_id", w.office.id);
  return { ok: true, rows, ver: VER, test: false, testTo: "", syncAt: "",
    dests: (dests ?? []).map((d) => ({ 목적지: S(d.name), 분류: S(d.kind), 사용: d.active ? "Y" : "N" })),
    dealerN: dealerN ?? 0, carN: carN ?? 0, trashN: trashN ?? 0, trashDays: 30, extraN: 0,
    conf: { way: S(conf.way), fallback: conf.fallback === true,
            photo_on: conf.photo_on !== false, from_tel: S(conf.from_tel) } };
}
async function deliv_one(_c: Ctx, pin: string, id: string) {
  const w = await delivWho(pin);
  const { data: r } = await db.from("check_deliv").select("*")
    .eq("office_id", w.office.id).eq("id", S(id)).maybeSingle();
  if (!r) throw new Error("그 배달을 찾지 못했습니다.");
  const { data: ph } = await db.from("check_deliv_photo").select("id,deliv_id,ord").eq("deliv_id", r.id);
  return { ok: true, row: rowOut(r, ph ?? []) };
}
const PATCH_MAP: Record<string, string> = {
  "딜러": "dealer_name", "상사": "company_name", "딜러연락처": "tel", "차량번호": "plate",
  "차명": "car_name", "목적지": "dest_name", "메모": "memo", "상태": "state",
};
async function deliv_update(_c: Ctx, pin: string, id: string, patch: any) {
  const w = await delivWho(pin);
  const up: Record<string, unknown> = {};
  for (const k of Object.keys(patch ?? {})) {
    const col = PATCH_MAP[k]; if (!col) continue;
    up[col] = k === "딜러연락처" ? telFmt(patch[k]) : (k === "차량번호" ? plateNorm(patch[k]) : S(patch[k]));
  }
  if (!Object.keys(up).length) return { ok: true };
  const { error } = await db.from("check_deliv").update(up).eq("office_id", w.office.id).eq("id", S(id));
  if (error) throw new Error(error.message);
  return { ok: true };
}
async function deliv_cancel(_c: Ctx, pin: string, ids: string[], undo?: boolean) {
  const w = await delivWho(pin);
  const list = (ids ?? []).map(S).filter(Boolean);
  if (!list.length) return { ok: true, n: 0 };
  await db.from("check_deliv").update({ state: undo ? "보냄" : "취소" })
    .eq("office_id", w.office.id).in("id", list);
  return { ok: true, n: list.length };
}
async function deliv_trash(_c: Ctx, pin: string, ids: string[], undo?: boolean, who?: string) {
  const w = await delivWho(pin);
  const list = (ids ?? []).map(S).filter(Boolean);
  if (!list.length) return { ok: true, n: 0 };
  await db.from("check_deliv").update(undo
    ? { trashed: false, trashed_at: null, trashed_by: null }
    : { trashed: true, trashed_at: new Date().toISOString(), trashed_by: S(who || w.who) })
    .eq("office_id", w.office.id).in("id", list);
  return { ok: true, n: list.length };
}
async function deliv_resend(_c: Ctx, pin: string, ids: string[]) {
  const w = await delivWho(pin);
  const conf = await delivConf(w.office.id);
  const out: any[] = [];
  for (const id of (ids ?? []).map(S).filter(Boolean)) {
    const { data: r } = await db.from("check_deliv").select("*")
      .eq("office_id", w.office.id).eq("id", id).maybeSingle();
    if (!r) { out.push({ id, ok: false, why: "없는 건" }); continue; }
    if (S(r.state) === "취소") { out.push({ id, ok: false, why: "취소된 건" }); continue; }
    const vkey = S(r.view_key) || viewKey();
    const ph = await photoB64(id);
    const s = await notifyOne(w.office, conf, r, vkey, ph);
    await db.from("check_deliv").update({
      state: s.ok ? "보냄" : "못 보냄", how: s.how || r.how, err: s.why, view_key: vkey,
      sent_at: s.ok ? new Date().toISOString() : r.sent_at,
    }).eq("id", id);
    out.push({ id, ok: s.ok, why: s.why });
  }
  return { ok: true, results: out };
}

/* ───────── 목적지 · 설정 · 기사 계정 ───────── */
async function deliv_addDest(_c: Ctx, pin: string, name: string, kind?: string) {
  const w = await delivWho(pin);
  if (!S(name)) throw new Error("목적지 이름을 넣어 주세요.");
  const { data: max } = await db.from("check_deliv_dest").select("ord")
    .eq("office_id", w.office.id).order("ord", { ascending: false }).limit(1);
  await db.from("check_deliv_dest").upsert({
    office_id: w.office.id, name: S(name), kind: S(kind), ord: (N(max?.[0]?.ord) || 0) + 1, active: true,
  }, { onConflict: "office_id,name" });
  return { ok: true };
}
async function deliv_editDest(_c: Ctx, pin: string, oldName: string, patch: any) {
  const w = await delivWho(pin);
  const up: Record<string, unknown> = {};
  if (patch?.목적지 !== undefined) up.name = S(patch.목적지);
  if (patch?.분류 !== undefined) up.kind = S(patch.분류);
  if (patch?.사용 !== undefined) up.active = S(patch.사용) !== "N";
  if (patch?.주소 !== undefined) up.addr = S(patch.주소);
  if (!Object.keys(up).length) return { ok: true };
  const { error } = await db.from("check_deliv_dest").update(up)
    .eq("office_id", w.office.id).eq("name", S(oldName));
  if (error) throw new Error(error.message);
  if (up.name && S(up.name) !== S(oldName)) {
    await db.from("check_deliv").update({ dest_name: S(up.name) })
      .eq("office_id", w.office.id).eq("dest_name", S(oldName));
  }
  return { ok: true };
}
async function deliv_conf(_c: Ctx, pin: string) {
  const w = await delivWho(pin);
  const c = await delivConf(w.office.id);
  return { ok: true, conf: {
    way: S(c.way) || "sms", fallback: c.fallback === true,
    sms_text: S(c.sms_text), ata_tpl: S(c.ata_tpl), from_tel: S(c.from_tel),
    ai_on: c.ai_on !== false, ai_max_day: N(c.ai_max_day) || 400,
    photo_on: c.photo_on !== false,
    ai_ready: !!Deno.env.get("ANTHROPIC_KEY"), sms_ready: !!Deno.env.get("SOLAPI_KEY"),
  } };
}
async function deliv_saveConf(_c: Ctx, pin: string, patch: any) {
  const w = await delivWho(pin, "office");
  const ok = ["way", "fallback", "sms_text", "ata_tpl", "ata_pf", "from_tel",
              "ai_on", "ai_max_day", "photo_on"];
  const up: Record<string, unknown> = { office_id: w.office.id, updated_at: new Date().toISOString() };
  for (const k of ok) if (patch?.[k] !== undefined) up[k] = patch[k];
  const { error } = await db.from("check_deliv_conf").upsert(up, { onConflict: "office_id" });
  if (error) throw new Error(error.message);
  return { ok: true };
}
async function deliv_accounts(_c: Ctx, pin: string) {
  const w = await delivWho(pin, "office");
  const { data } = await db.from("check_deliv_driver").select("id,name,tel,active,last_in,pw_hash")
    .eq("office_id", w.office.id).order("name");
  /* v23: 기사가 스스로 가입한 계정(승인 대기)은 「가입신청: Y」 — 승인 전에 그 기사에게 직접 물어보세요.
     표가 아직 없으면 표시만 빠지고 목록은 그대로 보여 줍니다 */
  const { data: sign } = await db.from("check_deliv_signup").select("name").eq("office_id", w.office.id);
  const asked = new Set((sign ?? []).map((r: any) => S(r.name)));
  return { ok: true, rows: (data ?? []).map((d) => ({
    이름: S(d.name), 연락처: telFmt(d.tel), 사용: d.active ? "Y" : "N",
    마지막: d.last_in ? fmtTs(new Date(new Date(d.last_in).getTime() + KST)) : "",
    비밀번호: S(d.pw_hash) ? "정해짐" : "초기화됨(새로 정해야 함)",
    가입신청: !d.active && asked.has(S(d.name)) ? "Y" : "",
  })) };
}
/** v23: 「가입 신청」 표시 지우기 (사무실이 승인 · 비밀번호 초기화 · 새로 등록했을 때). 실패해도 막지 않음 */
async function signupClear(officeId: string, name: string) {
  await db.from("check_deliv_signup").delete().eq("office_id", officeId).eq("name", S(name));
}
async function deliv_accountAdd(_c: Ctx, pin: string, name: string, pw: string, tel?: string) {
  const w = await delivWho(pin, "office");
  if (!S(name)) throw new Error("이름을 넣어 주세요.");
  if (S(pw)) drvPwCheck(S(pw));   // v23: 비밀번호를 넣을 때만 6자 이상 (비우면 기사가 처음 가입할 때 정함)
  const h = S(pw) ? await pwHash(S(pw)) : null;
  const { error } = await db.from("check_deliv_driver").upsert({
    office_id: w.office.id, name: S(name), tel: telFmt(tel), pw_hash: h, active: true,
  }, { onConflict: "office_id,name" });
  if (error) throw new Error(error.message);
  await signupClear(w.office.id, S(name));   // 사무실이 직접 등록 → 가입 신청 아님
  return { ok: true };
}
async function deliv_accountEdit(_c: Ctx, pin: string, oldName: string, patch: any) {
  const w = await delivWho(pin, "office");
  const up: Record<string, unknown> = {};
  if (patch?.이름 !== undefined) up.name = S(patch.이름);
  if (patch?.연락처 !== undefined) up.tel = telFmt(patch.연락처);
  if (patch?.사용 !== undefined) up.active = S(patch.사용) !== "N";
  if (patch?.비밀번호초기화) { up.pw_hash = null; up.token = null; }
  if (!Object.keys(up).length) return { ok: true };
  const { error } = await db.from("check_deliv_driver").update(up)
    .eq("office_id", w.office.id).eq("name", S(oldName));
  if (error) throw new Error(error.message);
  /* v23: [사용]으로 승인했거나 비밀번호를 초기화하면 「가입 신청」 표시를 지우고, 이름을 바꾸면 표시도 따라 바꿉니다 */
  if (up.active === true || up.pw_hash === null) await signupClear(w.office.id, S(oldName));
  else if (up.name !== undefined && up.name !== S(oldName))
    await db.from("check_deliv_signup").update({ name: up.name })
      .eq("office_id", w.office.id).eq("name", S(oldName));
  return { ok: true };
}
/** 비어 있는 차명을 차량 장부에서 채웁니다 */
async function deliv_fillBlanks(_c: Ctx, pin: string) {
  const w = await delivWho(pin);
  const { data: rows } = await db.from("check_deliv").select("id,plate,car_name,dealer_name")
    .eq("office_id", w.office.id).or("car_name.is.null,car_name.eq.").limit(500);
  if (!rows?.length) return { ok: true, n: 0 };
  const plates = [...new Set(rows.map((r) => S(r.plate)).filter(Boolean))];
  if (!plates.length) return { ok: true, n: 0 };
  const { data: cars } = await db.from("check_car").select("plate,car_name,dealer_text")
    .eq("office_id", w.office.id).in("plate", plates);
  const byPlate = new Map((cars ?? []).map((c) => [plateNorm(c.plate), c]));
  let n = 0;
  for (const r of rows) {
    const c = byPlate.get(plateNorm(r.plate)); if (!c) continue;
    await db.from("check_deliv").update({
      car_name: S(c.car_name),
      dealer_name: S(r.dealer_name) || S(c.dealer_text),
    }).eq("id", r.id);
    n++;
  }
  return { ok: true, n };
}
/** 알림톡·문자 버튼이 여는 사진 화면 — 로그인 없이 열쇠글로만 봅니다 */
async function deliv_view(_c: Ctx, key: string) {
  const k = S(key).replace(/[^A-Za-z0-9_-]/g, "");
  if (k.length < 8) throw new Error("주소가 올바르지 않습니다.");
  const { data: r } = await db.from("check_deliv").select("*").eq("view_key", k).maybeSingle();
  if (!r) throw new Error("찾지 못했습니다. 주소를 다시 확인해 주세요.");
  const { data: ph } = await db.from("check_deliv_photo").select("id,path,ord").eq("deliv_id", r.id).order("ord");
  const urls: string[] = [];
  for (const p of ph ?? []) {
    const { data: sg } = await db.storage.from(DELIV_BUCKET).createSignedUrl(p.path, 3600);
    if (sg?.signedUrl) urls.push(sg.signedUrl);
  }
  const { data: off } = await db.from("check_office").select("name,tel").eq("id", r.office_id).maybeSingle();
  await db.from("check_deliv").update({ view_at: new Date().toISOString(), view_n: N(r.view_n) + 1 }).eq("id", r.id);
  return {
    office: off ?? {}, photos: urls,
    deliv: {
      plate: S(r.plate), car: S(r.car_name), dest: S(r.dest_name), driver: S(r.driver_name),
      dealer: S(r.dealer_name), at: fmtTs(new Date(new Date(r.arrived_at).getTime() + KST)),
    },
  };
}
async function deliv_ping(_c: Ctx, pin: string) {
  const w = await delivWho(pin);
  return { ok: true, ver: VER, me: w.who, company: S(w.office.name) };
}

/* ============================================================
   들어오는 문 — { shop, token, fn, args }
   ============================================================ */
const OPEN = new Set(["ping", "login", "loginCode", "invoiceView",
  /* 배달 — 기사 폰은 자기 열쇠(T1.…)를 args 로 보냅니다 */
  "deliv_login", "deliv_signup", "deliv_changePw", "deliv_boot", "deliv_cars",
  "deliv_readPlate", "deliv_arrive", "deliv_mylist", "deliv_one", "deliv_resend",
  "deliv_cancel", "deliv_trash", "deliv_update", "deliv_photo", "deliv_addDest",
  "deliv_editDest", "deliv_list", "deliv_conf", "deliv_saveConf", "deliv_accounts",
  "deliv_accountAdd", "deliv_accountEdit", "deliv_fillBlanks", "deliv_ping", "deliv_view"]);
const FN: Record<string, (ctx: Ctx, ...a: any[]) => Promise<unknown>> = {
  // 거래처 · 청구처
  dealers, dealerSave,
  billGroupSet: (c, ids, to, scope, ym) => billGroupSet(c, ids, to, scope, ym),
  billGroupHints,
  // 청구서
  invoiceBuild: (c, ym, opt) => invoiceBuild(c, ym, opt),
  invoiceList: (c, ym, auto) => invoiceList(c, ym, auto),
  billState: (c, ym) => billState(c, ym),
  salesStat: (c, opt) => salesStat(c, opt),
  invoiceRows: (c, id) => invoiceRows(c, id),
  invoiceMove: (c, ym, ids, to, scope) => invoiceMove(c, ym, ids, to, scope),
  invoiceView: (c, key) => invoiceView(c, key),
  depositList: (c, opt) => depositList(c, opt),
  // 로그인
  login: (c, ph, pw, code, ua) => login(c, ph, pw, code, ua),
  loginCode: (c, ph, cd, code, ua) => loginCode(c, ph, cd, code, ua),
  logout: (c, key) => logout(c, key),
  // 검사소 설정
  officeGet, officeSave: (c, body) => officeSave(c, body),
  // v25 직원 권한 (대표만)
  staffList,
  staffAdd: (c, n, p, r) => staffAdd(c, n, p, r),
  staffEdit: (c, id, patch) => staffEdit(c, id, patch),
  dataCount,
  /* ── 사진 읽기 (Claude) — 워시와 같은 통로 ── */
  aiReady: () => Promise.resolve(!!env("ANTHROPIC_KEY")),
  /* v24: 검사소를 모르면 거절 (가온 한도로 대신 세지 않음) */
  aiJson: (c, prompt, b64) => aiJson(aiShop(c), S(prompt), S(b64)),
  aiPlate: (c, b64) => aiJson(aiShop(c), PLATE_PROMPT, S(b64)),
  aiCard: (c, b64) => aiJson(aiShop(c), CARD_PROMPT, S(b64)),
  aiBiz: (c, b64) => aiJson(aiShop(c), BIZ_PROMPT, S(b64)),
  /* ── 차량 배달 알림 (모듈 2) ── */
  deliv_login: (c, n, p, oc) => deliv_login(c, n, p, oc),
  deliv_signup: (c, k, n, p) => deliv_signup(c, k, n, p),
  deliv_changePw: (c, t, o, n) => deliv_changePw(c, t, o, n),
  deliv_boot: (c, pin, dr) => deliv_boot(c, pin, dr),
  deliv_cars: (c, pin) => deliv_cars(c, pin),
  deliv_readPlate: (c, pin, b) => deliv_readPlate(c, pin, b),
  deliv_arrive: (c, pin, rec) => deliv_arrive(c, pin, rec),
  deliv_mylist: (c, pin, f, t, d) => deliv_mylist(c, pin, f, t, d),
  deliv_one: (c, pin, id) => deliv_one(c, pin, id),
  deliv_resend: (c, pin, ids) => deliv_resend(c, pin, ids),
  deliv_cancel: (c, pin, ids, u) => deliv_cancel(c, pin, ids, u),
  deliv_trash: (c, pin, ids, u, w) => deliv_trash(c, pin, ids, u, w),
  deliv_update: (c, pin, id, p) => deliv_update(c, pin, id, p),
  deliv_photo: (c, pin, id) => deliv_photo(c, pin, id),
  deliv_addDest: (c, pin, n, k) => deliv_addDest(c, pin, n, k),
  deliv_editDest: (c, pin, o, p) => deliv_editDest(c, pin, o, p),
  deliv_list: (c, pin, f, t, tr) => deliv_list(c, pin, f, t, tr),
  deliv_conf: (c, pin) => deliv_conf(c, pin),
  deliv_saveConf: (c, pin, p) => deliv_saveConf(c, pin, p),
  deliv_accounts: (c, pin) => deliv_accounts(c, pin),
  deliv_accountAdd: (c, pin, n, p, t) => deliv_accountAdd(c, pin, n, p, t),
  deliv_accountEdit: (c, pin, o, p) => deliv_accountEdit(c, pin, o, p),
  deliv_fillBlanks: (c, pin) => deliv_fillBlanks(c, pin),
  deliv_ping: (c, pin) => deliv_ping(c, pin),
  deliv_view: (c, k) => deliv_view(c, k),
  // 입금 (팝빌)
  bankPull: (c, opt) => bankPull(c, opt),
  depositMatch,
  // 팝빌 연동 · 계좌
  popInfo,
  popBanks,
  popMember: (c, corp) => popMember(c, corp),
  popIdCheck: (c, id) => popIdCheck(c, id),
  popJoin: (c, form) => popJoin(c, form),
  popLogin: (c, togo) => popLogin(c, togo),
  bankList,
  bankSave: (c, row) => bankSave(c, row),
  bankDel: (c, id) => bankDel(c, id),
  // 세금계산서 (팝빌 정발행)
  taxList: (c, ym) => taxList(c, ym),
  taxIssue: (c, ids, wd, dates) => taxIssue(c, ids, wd, dates),
  taxState: (c, ym) => taxState(c, ym),
  taxPopup: (c, id) => taxPopup(c, id),
  taxSkip: (c, id, off) => taxSkip(c, id, off),
  taxSite: (c, togo) => taxSite(c, togo),
  // 자료 옮기기 · 엑셀 올리기
  importLegacy: (c, part, rows) => importLegacy(c, part, rows),
  excelPut: (c, kind, rows, ym, meta) => excelPut(c, kind, rows, ym, meta),
  uploadList,
  insMatch: (c, ym) => insMatch(c, ym),
  insList: (c, ym) => insList(c, ym),
  carHealth: (c, ym) => carHealth(c, ym),
  relink,
  dealerAddMissing: (c, ym) => dealerAddMissing(c, ym),
  // 지금 누구로 들어와 있는지 (화면 첫 줄에 쓰는 값)
  me: async (c: Ctx) => ({ office: { id: c.office.id, code: c.office.code, name: c.office.name },
    who: c.who, role: c.role, ver: VER }),
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...JSON_HEAD, "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST,OPTIONS" } });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const fn = S(body.fn);
    if (!fn || fn === "ping") return ok({ ok: true, ver: VER });
    const f = FN[fn];
    if (!f) return err("없는 기능입니다: " + fn);
    const ctx = OPEN.has(fn) ? ({ office: null, who: "", role: "" } as Ctx)
                             : await whoIs(S(body.shop), S(body.token));
    const out = await f(ctx, ...(Array.isArray(body.args) ? body.args : []));
    return ok(out);
  } catch (e) {
    if (e instanceof NeedCode)   // v26: 화면이 확인 번호 칸을 열 수 있게
      return new Response(JSON.stringify({ __err: e.message, __need: e.need }), { headers: JSON_HEAD });
    return err(e instanceof Error ? e.message : String(e));
  }
});
