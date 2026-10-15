"""체크 v22 → 체크 v23 새 판 (서버 check-api v23 짝). v22 는 읽기만 한다.
쓰는 법: python3 체크/도구/만들기_체크_v22.py && python3 체크/도구/만들기_체크_v23.py
바꾸는 것 (서버/설계/02_서버_새판_배포_안내.md 「체크 방」 줄):
  1) 사무실 기사 목록에 「가입신청」 표시 + 승인 전에 전화로 확인하라는 안내
  2) 기사 비밀번호 안내를 「6자 이상」으로, 회사 코드 · 사무실 승인 설명
※ 기사 폰 화면(/driver)은 저장소에 없어 아직 못 고침 — 로그인 「회사 코드(선택)」 칸, 가입 뒤 「사무실 승인 대기」 안내는 그 파일에 넣어야 함
"""
BASE = "/home/user/chagotgan/체크/"
SRC = BASE + "2_차곳간_체크_index_v22.html"
OUT = BASE + "2_차곳간_체크_index_v23.html"
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

# 서버가 주는 「가입신청: Y」 를 받아 둡니다
rep('''               use:(a.사용==="N"?"안 씀":"씀"), _q:[a.이름,a.연락처].join(" ") }; });''',
    '''               use:(a.사용==="N"?"안 씀":"씀"), ask:(a.가입신청==="Y"?"가입신청":""),
               _q:[a.이름,a.연락처,a.가입신청==="Y"?"가입신청":""].join(" ") }; });''')

# 기사 계정 화면 — 설명 · 안내 · 「가입신청」 칸
rep('''card("기사 계정","기사가 폰에서 이름과 비밀번호로 들어옵니다. 처음 쓰는 기사는 폰에서 «계정 만들기»로 직접 만들어도 됩니다 — 회사 비밀번호는 검사소 코드(예: GAON) 또는 사업자번호입니다."''',
    '''(K.filter(function(x){return x.ask;}).length
    ? '<div class="msg" style="background:var(--warn-soft);color:var(--warn)"><b>가입신청한 기사가 '+K.filter(function(x){return x.ask;}).length+'명 있어요.</b> '+
      '«다시 쓰게 하기»로 승인하기 전에, 그 기사에게 <b>전화로 직접 본인인지 확인</b>해 주세요. 모르는 이름이면 승인하지 말고 «고른 기사 멈추기» 그대로 두세요.</div>'
    : '')+
  card("기사 계정","기사가 폰에서 이름과 비밀번호로 들어와요. 처음 쓰는 기사는 폰에서 «계정 만들기»로 가입신청을 하고, "+
    "<b>사무실이 «다시 쓰게 하기»로 승인해야</b> 들어올 수 있어요. 회사 비밀번호는 검사소 코드 또는 사업자번호예요. "+
    "기사 비밀번호는 <b>6자 이상</b>이에요. 다른 회사에 같은 이름의 기사가 있으면 기사가 로그인할 때 회사 코드도 함께 넣어요."''')
rep('''      {k:"use",t:"쓰는 중",fmt:function(v){return '<span class="tag" style="background:'+
        (v==="씀"?"var(--good-soft);color:var(--good)":"var(--warn-soft);color:var(--warn)")+'">'+esc(v)+'</span>';}}
    ], K,''',
    '''      {k:"use",t:"쓰는 중",fmt:function(v){return '<span class="tag" style="background:'+
        (v==="씀"?"var(--good-soft);color:var(--good)":"var(--warn-soft);color:var(--warn)")+'">'+esc(v)+'</span>';}},
      {k:"ask",t:"가입신청",fmt:function(v){return v
        ?'<span class="tag" style="background:var(--warn-soft);color:var(--warn)" title="승인 전에 전화로 확인해 주세요">가입신청 · 전화 확인</span>'
        :'';}}
    ], K,''')
rep('''      '<button class="btn" id="accOn">다시 쓰게 하기</button>'}));''',
    '''      '<button class="btn" id="accOn">다시 쓰게 하기 (가입 승인)</button>'}));''')
rep('''    var p=prompt("처음 비밀번호 (기사가 폰에서 바꿀 수 있습니다)")||"";''',
    '''    var p=prompt("처음 비밀번호 (6자 이상 · 기사가 폰에서 바꿀 수 있습니다)")||"";
    if(p && p.length<6){ bar("기사 비밀번호는 6자 이상으로 정해 주세요.","err"); return; }''')

# 판 번호
rep('''  $("hdVer").textContent="체크 v22 · "''', '''  $("hdVer").textContent="체크 v23 · "''')

open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
