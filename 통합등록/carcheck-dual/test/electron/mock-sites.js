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
    S.hits = S.hits || {};
    S.hits[u.pathname] = (S.hits[u.pathname] || 0) + 1;                 // 어떤 주소가 서버에 닿았는지(진단 시험용)
    const send = (code, type, body) => { res.writeHead(code, { 'content-type': type + '; charset=utf-8' }); res.end(body); };
    if (u.pathname === '/api/list') {
      const site = u.searchParams.get('site');
      //  (8차) 실제 엔트리처럼: 차량번호 앞을 가리고(****3456) 차대번호 칸 없음 · 줄마다 [성능점검] 단추(상세 화면)
      if (site === 'entry') return send(200, 'application/json', JSON.stringify(S.entry.map((r) => [r[0], '****' + String(r[1] || '').slice(-4), '<button class=dt data-no="' + r[0] + '">성능점검</button>'])));
      return send(200, 'application/json', JSON.stringify(S[site] || []));
    }
    if (u.pathname === '/api/detail') {
      const r = S.entry.find((x) => x[0] === u.searchParams.get('no')) || [];
      return send(200, 'application/json', JSON.stringify({ carNo: r[1] || '', vin: r[2] || '' }));
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
        else if (site === 'entry') S.entry.unshift([p.checkNo, p.carNo, p.vin || '']);
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
    //  (8차 검수 보완) GET 으로 바꾸는 요청 흉내 — 닿으면 S.getWrites 가 늘어남
    if (/^\/api\/(update|delete|insert)/.test(u.pathname) || u.searchParams.get('cmd') === 'save') { S.getWrites = (S.getWrites || 0) + 1; return send(200, 'application/json', '{"ok":true}'); }
    //  iframe 흉내 — 같은 주소 iframe(열리자마자 저장 POST) + 다른 주소 iframe(열리자마자 폼 POST)
    if (u.pathname === '/framepage') {
      return send(200, 'text/html', page('iframe 흉내', '<iframe id=f1 src="/frame-inner"></iframe><iframe id=f2 src="FOREIGN/upload"></iframe>', ''));
    }
    if (u.pathname === '/frame-inner') {
      return send(200, 'text/html', page('안쪽', '<div id=r></div>', 'fetch("/api/save",{method:"POST",body:JSON.stringify({site:"carinfo",carNo:"F1"})}).then(function(){r.textContent="sent"}).catch(function(){r.textContent="blocked"});'));
    }
    //  개인정보가 잔뜩 든 화면 흉내(값은 모두 가짜) — 진단 파일에 남으면 안 됨
    if (u.pathname === '/pii') {
      return send(200, 'text/html', '<!doctype html><meta charset="utf-8"><title>담당 010-5555-1234</title><body>' +
        '<h2>차량 98다7654 상세</h2><button id="b1" data-hp="010-2222-3333">98다7654 저장</button>' +
        '<input id="vin" value="KMHXX00XXXX765432" placeholder="010-3333-4444"><label for="vin">KMHXX00XXXX765432</label>' +
        '<a href="/detail?carNo=98%EB%8B%A47654&hp=01022223333">보기</a><table><thead><tr><th>번호 2628601111</th></tr></thead><tbody><tr><td>홍길동 010-7777-8888</td></tr></tbody></table>' +
        '<script>var who="lty0823";var hp="010-9999-0000";</script><a href="/api/list?site=carinfo&carNo=98%EB%8B%A47654">목록</a></body>');
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
    //  (8차 보완 · 엔트리 실제 화면 모양 흉내 — 10/19 대표님 화면 사진)
    //   성능점검 현황(목록: 번호·가린 차량번호·[성능점검]) · 오른쪽 위 [간편 접수] → «불러올 성능번호를 입력해 주세요» 창(다음 번호가 미리 들어감)
    //   → [불러오기] → 차량정보 화면(차량번호·차대번호 17자리) · 맨 아래 [성능점검기록부 전송](꺼짐) · [성능점검기록부 출력] · [저장](새 기록이면 켜짐)
    //   없는 번호 → «성능 불러오기가 실패하였습니다» [확인] · 저장하면 목록으로
    if (u.pathname === '/entry2') {
      return send(200, 'text/html', page('엔트리 흉내 2',
        '<header><span id=who2></span></header><button id=bQuick>간편 접수</button>' +
        '<section id=listView><table id=list><tbody></tbody></table></section>' +
        '<div id=quick style="display:none"><p>불러올 성능번호를 입력해 주세요</p><input id=quickNo><button id=bLoad>불러오기</button></div>' +
        '<div id=fail style="display:none"><p>성능 불러오기가 실패하였습니다</p><button id=bFailOk>확인</button></div>' +
        '<section id=form style="display:none"><input id=fNo readonly><input id=fCar readonly><input id=fVin readonly>' +
        '<button id=bSend disabled>성능점검기록부 전송</button><button id=bPrint>성능점검기록부 출력</button><button id=bSave2>저장</button></section>' +
        '<section id=detail style="display:none"><span id=dCar></span><span id=dVin></span></section>',
        LIST_JS.replace("'<td>'+c+'</td>'", "'<td>'+c+'</td>'") + `
        loadList('entry');
        let ST = {};
        async function tick(){ try { ST = await (await fetch('/api/entryState')).json(); who2.innerHTML = ST.logged ? '<b id=whoName>시험자 (tester)</b>' : '<input type=password>'; } catch (e) {} }
        tick(); setInterval(tick, 150);
        const show = (id, on) => { document.getElementById(id).style.display = on ? '' : 'none'; };
        bQuick.onclick = async () => { await tick(); quickNo.value = ST.next || ''; show('quick', true); };
        bLoad.onclick = async () => {
          const no = quickNo.value;
          const r = await (await fetch('/api/entryLoad?no=' + encodeURIComponent(no))).json();
          if (!r.row) { show('fail', true); return; }
          show('quick', false); show('listView', false);
          fNo.value = r.row[0]; fCar.value = r.row[1]; fVin.value = r.row[2];
          bSave2.disabled = !!r.already; show('form', true);
        };
        bFailOk.onclick = () => show('fail', false);
        bPrint.onclick = () => { window.__printed = true; };
        bSend.onclick = () => { window.__sent = true; };
        bSave2.onclick = async () => {
          try { await fetch('/api/save', { method:'POST', body: JSON.stringify({ site:'entry', checkNo: fNo.value, carNo: fCar.value, vin: fVin.value }) }); } catch (e) {}
          show('form', false); show('listView', true); loadList('entry');
        };
        document.addEventListener('click', async (e) => {
          const b = e.target.closest && e.target.closest('button.dt'); if (!b) return;
          const d = await (await fetch('/api/detail?no=' + encodeURIComponent(b.dataset.no))).json();
          dCar.textContent = d.carNo; dVin.textContent = d.vin; show('detail', true);
        });`));
    }
    if (u.pathname === '/api/entryLoad') {
      const no = u.searchParams.get('no');
      const row = S.carinfo.find((r) => r[0] === no && r[4] === '완료');                 // 카인포에 저장 끝난 기록만 불러옴
      return send(200, 'application/json', JSON.stringify({ row: row || null, already: S.entry.some((r) => r[0] === no) }));
    }
    if (u.pathname === '/entry') {
      //  흉내 엔트리 — 로그인 상태·다음 번호를 스스로 새로 읽는다(자동 등록 중 사람이 새로고침하지 않으므로)
      return send(200, 'text/html', page('엔트리 흉내',
        '<div id=auth></div><button id=btnLoad>불러오기</button><span id=ldNo></span><span id=ldCar></span><span id=ldVin></span>' +
        '<button id=btnSave>저장</button><table id=list><tbody></tbody></table><div>상세: <span id=dtCar></span> <span id=dtVin></span></div>',
        LIST_JS + `
        loadList('entry');
        document.addEventListener('click', async (e) => {
          const b = e.target.closest && e.target.closest('button.dt'); if (!b) return;
          const d = await (await fetch('/api/detail?no=' + encodeURIComponent(b.dataset.no))).json();
          dtCar.textContent = d.carNo; dtVin.textContent = d.vin;
        });
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
          try { await fetch('/api/save', { method:'POST', body: JSON.stringify({ site:'entry', checkNo: ldNo.textContent, carNo: ldCar.textContent, vin: ldVin.textContent }) }); } catch (e) {}
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
