// ============================================================
//  차곳간 경비실 — 수파베이스 Edge Function  cgg-api
//  통합 입구(0_차곳간_통합_index.html)가 부르는 로그인 창구 4개만 둡니다.
//    cggLogin(번호, 비밀번호)   → 바로 들어가거나, 문자 확인이 필요하면 { tick, to }
//    cggLogin2(tick, 6자리)     → 문자 확인 뒤 들어가기
//    cggMe(sid)                 → 내 이름과 열 수 있는 제품 목록
//    cggLogout(sid)             → 모든 제품에서 나가기
//  돌려주는 모양: { sid, name, products:[{ code:"wash"|"check", sid, shop, ... }] }
//
//  wash-api · check-api 는 그대로 두고 따로 둡니다 (워시 서버 이사와 서로 덮어쓰지 않게).
//  부르는 방식은 다른 서버와 똑같습니다:  POST { shop, token, fn, args:[...] }
//
//  배포:
//    supabase functions deploy cgg-api --no-verify-jwt
//  먼저 할 일: 서버/sql/01_경비실_표_만들기.sql 실행 (cgg_access · cgg_session · cgg_tick)
//  비밀값 (서버에만 둡니다 · 이름만 적음):
//    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//    CGG_INTERNAL_KEY                   ← 워시 서버와 서로 확인하는 전용 열쇠 (32자 이상 무작위, wash-api 와 같은 값)
//    SOLAPI_KEY, SOLAPI_SECRET          ← two_step 계정 문자 보낼 때만
//    CGG_SMS_FROM                       ← 문자 보내는 번호 (two_step 계정이 있을 때만)
//
//  비밀번호 확인 순서:
//    ① 워시 권한이 있으면 wash-api 의 login 으로 확인 (워시 비밀번호)
//    ② 그게 안 되면, 체크 권한이 있을 때 check_user 의 비밀번호로 확인
//    둘 중 하나라도 맞으면 본인으로 봅니다. 워시 비밀번호가 틀렸다면 워시는 열지 않습니다.
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPA_URL = Deno.env.get("SUPABASE_URL") ?? "";
const db = createClient(SUPA_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } });

const VER = "cgg-api v1.6 · 2026-10-15 (발송 기록)";
const JSON_HEAD = { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" };
const WASH_API = () => SUPA_URL + "/functions/v1/wash-api";
const DAYS = 14;                 // 로그인 유지 기간 (체크와 같음)
const LOCK_MIN = 10;                 // 잠금 안내 문구용 (실제 기준은 SQL 함수 cgg_attempt)
const TICK_MIN = 5, TICK_TRIES = 5;
const PRODUCTS = ["wash", "check"] as const;

/* ───────── 작은 도구들 ───────── */
const S = (v: unknown) => String(v ?? "").trim();
const digits = (v: unknown) => S(v).replace(/[^0-9]/g, "");
function ok(result: unknown) { return new Response(JSON.stringify({ result }), { headers: JSON_HEAD }); }
function err(message: string) { return new Response(JSON.stringify({ __err: userMsg(message) }), { headers: JSON_HEAD }); }   // v1.5: 영어·원문 숨김
function b2hex(b: Uint8Array) { return [...b].map((x) => x.toString(16).padStart(2, "0")).join(""); }
function hex2b(h: string) {
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
  return out;
}
const rnd = (n: number) => b2hex(crypto.getRandomValues(new Uint8Array(n)));
const later = (ms: number) => new Date(Date.now() + ms).toISOString();
const gone = (t: unknown) => !t || new Date(S(t)).getTime() < Date.now();
async function sha256hex(s: string) {
  return b2hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))));
}
function sameText(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
function maskPhone(p: string) {
  return p.length >= 10 ? p.slice(0, 3) + "-****-" + p.slice(-4) : "****";
}

const NO_ENTRY = "번호 또는 비밀번호가 맞지 않거나, 통합 입구를 쓸 수 없는 계정입니다.";

/* ───────── 체크 비밀번호 (check-api 와 같은 PBKDF2) ───────── */
async function pwOk(pw: string, stored: string) {
  const [saltHex, want] = S(stored).split("$");
  if (!saltHex || !want) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: hex2b(saltHex), iterations: 120000, hash: "SHA-256" }, key, 256);
  return sameText(b2hex(new Uint8Array(bits)), want);
}

