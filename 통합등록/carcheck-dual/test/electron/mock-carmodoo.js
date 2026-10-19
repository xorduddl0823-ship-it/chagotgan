/*  경기조합(ck.carmodoo.com) 흉내 — 기존 업무용 기능([경기조합만]·[두 곳 동시 전송]·[사진만 전송 (조합)])을
 *  «진짜 프로그램 그대로» 돌려 대표님 PC 오류(10/19)를 재현하는 시험용. 실제 사이트에 접속하지 않는다.
 *
 *  흉내 낸 동작(대표님 화면 사진·사이트 알림 기록으로 만든 «모델» — 실제 사이트 코드가 아님):
 *   · 접수차량 리스트: 머리글 «성능번호 · 접수일 · 검사일 · 차량번호 · 차대번호 · 차명»(10/19 사진), [접수등록]은 새 접수 화면을 엶
 *   · 접수 화면: ①~④ 탭 · 오른쪽 위 [저장] · ④ 자동차사진의 «앞면»·«뒷면» 자리
 *   · **저장하지 않은 접수에서 사진 자리를 누르면 접수가 바로 등록되고 alert «등록중입니다.»** (파일 고르기는 안 열림)
 *   · 등록된 접수에서 누르면 파일 고르기가 열리고, 올리면 alert «등록이 완료되었습니다»
 *  HTTPS(자체 서명) — 프로그램을 --host-resolver-rules 로 이 서버에 붙인다(프로그램 코드는 그대로).
 */
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function selfSignedCert() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-cert-'));
  const key = path.join(dir, 'k.pem'), crt = path.join(dir, 'c.pem');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', crt, '-days', '2', '-subj', '/CN=ck.carmodoo.com'], { stdio: 'ignore' });
  return { key: fs.readFileSync(key), cert: fs.readFileSync(crt) };
}

