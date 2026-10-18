"""체크 v48.1 → v50 — 화면 통합 (대표님 시안 v50 확인 10/18: ① «정산 기록» 유지 ② 합쳐진 이름 보이기 ③ «준비 중» 단추 빼기)
  ① 공통 부품 cgg-j4 1.5 → 1.9 (디자인/공통 — 글자 그대로 바꿔 끼움)
  ② 머리말: 공통 CGG.header 가 그림 (워시 v132 와 같은 방식 — 예전 단추는 #hdrOld 에 숨겨 두고 눌린 것만 넘김)
     차례 = 공지 → 도움말 → 주소 → 새로고침 → 30초마다 → 연결됨 → 사람 단추 · 왼쪽 «성능점검 정산 · 체크 v50 · 10/18»
  ③ 메뉴: 홈 → 정산 기록 → 매출 → 월별 청구서 → 입·출금 내역 → 세금계산서 → 배달 · 재검사 알림 → 설정 (CGG.nav · 기능 찾기 = 메뉴 줄 오른쪽 끝)
     폰 아래 탭 = 홈 · 정산 기록 · 월별 청구서 · 입·출금 · 전체(공통 전체 메뉴 판)
  ④ 할 일 띠 + [해결하러 가기] (CGG.todoBand): 월별 청구서 · 입금 내역
  ⑤ 월별 청구서: 숫자 칸 5 → 4 (세금계산서 안 끊음은 띠로) · 아래 단추 줄(인쇄 · 그림 · 엑셀) → 표 위 · «청구 내역 보기» 설명 카드는 접힘
  ⑥ 입금 내역: 도구줄 → 숫자 칸 → 표 차례 · 은행 엑셀 카드 접힘 · 버튼 없는 붙여넣기 카드 뺌
  ⑦ «준비 중» 단추를 실제로 되게 (대표님 10/18 고침 — v50_단추.js). 화면만 · 이미 있는 서버 창구로 되는 것은 바로,
     서버 새 창구가 필요한 것은 가능한 데까지 하고 서버 방 요청서로 묶음. 그래도 동작이 안 붙은 단추는 «준비 중» 글 없이 숨김
  ⑧ 설정 › «직원 계정 · 권한» 칸을 «설정 백업»에서 꺼내 따로
기능(서버 부르기 · 저장 · 입금 처리 · 청구서 만들기 · 보내기)은 v48.1 과 같아요. 매출 화면 모양 그대로.
"""
BASE = "/home/user/chagotgan/"
s = open(BASE + "체크/2_차곳간_체크_index_v48.1.html", encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

def cut(start, end, new, keep_end=True):
    """start 부터 end 앞(keep_end) 까지를 new 로"""
    global s
    a = s.find(start); b = s.find(end, a + 1)
    if a < 0 or b < 0 or s.count(start) != 1:
        raise SystemExit("자리 못 찾음: " + start[:60])
    s = s[:a] + new + s[b if keep_end else b + len(end):]

# ① 공통 부품 1.5 → 1.9
rep(open(BASE + "디자인/공통/cgg-j4.css", encoding="utf-8").read(), open(BASE + "디자인/공통/cgg-j4-1.9.css", encoding="utf-8").read())
rep(open(BASE + "디자인/공통/cgg-j4.js", encoding="utf-8").read(), open(BASE + "디자인/공통/cgg-j4-1.9.js", encoding="utf-8").read())

# ② 머리말 틀 — 새 윗줄 #hdrTop + 예전 윗줄은 #hdrOld 에 숨김 (id 그대로)
rep('''  <div class="cgg-hdr" id="cggHdr">
    <div class="cgg-top">
      <div class="cgg-brand">''', '''  <div class="cgg-hdr" id="cggHdr">
    <div class="cgg-top" id="hdrTop"></div>
    <div id="hdrOld" hidden><div class="chk-oldtop">
      <div class="cgg-brand">''')
rep('''<button class="hb" id="btnOut" hidden>로그아웃</button>
      </div>
    </div>''', '''<button class="hb" id="btnOut" hidden>로그아웃</button>
      </div>
    </div></div>''')
rep('''    $("dbState").innerHTML='연결됨 <span id="clock"></span>';''',
    '''    $("dbState").innerHTML='연결됨 <span id="clock"></span>';
    CHK_CONN=true; try{ chkHdrSync(); }catch(e){}   /* v50: 머리말 «연결됨» (초록 점) */''')
rep('''    $("dbState").textContent="연결 안 됨";''',
    '''    $("dbState").textContent="연결 안 됨";
    CHK_CONN=false; try{ chkHdrSync(); }catch(e){}''')
rep('''$("hdVer").textContent="체크 v48.1 · "''', '''$("hdVer").textContent="체크 v50 · "''')

# ③ 메뉴 묶음 · 그리기 (v50_메뉴.js)
cut("var JOBS=[", "/* 화면 이름 ↔ 주소에 쓰는 한글 이름 */", open(BASE + "체크/도구/v50_메뉴.js", encoding="utf-8").read() + "\n")
rep('''  backup:"자료", trash:"휴지통", help:"도움말" };''', '''  backup:"자료", staff:"직원계정", trash:"휴지통", help:"도움말" };''')
rep('''  partner:["set"], price:["set"],''', '''  partner:["set"], staff:["set"], price:["set"],''')

# ④ 할 일 띠 — 화면을 그린 뒤 «제목 + 설명» 바로 아래
rep('''  try { chkOffLine(); } catch(err) {}  /* 상호 아랫줄 (UI 1.0) */
}
var AFTER={};''', '''  try { chkOffLine(); } catch(err) {}  /* 상호 아랫줄 (UI 1.0) */
  try { chkBand(); } catch(err) {}     /* v50: 할 일 띠 */
}
var AFTER={};
/* ═══ v50 할 일 띠 + [해결하러 가기] (SKILL.md 4. 화면 뼈대 — 제목 바로 아래) ═══ */
var BANDS={};
function chkBand(){
  var f=BANDS[page]; if(!f||!window.CGG||!CGG.todoBand) return;
  var cf=f(); if(!cf) return;
  var h=$("main").querySelector(".cgg-head"); if(!h||!h.parentNode) return;
  var bd=document.createElement("div"); bd.id="chkBand"; h.parentNode.insertBefore(bd,h.nextSibling);
  CGG.todoBand(bd,cf);
}
BANDS.bill=function(){
  if(!BILLS.length) return {count:1, tone:"run", text:ymText(ST.ym)+" 청구서를 아직 안 만들었어요", go:"청구서 만들러 가기",
    onGo:function(){ var b=$("bMake"); if(b) CGG.spot(b); }};
  var ns=BILLS.filter(function(x){ return !x.sent; }).length, up=BILLS.filter(function(x){ return x.left>0; }).length,
      nt=BILLS.filter(function(x){ return x.tax==="안 끊음"; }).length, tx=nt?" · 세금계산서 안 끊음 "+nt+"곳":"";
  if(!ns&&!up&&nt) return {count:nt, tone:"run", text:"세금계산서를 안 끊는 곳 "+nt+"곳 — 맞는지 거래처에서 봐요", go:"거래처 보기", onGo:function(){ go("partner"); }};
  return {count:ns+up, text:"안 보낸 곳 "+ns+"곳 · 입금 대기 "+up+"곳"+tx, empty:"모두 보냈고 입금도 다 됐어요",
    onGo:function(){ BILL_F=ns?"notsent":"unpaid"; ts("bill").page=1; draw(); var t=$("bill-blk"); if(t) CGG.spot(t); }};
};
BANDS.deposit=function(){
  var w=DEPS.filter(function(d){ return d.state==="확인 대기"; });
  return {count:w.length, text:"누가 보낸 돈인지 확인할 입금 "+w.length+"건 · "+won(w.reduce(function(t,d){ return t+(Number(d.amount)||0); },0))+"원",
    empty:"확인할 입금이 없어요",
    onGo:function(){ var x=ts("dep"); x.tf="확인 필요"; x.page=1; draw(); var t=$("dep-blk"); if(t) CGG.spot(t); }};
};''')

# ⑤ 월별 청구서
rep('''  card(esc(ymText(ST.ym))+'분 청구서 <span class="rt">청구처 단위</span>',"",
    sums([["청구처",made+"곳"],["검사 건수",won(cars)+"건"],["총 청구액",won(tot)+"원"],
          ["세금계산서 안 끊음",notax+"곳"],["보낸 곳",sent+" / "+made]],"c5"))+''',
    '''  sums([["청구처",made+"곳"],["검사 건수",won(cars)+"건"],["총 청구액",won(tot)+"원"],["보낸 곳",sent+"곳"]])+   /* v50: 숫자 칸 4개 (세금계산서 안 끊음은 할 일 띠로) */''')
rep('''                .map(function(o){ return '<option value="'+o[0]+'"'+(BILL_F===o[0]?" selected":"")+'>'+o[1]+'</option>'; }).join("")+'</select>',
      tools:'<button class="btn">선택한 줄 지우기</button>'})+''',
    '''                .map(function(o){ return '<option value="'+o[0]+'"'+(BILL_F===o[0]?" selected":"")+'>'+o[1]+'</option>'; }).join("")+'</select>',
      tools:'<button class="btn" id="bPrint">미리보기 · 인쇄</button><button class="btn" id="bPng">그림으로 받기</button>'+   /* v50: 아래 단추 줄 → 표 위 */
            '<button class="btn" id="bXls">엑셀 (요약)</button><button class="btn" id="bXlsAll">엑셀 (명세 포함)</button>'+
            '<button class="btn" id="bMove">고른 청구서 → 다른 청구처로</button><button class="btn" id="bUnsend">선택한 곳 보냄 표시 지우기</button>'+
            '<button class="btn danger" id="bDel">선택한 줄 지우기</button>'})+''')
rep('''    billDetail()+
    '<div class="tools" style="margin:12px 0 0">'+
      '<button class="btn primary" id="bPrint">청구서 미리보기 · 인쇄</button>'+
      '<button class="btn go" id="bPng">청구서 그림으로 받기 (청구처별)</button>'+
      '<button class="btn" id="bXls">엑셀 다운로드 (요약)</button>'+
      '<button class="btn" id="bXlsAll">명세까지 포함해 다운로드</button>'+
      '<button class="btn">고른 청구서 → 다른 청구처로</button>'+
      '<button class="btn">선택한 곳 보냄 표시 지우기</button>'+
    '</div>')+''', '''    billDetail())+''')
rep("'아래 인쇄 · 그림 · 엑셀은 <b>고른 곳만</b>", "'표 위 인쇄 · 그림 · 엑셀은 <b>고른 곳만</b>")
rep('''  card('«청구 내역 보기»를 누르면 열리는 화면''',
    '''  '<details class="chk-fold"><summary>«청구 내역 보기»를 누르면 열리는 화면 · 펼쳐 보기</summary>'+
  card('«청구 내역 보기»를 누르면 열리는 화면''')
rep('''    '(카카오가 미리보기로 먼저 열 때도 있어서 참고로만 봐 주세요).</p>');
};
AFTER.bill=function(){''', '''    '(카카오가 미리보기로 먼저 열 때도 있어서 참고로만 봐 주세요).</p>')+'</details>';
};
AFTER.bill=function(){''')

# ⑥ 입금 내역 — 도구줄 → 숫자 칸 → 표 · 준비 중 단추 뺌 · 붙여넣기 카드 뺌 · 은행 엑셀 접힘
a = s.find('  subTabs("deposit")+\n  (function(){\n    var inM=0,ok=0,wait=0;')
b = s.find('  card("입금 처리","팝빌에서 계좌 거래내역을 가져와 청구서와 맞춰요.",', a)
if a < 0 or b < 0: raise SystemExit("입금 숫자 칸 자리 못 찾음")
kpi = s[a + len('  subTabs("deposit")+\n'):b]
s = s[:a] + '  subTabs("deposit")+\n' + s[b:]
rep('''      '<button class="btn">알림 설정</button>'+
      '<button class="btn">이 기간 엑셀 다운로드</button>'+
''', '''      '<button class="btn" id="depAlarm">알림 설정</button>'+
      '<button class="btn" id="depXlsDown">이 기간 엑셀 다운로드</button>'+
''')
rep('''  card("들어온 금액","",
    tableBlock("dep",[''', kpi + '''  card("들어온 금액","",
    tableBlock("dep",[''')
a = s.find('  card("수집함에서 붙여넣기"'); b = s.find('btns([["가져오기","primary"],["지우기",""]]))+\n', a)
if a < 0 or b < 0 or b - a > 600: raise SystemExit("붙여넣기 카드 자리 못 찾음")
PASTE = """  '<details class="chk-fold" id="depPasteFold"><summary>통장 문자 · 시트 줄 붙여넣기 · 펼쳐 보기</summary>'+
  card("통장 문자 · 시트 줄 붙여넣기","받은 입금 문자나 구글 시트 줄을 그대로 붙여 넣어요. 문자는 빈 줄로 나눠 여러 개를 한 번에 넣어요.",
    '<textarea id="depPaste" style="width:100%;min-height:120px" placeholder="[신한] 10/08 14:21 123-456-789012 입금 1,243,000 홍길동"></textarea>'+
    '<div class="tools"><button class="btn primary" id="depPasteGo">가져오기</button><button class="btn" id="depPasteClr">지우기</button></div>')+'</details>'+
"""
s = s[:a] + PASTE + s[b + len('btns([["가져오기","primary"],["지우기",""]]))+\n'):]
# 입금 내역 설명 한두 줄로
a = s.find('  return head("입금 내역","'); b = s.find('")+', a)
if a < 0 or b < 0 or b - a > 400: raise SystemExit("입금 설명 자리 못 찾음")
s = s[:a] + '  return head("입금 내역","팝빌에서 들어온 돈을 가져와 청구서와 자동으로 맞춰요. 애매한 것만 «확인 필요»로 남겨요.' + s[b:]
# 배달 안쪽 탭은 공통 메뉴(메뉴 밑 줄 · 폰 작은 탭)에만 — 화면 안에서 두 번 그리지 않음
rep('''function delivTabs(now){ return subBar(DELIVSUB, now); }''', '''function delivTabs(now){ return ""; }   /* v50: 공통 메뉴에 이미 보여요 */''')
# 휴지통(지운 입금) — 서버 depositTrash 목록
rep('''  var T=[];
  return head("지운 내역"''', '''  var T=(typeof TRASHDEP!=="undefined"&&TRASHDEP)||[];   /* v50: 서버 depositTrash (v50_단추.js) */
  return head("지운 내역"''')
rep('''  remind:["remind","set"],''', '''  remind:["remind","set"], sms:["pop"],''')
rep('''  card("은행 거래내역 엑셀 가져오기",''',
    '''  '<details class="chk-fold" id="depXlsFold"><summary>은행 거래내역 엑셀 가져오기 · 펼쳐 보기</summary>'+
  card("은행 거래내역 엑셀 가져오기",''')
rep('''    : '<p class="note">엑셀 가져오기는 대표만 할 수 있어요.</p>');
};
AFTER.deposit=''', '''    : '<p class="note">엑셀 가져오기는 대표만 할 수 있어요.</p>')+'</details>';
};
AFTER.deposit=''')

# ⑧ 직원 계정 · 권한 — 설정 백업에서 꺼내 따로
STAFFCARD = '''  card("직원 권한",
    "체크에 들어올 수 있는 사람을 정해요. 대표는 모든 화면을, 직원은 설정을 뺀 화면을 볼 수 있어요. "+
    "새 직원은 체크에 처음 로그인할 때 6자 이상 비밀번호를 정하고, 휴대폰 문자로 확인해요. 넣은 뒤 바로 알려 주세요.",
    '<div id="staffBox"><div class="hint">불러오는 중이에요…</div></div>')+
'''
rep(STAFFCARD, '')
rep('''AFTER.backup=function(){ staffLoad(); };''', '''AFTER.backup=function(){};
/* v50: 설정 › 직원 계정 · 권한 (예전 «설정 백업» 안에 있던 카드 그대로) */
PAGE.staff=function(){
  return head("직원 계정 · 권한","체크에 들어올 수 있는 사람과 권한을 정해요.")+
''' + STAFFCARD.rstrip("+\n") + ''';
};
AFTER.staff=function(){ staffLoad(); };''')

# 판 번호
rep('''<title>차곳간체크</title>''', '''<title>차곳간체크</title>
<!-- 체크 v50 · 화면 통합 (공통 부품 cgg-j4 1.9) · 2026-10-18 · 만든 도구: 체크/도구/만들기_체크_v50.py -->''')

# 덧붙임 CSS (맨 끝 — 앞의 값을 덮어야 해서)
rep('''</style>

<script>
/* ===== 체크 v24 — 공통 부품 부르기 ===== */''', '''</style>
<style id="chk-v50">
/* v50 — 작은 탭(#cggSub)은 폰에서만: 넓은 화면은 공통 메뉴 밑 줄 · 왼쪽 펼침에 같은 칸 */
@media (min-width:601px){ #cggSub{display:none!important} }
/* «준비 중» 글은 없애요 — 동작이 안 붙은 단추가 혹시 남으면 보이지 않게 (v50_단추.js 가 모두 붙여요) */
button[data-soon],select[data-soon]{display:none!important}
/* 접힌 카드 (도움 · 설명 · 자주 안 쓰는 칸) */
.chk-fold{margin:0 0 16px}
.chk-fold>summary{cursor:pointer;list-style:none;min-height:50px;display:flex;align-items:center;padding:0 20px;background:var(--surface);border-radius:var(--r-card);box-shadow:var(--sh);font-size:14px;font-weight:700;color:var(--muted)}
.chk-fold>summary::-webkit-details-marker{display:none}
.chk-fold>summary::before{content:"▸";margin-right:8px;color:var(--blue)}
.chk-fold[open]>summary::before{content:"▾"}
.chk-fold[open]>summary{border-radius:var(--r-card) var(--r-card) 0 0;box-shadow:none;border-bottom:1px solid var(--line)}
.chk-fold>.card{margin:0;border-top-left-radius:0;border-top-right-radius:0}
@media (max-width:600px){ .chk-fold{margin-bottom:10px} .chk-fold>summary{min-height:42px;padding:0 14px;font-size:13px;border-radius:14px} }
/* 머리말 «연결 안 됨» */
.cgg-hb.cgg-conn.chk-off{color:#FFB4A8} .cgg-hb.cgg-conn.chk-off i{background:#FF8B82;box-shadow:0 0 0 3px #FF8B8233}
@media (min-width:1000px){ .lay-side .cgg-hb.cgg-conn.chk-off,.lay-icon .cgg-hb.cgg-conn.chk-off{color:var(--stop)} }
</style>

<script>
/* ===== 체크 v24 — 공통 부품 부르기 ===== */''')

# «준비 중» 단추를 동작하게 (v50_단추.js) — 맨 끝 공통 부품 부르기 바로 앞
rep('''<script>
/* ===== 체크 v24 — 공통 부품 부르기 ===== */''', open(BASE + "체크/도구/v50_단추.js", encoding="utf-8").read() + '''
<script>
/* ===== 체크 v24 — 공통 부품 부르기 ===== */''')

open(BASE + "체크/2_차곳간_체크_index_v50.html", "w", encoding="utf-8").write(s)
print("만듦: 체크/2_차곳간_체크_index_v50.html", len(s))
