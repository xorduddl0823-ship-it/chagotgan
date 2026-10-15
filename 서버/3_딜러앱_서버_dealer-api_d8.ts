// =========================================================
// 차곳간 딜러앱 — 2번 파일 : 수파베이스 서버 기능   이름: dealer-api
// 워시 서버(wash-api)와 완전히 따로 돕니다. 워시 자료는 «읽기만» 합니다.
//   · 인증번호 로그인 (비밀번호 없음)
//   · 약관·개인정보 동의 (동의해야 차가 보입니다)
//   · 내 차 목록 / 차 상세 (모든 업체의 입고 기록 중 «딜러 연락처»가 내 번호인 것만)
// 비밀 열쇠는 워시와 같은 것을 씁니다 (Edge Functions → Secrets 는 프로젝트 공용):
//   SOLAPI_KEY, SOLAPI_SECRET, SMS_FROM(차곳간 대표번호)
// ※ 배포할 때 'Verify JWT' 는 꺼 주세요 (로그인 열쇠로 따로 확인합니다)
// d7 (2026-10-15) 오픈 베타 말 다듬기 (규칙 4-1) — 오류 글은 표준형, 영어·코드·데이터베이스 원문은 숨기고 기록에만(userMsg). 새 창구 없음.
// d8 (2026-10-15) 발송 기록 — 솔라피로 보내는 모든 길(인증번호 알림톡·문자)이 solapi() 한 곳을 지나며 cgg_sendlog(SQL 11)에 남습니다. 본문·인증번호 값은 안 남김.
// d6 (2026-10-15) 결제 방 요청서 (마) — 청구서 목록 myBills (읽기만). 청구서를 «받은 휴대폰 번호 = 로그인한 딜러 번호» 로만 이어 붙임
//    (받는 곳 이름으로는 안 붙임 — 같은 이름 상사끼리 섞이지 않게). 계좌는 청구서를 만들 때 찍어 둔 값 · 업체 대표 전화는 안 보냄.
//    먼저 서버/sql/06 (wash_viewcode.to_phones) + 워시 sb10 (청구서를 보낼 때 받는 번호를 적음)
// d5 (2026-10-15) 규칙 5-6 — 인증번호는 알림톡 먼저(차곳간_인증번호, 코드는 관리 설정 wash_hq.ata_cfg.tpl.auth), 안 되면 문자
// d4 (2026-10-15) 보안 ⑤ 1단계 — 차 사진을 공개 주소 대신 «서명 주소»(1시간)로 내줌. 그 차를 맡긴 업체 폴더 사진만.
//   보관함(wash) 비공개 전환은 워시 화면이 바뀐 뒤 (서버/설계/08)
// d3 (2026-10-15) 보안 고침 — 인증번호 틀린 횟수를 DB 에서 한 번에 올림(dealer_otp_try · 서버/sql/03) · 횟수 제한 장치 오류면 «보내지 않음» · IP 는 꾸밀 수 없는 값만 · 솔라피 오류 원문은 화면에 안 보냄
// d2 (2026-10-11) 화면을 시안과 똑같이 — 단계 4개(입고·작업 중·출고·도착) · 금액 · 상품화 완료 표시
// d1 (2026-10-11) 첫 판 — 로그인 · 동의 · 내 차 · 차 상세 · 로그아웃 · 동의 철회
// =========================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const VER = "d8";
const TERMS_VER = "d1-2026-10";     // 딜러 이용약관 판
const PRIVACY_VER = "d1-2026-10";   // 딜러 개인정보 수집·이용 동의 판
const BUCKET = "wash";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);
const env = (k: string, d = "") => (Deno.env.get(k) || d).trim();

const OTP_FROM = env("SMS_FROM", "") || env("OTP_FROM", "01095593663");
const OTP_MINUTES = 5;        // 인증번호 유효시간(분)
const OTP_MAX_TRY = 5;        // 틀릴 수 있는 횟수
const OTP_MAX_DAY = 5;        // 한 번호가 하루에 받을 수 있는 횟수
const OTP_GAP_SEC = 30;       // 다시 받기까지 기다리는 시간(초)
const SESSION_DAYS = 60;      // 로그인 유지 기간(일) — 쓸 때마다 다시 늘어납니다

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Max-Age": "86400",
};
const out = (o: unknown) =>
  new Response(JSON.stringify(o), { headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });

