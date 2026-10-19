/*  윈도우 실행 안정성 확인(14차) — 포장한 실행 파일(또는 소스)을 띄워 실제 키·마우스로:
 *   ① 기록 폴더 분리(시험판 표시가 있으면 «carcheck-dual-시험판» · 업무용 폴더를 새로 만들지 않음)
 *   ② 차량번호 칸 입력(한글 포함)
 *   ③ 프로그램 경고창(필수 항목 비어 있음)을 닫은 뒤에도 입력이 되는지(10/19 «입력 안 됨» 의심 상황)
 *   ④ 사진 고르기 → 칸에 붙고 파일 이름이 보임(윈도우 파일 고르기 창은 자동으로 다룰 수 없어, 그 창이 돌려줄 결과만 대신 넣음)
 *   ⑤ 아래쪽 단추를 모두 한 번씩 — 전산 주소는 닫힌 주소로 돌려 실제 접속 없음 · 누른 뒤 «처리 중» 덮개가 60초 안에 사라지는지(먹통 없음)
 *  사용: node test/electron/windows-check.js            (소스 실행)
 *        PACKAGED_EXE=<실행 파일> node test/electron/windows-check.js   (포장한 실행 파일 — 윈도우 EXE 검증)
 *  실제 전산 접속 없음 · 실제 차량 자료 없음. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { _electron } = (() => { try { return require('../node_modules/playwright-core'); } catch { return require(process.env.PLAYWRIGHT_CORE || 'playwright-core'); } })();

const appDir = path.join(__dirname, '..', '..');
const packaged = process.env.PACKAGED_EXE || '';
const results = [];
const ok = (cond, name, info) => { results.push(!!cond); console.log((cond ? 'ok' : 'not ok') + ' - (실행 확인) ' + name + (info ? '  # ' + String(info).slice(0, 300) : '')); };

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-win-'));
  const jpg = (n) => { const f = path.join(tmp, n + '.jpg'); fs.writeFileSync(f, Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==', 'base64')); return f; };
  const p1 = jpg('front'), p2 = jpg('back');
  const env = { ...process.env };
  if (process.platform !== 'win32') { env.XDG_CONFIG_HOME = tmp; }      // 리눅스는 임시 기록 폴더(윈도우는 실제 %APPDATA% — 시험용 PC에서만)
  const electronBin = packaged || require(path.join(appDir, 'node_modules', 'electron'));
  const app = await _electron.launch({ executablePath: electronBin, timeout: 90000, env,
    args: ['--no-sandbox', '--no-proxy-server', '--host-resolver-rules=MAP ck.carmodoo.com 127.0.0.1:9,MAP ai.carinfo.co.kr 127.0.0.1:9'].concat(packaged ? [] : [appDir]) });
  const dialogs = [];
  const hook = (pg) => pg.on('dialog', async (d) => { dialogs.push(d.type() + ': ' + d.message().slice(0, 80)); try { if (d.type() === 'confirm') await d.dismiss(); else await d.accept(); } catch {} });
  app.windows().forEach(hook);
  app.on('window', hook);
  const w = await app.firstWindow();
  await w.waitForSelector('#f_carNo', { timeout: 60000 });

  //  ① 기록 폴더
  const where = await app.evaluate(({ app: a }) => {
    const fs2 = process.getBuiltinModule('fs'); const p2 = process.getBuiltinModule('path');
    return { userData: a.getPath('userData'), appData: a.getPath('appData'), title: '' , prodExists: fs2.existsSync(p2.join(a.getPath('appData'), 'carcheck-dual')) };
  });
  const title = await app.evaluate(({ BrowserWindow }) => (BrowserWindow.getAllWindows()[0] || { getTitle: () => '' }).getTitle());
  const marker = /시험판/.test(title);
  ok(marker ? path.basename(where.userData) === 'carcheck-dual-시험판' : true, '기록 폴더: ' + (marker ? '시험판 표시 있음 → carcheck-dual-시험판' : '시험판 표시 없음(소스 실행)'), where.userData + ' · 창 제목 ' + title);

  //  ② 입력
  await w.click('#f_carNo');
  await w.keyboard.type('99가9999');
  const v1 = await w.inputValue('#f_carNo');
  ok(v1 === '99가9999', '차량번호 칸에 키보드로 입력(한글 포함)', v1);

  //  ③ 경고창 뒤 입력 — 필수 항목이 비어 있는 채로 [경기조합만] → «필수 항목이 비어 있습니다» 경고 → 닫힘 → 다른 칸에 입력
  const before = dialogs.length;
  await w.click('#btn-send-cm');
  await w.waitForTimeout(800);
  const alerted = dialogs.slice(before).some((d) => /필수 항목/.test(d));
  await w.click('#f_dealerName');
  await w.keyboard.type('시험딜러');
  const v2 = await w.inputValue('#f_dealerName');
  ok(alerted && v2 === '시험딜러', '경고창(필수 항목 비어 있음)을 닫은 뒤에도 입력이 됨', JSON.stringify({ alerted, v2 }));

  //  ④ 사진 고르기 — 윈도우 파일 고르기 창이 돌려줄 결과(두 파일)만 대신 넣음
  await app.evaluate(({ dialog }, files) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: files }); }, [p1, p2]);
  await w.click('.photo-cell[data-key="photo1"] .photo-drop');
  await w.waitForTimeout(800);
  const ph = await w.evaluate(() => ({ p1: state.photo1 || '', p2: state.photo2 || '', has: document.querySelector('.photo-cell[data-key="photo1"]').classList.contains('has'),
    name: document.querySelector('.photo-cell[data-key="photo1"] .photo-name').textContent }));
  ok(ph.p1 === p1 && ph.p2 === p2 && ph.has && /front/.test(ph.name), '사진 고르기(두 장) → 1·2번 칸에 붙고 파일 이름이 보임', JSON.stringify({ has: ph.has, name: ph.name }));

  //  ⑤ 전에 필수 칸을 모두 채움(가짜 값) — 전송 단추가 «필수 항목» 경고에서 멈추지 않고 전산 쪽까지 가 보게
  await w.evaluate(() => {
    SCHEMA.groups.forEach((g) => g.fields.forEach((f) => {
      if (!f.req || String(state[f.k] || '').trim()) return;
      state[f.k] = f.type === 'date' ? '2026-10-19' : f.type === 'select' ? ((SCHEMA.opts[f.opts] || [])[0] || [''])[0] : '1';
    }));
  });
  //  ⑤ 아래쪽 단추 모두 — 처리 중 덮개가 60초 안에 사라지는지(먹통 없음)
  const ids = await w.evaluate(() => [...document.querySelectorAll('footer button, #btn-prepare, .site-btn')].filter((b) => !b.classList.contains('hidden') && b.offsetParent).map((b) => b.id || (b.dataset.site ? 'site-' + b.dataset.site : '')).filter(Boolean));
  const stuck = [];
  for (const id of ids) {
    const t0 = Date.now();
    try { await w.click(id.startsWith('site-') ? '.site-btn[data-site="' + id.slice(5) + '"]' : '#' + id, { timeout: 5000 }); } catch {}
    let busy = true;
    while (Date.now() - t0 < 60000) {
      busy = await w.evaluate(() => !document.getElementById('busy').classList.contains('hidden')).catch(() => false);
      if (!busy) break;
      await w.waitForTimeout(250);
    }
    if (busy) stuck.push(id);
    //  열린 결과·설정·고르기 창 닫기
    await w.evaluate(() => { document.querySelectorAll('.overlay').forEach((o) => { if (o.id !== 'busy') o.classList.add('hidden'); }); }).catch(() => {});
    console.log('#   단추 ' + id + ' — ' + Math.round((Date.now() - t0) / 100) / 10 + '초' + (busy ? ' (처리 중에 멈춤)' : ''));
  }
  ok(ids.length > 5 && !stuck.length, '아래쪽·위쪽 단추 ' + ids.length + '개를 모두 눌러도 «처리 중»에 멈추지 않음(전산 주소는 닫힌 주소)', stuck.join(', '));

  const after = await app.evaluate(({ app: a }) => process.getBuiltinModule('fs').existsSync(process.getBuiltinModule('path').join(a.getPath('appData'), 'carcheck-dual')));
  ok(!marker || where.prodExists || !after, '시험판 실행 중 업무용 기록 폴더(carcheck-dual)를 새로 만들지 않음', JSON.stringify({ before: where.prodExists, after }));
  console.log('# 경고창: ' + dialogs.join(' / '));
  await app.close().catch(() => {});
  process.exitCode = results.every(Boolean) ? 0 : 1;
})().catch((e) => { console.log('not ok - (실행 확인) 시험 도구 오류: ' + (e && e.message)); process.exit(1); });
