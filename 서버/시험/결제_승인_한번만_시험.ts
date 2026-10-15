// 워시 서버 sb9 시험 — 카드 승인(payConfirm)은 두 번 와도 한 번만 반영 (보안 방 결제 설계 검토 [높음]) · 가짜 수파베이스 · 가짜 토스
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/결제_승인_한번만_시험.ts
// WASH_SRC 에 sb8 을 넣으면 실패가 나와야 합니다.
import { store } from "./fake_supabase_wash.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s");
Deno.env.set("SMS_FROM", "0212345678");
Deno.env.set("TOSS_SECRET_KEY", "test_sk_fake");
const far = new Date(Date.now() + 864e5).toISOString();
const OWN = "c".repeat(48);
const order = (id: string, amount = 33000) =>
  ({ order_id: id, shop: "BT", kind: "plan", amount, supply: 30000, vat: 3000, use_cash: 0, status: "ready",
     order_name: "프로 10월", period: "2026-10" });
Object.assign(store, {
  wash_hq: [{ id: 1, ata_cfg: {} }],
  wash_shops: [{ shop: "BT", name: "브라더세차", active: true, plan: "pro", paid_until: "2026-10-20", owner_phone: "01077778888" }],
  wash_sessions: [{ sid: OWN, phone: "01077778888", shop: "BT", role: "owner", expires_at: far }],
  wash_plans: [{ code: "pro", name: "프로", price: 30000 }],
  wash_pay_order: [order("O1"), order("O2"), order("O3"), order("O4"), order("O5")],
  wash_payments: [], wash_otp: [], cgg_access: [], wash_viewcode: [], wash_docs: [],
});

/* 가짜 토스: 같은 paymentKey 를 두 번 승인하면 «이미 처리된 결제» 오류 · 조회는 knob 대로 */
const confirmed = new Set<string>();
const knob: Record<string, { confirm?: "ok" | "500"; get?: "DONE" | "ABORTED"; total?: number }> = {};
let tossCalls = 0;
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  const u = String(url);
  if (u.includes("solapi")) return Response.json({});
  if (u.includes("api.tosspayments.com")) {
    tossCalls++;
    await new Promise((r) => setTimeout(r, 5));          // 두 요청이 겹치게
    if (u.endsWith("/v1/payments/confirm")) {
      const b = JSON.parse(String(init?.body));
      const k = knob[b.paymentKey] ?? {};
      if (k.confirm === "500") return new Response(JSON.stringify({ code: "PROVIDER_ERROR", message: "잠시 오류" }), { status: 500 });
      if (confirmed.has(b.paymentKey))
        return new Response(JSON.stringify({ code: "ALREADY_PROCESSED_PAYMENT", message: "이미 처리된 결제" }), { status: 400 });
      confirmed.add(b.paymentKey);
      return Response.json({ status: "DONE", orderId: b.orderId, paymentKey: b.paymentKey, totalAmount: b.amount, method: "카드" });
    }
    const m = u.match(/\/v1\/payments\/([^/]+)$/);
    if (m && (init?.method ?? "GET") === "GET") {
      const pk = decodeURIComponent(m[1]);
      const k = knob[pk] ?? {};
      const oid = pk.replace("pk_", "");
      return Response.json({ status: k.get ?? (confirmed.has(pk) ? "DONE" : "READY"), orderId: oid, paymentKey: pk,
                             totalAmount: k.total ?? 33000, method: "카드" });
    }
  }
  throw new Error("예상 못 한 주소 " + u);
}) as typeof fetch;
console.error = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(Deno.env.get("WASH_SRC") ?? "../1_차곳간워시_서버_wash-api_sb9.ts");
const call = async (fn: string, args: unknown[]) =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop: "BT", token: OWN, fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const od = (id: string) => store.wash_pay_order.find((o: any) => o.order_id === id);
const ledger = () => store.wash_payments.length;
const until = () => String(store.wash_shops[0].paid_until).slice(0, 10);

console.log("① 같은 결제 승인이 동시에 두 번 (새로고침 2번)");
const u0 = until(), l0 = ledger();
const [a, b] = await Promise.all([call("payConfirm", ["O1", "pk_O1", 33000]), call("payConfirm", ["O1", "pk_O1", 33000])]);
check("둘 다 오류 없이 끝남", !a.__err && !b.__err, { a, b });
check("결제 장부는 한 줄만 (payDone 한 번)", ledger() === l0 + 1, store.wash_payments);
check("이용기간은 30일 한 번만 늘어남", until() === new Date(Date.parse(u0 + "T00:00:00Z") + 30 * 864e5).toISOString().slice(0, 10), { u0, now: until() });
check("주문은 paid", od("O1").status === "paid", od("O1"));
const c = await call("payConfirm", ["O1", "pk_O1", 33000]);
check("세 번째 요청은 «이미 끝남» 으로 돌려줌 · 더 안 늘어남", (c.result?.already === true) && ledger() === l0 + 1, c);

console.log("② 승인 요청이 오류였지만 토스에서는 결제가 끝난 경우");
knob["pk_O2"] = { confirm: "500", get: "DONE" };
const l1 = ledger();
const d = await call("payConfirm", ["O2", "pk_O2", 33000]);
check("토스 조회로 확인해서 반영 (failed 로 안 씀)", !d.__err && od("O2").status === "paid" && ledger() === l1 + 1, { d, o: od("O2") });

console.log("③ 진짜 실패");
knob["pk_O3"] = { confirm: "500", get: "ABORTED" };
const e = await call("payConfirm", ["O3", "pk_O3", 33000]);
check("오류를 돌려주고 주문은 failed · 반영 없음", !!e.__err && od("O3").status === "failed" && ledger() === l1 + 1, { e, o: od("O3") });

console.log("④ 이미 paid 인 주문을 늦게 온 오류가 덮지 않음");
od("O4").status = "paid";
knob["pk_O4"] = { confirm: "500", get: "ABORTED" };
const f = await call("payConfirm", ["O4", "pk_O4", 33000]);
check("paid 그대로", od("O4").status === "paid", { f, o: od("O4") });

console.log("⑤ 토스 금액이 주문 금액과 다르면 반영 안 함");
knob["pk_O5"] = { confirm: "500", get: "DONE", total: 100 };
const l2 = ledger();
const g = await call("payConfirm", ["O5", "pk_O5", 33000]);
check("금액이 다르면 이용기간·장부 그대로 + 오류로 알려 줌", ledger() === l2 && od("O5").status !== "paid" && !!g.__err, { g, o: od("O5") });

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