/* ───────── 워시 (wash-api 를 그대로 부릅니다) ─────────
   v1.2: 손님 기기의 UA·IP 를 같이 넘깁니다. wash-api 는 확인 열쇠(x-cgg-internal)가 맞을 때만 받아 씁니다.
   v1.3: 확인 열쇠는 서비스 열쇠가 아니라 전용 비밀값 CGG_INTERNAL_KEY (wash-api sb3 와 짝). 없으면 보내지 않음.
   (그 전 판은 이 값들을 모른 척하므로 함께 올려도 안전) */
type Who = { ua: string; ip: string };
async function washCall(fn: string, args: unknown[], who?: Who) {
  const res = await fetch(WASH_API(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8",
               "x-cgg-internal": Deno.env.get("CGG_INTERNAL_KEY") ?? "" },
    body: JSON.stringify({ shop: "", token: "", fn, args,
                           __via: "cgg", __ua: who?.ua ?? "", __ip: who?.ip ?? "" }),
  });
  const j = await res.json().catch(() => ({}));
  if (j?.__err) throw new Error(S(j.__err));
  return j?.result;
}
async function washLogin(phone: string, pw: string, who?: Who) {
  try {
    const r = await washCall("login", [phone, pw], who);
    return S(r?.key) ? { sid: S(r.key), shop: S(r.shop) } : null;
  } catch (_) { return null; }
}
async function washLogout(sid: string) {
  if (!S(sid)) return;
  try { await washCall("logout", [sid]); } catch (_) { /* 이미 풀린 열쇠 */ }
}
async function washAlive(sid: string) {
  if (!S(sid)) return null;
  const { data } = await db.from("wash_sessions").select("sid, shop, expires_at").eq("sid", sid).maybeSingle();
  return data && !gone(data.expires_at) ? data : null;
}

/* ───────── 체크 ───────── */
async function checkUsers(phone: string) {
  const { data } = await db.from("check_user")
    .select("id, office_id, name, role, pw_hash, check_office(id, code, name)")
    .eq("phone", phone).eq("active", true);
  return (data ?? []).filter((u: any) => u.check_office);
}
/** 체크 로그인 열쇠(chk_)를 새로 만듭니다 — 다른 기기의 체크 로그인은 건드리지 않습니다 */
async function checkMint(phone: string, u: any) {
  const sid = "chk_" + rnd(24);
  const { error } = await db.from("check_session").insert({
    sid, phone, office_id: u.office_id, role: S(u.role) || "staff",
    ua: "통합 입구", expires_at: later(DAYS * 86400000),
  });
  if (error) throw new Error("체크 로그인을 만들지 못했습니다: " + error.message);
  return sid;
}
async function checkAlive(sid: string) {
  if (!S(sid)) return null;
  const { data } = await db.from("check_session").select("sid, office_id, expires_at").eq("sid", sid).maybeSingle();
  return data && !gone(data.expires_at) ? data : null;
}

/* ───────── 출입 명단 ───────── */
async function accessOf(phone: string) {
  const { data, error } = await db.from("cgg_access").select("*").eq("phone", phone).maybeSingle();
  if (error) throw new Error("통합 입구를 준비하는 중입니다. 차곳간(010-9559-3663)으로 알려 주세요.");
  return data;
}
function grantsOf(acc: any): string[] {
  const list: string[] = Array.isArray(acc?.products) ? acc.products : [];
  return PRODUCTS.filter((p) => list.includes(p));
}
/** 비밀번호를 보기 전에 시도 횟수를 데이터베이스 안에서 한 번에 올립니다 (동시에 여러 번 보내도 새지 않음).
 *  false 면 잠긴 상태. 성공하면 attemptOk 로 0 으로 되돌립니다. 기준(5번 · 10분)은 SQL 함수 cgg_attempt 에 있음 */
