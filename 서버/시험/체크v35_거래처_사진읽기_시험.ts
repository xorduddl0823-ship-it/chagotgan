// 체크 서버 v35 시험 — 요청서 C: 명함·사업자등록증 사진 읽기 aiCard·aiBiz (대표만 · 하루 한도 · 칸 거르기 · 오류 글)
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/체크v35_거래처_사진읽기_시험.ts
import { store } from "./fake_supabase_check.ts";

Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("ANTHROPIC_KEY", "k"); Deno.env.set("ANTHROPIC_MODEL", "claude-haiku-5.5");
Deno.env.set("CHECK_AI_DOC_DAY", "3");
const SRC = Deno.env.get("CHECK_SRC") ?? "../2_차곳간체크_서버_check-api_v35.ts";
const day = new Date(Date.now() + 86400000).toISOString();
Object.assign(store, {
  check_office: [{ id: "o1", code: "TEST", name: "시험검사소" }],
  check_user: [{ id: "u1", office_id: "o1", phone: "01011110000", name: "대표", role: "owner", active: true, pw_hash: "x" },
               { id: "u2", office_id: "o1", phone: "01022220000", name: "직원", role: "staff", active: true, pw_hash: "x" }],
  check_session: [{ sid: "chk_own", phone: "01011110000", office_id: "o1", role: "owner", expires_at: day },
                  { sid: "chk_stf", phone: "01022220000", office_id: "o1", role: "staff", expires_at: day }],
  check_log: [], cgg_access: [], wash_sessions: [], check_rate: [], check_usage: [],
});
let answer = "";
let status = 200;
const asked: any[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  if (String(url).includes("anthropic")) {
    const b = JSON.parse(String(init?.body)); asked.push(b);
    if (status !== 200) return new Response(JSON.stringify({ error: { message: "invalid x-api-key" } }), { status });
    return Response.json({ content: [{ text: answer }], usage: { input_tokens: 1, output_tokens: 1 } });
  }
  return Response.json({});
}) as typeof fetch;
console.error = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(SRC);
const call = async (fn: string, args: unknown[] = [], token = "chk_own") =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop: "", token, fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const JPG = "/9j/" + "A".repeat(400), PNG = "data:image/png;base64,iVBOR" + "A".repeat(400);

answer = JSON.stringify({ name: "홍길동", phone: "010 1234 5678", company: "가나상사", bizName: "가나모터스", bizNo: "1234567890",
  email: "a@b.kr", addr: "서울", evil: "<script>", extra: "x" });
let r = await call("aiCard", [JPG]);
let v: any = {}; try { v = JSON.parse(r.result); } catch (_) { /* */ }
check("명함: 칸이 채워져 JSON 글자로 돌아옴", v.name === "홍길동" && v.company === "가나상사", r);
check("휴대폰·사업자번호는 모양을 맞춰 줌", v.phone === "010-1234-5678" && v.bizNo === "123-45-67890", v);
check("정해진 칸만 돌려줌 (evil·extra 없음)", !("evil" in v) && !("extra" in v) && Object.keys(v).length === 7, v);
check("모델 이름 점 → 하이픈", asked.at(-1)?.model === "claude-haiku-5-5", asked.at(-1)?.model);
check("jpeg 로 알림", asked.at(-1)?.messages?.[0]?.content?.[0]?.source?.media_type === "image/jpeg");
answer = JSON.stringify({ bizNo: "123-45-6789", bizName: "다라상사<b>", ceo: "김대표", addr: "부산", upte: "도소매", jongmok: "중고차" });
r = await call("aiBiz", [PNG]);
try { v = JSON.parse(r.result); } catch (_) { v = {}; }
check("사업자등록증: 칸이 채워짐 · png 로 알림", v.ceo === "김대표" && asked.at(-1)?.messages?.[0]?.content?.[0]?.source?.media_type === "image/png", [r, v]);
check("10자리가 아닌 사업자번호는 비움 · < > 는 지움", v.bizNo === "" && !/[<>]/.test(v.bizName), v);
check("직원은 거절", !!(await call("aiCard", [JPG], "chk_stf")).__err && !!(await call("aiBiz", [JPG], "chk_stf")).__err);
check("직원은 아무 글 창구(aiJson)로도 못 돌아감", !!(await call("aiJson", ["사업자등록증 읽어", JPG], "chk_stf")).__err);
check("빈 사진은 거절(요금 안 나감)", !!(await call("aiCard", [""])).__err);
check("너무 큰 사진은 거절", !!(await call("aiCard", ["A".repeat(6_000_001)])).__err);
check("aiJson 도 너무 큰 사진은 거절", !!(await call("aiJson", ["읽어", "A".repeat(6_000_001)])).__err);
const n0 = asked.length;
answer = "모르겠어요";
r = await call("aiCard", [JPG]);
check("한도 3번 안: 읽기 실패는 쉬운 글 (번호판 말 없음)", /사진을 읽지 못했습니다/.test(String(r.__err)) && !/번호판/.test(String(r.__err)), r);
r = await call("aiCard", [JPG]);
check("하루 한도(3)를 넘으면 거절 · 요금 안 나감", /한도/.test(String(r.__err)) && asked.length === n0 + 1, [r, asked.length - n0]);
store.check_rate = [];
status = 401;
r = await call("aiBiz", [JPG]);
check("설정 오류도 쉬운 글", /사진을 읽지 못했습니다/.test(String(r.__err)) && !/번호판|api|key/i.test(String(r.__err)), r);
check("기록이 남음(사진·결과 값은 안 남김)", store.check_log.some((l: any) => l.what === "명함 사진 읽기") && !JSON.stringify(store.check_log).includes("홍길동"), store.check_log);
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
