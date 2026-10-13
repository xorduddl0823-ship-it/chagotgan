# -*- coding: utf-8 -*-
# 관리(옛 관제센터) → 워시 뼈대로 옮기기. 원본은 건드리지 않고 3_차곳간_관리_index.html 을 새로 만듭니다.
import io, re, sys
D = r"C:\Users\admin\Downloads\차곳간_통합UI_시작꾸러미" + "\\"
SRC, WASH, OUT = D+"관제센터_index.html", D+"1_차곳간_워시_index.html", D+"3_차곳간_관리_index.html"
a = io.open(SRC, encoding="utf-8").read()
w = io.open(WASH, encoding="utf-8").read()
LOG = []
def rep(old, new, cnt=1, src=None):
    global a
    n = a.count(old)
    if cnt is not None and n != cnt:
        print("!! 개수 다름", n, "≠", cnt, "::", old[:90]); sys.exit(1)
    a = a.replace(old, new); LOG.append((n, old[:60]))

def block(src, start_pat):
    """start_pat 로 시작하는 함수(중괄호 짝) 전체의 [시작,끝) 위치"""
    i = src.find(start_pat)
    if i < 0: print("!! 못 찾음", start_pat); sys.exit(1)
    k = src.index("{", i); d = 0
    for e in range(k, len(src)):
        if src[e] == "{": d += 1
        elif src[e] == "}":
            d -= 1
            if d == 0: return i, e + 1

# ───────── 1. 워시 CSS 두 덩어리 (본 CSS · cgg-ui) 그대로 ─────────
ws0 = w.find("<style"); ws = w.find(">", ws0) + 1; we = w.find("</style>", ws)
WASH_CSS = w[ws:we]
MARK = "/* ═══════ 차곳간 공통 UI — cgg-ui 1.1"
ci = w.find(MARK); cs = w.rfind(">", 0, ci) + 1; ce = w.find("</style>", ci)
CGG_CSS = w[cs:ce]
assert CGG_CSS.strip().startswith(MARK), "cgg-ui 블록 위치 이상"

# ───────── 2. 관리 CSS 에서 워시와 겹치는 규칙 빼기 ─────────
s0 = a.find("<style>"); s1 = a.find("</style>", s0)
css = a[s0+7:s1]
def chunks(t):
    out=[]; i=0; st=0; dep=0; n=len(t)
    while i < n:
        if t.startswith("/*", i): i = t.find("*/", i+2) + 2; continue
        c = t[i]
        if c == "{": dep += 1
        elif c == "}":
            dep -= 1
            if dep == 0: out.append(t[st:i+1]); st = i+1
        i += 1
    if t[st:].strip(): out.append(t[st:])
    return out
DEL = [r'^:root', r'^@media \(prefers-color-scheme', r'^\*\{', r'^html,body', r'^body\{', r'^button,input',
       r'^#gate', r'^\.gbox', r'^\.glogo', r'^header\b', r'^label\.f', r'^input\[type=text\]', r'^input:focus',
       r'^\.btns?\b', r'^\.msg\b', r'^#app\b', r'^nav\b', r'^main\{', r'^h2\.sec', r'^p\.lead', r'^\.card\{',
       r'^\.tbar\b', r'^\.homeMain', r'^@media\(max-width:980px\)\{\.homeMain', r'^\.panel', r'^\.cal(Hd|Grid|Cell|Ev|Lg)?\b',
       r'^@media\(max-width:700px\)\{\.calCell', r'^\.todoAdd', r'^#tdList', r'^\.tdRow', r'^\.dash\{', r'^\.twrap',
       r'^table\{', r'^th,td\{', r'^thead th', r'^tbody tr', r'^th\.stick', r'^input\[type=checkbox\]', r'^th\.ck',
       r'^\.pg\b', r'^\.empty\{', r'^#bg', r'^#sheet', r'^\.row2', r'^@media\(max-width:560px\)\{\.row2', r'^\.hint\{',
       r'^\.toast', r'^\.num\{', r'^\.bar\b', r'^\.dRow\.money \.kbox', r'^\.dRow\.money \.v', r'^\.dRow\.mini +\.v',
       r'^\.kbox:hover', r'^\.kbox\.hl']
kept, gone = [], []
for ch in chunks(css):
    key = re.sub(r'/\*.*?\*/', '', ch, flags=re.S).strip()
    key = re.sub(r'\s+', ' ', key).replace("{ ", "{")
    if any(re.match(p, key) for p in DEL): gone.append(key[:70])
    else: kept.append(ch)
