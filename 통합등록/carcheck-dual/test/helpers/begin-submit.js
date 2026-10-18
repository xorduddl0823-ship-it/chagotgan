/*  시험용: 작업 하나의 carinfo 저장을 풀어 본다 (동시 경쟁 시험).
 *  사용: node begin-submit.js <기록파일> <작업ID> → {ok, reason} 출력 */
const { createJobLog } = require('../../src/core/job-log');
const [file, id] = process.argv.slice(2);
process.stdout.write(JSON.stringify(createJobLog(file, { lockWaitMs: 20000 }).beginSubmit(id, 'carinfo')));
