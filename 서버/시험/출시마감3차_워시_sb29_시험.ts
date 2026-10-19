// 워시 sb29 시험 — 출시마감 3차 [2]: 보내기(sendMsg)는 «한 번만 표»를 못 잡으면 안 보냄 · 받았는지 모름은 «확인 중»(자동 재발송 없음) · 실패 확정만 같은 rid 로 다시
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/출시마감3차_워시_sb29_시험.ts
// «받음 수» = 가짜 문자 업체(솔라피)가 실제로 받은 메시지 수 — 이것이 늘지 않아야 «두 번 안 나감»이에요.
import { knobs, rpcLog, store } from "./fake_supabase_wash.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s"); Deno.env.set("SMS_FROM", "0212345678");
const far = new Date(Date.now() + 864e5).toISOString();
const A = "a".repeat(48);
Object.assign(store, {
  wash_hq: [{ id: 1 }], cgg_access: [], wash_viewcode: [], wash_otp: [], cgg_sendlog: [], wash_sendlog: [], cgg_idem: [], hq_audit: [],
  wash_shops: [{ shop: "SHA1", name: "시험업체A", active: true, plan: "pro", paid_until: far.slice(0, 10), owner_phone: "01000000001", sms_from: "01011112222" }],
  wash_users: [{ phone: "01000000001", shop: "SHA1", role: "owner", active: true }],
  wash_sessions: [{ sid: A, phone: "01000000001", shop: "SHA1", role: "owner", expires_at: far }],
  wash_docs: [],
});
/* 가짜 문자 업체: plan 에 넣은 차례대로 답함(비면 ok)
   ok = 받음 · lost = 받은 뒤 답이 끊김 · e502 = 업체 쪽 오류(받았는지 모름) · e400 = 받지 않음(확정) */
let accepted = 0, tries = 0;
const plan: string[] = [];
globalThis.fetch = (async (url: string | URL, _init?: RequestInit) => {
  const u = String(url);
  if (u.includes("solapi") && u.includes("/messages/v4/send")) {
    tries++;
    const m = plan.shift() || "ok";
    await new Promise((r) => setTimeout(r, 30));
    if (m === "ok") { accepted++; return Response.json({ groupInfo: { groupId: "G" + accepted }, messageList: { ["M" + accepted]: {} }, failedMessageList: [] }); }
    if (m === "lost") { accepted++; throw new TypeError("connection reset by peer"); }
    if (m === "e502") return new Response("bad gateway", { status: 502 });
    if (m === "e400") return new Response(JSON.stringify({ errorCode: "ValidationError", errorMessage: "bad" }), { status: 400 });
  }
  return Response.json({});
}) as typeof fetch;
console.error = () => {}; console.warn = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
const SRC = Deno.env.get("WASH_SRC") ?? new URL("../1_차곳간워시_서버_wash-api_sb29.ts", import.meta.url).href;
await import(SRC);
const call = async (fn: string, args: unknown[], rid?: string) =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop: "SHA1", token: A, fn, args, rid }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const msg = JSON.stringify({ to: "01033334444", from: "x", kind: "SMS", text: "시험 문자", type: "시험" });
const send = (rid?: string) => call("sendMsg", [msg], rid);
const row = (rid: string) => store.cgg_idem.find((x: any) => x.fn === "sendMsg" && x.rid === rid);
let n = 0;
const rid = () => (String(++n).padStart(4, "0") + "x".repeat(20)).slice(0, 24);
const writes = () => rpcLog.filter((x) => x.fn === "wash_write").length;

console.log("① 보통 다시 누름 · 동시에 3번 → 받음 1번");
let a0 = accepted, R = rid();
const three = await Promise.all([1, 2, 3].map(() => send(R)));
check("동시에 같은 rid 3번 → 문자 업체가 받은 것은 1번", accepted === a0 + 1, accepted - a0);
check("나머지는 «처리 중이에요» 또는 같은 답", three.every((x) => x.result?.ok === true || /처리 중이에요/.test(x.__err || "")), three);
const rep = await send(R);
check("끝난 뒤 같은 rid(화면이 답을 못 받아 다시 보냄) → 처음 답 그대로 · 받음 그대로 1번", accepted === a0 + 1 && rep.result?.ok === true && rep.result?.id === three.find((x) => x.result)?.result?.id, rep);

console.log("② «한 번만 표» DB 오류 → 받음 0번");
a0 = accepted; let t0 = tries;
(store as any).__idemFail = (op: string) => op === "insert" ? { code: "57014", message: "canceling statement due to statement timeout" } : null;
const d1 = await send(rid());
check("표 넣기가 23505 아닌 오류 → 보내지 않고 «잠시 뒤 다시»", /잠시 뒤 다시/.test(d1.__err || "") && accepted === a0 && tries === t0, [d1, accepted - a0]);
let w0 = writes();
const d2 = await call("apiSet", ["intakes", "k1", JSON.stringify({ plate: "12가3456", createdAt: new Date().toISOString() })], rid());
check("기록 저장은 지금 정책 그대로(같은 id 덮어쓰기라 처리)", d2.result?.ok === true && writes() === w0 + 1, d2);
(store as any).__idemFail = null;
knobs.missing.add("cgg_idem");
const d3 = await send(rid());
check("표가 아예 없음(SQL 26 전) → 보내지 않고 «잠시 뒤 다시»", /잠시 뒤 다시/.test(d3.__err || "") && accepted === a0 && tries === t0, d3);
knobs.missing.delete("cgg_idem");