ADM_CSS = "".join(kept)

ALIAS = r'''
/* ═══ 관리 → 워시 색 이름 맞추기 (UI 1.1) — 값은 워시 것을 그대로 씁니다 ═══ */
:root{--blue:var(--brand);--blue-soft:var(--brand-soft);--navy:var(--accent);--ok:var(--good);
  --blue-deep:#0E4E9B;--block:#E6EDF7;--block-line:#D3DEED}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--blue-deep:#8AC2F8;--block:#101A29;--block-line:#223145}}
:root[data-theme="dark"]{--blue-deep:#8AC2F8;--block:#101A29;--block-line:#223145}
'''
SUPP = r'''
/* ═══════ 관리 전용 보충 — 워시에 없는 부품을 워시 모양에 맞춘 것 (UI 1.1) ═══════ */
a.btn{display:inline-block;font-family:inherit;font-size:15px;font-weight:700;border-radius:11px;border:1px solid var(--line);
  background:var(--surface2);color:var(--text);padding:11px 14px;cursor:pointer;text-decoration:none;white-space:nowrap}
.btn.sm{padding:6px 10px;font-size:13px}
.btn.primary{background:var(--brand);border-color:var(--brand);color:#fff}
.btn.danger{color:var(--danger)}
.tools .sp{flex:1}
.tools .cnt{font-size:12px;color:var(--muted);font-weight:700}
.tools select.flt{width:auto;max-width:170px}
.tools h3,.tools h2{margin:0}
p.lead{font-size:12px;color:var(--muted);margin:5px 0 12px}
.sheet .sub{font-size:13px;color:var(--muted);margin-bottom:14px}
.prog.w i{background:var(--warn)} .prog.d i{background:var(--danger)}
#homeSums .sum[data-go]{cursor:pointer}
/* 둘째 줄 작은 탭 앞 글자 — 워시는 «설정» 고정, 관리는 묶음 이름(홈·업체·…·설정)을 보여 줍니다 */
.wrap:not(.side) > header #setSub[data-label]::before{content:attr(data-label)}
/* 숫자 칸(kbox) — 워시 .sum 과 같은 모양 */
.kbox{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:11px 12px;text-align:center;
  box-shadow:none;transition:none}
.kbox .t{display:block;font-size:11px;color:var(--muted);font-weight:700;letter-spacing:0}
.kbox .v{font-size:17px;font-weight:900;letter-spacing:-.02em;margin-top:0;line-height:1.55}
.kbox .s{font-size:11px;color:var(--muted)}
.kbox.warn .v{color:var(--danger)}
'''