function createMockCarmodoo(opt = {}) {
  const S = { seq: 2767, records: [], registerCalls: 0, saveCalls: 0, uploads: 0, newForms: 0, hits: [] };
  const page = (title, body, js) => '<!doctype html><html><head><meta charset="utf-8"><title>' + title + '</title>' +
    '<style>body{font:14px sans-serif;margin:0}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:2px 6px}' +
    '.tabs li{display:inline-block;padding:6px 12px;border:1px solid #999;cursor:pointer}.box{width:400px;height:300px;background:#eee;display:inline-block;margin:10px}' +
    '.slot{display:inline-block;text-align:center}</style></head><body>' + body + '<script>' + (js || '') + '</script></body></html>';
  const send = (res, code, type, body) => { res.writeHead(code, { 'content-type': type + '; charset=utf-8' }); res.end(body); };
  const newRecord = (carNo, vin) => {
    const no = '04260' + String(++S.seq).padStart(5, '0');
    S.records.unshift({ no, date: '2026-10-19', carNo: carNo || '', vin: vin || '', photos: 0 });
    return no;
  };
  //  (시험) 같은 차 오늘 접수가 이미 있는 상태로 시작
  (opt.seed || []).forEach((c) => newRecord(c, ''));
  const tls = selfSignedCert();
  const server = https.createServer(tls, (req, res) => {
    const u = new URL(req.url, 'https://ck.carmodoo.com');
    S.hits.push(req.method + ' ' + u.pathname);
    const body = () => new Promise((r) => { let b = ''; req.on('data', (d) => { b += d; }); req.on('end', () => { try { r(JSON.parse(b || '{}')); } catch { r({}); } }); });
    if (u.pathname === '/main/index.do') return send(res, 200, 'text/html', page('메인', '<a href="/carCheck/carCheckList.do">접수차량 리스트</a>'));
    if (u.pathname === '/carCheck/carCheckList.do') {
      const rows = S.records.map((r) => '<tr><td><input type=checkbox></td><td>' + r.no + '</td><td>' + r.date + '</td><td>' + r.date + '</td><td>' + r.carNo + '</td><td>' + r.vin + '</td><td>차</td><td>' + (r.photos ? 'O' : 'X') + '</td></tr>').join('');
      return send(res, 200, 'text/html', page('접수차량 리스트',
        '<button id=btnNew onclick="location.href=\'/carCheck/pop_carcheck.do\'">접수등록</button>' +
        '<table id=list><thead><tr><th>체크</th><th>성능번호</th><th>접수일</th><th>검사일</th><th>차량번호</th><th>차대번호</th><th>차명</th><th>사진</th></tr></thead><tbody>' + rows + '</tbody></table>'));
    }
    if (u.pathname === '/carCheck/pop_carcheck.do') {
      S.newForms++;
      return send(res, 200, 'text/html', page('경기자동차매매사업조합 성능점검관리시스템',
        '<ul class=tabs><li onclick="tab(1)">① 신청인 및 접수정보</li><li onclick="tab(2)">② 자동차기본정보</li><li onclick="tab(3)">③ 자동차세부상태</li><li id=tab4 onclick="tab(4)">④ 자동차사진</li></ul>' +
        '<button id=btnSave onclick="save()">저장</button>' +
        //  딜러(사원)는 이미 골라진 상태로(딜러 고르기는 이번 재현 대상이 아님)
        '<div id=p1><input id=jDNo value="D1"><input id=j_dealerName value="시험딜러"><input id=jSNo value="S1"><input id=j_sangsaName value="시험상사"><input id=j_carNumber><input id=j_viNumber><input id=j_assocNumber><textarea id=uc_memo></textarea></div>' +
        '<div id=p4 style="display:none"><div class=slot><div class=box id=front></div><div>앞면</div></div><div class=slot><div class=box id=back></div><div>뒷면</div></div>' +
        '<input type=file id=file style="display:none"></div>',
        `var REG = null, WANT = null;
        function tab(n){ document.getElementById('p1').style.display = n===4?'none':''; document.getElementById('p4').style.display = n===4?'':'none'; }
        async function post(p, o){ const r = await fetch(p, { method:'POST', body: JSON.stringify(o||{}) }); return r.json(); }
        async function save(){ const r = await post('/api/save', { reg: REG, carNo: j_carNumber.value, vin: j_viNumber.value }); REG = r.no; }
        function slotClick(which){
          if (!REG) {
            //  저장 전 사진 자리 → 누를 때마다 접수가 새로 등록되고, 서버 답이 온 «뒤에» alert «등록중입니다.»
            //  (대표님 화면 10/19: 같은 차 6건 · 사진 없음 · 진짜 알림창이 떠 있음 — 이 모델은 그 결과와 맞도록 만든 추정)
            post('/api/register', { carNo: j_carNumber.value, vin: j_viNumber.value }).then(function(){ alert('등록중입니다.'); });
            return;
          }
          WANT = which; document.getElementById('file').click();
        }
        ${opt.dialogOnFill ? "j_carNumber.addEventListener('change', function(){ setTimeout(function(){ alert('차량번호를 다시 확인하세요.'); }, 50); });" : ''}
        document.getElementById('front').onclick = function(){ slotClick('front'); };
        document.getElementById('back').onclick = function(){ slotClick('back'); };
        document.getElementById('file').onchange = async function(){
          await post('/api/upload', { reg: REG, which: WANT });
          var img = document.createElement('img'); img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='; img.style.width='300px'; img.style.height='200px';
          document.getElementById(WANT).appendChild(img);
          alert('등록이 완료되었습니다');
        };`));
    }
    if (u.pathname === '/api/register' && req.method === 'POST') return body().then((b) => { S.registerCalls++; send(res, 200, 'application/json', JSON.stringify({ no: newRecord(b.carNo, b.vin) })); });
    if (u.pathname === '/api/save' && req.method === 'POST') return body().then((b) => {
      S.saveCalls++;
      let no = b.reg;
      const r = S.records.find((x) => x.no === no);
      if (r) { r.carNo = b.carNo; r.vin = b.vin; } else no = newRecord(b.carNo, b.vin);
      send(res, 200, 'application/json', JSON.stringify({ no }));
    });
    if (u.pathname === '/api/upload' && req.method === 'POST') return body().then((b) => { S.uploads++; const r = S.records.find((x) => x.no === b.reg); if (r) r.photos++; send(res, 200, 'application/json', '{"ok":true}'); });
    send(res, 404, 'text/plain', 'not found');
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ S, port: server.address().port, close: () => server.close() })));
}

module.exports = { createMockCarmodoo };
