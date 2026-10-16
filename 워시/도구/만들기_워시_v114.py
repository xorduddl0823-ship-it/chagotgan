"""워시 v113 → 워시 v114 새 판. 공통 부품을 cgg-j4 1.1 로 바꿔 끼운다 (디자인/공통 README 1.1).
쓰는 법: python3 워시/도구/만들기_워시_v112.py && python3 워시/도구/만들기_워시_v113.py && python3 워시/도구/만들기_워시_v114.py
바꾸는 것:
  1) cgg-j4 1.0 → 1.1 (CSS · JS 글자 그대로, 고치지 않음)
  2) 사람 단추 ▾ — 워시가 따로 열던 마이페이지 창 대신 공통 부품 CGG.menu
     (마이페이지 · 요금제 · 휴지통 · ― · 화면 설정 · ― · 로그아웃. 요금제 · 휴지통은 대표만)
  3) 휴지통 빨간 개수 — CGG.badge (사람 단추 위)
  4) 창 · 확인 창 · 알림 글 층 — class "cgg-dialog" · "cgg-toast" (층 순서 이름 --z-…)
운영 v111 · 새 판 v112 · v113 은 덮어쓰지 않는다. 서버 주소 · 창구 · 저장 방식은 한 글자도 바꾸지 않는다.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
ROOT = os.path.dirname(BASE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v113.html")
OUT = os.path.join(BASE, "1_차곳간_워시_index_v114.html")
CSS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.css"), encoding="utf-8").read()
JS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.js"), encoding="utf-8").read()
assert 'version:"cgg-j4 1.1"' in JS, "공통 부품이 1.1 이 아님"
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

rep('var APP_VER="워시 v113 · UI 3.0 · 2026-10-15";', 'var APP_VER="워시 v114 · UI 3.0 · 2026-10-15";')

# ── 1) 공통 부품 1.0 → 1.1 (글자 그대로) ──
a = s.index('<style id="cgg-j4">\n') + len('<style id="cgg-j4">\n'); b = s.index('\n</style>', a)
s = s[:a] + CSS + s[b:]
rep('<!-- ===== 차곳간 공통 부품 cgg-j4 1.0 (디자인/공통 — 글자 그대로) ===== -->', '<!-- ===== 차곳간 공통 부품 cgg-j4 1.1 (디자인/공통 — 글자 그대로) ===== -->')
mark = '/* 차곳간 공통 부품 cgg-j4 1.0 (디자인/공통/cgg-j4.js — 글자 그대로) */\n'
a = s.index(mark); b = s.index('\n</script>', a)
s = s[:a] + '/* 차곳간 공통 부품 cgg-j4 1.1 (디자인/공통/cgg-j4.js — 글자 그대로) */\n' + JS + s[b:]

# ── 2) 사람 단추 ▾ — CGG.menu ──
rep('''    who.onclick=whoSheet;
    who.title="내 계정";''', '''    /* v114: 사람 단추 ▾ 는 공통 부품 CGG.menu (마이페이지 · 요금제 · 휴지통 · 화면 설정 · 로그아웃) */
    if(window.CGG&&CGG.menu){ if(!who.__cggMenu){ who.__cggMenu=1; who.onclick=null; CGG.menu(who,CGGWHO,cggMeItems,cggMePick); } }
    else who.onclick=whoSheet;
    who.title="내 정보";''')
rep('''/* 큰 메뉴 · 아래 탭바 선 아이콘 (공통 부품 CGG.ic 이름) */''', '''/* 사람 단추 ▾ 항목 — 차례는 공통 부품 README 1.1 그대로 (요금제 · 휴지통은 대표만) */
var CGGWHO={name:"",role:""};
function cggMeItems(){
  CGGWHO.name=S.me?S.me.name:"-";
  CGGWHO.role=isAdmin()?"차곳간 본사":(isOwner()?"대표":(isManager()?"매니저":"직원"));
  var own=isOwner(), n=(S.trash||[]).length;
  var L=[{key:"me",icon:"user",label:"마이페이지"}];
  if(own)L.push({key:"plan",icon:"wallet",label:"요금제"});
  if(own)L.push({key:"trash",icon:"trash",label:"휴지통",count:n||0});
  L.push("-");
  L.push({key:"lay",icon:"pc",label:"화면 설정",note:(window.CGG?CGG.layout.name():"")});
  L.push("-");
  L.push({key:"out",icon:"out",label:"로그아웃"});
  return L;
}
function cggMePick(k){
  if(k==="me"||k==="plan")whoSheet();
  else if(k==="trash")$("btnTrash").click();
  else if(k==="lay")screenSheet();
  else if(k==="out")$("btnOut2").click();
}
/* 화면 설정 — 밝기 · 글씨 크기 · 메뉴 배치 (이 기기에만 저장) */
function screenSheet(){
  var th=mpTheme();
  $("sheet").innerHTML='<h3 style="margin:0 0 2px">화면 설정</h3>'+
    '<div class="sub" style="color:var(--muted);font-size:12.5px;margin-bottom:14px">이 기기에만 저장돼요</div>'+
    '<div class="kv2"><span>밝기</span><span class="fzrow">'+
      '<button type="button" class="btn" data-mth="auto" aria-selected="'+(th==="auto")+'">기기에 맞춤</button>'+
      '<button type="button" class="btn" data-mth="light" aria-selected="'+(th==="light")+'">밝게</button>'+
      '<button type="button" class="btn" data-mth="dark" aria-selected="'+(th==="dark")+'">어둡게</button></span></div>'+
    '<div class="kv2"><span>글씨 크기</span><span>'+fontBtns()+'</span></div>'+
    '<div class="kv2" style="border-bottom:0;display:block"><span style="display:block;margin-bottom:8px">메뉴 배치 <small style="color:var(--muted)">넓은 화면(PC)에서만 바뀌어요</small></span><div id="scLay"></div></div>'+
    '<div class="sheetbtns"><button class="btn" id="scClose" style="flex:1">닫기</button></div>';
  openSheet();
  $("scClose").onclick=closeSheet;
  wireFontBtns($("sheet"));
  Array.prototype.forEach.call($("sheet").querySelectorAll("[data-mth]"),function(b){
    b.onclick=function(){mpSetTheme(b.getAttribute("data-mth"));screenSheet();};});
  try{ CGG.layout.chooser($("scLay"),function(){ try{applyLayout();}catch(e){} toast("메뉴 배치를 바꿨어요"); }); }catch(e){}
}
/* 큰 메뉴 · 아래 탭바 선 아이콘 (공통 부품 CGG.ic 이름) */''')
# 사람 단추 글자 — ▾ 는 글자로 (원래 ▾ 를 그리던 모양 규칙은 v113 에서 빠짐)
rep('<span class="mypglb">마이페이지 · 휴지통</span>', '<span class="mypglb">마이페이지 ▾</span>')

# ── 3) 휴지통 빨간 개수 — CGG.badge ──
rep('''    if(ml)ml.innerHTML=(own?'마이페이지 · 휴지통':'마이페이지')+(own&&n?(' <span class="trbdg">'+n+'</span>'):'');''',
    '''    if(ml)ml.textContent='마이페이지 ▾';
    try{ if(window.CGG&&CGG.badge&&$("hWho"))CGG.badge($("hWho"),own?n:0); }catch(e){}''')
rep('''toast(isOwner()?"화면이 새 모양으로 바뀌었어요. 입출고 내역 · 출고 기록은 «일감» 안에, 휴지통은 «마이페이지» 안에 있어요":"화면이 새 모양으로 바뀌었어요. 입출고 내역 · 출고 기록은 «일감» 안에 있어요");''',
    '''toast(isOwner()?"화면이 새 모양으로 바뀌었어요. 입출고 내역 · 출고 기록은 «일감» 안에, 휴지통은 오른쪽 위 «마이페이지 ▾» 안에 있어요":"화면이 새 모양으로 바뀌었어요. 입출고 내역 · 출고 기록은 «일감» 안에 있어요");''')

# ── 4) 창 · 확인 창 · 알림 글 층 (공통 이름) ──
rep('<div class="sheetbg" id="sheetbg"></div>', '<div class="sheetbg cgg-dialog" id="sheetbg"></div>')
rep('<div class="sheet" id="sheet"></div>', '<div class="sheet cgg-dialog" id="sheet"></div>')
rep('<div class="askbg" id="askbg"></div>', '<div class="askbg cgg-dialog" id="askbg"></div>')
rep('<div class="askbox" id="askbox"></div>', '<div class="askbox cgg-dialog" id="askbox"></div>')
rep('<div class="toast" id="toast"></div>', '<div class="toast cgg-toast" id="toast"></div>')

open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