# ───────── 3. 몸통 HTML — 워시 머리말·창 그대로 ─────────
S_IN  = "width:100%;box-sizing:border-box;padding:15px 14px;font-size:17px;border-radius:12px;border:1px solid var(--line,#dde3ec);background:var(--surface,#fff);color:var(--text,#14202e);margin-top:7px"
S_BTN = "width:100%;padding:16px;font-size:17px;font-weight:700;border:0;border-radius:12px;background:var(--brand,#0b5d8f);color:#fff;cursor:pointer;margin-top:16px"
S_GHOST = "width:100%;padding:14px;font-size:16px;border:1px solid var(--line,#dde3ec);border-radius:12px;background:transparent;color:var(--muted,#667389);cursor:pointer;margin-top:10px"
S_LAB = "font-size:14px;font-weight:600;color:var(--muted,#667389);margin-top:14px;display:block"
GATE = f'''<!-- ===== 로그인 — 워시 로그인 화면과 같은 모양 ===== -->
<div id="gate" style="position:fixed;inset:0;z-index:99999;background:var(--bg,#f4f6f9);display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto;font-family:inherit;color:var(--text,#14202e)">
  <div style="width:100%;max-width:400px">
    <div style="text-align:center;margin-bottom:22px">
      <div style="font-size:30px;font-weight:800;letter-spacing:-1px">차곳간</div>
      <div style="font-size:13px;color:var(--muted,#667389);margin-top:4px">관리 · 본사 관리자 전용</div>
    </div>
    <div style="background:var(--surface,#fff);border:1px solid var(--line,#dde3ec);border-radius:var(--r,14px);padding:22px 20px;box-shadow:var(--shadow,0 2px 10px rgba(16,32,52,.08))">
      <h2 style="margin:0 0 4px;font-size:20px">로그인</h2>
      <label style="{S_LAB}" for="gid">아이디</label>
      <input id="gid" type="text" autocomplete="username" placeholder="아이디" style="{S_IN}">
      <label style="{S_LAB}" for="gpw">비밀번호</label>
      <input id="gpw" type="password" autocomplete="current-password" placeholder="비밀번호" style="{S_IN}">
      <button id="gGo" style="{S_BTN}">들어가기</button>
      <div id="gStep2" hidden>
        <div style="font-size:14px;color:var(--muted,#667389);margin-top:14px;line-height:1.6" id="gTo"></div>
        <label style="{S_LAB}" for="gcode">문자로 받은 6자리</label>
        <input id="gcode" type="tel" inputmode="numeric" maxlength="6" placeholder="000000" autocomplete="one-time-code" style="{S_IN};letter-spacing:8px;font-size:24px;text-align:center;font-weight:700">
        <button id="gGo2" style="{S_BTN}">확인</button>
        <button id="gBack" style="{S_GHOST}">처음부터 다시</button>
      </div>
      <div id="gMsg" style="font-size:14px;margin-top:12px;min-height:20px;line-height:1.5"></div>
    </div>
    <div style="text-align:center;font-size:12px;color:var(--muted,#667389);margin-top:16px;line-height:1.8" id="gVer"></div>
  </div>
</div>

<!-- ===== 본 화면 — 워시 머리말과 같은 뼈대 ===== -->
<div class="wrap pc" id="app" style="display:none">
<header>
  <div class="brandrow">
    <div class="logo" data-logo="1">관리</div>
    <div>
      <h1 id="hTitle">차곳간</h1>
      <div class="sub" id="hSub">관리 · 본사 관리</div>
      <div class="sub" id="hVer" style="font-size:10.5px;opacity:.6"></div>
    </div>
    <div class="bizcard" id="bizCard"><div class="bizname" id="hBiz" hidden></div></div>
    <div class="hdr-right" id="hdrRight">
      <span class="hr1">
        <button class="mini" id="btnOut">로그아웃</button></span>
      <span class="hr2">
      <button class="mini" id="btnReload" title="새로고침">↻ 새로고침</button>
      </span>
      <button type="button" class="who" id="hWho" title="내 계정"><span class="av" id="hAv" hidden></span><span class="wt"><b id="meName">-</b><br><span id="meRole">-</span></span><span class="mypglb">👤 마이페이지</span></button>
    </div>
  </div>
  <div class="tabs" id="nav"></div>
  <div class="tabs" id="setSub" hidden style="margin-top:6px"></div>
</header>
<section id="main"></section>
</div>

<div class="sheetbg" id="sheetbg"></div>
<div class="sheet" id="sheet"></div>
<div class="askbg" id="askbg"></div>
<div class="askbox" id="askbox"></div>
<div class="toast" id="toast"></div>
'''
b0 = a.find("<!-- ===== 로그인 ===== -->"); b1 = a.find("<script>", b0)
a = a[:b0] + GATE + "\n" + a[b1:]
# 머리 · CSS
rep("<title>차곳간 관제센터</title>", "<title>차곳간 관리</title>")
s0 = a.find("<style>"); s1 = a.find("</style>", s0)
a = a[:s0] + "<style>\n" + ALIAS + ADM_CSS + "\n</style>\n<style>\n" + WASH_CSS + "\n" + SUPP + "</style>\n<style>\n" + CGG_CSS + "</style>" + a[s1+8:]

# ───────── 4. 스크립트 ─────────
rep('''/* 관제센터 판 번호 — 고칠 때마다 이 줄만 바꾸면 화면에 그대로 나옵니다 */
var ADM_VER="v3.5 목록에 비고 칸 (2026-09-29)";
try{
  document.title = "차곳간 관제센터 " + ADM_VER.split(" ")[0];
  var _g=document.getElementById("gVer"); if(_g) _g.textContent = ADM_VER;
  var _h=document.getElementById("hdVer"); if(_h) _h.textContent = ADM_VER.split(" ")[0];
}catch(e){}''',
'''/* 관리 판 번호 — 고칠 때마다 이 줄만 바꾸면 화면에 그대로 나옵니다 (워시 APP_VER 와 같은 꼴) */
var ADM_VER="관리 v3.6 · UI 1.1 · 2026-10-12";
try{
  document.title = "차곳간 관리";
  var _g=document.getElementById("gVer"); if(_g) _g.textContent = ADM_VER;
  /* 판 번호는 짧게 — 「v3.6 · UI 1.1」 (전체는 마우스를 올리면 보입니다) — 워시와 같은 식 */
  var _h=document.getElementById("hVer");
  if(_h){ _h.textContent = ADM_VER.replace(/^\\S+\\s+/,"").replace(/\\s*·\\s*\\d{4}-\\d{2}-\\d{2}\\s*$/,""); _h.title = ADM_VER; }
}catch(e){}''')

