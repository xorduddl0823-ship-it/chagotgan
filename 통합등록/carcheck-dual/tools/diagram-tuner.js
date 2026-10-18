/**
 * 절개도 맞추기 — 작은 서버
 * ------------------------------------------------------------------
 * 부위 상자 하나하나의 자리·크기, 기둥의 선과 굴곡, 차체 밑그림의 위치·크기를
 * 브라우저에서 끌어 맞추고 [저장] 하면
 *   %APPDATA%\carcheck-dual\diagram.json
 * 에 담긴다. 이중등록 프로그램은 켤 때 이 파일을 읽어 그대로 그린다.
 *
 * 실행: 6_절개도_맞추기.bat  (또는 node tools\diagram-tuner.js)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const ROOT = path.join(__dirname, '..');
const APPDATA = process.env.APPDATA || path.join(process.env.USERPROFILE || '.', 'AppData', 'Roaming');
const DIR = path.join(APPDATA, 'carcheck-dual');
const SAVE = path.join(DIR, 'diagram.json');
const OLD_PILLAR = path.join(DIR, 'pillar.json');
const PORT = 8898;

const FILES = {
  '/': [path.join(__dirname, 'diagram-tuner.html'), 'text/html'],
  '/parts-diagram.js': [path.join(ROOT, 'renderer', 'parts-diagram.js'), 'application/javascript'],
  '/style.css': [path.join(ROOT, 'renderer', 'style.css'), 'text/css'],
};

function send(res, code, type, body) {
  res.writeHead(code, { 'content-type': type + '; charset=utf-8' });
  res.end(body);
}

const num = (v) => Math.round(Number(v) * 10) / 10;

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/alive') return send(res, 200, 'application/json', JSON.stringify({ ok: true }));

  if (url === '/load') {
    let saved = null, pillars = null;
    try { saved = JSON.parse(fs.readFileSync(SAVE, 'utf8')); } catch {}
    try { pillars = JSON.parse(fs.readFileSync(OLD_PILLAR, 'utf8')); } catch {}
    return send(res, 200, 'application/json', JSON.stringify({ saved, pillars, file: SAVE }));
  }

  if (url === '/save' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 400000) req.destroy(); });
    req.on('end', () => {
      let data;
      try { data = JSON.parse(body); } catch {
        return send(res, 400, 'application/json', JSON.stringify({ ok: false, error: '값을 읽지 못했습니다' }));
      }

      //  들어온 값이 숫자 배열인지 하나하나 확인하고 담는다
      const out = { regions: {}, views: {} };
      const R = (data && data.regions) || {};
      for (const id of Object.keys(R)) {
        const g = R[id];
        if (g && Array.isArray(g.box) && g.box.length === 4 && g.box.every(isFinite)) {
          out.regions[id] = { box: g.box.map(num) };
        } else if (g && Array.isArray(g.line) && g.line.length >= 5 && g.line.every(isFinite)) {
          out.regions[id] = { line: [0, 1, 2, 3, 4, 5].map((i) => num(g.line[i] || 0)) };
        } else {
          return send(res, 400, 'application/json',
            JSON.stringify({ ok: false, error: id + ' 값이 올바르지 않습니다' }));
        }
      }
      const V = (data && data.views) || {};
      for (const k of Object.keys(V)) {
        const v = V[k];
        if (!Array.isArray(v) || v.length !== 3 || !v.every(isFinite)) {
          return send(res, 400, 'application/json',
            JSON.stringify({ ok: false, error: k + ' 밑그림 값이 올바르지 않습니다' }));
        }
        out.views[k] = v.map(num);
      }
      if (!Object.keys(out.regions).length) {
        return send(res, 400, 'application/json', JSON.stringify({ ok: false, error: '저장할 값이 없습니다' }));
      }

      try {
        fs.mkdirSync(DIR, { recursive: true });
        fs.writeFileSync(SAVE, JSON.stringify(out, null, 2), 'utf8');
      } catch (e) {
        return send(res, 500, 'application/json', JSON.stringify({ ok: false, error: e.message }));
      }
      console.log('저장했습니다 → ' + SAVE + '  (부위 ' + Object.keys(out.regions).length + '칸)');
      return send(res, 200, 'application/json', JSON.stringify({ ok: true, file: SAVE }));
    });
    return;
  }

  const f = FILES[url];
  if (!f) return send(res, 404, 'text/plain', '없음');
  let body;
  try { body = fs.readFileSync(f[0]); } catch { return send(res, 404, 'text/plain', '없음'); }
  return send(res, 200, f[1], body);
});

//  이 창이 살아 있어야 [저장] 이 된다. 어떤 일이 있어도 조용히 죽지 않게 한다.
process.on('uncaughtException', (e) => {
  console.log('!! 오류가 났지만 계속합니다: ' + e.message);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log('');
    console.log('  !! 이미 다른 창에서 이 도구가 켜져 있습니다 (포트 ' + PORT + ').');
    console.log('     먼저 열려 있던 검은 창을 닫고 다시 실행해 주세요.');
  } else {
    console.log('  !! 시작하지 못했습니다: ' + e.message);
  }
  console.log('');
  setTimeout(() => process.exit(1), 100);
});

server.listen(PORT, () => {
  const addr = 'http://localhost:' + PORT + '/';
  console.log('');
  console.log('  절개도 맞추기');
  console.log('  ------------------------------------------------');
  console.log('  브라우저가 열립니다: ' + addr);
  console.log('  부위를 끌어 옮기고, 모서리로 크기를 맞춘 뒤 [저장] 을 누르세요.');
  console.log('  저장 위치: ' + SAVE);
  console.log('  다 하셨으면 이 검은 창에서 Ctrl+C 를 누르거나 창을 닫으세요.');
  console.log('');
  exec('start "" "' + addr + '"');
});
