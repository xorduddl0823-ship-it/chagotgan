/*  실제 등록 관찰 기록 → 설정 «추정 후보» 정리 (12차 · 12차 보완2) — 방(개발)이 쓰는 도구. 대표님은 실행하지 않음.
 *  실행: node tools/observe-map.js <diag-…-관찰-….json> [...]
 *  하는 일: 쓰기 요청(POST 등)마다 «8초 안에 바로 앞에 누른 단추»를 짝지어 저장 · 신규등록 · 사진 · 불러오기 · 기타로 나눈다.
 *  ※ 짝짓기는 «시간이 가깝다»는 것만 보는 **추정**이다 — 화면이 저절로 보낸 요청이나 늦게 간 요청이 다른 단추에 붙을 수 있다.
 *     그래서 이 도구는 아무것도 «확정»하지 않는다: 결과의 모든 항목은 confirmed:false 이고, 설정 파일도 고치지 않는다.
 *     사람이 화면 기록(화면 칸 기록·누른 단추·시간 순서)과 함께 하나씩 확인한 항목만 site-config REAL 에 넣고,
 *     tools/config-check.js 의 CONFIRMED 에 «근거(파일 이름·확인한 사람·무엇을 봤는지)»를 함께 적는다.
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
const NAME = { save: '[저장]', prepare: '신규등록', photo: '사진', load: '[불러오기]', quick: '[간편 접수]', manual: '수동입력', other: '기타', none: '앞에 누른 단추 없음' };
const isWrite = (e) => e.method && e.method !== 'GET' && e.method !== 'HEAD';
//  주소 무늬 — 가린 부분([가림]: 차량번호·번호 등 바뀌는 값)은 «한 마디 아무 글자»로
const esc = (p) => '^' + String(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\[가림\\\]/g, '[^/]+') + '$';
const WINDOW_MS = 8000;

function analyze(d, windowMs = WINDOW_MS) {
  const ents = ((d.requests || {}).entries || []).slice().sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const clicks = ents.filter((e) => e.kind === 'click');
  const groups = {};
  const reads = new Map();
  const timeline = [];                                    // 쓰기 요청의 시간 순서(사진·저장 순서를 사람이 보는 용도)
  for (const e of ents) {
    if (e.kind === 'click') continue;
    if (!isWrite(e)) { if (e.kind === 'xhr' || e.kind === 'document') reads.set(e.method + ' ' + e.path, (reads.get(e.method + ' ' + e.path) || 0) + 1); continue; }
    const t = Date.parse(e.at);
    const prev = clicks.filter((c) => Date.parse(c.at) <= t && t - Date.parse(c.at) <= windowMs).pop();
    const kind = prev ? KIND.find(([, re]) => re.test(String(prev.text || '').trim()))[0] : 'none';
    const gap = prev ? (t - Date.parse(prev.at)) / 1000 : null;
    timeline.push({ at: e.at, kind, request: e.method + ' ' + e.path, after: prev ? String(prev.text || '').slice(0, 20) : '', gapSec: gap });
    const key = e.method + ' ' + e.host + e.path;
    const g = (groups[kind] = groups[kind] || new Map());
    const x = g.get(key) || { method: e.method, host: e.host, path: e.path, count: 0, status: new Set(), bodyKeys: new Set(), after: new Set(), gaps: [] };
    x.count++;
    if (e.status != null) x.status.add(e.status);
    (e.bodyKeys || []).forEach((k) => x.bodyKeys.add(k));
    if (prev) { x.after.add(String(prev.text || '').slice(0, 20)); x.gaps.push(gap); }
    g.set(key, x);
  }
  const list = (k) => [...(groups[k] || new Map()).values()];
  const site = d.site || '';
  const hostSet = new Set(ents.filter((e) => e.host).map((e) => e.host));
  //  추정 후보 — 하나하나 «무엇을 근거로 짐작했나»와 confirmed:false 를 붙인다(자동 확정 없음)
  const cand = (setting, x, kind) => ({ setting, pattern: esc(x.path), request: x.method + ' ' + x.path,
    basis: kind === 'none' ? '앞 ' + (windowMs / 1000) + '초 안에 누른 단추 없음' : '앞 ' + (windowMs / 1000) + '초 안 마지막 단추 «' + [...x.after].join(', ') + '» · ' + x.gaps.map((s) => s.toFixed(1) + '초 뒤').join(', '),
    estimated: true, confirmed: false });
  const estimate = [
    ...list('save').map((x) => cand('savePatterns', x, 'save')),
    ...list('prepare').map((x) => cand('phaseAllow.prepare', x, 'prepare')),
    ...list('photo').map((x) => cand('phaseAllow.photo', x, 'photo')),
    ...[...list('other'), ...list('none'), ...list('load'), ...list('quick'), ...list('manual')].map((x) => cand('fillAllow(검토)', x, 'other')),
  ];
  const readGuess = [...reads.keys()].filter((k) => k.startsWith('GET ')).map((k) => ({ setting: 'diagReadPaths/readAllow(검토)', pattern: esc(k.slice(4)), estimated: true, confirmed: false }));
  //  사진·저장 순서 — 관찰된 시간 순서만 보여 주고 photoPhase 는 정하지 않는다(사람 확인 뒤 설정)
  const firstAt = (k) => { const x = timeline.find((y) => y.kind === k); return x ? Date.parse(x.at) : null; };
  const ps = firstAt('photo'), ss = firstAt('save');
  const photoOrder = ps == null || ss == null ? '관찰에 사진 요청 또는 [저장] 요청이 없어 순서를 볼 수 없음'
    : (ps < ss ? '관찰된 순서: 사진 → [저장]' : '관찰된 순서: [저장] → 사진') + ' (추정 — 단추 짝짓기가 맞는지 확인한 뒤 photoPhase 결정)';
  const warn = [];
  if (!list('save').length) warn.push('[저장] 뒤 쓰기 요청이 없어요 — [저장]까지 했는지, 단추 글자가 정확히 «저장»인지 확인');
  if (list('save').length > 1) warn.push('[저장] 뒤 쓰기 요청이 여러 주소예요 — 어느 것이 실제 저장인지 화면 기록과 함께 확인');
  if ([...hostSet].length > 1) warn.push('다른 주소로도 요청이 갔어요: ' + [...hostSet].join(', '));
  if (site === 'entry' && list('load').some((x) => x.count)) warn.push('엔트리 [불러오기]가 쓰기 요청을 보내요 — 순수 조회가 아니면 다시 하기(loadRetry.pureRead) 금지 유지');
  if (site === 'carmodoo' && list('manual').length) warn.push('경기조합 «수동입력»이 서버 요청을 보내요 — 저장과 따로 다뤄야 함');
  return { site, estimated: true, groups: Object.fromEntries(Object.keys(groups).map((k) => [k, list(k)])), reads: [...reads.entries()],
           timeline, photoOrder, estimate, readGuess, warn };
}

function render(r) {
  const out = ['## ' + ({ carinfo: '카인포', carmodoo: '경기조합(카모두)', entry: '엔트리' }[r.site] || r.site) + ' — 관찰 기록 정리 (추정 · 자동 확정 아님)', '',
    '> 단추와 요청은 «' + (WINDOW_MS / 1000) + '초 안에 바로 앞에 누른 단추»로 짝지은 **추정**이에요. 아래 후보는 모두 확인 전(confirmed:false)이며 설정에 바로 넣지 않아요.', ''];
  out.push('| 앞에 누른 단추(추정) | 요청 | 횟수 | 응답 번호(성공 판단에 안 씀) | 보낸 칸 이름 |', '|---|---|---|---|---|');
  for (const [k, xs] of Object.entries(r.groups)) {
    xs.forEach((x) => out.push('| ' + NAME[k] + (x.after.size ? ' (' + [...x.after].join(', ') + ')' : '') + ' | ' + x.method + ' ' + x.path + ' | ' + x.count + ' | ' + [...x.status].join(',') + ' | ' + [...x.bodyKeys].slice(0, 12).join(', ') + ' |'));
  }
  out.push('', '쓰기 요청 시간 순서: ' + (r.timeline.map((x) => x.request + (x.after ? '(«' + x.after + '» ' + x.gapSec.toFixed(1) + '초 뒤)' : '')).join(' → ') || '없음'));
  out.push('', '사진·저장 순서: ' + r.photoOrder);
  out.push('', '조회 요청(GET·xhr): ' + (r.reads.map(([k, n]) => k + '×' + n).join(' · ') || '없음'), '');
  out.push('### 추정 후보 — 사람이 확인한 것만 site-config REAL 에 넣고 config-check CONFIRMED 에 근거를 적음', '',
    '| 설정 | 무늬 | 요청 | 짐작 근거 | 확인 |', '|---|---|---|---|---|');
  r.estimate.concat(r.readGuess).forEach((c) => out.push('| ' + c.setting + ' | `' + c.pattern + '` | ' + (c.request || '') + ' | ' + (c.basis || '조회 요청') + ' | 확인 전 |'));
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
module.exports = { analyze, render, WINDOW_MS };
