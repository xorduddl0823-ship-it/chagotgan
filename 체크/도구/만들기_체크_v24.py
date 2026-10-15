"""체크 v23 → 체크 v24 새 판. v23 는 읽기만 한다. (서버 check-api v24 짝)
쓰는 법: python3 체크/도구/만들기_체크_v22.py && python3 체크/도구/만들기_체크_v23.py && python3 체크/도구/만들기_체크_v24.py
바꾸는 것:
  1) 디자인 방 공통 부품 cgg-j4 1.0 붙이기 (디자인/공통/README.md 그대로)
     메뉴 배치 셋(가로 · 세로 · 아이콘) · 폰 아래 탭바 · 홈 할 일 카드 3장
     — 옛 머리말 모양 규칙과 부딪히지 않게 머리말은 새 이름표(cgg-*)로 다시 짬. JS 가 쓰는 id 는 그대로
       (단 큰 메뉴 #tabs → #cggNav, 작은 탭 #setSub → #cggSub : 옛 모양 규칙 70여 줄이 이 두 id 에 걸려 있어서)
  2) 서버 v24 응답을 화면이 안내로 보여 주기
     - 「검사소를 골라 주세요」 → 검사소 코드 넣는 창
     - 「…다시 로그인해 주세요」(사진 읽기 거절)로 로그아웃되지 않게 — 진짜 로그인 문제일 때만 로그아웃
"""
import re
BASE = "/home/user/chagotgan/체크/"
SRC = BASE + "2_차곳간_체크_index_v23.html"
OUT = BASE + "2_차곳간_체크_index_v24.html"
CSS = open("/home/user/chagotgan/디자인/공통/cgg-j4.css", encoding="utf-8").read()
JS = open("/home/user/chagotgan/디자인/공통/cgg-j4.js", encoding="utf-8").read()
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

# ── 1) 머리말 · 메뉴 · 본문 · 탭바 틀 ──
i = s.index('<div class="wrap pc" id="wrap" hidden>')
j = s.index('<main id="main"></main>', i) + len('<main id="main"></main>')
OLD = s[i:j]
for need in ['id="hdVer"', 'id="hdOff"', 'id="hdWho"', 'id="btnHelp"', 'id="btnRefresh"', 'id="pollSel"', 'id="dbState"',
             'id="btnLink"', 'id="btnTheme"', 'id="btnTrash"', 'id="hWho"', 'id="btnOut"', 'id="tabs"', 'id="setSub"', 'id="bar"']:
    if need not in OLD:
        raise SystemExit("머리말에서 못 찾음: " + need)
NEWHDR = '''<div class="wrap pc cgg-app" id="wrap" hidden>
  <div class="cgg-hdr" id="cggHdr">
    <div class="cgg-top">
      <div class="cgg-brand"><span class="cgg-ci">차</span><div><b>차곳간 체크</b><small id="hdVer">연결 중…</small></div></div>
      <div class="cgg-biz" id="hdOff"><b>—</b><small>&nbsp;</small></div>
      <div class="cgg-right">
        <span class="who" id="hdWho" hidden><b>—</b><br>&nbsp;</span>
        <button class="hb cgg-wide" id="btnHelp">도움말</button>
        <button class="hb" id="btnRefresh">↻ 새로고침</button>
        <select id="pollSel" class="hb cgg-wide" title="자동으로 얼마마다 확인할지">
          <option value="0">자동 끄기</option><option value="15000">15초마다</option>
          <option value="30000" selected>30초마다</option><option value="60000">1분마다</option>
          <option value="180000">3분마다</option>
        </select>
        <button class="hb cgg-wide" id="dbState" hidden>연결됨 <span id="clock"></span></button>
        <button class="hb cgg-wide" id="btnLink" title="이 화면 주소를 복사합니다">링크 복사</button>
        <button class="hb cgg-wide" id="btnTheme" hidden>화면</button>
        <button class="hb cgg-wide" id="btnTrash" hidden title="지운 자료 되돌리기">휴지통</button><button class="hb me" id="hWho" title="내 정보"><span class="mypglb"><span class="t-wide">마이페이지 · 휴지통 ▾</span><span class="t-narrow">내 정보</span></span></button><button class="hb" id="btnOut" hidden>로그아웃</button>
      </div>
    </div>
    <nav class="cgg-nav" id="cggNav" role="tablist" aria-label="메뉴"></nav>
  </div>
  <div class="cgg-sub" id="cggSub" hidden></div>
  <div class="cgg-main"><div id="bar"></div>
  <main id="main"></main></div>
  <nav class="cgg-tbar" id="cggTbar"></nav>'''
