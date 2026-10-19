// 격리 시험 환경 — 체크 서버(v53)를 가짜 수파베이스로 127.0.0.1:54412 에 띄움.
import { store } from "../fake_supabase_check.ts";
import { V, far, 포트 } from "./공통값.ts";
Deno.env.set("SUPABASE_URL", "http://fake.local"); Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Object.assign(store, {
  check_office: [{ id: "oA", code: V.CA_OFFICE, name: "시험검사소A", biz_no: "2223344444" }, { id: "oB", code: V.CB_OFFICE, name: "시험검사소B", biz_no: "" }],
  check_user: [{ id: "uA", office_id: "oA", phone: "01000000031", name: "대표A", role: "owner", active: true, pw_hash: "x" }, { id: "uB", office_id: "oB", phone: "01000000032", name: "대표B", role: "owner", active: true, pw_hash: "x" }],
  check_session: [{ sid: V.CA_TOKEN, phone: "01000000031", office_id: "oA", role: "owner", expires_at: far() }, { sid: V.CB_TOKEN, phone: "01000000032", office_id: "oB", role: "owner", expires_at: far() }],
  cgg_access: [], wash_sessions: [], check_log: [], check_rate: [], cgg_sendlog: [], wash_hq: [{ id: 1, biz_no: "1112233333" }], wash_shops: [],
  check_dealer: [{ id: "dA", office_id: "oA", name: "A딜러", tel: "010-1111-2222", active: true }],
  check_invoice: [{ id: V.CA_INVOICE, office_id: "oA", ym: V.CA_YM, bill_to_id: "dA", bill_to_name: "A딜러", total_amount: 11000, view_key: "a".repeat(18), created_at: far() }],
  check_invoice_row: [{ id: "rA1", invoice_id: V.CA_INVOICE, kind: "fee", item: "국산", qty: 1, unit: 10000, amount: 11000 }],
  check_car: [{ id: V.CA_CAR, office_id: "oA", dealer_id: "dA", plate: "11가1111", check_date: "2026-10-01", fee: 10000 }],
  check_deliv: [{ id: "dvA", office_id: "oA", view_key: "v".repeat(18) }], check_deliv_photo: [{ id: V.CA_DELIV_PHOTO, deliv_id: "dvA", path: "dvA/1.jpg", ord: 1 }],
});
globalThis.fetch = (async () => Response.json({})) as typeof fetch;
포트(54412);
await import(Deno.env.get("CHECK_SRC") ?? new URL("../../2_차곳간체크_서버_check-api_v53.ts", import.meta.url).href);
