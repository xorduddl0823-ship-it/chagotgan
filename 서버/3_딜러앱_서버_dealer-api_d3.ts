// =========================================================
// 차곳간 딜러앱 — 2번 파일 : 수파베이스 서버 기능   이름: dealer-api
// 워시 서버(wash-api)와 완전히 따로 돕니다. 워시 자료는 «읽기만» 합니다.
//   · 인증번호 로그인 (비밀번호 없음)
//   · 약관·개인정보 동의 (동의해야 차가 보입니다)
//   · 내 차 목록 / 차 상세 (모든 업체의 입고 기록 중 «딜러 연락처»가 내 번호인 것만)
// 비밀 열쇠는 워시와 같은 것을 씁니다 (Edge Functions → Secrets 는 프로젝트 공용):
//   SOLAPI_KEY, SOLAPI_SECRET, SMS_FROM(차곳간 대표번호)
// ※ 배포할 때 'Verify JWT' 는 꺼 주세요 (로그인 열쇠로 따로 확인합니다)
// d3 (2026-10-15) 보안 고침 — 인증번호 틀린 횟수를 DB 에서 한 번에 올림(dealer_otp_try · 서버/sql/03) · 횟수 제한 장치 오류면 «보내지 않음» · IP 는 꾸밀 수 없는 값만 · 솔라피 오류 원문은 화면에 안 보냄
// d2 (2026-10-11) 화면을 시안과 똑같이 — 단계 4개(입고·작업 중·출고·도착) · 금액 · 상품화 완료 표시
// d1 (2026-10-11) 첫 판 — 로그인 · 동의 · 내 차 · 차 상세 · 로그아웃 · 동의 철회
// =========================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const VER = "d3";
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
  if (!key || !secret) throw new Error("문자 설정(SOLAPI_KEY / SOLAPI_SECRET)이 없습니다");
  const date = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const salt = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
  const te = new TextEncoder();
  const sig = hex(await hmac(te.encode(secret), te.encode(date + salt)));
  return `HMAC-SHA256 apiKey=${key}, date=${date}, salt=${salt}, signature=${sig}`;
}
async function solapi(method: string, path: string, payload?: unknown) {
  const res = await fetch("https://api.solapi.com" + path, {
    method,
    headers: { Authorization: await solapiAuth(), "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const body = await res.text();
  if (res.status >= 300) throw new Error("솔라피 " + res.status + ": " + body);
  return body ? JSON.parse(body) : {};
}
async function otpSend(phone: string, code: string) {
  const msg = {
    to: phone, from: digits(OTP_FROM), type: "SMS",
    text: "[차곳간 딜러] 인증번호 " + code + " (" + OTP_MINUTES + "분 안에 입력해 주세요)",
  };
  const r = await solapi("POST", "/messages/v4/send-many/detail", { messages: [msg] });
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
function shotUrl(id: unknown) {
  const v = String(id || "");
  if (!v.startsWith("sb/")) return "";
  return env("SUPABASE_URL") + "/storage/v1/object/public/" + BUCKET + "/" +
    v.slice(3).split("/").map(encodeURIComponent).join("/");
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
      throw new Error("딜러앱 표가 아직 없습니다. 1번 파일(SQL)을 먼저 실행해 주세요");
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
        throw new Error("딜러앱 표가 아직 없습니다. 서버/sql/03 파일(SQL)을 먼저 실행해 주세요");
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
    const shots: any[] = [];
    const push = (pid: unknown, tag: string) => { const u = shotUrl(pid); if (u) shots.push({ url: u, tag }); };
    push(r.photoId, "입고");
    (Array.isArray(r.memoPhotos) ? r.memoPhotos : []).forEach((x: any) =>
      push(typeof x === "string" ? x : (x && x.id), "맡길 때"));
    push(r.outPhotoId, "출고·도착");

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
    if (!f) return out({ __err: "허용되지 않은 기능: " + fn });
    const ss = await sessionOf(String(body.token || ""));
    if (!ss) return out({ __err: "다시 로그인해 주세요", __login: true });
    return out({ result: await f(args, ss, ctx) });
  } catch (e: any) {
    return out({ __err: e instanceof Error ? e.message : String(e), __agree: !!(e && e.needAgree) });
  }
});