s = s[:i] + NEWHDR + s[j:]

# 큰 메뉴 · 작은 탭 그리기 — 아이콘 · 이름표 · 탭바 · hasSub
rep('''  $("tabs").innerHTML=JOBS.map(function(t){
    var on=(G[0]===t[0]);
    return '<button role="tab" aria-selected="'+(on?"true":"false")+'" data-go="'+t[0]+'">'+t[1]+'</button>';
  }).join("");
  var subs=G[1];
  $("setSub").hidden=!subs;''',
'''  $("cggNav").innerHTML=JOBS.map(function(t){
    var on=(G[0]===t[0]);
    return '<button role="tab" aria-selected="'+(on?"true":"false")+'" data-go="'+t[0]+'">'+cggIc(JOBIC[t[0]])+'<span class="lbl">'+t[1]+'</span></button>';
  }).join("");
  var subs=G[1];
  $("cggSub").hidden=!subs;
  $("wrap").classList.toggle("hasSub", !!subs);
  cggTabbar(G[0]);''')
rep('''  if(subs) $("setSub").innerHTML=subs.map(function(s){''', '''  if(subs) $("cggSub").innerHTML=subs.map(function(s){''')
rep('''var SALESUB=[["sales","매출 내역"],["files","자료 올리기"]];''',
    '''var SALESUB=[["sales","매출 내역"],["files","자료 올리기"]];
/* 큰 메뉴 아이콘 (공통 부품 CGG.ic 이름) */
var JOBIC={home:"home",sales:"chart",history:"today",bill:"file",deposit:"wallet",hometax:"receipt",remind:"bell",set:"gear"};
function cggIc(n){ return (window.CGG&&CGG.ic)?CGG.ic(n):""; }
/* 폰 아래 탭바 5칸 — 홈 · 정산 기록 · 입출금 · 계산서 · 전체 */
function cggTabbar(grp){
  if(!window.CGG) return;
  var main=["home","history","deposit","hometax"];
  CGG.tabbar($("cggTbar"),[{key:"home",icon:"home",label:"홈"},{key:"history",icon:"today",label:"정산 기록"},
    {key:"deposit",icon:"wallet",label:"입출금"},{key:"hometax",icon:"receipt",label:"계산서"},{key:"all",icon:"more",label:"전체"}],
    main.indexOf(grp)>=0?grp:"all", function(k){ if(k==="all") cggAllMenu(); else go(k); });
}
/* 「전체」 — 큰 메뉴 8개를 창으로 */
function cggAllMenu(){
  $("sheet").innerHTML='<h3 style="margin:0 0 12px">전체 메뉴</h3><div class="cgg-allm">'+JOBS.map(function(t){
    return '<button type="button" data-allgo="'+t[0]+'">'+cggIc(JOBIC[t[0]])+'<span>'+t[1]+'</span></button>'; }).join("")+'</div>'+
    '<div class="sheetbtns"><button class="btn" id="allClose">닫기</button></div>';
  openSheet();
  $("allClose").onclick=closeSheet;
  Array.prototype.forEach.call($("sheet").querySelectorAll("[data-allgo]"),function(b){
    b.onclick=function(){ closeSheet(); go(b.getAttribute("data-allgo")); }; });
}''')

# 홈 — 할 일 카드 3장 자리 (머리 바로 아래)
rep('''      String(_n.getHours()).padStart(2,"0")+':'+String(_n.getMinutes()).padStart(2,"0")+' 기준</div></div>'+''',
    '''      String(_n.getHours()).padStart(2,"0")+':'+String(_n.getMinutes()).padStart(2,"0")+' 기준</div></div>'+
  '<div class="cgg-acts" id="cggActs"></div>'+''')
rep('''AFTER.home=function(){''', '''AFTER.home=function(){ if(window.cggTodos) cggTodos();''')

# ── 2) 서버 v24 응답 ──
rep('''    if(j && j.__err){ var m=String(j.__err); if(/로그인/.test(m)) signOut(true); throw new Error(m); }''',
    '''    if(j && j.__err){ var m=String(j.__err);
      /* 진짜 로그인 문제일 때만 로그아웃 (v24: 사진 읽기 거절 문구의 «다시 로그인해 주세요»로는 나가지 않음) */
      if(/로그인이 (필요|풀렸|만료)/.test(m)) signOut(true);
      else if(/검사소를 골라/.test(m) && window.cggPickOffice) cggPickOffice();
      throw new Error(m); }''')

