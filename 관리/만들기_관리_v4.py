"""관리 v4.0 (UI 3.0, J안 4판) 만들기 도구.
쓰는 법: python3 관리/만들기_관리_v4.py
- 재료: 관리/3_차곳간_관리_index.html (v3.6, 지금 쓰는 판) — 읽기만 합니다.
- 결과: 관리/3_차곳간_관리_index_v4.0.html (새 이름. 지금 판은 덮어쓰지 않음)
- 메뉴 순서 · 화면 이름은 관리/시안/00_비교와_추천안.md 추천안대로 (대표님 최종 확인 전)
- 서버 주소 · 창구(hq…) · 로그인 방식은 하나도 바꾸지 않습니다. 모양과 글자만 바꿉니다.
"""
import os, re
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "3_차곳간_관리_index.html")
OUT = os.path.join(HERE, "3_차곳간_관리_index_v4.0.html")
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    """정확히 count 곳을 바꿉니다. 못 찾거나 개수가 다르면 멈춥니다."""
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수 %d (기대 %d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

# ───────── 1. 판 번호 ─────────
rep('var ADM_VER="관리 v3.6 · UI 1.1 · 2026-10-12";', 'var ADM_VER="관리 v4.0 · UI 3.0 · 2026-10-14";')

# ───────── 2. 화면 이름 (추천안 3장) ─────────
rep('["inv","가입 코드",viewInvites],\n  ["users","계정",viewUsers],\n  ["shops","업체",viewShops],',
    '["inv","가입 코드",viewInvites],\n  ["users","계정 관리",viewUsers],\n  ["shops","업체 관리",viewShops],')
rep('["pays","결제",viewPays],', '["pays","결제 내역",viewPays],')
rep('["lock","잠금·차단",viewLock],', '["lock","잠금 · 차단",viewLock],')
rep('["sec","보안",viewSec],', '["sec","보안 점검",viewSec],')
# 「내 계정」은 그대로 (추천안: 짧고 다른 제품과 같은 말)

# ───────── 3. 메뉴 8묶음 — J안 차례 (지금 쓰는 차례 그대로, 규칙 3-4) ─────────
rep('''var NAV = [   /* 19차 추천안 그대로 (다른 방 인수인계 14-5) — 확인 대기 */
  ["sum","홈",["sum","ops"]],
  ["shops","업체",["shops","lock"]],
  ["users","계정",["users","inv"]],
  ["pays","받는 돈",["plans","pays","packs","pg"]],
  ["settle","내는 돈",["settle","svc"]],
  ["tax","세금계산서",["tax"]],
  ["noti","알림",["noti","sms"]],
  ["settings","설정",["sec","me"]]
];''', '''var NAV = [   /* J안 4판 차례 = 지금 쓰는 메뉴 차례 그대로 (관리/시안/00_비교와_추천안.md) — 대표님 최종 확인 전 */
  ["sum","홈",["sum","ops"]],
  ["users","계정",["inv","users"]],
  ["shops","업체",["shops","lock"]],
  ["pays","받는 금액",["plans","pays","packs","pg"]],
  ["settle","내는 금액",["settle","svc"]],
  ["tax","세금계산서",["tax"]],
  ["noti","알림",["sms","noti"]],
  ["settings","설정",["sec","me"]]
];''')

# ───────── 4. 상태 이름 — 진행 중 · 확인 필요 · 보류 · 완료 (규칙 4-5) ─────────
rep('opts:[["","상태 전체"],["on","쓰는 중"],["off","멈춤"]]}', 'opts:[["","상태 전체"],["on","진행 중"],["off","보류"]]}')
rep('''? '<span class="pill off">멈춤</span>' : '<span class="pill ok">쓰는 중</span>'; }}''',
    '''? '<span class="pill off">보류</span>' : '<span class="pill run">진행 중</span>'; }}''')
rep("""'+(s.active!==false?" selected":"")+'>쓰는 중</option>""", """'+(s.active!==false?" selected":"")+'>진행 중</option>""")
rep(">멈춤 (로그인 막기)</option>", ">보류 (로그인 막기)</option>")
rep('opts:[["","상태 전체"],["on","쓰는 중"],["off","정지"]]}', 'opts:[["","상태 전체"],["on","진행 중"],["off","보류"]]}')
rep("""' <span class="pill off">멈춤</span>':''""", """' <span class="pill off">보류</span>':''""")
rep('''? '<span class="pill off">정지</span>' : '<span class="pill ok">쓰는 중</span>'; }}''',
    '''? '<span class="pill off">보류</span>' : '<span class="pill run">진행 중</span>'; }}''')
rep("""'+(u.active!==false?" selected":"")+'>쓰는 중</option>""", """'+(u.active!==false?" selected":"")+'>진행 중</option>""")
rep('{k:"active", label:"쓰는 중", w:80,', '{k:"active", label:"사용", w:80,')
rep("""'<label class="f">쓰는 중</label><select id="vOn">'""", """'<label class="f">사용</label><select id="vOn">'""")
rep("""'<span class="pill off">로그인 막힘</span>'""", """'<span class="pill off">보류 · 로그인 막힘</span>'""")
rep("""'<span class="pill ok">쓰는 중</span>';""", """'<span class="pill run">진행 중</span>';""")
rep('"지난 날 메모 · 아직 안 끝남"', '"지난 날 메모 · 아직 완료 안 됨"')
rep("<span>로그인은 되지만<br>새 작업은 멈춤</span>", "<span>로그인은 되지만<br>새 작업은 멈춰요</span>")
rep("<span>로그인도 막힘</span>", "<span>로그인도 막혀요</span>")

# ───────── 4-2. 머리말 — J안 남색 틀 (가로 메뉴 기준 차례: 브랜드 → 업체 → 버튼들 → 사람 단추) ─────────
a = s.index('<header>\n  <div class="brandrow">'); b = s.index('</header>', a) + len('</header>')
s = s[:a] + '''<header class="jh" id="jh">
  <div class="jh-top">
    <div class="jh-brand"><span class="j-ci" aria-hidden="true">차</span>
      <div><b>차곳간 <span class="jh-prod">관리</span></b><small id="hSub">본사 관리 · <span id="hVer"></span></small></div></div>
    <div class="jh-biz" id="hBiz" hidden></div>
    <div class="jh-right" id="hdrRight">
      <button type="button" class="jhb" id="btnNotice"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>공지사항</button>
      <button type="button" class="jhb" id="btnHelp"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17h.01"/></svg>도움말</button>
      <button type="button" class="jhb" id="btnLink"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>링크 복사</button>
      <button type="button" class="jhb" id="btnReload" title="새로고침"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg><span class="lbl">새로고침</span></button>
      <button type="button" class="jh-me" id="hWho" aria-haspopup="menu" aria-expanded="false" title="내 정보"><span class="j-av" id="hAv">·</span><span class="wt"><b id="meName">-</b><small id="meRole">본사 관리자</small></span><span class="car">▾</span></button>
      <button type="button" id="btnOut" hidden>로그아웃</button>
    </div>
  </div>
  <nav class="tabs" id="nav" aria-label="메뉴"></nav>
  <div class="tabs" id="setSub" hidden></div>
</header>''' + s[b:]
rep('<div class="toast" id="toast"></div>',
    '<div class="toast" id="toast"></div>\n<div class="j-drop" id="jMe" role="menu" hidden></div>\n<nav class="j-tbar" id="jTbar" aria-label="아래 메뉴"></nav>')
# 머리말 채우기 — 사람 단추 글자 · 업체 이름
rep('$("meRole").textContent="본사 관리자";', '$("meRole").textContent="본사 관리자"; $("hBiz").className="jh-biz";')
rep('var av=$("hAv"); if(av){ var nm0=(D.me&&D.me.name)||""; av.textContent=nm0?nm0.slice(0,1):"·"; av.hidden=!nm0; }',
    'var av=$("hAv"); if(av){ var nm0=(D.me&&D.me.name)||""; av.textContent=nm0?nm0.slice(0,1):"·"; }')
rep('''  $("hBiz").innerHTML='<b title="'+esc(nm)+'">'+esc(bn)+'</b>'+
    (hq.biz_no?('<small>사업자 '+esc(fmtBizNo(hq.biz_no))+(hq.ceo?(' · 대표 '+esc(hq.ceo)):"")+'</small>'):"");''',
    '''  $("hBiz").innerHTML='<b title="'+esc(nm)+'">'+esc(bn)+'</b>'+
    (hq.biz_no?('<small>'+esc(fmtBizNo(hq.biz_no))+(hq.ceo?(' · 대표 '+esc(hq.ceo)):"")+'</small>'):"");''')
# 사람 단추는 j4.js 의 ▾ 펼침으로 (마이페이지는 그 안에)
rep('$("hWho").onclick=function(){ TAB="me"; window.scrollTo(0,0); render(); };', '')
rep('''  loadAll().then(function(){ hdrFill(); render(); toast("새로 불러왔습니다"); })''',
    '''  loadAll().then(function(){ hdrFill(); render(); toast("새로 불러왔어요"); })''')

# 세로 메뉴에서 묶음 아래로 옮겨 둔 작은 탭을 메뉴 다시 그리기 전에 제자리로
rep('''function render(){
  var g = navOf(TAB);''', '''function render(){
  var sb0=$("setSub"); if(sb0 && sb0.parentNode!==$("jh")) $("jh").appendChild(sb0);
  var g = navOf(TAB);''')
# ───────── 4-3. 메뉴 그리기 — 아이콘 + 글자, 안쪽 작은 탭, 화면 머리 «묶음 › 화면» ─────────
rep('''    var label = n[1];
    if(n[0]==="settings") label += (on?" ▾":" ▸");
    return '<button data-t="'+n[0]+'" role="tab" title="'+esc(n[1])+'" aria-selected="'+on+'">'+esc(label)+'</button>';''',
    '''    return '<button data-t="'+n[0]+'" role="tab" title="'+esc(n[1])+'" aria-selected="'+on+'">'+ic(NAVIC[n[0]]||"menu")+'<span class="lbl">'+esc(n[1])+'</span></button>';''')
rep('''  var f = TABS.filter(function(t){return t[0]===TAB;})[0];
  (f?f[2]:viewSummary)();
}''', '''  /* 세로 메뉴에서는 작은 탭을 고른 묶음 바로 아래에 (J안) */
  var sb=$("setSub"), on=$("nav").querySelector('[aria-selected="true"]');
  sb.classList.toggle("inside", $("app").classList.contains("lay-side") && !!on && subs.length>1);
  if(sb.classList.contains("inside") && on) on.insertAdjacentElement("afterend", sb); else if(sb.parentNode!==$("jh")) $("jh").appendChild(sb);
  $("app").classList.toggle("hasSub", subs.length>1);
  var f = TABS.filter(function(t){return t[0]===TAB;})[0];
  (f?f[2]:viewSummary)();
  /* ② 묶음 › 화면 이름 (모든 화면 같은 자리) */
  addCrumb();
  tbarDraw();
}
/* 선 아이콘 — J안 IC 그대로 */
var IC={home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
 file:'<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',wallet:'<path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3z"/><path d="M3 7l11-4v4M16 14h2"/>',
 receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M19 12h2M3 12h2M12 3v2M12 19v2M17 7l1.4-1.4M5.6 18.4L7 17M17 17l1.4 1.4M5.6 5.6L7 7"/>',
 bell:'<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 more:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
 out:'<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>',pc:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', shop:'<path d="M4 10h16v10H4zM3 10l2-6h14l2 6M9 20v-5h6v5"/>',
 car:'<path d="M3 17h18v-4l-2.2-5.2A1.5 1.5 0 0 0 17.4 7H6.6a1.5 1.5 0 0 0-1.4.8L3 13z"/><path d="M7 17v2M17 17v2M3 13h18"/>'};
function ic(n){ return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">'+(IC[n]||"")+'</svg>'; }
var NAVIC={sum:"home",users:"user",shops:"shop",pays:"wallet",settle:"out",tax:"receipt",noti:"bell",settings:"gear"};''')

# ───────── 4-4. 홈 윗부분 — 말하는 제목 · 할 일 카드 3장 · 숫자 카드 4개 (J안 2-3) ─────────
rep('''    '<div class="dashhead"><div class="dh-row"><h2>'+Y+'년 '+M+'월</h2></div>'+
      '<div class="sub2">오늘 '+(now.getMonth()+1)+'월 '+now.getDate()+'일 · '+
        String(now.getHours()).padStart(2,"0")+':'+String(now.getMinutes()).padStart(2,"0")+' 기준</div></div>'+
    /* 이번 달 숫자 칸 4개 — 워시·체크와 같은 자리 */
    '<div class="sums" id="homeSums">'+
      [["업체",(s.shops||0)+"곳","shops",""],
       ["이번 달 번 돈",won(s.salesMonth),"pays",""],
       ["이번 달 쓴 돈",won(s.expMonth),"settle",""],
       ["못 받은 돈",won(unpaidAmt),"pays","bad"]].map(function(x){
        return '<div class="sum'+(x[3]?" "+x[3]:"")+'" data-go="'+x[2]+'"><span>'+esc(x[0])+'</span><b>'+x[1]+'</b></div>'; }).join("")+
    '</div>'+''',
    '''    /* ② 말하는 제목 — 숫자는 파랑 (J안) */
    '<div class="dashhead"><small class="jcrumb">안녕하세요, '+esc((D.me&&D.me.name)||"")+' 님 · '+(now.getMonth()+1)+'월 '+now.getDate()+'일 '+"일월화수목금토"[now.getDay()]+'요일 · '+
        String(now.getHours()).padStart(2,"0")+':'+String(now.getMinutes()).padStart(2,"0")+' 기준</small>'+
      '<h2>'+((late.length||unpaid.length)
        ? ('결제일 지난 업체 <em>'+late.length+'곳</em>, 못 받은 돈 <em>'+won(unpaidAmt)+'</em>이 남아 있어요')
        : ('오늘 급한 일은 없어요. 업체 <em>'+(s.shops||0)+'곳</em>이 진행 중이에요'))+'</h2>'+
      '<div class="sub2">'+Y+'년 '+M+'월 · 할 일 <b>'+todos.length+'건</b> <button class="btn sm" id="todoAll" style="height:30px;margin-left:6px;font-size:12.5px">모두 보기</button></div></div>'+
    /* ③ 할 일 카드 3장 */
    '<div class="j-acts" id="dashTodo"></div>'+
    /* ⑤ 숫자 카드 4개 — 지난주 값은 서버에 없어 «지난주보다» 대신 지금 상태 한 줄 */
    '<div class="j-kpis" id="homeSums">'+
      [["업체",(s.shops||0),"곳","shops","#1668C4","진행 중 "+Math.max(0,(s.shops||0)-(s.shopsOff||0))+"곳 · 보류 "+(s.shopsOff||0)+"곳",""],
       ["이번 달 번 돈",(Number(s.salesMonth)||0).toLocaleString("ko-KR"),"원","pays","#4C93E0","받은 비율 "+(function(){ var pd=Number(s.salesMonth||0), bl=pd+unpaidAmt; return bl?Math.round(pd/bl*100):0; })()+"%",""],
       ["이번 달 쓴 돈",(Number(s.expMonth)||0).toLocaleString("ko-KR"),"원","settle","#0B2545","남은 것 "+won(prof),prof<0?"bad":""],
       ["못 받은 돈",unpaidAmt.toLocaleString("ko-KR"),"원","pays","#E08A00",unpaid.length?("입금 대기 "+unpaid.length+"건"):"없어요",unpaid.length?"bad":""]].map(function(x){
        return '<div class="j-kpi" data-go="'+x[3]+'" role="button" tabindex="0"><small><i style="background:'+x[4]+'"></i>'+esc(x[0])+'</small><strong>'+x[1]+'<em>'+x[2]+'</em></strong><span class="tr '+x[6]+'">'+esc(x[5])+'</span></div>'; }).join("")+
    '</div>'+''')
rep('''        '<div class="card">'+
          '<h2>오늘 할 일</h2>'+
          '<div class="todo" id="dashTodo"></div>'+
        '</div>'+''', '')
rep('''  todos.slice(0,3).forEach(function(t){ box.appendChild(todoBtn(t)); });
  if(todos.length>3){
    var more=document.createElement("button");
    more.type="button"; more.className="todoMore";
    more.innerHTML='할 일 <b>'+todos.length+'건</b> 모두 보기';
    more.onclick=function(){ todoSheet(todos, todoBtn); };
    box.appendChild(more);
  }''', '''  /* J안 할 일 카드 — 급한 것(빨강) · 메모(주황) · 나머지(파랑). 0건은 뒤로 */
  function jAct(t){
    var b=document.createElement("button"); b.type="button";
    var isMemo=typeof t[0]==="string", kind=t[4]==="imp"?"stop":(isMemo?"chk":"run");
    var icn=t[4]==="imp"?"wallet":(isMemo?"file":"shop");
    b.className="j-act";
    b.innerHTML='<span class="ico '+kind+'">'+ic(icn)+'</span><span class="tx"><b>'+esc(t[1])+(isMemo?"":(' '+esc(String(t[0]))+'건'))+'</b><small>'+esc(t[2]||" ")+'</small></span><span class="ar">→</span>';
    b.onclick=function(){ t[3](); window.scrollTo(0,0); };
    return b;
  }
  var pick=todos.filter(function(t){ return typeof t[0]==="string" || Number(t[0])>0; });
  pick.sort(function(x,y){ return (y[4]==="imp")-(x[4]==="imp"); });
  pick.concat(todos.filter(function(t){ return pick.indexOf(t)<0; })).slice(0,3).forEach(function(t){ box.appendChild(jAct(t)); });
  if($("todoAll")) $("todoAll").onclick=function(){ todoSheet(todos, todoBtn); };''')
rep('''+' <span style="font-size:13px;color:var(--muted);font-weight:600">수금</span></div>''',
    '''+' <span style="font-size:13px;color:var(--muted);font-weight:600">입금</span></div>''')

# ───────── 4-5. J안 덮개 CSS · 머리말 스크립트 넣기 ─────────
css = open(os.path.join(HERE, "v4재료", "j4.css"), encoding="utf-8").read()
js = open(os.path.join(HERE, "v4재료", "j4.js"), encoding="utf-8").read()
rep('''body,.card,.sheet,.askbox,.banner,th,td,.hint,.empty{word-break:keep-all;overflow-wrap:break-word}
.who .mypglb{font-weight:800;font-size:12px;white-space:nowrap}

</style>''', '''body,.card,.sheet,.askbox,.banner,th,td,.hint,.empty{word-break:keep-all;overflow-wrap:break-word}
.who .mypglb{font-weight:800;font-size:12px;white-space:nowrap}

</style>
<style>
''' + css + '''
</style>''')
rep('/* 이미 로그인해 둔 기기라면 바로 들어갑니다 */', js + '\n/* 이미 로그인해 둔 기기라면 바로 들어갑니다 */')
rep('<meta name="theme-color" content="#1668C4">', '<meta name="theme-color" content="#0B2545">')

# ───────── 5. 「돈」 → 「금액」 (기준서 6-4) ─────────
# 「돈」과 「금액」은 둘 다 받침이 있어 뒤 토씨(을 · 이 · 은 · 도 · 과)가 그대로 맞습니다.
for a, b in [("이번 달 번 돈", "이번 달 들어온 금액"), ("이번 달 쓴 돈", "이번 달 나간 금액"),
             ("번 돈 − 쓴 돈", "들어온 금액 − 나간 금액"), ("년 번 돈", "년 들어온 금액"), ("년 쓴 돈", "년 나간 금액"),
             ("돈 내는 방식", "결제 방식"), ("돈을 내야", "요금을 내야")]:
    s = s.replace(a, b)
s = s.replace("번 돈", "들어온 금액").replace("쓴 돈", "나간 금액").replace("돈", "금액")
s = s.replace("이번 달 수금", "이번 달 입금")
# 찾기 칸 · 업체 상태 줄 (J안 「말 바꾼 곳」 표)
s = s.replace('placeholder="🔍 표에서 찾기"', 'placeholder="🔍 검색"').replace("🔍 표에서 찾기", "🔍 검색")
rep("<span>쓰는 곳 / 멈춘 곳</span>", "<span>진행 중 / 보류</span>")

open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", OUT, len(s), "글자")
