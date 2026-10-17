// 체크 v37 · 워시 sb18 시험 — 사진 읽기 긴 글(10/18 법인 사업자등록증): 답 길이 넉넉히 · { … } 만 잘라 읽기 · 읽는 글 추가
// 실행:  deno run -A --no-lock --import-map=서버/시험/import_map_check.json 서버/시험/사진읽기_긴글_v37_sb18_시험.ts
// (워시 쪽은 WHICH=wash 로: deno run -A --no-lock --import-map=서버/시험/import_map_wash.json … )
const WHICH = Deno.env.get("WHICH") ?? "check";
const mod = WHICH === "wash" ? await import("./fake_supabase_wash.ts") : await import("./fake_supabase_check.ts");
const store: any = (mod as any).store;
Deno.env.set("SUPABASE_URL", "http://fake.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fake");
Deno.env.set("ANTHROPIC_KEY", "k");
const day = new Date(Date.now() + 86400000).toISOString();
if (WHICH === "wash") {
  Object.assign(store, { wash_hq: [{ id: 1 }], wash_shops: [{ shop: "BT", name: "브라더세차", active: true, plan: "pro", paid_until: day.slice(0, 10) }],
    wash_sessions: [{ sid: "c".repeat(48), phone: "01077778888", shop: "BT", role: "owner", expires_at: day }], wash_users: [], wash_docs: [], cgg_access: [] });
} else {
  Object.assign(store, {
    check_office: [{ id: "o1", code: "TEST", name: "시험검사소" }],
    check_user: [{ id: "u1", office_id: "o1", phone: "01011110000", name: "대표", role: "owner", active: true, pw_hash: "x" }],
    check_session: [{ sid: "chk_own", phone: "01011110000", office_id: "o1", role: "owner", expires_at: day }],
    check_log: [], cgg_access: [], wash_sessions: [], check_rate: [], check_usage: [],
  });
}
const LONG = { bizNo: "123-81-45678", bizName: "주식회사 가나다라모터스", ceo: "김대표",
  addr: "경기도 수원시 권선구 산업로 123번길 45, 2층 201호 (고색동, 가나다라오토플렉스)", upte: "도매 및 소매업", jongmok: "중고자동차 판매업" };
let answer = "";
const asked: any[] = [];
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  if (String(url).includes("anthropic")) {
    const b = JSON.parse(String(init?.body)); asked.push(b);
    return Response.json({ content: [{ text: answer }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } });
  }
  return Response.json({});
}) as typeof fetch;
console.error = () => {};
const H: any[] = [];
(Deno as any).serve = (h: any) => { H.push(h); return {}; };
await import(Deno.env.get("SRC") ?? (WHICH === "wash" ? "../1_차곳간워시_서버_wash-api_sb18.ts" : "../2_차곳간체크_서버_check-api_v37.ts"));
const tok = WHICH === "wash" ? "c".repeat(48) : "chk_own", shop = WHICH === "wash" ? "BT" : "";
const call = async (fn: string, args: unknown[]) =>
  await (await H[0](new Request("http://x", { method: "POST", body: JSON.stringify({ shop, token: tok, fn, args }) }))).json();
let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra: unknown = "") {
  if (cond) { pass++; console.log("  ✅ " + name); } else { fail++; console.log("  ❌ " + name, extra); }
}
const JPG = "/9j/" + "A".repeat(400);
answer = "사진을 읽은 결과입니다.\n```json\n" + JSON.stringify(LONG) + "\n```\n확인해 주세요.";
if (WHICH === "wash") {
  const r = await call("aiJson", ["사업자등록증을 읽어 JSON 으로", JPG]);
  let v: any = {}; try { v = JSON.parse(r.result); } catch (_) { /* */ }
  check("워시: 앞뒤에 말이 붙어도 { … } 만 잘라 읽음", v.bizName === LONG.bizName, r);
  check("워시: 답 길이 1500", asked.at(-1)?.max_tokens === 1500, asked.at(-1)?.max_tokens);
} else {
  let r = await call("aiBiz", [JPG]);
  let v: any = {}; try { v = JSON.parse(r.result); } catch (_) { /* */ }
  check("체크: 긴 주소·앞뒤 말이 있어도 읽음", v.bizName === LONG.bizName && v.addr === LONG.addr && v.bizNo === "123-81-45678", r);
  check("체크: 사진 읽기 답 길이 1500", asked.at(-1)?.max_tokens === 1500, asked.at(-1)?.max_tokens);
  const p = String(asked.at(-1)?.messages?.[0]?.content?.[1]?.text ?? "");
  check("체크: 읽는 글에 «업태·종목 첫 줄만 · 주소 한 줄»", /첫 줄만/.test(p) && /한 줄로/.test(p), p);
  answer = '{"plate":"12가3456","sure":true}';
  r = await call("aiPlate", [JPG]);
  check("체크: 번호판은 답 길이 500 그대로", asked.at(-1)?.max_tokens === 500 && /12가3456/.test(String(r.result)), [asked.at(-1)?.max_tokens, r]);
}
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail) Deno.exit(1);