# 판 번호
rep('''  $("hdVer").textContent="체크 v23 · "''', '''  $("hdVer").textContent="체크 v24 · "''')

# ── 3) 모양: v22 에서 넣은 J 겉모양 덩어리를 걷어내고 → 제품 몫 + 공통 부품(맨 끝) + 붙임 몫 ──
a = s.index('<!-- ===== J안 4판 겉모양 (체크 v22)')
b = s.index('</style>', a) + len('</style>')
PRODUCT = '''<!-- ===== 체크 v24 — J안 4판 제품 몫 (색 · 카드 · 버튼 · 표). 머리말 · 메뉴 · 탭바 · 할 일은 아래 공통 부품 ===== -->
<style id="chk-j4">
:root{--bg:#F3F5F8;--surface:#FFFFFF;--surface2:#F7F9FC;--line:#EAECF0;--text:#101828;--muted:#667085;
  --brand:#1668C4;--brand-soft:#E8F1FC;--accent:#0B2545;--sky:#8FC9F2;
  --good:#1E9E5A;--good-soft:#E4F5EC;--warn:#B26B00;--warn-soft:#FFF2DD;--danger:#D64545;--danger-soft:#FDE8E8;
  --shadow:0 1px 2px #1018280d,0 12px 32px -20px #0B254540;--r:18px;--j-ctl:43px}
body{font-family:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif}
.card{border:0;border-radius:18px;box-shadow:var(--shadow);background:var(--surface)}
.btn{min-height:var(--j-ctl);border-radius:12px;border:1px solid #E3E8EE;font-weight:700;font-size:14px;color:#344054;background:#fff}
.btn.primary{background:var(--brand);border-color:var(--brand);color:#fff;box-shadow:0 6px 16px -8px #1668C4cc}
.btn.danger{color:var(--danger)}
table th{height:40px;font-size:12.5px;font-weight:700;color:var(--muted);background:#fff}
table td{height:50px;border-color:#F0F2F5}
table tbody tr:hover td{background:#F7F9FC}
input[type=checkbox]{width:20px;height:20px;accent-color:var(--brand)}
.photobox{border-radius:14px;border:2px dashed #D0D5DD}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .btn{background:var(--surface);color:var(--text);border-color:var(--line)}
  :root:not([data-theme="light"]) table th,:root:not([data-theme="light"]) table td{background:transparent}}
:root[data-theme="dark"] .btn{background:var(--surface);color:var(--text);border-color:var(--line)}
:root[data-theme="dark"] table th,:root[data-theme="dark"] table td{background:transparent}
@media (max-width:600px){
  .card{border-radius:14px}
  .btn{min-height:38px;font-size:13px;border-radius:10px}
  /* 홈 「일정」 달력이 폰 너비를 넘지 않게 */
  .dow,.cal{grid-template-columns:repeat(7,minmax(0,1fr));gap:3px}
  .cal .d{min-width:0;min-height:58px;padding:4px 3px;overflow:hidden}
  .cal .amt{font-size:10.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .cal .cars,.cal .memo{font-size:9.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .dow span{font-size:11px}
  .homegrid{grid-template-columns:minmax(0,1fr) !important}
  .homegrid>.hgL>.card,.homegrid>.hgR>.card,.homegrid .card>*{min-width:0}
  .homegrid .tools{flex-wrap:wrap}
}
</style>'''
s = s[:a] + PRODUCT + s[b:]

