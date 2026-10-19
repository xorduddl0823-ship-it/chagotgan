/*  시험판 묶음 만들기(10차 검수 보완) — 묶음 안에 시험판 표시·안내서·bat 이 들어가고, 기록·설정·로그인 정보는 안 들어가는지
 *  (묶음을 풀어 bat 명령·프로그램까지 실행하는 전체 검사는 tools/verify-test-bundle.js) */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { build, FOLDER, GUIDE } = require('../tools/build-test-bundle');
const { readZip, makeZip } = require('../tools/zip-lite');

test('ZIP 만들기·읽기 — 한글 이름 · UTF-8 표시 · 내용 그대로', () => {
  const z = readZip(makeZip([{ name: '가/나.txt', data: Buffer.from('다라마'.repeat(50)) }, { name: 'b.bin', data: Buffer.from([1, 2, 3]) }]));
  assert.deepStrictEqual(z.map((e) => [e.name, e.utf8Flag, e.data.length]), [['가/나.txt', true, 450], ['b.bin', true, 3]]);
  assert.strictEqual(z[0].data.toString('utf8'), '다라마'.repeat(50));
});

test('시험판 묶음 — test-install.json(dataFolder 정확) · 0_먼저읽기 · bat 0·7·8·9 · 파일 목록 있음, 기록·설정·로그인 정보·시험 폴더 없음', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-tb-'));
  const r = build(out, new Date('2026-10-19T09:00:00'));
  const items = readZip(fs.readFileSync(r.zip));
  const names = items.map((i) => i.name);
  const marker = JSON.parse(items.find((i) => i.name === FOLDER + '/test-install.json').data.toString('utf8'));
  assert.strictEqual(marker.dataFolder, FOLDER);
  for (const n of [GUIDE, FOLDER + '/' + GUIDE, FOLDER + '/시험판_파일목록.txt', FOLDER + '/main.js', FOLDER + '/0_업무용기록_백업.bat',
    FOLDER + '/7_전산진단_켜기.bat', FOLDER + '/8_전산진단_끄기.bat', FOLDER + '/9_진단파일_검사.bat', FOLDER + '/tools/diag-check.js']) assert.ok(names.includes(n), n);
  assert.ok(!names.some((n) => /node_modules|\/test\/|(config|credentials|admin)\.json$|\.jsonl$|diag-[^/]*\.json$|검수요청/.test(n)), names.join('\n'));
  assert.ok(names.every((n) => n === GUIDE || n.startsWith(FOLDER + '/')), '맨 위에는 안내서와 시험판 폴더만');
});
