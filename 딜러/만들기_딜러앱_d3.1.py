"""딜러앱 화면 d3.0 → d3.1 새 판을 만든다. 바탕 파일과 공통 부품은 읽기만 한다.
쓰는 법: python3 딜러/만들기_딜러앱_d3.0.py && python3 딜러/만들기_딜러앱_d3.1.py
결과: 딜러/3_딜러앱_화면_d3.1/ (index.html + 아이콘 · manifest 그대로 복사)
바꾸는 것 (결정 기록 2026-10-15):
  - 디자인 방 공통 부품 cgg-j4 1.0 (디자인/공통/) 을 README 대로 붙임
    → 메뉴 배치 셋(처음엔 가로 메뉴) · 폰 아래 탭바 · 홈 할 일 카드 · 한국어 낱말 단위 줄바꿈
  - 홈 숫자 카드 4 · 할 일 3, 내 차 표 «작업» 열, 맨 앞 칸 «지금 위치» — 가안대로 확정
  - 내 정보에 «화면 설정 — 메뉴 배치» 고르기 칸
안 바꾸는 것: 로그인 · 동의 · 서버 연결(dealer-api) · 차 상세 기록 · 알림 · 청구서 · 카히스토리 내용
안 넣는 것: 개인정보 · 차량 매칭 새 화면 (보안 방 검토 전)"""
import os, shutil
ROOT = "/home/user/chagotgan"
SRCDIR = ROOT + "/딜러/3_딜러앱_화면_d3.0"
OUTDIR = ROOT + "/딜러/3_딜러앱_화면_d3.1"
J4CSS = open(ROOT + "/디자인/공통/cgg-j4.css", encoding="utf-8").read()
J4JS = open(ROOT + "/디자인/공통/cgg-j4.js", encoding="utf-8").read()
s = open(SRCDIR + "/index.html", encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    if s.count(old) != count:
        raise SystemExit("찾은 개수 다름(%d): %s" % (s.count(old), old[:90]))
    s = s.replace(old, new)

# 1) 판 번호
rep("<!-- 차곳간 딜러앱 화면 · 판 d3.0 (2026-10-14, J안 4판 · 숫자·할 일은 가안)",
    "<!-- 차곳간 딜러앱 화면 · 판 d3.1 (2026-10-15, J안 4판 · 공통 부품 cgg-j4 1.0 · 홈은 2026-10-15 확정안) · 바탕 d3.0")
rep('var VER="d3.0";', 'var VER="d3.1";')

# 2) d3.0 의 «PC 넓은 화면» 규칙은 빼고 (공통 부품이 메뉴 배치를 맡음), 딜러 본문 규칙 + 공통 부품을 맨 끝에
a = s.index("/* PC — 넓은 화면은 왼쪽 남색 메뉴 + 본문"); b = s.index("</style>")
SHELL = r'''/* d3.1 — 공통 부품 틀 안의 딜러 본문 (로그인 · 동의는 예전 휴대폰 모양 그대로) */
body.shell{padding:0;background:var(--bg)}
.phone.cgg-app{max-width:none;height:auto;min-height:100vh;min-height:100dvh;border-radius:0;box-shadow:none;display:block;overflow:visible;margin:0}
.cgg-right .bell{position:relative;border:0;border-radius:8px;height:32px;padding:0 12px;background:rgba(255,255,255,.12);color:#fff;font-size:13px}
.cgg-biz small{display:block;opacity:.72;font-size:11.5px}
.stack{display:flex;flex-direction:column;gap:10px;max-width:1180px;margin:0 auto}
.stack>*{flex-shrink:0;min-width:0}
.backrow{display:flex;align-items:center;gap:8px}
.backrow button{border:0;background:var(--card);border-radius:10px;height:36px;padding:0 12px;font-weight:700;color:var(--blue);box-shadow:var(--shadow)}
.cgg-app .sheet-wrap{position:fixed;z-index:70}
.cgg-app .sheet{padding-bottom:calc(22px + env(safe-area-inset-bottom,0px))}
.cgg-app .toast{position:fixed;z-index:70;bottom:calc(72px + env(safe-area-inset-bottom,0px))}
.cgg-acts{margin:0}
@media (min-width:601px){.more-only{display:none}}
@media (min-width:1000px){
  .stack{gap:16px}
  .hello h1{font-size:26px} .hello small{font-size:13px} .hello p{font-size:14px}
  .kpis{grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
  .kpi{border-radius:18px;padding:18px 20px}
  .kpi small{font-size:13px;padding-right:80px} .kpi strong{font-size:30px;margin-top:8px} .kpi strong em{font-size:14px}
  .kpi .tr{font-size:12.5px;margin-top:4px} .kpi svg.sp{width:72px;height:26px;right:18px;top:18px}
  .lcard,.help,.more,.card{border-radius:18px}
  .mlist{display:none} .tbl{display:block;overflow-x:auto}
  .tbl table{width:100%;border-collapse:collapse;font-size:14px;table-layout:fixed;min-width:860px}
  .tbl th{height:40px;padding:0 14px;text-align:left;font-size:12.5px;color:var(--sub);border-bottom:1px solid var(--line);white-space:nowrap}
  .tbl td{height:50px;padding:0 14px;border-bottom:1px solid var(--line);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .tbl tbody tr{cursor:pointer} .tbl tbody tr:hover td{background:var(--hov)}
  .tbl .n{text-align:right;font-variant-numeric:tabular-nums} .tbl .c{text-align:center}
  .tbl th:first-child,.tbl td:first-child{padding:0;text-align:center;overflow:visible}
  .tbl input{width:18px;height:18px;accent-color:var(--blue)}
  .cgg-app .toast{left:auto;right:32px;bottom:32px;width:360px}
  .cgg-app .sheet-wrap{align-items:center;justify-content:center}
  .cgg-app .sheet{max-width:440px;border-radius:20px}
  .lay-side .cgg-right .bell,.lay-icon .cgg-right .bell{background:var(--bg);color:var(--ink);height:36px;padding:0 14px}
}
'''
s = s[:a] + SHELL + "\n" + J4CSS + "\n" + s[b:]

# 3) 홈 할 일 — 공통 부품 자리로 (색은 run · chk · stop 만)
i = s.index("  var A=[\n    g.arr.length?"); j = s.index("  var d=g.wk-g.pwk;")
A = r'''  var A=[
    g.arr.length?{tone:"chk",icon:"car",title:"도착한 차 "+g.arr.length+"대 «상품화 완료» 누르기",sub:names(g.arr)+" · 확인하고 눌러 주세요",go:"도착"}
                :{tone:"run",icon:"car",title:"«상품화 완료»를 기다리는 차가 없어요",sub:"도착한 차가 생기면 여기에 알려 드려요",go:"도착"},
    g.moving.length?{tone:"run",icon:"out",title:"출고된 차 "+g.moving.length+"대 받을 준비",sub:g.moving.map(function(c){return nm2(c)+" → "+(c.dest||c.where);}).slice(0,2).join(" · "),go:"출고"}
                   :{tone:"run",icon:"out",title:"이동 중인 차가 없어요",sub:"업체에서 출고되면 여기에 알려 드려요",go:"출고"},
    g.slow.length?{tone:"stop",icon:"today",title:"작업이 3일 넘게 걸리는 차 "+g.slow.length+"대",sub:g.slow.slice(0,2).map(function(c){return nm2(c)+"("+c.where+")";}).join(" · ")+" · 업체에 확인해 보세요",go:"작업 중"}
                 :{tone:"run",icon:"today",title:"3일 넘게 걸리는 차가 없어요",sub:"작업이 늦어지면 여기에 알려 드려요",go:"작업 중"}];
  S.todo=A;
'''
s = s[:i] + A + s[j:]
rep('''   '<div class="acts">'+A.map(function(a){return '<button class="act" data-act="go" data-v="'+a[4]+'"><span class="ico '+a[0]+'">'+ICON[a[1]]+'</span><span class="tx"><b>'+esc(a[2])+'</b><small>'+esc(a[3])+'</small></span><span class="ar">→</span></button>';}).join("")+'</div>'+''',
    '''   '<div class="cgg-acts"></div>'+''')

# 4) 전체 메뉴 (폰 아래 탭바 «전체») — 넓은 화면에서는 위 메뉴가 다 보여서 숨김
rep('''  return '<div class="more">'+M.map(''', '''  return '<div class="more more-only">'+M.map(''')

# 5) 내 정보 — 화면 설정 (메뉴 배치 고르기)
rep("""  '<div class="sec">번호</div>'+""", """  '<div class="sec">화면 설정 — 메뉴 배치 (넓은 화면에서만 바뀌어요)</div>'+
  '<div class="card" id="layBox"></div>'+
  '<div class="sec">번호</div>'+""")

# 6) 그리기 — 머리말 · 큰 메뉴 · 본문 · 아래 탭바 (공통 부품 이름표)
rep('''  else if(S.view==="car")h=topBar("차 상세","상품화 진행 과정",true)+demoBar()+'<div class="body">'+carView()+'</div>'+tabs();
  else{
    var co=(latest()[0]||{}).company||"";
    var sub=(S.tab==="cars"||S.tab==="home")?[co,S.name||telFmt(S.phone)].filter(Boolean).join(" · "):S.tab==="bills"?"여러 업체 한 번에 결제":S.tab==="hist"?"사고·보험 이력 조회":"";
    var V={home:homeView,cars:carsView,noti:notiView,bills:billsView,hist:histView,me:meView,more:moreView}[S.tab]||homeView;
    h=topBar(TITLES[S.tab]||"홈",sub)+demoBar()+'<div class="body" id="bd">'+V()+'</div>'+tabs();
  }''', '''  else if(S.view==="car")h=shell('<div class="backrow"><button data-act="back" aria-label="내 차로 돌아가기">‹ 내 차</button></div>'+carView());
  else{
    var V={home:homeView,cars:carsView,noti:notiView,bills:billsView,hist:histView,me:meView,more:moreView}[S.tab]||homeView;
    h=shell(V());
  }''')
rep('''  ph.innerHTML=h;
  bind();
}''', '''  var app=S.view==="main"||S.view==="car";
  ph.className=app?"phone cgg-app":"phone";document.body.classList.toggle("shell",app);
  ph.innerHTML=h;
  if(app)wireShell(ph);
  bind();
}
/* d3.1 — 공통 부품(cgg-j4) 틀 */
var NAVS=[["home","홈","home"],["cars","내 차","car"],["noti","알림","bell"],["bills","청구서","receipt"],["hist","카히스토리","file"],["me","내 정보","user"]];
function shell(body){
  var cur=S.view==="car"?"cars":S.tab,u=S.cars?unread():0,co=(latest()[0]||{}).company||"";
  return '<header class="cgg-hdr"><div class="cgg-top">'+
    '<div class="cgg-brand"><span class="cgg-ci">차</span><div><b>차곳간 딜러</b><small>내 차 상품화 · '+VER+'</small></div></div>'+
    '<div class="cgg-biz"><b>'+(S.name?esc(S.name)+' 딜러':'딜러')+'</b><small>'+esc([co,telFmt(S.phone)].filter(Boolean).join(" · "))+'</small></div>'+
    '<div class="cgg-right"><button class="bell" data-act="tab" data-v="noti">알림'+(u?'<span class="dot">'+(u>99?"99+":u)+'</span>':'')+'</button></div></div>'+
    '<nav class="cgg-nav" aria-label="메뉴">'+NAVS.map(function(n){return '<button data-act="tab" data-v="'+n[0]+'"'+(cur===n[0]?' aria-selected="true"':'')+'>'+CGG.ic(n[2])+'<span class="lbl">'+n[1]+'</span></button>';}).join("")+'</nav></header>'+
    '<main class="cgg-main" id="bd"><div class="stack">'+demoBar().replace('style="','style="border-radius:10px;')+body+'</div></main><nav class="cgg-tbar"></nav>';
}
function wireShell(ph){
  CGG.layout.init(ph,"cgg_dealer_layout");
  var cur=S.view==="car"?"cars":S.tab;
  CGG.tabbar(ph.querySelector(".cgg-tbar"),[{key:"home",icon:"home",label:"홈"},{key:"cars",icon:"car",label:"내 차"},{key:"noti",icon:"bell",label:"알림"},{key:"bills",icon:"receipt",label:"청구서"},{key:"more",icon:"more",label:"전체"}],
    (cur==="hist"||cur==="me")?"more":cur,function(k){act("tab",{getAttribute:function(){return k;}});});
  var td=ph.querySelector(".cgg-acts");
  if(td&&S.todo)CGG.todos(td,S.todo,function(i){act("go",{getAttribute:function(){return S.todo[i].go;}});});
  var lb=$("layBox");if(lb)CGG.layout.chooser(lb,function(v){toast("메뉴 배치를 «"+CGG.layout.name(v)+"»로 바꿨어요 · 이 기기에만 저장돼요");});
}''')
# 화면을 바꾸면 맨 위로
rep('''    var bd=$("bd");if(bd)bd.scrollTop=0;return;}''', '''    try{window.scrollTo(0,0);}catch(e){}return;}''')
rep('''render();var b2=$("bd");if(b2)b2.scrollTop=0;return;}''', '''render();try{window.scrollTo(0,0);}catch(e){}return;}''')

# 7) 공통 부품 스크립트 — 그대로. 저장된 로그인으로 바로 그리는 «시작» 앞에 둬야 CGG 가 있어요
rep("/* ---------- 시작 ---------- */", J4JS + "\n/* ---------- 시작 ---------- */")

# 8) 쓰기
if os.path.isdir(OUTDIR):
    shutil.rmtree(OUTDIR)
os.makedirs(OUTDIR)
for f in os.listdir(SRCDIR):
    if f != "index.html":
        shutil.copy(SRCDIR + "/" + f, OUTDIR + "/" + f)
open(OUTDIR + "/index.html", "w", encoding="utf-8").write(s)
print("만듦:", OUTDIR, len(s), "글자")