const digits = (v: unknown) => String(v ?? "").replace(/[^0-9]/g, "");
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

/* 요청한 사람의 IP — cf-connecting-ip 가 있으면 그것, 없으면 x-forwarded-for 의 «맨 오른쪽» 값.
   맨 왼쪽 값은 요청하는 쪽이 마음대로 적어 보낼 수 있어서 쓰지 않습니다 (d3) */
function ipOf(req: Request) {
  const cf = String(req.headers.get("cf-connecting-ip") || "").trim();
  if (cf) return cf;
  const xs = String(req.headers.get("x-forwarded-for") || "").split(",").map((s) => s.trim()).filter(Boolean);
  return xs[xs.length - 1] || "0";
}
/* 횟수 제한 — 워시와 같은 장치(wash_rate_bump)를 «d:» 이름으로 나눠 씁니다
   d3: 장치에 오류가 나면 «보내지 않음» 으로 처리합니다 (문자 요금이 새지 않게) */
async function rateOk(key: string, max: number) {
  try {
    const { data, error } = await sb.rpc("wash_rate_bump", { p_key: "d:" + key, p_max: max });
    if (error) { console.error("dealer-api 횟수 제한 오류:", error.message); return false; }
    return data !== false;
  } catch (e) { console.error("dealer-api 횟수 제한 오류:", e); return false; }
}
function normPhone(p: unknown) {
  const d = digits(p);
  const ok = (d.length === 11 && d.startsWith("010")) ||
             (d.length >= 10 && d.length <= 11 && d.startsWith("01") && d[2] !== "0");
  if (!ok) throw new Error("휴대폰 번호가 올바르지 않습니다");
  return d;
}
function randHex(n: number) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return [...b].map((v) => v.toString(16).padStart(2, "0")).join("");
}
function sixDigits() {
  const b = new Uint32Array(1);
  crypto.getRandomValues(b);
  return String(100000 + (b[0] % 900000));
}
async function codeHash(phone: string, code: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("dealer|" + phone + "|" + code));
  return hex(buf);
}
function kstDay() {
  return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
}

/* ---------- 솔라피 (워시와 같은 방식) ---------- */
async function hmac(keyBytes: any, msg: any) {
  const k = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return await crypto.subtle.sign("HMAC", k, msg);
}
async function solapiAuth() {
  const key = env("SOLAPI_KEY"), secret = env("SOLAPI_SECRET");
  if (!key || !secret) throw new Error("문자 설정이 아직 끝나지 않았습니다. 차곳간(010-9559-3663)으로 알려 주세요.");
  const date = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const salt = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
  const te = new TextEncoder();
  const sig = hex(await hmac(te.encode(secret), te.encode(date + salt)));
  return `HMAC-SHA256 apiKey=${key}, date=${date}, salt=${salt}, signature=${sig}`;
}
/* ===== 발송 기록 (SQL 11 · cgg_sendlog) — 네 서버 같은 모양 =====
   솔라피로 «보내는» 요청은 모두 solapi() 한 곳을 지나고, 여기서 메시지마다 한 줄씩 남깁니다.
   (솔라피를 부르는 곳 = 기록을 남기는 곳)
   남기는 것: 제품 · 업체(검사소) 코드 · 템플릿 키 · 가린 번호(010-****-1234) · 알림톡/문자 · 솔라피 번호 · 결과 · 쉬운 오류
   남기지 않는 것: 본문 · 변수 «값»(인증번호·임시 비밀번호 등) · 열쇠·서명. 변수는 «이름»만.
   기록이 안 돼도 발송은 그대로 합니다(try 로 무시). */
type SendMeta = { shop?: string; tpl?: string; ref?: string };
const SEND_PRODUCT = "dealer";
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
    const { error } = await sb.from("cgg_sendlog").insert(rows);
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

/* ===== 사용자에게 보이는 오류 글 다듬기 (규칙 4-1 · 오픈 베타) =====
   영어·코드·데이터베이스 원문은 사용자에게 보이지 않게 하고 서버 기록에만 남깁니다. */
