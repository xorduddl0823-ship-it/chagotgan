"""딜러앱 화면 d3.5 → d3.6 새 판을 만든다 (오픈 베타 시험판). 바탕 파일은 읽기만 한다.
쓰는 법: python3 딜러/만들기_딜러앱_d3.6.py   (바탕: 딜러/3_딜러앱_화면_d3.5 — 저장소에 있는 그대로)
결과: 딜러/3_딜러앱_화면_d3.6/
근거: 운영/요청서/2026-10-15_07_오픈베타_시험_마무리.md (대표님 «보안 · 기능 · 워딩»), 규칙 4장
바꾸는 것
  1. «오픈 베타» 띠 — 디자인 방 «붙이는 조각» 그대로 (디자인/공통/오픈베타_띠.md): body 맨 위 · 통합 입구 안에서는 숨김
  2. 말 고치기 (규칙 4장: 해요체 · 가입 · 로그인 · 오류만 «~습니다» · «단추» → «버튼» · 오류 글에 영어 · 코드 글자 없이)
  3. 보안: 서버 오류 원문(영어 · 서버 이름)을 화면에 보이지 않게 — 자세한 내용은 브라우저 개발자 창(console)에만
  4. 말 대조표(디자인/말_대조표.md) · 결제/12_결제_말_대조표.md · 알림톡/07_워딩_검토/딜러_d3.5.md 반영
  5. 보안 낮음: 로그아웃 때 cgd_phone · cgd_seen · cgd_pref 와 메모리 이름 · 번호 · 차 상세도 비움
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
    '''function(){throw new Error("연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.");})''')
rep('''catch(e){throw new Error("서버 응답을 읽지 못했습니다");}''',
    '''catch(e){try{console.warn("dealer-api 응답",String(t).slice(0,200));}catch(_){}throw new Error("정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");}''')
rep('''forget();throw new Error("다시 로그인해 주세요");''', '''forget();S.err="로그인 시간이 지났습니다. 다시 로그인해 주세요.";render();throw new Error("로그인 시간이 지났습니다. 다시 로그인해 주세요.");''')
rep('''throw new Error("약관 동의가 필요합니다");''', '''throw new Error("약관 동의가 필요합니다.");''')
rep('''      if(/authoriz|jwt/i.test(m))throw new Error("서버 설정 확인 필요: dealer-api 의 Verify JWT 를 꺼 주세요 ("+m+")");
      if(/not found|function/i.test(m))throw new Error("서버(dealer-api)를 찾지 못했습니다. 이름이 dealer-api 인지 확인해 주세요 ("+m+")");
      throw new Error("서버 응답이 이상합니다: "+(m||t.slice(0,120)));}''',
    '''      try{console.warn("dealer-api 응답",m||String(t).slice(0,200));}catch(_){}
      throw new Error("정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");}''')

# 3) 로그인 · 동의 (표준형 «~습니다»)
rep("""'인증번호 6자리를<br>입력하세요'""", """'인증번호 6자리를<br>입력해 주세요'""")
rep("""'업체에 알려 준 번호로 들어오면 내 차가 자동으로 보여요. 비밀번호는 필요 없어요.'""",
    """'업체에 알려 주신 번호로 로그인하면 맡긴 차가 바로 보입니다. 비밀번호는 필요 없습니다.'""")
rep("""' 로 문자를 보냈어요. 5분 안에 입력하세요.'""", """' 번호로 인증번호를 발송했습니다. 5분 안에 입력해 주세요.'""")
rep("""(S.sending?'확인 중…':'확인하고 들어가기')""", """(S.sending?'확인 중…':'로그인')""")
rep("""처음 들어오면 이용약관·개인정보 동의 화면이 한 번 나와요.""", """처음 로그인하면 이용약관 · 개인정보 동의 화면이 한 번 나옵니다.""")
rep("""내 번호로 맡겨진 차를 보여 드리려면 아래 동의가 필요해요. 동의하지 않으면 차 목록이 보이지 않아요.""",
    """내 번호로 맡겨진 차를 보여 드리려면 아래 동의가 필요합니다. 동의하지 않으면 차 목록을 볼 수 없습니다.""")
rep("""나중에 할게요 (로그아웃)""", """나중에 하기 (로그아웃)""")
rep('''toast("인증번호를 다시 보냈어요")''', '''toast("인증번호를 다시 발송했습니다.")''')
rep('''S.err="인증번호 6자리를 넣어 주세요"''', '''S.err="인증번호 6자리를 모두 입력해 주세요."''')
rep('''S.err="휴대폰 번호를 다시 확인해 주세요"''', '''S.err="휴대폰 번호가 올바르지 않습니다. 다시 확인해 주세요."''')
rep('''S.err="필수 항목 두 개에 동의해 주세요"''', '''S.err="필수 항목 2개에 동의해야 시작할 수 있습니다."''')
rep('''toast("어서 오세요"+(S.name?", "+S.name+" 딜러님":""));''', '''toast((S.name?S.name+" 딜러님, ":"")+"로그인했습니다.");''')
rep('''toast("동의했어요. 어서 오세요!");''', '''toast("동의가 완료되었습니다. 어서 오세요.");''')
rep('''new Error("시연에서는 인증번호 123456 을 넣어 주세요")''', '''new Error("시연에서는 인증번호 123456을 입력해 주세요.")''')
rep('''new Error("시연에 없는 기능")''', '''new Error("시연에서는 쓸 수 없는 기능이에요.")''')
rep("""시연 화면 — 실제 자료가 아닙니다""", """시연 화면 — 실제 자료가 아니에요""")

# 4) 그 밖의 화면 (해요체 · 버튼 · 알림톡 먼저 규칙 5-6)
rep("""<b>공유</b> 단추 →""", """<b>공유</b> 버튼 →""")
rep("""앱 알림을 받는 딜러에게는 문자를 보내지 않아 업체의 문자 비용이 줄어요. 앱 알림이 실패하면 문자로 다시 보내요. 청구서는 앱과 문자로 같이 갑니다. (앱 알림은 곧 열려요)""",
    """입고 · 출고 · 도착 · 청구서 알림은 카카오 알림톡으로 먼저 가고, 알림톡이 안 되면 문자로 가요. 휴대폰 앱 알림은 곧 열려요.""")
rep("""청구서 알림<small>앱과 문자로 같이 받기</small>""", """청구서 알림<small>알림톡으로 받기 (안 되면 문자)</small>""")
rep("""다시 들어올 때 인증번호를 한 번 더 받아요.""", """다시 로그인할 때 인증번호를 한 번 더 받아요.""")
rep('''toast("상품화 완료! «완료»로 표시했어요.")''', '''toast("«상품화 완료»로 표시했어요.")''')

# 5) 오픈 베타 띠 — 디자인 방 «붙이는 조각» 그대로 (디자인/공통/오픈베타_띠.md)
#    body 맨 처음 · 남색 머리말보다 위 · 통합 입구 안(iframe)에서는 숨김
rep('''<body>
<div class="phone" id="phone"></div>''', '''<body>
<div class="cgg-beta" id="cggBeta" role="note"><div class="in"><b>오픈 베타</b><span>차곳간은 지금 오픈 베타예요. 쓰시면서 불편한 점을 알려 주시면 바로 고쳐요.</span></div></div>
<div class="phone" id="phone"></div>''')
rep('''<script>
"use strict";
''', '''<script>
"use strict";
try{ if(window.top!==window.self){ document.getElementById("cggBeta").hidden=true; } }catch(e){ document.getElementById("cggBeta").hidden=true; }
''')
CSS = """
/* 오픈 베타 띠 (디자인 방 2026-10-15) */
:root{--beta-bg:#0d2440;--beta-ink:#e8f0fb}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--beta-bg:#1d3a5f}}
:root[data-theme="dark"]{--beta-bg:#1d3a5f}
.cgg-beta{background:var(--beta-bg);color:var(--beta-ink);font-size:13.5px;line-height:1.5;word-break:keep-all}
.cgg-beta .in{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;text-align:center;
  padding-block:8px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.cgg-beta b{background:var(--beta-ink);color:var(--beta-bg);border-radius:6px;padding:1px 8px;font-size:12px;font-weight:800;flex:none}
.cgg-beta[hidden]{display:none}
@media (max-width:600px){.cgg-beta{font-size:12.5px}.cgg-beta .in{display:block;padding-block:6px}.cgg-beta b{margin-right:6px}}
/* d3.6 — 넓은 화면 세로 · 아이콘 메뉴는 메뉴 · 윗줄이 화면에 붙어 있어 띠를 가림 → 띠를 본문 위에 붙이고 붙은 줄을 띠 높이(36px)만큼 내림 */
@media (min-width:1000px){
  .cgg-beta:not([hidden]):has(~ .lay-side),.cgg-beta:not([hidden]):has(~ .lay-icon){position:fixed;top:0;right:0;left:252px;height:36px;z-index:var(--z-hdr);overflow:hidden;white-space:nowrap}
  .cgg-beta:not([hidden]):has(~ .lay-icon){left:76px}
  .cgg-beta:not([hidden]) ~ .lay-side .cgg-right,.cgg-beta:not([hidden]) ~ .lay-icon .cgg-right,.cgg-beta:not([hidden]) ~ .lay-icon .cgg-biz{top:36px}
  .cgg-beta:not([hidden]) ~ .lay-side .cgg-sub,.cgg-beta:not([hidden]) ~ .lay-icon .cgg-sub{top:100px}
  .cgg-beta:not([hidden]) ~ .lay-side > .cgg-main,.cgg-beta:not([hidden]) ~ .lay-icon > .cgg-main{padding-top:122px}
  .cgg-beta:not([hidden]) ~ .lay-side.hasSub > .cgg-main,.cgg-beta:not([hidden]) ~ .lay-icon.hasSub > .cgg-main{padding-top:168px}
}
/* d3.6 — 로그인 · 동의 화면(넓은 화면)은 바깥 여백 16px 이 있어 띠가 떠 보임 → 띠만 맨 위 · 가장자리까지 */
@media (min-width:480px){body:not(.shell) > .cgg-beta{margin:-16px -16px 16px}}
/* d3.6 — 좁은 PC(1000~1279px)에서 세로 메뉴를 쓰면 숫자 카드 글이 한 글자씩 꺾이던 것 (d3.5부터) → 두 칸으로 */
@media (min-width:1000px) and (max-width:1279px){.lay-side .kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (min-width:1000px){.kpi:not(:has(svg.sp)) small{padding-right:0}}
/* d3.6 — 로그인 · 동의 · 창 글도 낱말 단위 줄바꿈 (공통 부품 밖) */
.phone,.sheet,.cardlg{word-break:keep-all;overflow-wrap:anywhere}
"""
k = s.index("/* ═══════════════════════════════════════════════════════════════════\n   차곳간 공통 부품 · J안 4판 · cgg-j4 1.5")
s = s[:k] + CSS + "\n" + s[k:]

# 7) 말 대조표 · 결제 말 대조표 · 알림톡 방 워딩 검토 (딜러_d3.5.md) · 보안 낮음
#  7-1 서버 오류 글: 한국어 한 줄일 때만 보여 주고, 아니면 표준 글 (원문은 console 에만)
rep('''    if(j&&j.__err)throw new Error(j.__err);''',
    '''    if(j&&j.__err)throw new Error(safeMsg(j.__err));''')
rep('''/* ---------- 서버 ---------- */
function api(fn,args){''', '''/* ---------- 서버 ---------- */
var ERR_STD="잠시 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.";
function safeMsg(m){m=String(m==null?"":m).trim();
  if(m&&m.length<=80&&/[가-힣]/.test(m)&&!/[A-Za-z_]{3,}|[{}<>\\n]/.test(m))return m;
  try{console.warn("dealer-api 오류",m.slice(0,200));}catch(_){}return ERR_STD;}
function errMsg(e){return safeMsg(e&&e.message);}
function api(fn,args){''')
rep('''toast(e.message)''', '''toast(errMsg(e))''', 7)
rep('''S.err=e.message''', '''S.err=errMsg(e)''', 3)
#  7-2 보안 낮음: 로그아웃 때 기기 · 메모리에 남는 번호 · 이름 · 읽음 · 알림 설정 · 차 상세도 비움
rep('''function forget(){S.carT=null;S.key="";S.agreed=false;S.cars=null;S.bills=null;S.billsReady=false;ls("cgd_key",null);''',
    '''function forget(){S.carT=null;S.key="";S.agreed=false;S.cars=null;S.bills=null;S.billsReady=false;S.name="";S.phone="";S.detail=null;S.seen=null;ls("cgd_key",null);ls("cgd_phone",null);ls("cgd_seen",null);ls("cgd_pref",null);''')
#  7-3 «무료» 빼기 · 시연 띠 버튼
rep('''sub:"실제 자료가 아니에요. 딜러앱은 무료예요 — 휴대폰 번호로 로그인하면 업체에 맡긴 내 차가 보여요."''',
    '''sub:"실제 자료가 아니에요. 휴대폰 번호로 로그인하면 업체에 맡긴 내 차가 보여요."''')
rep('''var cta=ph.querySelector("[data-cgg-cta]");if(cta)cta.onclick=''', '''var cta=ph.querySelector("[data-cgg-cta]");if(cta)cta.textContent="로그인하러 가기";if(cta)cta.onclick=''')
rep('''<span>조회할 때마다 1건씩 빠져요 · 앱은 무료</span>''', '''<span>조회할 때마다 1건씩 빠져요</span>''')
#  7-4 알림 길: 출고 · 도착 알림은 알림톡으로 감
rep('''via:"문자"''', '''via:"알림톡"''', 2)
#  7-5 상품화 완료 · 입금 확인 · 낼 금액 (서버 값 «입금 확인됨» 비교는 그대로)
rep("""</em>가 완료를 기다려요'""", """</em>가 상품화 완료를 기다려요'""")
rep('''["결제할 청구서 금액",''', '''["낼 청구서 금액",''')
rep('''["완료 기다리는 차",''', '''["상품화 기다리는 차",''')
rep('''data-act="unfinish">완료 취소</button>''', '''data-act="unfinish">상품화 완료 취소</button>''')
rep('''toast("완료를 취소했어요")''', '''toast("상품화 완료를 취소했어요")''')
rep('''if(isPaid(b))return "입금 확인됨";''', '''if(isPaid(b))return "입금 확인";''')
rep("""(pd?'입금 확인됨':""", """(pd?'입금 확인':""")
rep('''«입금 확인됨»으로 바뀌어요.''', '''«입금 확인»으로 바뀌어요.''')
rep("""'이번 달 낼 금액 <em>'""", """'낼 금액 <em>'""")
#  7-6 그 밖의 말
rep('''re:["재검",''', '''re:["재검사",''')
rep('''<span class="pill p-in" style="margin:0">대표</span>''', '''<span class="pill p-in" style="margin:0">대표 번호</span>''')
rep("""aria-label="'+esc(c.plate)+' 고르기\"""", """aria-label="'+esc(c.plate)+' 선택\"""", 2)
rep('''업체가 입고 · 출고를 찍으면''', '''업체가 입고 · 출고를 기록하면''')
rep("""<small>내 차 상품화 · '+VER+'</small>""", """<small>내 차 상품화</small>""")
rep('''find:"차량번호 · 차종 · 업체 찾기"''', '''find:"차량번호 · 차종 · 업체 검색"''')
rep('''불러오는 중…''', '''불러오는 중이에요…''', 5)
rep('''"제3조 (이용 요금)''', '''"제3조 (이용요금)''')
rep('''<h3>복사하지 못했어요</h3>''', '''<h3>복사하지 못했습니다</h3>''')
rep('''toast(DEMO?"업체가 보낸 청구서 화면이 열려요 (시연이라 열리지 않아요)":"청구서 주소가 없어요. 업체에 문의해 주세요");''',
    '''toast(DEMO?"시연에서는 청구서 화면이 열리지 않아요.":"청구서를 열지 못했습니다. 업체에 문의해 주세요.");''')

# 6) 쓰기
if os.path.isdir(OUTDIR):
    shutil.rmtree(OUTDIR)
os.makedirs(OUTDIR)
for f in os.listdir(SRCDIR):
    if f != "index.html":
        shutil.copy(SRCDIR + "/" + f, OUTDIR + "/" + f)
open(OUTDIR + "/index.html", "w", encoding="utf-8").write(s)
print("만듦:", OUTDIR, len(s), "글자")
