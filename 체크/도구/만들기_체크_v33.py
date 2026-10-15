"""체크 v32 → 체크 v33 새 판 — J안 4판 완성 모양(디자인/01 + cgg-j4 1.2) 위에 v32까지 기능 그대로.
쓰는 법: python3 체크/도구/만들기_체크_v33.py   (저장소의 v32 파일을 읽기만 — 앞 판들은 다시 만들지 않아요.
          앞 판은 보안 검사를 받은 그대로 두고, 공통 부품만 디자인/공통 최신판으로 바꿔 넣어요)
바꾸는 것 (대표님 2026-10-15 「새 디자인 먼저, 기능은 그 위에, 시험은 한 번」):
  1) 공통 부품 넣는 위치 규칙(1.1): cgg-j4.js 를 제품 스크립트보다 먼저 — 처음 그릴 때부터 아이콘 · 탭바가 나옴
  2) 사람 단추 ▾ (CGG.menu, 1.1): 마이페이지 · 요금제 · 휴지통 · ― · 화면 설정 · ― · 로그아웃 + 빨간 개수(CGG.badge)
     (예전에는 사람 단추가 마이페이지 창을 바로 열었음)
  3) 층 순서 이름(1.1): 창 · 어두운 막을 --z-dialog 로
  4) 화면 설정 창: 메뉴 배치(가로 · 세로 · 아이콘) + 밝기 — 마이페이지 창 안에 따로 붙이던 것을 사람 단추 ▾ «화면 설정»으로
이미 앞 판에 들어 있는 것 (그대로 얹힘): 결제창 v2(워시 v120과 같음) · 워시 지갑 결제 · 직원 권한 · 첫 비밀번호 문자 확인 ·
  알림톡 먼저 · 설정 세 곳 옮기기(자료 올리기 → 매출, 휴지통 → 사람 단추, 도움말 → 머리말) · 「매출 › 자료 올리기」 안내 글
"""
BASE = "/home/user/chagotgan/체크/"
SRC = BASE + "2_차곳간_체크_index_v32.html"
OUT = BASE + "2_차곳간_체크_index_v33.html"
JS = open("/home/user/chagotgan/디자인/공통/cgg-j4.js", encoding="utf-8").read()
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

CSS = open("/home/user/chagotgan/디자인/공통/cgg-j4.css", encoding="utf-8").read()
import re
# 0) 앞 판에 붙어 있던 공통 부품(예전 판 번호)을 걷어내고 최신판(디자인/공통)으로 — 검사 받은 앞 판 파일은 건드리지 않음
m = re.search(r'<style id="cgg-j4-common">\n.*?\n</style>', s, re.S)
if not m: raise SystemExit("공통 부품 CSS 덩어리를 못 찾음")
s = s[:m.start()] + '<style id="cgg-j4-common">\n' + CSS + '\n</style>' + s[m.end():]
m = re.search(r'<script>\n/\* ═+\n   차곳간 공통 부품 · J안 4판 · cgg-j4 .*?\nvar CGG = \(function\(\)\{.*?\n\}\)\(\);\n\n?</script>', s, re.S)
if not m: raise SystemExit("공통 부품 JS 덩어리를 못 찾음")
s = s[:m.start()] + s[m.end():]
lib = "<script>\n" + JS + "\n</script>"
# 1) 공통 부품 JS 를 제품 스크립트보다 먼저
b = s.index("<body>")
first = s.index("<script>", b)
s = s[:first] + "<!-- 차곳간 공통 부품 cgg-j4 JS — 제품 스크립트보다 먼저 (README 1.1) -->\n" + lib + "\n" + s[first:]

# 2) 사람 단추 ▾ — CGG.menu
rep('''  $("hWho").onclick = function(){ chkMyPage(); };''',
    '''  /* v33: 사람 단추 ▾ (CGG.menu) — 클릭은 공통 부품이 받음 */''')
