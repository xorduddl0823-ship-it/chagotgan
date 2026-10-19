/*  세 전산 입력 항목 대응표 만들기 (7차)
 *  자료 틀(src/schema.js)이 «단일 진실 원천»이므로 표도 여기서 바로 뽑는다 — 사람이 따로 적으면 어긋난다.
 *  실행: node tools/field-map.js > 대응표.md
 *  엔트리 칸은 아직 실제 화면을 못 봐서 «카인포에서 끌어옴(확인 필요)»으로 둔다. */
const { GROUPS, OPT } = require('../src/schema');

const out = [];
const P = (s) => out.push(s);

function siteCell(m, f) {
  if (!m) return '';
  if (m.part) return '부위 «' + m.part.no + '. ' + m.part.name + (m.part.sub ? ' ' + m.part.sub : '') + '»';
  if (m.sel && m.split === 'vin') return '`' + m.sel + '` (앞 11자리 + 뒤 6자리 나눠 넣기)';
  if (m.sel) return '`' + m.sel + '`';
  if (m.name) return '라디오 `' + m.name + '`';
  if (m.radio) return '라디오 `' + m.radio + '`';
  if (m.checkbox) return '체크 ' + Object.entries(m.checkbox).map(([v, n]) => OPT[f.opts] ? (OPT[f.opts].find((o) => o[0] === v) || [v, v])[1] + '=`' + n + '`' : n).join(' · ');
  return JSON.stringify(m);
}

const CI_PHOTO = { photo1: '앞면', photo2: '뒷면', photo3: '좌측면', photo4: '우측면', photo5: '기타1', photo6: '기타2', photo7: '기타3', photo8: '기타4' };
const CM_PHOTO = { photo1: '앞면', photo2: '뒷면' };

/** 변환·주의 칸 */
function note(f) {
  const n = [];
  if (f.cm && f.cm.vmap && Object.keys(f.cm.vmap).some((k) => f.cm.vmap[k] !== k)) n.push('카모두는 값이 반대(변환표로 뒤집어 보냄)');
  if (f.ci && f.ci.split === 'vin') n.push('카인포는 차대번호를 둘로 나눠 넣음');
  if (f.ci && f.ci.checkbox) n.push('카인포는 선택 대신 체크 칸');
  if (f.type === 'part') n.push('카모두=그림 영역 · 카인포=절개도 점(위치·부호별 표 filler.js CM_AREA/CI_DOT)');
  if (f.auto) n.push('카인포 신규등록 때 원부 조회로 채워짐 → 입력 화면으로 되읽기');
  if (f.dep) n.push('«' + f.dep.k + '»가 ' + f.dep.v + '일 때만');
  if (f.k === 'dealerName') n.push('카모두는 글자 대신 사원 목록에서 «고르기»(동명이인이면 사람이 고름)');
  if (f.k === 'assocNo') n.push('흐름에서는 카인포 점검번호를 넣음(«자동 부여» 끔)');
  if (f.k === 'tradeType' || f.k === 'clientName') n.push('전산 칸에 직접 넣지 않고 카인포 신규등록(개인간 거래)에 씀');
  if (f.cm && !f.ci && !f.local && f.type !== 'part') n.push('⚠ 카인포 칸 연결 없음 — 카인포 화면에 이 칸이 있는지 확인');
  if (f.ci && !f.cm && !f.local && f.k !== 'dealerName') n.push('⚠ 카모두 칸 연결 없음 — 카모두 화면에 이 칸이 있는지 확인');
  if (f.type === 'photo' && !CM_PHOTO[f.k]) n.push('⚠ 카모두로는 안 보냄(기존 기능은 앞·뒤만) — 카모두 사진 칸 확인');
  if (f.k === 'accident' || f.k === 'accidentSimple') n.push('부위 표시로 자동 계산(historyFromParts)');
  return n.join(' · ');
}

function verdict(f) {
  if (f.type === 'photo') return '사진 단계';
  if (f.k === 'dealerName') return '둘 다 · 변환';
  if (f.local) return '가온만';
  const cm = !!f.cm, ci = !!f.ci;
  if (cm && ci) return note(f) && /반대|나눠|체크 칸|그림/.test(note(f)) ? '둘 다 · 변환' : '둘 다';
  if (cm) return '카모두만';
  if (ci) return '카인포만';
  return '보내지 않음';
}

const count = {};
P('| 묶음 | 항목 | 가온 칸 | 카인포 | 카모두 | 엔트리 | 판정 | 변환·주의 |');
P('|---|---|---|---|---|---|---|---|');
for (const g of GROUPS) {
  for (const f of g.fields) {
    let ci = siteCell(f.ci, f), cm = siteCell(f.cm, f);
    if (f.type === 'photo') { ci = CI_PHOTO[f.k] ? '사진 창 «' + CI_PHOTO[f.k] + '»' : ''; cm = CM_PHOTO[f.k] ? '«4 자동차사진» ' + CM_PHOTO[f.k] : '(자리 없음 — 안 보냄)'; }
    if (f.k === 'dealerName') cm = '사원 고르기(`#jDNo` 검색)';
    const v = verdict(f) === '사진 단계' && !CM_PHOTO[f.k] ? '사진 단계 · 카인포만' : verdict(f);
    count[v] = (count[v] || 0) + 1;
    P('| ' + g.title.replace(/^\d+\.\s*/, '') + ' | ' + f.label + (f.req ? ' ⭐' : '') + ' | `' + f.k + '` | ' + (ci || '—') + ' | ' + (cm || '—') +
      ' | ' + (f.local ? '—' : '카인포에서 끌어옴(확인 필요)') + ' | ' + v + ' | ' + note(f) + ' |');
  }
}
P('');
P('판정별 개수: ' + Object.entries(count).map(([k, n]) => k + ' ' + n).join(' · ') + ' (전체 ' + Object.values(count).reduce((a, b) => a + b, 0) + '칸)');
console.log(out.join('\n'));
