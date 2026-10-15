"""워시 v112 → 워시 v113 새 판. 디자인 방 공통 부품 cgg-j4 1.0 을 README 대로 붙인다.
쓰는 법: python3 워시/도구/만들기_워시_v112.py && python3 워시/도구/만들기_워시_v113.py
바꾸는 것 (대표님 결정 2026-10-15 · 운영/04_결정_기록.md):
  1) 메뉴 배치 셋(가로 · 세로 · 아이콘) · 폰 아래 탭바 · 홈 할 일 카드 3장 · 낱말 단위 줄바꿈 → 공통 부품 cgg-j4
     (디자인/공통/cgg-j4.css · cgg-j4.js 를 글자 그대로 넣음. 고치지 않음)
     - 워시가 따로 갖고 있던 세로 · 아이콘 배치(.wrap.side · .wrap.iconmenu)와 머리말 모양 규칙은 빼고 공통 부품에 맡김
     - 배치 저장 이름은 원래 쓰던 «ccw_layout» 그대로 → 손님이 골라 둔 배치가 그대로 이어짐
  2) 입고 「딜러 연락처」 칸 이름은 그대로, 옆에 «딜러앱에 공개돼요» 표시
운영 v111 · 새 판 v112 는 덮어쓰지 않는다. 서버 주소 · 창구 · 저장 방식은 한 글자도 바꾸지 않는다.
"""
import os, re
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
ROOT = os.path.dirname(BASE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v112.html")
OUT = os.path.join(BASE, "1_차곳간_워시_index_v113.html")
CSS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.css"), encoding="utf-8").read()
JS = open(os.path.join(ROOT, "디자인", "공통", "cgg-j4.js"), encoding="utf-8").read()
GLUE = open(os.path.join(HERE, "cgg-j4_워시_이음.css"), encoding="utf-8").read()
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

rep('var APP_VER="워시 v112 · UI 3.0 · 2026-10-15";', 'var APP_VER="워시 v113 · UI 3.0 · 2026-10-15";')

# ── v112 덮개(J안 모양) 빼기 — 이번엔 공통 부품이 맡음 ──
a = s.index('\n<!-- ===== J안 4판 겉모양 (워시 v112')
b = s.index('</style>', a) + len('</style>')
s = s[:a] + s[b:]

# ── 원래 머리말 · 메뉴 · 세로/아이콘 배치 모양 규칙 빼기 (공통 부품과 부딪히지 않게) ──
HDR = re.compile(r'(^|[\s,>+~(])header\b|#tabs\b|#setSub\b|\.brandrow\b|\.hdr-right\b|\.bizcard\b|\.bizname\b|#topBar\b|#topBand\b|'
                 r'\.hr1\b|\.hr2\b|\.who\b|#hWho\b|\.wrap\.side\b|\.wrap\.iconmenu\b|\.wrap\.fieldview\b|\.wrap[^{,]*\s\.tabs\b|#hdrBreak\b')
KEEP = re.compile(r'\.auth\b|#ccwAuth|\.sheet\b|#sheet\b|@')
removed = 0
def strip_css(css):
    global removed
    def one(m):
        global removed
        sel = m.group(1)
        sel_clean = re.sub(r'/\*.*?\*/', '', sel, flags=re.S).strip()
        if HDR.search(sel_clean) and not KEEP.search(sel_clean):
            removed += 1
            lead = re.match(r'\s*(/\*.*?\*/\s*)*', sel, flags=re.S).group(0)
            return lead
        return m.group(0)
    return re.sub(r'([^{}]+)\{([^{}]*)\}', one, css)
parts = []
pos = 0
for m in re.finditer(r'(<style[^>]*>)(.*?)(</style>)', s, re.S):
    parts.append(s[pos:m.start(2)]); parts.append(strip_css(m.group(2))); pos = m.end(2)
parts.append(s[pos:])
s = "".join(parts)

# ── 이름표(class) 더하기 — 원래 id · class 는 그대로 ──
rep('<div class="wrap" id="app" hidden>\n<header>\n  <div class="brandrow">\n    <div class="logo" data-logo="1">워시</div>\n    <div>',
    '<div class="wrap cgg-app" id="app" hidden>\n<header class="cgg-hdr">\n  <div class="brandrow cgg-top">\n    <div class="cgg-brand"><span class="logo cgg-ci" data-logo="1">워시</span>\n    <div>')
rep('    <div class="bizcard" id="bizCard">', '    </div>\n    <div class="bizcard cgg-biz" id="bizCard">')
rep('<div class="hdr-right" id="hdrRight">', '<div class="hdr-right cgg-right" id="hdrRight">')
rep('<div class="tabs" id="tabs"></div>', '<nav class="tabs cgg-nav" id="tabs" aria-label="메뉴"></nav>')
rep('<div class="tabs" id="setSub" hidden style="margin-top:6px"></div>\n</header>',
    '<div class="tabs cgg-sub" id="setSub" hidden></div>\n</header>\n<main class="cgg-main">')
# 바깥 상자 끝 — 본문 닫고 폰 아래 탭바
i = s.index('<section id="vSms" hidden>'); j = s.index('</section>', i) + len('</section>')
k = s.index('</div>', j)
assert s[j:k].strip() == "", "vSms 뒤에 다른 것이 있음"
s = s[:j] + '\n</main>\n<nav class="cgg-tbar" id="cggTbar"></nav>\n' + s[j:]

# ── 워시 스스로 하던 세로 · 아이콘 배치는 끄고, 배치는 공통 부품(lay-*)이 맡음 ──
rep('''  if(w)w.className="wrap"+(pc?" pc":"")+(side&&pc?" side":"")
    +(lm==="icon"&&pc?" iconmenu":"")
    +(lm==="icon"&&pc&&(S.tab==="settings"||S.tab==="ledger"||S.tab==="outlog")?" setopen":"")
    +(field?" fieldview":"");''',
    '''  if(w)w.className="wrap cgg-app"+(pc?" pc":"")+(field?" fieldview":"");
  /* 메뉴 배치(가로 · 세로 · 아이콘)는 공통 부품 cgg-j4 — 저장 이름은 원래 «ccw_layout». PC 화면에서만 바뀝니다 */
  try{ if(window.CGG&&w){ CGG.layout.init(w,"ccw_layout"); if(!pc)CGG.layout.apply("top"); } }catch(e){}
  if(w&&$("setSub"))w.classList.toggle("hasSub",!$("setSub").hidden);''')
rep('''  var side=big&&lm==="side", icon=big&&lm==="icon", sideish=side||icon;''',
    '''  var side=false, icon=false, sideish=false;   /* v113: 배치는 공통 부품이 맡아서 단추를 옮기지 않습니다 */''')
rep('''    if(S.mode==="pc"&&window.innerWidth>=1000&&(lmJ==="side"||lmJ==="icon")&&onJ&&!sbJ.hidden) onJ.insertAdjacentElement("afterend",sbJ);''',
    '''    var apJ=$("app"); if(apJ)apJ.classList.toggle("hasSub",!sbJ.hidden);
    cggTabbar();''')
rep('''  var railMore=(S.mode==="pc"&&window.innerWidth>=1000&&layoutMode()==="icon");''', '''  var railMore=false;''')

# 큰 메뉴 단추 = 선 아이콘 + 이름 (공통 부품 모양)
rep('''    return '<button data-t="'+t[0]+'" role="tab" title="'+esc(label)+'" aria-selected="'+on+'">'+label+'</button>';}).join("");''',
    '''    var icn=(window.CGG&&CGG.ic)?CGG.ic(NAVIC[t[0]]||"file"):"";
    return '<button data-t="'+t[0]+'" role="tab" title="'+esc(label)+'" aria-selected="'+on+'">'+icn+'<span class="lbl">'+label+'</span></button>';}).join("");''')
rep('''var WORKSUB=[["ledger","입출고 내역"],["outlog","출고 기록"]];''',
    '''var WORKSUB=[["ledger","입출고 내역"],["outlog","출고 기록"]];
/* 큰 메뉴 · 아래 탭바 선 아이콘 (공통 부품 CGG.ic 이름) */
var NAVIC={home:"home",sales:"chart",ledger:"car",outlog:"car",bill:"file",money:"wallet",tax:"receipt",mat:"box",settings:"gear",
  fhome:"home",in:"in",out:"out",today:"today",search:"file",matm:"box"};
/* 폰 아래 탭바 5칸 — 홈 + 주요 3칸 + 전체 (현장 화면은 원래 다섯 칸 그대로) */
function cggTabbar(){
  try{
    if(!window.CGG||!$("cggTbar"))return;
    var pc=(S.mode==="pc"), all=pc?tabsFor():MTABS.concat((S.cfg&&S.cfg.matMobile)?[["matm","자재"]]:[]);
    var has=function(k){return all.some(function(t){return t[0]===k;});};
    var items, cur=S.tab==="outlog"?"ledger":S.tab;
    if(!pc&&all.length<=5){
      items=all.map(function(t){return {key:t[0],icon:NAVIC[t[0]]||"file",label:t[0]==="search"?"날짜 검색":t[1]};});
    }else{
      var main=(pc?["ledger","money","tax","mat","settings"]:["in","out","today","search"]).filter(has).slice(0,3);
      items=[{key:all[0][0],icon:"home",label:"홈"}].concat(main.map(function(k){
        var t=all.filter(function(x){return x[0]===k;})[0];
        return {key:k,icon:NAVIC[k]||"file",label:pc?({ledger:"일감",money:"입출금",tax:"계산서",mat:"자재",settings:"설정"}[k]||t[1]):t[1]};}))
        .concat([{key:"__all",icon:"more",label:"전체"}]);
      if(!items.some(function(x){return x.key===cur;}))cur="__all";
    }
    CGG.tabbar($("cggTbar"),items,cur,function(k){
      if(k==="__all")return cggAllSheet(all);
      if(S.tab!=="settings")S.prevTab=S.tab;
      S.tab=k;decideMode(false);window.scrollTo(0,0);
    });
  }catch(e){}
}
/* 「전체」 — 모든 메뉴를 한 창에 */
function cggAllSheet(all){
  $("sheet").innerHTML='<h3>전체 메뉴</h3><div class="cgg-allm">'+all.map(function(t){
    var lb=(S.mode==="pc")?(JLAB[t[0]]||(t[0]==="outlog"?"출고 기록":t[1])):t[1];
    if(t[0]==="ledger"&&S.mode==="pc")lb="입출고 내역";
    return '<button type="button" data-go="'+t[0]+'"'+(t[0]===S.tab?' class="on"':'')+'>'+CGG.ic(NAVIC[t[0]]||"file")+'<span>'+esc(lb)+'</span></button>';}).join("")+
    '</div><div class="sheetbtns"><button class="btn" id="allClose" style="flex:1">닫기</button></div>';
  openSheet();
  $("allClose").onclick=closeSheet;
  Array.prototype.forEach.call($("sheet").querySelectorAll("[data-go]"),function(b){
    b.onclick=function(){closeSheet();S.tab=b.getAttribute("data-go");decideMode(false);window.scrollTo(0,0);};});
}''')

# 마이페이지 › 화면 › 메뉴 배치 — 공통 부품 고르기 칸 (CGG.layout.chooser)
rep('''    '<div class="kv2" style="border-bottom:0"><span>메뉴 배치</span><span class="fzrow">' +
      '<button type="button" class="btn" data-mly="top" aria-selected="' + (ly === "top") + '">가로 메뉴</button>' +
      '<button type="button" class="btn" data-mly="side" aria-selected="' + (ly === "side") + '">세로 메뉴</button>' +
      '<button type="button" class="btn" data-mly="icon" aria-selected="' + (ly === "icon") + '">아이콘 메뉴</button>' +
    '</span></div></div>';''',
    '''    '<div class="kv2" style="border-bottom:0;display:block"><span style="display:block;margin-bottom:8px">메뉴 배치 <small style="color:var(--muted)">넓은 화면(PC)에서만 바뀌어요</small></span>' +
      '<div id="mpLay"></div></div></div>';''')
rep('''  Array.prototype.forEach.call($("sheet").querySelectorAll("[data-mly]"), function (b) {''',
    '''  try { if (window.CGG && $("mpLay")) CGG.layout.chooser($("mpLay"), function () { try { applyLayout(); } catch (e) {} toast("메뉴 배치를 바꿨어요"); }); } catch (e) {}
  Array.prototype.forEach.call($("sheet").querySelectorAll("[data-mly]"), function (b) {''')

# ── 홈 할 일 카드 3장 (공통 부품 CGG.todos) — 원래 「오늘 할 일」 목록과 같은 자료 ──
rep('''  <div id="demoBox"></div>
  <!-- 이번 달 숫자 칸 4개''', '''  <div id="demoBox"></div>
  <div class="cgg-acts" id="homeActs"></div>
  <div class="cgg-actsall"><button type="button" class="btn" id="homeActsAll" hidden>할 일 모두 보기</button></div>
  <!-- 이번 달 숫자 칸 4개''')
rep('''      <div class="card">
        <h2>오늘 할 일</h2>
        <div class="todo" id="dashTodo"></div>''', '''      <div class="card" id="dashTodoCard" hidden>
        <h2>오늘 할 일</h2>
        <div class="todo" id="dashTodo"></div>''')
rep('''    more.onclick=function(){ todoSheet(todos, todoBtn); };
    box.appendChild(more);
  }''', '''    more.onclick=function(){ todoSheet(todos, todoBtn); };
    box.appendChild(more);
  }
  /* J안: 맨 위 할 일 카드 3장 — 급한 것(빨강) · 메모(주황) · 나머지(파랑), 0건은 뒤로 */
  try{
    var hb=$("homeActs");
    if(hb&&window.CGG){
      var pick=todos.filter(function(t){return typeof t[0]==="string"||Number(t[0])>0;});
      pick.sort(function(x,y){return (y[4]==="imp")-(x[4]==="imp");});
      var strip=function(v){return String(v==null?"":v).replace(/<[^>]*>/g,"");};
      if(!pick.length){hb.innerHTML='<div class="hint" style="padding:6px 2px">지금 손 갈 일이 없어요.</div>';}
      else CGG.todos(hb,pick.slice(0,3).map(function(t){
        var memo=typeof t[0]==="string";
        return {tone:t[4]==="imp"?"stop":(memo?"chk":"run"),icon:memo?"file":"car",
          title:strip(t[1])+(memo?"":" "+t[0]+"건"),sub:strip(t[2])};}),
        function(i){pick[i][3]();window.scrollTo(0,0);});
      var al=$("homeActsAll");
      if(al){al.hidden=todos.length<=3;al.textContent="할 일 "+todos.length+"건 모두 보기";al.onclick=function(){todoSheet(todos,todoBtn);};}
    }
  }catch(e){}''')

# ── 입고 「딜러 연락처」 — 이름 그대로, 옆에 «딜러앱에 공개돼요» (대표님 2026-10-15) ──
rep('''<label class="f" for="fPhone">딜러 연락처 <span style="font-weight:500">(출고 문자 보낼 번호)</span></label>''',
    '''<label class="f" for="fPhone">딜러 연락처 <span class="cgg-pub" title="이 번호는 딜러앱에서 딜러 본인에게 보여요">딜러앱에 공개돼요</span> <span style="font-weight:500">(출고 문자 보낼 번호)</span></label>''')

# ── 공통 부품 넣기 — CSS 는 <style> 맨 마지막, JS 는 워시 스크립트보다 먼저(전역 CGG) ──
k = s.rindex("</body>")
s = s[:k] + ("\n<!-- ===== 차곳간 공통 부품 cgg-j4 1.0 (디자인/공통 — 글자 그대로) ===== -->\n<style id=\"cgg-j4\">\n" + CSS +
             "\n</style>\n<!-- ===== 워시 이음 (공통 부품 위에 워시 머리말 단추 모양만) ===== -->\n<style id=\"cgg-j4-wash\">\n" + GLUE + "\n</style>\n") + s[k:]
first_script = s.index("<script")
s = s[:first_script] + "<script>\n/* 차곳간 공통 부품 cgg-j4 1.0 (디자인/공통/cgg-j4.js — 글자 그대로) */\n" + JS + "\n</script>\n" + s[first_script:]

open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s), "머리말 규칙 뺌:", removed)
