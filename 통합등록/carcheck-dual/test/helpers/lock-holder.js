/*  시험용: 기록 파일 잠금을 «진짜 모양»으로 잡고 (1) 오래 쥐고 있거나 (2) 쥔 채 강제 종료한다.
 *  사용: node lock-holder.js <기록파일> hold <밀리초>   → 잠금을 잡고 «held» 출력 뒤 그 시간 동안 살아 있다가 잠금을 둔 채 끝남
 *        node lock-holder.js <기록파일> crash            → 잠금을 잡고 «held» 출력 뒤 SIGKILL */
const fs = require('fs');
const os = require('os');
const [file, mode, ms] = process.argv.slice(2);
fs.writeFileSync(file + '.lock', JSON.stringify({ host: os.hostname(), pc: 'TEST', pid: process.pid, token: 'holder' + process.pid, at: new Date().toISOString() }), { flag: 'wx' });
process.stdout.write('held\n', () => {
  if (mode === 'crash') process.kill(process.pid, 'SIGKILL');
  else setTimeout(() => process.exit(0), Number(ms) || 1000);
});
