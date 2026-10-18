/*  시험용: 같은 기록 파일에 작업을 여러 개 만든다 (동시 사용 시험).
 *  사용: node make-jobs.js <기록파일> <PC표시> <개수> → 만든 작업 ID 목록(JSON)을 출력 */
const { createJobLog } = require('../../src/core/job-log');
const [file, pc, n] = process.argv.slice(2);
const log = createJobLog(file, { pcId: pc, lockWaitMs: 20000 });
const ids = [];
for (let i = 0; i < Number(n); i++) {
  ids.push(log.newJob({ carNo: pc + '-' + process.pid + '-' + i, vin: 'TEST' }));
}
process.stdout.write(JSON.stringify(ids));
