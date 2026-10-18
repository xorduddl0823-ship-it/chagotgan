/*  상용화 고려 구조 시험 — «업무 관리»(src/core)는 전산 연결 모듈 없이도 동작해야 한다
 *  (상용 배포본에서 내부 자동화 모듈을 통째로 뺄 수 있는지) */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const CORE = path.join(__dirname, '..', 'src', 'core');
const SITE_WORDS = /carinfo|carmodoo|카인포|카모두|엔트리|filler|scraper|photo-upload|auto-login|credentials|electron/i;

test('src/core 는 node 기본 부품과 src/core 끼리만 불러온다 (전산·Electron 모듈을 부르지 않음)', () => {
  fs.readdirSync(CORE).filter((n) => n.endsWith('.js')).forEach((n) => {
    const text = fs.readFileSync(path.join(CORE, n), 'utf8');
    const reqs = [...text.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
    reqs.forEach((r) => {
      const ok = /^(fs|os|path|crypto|child_process)$/.test(r) || /^\.\/[a-z-]+$/.test(r);
      assert.ok(ok, n + ' 이(가) ' + r + ' 을(를) 불러옴');
      assert.ok(!SITE_WORDS.test(r), n + ' 이(가) 전산 모듈 ' + r + ' 을(를) 불러옴');
    });
  });
});

test('전산 연결 모듈 파일을 모두 숨겨도 src/core 는 불러와지고 동작한다', () => {
  const Module = require('module');
  const orig = Module._resolveFilename;
  Module._resolveFilename = function (req, parent, ...rest) {
    if (SITE_WORDS.test(req) && !/src[\\/]core/.test(req)) throw new Error('상용 판에는 없는 모듈: ' + req);
    return orig.call(this, req, parent, ...rest);
  };
  try {
    Object.keys(require.cache).filter((k) => /src[\\/]core/.test(k)).forEach((k) => delete require.cache[k]);
    ['job-log', 'number-check', 'safety', 'save-guard', 'admin-auth', 'privacy-scan'].forEach((m) => {
      const mod = require('../src/core/' + m);
      assert.ok(Object.keys(mod).length > 0, m);
    });
  } finally {
    Module._resolveFilename = orig;
  }
});