const MSG_OK_WORDS = /\b(TEST|SMS|LMS|MMS|PDF|JPG|PNG|CSV|URL|QR|GAON)\b|[a-z0-9-]+(\.[a-z0-9-]+)*\.(co\.kr|com)\b/gi;
const MSG_HELP = "잠시 뒤 다시 해 주세요. 계속되면 차곳간(010-9559-3663)으로 알려 주세요.";
function userMsg(raw: unknown): string {
  const m = String(raw ?? "").trim().replace(/관리/g, "관리");
  if (!m) return "처리하지 못했습니다. " + MSG_HELP;
  const probe = m.replace(MSG_OK_WORDS, "");
  if (!/[A-Za-z]{3,}/.test(probe)) return m;
  /* 보안 낮음 b: 기록에도 휴대폰·계좌 같은 긴 숫자(8자리 이상)는 가운데를 가림 */
  console.error("userMsg hidden:", m.slice(0, 300).replace(/\d{8,}/g, (d) => d.slice(0, 3) + "*".repeat(d.length - 7) + d.slice(-4)));
  const head = m.split(/\s*[:(—]\s*/)[0].trim();
  if (head && /[가-힣]/.test(head) && !/[A-Za-z]{3,}/.test(head.replace(MSG_OK_WORDS, "")))
    return head.replace(/\s*실패$/, "에 실패했습니다").replace(/[.\s]*$/, ".") + " " + MSG_HELP;
  return "처리하지 못했습니다. " + MSG_HELP;
}

/* d5: 알림톡 설정 (워시 서버와 같은 칸 · 1분 기억) — 비어 있으면 문자 */
let _ata: { at: number; pf: string; tpl: string } = { at: 0, pf: "", tpl: "" };
async function ataAuth() {
  if (Date.now() - _ata.at < 60000) return _ata;
  let c: any = {};
  try { const { data } = await sb.from("wash_hq").select("ata_cfg").eq("id", 1).maybeSingle(); c = (data && data.ata_cfg) || {}; }
  catch (_) { /* 칸이 없으면 문자 */ }
  _ata = { at: Date.now(), pf: String(c.pfId || env("PF_ID") || "").trim(), tpl: String((c.tpl && c.tpl.auth) || "").trim() };
  return _ata;
}
async function otpSend(phone: string, code: string) {
  /* d5: 알림톡 먼저 — 확정본 차곳간_인증번호 변수 #{인증번호} #{유효시간}, 안 되면 솔라피가 확정본 대체 문구로 */
  const a = await ataAuth();
  if (a.tpl && a.pf) {
    try {
      const r = await solapi("POST", "/messages/v4/send-many/detail", { messages: [{
        to: phone, from: digits(OTP_FROM),
        text: "[차곳간] 인증번호 " + code + " (" + OTP_MINUTES + "분 안에 입력)",
        kakaoOptions: { pfId: a.pf, templateId: a.tpl, disableSms: false,
          variables: { "#{인증번호}": code, "#{유효시간}": String(OTP_MINUTES) } } }] }, { tpl: "auth" });
      if (!(r.failedMessageList || []).length) return;
      console.error("otp ata failed", JSON.stringify((r.failedMessageList || [])[0]).slice(0, 200));
    } catch (e) { console.error("otp ata", e); }
  }
  const msg = {
    to: phone, from: digits(OTP_FROM), type: "SMS",
    text: "[차곳간 딜러] 인증번호 " + code + " (" + OTP_MINUTES + "분 안에 입력해 주세요)",
  };
  const r = await solapi("POST", "/messages/v4/send-many/detail", { messages: [msg] }, { tpl: "auth_sms" });
  const failed = r.failedMessageList || [];
  if (failed.length) {
    const f = failed[0] || {};
    throw new Error("인증번호를 보내지 못했습니다: " + (f.statusMessage || f.reason || f.statusCode || ""));
  }
}

/* ---------- 로그인 유지 ---------- */
async function makeSession(phone: string, ua: string) {
  const sid = randHex(24);
  const exp = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  /* 한 사람이 기기를 3대까지 — 넘으면 가장 오래된 것부터 로그아웃 */
  const { data: old } = await sb.from("dealer_sessions").select("sid,created_at")
    .eq("phone", phone).order("created_at", { ascending: true });
  const rows = old || [];
  if (rows.length >= 3)
    await sb.from("dealer_sessions").delete().in("sid", rows.slice(0, rows.length - 2).map((r: any) => r.sid));
  const { error } = await sb.from("dealer_sessions").insert({ sid, phone, expires_at: exp, ua: ua.slice(0, 250) });
  if (error) throw new Error("로그인 기록을 만들지 못했습니다: " + error.message);
  return sid;
}
async function sessionOf(sid: string) {
  if (!sid || sid.length < 20) return null;
  const { data } = await sb.from("dealer_sessions").select("sid,phone,expires_at,last_seen")
    .eq("sid", sid).maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) {
    await sb.from("dealer_sessions").delete().eq("sid", sid);
    return null;
  }
  /* 하루에 한 번만 유지 기간을 늘립니다 */
  if (Date.now() - new Date(data.last_seen || 0).getTime() > 864e5) {
    sb.from("dealer_sessions").update({
      last_seen: new Date().toISOString(),
      expires_at: new Date(Date.now() + SESSION_DAYS * 864e5).toISOString(),
    }).eq("sid", sid).then(() => {}, () => {});
  }
  return data as { sid: string; phone: string };
}