rep('''  /* 마이페이지 안 「화면」 칸 아래에 메뉴 배치 고르기 */''',
    '''  /* v33: 사람 단추 ▾ — 마이페이지 · 요금제 · 휴지통 · ― · 화면 설정 · ― · 로그아웃 (README 1.1 차례) */
  var hw=document.getElementById("hWho");
  if(hw){
    CGG.menu(hw, function(){ return {name:(ST&&ST.who)||"", role:(ST&&ST.role)==="owner"?"대표":"직원"}; }(), function(){
      var owner=(ST&&ST.role)==="owner";
      return [{key:"me",icon:"user",label:"마이페이지"}]
        .concat(owner?[{key:"plan",icon:"wallet",label:"요금제"}]:[])
        .concat([{key:"trash",icon:"trash",label:"휴지통"},"-",
                 {key:"lay",icon:"pc",label:"화면 설정",note:CGG.layout.name()},"-",
                 {key:"out",icon:"out",label:"로그아웃"}]);
    }, function(k){
      if(k==="me") chkMyPage();
      else if(k==="plan"){ try{ window.ccwPlanPay(); }catch(e){ bar("요금제 기능이 아직 준비 중입니다"); } }
      else if(k==="trash") go("trash");
      else if(k==="lay") cggScreenSet();
      else if(k==="out") $("btnOut").click();
    });
  }
  /* 화면 설정 창 — 메뉴 배치 + 밝기 */
  window.cggScreenSet=function(){
    var th=(function(){ try{ return localStorage.getItem("ccw_theme")||"auto"; }catch(e){ return "auto"; } })();
    $("sheet").innerHTML='<h3 style="margin:0 0 2px">화면 설정</h3><div style="color:var(--muted);font-size:12.5px;margin-bottom:12px">이 기기에만 저장돼요</div>'+
      '<div class="mcard"><div class="mh"><b>메뉴 배치</b><span>넓은 화면에서만 바뀌어요</span></div><div id="cggLay"></div></div>'+
      '<div class="mcard"><div class="mh"><b>밝기</b></div><div class="fzrow">'+
        [["auto","기기에 맞춤"],["light","밝게"],["dark","어둡게"]].map(function(x){
          return '<button type="button" class="btn" data-th="'+x[0]+'" aria-selected="'+(th===x[0])+'">'+x[1]+'</button>'; }).join("")+'</div></div>'+
      '<div class="sheetbtns"><button class="btn" id="scrClose">닫기</button></div>';
    openSheet();
    CGG.layout.chooser(document.getElementById("cggLay"), function(){ drawTabs(); });
    $("scrClose").onclick=closeSheet;
    Array.prototype.forEach.call($("sheet").querySelectorAll("[data-th]"),function(b){
      b.onclick=function(){ var v=b.getAttribute("data-th");
        try{ localStorage.setItem("ccw_theme",v); }catch(e){}
        if(v==="auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme",v);
        Array.prototype.forEach.call($("sheet").querySelectorAll("[data-th]"),function(x){ x.setAttribute("aria-selected", String(x===b)); }); }; });
  };
  /* (v24~v32: 마이페이지 안 메뉴 배치 칸 — v33 부터는 화면 설정 창으로 옮겨 이 덧붙임은 쓰지 않음) */
  if(false)''')

# 휴지통 빨간 개수 — 배달 휴지통 건수(서버가 주는 값)
rep('''    DCONF=d.conf||{}; DCONF.trashN=d.trashN||0; DCONF.ver=d.ver||"";''',
    '''    DCONF=d.conf||{}; DCONF.trashN=d.trashN||0; DCONF.ver=d.ver||"";
    try{ if(window.CGG && $("hWho")) CGG.badge($("hWho"), DCONF.trashN||0); }catch(e){}''')

# 3) 층 순서 이름
rep('''.cgg-todo-list b{font-weight:800}''', '''.cgg-todo-list b{font-weight:800}
/* v33: 층 순서 (cgg-j4 1.1) — 숫자 대신 이름 */
.sheetbg{z-index:var(--z-dialog)} .sheet{z-index:calc(var(--z-dialog) + 1)} .ovl{z-index:calc(var(--z-dialog) + 2)}
.cgg-right .me{position:relative}''')

rep('''  $("hdVer").textContent="체크 v32 · "''', '''  $("hdVer").textContent="체크 v33 · "''')
open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
