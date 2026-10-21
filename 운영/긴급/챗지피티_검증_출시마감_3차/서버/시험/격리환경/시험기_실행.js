// 보안 방 시험기(AB_시험_업체격리.js)를 격리 시험 환경(127.0.0.1 가짜 서버 셋)에 돌리는 실행기 — 시험기 파일은 고치지 않음.
// 쓰는 법: bash 서버/시험/격리환경/실행.sh   (이 파일은 실행.sh 가 부름)
"use strict";
const path = require("path");
/* 시험기 찾기: AB_FILE → 묶음 안(보안/ · 운영/긴급/…/보안/) → 저장소 경로 — 맨 먼저 있는 것 */
const fs = require("fs");
const AB_CAND = [process.env.AB_FILE,
  path.join(__dirname, "../../../보안/AB_시험_업체격리_기록교차.js"),   // 묶음 안(총괄이 옮긴 이름)
  path.join(__dirname, "../../../보안/AB_시험_업체격리.js"),
  path.join(__dirname, "../../../운영/긴급/챗지피티_검증_기록_알림톡/보안/AB_시험_업체격리.js"),
  path.join(__dirname, "../../../운영/긴급/챗지피티_검증_출시마감_3차/보안/AB_시험_업체격리.js")].filter(Boolean);
const AB_PATH = AB_CAND.find((p) => fs.existsSync(p));
if (!AB_PATH) { console.error("보안 방 시험기(AB_시험_업체격리.js)를 찾지 못함 — AB_FILE 로 알려 주세요:\n  " + AB_CAND.join("\n  ")); process.exit(2); }
console.log("시험기: " + path.relative(process.cwd(), AB_PATH));
const H = require(AB_PATH);
const PORT = { "wash-api": 54411, "check-api": 54412, "dealer-api": 54413 };
const V = {
  WA_SHOP: "TSTA", WB_SHOP: "TSTB", WA_REC: "recA1", WA_PHOTO: "sb/TSTA/202610/a1.jpg", WA_BIZ: "1234567890",
  WA_TOKEN: "wa".repeat(24), WB_TOKEN: "wb".repeat(24),
  CA_OFFICE: "TESTA", CB_OFFICE: "TESTB", CA_TOKEN: "chk_" + "ca".repeat(22), CB_TOKEN: "chk_" + "cb".repeat(22),
  CA_INVOICE: "invA1", CA_YM: "2026-10", CA_DELIV_PHOTO: "phA1", CA_CAR: "carA1",
  DA_TOKEN: "da".repeat(24), DB_TOKEN: "db".repeat(24),
};
let calls = 0;
const local = async (url, opt) => {            // "mock:/wash-api" → 127.0.0.1:포트 (밖으로 안 나감)
  const name = String(url).replace(/^mock:\//, "");
  if (!PORT[name]) throw new Error("모르는 서버 " + name);
  calls++;
  return fetch("http://127.0.0.1:" + PORT[name] + "/", opt);
};
(async () => {
  /* 딜러 A·B 약관 동의(시험 준비) — 시험기 밖에서 미리 */
  for (const t of [V.DA_TOKEN, V.DB_TOKEN])
    await local("mock:/dealer-api", { method: "POST", body: JSON.stringify({ token: t, fn: "agree", args: [{ terms: true, privacy: true, age: true }] }) });
  if (process.env.NEW_BIZ_MSG) H.MSG.wBizTaken = process.env.NEW_BIZ_MSG;   // sb28 에서 바뀐 거절 글(보안 방 시험기 고침 전까지)
  const E = Object.assign({ AB_OK: "시험업체만", API: "mock:" }, V);
  const code = await H.run(E, local, (s) => console.log(s));
  console.log("(격리 환경 요청 " + calls + "건 · 모두 127.0.0.1)");
  process.exit(code);
})();
