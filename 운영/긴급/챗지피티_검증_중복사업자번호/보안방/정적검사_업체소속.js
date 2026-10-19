// 보안 방 · 2026-10-19 · 업체 소속·권한 «서버 확인» 정적 검사 (읽기만 · 서버를 부르지 않음)
// 쓰는 법: node 보안/검사기록/중복사업자번호_10-19/정적검사_업체소속.js [워시 서버 파일] [체크 서버 파일] [딜러 서버 파일]
//   (안 주면 지금 최신판: wash-api sb27 · check-api v52 · dealer-api d9)
// 결과: 항목마다 통과/실패 + 근거 줄. 실패가 하나라도 있으면 끝 코드 1.
// ⚠ 한계(1차 검수 B06): 이 검사는 «글자 · 정규식» 검사예요. 실행 경로를 증명하지 않아요(예: hqOnly 글자가 있어도 맨 먼저 실행되는지는 사람이 봄).
//   함수가 기대보다 적게 잡히면(형식이 바뀌면) 통과가 아니라 실패로 쳐요. 실제 막힘은 A/B 시험(실행)으로 따로 확인해요.
//   DB 직접 REST · RLS · 보관함 공개 여부 · 운영 비밀값은 이 검사로 못 봐요(읽기 전용 SQL · 서버 방 확인 몫).
"use strict";
const fs = require("fs"), path = require("path");
let ROOT = __dirname; while (!fs.existsSync(path.join(ROOT, "CLAUDE.md")) && path.dirname(ROOT) !== ROOT) ROOT = path.dirname(ROOT);   // 저장소 맨 위
const W = process.argv[2] || path.join(ROOT, "서버/1_차곳간워시_서버_wash-api_sb27.ts");
const C = process.argv[3] || path.join(ROOT, "서버/2_차곳간체크_서버_check-api_v52.ts");
const D = process.argv[4] || path.join(ROOT, "서버/3_딜러앱_서버_dealer-api_d9.ts");
const rd = (f) => fs.readFileSync(f, "utf8");
const w = rd(W), c = rd(C), d = rd(D);
const lineOf = (s, i) => s.slice(0, i).split("\n").length;
const res = [];
function check(id, what, ok, where) { res.push({ id, what, ok: !!ok, where }); }
function find(s, re) { const m = re.exec(s); return m ? lineOf(s, m.index) : 0; }

/* 함수 몸통 나누기: "  이름: async (" 로 시작하는 항목 */
function entries(s) {
  const L = s.split("\n"), out = [];
  L.forEach((l, i) => { const m = /^  ([A-Za-z0-9_]+): async \(([^)]*)\)/.exec(l); if (m) out.push({ i, name: m[1], params: m[2] }); });
  return out.map((e, k) => ({ ...e, line: e.i + 1, body: L.slice(e.i, k + 1 < out.length ? out[k + 1].i : L.length).join("\n") }));
}

/* ── 워시 ── */
check("W1", "워시: 요청의 업체 코드(shop)가 로그인 열쇠의 업체와 다르면 거절",
  /if \(ss\.shop !== shop\) throw/.test(w), "wash " + find(w, /if \(ss\.shop !== shop\) throw/));
check("W2", "워시: 예전 «업체 주소 열쇠»는 비밀값으로 꺼져 있을 때 막힘",
  /if \(!LEGACY_OK\(\)\) throw/.test(w), "wash " + find(w, /if \(!LEGACY_OK\(\)\) throw/));
const we = entries(w);
const hq = we.filter((e) => /^hq/.test(e.name) && /^shop, *_?a, *ss$/.test(e.params.trim()));
const hqBad = hq.filter((e) => !/hqOnly\(shop, ss\)/.test(e.body));
check("W3", "워시: 본사 기능(hq*) " + hq.length + "개 모두 hqOnly(본사 세션만) · 80개 넘게 잡혀야 함", hq.length >= 80 && hqBad.length === 0,
  hq.length < 80 ? "함수가 " + hq.length + "개만 잡힘(형식 바뀜?)" : hqBad.length ? "빠짐: " + hqBad.map((e) => e.name + "@" + e.line).join(", ") : "모두 있음");