GLUE = '''
<!-- ===== 차곳간 공통 부품 cgg-j4 1.0 (디자인/공통 — 글자 그대로. 고칠 것은 디자인 방에 요청) ===== -->
<style id="cgg-j4-common">
''' + CSS + '''
</style>
<!-- ===== 체크 붙임 몫 — 옛 .wrap 틀과 공통 부품이 맞물리게 (머리말 버튼 모양은 디자인/공통/예시.html 그대로) ===== -->
<style id="chk-glue">
#wrap.cgg-app{max-width:none;margin:0;padding-top:0;padding-right:0}
#wrap.cgg-app.lay-top{padding-left:0}
@media (max-width:999px){#wrap.cgg-app{padding-left:0}}
.cgg-right .hb{height:32px;padding:0 11px;border-radius:10px;border:1px solid #ffffff30;background:#ffffff12;color:#fff;font:inherit;font-size:12.5px;cursor:pointer;white-space:nowrap}
.cgg-right select.hb{appearance:none;-webkit-appearance:none;padding-right:11px;width:auto;max-width:none;min-width:0}
.cgg-right select.hb option{color:#101828;background:#fff}
@media (min-width:1000px){ .lay-side .cgg-right .hb,.lay-icon .cgg-right .hb{height:40px;border-color:var(--ln2);background:var(--surface);color:var(--btn-ink)} }
.cgg-right .t-narrow{display:none}
@media (max-width:600px){ .cgg-right .t-wide{display:none} .cgg-right .t-narrow{display:inline} }
.cgg-main #main{margin:0}
.cgg-allm{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.cgg-allm button{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--text);font:inherit;font-size:14.5px;font-weight:700;cursor:pointer;text-align:left}
.cgg-allm svg.ic{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none;color:var(--brand)}
.cgg-offpick input{width:100%;height:44px;border:1px solid var(--line);border-radius:12px;padding:0 12px;font:inherit;font-size:16px;text-transform:uppercase;background:var(--surface);color:var(--text)}
</style>
<script>
''' + JS + '''
</script>
<script>
/* ===== 체크 v24 — 공통 부품 부르기 ===== */
(function(){
  CGG.layout.init(document.getElementById("wrap"), "cgg_check_layout");
  /* 홈 할 일 카드 3장 — 「오늘 할 일」(TODOS)의 앞 3개 */
  var GOIC={deposit:"wallet",bill:"file",partner:"shop",hometax:"receipt",home:"today"};
  window.cggTodos=function(){
    var el=document.getElementById("cggActs"); if(!el) return;
    var list=(TODOS||[]).slice(0,3);
    CGG.todos(el, list.map(function(x){
      var memo=(x[1]==="memo");
      return { tone: x[1]==="r"?"stop": x[1]==="w"?"chk":"run", icon: GOIC[x[4]]||"file",
               title: memo? x[2] : (x[2]+" "+x[0]+"건"),
               sub: x[3] || (Number(x[0])? "눌러서 바로 처리해요" : "지금은 할 일이 없어요") }; }),
      function(i){ var t=list[i]; if(t && t[4] && t[4]!=="home") go(t[4]); });
  };
  /* 마이페이지 안 「화면」 칸 아래에 메뉴 배치 고르기 */
  if(typeof chkMyPage==="function"){
    var _mp=chkMyPage;
    window.chkMyPage=chkMyPage=function(){
      _mp.apply(this, arguments);
      var out=document.querySelector("#sheet .mpout"); if(!out) return;
      var box=document.createElement("div"); box.className="mcard";
      box.innerHTML='<div class="mh"><b>메뉴 배치</b><span>넓은 화면에서만 바뀌어요 · 이 기기에만 저장</span></div><div id="cggLay"></div>';
      out.parentNode.insertBefore(box, out);
      CGG.layout.chooser(document.getElementById("cggLay"), function(){ drawTabs(); });
    };
  }
  /* 서버 v24 — 관리 계정이 검사소를 안 골랐을 때 */
  var picking=false;
  window.cggPickOffice=function(){
    if(picking) return; picking=true;
    $("sheet").innerHTML='<h3 style="margin:0 0 4px">검사소를 선택해 주세요</h3>'+
      '<div style="color:var(--muted);font-size:13px;margin-bottom:12px">관리 계정은 들어갈 검사소 코드를 입력해야 합니다.</div>'+
      '<div class="cgg-offpick"><input id="cggOff" placeholder="검사소 코드" autocomplete="off" value="'+esc(ST.shop||"")+'"></div>'+
      '<div class="sheetbtns"><button class="btn" id="offNo">닫기</button><button class="btn primary" id="offYes">이 검사소로 들어가기</button></div>';
    openSheet();
    function done(){ picking=false; }
    $("offNo").onclick=function(){ closeSheet(); done(); };
    $("offYes").onclick=function(){
      var v=String($("cggOff").value||"").trim().toUpperCase(); if(!v){ $("cggOff").focus(); return; }
      ST.shop=v; set("cgg_shop",v); LOADED={}; closeSheet(); done(); openApp(); };
  };
  if(!document.getElementById("wrap").hidden){ drawTabs(); if(typeof draw==="function") draw(); }
})();
</script>
'''
k = s.rindex("</body>")
s = s[:k] + GLUE + s[k:]

open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
