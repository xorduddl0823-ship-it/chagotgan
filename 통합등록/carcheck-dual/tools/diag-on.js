/*  전산 진단 켜기/끄기 (8차) — 설정 파일(%APPDATA%\carcheck-dual\config.json)의 diagnose 만 바꾼다. 다른 설정은 그대로.
 *  사용: node tools/diag-on.js        → 켜기
 *        node tools/diag-on.js off    → 끄기
 *  7_전산진단_켜기.bat / 8_전산진단_끄기.bat 이 이것을 부른다. 프로그램을 다시 켜야 반영된다. */
const fs = require('fs');
const path = require('path');
const dir = path.join(process.env.APPDATA || path.join(require('os').homedir(), '.config'), 'carcheck-dual');
const file = path.join(dir, 'config.json');
const on = process.argv[2] !== 'off';
let cfg = { vinTail: 6, autoSubmit: false };
try { cfg = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
cfg.diagnose = on;
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(file, JSON.stringify(cfg, null, 2));
console.log(on ? '전산 진단을 켰어요. 프로그램을 다시 켜면 아래쪽에 [전산 진단 (저장 안 함)] 단추가 보여요.'
              : '전산 진단을 껐어요. 프로그램을 다시 켜면 단추가 사라져요.');
