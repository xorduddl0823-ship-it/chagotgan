// 워시 sb28 시험 — 기록·알림톡 출시 마감: rid «한 번 누름 = 한 번 처리» · 발송 기록 가림 · 관리 사업자번호 10자리·확인 다시
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_wash.json 서버/시험/기록_알림톡_마감_워시_sb28_시험.ts
import { rpcLog, store } from "./fake_supabase_wash.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("SOLAPI_KEY", "k"); Deno.env.set("SOLAPI_SECRET", "s"); Deno.env.set("SMS_FROM", "0212345678");
const far = new Date(Date.now() + 864e5).toISOString();
const A = "a".repeat(48), A2 = "f".repeat(48), B = "b".repeat(48), ADM = "c".repeat(48);
Object.assign(store, {
  wash_hq: [{ id: 1, biz_no: "1112233333" }], cgg_access: [], wash_viewcode: [], wash_otp: [], cgg_sendlog: [], wash_sendlog: [], cgg_idem: [], hq_audit: [],
  biz_share_req: [], biz_share_ok: [],
  wash_shops: [{ shop: "SHA1", name: "시험업체A", active: true, plan: "pro", paid_until: far.slice(0, 10), owner_phone: "01000000001", sms_from: "01011112222", biz_no: null, biz_ok_at: far },
               { shop: "SHB1", name: "시험업체B", active: true, plan: "pro", paid_until: far.slice(0, 10), owner_phone: "01000000002", biz_no: null }],
  wash_users: [{ phone: "01000000001", shop: "SHA1", role: "owner", active: true }, { phone: "01000000009", shop: "SHA1", role: "manager", active: true },
               { phone: "01000000002", shop: "SHB1", role: "owner", active: true }],
  wash_sessions: [{ sid: A, phone: "01000000001", shop: "SHA1", role: "owner", expires_at: far }, { sid: A2, phone: "01000000009", shop: "SHA1", role: "manager", expires_at: far },
                  { sid: B, phone: "01000000002", shop: "SHB1", role: "owner", expires_at: far }, { sid: ADM, phone: "01099999999", shop: "ADMIN", role: "admin", expires_at: far }],
  wash_docs: [],
});
const sent: any[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  if (String(url).includes("solapi")) { const b = JSON.parse(String(init?.body || "{}")); sent.push(b.messages?.[0]); await new Promise((r) => setTimeout(r, 30)); return Response.json({ groupInfo: { groupId: "G" }, messageList: {}, failedMessageList: [] }); }
  return Response.json({});
}) as typeof fetch;
console.error = () => {}; console.warn = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
const SRC = Deno.env.get("WASH_SRC") ?? new URL("../1_차곳간워시_서버_wash-api_sb28.ts", import.meta.url).href;
await import(SRC);
const call = async (fn: string, args: unknown[], token = "", shop = "", rid?: string) =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop, token, fn, args, rid }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const writes = () => rpcLog.filter((x) => x.fn === "wash_write").length;
const R1 = "r".repeat(24), R2 = "q".repeat(24);

console.log("① 저장 — 같은 rid 는 한 번만");
let w0 = writes();
const s1 = await call("apiSet", ["intakes", "i1", JSON.stringify({ plate: "11가1111", createdAt: new Date().toISOString() })], A, "SHA1", R1);
check("처음 저장 성공", s1.result?.ok === true && writes() === w0 + 1, s1);
const s2 = await call("apiSet", ["intakes", "i1", JSON.stringify({ plate: "11가1111" })], A, "SHA1", R1);
check("같은 rid 로 다시 → 다시 저장하지 않고 처음 답 그대로", JSON.stringify(s2) === JSON.stringify(s1) && writes() === w0 + 1, [s2, writes() - w0]);
const s3 = await call("apiSet", ["intakes", "i2", JSON.stringify({ plate: "22가2222", createdAt: new Date().toISOString() })], A, "SHA1", R2);
check("새 rid 는 새로 저장", s3.result?.ok === true && writes() === w0 + 2, s3);
w0 = writes();
await call("apiSet", ["intakes", "i3", JSON.stringify({ plate: "33가3333", createdAt: new Date().toISOString() })], A, "SHA1");
check("rid 없는 예전 화면은 예전처럼(늘 처리)", writes() === w0 + 1);
w0 = writes();
await call("apiSet", ["intakes", "i4", JSON.stringify({ plate: "44가4444", createdAt: new Date().toISOString() })], A, "SHA1", "BAD-rid");
check("모양이 틀린 rid 는 무시(예전처럼 처리)", writes() === w0 + 1);

console.log("② 연속 클릭(동시에 같은 rid 3번)");
sent.length = 0;
const R3 = "s".repeat(24);
const msg = JSON.stringify({ to: "01033334444", from: "x", kind: "SMS", text: "시험 문자", type: "시험" });
const three = await Promise.all([1, 2, 3].map(() => call("sendMsg", [msg], A, "SHA1", R3)));
check("문자는 한 통만 나감", sent.length === 1, sent.length);
check("나머지는 «처리 중이에요» 또는 같은 답", three.filter((x) => x.result).length >= 1 && three.every((x) => x.result || /처리 중이에요/.test(x.__err || "")), three);
const again = await call("sendMsg", [msg], A, "SHA1", R3);
check("끝난 뒤 같은 rid → 다시 안 보냄 · 처음 답", sent.length === 1 && !!again.result, again);

