/*  모의 통합 시험용 «흉내 세 전산» 웹 서버 — 실제 카인포·카모두·엔트리와 무관한 가짜 화면
 *  /carinfo /carmodoo /entry 화면 + /api/list(GET 조회) + /api/save(POST 저장)
 *  고장 흉내(faults): carinfo500(저장하고 500) · popupForeign(다른 주소 팝업으로 저장) · entryLoggedOut */
const http = require('http');

function page(title, body, script) {
  return '<!doctype html><meta charset="utf-8"><title>' + title + '</title><body>' + body +
    '<script>' + script + '</script></body>';
}

const LIST_JS = `
async function loadList(site){
  const r = await fetch('/api/list?site='+site); const rows = await r.json();
  document.querySelector('#list tbody').innerHTML = rows.map(x=>'<tr>'+x.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('');
}`;

function createMockSites() {
  const S = {
    carinfo: [], carmodoo: [], entry: [], seq: 200, faults: {},
    saves: { carinfo: 0, carmodoo: 0, entry: 0 },
  };
  const entryNext = () => (S.faults.entryNext || (S.carinfo[0] ? S.carinfo[0][0] : 'T-0000'));

  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const send = (code, type, body) => { res.writeHead(code, { 'content-type': type + '; charset=utf-8' }); res.end(body); };
    if (u.pathname === '/api/list') {
      const site = u.searchParams.get('site');
      return send(200, 'application/json', JSON.stringify(S[site] || []));
    }
    if (u.pathname === '/api/save' && req.method === 'POST') {
      let body = '';
      req.on('data', (d) => { body += d; });
      req.on('end', () => {
        let p = {};
        try { p = JSON.parse(body); } catch { p = Object.fromEntries(new URLSearchParams(body)); }
        const site = p.site;
        S.saves[site]++;
        if (site === 'carinfo') S.carinfo.unshift(['T-' + String(++S.seq).padStart(4, '0'), p.carNo, p.vin, p.date || '2026-10-19', '완료']);
        else S[site].unshift([p.checkNo, p.carNo]);
        if (site === 'carinfo' && S.faults.carinfo500) return send(500, 'text/plain', 'error after save');
        send(200, 'application/json', '{"ok":true}');
      });
      return;
    }
    if (u.pathname === '/upload' && req.method === 'POST') { S.saves.foreign = (S.saves.foreign || 0) + 1; return send(200, 'text/plain', 'ok'); }
    if (u.pathname === '/upload') {
      return send(200, 'text/html', page('upload', '<form id=f method=post action="/upload"><input name=a value=1></form>', 'document.getElementById("f").submit();'));
    }
    if (u.pathname === '/carinfo') {
      return send(200, 'text/html', page('카인포 흉내',
        '<input id=carNo><input id=vin><button id=btnSave>저장</button><button id=btnPopup>사진 팝업</button>' +
        '<table id=list><tbody></tbody></table><div id=msg></div>',
        LIST_JS + `
        loadList('carinfo');
        document.getElementById('btnSave').onclick = async () => {
          try {
            const r = await fetch('/api/save', { method:'POST', body: JSON.stringify({ site:'carinfo', carNo: carNo.value, vin: vin.value }) });
            msg.textContent = 'status ' + r.status;
          } catch (e) { msg.textContent = 'blocked'; }
          loadList('carinfo');
        };
        document.getElementById('btnPopup').onclick = () => { window.open('${'FOREIGN'}/upload', '_blank'); };
        window.addEventListener('keydown', (e) => { window.__key = { key: e.key, trusted: e.isTrusted }; });`));
    }
    if (u.pathname === '/carmodoo') {
      return send(200, 'text/html', page('카모두 흉내',
        '<label><input type=checkbox id=autoNo checked>자동 부여</label><input id=checkNo><input id=carNo>' +
        '<button id=btnSave>저장</button><table id=list><tbody></tbody></table>',
        LIST_JS + `
        loadList('carmodoo');
        document.getElementById('btnSave').onclick = async () => {
          try { await fetch('/api/save', { method:'POST', body: JSON.stringify({ site:'carmodoo', checkNo: checkNo.value, carNo: carNo.value }) }); } catch (e) {}
          loadList('carmodoo');
        };`));
    }
    if (u.pathname === '/entry') {
      const logged = !S.faults.entryLoggedOut;
      const row = S.carinfo.find((r) => r[0] === entryNext()) || [];
      return send(200, 'text/html', page('엔트리 흉내',
        (logged ? '<b id=who>가온</b><span id=nextNo>' + entryNext() + '</span>' : '<input type=password>') +
        '<button id=btnLoad>불러오기</button><span id=ldNo></span><span id=ldCar></span><span id=ldVin></span>' +
        '<button id=btnSave>저장</button><table id=list><tbody></tbody></table>',
        LIST_JS + `
        loadList('entry');
        const ROW = ${JSON.stringify(row)};
        document.getElementById('btnLoad').onclick = () => { ldNo.textContent = ROW[0]||''; ldCar.textContent = ROW[1]||''; ldVin.textContent = ROW[2]||''; };
        document.getElementById('btnSave').onclick = async () => {
          try { await fetch('/api/save', { method:'POST', body: JSON.stringify({ site:'entry', checkNo: ldNo.textContent, carNo: ldCar.textContent }) }); } catch (e) {}
          loadList('entry');
        };`));
    }
    send(404, 'text/plain', 'not found');
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const base = 'http://127.0.0.1:' + port;
      const foreign = 'http://localhost:' + port;                        // 다른 주소(host 가 다름) 흉내
      const orig = server.listeners('request')[0];
      server.removeAllListeners('request');
      server.on('request', (req, res) => {
        const end = res.end.bind(res);
        res.end = (b) => end(typeof b === 'string' ? b.replace(/FOREIGN/g, foreign) : b);
        orig(req, res);
      });
      resolve({ S, base, foreign, host: '127.0.0.1:' + port, close: () => server.close() });
    });
  });
}

module.exports = { createMockSites };
