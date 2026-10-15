// =========================================================
// 차곳간 결제 웹훅 — Supabase 서버 기능  이름: pay-hook   판: p1 (2026-10-15 · 배포 전)
// 토스페이먼츠가 «결제 상태가 바뀌었다»(PAYMENT_STATUS_CHANGED)고 알려 주는 곳이에요.
//   · 받은 내용은 «주문번호» 만 씁니다. 상태·금액은 워시 서버(wash-api payCheck)가 토스에 다시 물어본 결과로만 반영해요.
//     (누가 가짜로 보내도 토스에 결제가 없으면 아무것도 안 바뀜)
//   · 이미 반영된 주문은 다시 반영하지 않아요(wash-api payFinish 가 한 번만).
//   · 받은 기록: pay_webhook_log (받은 시각 · 이벤트 · 주문번호 · 처리 결과) — 카드 정보는 안 남겨요.
//   · 처리 결과를 알면 200, 서버 오류면 500 (토스가 나중에 다시 보내 줌)
// 비밀값: 새로 필요 없음 (SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 는 수파베이스가 넣어 줌)
// ※ 배포할 때 'Verify JWT' 는 꺼 주세요 (토스는 로그인 열쇠 없이 보냄). 먼저 서버/sql/06 실행.
// 토스 개발자센터 → 웹훅 주소: https://(프로젝트).supabase.co/functions/v1/pay-hook  · 이벤트: PAYMENT_STATUS_CHANGED
// =========================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPA_URL = Deno.env.get("SUPABASE_URL") ?? "";
const db = createClient(SUPA_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });
const ORDER_RE = /^CG[GB]\d{6}[0-9A-F]{10}$/;

async function logIt(event: string, orderId: string, result: string) {
  try { await db.from("pay_webhook_log").insert({ event: event.slice(0, 60), order_id: orderId.slice(0, 40), result: result.slice(0, 60) }); }
  catch (_) { /* 기록이 안 돼도 처리는 계속 */ }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok", { status: 200 });
  const raw = await req.text();
  if (raw.length > 20000) return new Response("too big", { status: 413 });
  let j: any = {};
  try { j = JSON.parse(raw); } catch { return new Response("bad", { status: 400 }); }
  const event = String((j && j.eventType) || "");
  const orderId = String((j && j.data && j.data.orderId) || "").trim().toUpperCase();
  if (event !== "PAYMENT_STATUS_CHANGED" || !ORDER_RE.test(orderId)) {
    await logIt(event || "?", ORDER_RE.test(orderId) ? orderId : "", "ignored");
    return new Response("ok", { status: 200 });          // 우리 것이 아닌 알림은 무시 (다시 보내지 않게 200)
  }
  try {
    const r = await fetch(SUPA_URL + "/functions/v1/wash-api", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop: "", token: "", fn: "payCheck", args: [orderId] }),
      signal: AbortSignal.timeout(8000),
    });
    const out: any = await r.json().catch(() => ({}));
    const result = String((out && out.result && out.result.result) || (out && out.__err ? "err" : "?"));
    await logIt(event, orderId, result);
    if (result === "err" || result === "?") return new Response("retry", { status: 500 });
    return new Response("ok", { status: 200 });
  } catch (_) {
    await logIt(event, orderId, "error");
    return new Response("retry", { status: 500 });       // 토스가 나중에 다시 보냄
  }
});
