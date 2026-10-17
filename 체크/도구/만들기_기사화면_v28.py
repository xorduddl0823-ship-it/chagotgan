"""기사 폰 화면 v27 → v28 — 시험 뒤 판 (v27 은 읽기만 · 시험판 v27 은 그대로)
받은 목록: 총괄 10-17 «대표님 시험 지적» (기사 /driver/ v27 · TEST 검사소)
바꾸는 것:
  1) 「① 한 줄 입력」 아래 추천 칩(＋ 새 목적지 ○○ · 딜러 이름으로 ○○) — 글자 · 높이를 보조 버튼 수준으로, 폰에서 한 줄에 2개
  2) 못 보낸 까닭을 기사가 할 일로 — «보내는 번호 없음» → 사무실 설정 · «등록된 딜러 번호가 아님» → 사무실에서 딜러 등록 등
"""
BASE = "/home/user/chagotgan/체크/driver/"
s = open(BASE + "index_v27.html", encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

# 1) 한 줄 입력 추천 칩 — 작게, 폰에서 2개씩
rep('''.chip.on{background:var(--navy); color:var(--on-navy); border-color:var(--navy)}''',
    '''.chip.on{background:var(--navy); color:var(--on-navy); border-color:var(--navy)}
/* v28: 한 줄 입력 아래 추천 칩은 보조 버튼 크기 — 폰에서 한 줄에 2개 (대표님 10-17) */
#line-fix{gap:6px}
#line-fix .chip{font-size:13.5px; padding:7px 10px; min-height:36px; line-height:1.25; border-radius:10px;
  flex:0 1 calc(50% - 3px); max-width:calc(50% - 3px); text-align:left; white-space:normal; word-break:keep-all; overflow-wrap:anywhere}
#line-fix .chip b{font-weight:800; display:block}''')

# 2) 못 보낸 까닭 → 기사가 할 일
rep('''function whyKo(w){ w=String(w||''); return (!w || !/[가-힣]/.test(w)) ? '보내지 못했어요. 연락처를 확인하고 다시 시도해 주세요.' : w; }''',
    '''function whyKo(w){
  w=String(w||'');
  /* v28: 서버 까닭(짧은 말)을 기사가 할 일로 — 사무실이 고칠 것은 «사무실에 알려 주세요» */
  var MAP=[
    [/보내는 번호 없음/, '사무실 설정에서 보내는 번호를 넣어야 알림이 가요. 사무실에 알려 주세요. (기록은 남았어요)'],
    [/등록된 딜러 번호가 아님/, '이 번호는 아직 딜러 목록에 없어요. 사무실에서 딜러 연락처를 등록하면 보내져요. (기록은 남았어요)'],
    [/^연락처 없음/, '딜러 연락처가 없어서 알림을 못 보냈어요. 연락처를 넣고 기록에서 «다시 보내기»를 눌러 주세요.'],
    [/기사 한 명이 보낼 수 있는 알림을 다 씀/, '오늘 보낼 수 있는 알림 수를 다 썼어요. 내일 다시 보내지거나, 사무실에 알려 주세요.'],
    [/오늘 보낼 수 있는 알림을 다 씀/, '오늘 검사소가 보낼 수 있는 알림 수를 다 썼어요. 사무실에 알려 주세요.'],
    [/카카오톡을 쓰지 않는 번호/, '카카오톡을 쓰지 않는 번호라 문자로도 못 보냈어요. 번호를 확인해 주세요.'],
    [/받는 번호가 (없는|올바르지 않)/, '딜러 번호가 맞지 않아요. 번호를 확인하고 다시 보내 주세요.'],
    [/잔액이 모자람/, '알림 보낼 돈(충전 잔액)이 모자라요. 사무실에 알려 주세요.']
  ];
  for(var i=0;i<MAP.length;i++) if(MAP[i][0].test(w)) return MAP[i][1];
  return (!w || !/[가-힣]/.test(w)) ? '보내지 못했어요. 연락처를 확인하고 다시 시도해 주세요.' : w;
}''')

for bad in ["보내는 번호 없음'"]:
    pass
# 3) «내 기록» 상태 칩 — 알림 기준으로 (대표님 10-17: «딜러 없음 · 성공»이 헷갈림)
rep("""    var cls=r.발송결과==='성공'?'p-ok':(r.발송결과==='시험'?'p-test':'p-bad');""",
    """    var tg=sendTag(r), cls=tg[1];""")
rep("""      '<br><small style="color:var(--ink-2)">'+esc((r.상사?r.상사+' ':'')+(r.딜러||'딜러 없음'))+""",
    """      '<br><small style="color:var(--ink-2)">'+esc((r.상사?r.상사+' ':'')+(r.딜러||(r.딜러연락처?'딜러 이름 없음':'딜러 없음')))+""")
rep("""      '<span class="pill '+cls+'">'+esc(r.상태==='취소'?'취소':r.발송결과)+'</span></div>';""",
    """      '<span class="pill '+cls+'">'+esc(tg[0])+'</span></div>';""")
rep("""    '<div class="'+(ok?'good':'bad')+'" style="margin-bottom:12px">'+esc(r.도착일시)+' · '+esc(howKo(r.발송방법))+' '+esc(r.발송결과||'')+
      (r.발송사유?'<br>'+esc(r.발송사유):'')+'</div>'+""",
    """    '<div class="'+(ok?'good':'bad')+'" style="margin-bottom:12px">'+esc(r.도착일시)+' · '+esc(sendTag(r)[0])+
      (r.발송결과==='성공'&&r.발송방법?' ('+esc(howKo(r.발송방법))+')':'')+
      (r.발송결과==='실패'&&r.발송사유?'<br>'+esc(whyKo(r.발송사유)):'')+'</div>'+""")
rep("""function whyKo(w){""", """/* v28: 기록 상태 — 알림 기준 [보이는 말, 칩 색] (기록 저장 자체는 따로 말하지 않음) */
function sendTag(r){
  if(r.상태==='취소') return ['취소','p-bad'];
  if(r.발송결과==='시험') return ['시험','p-test'];
  if(r.발송결과==='성공') return ['알림 보냄','p-ok'];
  if(r.발송결과==='실패') return ['못 보냄','p-bad'];
  if(!r.딜러연락처) return ['알림 없음 (번호 없음)','p-test'];
  return ['보내는 중','p-test'];
}
function whyKo(w){""")

open(BASE + "index_v28.html", "w", encoding="utf-8").write(s)
print("OK 기사 v28", len(s))