/* ---------- 동의 ---------- */
async function agreeState(phone: string) {
  const { data: u } = await sb.from("dealer_users").select("phone,name,withdrawn_at,active")
    .eq("phone", phone).maybeSingle();
  const { data: ag } = await sb.from("dealer_agreements").select("terms_ver,privacy_ver,marketing,agreed_at,what")
    .eq("phone", phone).order("agreed_at", { ascending: false }).limit(1);
  const last: any = ag && ag[0];
  const ok = !!last && last.what === "agree" &&
    last.terms_ver === TERMS_VER && last.privacy_ver === PRIVACY_VER;
  return { user: u, agreed: ok, at: last ? String(last.agreed_at) : "", marketing: !!(last && last.marketing) };
}
async function needAgreed(phone: string) {
  const st = await agreeState(phone);
  if (st.user && st.user.active === false) throw new Error("이용이 멈춰 있는 번호입니다. 차곳간으로 문의해 주세요");
  if (!st.agreed) throw Object.assign(new Error("약관 동의가 필요합니다"), { needAgree: true });
  return st;
}

/* ---------- 차 ---------- */
/* d4: 사진은 잠깐만 열리는 서명 주소로 (1시간) — 그 업체 폴더 안 사진만 */
async function shotLinks(ids: string[], shop: string, ttl = 3600): Promise<Record<string, string>> {
  const paths: string[] = [], back: Record<string, string> = {};
  for (const raw of ids) {
    const v = String(raw || "");
    if (!v.startsWith("sb/") || v.indexOf("..") >= 0) continue;
    const p = v.slice(3);
    if (!shop || !p.startsWith(shop + "/")) continue;
    if (back[p] === undefined) { back[p] = v; paths.push(p); }
  }
  const out: Record<string, string> = {};
  if (!paths.length) return out;
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrls(paths, ttl);
  if (error) { console.error("shotLinks", error.message); return out; }
  (data || []).forEach((d: any) => { if (d && d.signedUrl && !d.error && back[d.path]) out[back[d.path]] = d.signedUrl; });
  return out;
}
const KIND_NAME: Record<string, string> = { wash: "광택·세차", wheel: "휠복원", repair: "판금·도색" };

/* 차곳간을 쓰는 업체 이름 (5분 기억) — «출고 → 다른 업체로 이동 중» 을 알아보는 데 씁니다 */
let shopNameCache: { at: number; names: string[] } = { at: 0, names: [] };
async function shopNames() {
  if (Date.now() - shopNameCache.at < 300_000) return shopNameCache.names;
  const { data } = await sb.from("wash_shops").select("name,active").neq("shop", "ADMIN");
  const names = (data || []).filter((r: any) => r.active !== false)
    .map((r: any) => String(r.name || "").replace(/\s/g, "")).filter(Boolean);
  shopNameCache = { at: Date.now(), names };
  return names;
}
const nospace = (v: unknown) => String(v || "").replace(/\s/g, "");