console.log("③ 받은 뒤 답 끊김 · 완료 저장 실패 · 중간에 끊김 → 다시 해도 받음 +0");
a0 = accepted; R = rid(); plan.push("lost");
const l1 = await send(R);
check("받은 뒤 답이 끊김 → «확인 중»(못 보냄 확정 아님)", l1.result?.checking === true && /확인 중/.test(l1.result?.checkMsg || "") && accepted === a0 + 1, l1);
const l2 = await send(R), l3 = await send(R);
check("같은 rid 로 두 번 더 → «확인 중 — 보낸 기록에서 확인» · 받음 +0", l2.__checking === true && l3.__checking === true && /보낸 기록에서 확인/.test(l2.__err) && accepted === a0 + 1, [l2, l3]);
check("«확인 중» 줄은 지우지 않음(state unknown)", row(R)?.state === "unknown", row(R));
a0 = accepted; R = rid(); plan.push("e502");
const e1 = await send(R), e2 = await send(R);
check("업체 쪽 5xx(받았는지 모름) → «확인 중» · 다시 해도 보내기 시도 없음", e1.result?.checking === true && e2.__checking === true && row(R)?.state === "unknown", [e1, e2]);
a0 = accepted; R = rid();
(store as any).__idemFail = (op: string, p: any) => op === "update" && p?.state === "done" ? { code: "08006", message: "connection failure" } : null;
const s1 = await send(R);
(store as any).__idemFail = null;
check("보냈는데 «끝남» 저장 실패 → 답에 «확인 중» · 받음 1번", s1.result?.checking === true && accepted === a0 + 1 && row(R)?.state === "unknown", [s1, row(R)]);
const s2 = await send(R);
check("같은 rid 로 다시 → «확인 중» · 받음 +0", s2.__checking === true && accepted === a0 + 1, s2);
a0 = accepted; R = rid();
(store as any).__idemFail = (op: string) => op === "update" ? { code: "08006", message: "connection failure" } : null;
const u1 = await send(R);
(store as any).__idemFail = null;
const u2 = await send(R);
check("표 바꾸기가 모두 실패(줄이 «처리 중»으로 남음) → 바로 다시 하면 «처리 중이에요» · 받음 +0", u1.result?.checking === true && /처리 중이에요/.test(u2.__err || "") && accepted === a0 + 1, [u1, u2]);
row(R).at = new Date(Date.now() - 6 * 60000).toISOString();
const u3 = await send(R);
check("5분이 지나도 지우거나 다시 보내지 않음 → «확인 중» · 줄 그대로", u3.__checking === true && accepted === a0 + 1 && row(R)?.state === "run", [u3, row(R)]);
R = rid();
store.cgg_idem.push({ product: "wash", tenant: "SHA1", who: "01000000001", fn: "sendMsg", rid: R, state: "run", at: new Date(Date.now() - 30 * 60000).toISOString() });
a0 = accepted;
const k1 = await send(R);
check("보내던 중 서버가 끊겨 남은 줄(30분) → «확인 중» · 자동 재발송 없음", k1.__checking === true && accepted === a0 && !!row(R), k1);

console.log("④ 받지 않음 확정 → 같은 rid 로 다시 하면 안전하게 한 번");
a0 = accepted; t0 = tries; R = rid(); plan.push("e400");
const f1 = await send(R);
check("업체가 거절(4xx) → «못 보냄» · 받음 0 · 줄은 지우지 않고 «다시 가능»(retry)", f1.result?.ok === false && !f1.result?.checking && accepted === a0 && row(R)?.state === "retry", [f1, row(R)]);
const f2 = await send(R);
check("같은 rid 로 다시 → 이번엔 보냄 · 받음 1번", f2.result?.ok === true && accepted === a0 + 1 && row(R)?.state === "done", f2);
const f3 = await send(R);
check("또 같은 rid → 처음 성공 답 · 받음 그대로 1번", f3.result?.ok === true && accepted === a0 + 1, f3);
a0 = accepted; R = rid(); plan.push("e400");
await send(R);
const many = await Promise.all([1, 2, 3, 4].map(() => send(R)));
check("«다시 가능» 줄을 동시에 4번 다시 잡음 → 한 쪽만 잡고 받음 1번(조건을 건 한 번의 바꾸기)", accepted === a0 + 1 && many.filter((x) => x.result?.ok === true).length >= 1 &&
  many.every((x) => x.result?.ok === true || /처리 중이에요/.test(x.__err || "")), [accepted - a0, many]);
a0 = accepted; R = rid();
const v1 = await call("sendMsg", [JSON.stringify({ to: "12", kind: "SMS", text: "x" })], R);
check("보내기 전 거절(번호 틀림 등) → 받음 0 · «다시 가능»", accepted === a0 && (!!v1.__err || v1.result?.ok === false) && row(R)?.state === "retry", [v1, row(R)]);
const R2 = rid();
const nw = await send(R2);
check("일부러 «다시 보내기» = 새 rid → 새로 한 번", nw.result?.ok === true && accepted === a0 + 1);

console.log("⑤ 기록 저장(보내기 아님)은 지금 정책 유지");
R = rid();
store.cgg_idem.push({ product: "wash", tenant: "SHA1", who: "01000000001", fn: "apiSet", rid: R, state: "run", at: new Date(Date.now() - 6 * 60000).toISOString() });
w0 = writes();
const r1 = await call("apiSet", ["intakes", "k2", JSON.stringify({ plate: "22가2222", createdAt: new Date().toISOString() })], R);
check("5분 넘게 끊긴 «처리 중» 저장은 조건부로 다시 잡아 처리", r1.result?.ok === true && writes() === w0 + 1 && store.cgg_idem.find((x: any) => x.rid === R)?.state === "done", r1);
check("판 sb29", JSON.stringify(await call("apiVer", [])).includes("sb29"));

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail || pass === 0) Deno.exit(1);