# 창(시트) · 묻는 창 — 워시 것 그대로
i0, i1 = block(a, "function closeSheet(){")
rep(a[i0:i1], '''function closeSheet(){ $("sheet").classList.remove("show"); $("sheetbg").classList.remove("show"); $("sheet").innerHTML=""; }''')
i0, i1 = block(a, "function openSheet(html){")
rep(a[i0:i1], '''function openSheet(html){
  /* 워시와 같은 창 — 오른쪽 위 ✕ 단추, 아래 단추 줄은 sheetbtns (UI 1.1) */
  var sh=$("sheet");
  if(html!==undefined) sh.innerHTML=String(html).replace(/class="btns"/g,'class="sheetbtns"');
  if(!sh.querySelector(".sheetx")){
    var x=document.createElement("button");x.type="button";x.className="sheetx";x.textContent="✕";
    x.onclick=closeSheet;sh.insertBefore(x,sh.firstChild);
  }
  sh.classList.add("show");$("sheetbg").classList.add("show");
  var f=sh.querySelector("input:not([type=checkbox]),select,textarea"); if(f) setTimeout(function(){ try{f.focus();}catch(e){} },60);
}''')
rep('$("bg").onclick=closeSheet;', '$("sheetbg").onclick=closeSheet;')
i0, i1 = block(a, "function confirmBox(")
rep(a[i0:i1], '''/* 묻는 창 — 워시 ask() 그대로 (가운데 작은 창) */
function closeAsk(){$("askbox").classList.remove("show");$("askbg").classList.remove("show");}
function ask(msg,onOk,okText,danger){
  $("askbox").innerHTML='<div class="msg">'+esc(msg)+'</div>'+
    '<div class="row"><button class="btn" id="askNo">취소</button>'+
    '<button class="btn '+(danger?"danger":"primary")+'" id="askYes">'+esc(okText||"네, 진행")+'</button></div>';
  $("askbox").classList.add("show");$("askbg").classList.add("show");
  $("askNo").onclick=closeAsk;
  $("askYes").onclick=function(){closeAsk();if(onOk)onOk();};
}
function confirmBox(title,text,okText,danger,onOk){ ask(title+(text?"\\n"+text:""), onOk, okText, danger); }''')

