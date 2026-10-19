// 격리 시험 환경 — 워시 서버(sb29)를 가짜 수파베이스로 127.0.0.1:54411 에 띄움. 운영 DB·운영 서버에 접속하지 않음.
import { store } from "../fake_supabase_wash.ts";
import { V, far, 워시차, 포트 } from "./공통값.ts";
Deno.env.set("SUPABASE_URL", "http://fake.local"); Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Object.assign(store, {
  wash_hq: [{ id: 1, biz_no: "1112233333" }], cgg_access: [], wash_viewcode: [], hq_audit: [], biz_share_req: [], biz_share_ok: [],
  wash_shops: [
    { shop: V.WA_SHOP, name: "시험업체A", active: true, plan: "pro", paid_until: far().slice(0, 10), owner_phone: V.WA_PHONE, biz_no: V.WA_BIZ },
    { shop: V.WB_SHOP, name: "시험업체B", active: true, plan: "pro", paid_until: far().slice(0, 10), owner_phone: V.WB_PHONE, biz_no: null },
  ],
  wash_users: [{ phone: V.WA_PHONE, shop: V.WA_SHOP, name: "대표A", role: "owner", active: true }, { phone: V.WB_PHONE, shop: V.WB_SHOP, name: "대표B", role: "owner", active: true }],
  wash_sessions: [{ sid: V.WA_TOKEN, phone: V.WA_PHONE, shop: V.WA_SHOP, role: "owner", expires_at: far() }, { sid: V.WB_TOKEN, phone: V.WB_PHONE, shop: V.WB_SHOP, role: "owner", expires_at: far() }],
  check_office: [], wash_docs: 워시차(),
});
globalThis.fetch = (async () => Response.json({})) as typeof fetch;   // 바깥(솔라피·팝빌 등)으로 안 나감
포트(54411);
await import(Deno.env.get("WASH_SRC") ?? new URL("../../1_차곳간워시_서버_wash-api_sb29.ts", import.meta.url).href);
