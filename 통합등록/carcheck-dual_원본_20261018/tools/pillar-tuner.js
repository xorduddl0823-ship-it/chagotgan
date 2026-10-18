/**
 * 절개도 기둥(A·B·C필러) 맞추기 — 작은 서버
 * ------------------------------------------------------------------
 * 브라우저에서 기둥 끝을 끌어 자리와 기울기를 맞추고 [저장] 하면
 *   %APPDATA%\carcheck-dual\pillar.json
 * 에 숫자가 적힌다. 이중등록 프로그램은 켤 때 이 파일을 읽어 그대로 그린다.
 *
 * 실행: tools\pillar-tuner.bat  (또는 node tools\pillar-tuner.js)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const ROOT = path.join(__dirname, '..');
const APPDATA = process.env.APPDATA || path.join(process.env.USERPROFILE || '.', 'AppData', 'Roaming');
const SAVE = path.join(APPDATA, 'carcheck-dual', 'pillar.json');
const PORT = 8899;

//  이 도구가 내주는 파일 (앱의 진짜 화면 파일을 그대로 쓴다)
const FILES = {
  '/': [path.join(__dirname, 'pillar-tuner.html'), 'text/html'],
  '/parts-diagram.js': [path.join(ROOT, 'renderer', 'parts-diagram.js'), 'application/javascript'],
  '/style.css': [path.join(ROOT, 'renderer', 'style.css'), 'text/css'],
};

function send(res, code, type, body) {
  res.writeHead(code, { 'content-type': type + '; charset=utf-8' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === "/alive") return send(res, 200, "application/json", JSON.stringify({ ok: true }));

  if (url === '/load') {
    let cur = null;
    try { cur = JSON.parse(fs.readFileSync(SAVE, 'utf8')); } catch {}
    return send(res, 200, 'application/json', JSON.stringify({ saved: cur, file: SAVE }));
  }

  if (url === '/save' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 20000) req.destroy(); });
    req.on('end', () => {
      let data;
      try { data = JSON.parse(body); } catch {
        return send(res, 400, 'application/json', JSON.stringify({ ok: false, error: '값을 읽지 못했습니다' }));
      }
      //  A·B·C 가 숫자 5~6개씩인지 확인하고 저장한다 (여섯 번째는 휨, 없으면 0)
      const clean = {};
      for (const k of ['A', 'B', 'C']) {
        const v = data[k];
        if (!Array.isArray(v) || v.length < 5 || v.length > 6 || v.some((n) => !isFinite(Number(n)))) {
          return send(res, 400, 'application/json',
            JSON.stringify({ ok: false, error: k + ' 값이 올바르지 않습니다' }));
        }
        clean[k] = [0, 1, 2, 3, 4, 5].map((i) => Math.round(Number(v[i] || 0) * 10) / 10);
      }
      try {
        fs.mkdirSync(path.dirname(SAVE), { recursive: true });
        fs.writeFileSync(SAVE, JSON.stringify(clean, null, 2), 'utf8');
      } catch (e) {
        return send(res, 500, 'application/json', JSON.stringify({ ok: false, error: e.message }));
      }
      console.log('저장했습니다 → ' + SAVE);
      console.log(JSON.stringify(clean));
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

//  이 창이 살아 있어야 [저장] 이 된다. 조용히 죽지 않게 한다.
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
  console.log('  절개도 기둥 맞추기');
  console.log('  ------------------------------------------------');
  console.log('  브라우저가 열립니다: ' + addr);
  console.log('  기둥을 맞춘 뒤 [저장] 을 누르세요.');
  console.log('  저장 위치: ' + SAVE);
  console.log('  다 하셨으면 이 검은 창에서 Ctrl+C 를 누르거나 창을 닫으세요.');
  console.log('');
  exec('start "" "' + addr + '"');
});