/* 단계 정하기
   입고     : 아직 출고 전 · 작업 항목이 비어 있음
   작업 중  : 아직 출고 전 · 작업 항목이 있음
   출고     : 출고했고, 보낸 곳이 차곳간을 쓰는 다른 업체 (그 업체로 이동 중)
   도착     : 출고했고, 보낸 곳이 상사·주차장 등 (워시는 출고 = 도착 사진·문자) */
function carOf(row: any, names: string[] = []) {
  const r: any = row.data || {};
  const shopName = String(row.shop_name || row.shop || "");
  const inAt = String(r.createdAt || r.at || "");
  const outAt = String(r.outAt || "");
  const paid = !!r.paidAt || String(r.status || "") === "수금완료";
  const dest = String(r.dest || "").trim();
  const works = (Array.isArray(r.works) ? r.works : [])
    .map((w: any) => String((w && (w.name || w.n)) || (typeof w === "string" ? w : ""))).filter(Boolean);
  let stage = "작업 중", where = shopName;
  if (!outAt) stage = works.length ? "작업 중" : "입고";
  else {
    const d = nospace(dest);
    const toShop = !!d && d !== nospace(shopName) && names.some((n) => n === d || d.indexOf(n) >= 0 || n.indexOf(d) >= 0);
    if (toShop) { stage = "출고"; where = shopName + " → " + dest + " 이동 중"; }
    else { stage = "도착"; where = dest || shopName; }
  }
  return {
    key: row.shop + ":" + row.id,
    shop: String(row.shop), shopName, shopKind: KIND_NAME[String(row.shop_kind || "")] || "",
    id: String(row.id),
    plate: String(r.plate || "").replace(/\s/g, ""),
    model: String(r.model || ""),
    company: String(r.company || ""),
    inAt, outAt, stage, paid, where, dest,
    spot: String(r.spot || ""),
    works,
    total: Math.max(0, Math.round(Number(r.total) || 0)),
    at: outAt || inAt,
  };
}
async function myRows(phone: string) {
  const { data, error } = await sb.rpc("dealer_cars", { p_phone: phone });
  if (error) {
    if (/does not exist|could not find/i.test(error.message))
      throw new Error("딜러앱을 준비하는 중입니다. 차곳간(010-9559-3663)으로 알려 주세요.");
    throw new Error("차 목록을 읽지 못했습니다: " + error.message);
  }
  return (data || []) as any[];
}