# 표 — 워시 gTable 과 같은 모양 (도구줄 · tablebox · c-chk/c-name · 쪽 넘김)
t0 = a.find("    var h = '<div class=\"tbar\">'+")
t1 = a.find("    host.innerHTML = h;", t0)
assert t0 > 0 and t1 > t0
a = a[:t0] + r'''    /* ── 워시 표와 똑같은 뼈대 (UI 1.1): 도구줄 → tablebox → 쪽 넘김 ── */
    var h = '<div class="tools">'+
      '<input class="gq" type="text" id="'+o.id+'_q" placeholder="🔍 표에서 찾기" value="'+esc(st.q)+'">'+
      '<select class="gs" id="'+o.id+'_size">'+[5,10,20,30,50].map(function(n){
        return '<option value="'+n+'"'+(st.size===n?" selected":"")+'>'+n+'개씩</option>'; }).join("")+'</select>'+
      (o.filters||[]).map(function(f){
        var cur = st.f[f.k]===undefined ? "" : String(st.f[f.k]);
        return '<select class="flt" data-f="'+esc(f.k)+'" title="'+esc(f.label)+'">'+
          f.opts.map(function(op){
            return '<option value="'+esc(op[0])+'"'+(cur===String(op[0])?" selected":"")+'>'+esc(op[1])+'</option>';
          }).join("")+'</select>';
      }).join("")+
      (o.filters&&o.filters.length ? '<button class="btn" id="'+o.id+'_fclr">거르기 지우기</button>' : '')+
      (o.bulk?('<button class="btn danger" id="'+o.id+'_bulk">선택 처리</button>'):'')+
      '</div>';

    var L0 = o.checks ? 46 : 0;
    h += '<div class="gbody"><div class="tablebox"><table style="min-width:'+(o.min||760)+'px"><thead><tr>';
    if(o.checks) h += '<th class="c-chk"><input type="checkbox" id="'+o.id+'_all"></th>';
    o.cols.forEach(function(c,i){
      var on = st.key===c.k;
      h += '<th data-k="'+esc(c.k)+'" class="'+(i===0?"c-name ":"")+(c.nosort?"nosort ":"")+(on?"on":"")+'" style="'+
           (i===0?("left:"+L0+"px;"):"")+(c.num?"text-align:right;":"")+(c.w?("min-width:"+c.w+"px;"):"")+'">'+
           esc(c.label)+(c.nosort?"":(' <span class="ar">'+(on?(st.dir==="asc"?"▲":"▼"):"↕")+'</span>'))+'</th>';
    });
    h += '</tr></thead><tbody>';
    view.forEach(function(r,ri){
      var rid = o.rowId ? o.rowId(r) : ri;
      h += '<tr data-id="'+esc(rid)+'">';
      if(o.checks) h += '<td class="c-chk"><input type="checkbox" data-ck="'+esc(rid)+'"'+(st.sel[rid]?" checked":"")+'></td>';
      o.cols.forEach(function(c,i){
        var cellv = c.html ? c.html(r) : esc(r[c.k]==null?"":r[c.k]);
        h += '<td class="'+(i===0?"c-name ":"")+(c.num?"num ":"")+(c.mono?"mono ":"")+'"'+
             (i===0?(' style="left:'+L0+'px;"'):'')+'>'+cellv+'</td>';
      });
      h += '</tr>';
    });
    h += '</tbody></table>'+(view.length?'':('<div class="empty">'+
         esc((typeof o.empty==="function"?o.empty(o.rows||[]):o.empty)||"보여드릴 자료가 없습니다.")+'</div>'))+'</div>';

    /* 쪽 넘김 — 워시·체크와 같은 모양 (처음 · 이전 · N / M · 모두 N줄 · 다음 · 맨뒤) */
    h += '<div class="pager">'+
      '<button class="btn gfirst" id="'+o.id+'_first"'+(st.page<=1?" disabled":"")+'>처음</button>'+
      '<button class="btn gprev" id="'+o.id+'_prev"'+(st.page<=1?" disabled":"")+'>이전</button>'+
      '<span class="pg">'+st.page+' / '+pages+' · 모두 '+total+'줄</span>'+
      '<button class="btn gnext" id="'+o.id+'_next"'+(st.page>=pages?" disabled":"")+'>다음</button>'+
      '<button class="btn glast" id="'+o.id+'_last"'+(st.page>=pages?" disabled":"")+'>맨뒤</button></div></div>';
''' + a[t1:]
rep('''    var nx=$(o.id+"_next"); if(nx) nx.onclick=function(){ if(st.page<pages){st.page++;draw();} };''',
'''    var nx=$(o.id+"_next"); if(nx) nx.onclick=function(){ if(st.page<pages){st.page++;draw();} };
    var fs=$(o.id+"_first"); if(fs) fs.onclick=function(){ if(st.page>1){st.page=1;draw();} };
    var ls_=$(o.id+"_last"); if(ls_) ls_.onclick=function(){ if(st.page<pages){st.page=pages;draw();} };''')

# 낱말 · 묶음 이름표 (워시 이름으로)
rep('class="tbar"', 'class="tools"', None)
rep('class="btns"', 'class="sheetbtns"', None)
rep('confirmBox("로그아웃","관제센터에서 나갑니다."', 'confirmBox("로그아웃","관리에서 나갑니다."')
rep('["m10","관제센터 비밀번호를', '["m10","관리 비밀번호를')
# 게이지 막대 → 워시 .prog
rep('''    '<div class="bar'+cls+'"><i style="width:''', '''    '<div class="prog'+cls+'"><i style="width:''')

# 화면 제목: <h2 class="sec">X</h2> + <p class="lead">Y</p> → 워시 dashhead
n_head = 0
def _hd(m):
    global n_head; n_head += 1
    return "'<div class=\"dashhead\"><h2>" + m.group(1) + "</h2>'+\n    '<div class=\"sub2\">" + m.group(2) + "</div></div>'"
