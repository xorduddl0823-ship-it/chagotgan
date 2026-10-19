/*  전산 진단 켜기/끄기 (8차 · 10차: 시험판에서만) — 시험판 기록 폴더의 config.json 의 diagnose 만 바꾼다. 다른 설정은 그대로.
 *  사용: node tools/diag-on.js        → 켜기
 *        node tools/diag-on.js off    → 끄기
 *  7_전산진단_켜기.bat / 8_전산진단_끄기.bat 이 이것을 부른다. 프로그램을 다시 켜야 반영된다. */
const fs = require('fs');
const path = require('path');
const { dataDir, testInstall } = require('./data-dir');
const dir = dataDir();                                     // 시험판이면 시험판 기록 폴더(업무용은 건드리지 않음)
if (!testInstall()) {
  console.log('이 폴더는 시험판이 아니에요(test-install.json 없음). 업무용 프로그램에서는 진단을 켜지 않아요.');
  console.log('시험판 묶음을 따로 푼 폴더에서 다시 실행해 주세요.');
  process.exit(1);
}
const file = path.join(dir, 'config.json');
const on = process.argv[2] !== 'off';
let cfg = { vinTail: 6, autoSubmit: false };
try { cfg = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
cfg.diagnose = on;
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(file, JSON.stringify(cfg, null, 2));
console.log(on ? '전산 진단을 켰어요. 프로그램을 다시 켜면 아래쪽에 [전산 진단 (저장 안 함)] 단추가 보여요.'
              : '전산 진단을 껐어요. 프로그램을 다시 켜면 단추가 사라져요.');