/* ---------- 로그인 전에 쓰는 기능 ---------- */
type Ctx = { ua: string; ip: string };
const OPEN: Record<string, (a: any[], ctx: Ctx) => Promise<unknown>> = {
  ping: async () => ({ ok: true, ver: VER, terms: TERMS_VER, privacy: PRIVACY_VER }),

  /* 인증번호 보내기 — [휴대폰] */
  sendCode: async (a, ctx) => {
    const phone = normPhone(a[0]);
    if (!await rateOk("otp:ip:" + ctx.ip, Number(env("DEALER_OTP_MAX_IP_DAY", "20"))))
      throw new Error("인증번호를 너무 많이 요청했습니다. 잠시 후 다시 시도해 주세요");
    if (!await rateOk("otp:all", Number(env("DEALER_OTP_MAX_ALL_DAY", "500"))))
      throw new Error("지금은 인증번호를 보낼 수 없습니다. 잠시 후 다시 시도해 주세요");
    const { data: u } = await sb.from("dealer_users").select("active").eq("phone", phone).maybeSingle();
    if (u && u.active === false) throw new Error("이용이 멈춰 있는 번호입니다. 차곳간으로 문의해 주세요");

    const today = kstDay();
    const { data: o } = await sb.from("dealer_otp").select("*").eq("phone", phone).maybeSingle();
    const cnt = o && String(o.sent_day) === today ? Number(o.sent_count || 0) : 0;
    if (cnt >= OTP_MAX_DAY) throw new Error("오늘은 인증번호를 더 받을 수 없습니다. 내일 다시 시도해 주세요");
    if (o && Date.now() - new Date(o.created_at).getTime() < OTP_GAP_SEC * 1000)
      throw new Error(OTP_GAP_SEC + "초 뒤에 다시 받아 주세요");

    const code = sixDigits();
    const row = {
      phone, code_hash: await codeHash(phone, code), tries: 0, verified: false,
      sent_count: cnt + 1, sent_day: today,
      expires_at: new Date(Date.now() + OTP_MINUTES * 60000).toISOString(),
      created_at: new Date().toISOString(),
    };
    const { error } = await sb.from("dealer_otp").upsert(row, { onConflict: "phone" });
    if (error) throw new Error("인증번호를 준비하지 못했습니다: " + error.message);
    /* d3: 솔라피 오류 원문은 서버 기록에만 남기고, 화면에는 짧은 안내만 보냅니다 */
    try { await otpSend(phone, code); }
    catch (e) {
      console.error("dealer-api 문자 보내기 실패:", e instanceof Error ? e.message : String(e));
      throw new Error("문자를 보내지 못했습니다. 잠시 뒤 다시 해 주세요.");
    }
    return { ok: true, minutes: OTP_MINUTES };
  },

  /* 인증번호 확인 → 로그인 — [휴대폰, 인증번호] */
  verifyCode: async (a, ctx) => {
    const phone = normPhone(a[0]);
    const code = digits(a[1]);
    if (code.length !== 6) throw new Error("인증번호 6자리를 넣어 주세요");
    const { data: o } = await sb.from("dealer_otp").select("*").eq("phone", phone).maybeSingle();
    if (!o) throw new Error("인증번호를 먼저 받아 주세요");
    if (o.verified) throw new Error("이미 쓴 인증번호입니다. 다시 받아 주세요");
    if (new Date(o.expires_at).getTime() < Date.now()) throw new Error("인증번호 시간이 지났습니다. 다시 받아 주세요");
    /* d3: 번호를 맞춰 보기 «전에» DB 안에서 한 번에 횟수를 올립니다 (동시에 수백 번 보내도 새지 않음) */
    const { data: t, error: te } = await sb.rpc("dealer_otp_try", { p_phone: phone });
    if (te) {
      console.error("dealer-api 인증 횟수 오류:", te.message);
      if (/does not exist|could not find/i.test(te.message))
        throw new Error("딜러앱을 준비하는 중입니다. 차곳간(010-9559-3663)으로 알려 주세요.");
      throw new Error("인증번호를 확인하지 못했습니다. 잠시 뒤 다시 해 주세요");
    }
    if (t === null || t === undefined) throw new Error("인증번호를 먼저 받아 주세요");
    const tries = Number(t);
    if (!(tries <= OTP_MAX_TRY)) throw new Error("너무 많이 틀렸습니다. 인증번호를 다시 받아 주세요");
    if (await codeHash(phone, code) !== o.code_hash)
      throw new Error("인증번호가 다릅니다 (" + Math.max(0, OTP_MAX_TRY - tries) + "번 더 넣을 수 있어요)");
    /* 쓴 번호 표시 — 아직 안 쓴 것만 바꿔서, 같은 번호로 두 번 로그인되지 않게 합니다 */
    const { data: used } = await sb.from("dealer_otp").update({ verified: true })
      .eq("phone", phone).eq("verified", false).eq("code_hash", o.code_hash).select("phone");
    if (!used || !used.length) throw new Error("이미 쓴 인증번호입니다. 다시 받아 주세요");

    const { data: u } = await sb.from("dealer_users").select("phone,active").eq("phone", phone).maybeSingle();
    if (u && u.active === false) throw new Error("이용이 멈춰 있는 번호입니다. 차곳간으로 문의해 주세요");
    if (!u) await sb.from("dealer_users").insert({ phone });
    await sb.from("dealer_users").update({ last_login: new Date().toISOString() }).eq("phone", phone);

    const key = await makeSession(phone, ctx.ua);
    const st = await agreeState(phone);
    return { ok: true, key, phone, agreed: st.agreed, name: String(st.user?.name || "") };
  },
};

