// 격리 시험 환경 — 딜러 서버(d9)를 가짜 수파베이스로 127.0.0.1:54413 에 띄움. 워시 차 기록은 워시 쪽과 같은 가짜 자료.
import { store } from "../fake_supabase_dealer.ts";
import { V, far, 워시차, 포트 } from "./공통값.ts";
Deno.env.set("SUPABASE_URL", "http://fake.local"); Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Object.assign(store, {
  dealer_otp: [], dealer_users: [{ phone: V.DA_PHONE, active: true }, { phone: V.DB_PHONE, active: true }],
  dealer_sessions: [{ sid: V.DA_TOKEN, phone: V.DA_PHONE, expires_at: far(), last_seen: new Date().toISOString() }, { sid: V.DB_TOKEN, phone: V.DB_PHONE, expires_at: far(), last_seen: new Date().toISOString() }],
  dealer_agreements: [], dealer_done: [], wash_rate: [], wash_viewcode: [],
  wash_shops: [{ shop: V.WA_SHOP, name: "시험업체A", active: true }, { shop: V.WB_SHOP, name: "시험업체B", active: true }],
  wash_docs: 워시차(),
});
globalThis.fetch = (async () => Response.json({})) as typeof fetch;
포트(54413);
await import(Deno.env.get("DEALER_SRC") ?? new URL("../../3_딜러앱_서버_dealer-api_d9.ts", import.meta.url).href);
