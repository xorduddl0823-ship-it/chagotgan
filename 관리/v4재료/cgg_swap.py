"""관리 v4.3 — J안 4판 완성 모양: 디자인 방 공통 부품 cgg-j4 1.3 로 바꿔 끼우기 (대표님 «새 디자인 먼저», 2026-10-15)
틀 · 메뉴 배치 · 폰 탭바 · 할 일 카드 · 사람 단추 ▾ 는 공통 부품(글자 그대로), 관리만 있는 것은 j4c.css · j4c.js
쓰는 곳: 관리/만들기_관리_v4.3.py 가 swap(s) 를 불러요."""
import os, re
HERE = os.path.dirname(os.path.abspath(__file__))
G = os.path.join(HERE, "..", "..", "디자인", "공통")

def _rep(s, old, new):
    if s.count(old) != 1: raise SystemExit("cgg_swap 찾은 수 %d: %s" % (s.count(old), old[:80]))
    return s.replace(old, new)

def swap(s):
    cggcss = open(os.path.join(G, "cgg-j4.css"), encoding="utf-8").read()
    cggjs  = open(os.path.join(G, "cgg-j4.js"), encoding="utf-8").read()
    j4ccss = open(os.path.join(HERE, "j4c.css"), encoding="utf-8").read()
    j4cjs  = open(os.path.join(HERE, "j4c.js"), encoding="utf-8").read()
    # CSS: 예전 덮개 → 관리 몫, 공통 부품은 맨 마지막 <style> 끝
    a = s.index("/* ═══════ J안 4판 덮개 — 관리 v4.0"); b = s.index("</style>", a)
    s = s[:a] + j4ccss + s[b:]
    i = s.rindex("</style>"); s = s[:i] + "\n/* ═══ 공통 부품 (디자인 방 · 글자 그대로) ═══ */\n" + cggcss + "\n" + s[i:]
    # JS: 예전 머리말 스크립트 → 공통 부품을 쓰는 관리 몫, 공통 부품 스크립트는 제품 스크립트보다 먼저
    a = s.index("/* ═══════ J안 4판 — 머리말 버튼")
    e = 'try{ new MutationObserver(addCrumb).observe($("main"),{childList:true}); }catch(e){}'
    b = s.index(e, a) + len(e)
    s = s[:a] + j4cjs + s[b:]
    s = _rep(s, '<script>\n(function(){\n/* 관리 판 번호', '<script>\n' + cggjs + '\n</script>\n<script>\n(function(){\n/* 관리 판 번호')
    # 틀 이름표 — 원래 id 그대로, class 만 공통 이름 (예전 .wrap · header · .tabs 규칙은 안 걸림)
    s = _rep(s, '<div class="wrap pc" id="app" style="display:none">', '<div class="cgg-app" id="app" style="display:none">')
    s = _rep(s, '<header class="jh" id="jh">', '<div class="jh cgg-hdr" id="jh" role="banner">')
    a = s.index('<div class="jh cgg-hdr" id="jh" role="banner">'); b = s.index('</header>', a)
    s = s[:b] + '</div>' + s[b + len('</header>'):]
    s = _rep(s, '<div class="jh-top">', '<div class="jh-top cgg-top">')
    s = _rep(s, '<div class="jh-brand"><span class="j-ci" aria-hidden="true">차</span>',
                '<div class="jh-brand cgg-brand"><span class="j-ci cgg-ci" aria-hidden="true">차</span>')
    s = _rep(s, '<div class="jh-right" id="hdrRight">', '<div class="jh-right cgg-right" id="hdrRight">')
    for bid in ("btnNotice", "btnHelp", "btnLink"):
        s = _rep(s, '<button type="button" class="jhb" id="%s">' % bid, '<button type="button" class="jhb cgg-wide" id="%s">' % bid)
    s = _rep(s, '<nav class="tabs" id="nav" aria-label="메뉴"></nav>', '<nav class="cgg-nav" id="nav" aria-label="메뉴"></nav>')
    s = _rep(s, '<div class="tabs" id="setSub" hidden></div>', '<div class="cgg-sub" id="setSub" hidden></div>')
    s = _rep(s, '<section id="main"></section>', '<section class="cgg-main" id="main"></section>')
    s = _rep(s, '<div class="j-drop" id="jMe" role="menu" hidden></div>\n', '')
    s = _rep(s, '<nav class="j-tbar" id="jTbar" aria-label="아래 메뉴"></nav>', '<nav class="cgg-tbar" id="jTbar" aria-label="아래 메뉴"></nav>')
    s = _rep(s, '$("hBiz").className="jh-biz";', '$("hBiz").className="jh-biz cgg-biz"; WHO.name=(D.me&&D.me.name)||"";')
    # 세로 메뉴에서 작은 탭을 묶음 아래로 옮기던 것 → 공통 부품은 본문 윗줄에 고정 (hasSub 만)
    s = _rep(s, '  sb.classList.toggle("inside", $("app").classList.contains("lay-side") && !!on && subs.length>1);\n'
                '  if(sb.classList.contains("inside") && on) on.insertAdjacentElement("afterend", sb); else if(sb.parentNode!==$("jh")) $("jh").appendChild(sb);\n', '')
    # 홈 할 일 카드 3장 — CGG.todos
    s = _rep(s, """'<div class="j-acts" id="dashTodo"></div>'+""", """'<div class="cgg-acts" id="dashTodo"></div>'+""")
    a = s.index('  /* J안 할 일 카드 — 급한 것(빨강)')
    e = '.slice(0,3).forEach(function(t){ box.appendChild(jAct(t)); });'
    b = s.index(e, a) + len(e)
    s = s[:a] + (
        '  /* J안 할 일 카드 3장 — 공통 부품 CGG.todos · 급한 것(빨강) · 메모(주황) · 나머지(파랑). 0건은 뒤로 */\n'
        '  var pick=todos.filter(function(t){ return typeof t[0]==="string" || Number(t[0])>0; });\n'
        '  pick.sort(function(x,y){ return (y[4]==="imp")-(x[4]==="imp"); });\n'
        '  var top3=pick.concat(todos.filter(function(t){ return pick.indexOf(t)<0; })).slice(0,3);\n'
        '  CGG.todos(box, top3.map(function(t){ var isMemo=typeof t[0]==="string";\n'
        '    return {tone:t[4]==="imp"?"stop":(isMemo?"chk":"run"), icon:t[4]==="imp"?"wallet":(isMemo?"file":"shop"),\n'
        '            title:t[1]+(isMemo?"":" "+String(t[0])+"건"), sub:t[2]||" "}; }),\n'
        '    function(i){ top3[i][3](); window.scrollTo(0,0); });') + s[b:]
    # 1.3 — 알림 글은 CGG.toast, 묻는 창은 CGG.dialog(확인 400). 부르는 쪽(toast · ask · confirmBox · closeAsk)은 그대로
    a = s.index('var toastT=null;\nfunction toast(msg,bad){'); b = s.index('\n}', s.index('clearTimeout(toastT)', a)) + 2
    s = s[:a] + ('function toast(msg,bad){ CGG.toast(msg); var t=document.querySelector(".cgg-toastbox"); if(t) t.classList.toggle("bad",!!bad); }') + s[b:]
    a = s.index('function closeAsk(){'); b = s.index('function confirmBox(', a)
    s = s[:a] + (
        'function closeAsk(){ CGG.closeDialog(); }\n'
        '/* 묻는 창 — 공통 확인 창 400. 첫 줄은 제목, 나머지는 설명. «이름: 값» 줄만 있으면 칸으로 보여요 (누구 · 얼마 · 이유) */\n'
        'function ask(msg,onOk,okText,danger){\n'
        '  var ls=String(msg||"").split("\\n"), t=ls.shift(), kv=ls.length && ls.every(function(x){ return /^[^:：]{1,14}[:：] ?\\S/.test(x); });\n'
        '  var dl=CGG.dialog({size:"confirm", title:t, rows:kv?ls.map(function(x){ var i=x.search(/[:：]/); return [x.slice(0,i).trim(), x.slice(i+1).trim()]; }):null,\n'
        '    body:(!kv&&ls.length)?\'<div class="jask">\'+esc(ls.join("\\n"))+\'</div>\':"", ok:okText||"네, 진행",\n'
        '    onOk:function(){ if(onOk) setTimeout(onOk,0); }});\n'
        '  var y=dl.querySelector("[data-dok]"); y.id="askYes"; if(danger) y.classList.add("danger");\n'
        '  var n=dl.querySelector(".ft [data-dx]"); if(n) n.id="askNo";\n'
        '}\n') + s[b:]
    s = _rep(s, '<div class="askbg" id="askbg"></div>\n<div class="askbox" id="askbox"></div>\n<div class="toast" id="toast"></div>\n', '')
    s = _rep(s, 'x.className="sheetx";x.textContent="✕";', 'x.className="sheetx";x.innerHTML=CGG.ic("x");x.setAttribute("aria-label","닫기");')
    # 그림 문자 → 선 아이콘 · 글
    s = _rep(s, 'placeholder="🔍 검색"', 'placeholder="검색"')
    s = s.replace("'\">📝 '+", "'\"><span class=\"jic\">'+CGG.ic(\"file\")+'</span> '+")
    s = _rep(s, '">📝 이 날 메모', '"><span class="jic">\'+CGG.ic("file")+\'</span> 이 날 메모')
    s = _rep(s, "'<span>📝 할 일 <b>'", "'<span><span class=\"jic\">'+CGG.ic(\"file\")+'</span> 할 일 <b>'")
    s = _rep(s, '("⚠ "+v.autoErr)', '("주의 — "+v.autoErr)')
    s = _rep(s, "'<div class=\"dn\">✔ '", "'<div class=\"dn\">확인함 · '")
    # 층 순서 — 제품 CSS 의 큰 숫자 z-index 를 이름으로 (공통 부품 앞부분만)
    i = s.index("/* ═══ 공통 부품 (디자인 방")
    Z = {"30":"--z-hdr","40":"--z-drop","60":"--z-tbar","70":"--z-drop","80":"--z-drop","81":"--z-dialog","90":"--z-dialog","91":"--z-dialog","95":"--z-dialog","100":"--z-toast"}
    head = re.sub(r"z-index:(30|40|60|70|80|81|90|91|95|100)\b", lambda m: "z-index:var(%s)" % Z[m.group(1)], s[:i])
    s = head + s[i:]
    s = _rep(s, '<div id="gate" style="position:fixed;inset:0;z-index:99999;', '<div id="gate" style="position:fixed;inset:0;z-index:var(--z-toast);')
    return s