/* ---------- 로그인한 뒤에 쓰는 기능 ---------- */
type Ss = { sid: string; phone: string };
const FN: Record<string, (a: any[], ss: Ss, ctx: Ctx) => Promise<unknown>> = {
  me: async (_a, ss) => {
    const st = await agreeState(ss.phone);
    return { phone: ss.phone, name: String(st.user?.name || ""), agreed: st.agreed,
             agreedAt: st.at, marketing: st.marketing, terms: TERMS_VER, privacy: PRIVACY_VER, ver: VER };
  },

  /* 동의 — [마케팅 수신 동의(선택)] */
  agree: async (a, ss, ctx) => {
    const { error } = await sb.from("dealer_agreements").insert({
      phone: ss.phone, terms_ver: TERMS_VER, privacy_ver: PRIVACY_VER,
      marketing: !!a[0], ua: ctx.ua.slice(0, 250), ip: ctx.ip, what: "agree",
    });
    if (error) throw new Error("동의를 저장하지 못했습니다: " + error.message);
    await sb.from("dealer_users").update({ withdrawn_at: null }).eq("phone", ss.phone);
    return { ok: true };
  },

  /* 이름 고치기 — [이름] */
  setName: async (a, ss) => {
    const name = String(a[0] || "").trim().slice(0, 20);
    await sb.from("dealer_users").update({ name }).eq("phone", ss.phone);
    return { ok: true, name };
  },

  /* d6: 내 청구서 목록 — 업체가 이 휴대폰으로 보낸 청구서만 (기한이 남은 것) */
  myBills: async (_a, ss) => {
    await needAgreed(ss.phone);
    const { data, error } = await sb.from("wash_viewcode").select("code,shop,expires_at,data,created_at")
      .eq("kind", "bill").contains("to_phones", [ss.phone]).gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }).limit(100);
    if (error) return { list: [], ready: false };          // SQL 06 전이면 빈 목록
    const shops = Array.from(new Set((data || []).map((v: any) => String(v.shop))));
    const names: Record<string, string> = {};
    if (shops.length) {
      const { data: sh } = await sb.from("wash_shops").select("shop,name").in("shop", shops);
      (sh || []).forEach((x: any) => (names[String(x.shop)] = String(x.name || "")));
    }
    const list = (data || []).map((v: any) => {
      const b = (v && v.data) || {};
      const amount = Math.round(Number(b.amount) || 0), paid = Math.round(Number(b.paid) || 0);
      return {
        shop: String(names[v.shop] || "업체"), month: String(b.month || ""), name: String(b.name || ""),
        cars: Math.round(Number(b.cars) || 0), amount, due: Math.round(Number(b.due) || Math.max(0, amount - paid)),
        dueDate: String(b.dueDate || ""), bank: String(b.bank || ""),
        state: amount > 0 && paid >= amount ? "입금 확인됨" : "입금 전",
        url: "https://app.cgg.co.kr/v.html?c=" + String(v.code), until: String(v.expires_at || ""),
      };
    });
    return { list, ready: true, at: new Date().toISOString() };
  },

  /* 내 차 목록 */
  cars: async (_a, ss) => {
    await needAgreed(ss.phone);
    const [rows, names] = await Promise.all([myRows(ss.phone), shopNames()]);
    const list = rows.map((r) => carOf(r, names)).filter((c) => c.plate);
    list.sort((x, y) => (y.at > x.at ? 1 : y.at < x.at ? -1 : 0));
    const done: Record<string, number> = {};
    const { data: dn } = await sb.from("dealer_done").select("rec_key").eq("phone", ss.phone);
    (dn || []).forEach((d: any) => (done[String(d.rec_key)] = 1));
    return { list, done, at: new Date().toISOString() };
  },

  /* 차 상세 — [업체, 기록id] : 같은 차량번호로 거쳐 간 업체 기록을 이어서 돌려줍니다 */
  car: async (a, ss) => {
    await needAgreed(ss.phone);
    const shop = String(a[0] || ""), id = String(a[1] || "");
    const [rows, names] = await Promise.all([myRows(ss.phone), shopNames()]);
    const me = rows.find((r) => String(r.shop) === shop && String(r.id) === id);
    if (!me) throw new Error("이 차를 찾지 못했습니다 (내 번호로 들어온 차만 볼 수 있어요)");
    const car = carOf(me, names);
    const r: any = me.data || {};
    const want: [string, string][] = [];
    const push = (pid: unknown, tag: string) => { const v = String(pid || ""); if (v) want.push([v, tag]); };
    push(r.photoId, "입고");
    (Array.isArray(r.memoPhotos) ? r.memoPhotos : []).forEach((x: any) =>
      push(typeof x === "string" ? x : (x && x.id), "맡길 때"));
    push(r.outPhotoId, "출고·도착");
    const links = await shotLinks(want.map((x) => x[0]), String(me.shop));
    const shots: any[] = want.filter((x) => links[x[0]]).map((x) => ({ url: links[x[0]], tag: x[1] }));

    /* 같은 차량번호 — 내 번호로 들어온 기록만 (다른 딜러 기록은 보지 않습니다) */
    const trail = rows.map((x) => carOf(x, names)).filter((c) => c.plate === car.plate)
      .sort((x, y) => (x.inAt > y.inAt ? 1 : x.inAt < y.inAt ? -1 : 0))
      .map((c) => ({ key: c.key, shop: c.shop, id: c.id, shopName: c.shopName, shopKind: c.shopKind,
                     inAt: c.inAt, outAt: c.outAt, dest: c.dest, works: c.works, stage: c.stage, total: c.total }));
    return { car, shots, trail };
  },

  /* 상품화 완료 표시 — [업체, 기록id] (내 번호로 들어온 차만) */
  finish: async (a, ss) => {
    await needAgreed(ss.phone);
    const key = String(a[0] || "") + ":" + String(a[1] || "");
    const rows = await myRows(ss.phone);
    if (!rows.some((r) => r.shop + ":" + r.id === key)) throw new Error("이 차를 찾지 못했습니다");
    const { error } = await sb.from("dealer_done").upsert({ phone: ss.phone, rec_key: key, done_at: new Date().toISOString() },
      { onConflict: "phone,rec_key" });
    if (error) throw new Error("완료 표시를 저장하지 못했습니다: " + error.message);
    return { ok: true };
  },
  unfinish: async (a, ss) => {
    const key = String(a[0] || "") + ":" + String(a[1] || "");
    await sb.from("dealer_done").delete().eq("phone", ss.phone).eq("rec_key", key);
    return { ok: true };
  },

  logout: async (_a, ss) => {
    await sb.from("dealer_sessions").delete().eq("sid", ss.sid);
    return { ok: true };
  },

  /* 동의 철회(탈퇴) — 모든 기기에서 로그아웃되고, 다시 동의하기 전까지 차가 보이지 않습니다 */
  leave: async (_a, ss, ctx) => {
    await sb.from("dealer_agreements").insert({
      phone: ss.phone, terms_ver: TERMS_VER, privacy_ver: PRIVACY_VER,
      marketing: false, ua: ctx.ua.slice(0, 250), ip: ctx.ip, what: "withdraw",
    });
    await sb.from("dealer_users").update({ withdrawn_at: new Date().toISOString(), name: null }).eq("phone", ss.phone);
    await sb.from("dealer_sessions").delete().eq("phone", ss.phone);
    return { ok: true };
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let body: any = {};
  try { body = JSON.parse(await req.text()); } catch { return out({ __err: "요청을 읽지 못했습니다" }); }
  const ctx: Ctx = { ua: String(req.headers.get("user-agent") || ""), ip: ipOf(req) };
  try {
    const fn = String(body.fn || "");
    const args = Array.isArray(body.args) ? body.args : [];
    if (OPEN[fn]) return out({ result: await OPEN[fn](args, ctx) });
    const f = FN[fn];
    if (!f) return out({ __err: "지원하지 않는 기능입니다. 화면을 새로 고쳐 주세요." });
    const ss = await sessionOf(String(body.token || ""));
    if (!ss) return out({ __err: "다시 로그인해 주세요", __login: true });
    return out({ result: await f(args, ss, ctx) });
  } catch (e: any) {
    return out({ __err: userMsg(e instanceof Error ? e.message : String(e)), __agree: !!(e && e.needAgree) });   // d7: 영어·원문 숨김
  }
});