a, k = re.subn(r"'<h2 class=\"sec\">([^<]*)</h2>'\+\s*'<p class=\"lead\">(.*?)</p>'", _hd, a)
# 카드 안 제목 → 워시 .card h2
a, k2 = re.subn(r'<h2 class="sec" style="font-size:17px">', '<h2>', a)
a, k3 = re.subn(r'<h2 class="sec" style="font-size:17px;margin:0">', '<h2 style="margin:0">', a)
a, k4 = re.subn(r'<h3 class="sec" style="margin(?:-bottom)?:[^"]*">(.*?)</h3>', r'<h2>\1</h2>', a)
a, k4b = re.subn(r'<h3 class="sec" style="margin:0">(.*?)</h3>', r'<h2 style="margin:0">\1</h2>', a)
# 카드 밖 표 제목 + 표 → 워시처럼 카드로 감싸기
a, k5 = re.subn(r"'<h3 class=\"sec\" style=\"margin-top:18px\">([^<]*)</h3><div id=\"(\w+)\"></div>'",
                "'<div class=\"card\"><h2>\\1</h2><div id=\"\\2\"></div></div>'", a)
# 설명이 여러 조각으로 이어진 제목 — 여는 쪽과 그 뒤 첫 </p>' 를 짝으로 바꿉니다
while True:
    m = re.search(r"'<h2 class=\"sec\">([^<]*)</h2>'\+(\s*)'<p class=\"lead\">", a)
    if not m: break
    e = a.find("</p>'", m.end())
    a = a[:m.start()] + "'<div class=\"dashhead\"><h2>" + m.group(1) + "</h2>'+" + m.group(2) + "'<div class=\"sub2\">" + \
        a[m.end():e] + "</div></div>'" + a[e+5:]
    n_head += 1
a, k6 = re.subn(r"'<h2 class=\"sec\">([^<]*)</h2><div class=\"card\">", "'<div class=\"dashhead\"><h2>\\1</h2></div><div class=\"card\">", a)
n_head += k6
# 잠금 화면 — 카드 밖 표 두 개도 워시처럼 카드 안으로
rep('''  h+='<h3 class="sec" style="margin-top:18px">업체별 상태</h3>'+
    '<p class="lead">한 곳만 더 열어 두고 싶으시면 «열어 두기»에 날짜를 넣으세요. 그 날짜까지는 평소처럼 다 됩니다.</p>'+
    '<div id="lkShopT"></div>';''',
'''  h+='<div class="card"><h2>업체별 상태</h2>'+
    '<p class="lead">한 곳만 더 열어 두고 싶으시면 «열어 두기»에 날짜를 넣으세요. 그 날짜까지는 평소처럼 다 됩니다.</p>'+
    '<div id="lkShopT"></div></div>';''')
rep('''  h+='<h3 class="sec" style="margin-top:18px">자료 정리 대상</h3>'+
    '<p class="lead">보관 기간이 끝나가는 업체입니다. <b>자동으로 지우지 않습니다.</b> 눈으로 보시고 직접 누르셔야 지워집니다.</p>'+
    (LOCK.purge && LOCK.purge.length ? '<div id="lkPurgeT"></div>'
      : '<div class="hint">지금은 정리할 업체가 없습니다.</div>');''',
'''  h+='<div class="card"><h2>자료 정리 대상</h2>'+
    '<p class="lead">보관 기간이 끝나가는 업체입니다. <b>자동으로 지우지 않습니다.</b> 눈으로 보시고 직접 누르셔야 지워집니다.</p>'+
    (LOCK.purge && LOCK.purge.length ? '<div id="lkPurgeT"></div>'
      : '<div class="hint">지금은 정리할 업체가 없습니다.</div>')+'</div>';''')
LOG.append((n_head, "제목 dashhead")); LOG.append((k2+k3+k4+k4b, "카드 제목")); LOG.append((k5, "표 카드 감싸기"))

exec(io.open(__file__.replace("build_admin.py", "build_admin2.py"), encoding="utf-8").read())

io.open(OUT, "w", encoding="utf-8").write(a)
print("빠진 관리 CSS 규칙", len(gone)); [print("   -", g) for g in gone]
for n, o in LOG: print(f"{n:4}  {o}")
print("남은 sec:", len(re.findall(r'class="sec"', a)), " lead:", a.count('class="lead"'))
for m in re.finditer(r'class="sec"', a): print("   ", a[m.start()-60:m.start()+90].replace("\n", " "))
