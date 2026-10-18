/*  시험용: 저장 단추를 풀어 준 직후 프로그램이 «갑자기 꺼지는» 상황을 흉내 낸다.
 *  사용: node crash-after-submit.js <기록파일> <차량번호> <차대번호>
 *  표준 출력으로 작업 ID 를 알린 뒤 스스로를 강제 종료(SIGKILL)한다 — 뒷정리 코드가 돌 틈이 없다. */
const { createJobLog } = require('../../src/core/job-log');

const [file, carNo, vin] = process.argv.slice(2);
const log = createJobLog(file);
const jobId = log.newJob({ carNo, vin });
log.mark(jobId, 'carinfo', 'filled');
const r = log.beginSubmit(jobId, 'carinfo');
process.stdout.write(JSON.stringify({ jobId, begin: r }) + '\n', () => {
  process.kill(process.pid, 'SIGKILL');
});