console.log("③ 실패하면 다시 하기 가능");
const R4 = "t".repeat(24);
const f1 = await call("shopBiz", [{ bizNo: "1112233333" }], A, "SHA1", R4);   // 본사 번호 → 거절(실패)
const f2 = await call("shopBiz", [{ bizNo: "1112233333" }], A, "SHA1", R4);
check("실패는 저장되지 않음 → 같은 rid 로 다시 하면 다시 처리(같은 실패 · «처리 중» 아님)", !!f1.__err && !!f2.__err && !/처리 중/.test(f2.__err) && !store.cgg_idem.some((x: any) => x.rid === R4), [f1, f2]);

console.log("④ 열쇠에 업체 + 사람 — 남의 답을 못 받음");
w0 = writes();
const o1 = await call("apiSet", ["intakes", "b1", JSON.stringify({ plate: "55가5555", createdAt: new Date().toISOString() })], B, "SHB1", R1);
check("B 가 A 와 같은 rid → B 것으로 새로 처리(A 답이 오지 않음)", o1.result?.ok === true && writes() === w0 + 1, o1);
w0 = writes();
await call("apiSet", ["intakes", "i5", JSON.stringify({ plate: "66가6666", createdAt: new Date().toISOString() })], A2, "SHA1", R1);
check("같은 업체 다른 사람(매니저)이 같은 rid → 따로 처리", writes() === w0 + 1);
check("기록 열쇠: 제품 · 업체 · 사람 · 기능 · rid", store.cgg_idem.every((x: any) => x.product === "wash" && x.tenant && x.who && x.fn && /^[a-z0-9]{24}$/.test(x.rid)), store.cgg_idem);
store.cgg_idem.find((x: any) => x.tenant === "SHA1" && x.who === "01000000001" && x.rid === R1).at = new Date(Date.now() - 25 * 3600e3).toISOString();
w0 = writes();
await call("apiSet", ["intakes", "i1", JSON.stringify({ plate: "11가1111" })], A, "SHA1", R1);
check("하루 지난 rid 는 새 요청으로", writes() === w0 + 1);

console.log("④-2 (보안 방 중간) 비밀번호가 든 답은 저장 안 함 · 끊겨 남은 «처리 중»");
const RP = "p".repeat(24);
const p1 = await call("userPw", ["01000000009"], A, "SHA1", RP);
const p2 = await call("userPw", ["01000000009"], A, "SHA1", RP);
check("비밀번호 초기화는 rid 목록 밖 → 표에 줄이 안 생김(임시 비밀번호가 안 남음)", typeof p1.result?.pw === "string" && !store.cgg_idem.some((x: any) => x.fn === "userPw") &&
  !JSON.stringify(store.cgg_idem).includes(String(p1.result?.pw)), store.cgg_idem.map((x: any) => x.fn));
check("그래서 같은 rid 라도 매번 새로 처리(새 임시 비밀번호)", typeof p2.result?.pw === "string" && p2.result.pw !== p1.result.pw);
check("저장된 답 어디에도 비밀값 이름 칸(pw·key·token·secret·sid)이 없음", !store.cgg_idem.some((x: any) => /"[^"]*(pw|pass|secret|token|key|sid|otp)[^"]*":/i.test(JSON.stringify(x.result ?? null))), store.cgg_idem.map((x: any) => x.result));
const RS = "u".repeat(24);
store.cgg_idem.push({ product: "wash", tenant: "SHA1", who: "01000000001", fn: "apiSet", rid: RS, state: "run", at: new Date(Date.now() - 6 * 60000).toISOString() });
w0 = writes();
const st = await call("apiSet", ["intakes", "i9", JSON.stringify({ plate: "99가9999", createdAt: new Date().toISOString() })], A, "SHA1", RS);
check("6분 넘게 남은 «처리 중» 줄은 낡은 것으로 보고 다시 처리", st.result?.ok === true && writes() === w0 + 1, st);
store.cgg_idem.push({ product: "wash", tenant: "SHA1", who: "01000000001", fn: "apiSet", rid: "v".repeat(24), state: "run", at: new Date(Date.now() - 60000).toISOString() });
const st2 = await call("apiSet", ["intakes", "i9", "{}"], A, "SHA1", "v".repeat(24));
check("1분 된 «처리 중»은 그대로 «처리 중이에요»", /처리 중이에요/.test(st2.__err || ""), st2);

console.log("⑤ 발송 기록(wash_sendlog) — 번호 가림 · 글은 길이만");
const lg = store.wash_sendlog[store.wash_sendlog.length - 1] || {};
check("받는 번호 가림", lg.to_num === "010-****-4444", lg);
check("글 내용 대신 길이(바이트)", /^len:\d+$/.test(String(lg.body)) && !JSON.stringify(store.wash_sendlog).includes("시험 문자"), lg);

console.log("⑥ 관리 사업자번호 — 10자리 · 확인 다시");
let r = await call("hqShopSave", ["SHA1", { bizNo: "123-45" }], ADM, "ADMIN");
check("10자리가 아니면 거절", !!r.__err && /10자리/.test(r.__err), r);
r = await call("hqShopSave", ["SHA1", { bizNo: "555-66-77777" }], ADM, "ADMIN");
const sh = store.wash_shops.find((x: any) => x.shop === "SHA1");
check("숫자 10자리로 저장 · 확인 상태 초기화(다시 확인)", !r.__err && sh.biz_no === "5556677777" && sh.biz_ok_at === null && !!sh.biz_set_at, [r, sh]);
check("판 sb28", JSON.stringify(await call("apiVer", [], A, "SHA1")).includes("sb28"));

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail || pass === 0) Deno.exit(1);
