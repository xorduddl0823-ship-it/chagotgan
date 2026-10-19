/*  기록 폴더 위치(10차) — 프로그램과 같은 규칙: 프로그램 폴더에 test-install.json 이 있으면 시험판 폴더, 없으면 업무용 폴더.
 *  도구(diag-on · backup-data · diag-check)가 함께 쓴다. */
const fs = require('fs');
const path = require('path');
function testInstall() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'test-install.json'), 'utf8')); } catch { return null; }
}
function appData() { return process.env.APPDATA || path.join(require('os').homedir(), '.config'); }
function dataDir() {
  const t = testInstall();
  const name = t && /^[\w가-힣.\-]{3,60}$/.test(String(t.dataFolder || '')) && t.dataFolder !== 'carcheck-dual' ? t.dataFolder : 'carcheck-dual';
  return path.join(appData(), name);
}
module.exports = { dataDir, testInstall, appData };