check("W3b", "워시: 함수 항목이 150개 넘게 잡힘(나누기 형식 확인 · 지금 160)", we.length >= 150, "잡힌 수 " + we.length);
/* 다른 업체 코드를 인자로 받아 쓰는 본사 밖 기능 */
const other = we.filter((e) => !/^hq/.test(e.name) && /^(s2?|shop), *_?a, *_?ss$/.test(e.params.trim()) &&
  /\.eq\("shop", *(code|a\[\d\]|String\(a\[)/.test(e.body));
check("W4", "워시: 본사 밖 기능이 인자로 받은 다른 업체 코드로 읽거나 쓰지 않음", other.length === 0,
  other.length ? other.map((e) => e.name + "@" + e.line).join(", ") : "없음");
check("W5", "워시: 사진 서명 주소는 그 업체 폴더(shop/…)만",
  /if \(shop && shop !== "ADMIN" && !p\.startsWith\(shop \+ "\/"\)\) continue/.test(w), "wash " + find(w, /!p\.startsWith\(shop \+ "\/"\)\) continue/));
check("W6", "워시: 파일 내려받기(driveB64 · driveText)도 그 업체 폴더만",
  /!path\.startsWith\(shop \+ "\/"\)\)\s*\n?\s*throw/.test(w), "wash " + find(w, /!path\.startsWith\(shop \+ "\/"\)\)/));
check("W7", "워시: 보기 주소(viewCar · viewAnswer)는 24자리 무작위 코드 · 그 코드의 업체 자료만",
  /code\.length !== 24\) return gone/.test(w) && /\.eq\("shop", vc\.shop\)/.test(w), "wash " + find(w, /viewCar: async/));
check("W8", "워시: 가입(signup)은 늘 새 업체를 만들고 사업자번호를 받지 않음(기존 업체에 붙지 않음)",
  /const shop = await newShopCode\(\);/.test(w) && /bizNo: ""/.test(w), "wash " + find(w, /signup: async/));
check("W9", "워시: 직원 추가는 대표만 · 다른 업체에 있는 번호는 거절 · 본인 문자 확인",
  /"다른 업체에 이미 쓰고 있는 번호입니다"/.test(w) && /await needVerified\(phone\);\s+\/\/ ← 본인 번호 확인/.test(w), "wash " + find(w, /userAdd: async/));
check("W10", "워시: 업체가 사업자번호를 넣을 때 «처음 한 번 · 10자리 · 다른 곳이 쓰면 거절»",
  /if \(await bizTaken\(nb, s\)\) throw new Error\(BIZ_TAKEN_MSG\)/.test(w), "wash " + find(w, /if \(await bizTaken\(nb, s\)\)/));