async function attempt(phone: string) {
  const { data, error } = await db.rpc("cgg_attempt", { p_phone: phone });
  if (error) throw new Error("통합 입구를 준비하는 중입니다. 차곳간(010-9559-3663)으로 알려 주세요.");
  return data !== false;
}
async function attemptOk(phone: string) {
  await db.from("cgg_access").update({ fail_count: 0, locked_until: null }).eq("phone", phone);
}

/* ───────── 문자 (솔라피 · two_step 계정만) ───────── */

/* ===== 사용자에게 보이는 오류 글 다듬기 (규칙 4-1 · 오픈 베타) =====
   영어·코드·데이터베이스 원문은 사용자에게 보이지 않게 하고 서버 기록에만 남깁니다. */
const MSG_OK_WORDS = /\b(TEST|SMS|LMS|MMS|PDF|JPG|PNG|CSV|URL|QR|GAON)\b|[a-z0-9-]+(\.[a-z0-9-]+)*\.(co\.kr|com)\b/gi;
const MSG_HELP = "잠시 뒤 다시 해 주세요. 계속되면 차곳간(010-9559-3663)으로 알려 주세요.";
function userMsg(raw: unknown): string {
  const m = String(raw ?? "").trim().replace(/관리/g, "관리");
  if (!m) return "처리하지 못했습니다. " + MSG_HELP;
  const probe = m.replace(MSG_OK_WORDS, "");
  if (!/[A-Za-z]{3,}/.test(probe)) return m;
  console.error("userMsg hidden:", m.slice(0, 300));
  const head = m.split(/\s*[:(—]\s*/)[0].trim();
  if (head && /[가-힣]/.test(head) && !/[A-Za-z]{3,}/.test(head.replace(MSG_OK_WORDS, "")))
    return head.replace(/\s*실패$/, "에 실패했습니다").replace(/[.\s]*$/, ".") + " " + MSG_HELP;
  return "처리하지 못했습니다. " + MSG_HELP;
}

async function solapiAuth() {
  const key = Deno.env.get("SOLAPI_KEY") ?? "", secret = Deno.env.get("SOLAPI_SECRET") ?? "";
  if (!key || !secret) throw new Error("문자 설정이 아직 끝나지 않았습니다. 차곳간(010-9559-3663)으로 알려 주세요.");
  const date = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const salt = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
  const te = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", te.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = b2hex(new Uint8Array(await crypto.subtle.sign("HMAC", k, te.encode(date + salt))));
  return `HMAC-SHA256 apiKey=${key}, date=${date}, salt=${salt}, signature=${sig}`;
}
/* ===== 발송 기록 (SQL 11 · cgg_sendlog) — 네 서버 같은 모양 =====
   솔라피로 «보내는» 요청은 모두 solapi() 한 곳을 지나고, 여기서 메시지마다 한 줄씩 남깁니다.
   (솔라피를 부르는 곳 = 기록을 남기는 곳)
   남기는 것: 제품 · 업체(검사소) 코드 · 템플릿 키 · 가린 번호(010-****-1234) · 알림톡/문자 · 솔라피 번호 · 결과 · 쉬운 오류
   남기지 않는 것: 본문 · 변수 «값»(인증번호·임시 비밀번호 등) · 열쇠·서명. 변수는 «이름»만.
   기록이 안 돼도 발송은 그대로 합니다(try 로 무시). */
type SendMeta = { shop?: string; tpl?: string; ref?: string };
const SEND_PRODUCT = "cgg";
function sendMask(v: unknown) {
  const d = String(v ?? "").replace(/[^0-9]/g, "");
  if (d.length >= 10) return d.slice(0, 3) + "-****-" + d.slice(-4);
  return d ? "****" + d.slice(-2) : "";
}
/* 솔라피 상태 코드 → 쉬운 말 (모르는 코드는 «보내지 못함 (코드)») */
const SEND_WHY: Record<string, string> = {
  "1062": "보내는 번호가 등록되지 않음", "3059": "받는 번호가 올바르지 않음", "1020": "받는 번호가 올바르지 않음",
  "3104": "카카오톡을 쓰지 않는 번호", "3105": "카카오톡을 쓰지 않는 번호", "3018": "전화가 꺼져 있거나 받을 수 없음",
  "3015": "받는 번호가 없는 번호", "3016": "받는 쪽에서 막음(스팸 차단)", "3022": "받는 쪽에서 막음",
  "3040": "알림톡 문구가 등록된 것과 다름", "3041": "알림톡 템플릿을 찾지 못함", "3043": "알림톡 채널을 찾지 못함",
  "2252": "잔액이 모자람", "1030": "잔액이 모자람",
};
function sendErrEasy(code: string, msg: string, err?: unknown) {
  if (code && SEND_WHY[code]) return SEND_WHY[code];
  if (err) {
    const m = err instanceof Error ? err.message : String(err);
    const st = /솔라피 (\d{3})/.exec(m);
    if (st) return "솔라피가 요청을 받지 않음 (" + st[1] + ")";
    if (/[가-힣]/.test(m) && !/[A-Za-z]{3,}/.test(m)) return m.slice(0, 80);
    return "솔라피에 연결하지 못함";
  }
  if (msg && /[가-힣]/.test(msg) && !/[A-Za-z]{3,}/.test(msg)) return msg.slice(0, 80);
  return "보내지 못함" + (code ? " (" + code + ")" : "");
}
async function sendRecord(payload: any, resp: any, err: unknown, meta?: SendMeta) {
  try {
    const msgs: any[] = Array.isArray(payload && payload.messages) ? payload.messages : [];
    if (!msgs.length) return;
    const dg = (x: unknown) => String(x ?? "").replace(/[^0-9]/g, "");
    const failed: any[] = (resp && resp.failedMessageList) || [];
    const ml = resp && resp.messageList;
    const okList: any[] = Array.isArray(ml) ? ml
      : (ml && typeof ml === "object" ? Object.keys(ml).map((k) => Object.assign({ messageId: k }, ml[k])) : []);
    const gi = (resp && resp.groupInfo) || {};
    const gid = String(gi.groupId || gi._id || (resp && resp.groupId) || "");
    const rows = msgs.map((m: any, i: number) => {
      const ko = m && m.kakaoOptions;
      const to = dg(m && m.to);
      const f = failed.find((x: any) => dg(x && x.to) === to);
      const hit = okList.find((x: any) => dg(x && x.to) === to) || okList[i] || null;
      const bad = !!err || !!f;
      const code = String((f && f.statusCode) || "");
      return {
        product: SEND_PRODUCT, shop: String((meta && meta.shop) || "").slice(0, 40),
        tpl: String((meta && meta.tpl) || (ko ? "ata" : "sms")).slice(0, 40),
        to_mask: sendMask(to), via: ko ? "ata" : (String((m && m.type) || "").toLowerCase() || "auto"),
        msg_id: bad ? "" : String((hit && hit.messageId) || "").slice(0, 60), group_id: gid.slice(0, 60),
        result: bad ? "fail" : "wait", status_code: code.slice(0, 20),
        err: bad ? sendErrEasy(code, String((f && (f.statusMessage || f.reason)) || ""), err) : "",
        vars: ko && ko.variables ? Object.keys(ko.variables).map((k) => k.replace(/^#\{|\}$/g, "").slice(0, 20)).slice(0, 20) : [],
        ref: String((meta && meta.ref) || "").slice(0, 60), scheduled: !!(payload && payload.scheduledDate),
      };
    });
    const { error } = await db.from("cgg_sendlog").insert(rows);
    if (error) console.error("sendRecord", String(error.message || "").slice(0, 80));
  } catch (e) { console.error("sendRecord", e instanceof Error ? e.message.slice(0, 80) : ""); }
}
async function solapi(method: string, path: string, payload?: unknown, meta?: SendMeta) {
  const isSend = method === "POST" && /^\/messages\/v4\/send/.test(path);
  let res: Response, body = "";
  try {
    res = await fetch("https://api.solapi.com" + path, {
      method,
      headers: { Authorization: await solapiAuth(), "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    body = await res.text();
  } catch (e) {
    if (isSend) await sendRecord(payload, null, e, meta);
    throw e;
  }
  if (res.status >= 300) {
    const e = new Error("솔라피 " + res.status + ": " + body);
    if (isSend) await sendRecord(payload, null, e, meta);
    throw e;
  }
  const j = body ? JSON.parse(body) : {};
  if (isSend) await sendRecord(payload, j, null, meta);
  return j;
}

/* v1.4 규칙 5-6: 확인 번호는 알림톡 먼저 (차곳간_인증번호 · 코드는 관리 설정 wash_hq.ata_cfg.tpl.auth), 안 되면 문자.
   보내는 번호는 CGG_SMS_FROM → 없으면 SMS_FROM (워시와 같은 대표번호) */
async function sendCode(to: string, code: string) {
  const from = digits(Deno.env.get("CGG_SMS_FROM")) || digits(Deno.env.get("SMS_FROM"));
  if (!from) throw new Error("문자 설정이 아직 끝나지 않았습니다. 차곳간(010-9559-3663)으로 알려 주세요.");
  let c: any = {};
  try { const { data } = await db.from("wash_hq").select("ata_cfg").eq("id", 1).maybeSingle(); c = (data && data.ata_cfg) || {}; }
  catch (_) { /* 칸이 없으면 문자 */ }
  const pf = S(c.pfId) || S(Deno.env.get("PF_ID")), tpl = S(c.tpl && c.tpl.auth);
  if (pf && tpl) {
    try {
      /* v1.6: 솔라피는 solapi() 한 곳으로 — 발송 기록이 남음 */
      const j: any = await solapi("POST", "/messages/v4/send-many/detail", { messages: [{ to, from, text: `[차곳간] 인증번호 ${code} (5분 안에 입력)`,
          kakaoOptions: { pfId: pf, templateId: tpl, disableSms: false,
            variables: { "#{인증번호}": code, "#{유효시간}": "5" } } }] }, { tpl: "auth" });
      if (!((j && j.failedMessageList) || []).length) return;
      console.error("cgg ata failed", JSON.stringify(((j && j.failedMessageList) || [])[0] || {}).slice(0, 200));
    } catch (e) { console.error("cgg ata", e instanceof Error ? e.message.slice(0, 120) : ""); }
  }
  try {
    await solapi("POST", "/messages/v4/send-many/detail",
      { messages: [{ to, from, type: "SMS", text: `[차곳간] 확인 번호 ${code} (5분 안에 넣어 주세요)` }] }, { tpl: "auth_sms" });
  } catch (_) {
    throw new Error("확인 문자를 보내지 못했습니다. 잠시 뒤 다시 해 주세요.");
  }
}

/* ───────── 들어가기 · 내 정보 ───────── */
async function grant(acc: any, wash: { sid: string; shop: string } | null) {
  const phone = S(acc.phone);
  const grants = grantsOf(acc);
  let checkSid: string | null = null;
  if (grants.includes("check")) {
    const users = await checkUsers(phone);
    if (users.length) checkSid = await checkMint(phone, users[0]);
  }
  const sid = "cgg_" + rnd(24);
  const { error } = await db.from("cgg_session").insert({
    sid, phone, wash_sid: wash?.sid ?? null, wash_shop: wash?.shop ?? null,
    check_sid: checkSid, expires_at: later(DAYS * 86400000),
  });
  if (error) throw new Error("로그인을 저장하지 못했습니다: " + error.message);
  return await meOf(sid);
}

/** 지금 이 순간의 명단으로 제품 목록을 다시 만듭니다 (권한을 빼면 바로 안 보임) */
async function meOf(sid: string) {
  const { data: ses } = await db.from("cgg_session").select("*").eq("sid", S(sid)).maybeSingle();
  if (!ses || gone(ses.expires_at)) {
    if (ses) await db.from("cgg_session").delete().eq("sid", ses.sid);
    throw new Error("로그인이 풀렸습니다. 다시 로그인해 주세요.");
  }
  const acc = await accessOf(S(ses.phone));
  if (!acc || acc.active === false) {
    await cggLogout(ses.sid);
    throw new Error("통합 입구를 쓸 수 없는 계정입니다. 대표님께 확인해 주세요.");
  }
  const grants = grantsOf(acc);
  const products: any[] = [];
  const patch: any = {};

  // 워시
  if (ses.wash_sid && !grants.includes("wash")) {         // 권한을 뺐으면 워시 열쇠도 닫습니다
    await washLogout(ses.wash_sid); patch.wash_sid = null; patch.wash_shop = null;
  } else if (ses.wash_sid) {
    const w = await washAlive(ses.wash_sid);
    if (!w) {                                              // 워시 쪽에서 풀렸으면 비밀번호부터 다시
      await cggLogout(ses.sid);
      throw new Error("로그인이 풀렸습니다. 다시 로그인해 주세요.");
    }
    products.push({ code: "wash", sid: ses.wash_sid, shop: S(w.shop) || S(ses.wash_shop) });
  }

  // 체크
  let name = S(acc.name);
  if (grants.includes("check")) {
    const users = await checkUsers(S(ses.phone));
    if (users.length) {
      let cs: any = await checkAlive(S(ses.check_sid));
      let csid = S(ses.check_sid);
      if (!cs) {                                           // 체크에서 따로 로그인해 풀렸으면 새로 만듭니다
        csid = await checkMint(S(ses.phone), users[0]);
        patch.check_sid = csid;
        cs = { office_id: users[0].office_id };
      }
      const u: any = users.find((x: any) => x.office_id === cs.office_id) ?? users[0];
      if (!name) name = S(u.name);
      products.push({ code: "check", sid: csid, shop: S(u.check_office.code), shopName: S(u.check_office.name),
                      role: S(u.role) || "staff", who: S(u.name) || name });
    }
  } else if (ses.check_sid) {
    await db.from("check_session").delete().eq("sid", ses.check_sid);
    patch.check_sid = null;
  }

  if (Object.keys(patch).length) await db.from("cgg_session").update(patch).eq("sid", ses.sid);
  return { sid: ses.sid, name, products };
}

/* ───────── 창구 4개 ───────── */
async function cggLogin(idRaw: unknown, pwRaw: unknown, who?: Who) {
  const phone = digits(idRaw), pw = S(pwRaw);
  if (phone.length < 10) throw new Error("휴대폰 번호를 다시 확인해 주세요.");
  if (!pw) throw new Error("비밀번호를 넣어 주세요.");

  const acc = await accessOf(phone);
  if (!acc || acc.active === false || !grantsOf(acc).length) throw new Error(NO_ENTRY);
  if (!(await attempt(phone)))
    throw new Error(`비밀번호를 여러 번 틀려 ${LOCK_MIN}분 동안 잠겼습니다. 잠시 뒤 다시 해 주세요.`);

  const grants = grantsOf(acc);
  const wash = grants.includes("wash") ? await washLogin(phone, pw, who) : null;
  let proven = !!wash;
  if (!proven && grants.includes("check")) {
    for (const u of await checkUsers(phone)) {
      if (S(u.pw_hash) && await pwOk(pw, u.pw_hash)) { proven = true; break; }
    }
  }
  if (!proven) throw new Error(NO_ENTRY);
  await attemptOk(phone);

  if (acc.two_step) {
    const tick = "t_" + rnd(16);
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
    await db.from("cgg_tick").delete().eq("phone", phone);
    const { error } = await db.from("cgg_tick").insert({
      tick, phone, code_hash: await sha256hex(tick + ":" + code),
      wash_sid: wash?.sid ?? null, wash_shop: wash?.shop ?? null, expires_at: later(TICK_MIN * 60000),
    });
    if (error) throw new Error("문자 확인을 준비하지 못했습니다: " + error.message);
    try { await sendCode(phone, code); }
    catch (e) { await db.from("cgg_tick").delete().eq("tick", tick); if (wash) await washLogout(wash.sid); throw e; }
    return { tick, to: maskPhone(phone) };
  }
  return await grant(acc, wash);
}

async function cggLogin2(tickRaw: unknown, codeRaw: unknown) {
  const tick = S(tickRaw), code = digits(codeRaw);
  const { data: t } = await db.from("cgg_tick").select("*").eq("tick", tick).maybeSingle();
  if (!t || gone(t.expires_at)) {
    if (t) { await db.from("cgg_tick").delete().eq("tick", tick); await washLogout(S(t.wash_sid)); }
    throw new Error("확인 시간이 지났습니다. 처음부터 다시 로그인해 주세요.");
  }
  if (!sameText(await sha256hex(tick + ":" + code), S(t.code_hash))) {
    const tries = (Number(t.tries) || 0) + 1;
    if (tries >= TICK_TRIES) {
      await db.from("cgg_tick").delete().eq("tick", tick); await washLogout(S(t.wash_sid));
      throw new Error("확인 번호를 여러 번 틀렸습니다. 처음부터 다시 로그인해 주세요.");
    }
    await db.from("cgg_tick").update({ tries }).eq("tick", tick);
    throw new Error(`확인 번호가 맞지 않습니다. (남은 횟수 ${TICK_TRIES - tries}번)`);
  }
  await db.from("cgg_tick").delete().eq("tick", tick);
  const acc = await accessOf(S(t.phone));
  if (!acc || acc.active === false || !grantsOf(acc).length) { await washLogout(S(t.wash_sid)); throw new Error(NO_ENTRY); }
  return await grant(acc, t.wash_sid ? { sid: S(t.wash_sid), shop: S(t.wash_shop) } : null);
}

async function cggMe(sid: unknown) { return await meOf(S(sid)); }

async function cggLogout(sidRaw: unknown) {
  const sid = S(sidRaw);
  if (!sid) return { ok: true };
  const { data: ses } = await db.from("cgg_session").select("*").eq("sid", sid).maybeSingle();
  if (ses) {
    if (ses.check_sid) await db.from("check_session").delete().eq("sid", ses.check_sid);
    await washLogout(S(ses.wash_sid));
    await db.from("cgg_session").delete().eq("sid", sid);
  }
  return { ok: true };
}

/* ============================================================
   들어오는 문 — { shop, token, fn, args }
   네 창구 모두 로그인 전에 부르는 창구라 token 은 보지 않습니다 (sid 는 args 로 받음)
   ============================================================ */
/** 손님 IP — 꾸밀 수 있는 x-forwarded-for 맨 앞 값은 쓰지 않습니다 (wash-api sb2 와 같은 규칙) */
function ipOf(req: Request) {
  const cf = S(req.headers.get("cf-connecting-ip"));
  if (cf) return cf;
  const xs = S(req.headers.get("x-forwarded-for")).split(",").map((x) => x.trim()).filter(Boolean);
  return xs[xs.length - 1] || "0";
}
/* 마지막 칸(who)은 화면이 보낸 값이 아니라 서버가 요청에서 읽은 손님 기기 정보입니다 */
const FN: Record<string, (who: Who, ...a: any[]) => Promise<unknown>> = {
  cggLogin: (who, id, pw) => cggLogin(id, pw, who),
  cggLogin2: (_w, tick, code) => cggLogin2(tick, code),
  cggMe: (_w, sid) => cggMe(sid),
  cggLogout: (_w, sid) => cggLogout(sid),
};

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...JSON_HEAD, "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST,OPTIONS" } });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const fn = S(body.fn);
    if (!fn || fn === "ping") return ok({ ok: true, ver: VER });
    const f = FN[fn];
    if (!f) return err("없는 기능입니다: " + fn);
    const who: Who = { ua: S(req.headers.get("user-agent")).slice(0, 300), ip: ipOf(req) };
    return ok(await f(who, ...(Array.isArray(body.args) ? body.args : [])));
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

Deno.serve(handle);
