/*  실제 등록 관찰 기록 → 설정 후보 정리 (12차) — 방(개발)이 쓰는 도구. 대표님은 실행하지 않음.
 *  실행: node tools/observe-map.js <diag-…-관찰-….json> [...]
 *  하는 일: 쓰기 요청(POST 등)마다 «바로 앞에 누른 단추»를 짝지어 저장 · 신규등록 · 사진 · 불러오기 · 기타로 나누고,
 *           조회(GET·xhr)는 따로 모아 site-config 에 넣을 «후보»를 보여 준다. 설정 파일은 고치지 않는다(사람이 확인 뒤 넣음).
 *  주의: 응답 번호(200 등)만으로 저장 성공을 정하지 않는다 — 실제 성공은 저장 뒤 목록·상세 다시 읽기로 확인(register-flow).
 */
const fs = require('fs');
const path = require('path');

const KIND = [
  ['save', /^저장$/],                                     // 정확히 [저장]만(접수저장·임시저장 아님)
  ['prepare', /신규\s*등록|^확인$/],
  ['photo', /사진/],
  ['load', /불러오기/],
  ['quick', /간편\s*접수/],
  ['manual', /수동\s*입력/],
  ['other', /./],
];
const NAME = { save: '[저장]', prepare: '신규등록', photo: '사진', load: '[불러오기]', quick: '[간편 접수]', manual: '수동입력', other: '기타', none: '누른 단추 없음' };
const isWrite = (e) => e.method && e.method !== 'GET' && e.method !== 'HEAD';
//  주소 무늬 — 가린 부분([가림]: 차량번호·번호 등 바뀌는 값)은 «한 마디 아무 글자»로
const esc = (p) => '^' + String(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\[가림\\\]/g, '[^/]+') + '$';

function analyze(d, windowMs = 8000) {
  const ents = ((d.requests || {}).entries || []).slice().sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const clicks = ents.filter((e) => e.kind === 'click');
  const groups = {};
  const reads = new Map();
  for (const e of ents) {
    if (e.kind === 'click') continue;
    if (!isWrite(e)) { if (e.kind === 'xhr' || e.kind === 'document') reads.set(e.method + ' ' + e.path, (reads.get(e.method + ' ' + e.path) || 0) + 1); continue; }
    const t = Date.parse(e.at);
    const prev = clicks.filter((c) => Date.parse(c.at) <= t && t - Date.parse(c.at) <= windowMs).pop();
    const kind = prev ? KIND.find(([, re]) => re.test(String(prev.text || '').trim()))[0] : 'none';
    const key = e.method + ' ' + e.host + e.path;
    const g = (groups[kind] = groups[kind] || new Map());
    const x = g.get(key) || { method: e.method, host: e.host, path: e.path, count: 0, status: new Set(), bodyKeys: new Set(), after: new Set() };
    x.count++;
    if (e.status != null) x.status.add(e.status);
    (e.bodyKeys || []).forEach((k) => x.bodyKeys.add(k));
    if (prev) x.after.add(String(prev.text || '').slice(0, 20));
    g.set(key, x);
  }
  const list = (k) => [...(groups[k] || new Map()).values()];
  const site = d.site || '';
  const hostSet = new Set(ents.filter((e) => e.host).map((e) => e.host));
  //  설정 후보 — 저장 주소는 «[저장] 뒤 쓰기 요청», 신규등록·사진은 단계 문, 저장 전 다른 쓰기는 «값 넣기 중 허용» 후보(사람 확인)
  const proposal = {
    savePatterns: list('save').map((x) => esc(x.path)),
    phaseAllow: { prepare: list('prepare').map((x) => esc(x.path)), photo: list('photo').map((x) => esc(x.path)) },
    fillAllowReview: [...list('other'), ...list('none'), ...list('load'), ...list('quick')].map((x) => esc(x.path)),
    diagReadPaths: [...reads.keys()].filter((k) => k.startsWith('GET ')).map((k) => esc(k.slice(4))),
  };
  const warn = [];
  if (!proposal.savePatterns.length) warn.push('[저장] 뒤 쓰기 요청이 없어요 — [저장]까지 했는지, 단추 글자가 정확히 «저장»인지 확인');
  if (list('save').length > 1) warn.push('[저장] 뒤 쓰기 요청이 여러 주소예요 — 어느 것이 실제 저장인지 화면 기록과 함께 확인');
  if ([...hostSet].length > 1) warn.push('다른 주소로도 요청이 갔어요: ' + [...hostSet].join(', '));
  if (site === 'entry' && list('load').some((x) => x.count)) warn.push('엔트리 [불러오기]가 쓰기 요청을 보내요 — 순수 조회가 아니면 다시 하기(loadRetry.pureRead) 금지 유지');
  if (site === 'carmodoo' && list('manual').length) warn.push('경기조합 «수동입력»이 서버 요청을 보내요 — 저장과 따로 다뤄야 함');
  return { site, groups: Object.fromEntries(Object.keys(groups).map((k) => [k, list(k)])), reads: [...reads.entries()], proposal, warn };
}

function render(r) {
  const out = ['## ' + ({ carinfo: '카인포', carmodoo: '경기조합(카모두)', entry: '엔트리' }[r.site] || r.site) + ' — 관찰 기록 정리', ''];
  out.push('| 앞에 누른 단추 | 요청 | 횟수 | 응답 번호 | 보낸 칸 이름 |', '|---|---|---|---|---|');
  for (const [k, xs] of Object.entries(r.groups)) {
    xs.forEach((x) => out.push('| ' + NAME[k] + (x.after.size ? ' (' + [...x.after].join(', ') + ')' : '') + ' | ' + x.method + ' ' + x.path + ' | ' + x.count + ' | ' + [...x.status].join(',') + ' | ' + [...x.bodyKeys].slice(0, 12).join(', ') + ' |'));
  }
  out.push('', '조회 요청(GET·xhr): ' + (r.reads.map(([k, n]) => k + '×' + n).join(' · ') || '없음'), '');
  out.push('### 설정 후보 (확인 뒤 site-config REAL 에 — 응답 번호만으로 성공을 정하지 않음)', '```json', JSON.stringify(r.proposal, null, 1), '```');
  if (r.warn.length) out.push('', '### 확인할 것', ...r.warn.map((w) => '- ' + w));
  return out.join('\n') + '\n';
}

if (require.main === module) {
  const files = process.argv.slice(2);
  if (!files.length) { console.log('사용: node tools/observe-map.js <diag-…-관찰-….json> [...]'); process.exit(1); }
  for (const f of files) {
    let d;
    try { d = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.log('# ' + path.basename(f) + ' — 읽지 못함: ' + e.message); continue; }
    if (d.mode !== 'observe') console.log('# ' + path.basename(f) + ' — 관찰 기록이 아니에요(막는 진단 기록). 저장 주소는 관찰 기록에서만 알 수 있어요.');
    process.stdout.write(render(analyze(d)));
  }
}
module.exports = { analyze, render };