const hqSave = we.find((e) => e.name === "hqShopSave");
check("W11", "워시: 본사가 업체 사업자번호를 고칠 때(hqShopSave)도 «다른 곳이 쓰면 거절»",
  hqSave && /bizTaken\(/.test(hqSave.body), hqSave ? "wash " + hqSave.line + (/bizTaken\(/.test(hqSave.body) ? "" : " — bizTaken 없음 · 10자리 확인 없음") : "함수 없음");

/* ── 체크 ── */
check("C1", "체크: 로그인한 사람이 그 검사소 소속(check_user · active)인지 서버가 확인",
  /\.eq\("office_id", office\.id\)\.eq\("phone", phone\)\.maybeSingle\(\);\s*\n\s*if \(!me \|\| me\.active === false\) throw/.test(c), "check " + find(c, /이 검사소에 들어갈 권한이 없습니다/));
/* 자료 표 읽기·쓰기에 office_id 가 빠진 줄 (앞에서 이미 그 검사소 것으로 확인한 id 는 사람 눈으로 봄 — 아래 «확인한 예외») */
const T = ["check_car", "check_dealer", "check_company", "check_invoice", "check_invoice_row", "check_deposit", "check_ins", "check_deliv", "check_remind_view", "check_bank"];
const stm = c.split(/;\s*\n/); let pos = 0; const miss = [];
for (const st of stm) {
  const at = c.indexOf(st, pos); pos = at + st.length;
  const t = (/db\.from\("([a-z_]+)"\)/.exec(st) || [])[1];
  if (!t || T.indexOf(t) < 0) continue;
  if (!/\.(select|update|delete|upsert)\(/.test(st) || /\.insert\(/.test(st)) continue;   // 새 줄 넣기는 몸통에 office_id 를 담음(사람이 확인)
  if (/\.in\("id", *(del|locked\.map)/.test(st)) continue;   // 바로 앞에서 office_id 로 고른 목록(사람이 확인 · invoiceBuild)
  if (/office_id|view_key|invoice_id|deliv_id/.test(st)) continue;
  const id = (/\.eq\("id", *([^)]+)\)/.exec(st) || [])[1] || "";
  miss.push(lineOf(c, at) + ":" + t + "(" + id.trim() + ")");
}
const OK_IDS = /^(inv\.id|hit\.id|v\.id|c\.id|r\.id|saved\.id|a\.id|id)$/;   // 바로 앞에서 office_id 로 읽어 온 줄의 id (사람이 확인)
const realMiss = miss.filter((m) => !OK_IDS.test(m.split("(")[1].replace(")", "")));
const scanned = stm.filter((st) => { const t = (/db\.from\("([a-z_]+)"\)/.exec(st) || [])[1]; return t && T.indexOf(t) >= 0; }).length;
check("C2a", "체크: 자료 표 읽기·쓰기 문장이 180개 넘게 잡힘(지금 201)", scanned >= 180, "잡힌 수 " + scanned);
check("C2", "체크: 업체 자료 표(차·딜러·거래처·청구서·입금·보험·배달)를 office_id 없이 고르지 않음 (앞서 확인한 id 제외 " + (miss.length - realMiss.length) + "줄)",
  realMiss.length === 0, realMiss.length ? realMiss.join(", ") : "없음");
check("C3", "체크: 배달 사진은 그 검사소 배달 건일 때만 서명 주소",
  /\.eq\("office_id", w\.office\.id\)\.eq\("id", S\(p\.deliv_id\)\)/.test(c), "check " + find(c, /\.eq\("office_id", w\.office\.id\)\.eq\("id", S\(p\.deliv_id\)\)/));
check("C4", "체크: 검사소 사업자번호는 «처음 한 번 · 10자리 · 다른 곳이 쓰면 거절»",
  /if \(await bizTaken\(nb, S\(cur\.id\)\)\) throw new Error\(BIZ_TAKEN_MSG\)/.test(c), "check " + find(c, /if \(await bizTaken\(nb, S\(cur\.id\)\)\)/));
check("C5", "체크: 기사 «회사 비밀번호»가 사업자번호와 겹칠 때 여러 검사소면 거절(골라 잡지 않음)",
  !/off = \(all \?\? \[\]\)\.find\(/.test(c), "check " + find(c, /off = \(all \?\? \[\]\)\.find\(/) + " — 같은 번호가 둘이면 첫 곳으로 감(가입은 사무실 승인 뒤라 자료 열람은 없음)");

/* ── 딜러 ── */
check("D1", "딜러: 차 상세·완료는 «내 번호로 들어온 차»에서만 찾음",
  /const me = rows\.find\(\(r\) => String\(r\.shop\) === shop && String\(r\.id\) === id\);/.test(d) && /if \(!rows\.some\(\(r\) => r\.shop \+ ":" \+ r\.id === key\)\)/.test(d),
  "dealer " + find(d, /car: async/) + " · " + find(d, /finish: async/));
check("D2", "딜러: 청구서 모아 보기는 받은 번호(to_phones)에 내 번호가 있는 것만",
  /\.contains\("to_phones", \[ss\.phone\]\)/.test(d), "dealer " + find(d, /\.contains\("to_phones", \[ss\.phone\]\)/));

/* ── 2차 더함: 경비실 · 보기 링크 · 업로드 · 중복 등록 길 · 시험기 거절 글 ── */
const gfile = path.join(ROOT, "서버/0_차곳간_경비실_cgg-api_v1.ts"); const g = rd(gfile);
const gFn = (/const FN[^{]*\{([\s\S]*?)\n\};/.exec(g) || [])[1] || "";
const gNames = (gFn.match(/^\s+([A-Za-z0-9_]+):/gm) || []).map((x) => x.trim().replace(":", ""));
check("G1", "경비실: 창구가 로그인 4개뿐(cggLogin · cggLogin2 · cggMe · cggLogout) — 업체 자료 창구 없음",
  gNames.length === 4 && ["cggLogin", "cggLogin2", "cggMe", "cggLogout"].every((n) => gNames.indexOf(n) >= 0), "cgg-api 창구 " + gNames.join(","));
check("G2", "경비실: 체크 열쇠는 그 번호가 소속된(check_user · active) 검사소로만 만듦",
  /\.from\("check_user"\)[\s\S]{0,160}\.eq\("phone", phone\)\.eq\("active", true\)/.test(g), "cgg-api " + find(g, /async function checkUsers/));
check("V1", "보기 링크 r(체크 청구서): 18자리 무작위 · IP 하루 상한", /function viewKey\(\)[\s\S]{0,120}getRandomValues\(new Uint8Array\(12\)\)/.test(c) && /async function invoiceView[\s\S]{0,120}viewIpOk/.test(c), "check " + find(c, /async function invoiceView/));
check("V2", "보기 링크 d(배달): 보기 열쇠로만 · 그 배달 사진만", /async function deliv_view[\s\S]{0,400}\.eq\("view_key", k\)/.test(c) && /\.eq\("deliv_id", r\.id\)\.order\("ord"\)/.test(c), "check " + find(c, /async function deliv_view/));
check("U1", "워시 사진 올리기: 경로가 «로그인한 업체 코드/…» 로만", /const path = `\$\{shop\}\/\$\{ym\}\/wash_/.test(w) && /upsert: false/.test(w), "wash " + find(w, /async function upload\(/));
check("U2", "체크 배달 사진 올리기: 그 검사소 배달 건에만", /async function deliv_photo|\.insert\(\{ deliv_id: delivId/.test(c), "check " + find(c, /\.insert\(\{ deliv_id: delivId/) + " (넣는 쪽 배달 건은 office_id 로 만든 것 — 사람이 확인)");
/* 중복 등록 길: 넣는 곳마다 bizTaken */
const cOfficeImport = /if \(S\(o\.사업자등록번호\) && !S\(ctx\.office\?\.biz_no\)\) \{[\s\S]{0,200}bizTaken\(/.test(c);
check("R1", "중복 등록: 체크 엑셀 «검사소 정보» 넣기도 겹침 거절", cOfficeImport, "check " + find(c, /if \(S\(o\.사업자등록번호\) && !S\(ctx\.office\?\.biz_no\)\)/));
check("R2", "중복 등록: 본사 «사업자번호 확인»(hqBizOk)은 겹치면 거절", /hqBizOk: async[\s\S]{0,900}BIZ_TAKEN_MSG/.test(w), "wash " + find(w, /hqBizOk: async/));
check("R3", "중복 등록: 같은 번호 금지를 DB 가 막음(유일 색인 SQL 이 저장소에 있음 · 운영 적용은 SQL ⑧로 확인)",
  /create unique index if not exists wash_shops_biz_uq/.test(rd(path.join(ROOT, "서버/sql/급한고침_사업자번호_잠금.sql"))), "서버/sql/급한고침_사업자번호_잠금.sql — 워시 · 체크 «따로» 색인뿐(두 제품 사이 경쟁은 못 막음)");
/* A/B 시험기의 거절 글이 서버에 그대로 있는지 */
try { const ab = require(path.join(__dirname, "AB_시험_업체격리.js")); const src = { w, c, d };
  const lost = Object.entries(ab.MSG).filter(([k, v]) => src[k[0]].indexOf(v) < 0).map(([k]) => k);
  check("T1", "A/B 시험기 거절 글 " + Object.keys(ab.MSG).length + "개가 서버 원본에 그대로 있음", lost.length === 0, lost.length ? "없음: " + lost.join(",") : "모두 있음"); }
catch (e) { check("T1", "A/B 시험기 거절 글 확인", false, "시험기를 못 읽음"); }

let bad = 0;
for (const r of res) { if (!r.ok) bad++; console.log((r.ok ? "통과" : "실패") + "  " + r.id + "  " + r.what + "  — " + r.where); }
console.log("\n모두 " + res.length + "개 · 통과 " + (res.length - bad) + " · 실패 " + bad);
process.exit(bad ? 1 : 0);
