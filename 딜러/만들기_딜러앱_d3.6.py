"""딜러앱 화면 d3.5 → d3.6 새 판을 만든다 (오픈 베타 시험판). 바탕 파일은 읽기만 한다.
쓰는 법: python3 딜러/만들기_딜러앱_d3.6.py   (바탕: 딜러/3_딜러앱_화면_d3.5 — 저장소에 있는 그대로)
결과: 딜러/3_딜러앱_화면_d3.6/
근거: 운영/요청서/2026-10-15_07_오픈베타_시험_마무리.md (대표님 «보안 · 기능 · 워딩»), 규칙 4장
바꾸는 것
  1. «오픈 베타» 띠 — 홈페이지 시안 «넣은 안» 그대로 (홈페이지/소개/소개_시안.html .beta), 로그인 · 동의 · 앱 화면 맨 위
  2. 말 고치기 (규칙 4장: 해요체 · 가입 · 로그인 · 오류만 «~습니다» · «단추» → «버튼» · 오류 글에 영어 · 코드 글자 없이)
  3. 보안: 서버 오류 원문(영어 · 서버 이름)을 화면에 보이지 않게 — 자세한 내용은 브라우저 개발자 창(console)에만
공통 부품: cgg-j4 1.5 동결 그대로 (d3.5 와 같음). 서버 창구: 그대로."""
import os, shutil
ROOT = "/home/user/chagotgan"
SRCDIR = ROOT + "/딜러/3_딜러앱_화면_d3.5"
OUTDIR = ROOT + "/딜러/3_딜러앱_화면_d3.6"
s = open(SRCDIR + "/index.html", encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    if s.count(old) != count:
        raise SystemExit("찾은 개수 다름(%d): %s" % (s.count(old), old[:90]))
    s = s.replace(old, new)

# 1) 판 번호
rep("<!-- 차곳간 딜러앱 화면 · 판 d3.5 (2026-10-15, 대표님 시험판",
    "<!-- 차곳간 딜러앱 화면 · 판 d3.6 (2026-10-15, 오픈 베타 시험판 · 말 고침 · 오픈 베타 띠")
rep('var VER="d3.5";', 'var VER="d3.6";')

# 2) 오류 글 — 영어 · 서버 이름 · 원문 숨김 (자세한 것은 console 에만)
rep('''function(){throw new Error("서버에 연결하지 못했습니다. 인터넷을 확인해 주세요");})''',
    '''function(){throw new Error("서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.");})''')
rep('''catch(e){throw new Error("서버 응답을 읽지 못했습니다");}''',
    '''catch(e){try{console.warn("dealer-api 응답",String(t).slice(0,200));}catch(_){}throw new Error("서버 응답을 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요.");}''')
rep('''forget();throw new Error("다시 로그인해 주세요");''', '''forget();S.err="로그인 시간이 지났습니다. 다시 로그인해 주세요.";render();throw new Error("로그인 시간이 지났습니다. 다시 로그인해 주세요.");''')
rep('''throw new Error("약관 동의가 필요합니다");''', '''throw new Error("약관 동의가 필요합니다.");''')
rep('''      if(/authoriz|jwt/i.test(m))throw new Error("서버 설정 확인 필요: dealer-api 의 Verify JWT 를 꺼 주세요 ("+m+")");
      if(/not found|function/i.test(m))throw new Error("서버(dealer-api)를 찾지 못했습니다. 이름이 dealer-api 인지 확인해 주세요 ("+m+")");
      throw new Error("서버 응답이 이상합니다: "+(m||t.slice(0,120)));}''',
    '''      try{console.warn("dealer-api 응답",m||String(t).slice(0,200));}catch(_){}
      throw new Error("서버에서 답을 받지 못했습니다. 잠시 뒤 다시 시도해 주세요.");}''')

# 3) 로그인 · 동의 (표준형 «~습니다»)
rep("""'인증번호 6자리를<br>입력하세요'""", """'인증번호 6자리를<br>입력해 주세요'""")
rep("""'업체에 알려 준 번호로 들어오면 내 차가 자동으로 보여요. 비밀번호는 필요 없어요.'""",
    """'업체에 알려 주신 번호로 로그인하면 맡긴 차가 바로 보입니다. 비밀번호는 필요 없습니다.'""")
rep("""' 로 문자를 보냈어요. 5분 안에 입력하세요.'""", """' 로 인증번호를 보냈습니다. 5분 안에 입력해 주세요.'""")
rep("""(S.sending?'확인 중…':'확인하고 들어가기')""", """(S.sending?'확인 중…':'로그인')""")
rep("""처음 들어오면 이용약관·개인정보 동의 화면이 한 번 나와요.""", """처음 로그인하면 이용약관 · 개인정보 동의 화면이 한 번 나옵니다.""")
rep("""내 번호로 맡겨진 차를 보여 드리려면 아래 동의가 필요해요. 동의하지 않으면 차 목록이 보이지 않아요.""",
    """내 번호로 맡겨진 차를 보여 드리려면 아래 동의가 필요합니다. 동의하지 않으면 차 목록이 보이지 않습니다.""")
rep("""나중에 할게요 (로그아웃)""", """나중에 하기 (로그아웃)""")
rep('''toast("인증번호를 다시 보냈어요")''', '''toast("인증번호를 다시 보냈습니다.")''')
rep('''S.err="인증번호 6자리를 넣어 주세요"''', '''S.err="인증번호 6자리를 입력해 주세요."''')
rep('''S.err="휴대폰 번호를 다시 확인해 주세요"''', '''S.err="휴대폰 번호를 다시 확인해 주세요."''')
rep('''S.err="필수 항목 두 개에 동의해 주세요"''', '''S.err="필수 항목 두 개에 동의해 주세요."''')
rep('''toast("어서 오세요"+(S.name?", "+S.name+" 딜러님":""));''', '''toast((S.name?S.name+" 딜러님, ":"")+"로그인했습니다.");''')
rep('''toast("동의했어요. 어서 오세요!");''', '''toast("동의가 완료되었습니다.");''')
rep('''new Error("시연에서는 인증번호 123456 을 넣어 주세요")''', '''new Error("시연에서는 인증번호 123456을 입력해 주세요.")''')
rep('''new Error("시연에 없는 기능")''', '''new Error("시연에서는 쓸 수 없는 기능이에요.")''')
rep("""시연 화면 — 실제 자료가 아닙니다""", """시연 화면입니다. 실제 자료가 아닙니다.""")

# 4) 그 밖의 화면 (해요체 · 버튼 · 알림톡 먼저 규칙 5-6)
rep("""<b>공유</b> 단추 →""", """<b>공유</b> 버튼 →""")
rep("""앱 알림을 받는 딜러에게는 문자를 보내지 않아 업체의 문자 비용이 줄어요. 앱 알림이 실패하면 문자로 다시 보내요. 청구서는 앱과 문자로 같이 갑니다. (앱 알림은 곧 열려요)""",
    """입고 · 출고 · 도착 · 청구서 알림은 카카오 알림톡으로 먼저 가고, 알림톡이 안 되면 문자로 가요. 휴대폰 앱 알림은 곧 열려요.""")
rep("""청구서 알림<small>앱과 문자로 같이 받기</small>""", """청구서 알림<small>알림톡으로 받기 (안 되면 문자)</small>""")
rep("""다시 들어올 때 인증번호를 한 번 더 받아요.""", """다시 로그인할 때 인증번호를 한 번 더 받아요.""")
rep('''toast("상품화 완료! «완료»로 표시했어요.")''', '''toast("«상품화 완료»로 표시했어요.")''')

# 5) 오픈 베타 띠 — 홈페이지 시안 «넣은 안» 그대로 (모양 · 글)
BETA = """'<div class="beta" role="note"><div class="wrap"><b>OPEN BETA</b><span>차곳간은 지금 <strong>오픈 베타</strong>예요. 쓰시면서 불편한 점을 알려 주시면 바로 고쳐요.</span></div></div>'"""
rep('''  if(S.view==="login")h=loginView();''', '''  if(S.view==="login")h=BETA()+loginView();''')
rep('''  else if(S.view==="agree")h=topBar(''', '''  else if(S.view==="agree")h=BETA()+topBar(''')
rep('''  return '<header class="cgg-hdr"><div class="cgg-top">'+''', '''  return BETA()+'<header class="cgg-hdr"><div class="cgg-top">'+''')
rep('''function shell(body){''', '''function BETA(){return ''' + BETA + ''';}
function shell(body){''')
CSS = """
/* d3.6 — 오픈 베타 띠 (홈페이지 시안 «넣은 안» 과 같은 모양) */
:root{--beta:#0d2440;--beta-ink:#e8f0fb}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--beta:#1d3a5f;--beta-ink:#e8f0fb}}
:root[data-theme="dark"]{--beta:#1d3a5f;--beta-ink:#e8f0fb}
.beta{background:var(--beta);color:var(--beta-ink);font-size:13.5px;word-break:keep-all}
.beta .wrap{padding:8px 12px;display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;text-align:center}
.beta b{background:var(--beta-ink);color:var(--beta);border-radius:6px;padding:0 7px;font-size:12px;letter-spacing:.04em}
.phone:not(.cgg-app)>.beta{border-radius:0}
/* 로그인 · 동의 · 창 글도 낱말 단위 줄바꿈 (공통 부품 밖) */
.phone,.sheet,.cardlg{word-break:keep-all;overflow-wrap:anywhere}
@media (max-width:600px){.beta{font-size:12.5px}.beta .wrap{padding:6px 12px;gap:6px}}
"""
k = s.index("/* ═══════════════════════════════════════════════════════════════════\n   차곳간 공통 부품 · J안 4판 · cgg-j4 1.5")
s = s[:k] + CSS + "\n" + s[k:]

# 6) 쓰기
if os.path.isdir(OUTDIR):
    shutil.rmtree(OUTDIR)
os.makedirs(OUTDIR)
for f in os.listdir(SRCDIR):
    if f != "index.html":
        shutil.copy(SRCDIR + "/" + f, OUTDIR + "/" + f)
open(OUTDIR + "/index.html", "w", encoding="utf-8").write(s)
print("만듦:", OUTDIR, len(s), "글자")
