/*  모의 통합 시험용 «흉내 세 전산» 웹 서버 — 실제 카인포·카모두·엔트리와 무관한 가짜 화면
 *  /carinfo /carmodoo /entry 화면 + /api/list(GET 조회) + /api/save(POST 저장)
 *  고장 흉내(faults): carinfo500(저장하고 500) · popupForeign(다른 주소 팝업으로 저장) · entryLoggedOut
 *  (7차) 카인포 [신규등록] → /api/prepare(POST): 목록에 «작성중» 줄·번호가 먼저 생김 → [저장] 하면 그 줄이 «완료»
 *        사진 → /api/photo?k=photo1 (POST) — 받은 칸을 S.photoKeys 에 남김 */
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
    prepares: 0, photoKeys: { carinfo: [], carmodoo: [] },
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
        const pre = site === 'carinfo' && p.formNo ? S.carinfo.find((r) => r[0] === p.formNo) : null;
        if (pre) { pre[4] = '완료'; pre[2] = p.vin || pre[2]; }            // 신규등록 때 생긴 줄 → 저장하면 완료(차대번호도 채워짐)
        else if (site === 'carinfo') S.carinfo.unshift(['T-' + String(++S.seq).padStart(4, '0'), p.carNo, p.vin, p.date || '2026-10-19', '완료']);
        else S[site].unshift([p.checkNo, p.carNo]);
        if (site === 'carinfo' && S.faults.carinfo500) return send(500, 'text/plain', 'error after save');
        send(200, 'application/json', '{"ok":true}');
      });
      return;
    }
    if (u.pathname === '/api/photo' && req.method === 'POST') {
      S.photos = (S.photos || 0) + 1;
      const k = u.searchParams.get('k'), site = u.searchParams.get('site');
      if (k && S.photoKeys[site]) S.photoKeys[site].push(k);
      return send(200, 'application/json', '{"ok":true}');
    }
    if (u.pathname === '/api/prepare' && req.method === 'POST') {
      let body = '';
      req.on('data', (d) => { body += d; });
      req.on('end', () => {
        let p = {};
        try { p = JSON.parse(body); } catch {}
        S.prepares++;
        const no = 'T-' + String(++S.seq).padStart(4, '0');
        S.carinfo.unshift([no, p.carNo, p.vin || '', '2026-10-19', '작성중']);
        send(200, 'application/json', JSON.stringify({ checkNo: no }));
      });
      return;
    }
    if (u.pathname === '/api/entryState') {
      const row = S.carinfo.find((r) => r[0] === entryNext()) || [];
      return send(200, 'application/json', JSON.stringify({ logged: !S.faults.entryLoggedOut, next: entryNext(), row }));
    }
    if (u.pathname === '/upload' && req.method === 'POST') { S.saves.foreign = (S.saves.foreign || 0) + 1; return send(200, 'text/plain', 'ok'); }
    if (u.pathname === '/upload') {
      return send(200, 'text/html', page('upload', '<form id=f method=post action="/upload"><input name=a value=1></form>', 'document.getElementById("f").submit();'));
    }
    if (u.pathname === '/carinfo') {
      return send(200, 'text/html', page('카인포 흉내',
        '<input id=newCar><button id=btnNew>신규등록</button><input id=formNo>' +
        '<input id=carNo><input id=vin><button id=btnSave>저장</button><button id=btnPopup>사진 팝업</button>' +
        '<form id=popForm method=post action="/api/save" target="_blank"><input name=site value=carinfo><input name=carNo id=pfCar><input name=vin id=pfVin></form>' +
        '<button id=btnPopupPost>팝업으로 바로 저장</button>' +
        '<table id=list><tbody></tbody></table><div id=msg></div>',
        LIST_JS + `
        loadList('carinfo');
        document.getElementById('btnNew').onclick = async () => {
          try {
            const r = await fetch('/api/prepare', { method:'POST', body: JSON.stringify({ carNo: newCar.value }) });
            const j = await r.json(); formNo.value = j.checkNo; carNo.value = newCar.value; msg.textContent = 'prepared';
          } catch (e) { msg.textContent = 'blocked'; }
          loadList('carinfo');
        };
        document.getElementById('btnSave').onclick = async () => {
          try {
            const r = await fetch('/api/save', { method:'POST', body: JSON.stringify({ site:'carinfo', carNo: carNo.value, vin: vin.value, formNo: formNo.value }) });
            msg.textContent = 'status ' + r.status;
            carNo.value = ''; vin.value = ''; formNo.value = '';          // 저장하면 목록 화면으로 돌아감(등록 화면 닫힘)
          } catch (e) { msg.textContent = 'blocked'; }
          loadList('carinfo');
        };
        document.getElementById('btnPopup').onclick = () => { window.open('${'FOREIGN'}/upload', '_blank'); };
        document.getElementById('btnPopupPost').onclick = () => { pfCar.value = carNo.value; pfVin.value = vin.value; popForm.submit(); };
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
      //  흉내 엔트리 — 로그인 상태·다음 번호를 스스로 새로 읽는다(자동 등록 중 사람이 새로고침하지 않으므로)
      return send(200, 'text/html', page('엔트리 흉내',
        '<div id=auth></div><button id=btnLoad>불러오기</button><span id=ldNo></span><span id=ldCar></span><span id=ldVin></span>' +
        '<button id=btnSave>저장</button><table id=list><tbody></tbody></table>',
        LIST_JS + `
        loadList('entry');
        let ROW = [];
        async function tick(){
          try {
            const st = await (await fetch('/api/entryState')).json();
            auth.innerHTML = st.logged ? '<b id=who>가온</b><span id=nextNo>' + st.next + '</span>' : '<input type=password>';
            ROW = st.row || [];
          } catch (e) {}
        }
        tick(); setInterval(tick, 150);
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
