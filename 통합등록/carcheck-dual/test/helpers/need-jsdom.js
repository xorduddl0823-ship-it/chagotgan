/*  화면 흉내(jsdom)가 필요한 시험이 쓰는 도우미 — 없으면 «어떻게 설치하는지»를 분명히 알리고 그 시험을 실패시킨다(조용히 건너뛰지 않음).
 *  설치: 프로그램 폴더에서 `npm test` (시험 전에 test 폴더에 jsdom 을 자동 설치 — package.json pretest)
 *        또는 `npm --prefix test install` 뒤 `node --test "test/*.test.js"` */
module.exports = function needJsdom() {
  try { return require('../node_modules/jsdom'); } catch {}
  try { return require('jsdom'); } catch {}
  throw new Error('jsdom 이 설치되지 않았습니다 — 프로그램 폴더에서 `npm test` 로 실행하면 자동으로 설치됩니다(또는 `npm --prefix test install`).');
};
