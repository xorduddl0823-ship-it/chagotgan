"""관리 v4.9 만들기 — v4.8.3(보안 통과)에 확정된 통합 디자인(미리보기 11판 «관리»)을 넣어요. 화면 모양만 바꿔요.
쓰는 법: python3 관리/만들기_관리_v4.9.py   (v4.8.3 파일은 읽기만 · 지우지 않아요 — 되돌리기용)
- 근거: 디자인/요청서/관리_v4.9_작업요청서.md (디자인 방 · 2026-10-19)
- 재료: 관리/3_차곳간_관리_index_v4.8.3.html · 관리/v4재료/table49.js · 디자인/공통/cgg-j4-1.13.2.css · cgg-j4-1.13.2.js (보안 통과 7257e11, 글자 그대로)
- 결과: 관리/3_차곳간_관리_index_v4.9.html
- 바꾸는 것 (모양만)
  ① 공통 부품 1.5 → 1.13.2 (글자 그대로) · 머리말 = CGG.header (차곳간 CI · «차곳간 관리» · «본사 관리 · v4.9 · 오늘 월/일»)
     · 메뉴 = CGG.nav (기능 찾기는 메뉴 줄 오른쪽 끝) · 폰 아래 탭 = CGG.tabbar + CGG.allMenu · 사람 단추 ▾ = 마이페이지 · 화면 설정 · 로그아웃 (휴지통 · 요금제 없음)
  ② 홈 = CGG.home (자주 쓰는 기능 → 오늘 할 일 3줄 → 숫자 칸 4개 → 일정 달력 | 이번 달 입금 · 운영 상태)
  ③ 표 = 1.13.2 표 모양(table49.js — CGG.table 과 같은 이름표). 관리 표는 일괄 단추가 없어 고르기 칸 없음(F18) · 폰 3칸
     · 손으로 그리던 표 3개(체크 지갑 연결 · 휴대폰 번호로 계정 찾기 기록 · 정산 달마다)도 같은 표로
  ④ 확인 창: 잠금 모두 풀기 · 접속 모두 끊기 · 계정 동작 · 지갑 연결 창을 «누구에게 · 대상 · 하는 일» 칸으로
  ⑤ 말: 휴대폰 번호로 계정 찾기 · 체크 지갑 연결 · 관리자 계정 · 부가세 별도 · 발행 · 남은 금액
- 그대로: 돈 · 로그인(문자 6자리) · 본사 세금계산서 셈 · wash-api 요청 이름 · 값 전부 · 23개 화면 · 8묶음 차례 · 저장 이름 cgg_admin_layout
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
G = os.path.join(HERE, "..", "디자인", "공통")
SRC = os.path.join(HERE, "3_차곳간_관리_index_v4.8.3.html")
OUT = os.path.join(HERE, "3_차곳간_관리_index_v4.9.html")
s = open(SRC, encoding="utf-8").read()

def rep(old, new, n=1):
    global s
    if s.count(old) != n: raise SystemExit("찾은 수 %d (바라는 수 %d): %s" % (s.count(old), n, old[:90]))
    s = s.replace(old, new)

def cut(a_mark, b_mark, new, keep_b=True):
    """a_mark 부터 b_mark 앞까지(keep_b) 또는 b_mark 끝까지 바꿔요"""
    global s
    if s.count(a_mark) != 1: raise SystemExit("시작 찾은 수 %d: %s" % (s.count(a_mark), a_mark[:70]))
    a = s.index(a_mark); b = s.index(b_mark, a)
    if not keep_b: b += len(b_mark)
    s = s[:a] + new + s[b:]

rep('var ADM_VER="관리 v4.8.3 · 공통 1.5 · 2026-10-18";', 'var ADM_VER="관리 v4.9 · 공통 1.13.2 · 2026-10-19";')

# ① 공통 부품 1.5 → 1.13.2 (CSS 는 맨 마지막 <style> 끝, JS 는 제품 스크립트 앞 — 글자 그대로)
cggcss = open(os.path.join(G, "cgg-j4-1.13.2.css"), encoding="utf-8").read()
cggjs = open(os.path.join(G, "cgg-j4-1.13.2.js"), encoding="utf-8").read()
assert '"cgg-j4 1.13.2"' in cggjs
MK = "/* ═══ 공통 부품 (디자인 방 · 글자 그대로) ═══ */\n"
a = s.index(MK) + len(MK); b = s.index("</style>", a)
s = s[:a] + cggcss + "\n" + s[b:]
a = s.index("<script>\n/* ═══════════════════════════════════════════════════════════════════\n   차곳간 공통 부품") + len("<script>\n")
b = s.index("</script>", a)
s = s[:a] + cggjs + "\n" + s[b:]

# ①-2 머리말 HTML — CGG.header 가 채워요. 새로고침 · 로그아웃은 원래 단추(숨김)를 그대로 눌러요
cut('<div class="jh cgg-hdr" id="jh" role="banner">', '<section class="cgg-main" id="main"></section>',
    '<header class="cgg-hdr" id="jh"><div class="cgg-top" id="top"></div><nav class="cgg-nav" id="nav" aria-label="메뉴"></nav></header>\n'
    '<div hidden><button type="button" id="btnReload">새로고침</button><button type="button" id="btnOut">로그아웃</button></div>\n')

# 옛 머리말 규칙(header{…})이 공통 머리말에 새지 않게 — 공통 부품 .cgg-hdr 값 그대로
rep("header{position:sticky;top:env(safe-area-inset-top,0px);z-index:var(--z-hdr);background:var(--surface);\n  border-bottom:1px solid var(--line);margin:0 -14px 26px;padding:11px 14px}",
    "header:not(.cgg-hdr){position:sticky;top:env(safe-area-inset-top,0px);z-index:var(--z-hdr);background:var(--surface);\n  border-bottom:1px solid var(--line);margin:0 -14px 26px;padding:11px 14px}")

# ③ 표 — 1.13.2 모양 (부르는 쪽은 그대로)
a = s.index("var TSTATE = {};\n")
b = s.index("/* =========================================================\n   자료 보관")
s = s[:a] + open(os.path.join(HERE, "v4재료", "table49.js"), encoding="utf-8").read().split("   ========================================================= */\n", 1)[1] + "\n" + s[b:]

# ①-3 화면 그리기 — 메뉴는 CGG.nav (묶음/칸 열쇠), 본문, 화면 머리, 아래 탭
cut("function render(){\n  var sb0=$(\"setSub\");", "/* 선 아이콘 — J안 IC 그대로 */",
'''function render(){
  CGG.nav($("nav"), GROUPS, navKey(TAB), navPick, {find:{feats:FEATS, onGo:goFeat}});
  var f = TABS.filter(function(t){return t[0]===TAB;})[0];
  (f?f[2]:viewSummary)();
  /* ② 묶음 › 화면 이름 · 오늘 날짜 (모든 화면 같은 자리 — CGG.head 모양) */
  addCrumb();
  tbarDraw();
}
''')
rep('var NAVIC={sum:"home",users:"user",shops:"shop",pays:"wallet",settle:"out",tax:"receipt",noti:"bell",settings:"gear"};',
    'var NAVIC={sum:"home",users:"user",shops:"shop",pays:"wallet",settle:"chart",tax:"receipt",noti:"bell",settings:"gear"};')

# 머리말 채우기 — CGG.header (차곳간 CI · 본사 이름 · 공통 차례 단추 · 사람 단추 ▾)
cut("function hdrFill(){\n  $(\"meName\")", "function gmsg(x,bad){",
'''function hdrFill(){
  WHO.name=(D.me&&D.me.name)||"";
  var hq=D.hq||{}, d=new Date();
  CGG.header($("top"),{product:"관리", sub:"본사 관리", ver:ADM_VER.split(" · ")[0].replace(/^관리\\s+/,""), date:(d.getMonth()+1)+"/"+d.getDate(),
    biz:{name:String(hq.biz_name||"차곳간 본사"), line:[hq.biz_no?"사업자 "+fmtBizNo(hq.biz_no):"", hq.ceo?"대표 "+hq.ceo:""].filter(Boolean).join(" · ")||"본사 관리자 전용"},
    find:{mode:"nav", feats:FEATS, onGo:goFeat},
    notice:function(){ jgo("noti"); }, help:helpSheet, link:copyLink, refresh:function(){ $("btnReload").click(); },
    /* 자동 새로고침 · 저장 표시는 관리에 없던 기능이라 넣지 않아요 (요청서 ① — 새 기능 없음) */
    me:{name:WHO.name||"관리자", role:WHO.role, sub:"마이페이지 · 화면 설정", items:function(){ return [
      {key:"me",icon:"user",label:"마이페이지",note:"관리자 계정"}, "-",
      {key:"lay",icon:"pc",label:"화면 설정",note:CGG.layout.name()}, "-",
      {key:"out",icon:"out",label:"로그아웃"}]; },
      onPick:function(k){ if(k==="me") jgo("me"); else if(k==="lay") laySheet(); else if(k==="out") $("btnOut").click(); }}});
}
''')

cut("/* ═══════ 관리 — 머리말 버튼 · 사람 단추 ▾ · 메뉴 배치 · 폰 아래 탭바 (관리 v4.3) ═══════", "\n\n/* 이미 로그인해 둔 기기라면 바로 들어갑니다 */",
'''/* ═══════ 관리 v4.9 — 머리말 · 메뉴 · 폰 아래 탭 · 기능 찾기 = 공통 부품 cgg-j4 1.13.2 ═══════
   CGG.header · CGG.nav · CGG.tabbar · CGG.allMenu · CGG.quick 을 써요. 서버 창구는 하나도 새로 쓰지 않아요.
   화면 이동(TAB · render)과 원래 단추(btnOut · btnReload)만 써요. 메뉴 배치 저장 이름은 v4.0 그대로(cgg_admin_layout). */
CGG.layout.init($("app"), "cgg_admin_layout");
try{ CGG.favicon(); }catch(e){}
function jgo(t){ TAB=t; CGG.closeMenu(); CGG.closeSheet(); window.scrollTo(0,0); render(); }
var WHO = {name:"", role:"본사 관리자"};
/* 메뉴 지도 — 8묶음 · 23화면 차례 그대로 (미리보기 11판 ADMIN 과 같은 모양) */
var GROUPS = NAV.map(function(n){ return {key:n[0], label:n[1], icon:NAVIC[n[0]]||"file",
  subs:n[2].length>1?n[2].map(function(t){ return {key:t, label:tabLabel(t)}; }):[]}; });
function navKey(t){ var g=navOf(t); if(!g) return "sum/sum"; return g[2].length>1?g[0]+"/"+t:g[0]; }
function navPick(k){ var p=String(k||"").split("/"); if(p[1]) return jgo(p[1]);
  var n=NAV.filter(function(z){ return z[0]===p[0]; })[0]; jgo(n?n[2][0]:"sum"); }
/* 기능 찾기 · 홈 바로가기 — 화면 23개 + 미리보기 11판의 이름 · 쉬운 말 */
var FEAT_X={inv:["a-code","가입 코드 주기","가입 코드 새 업체 휴대폰"],ppl:["a-find","휴대폰 번호로 계정 찾기","번호 계정 찾기 잠금 풀기"],
  shops:["a-biz","업체 관리","업체 요금제 기한"],pays:["a-pay","결제 내역","결제 환불 입금 확인"],tax:["a-tax","세금계산서 발행","세금계산서 팝빌 발행"],
  ata:["a-tpl","알림톡 템플릿","알림톡 템플릿 코드 카카오"],sec:["a-sec","보안 점검","보안 점검 위험"]};
var FEATS = [];
NAV.forEach(function(n){ n[2].forEach(function(t){ var x=FEAT_X[t];
  FEATS.push({id:x?x[0]:"a-"+t, label:x?x[1]:tabLabel(t), path:n[1]+(n[2].length>1?" › "+tabLabel(t):""), go:t, words:x?x[2]:tabLabel(t)}); }); });
function goFeat(f){ if(f&&f.go) jgo(f.go); }
document.addEventListener("keydown",function(e){ if(e.key==="Escape"){ closeSheet(); closeAsk(); } });

/* 화면 설정 — 메뉴 배치 셋 (넓은 화면에서만 바뀌고, 폰은 늘 같은 모양) */
function laySheet(){
  openSheet('<h3 style="margin:0 0 4px">화면 설정</h3>'+
    '<div class="hint" style="margin:0 0 14px">메뉴 자리를 고르세요. 이 기기에만 저장돼요. 폰에서는 늘 아래 탭으로 보여요.</div>'+
    '<div id="layBox"></div>');
  CGG.layout.chooser($("layBox"), function(){ closeSheet(); hdrFill(); render(); toast("메뉴 배치를 바꿨어요"); });
}
/* 머리말 단추 — 주소(링크 복사) · 도움말 (공지사항 · 새로고침 · 로그아웃은 원래 하는 일 그대로) */
function copyLink(){
  var u=location.href.split("#")[0];
  function done(){ toast("주소를 복사했어요"); }
  function show(x){ openSheet('<h3 style="margin:0 0 8px">주소</h3><div class="hint" style="margin:0 0 10px">아래 주소를 골라 복사해 주세요.</div><input type="text" readonly value="'+esc(x)+'" onfocus="this.select()">'); }
  try{ navigator.clipboard.writeText(u).then(done,function(){ show(u); }); }catch(e){ show(u); }
}
function helpSheet(){
  openSheet('<h3 style="margin:0 0 4px">도움말</h3><div class="hint" style="margin:0 0 12px">메뉴마다 하는 일이에요. 누르면 그 화면으로 가요.</div>'+
    '<div class="j-allm">'+NAV.map(function(n){
      return '<div><h4>'+esc(n[1])+'</h4><div class="row">'+n[2].map(function(t){
        return '<button type="button" data-go2="'+t+'">'+esc(tabLabel(t))+'</button>'; }).join("")+'</div><div class="hint" style="margin-top:4px">'+esc(NAVHELP[n[0]]||"")+'</div></div>'; }).join("")+'</div>');
  Array.prototype.forEach.call($("sheet").querySelectorAll("[data-go2]"),function(b){
    b.onclick=function(){ closeSheet(); jgo(b.getAttribute("data-go2")); }; });
}
var NAVHELP={ sum:"오늘 할 일 · 이번 달 숫자 · 일정 달력 · 운영 상태를 한눈에 봐요.",
  users:"가입 코드를 보내고, 업체 사람들의 로그인 계정을 관리하고, 휴대폰 번호 하나로 모든 제품 계정을 찾아요.",
  shops:"업체별 요금제 · 이용 기한 · 상태를 보고, 결제가 밀린 곳을 잠그거나 풀어요. 홈페이지에서 가입만 하고 결제를 안 한 곳(결제 대기)과 누구나 가입 스위치도 여기 있어요.",
  pays:"요금제 · 모든 제품 결제 내역 · 충전 · 카드 결제(환불 · 자동 결제) · 체크 지갑 연결 — 업체에서 본사로 들어오는 금액이에요.",
  settle:"정산 · 유지비 — 본사가 내보내는 금액이에요.",
  tax:"세금계산서를 발행하고 확인해요.",
  noti:"기한 안내 문자 · 공지사항 · 알림톡 템플릿 코드 · 발송 기록이에요. 안내는 알림톡이 먼저 나가고, 안 되면 문자로 대신 나가요.",
  settings:"보안 점검과 관리자 계정이에요." };

/* 폰 아래 탭 5칸 — 홈 · 업체 · 받는 금액 · 계산서 · 전체 (전체 = 공통 «전체 메뉴» 판 · 맨 위 기능 찾기) */
function tbarDraw(){
  var g=navOf(TAB), k=g?g[0]:"";
  CGG.tabbar($("jTbar"), [{key:"sum",icon:"home",label:"홈"},{key:"shops",icon:"shop",label:"업체"},{key:"pays",icon:"wallet",label:"받는 금액"},
                          {key:"tax",icon:"receipt",label:"계산서"},{key:"all",icon:"more",label:"전체"}],
    ["sum","shops","pays","tax"].indexOf(k)<0?"all":k,
    function(t){ if(t==="all"){ if(!CGG.closeSheet()) CGG.allMenu(GROUPS, navKey(TAB), navPick, FEATS, goFeat); return; }
      var n=NAV.filter(function(z){return z[0]===t;})[0]; jgo(n?n[2][0]:t); });
}

/* ② 화면 머리 — 공통 CGG.head 모양(.cgg-head > .hello(small · h1 · p) + .acts)으로 맞춰요.
   화면마다 만든 제목 · 설명 · 버튼을 «옮기기만» 해서 id 와 누르면 하는 일은 그대로예요. 화면이 다시 그려져도 늘 붙어요. */
var WD7="일월화수목금토";
function todayTxt(){ var d=new Date(); return (d.getMonth()+1)+"월 "+d.getDate()+"일 "+WD7[d.getDay()]+"요일"; }
function addCrumb(){
  var dh=$("main").querySelector(".dashhead"); if(!dh || dh.classList.contains("cgg-head")) return;
  var g=navOf(TAB), kids=Array.prototype.slice.call(dh.children);
  var hello=document.createElement("div"); hello.className="hello";
  var acts=document.createElement("div"); acts.className="acts";
  if(!dh.querySelector(":scope > .jcrumb"))
    hello.insertAdjacentHTML("beforeend",'<small class="jcrumb">'+esc(g?(g[1]+(g[2].length>1?" › "+tabLabel(TAB):"")):tabLabel(TAB))+' · '+esc(todayTxt())+'</small>');
  kids.forEach(function(c){
    if(c.tagName==="H2"||(c.tagName==="DIV"&&c.classList.contains("sub2"))){ var nx=document.createElement(c.tagName==="H2"?"h1":"p");
      Array.prototype.forEach.call(c.attributes,function(a){ nx.setAttribute(a.name,a.value); }); while(c.firstChild) nx.appendChild(c.firstChild); c=nx; }
    (c.tagName==="BUTTON"||c.classList.contains("btns")?acts:hello).appendChild(c); });
  dh.innerHTML=""; dh.classList.add("cgg-head"); dh.appendChild(hello); if(acts.children.length) dh.appendChild(acts);
}
function kpiFix(){
  Array.prototype.forEach.call($("main").querySelectorAll(".opsTop,.secTop,.ntSum"),function(box){
    var items=Array.prototype.map.call(box.children,function(k){
      var t=k.querySelector(".t,span"), v=k.querySelector(".v,b"), x=k.querySelector(".s");
      var lab=t?t.textContent.trim():"", val=v?v.textContent.trim():"";
      return {label:lab, value:val, unit:"", delta:x?"":null, vs:x?x.textContent.trim():"",
        tone:k.classList.contains("warn")?(/위험/.test(lab)?"stop":"due"):"", zeroMuted:true}; });
    var el=document.createElement("div"); box.parentNode.replaceChild(el,box); CGG.kpis(el,items); });
}
try{ new MutationObserver(addCrumb).observe($("main"),{childList:true}); }catch(e){}
try{ new MutationObserver(function(){ if($("main").querySelector(".opsTop,.secTop,.ntSum")) kpiFix(); }).observe($("main"),{childList:true,subtree:true}); }catch(e){}
''')

# ② 홈 — CGG.home 차례 (계산은 v4.8.3 그대로 · 그리기만 공통 부품)
cut("  var h =\n    /* ② 말하는 제목 — 숫자는 파랑 (J안) */", "/* 오늘 할 일 모두 보기 — 워시 todoSheet 그대로 */",
'''  var paid=Number(s.salesMonth||0), billed=paid+unpaidAmt;
  var u=OPS.usage, L=OPS.limits||{dbGb:8,fileGb:100,warnPct:80};
  var sms=(OPS.services||[]).filter(function(x){return x.code==="solapi";})[0];
  function pad2(n){ return String(n).padStart(2,"0"); }
  /* 일정 달력 — 공통 CGG.calendar (유지비 결제일 · 업체 이용 기한 · 체험 끝 · 할 일) */
  var days={};
  for(var dd=1; dd<=last; dd++){
    var k2=Y+"-"+pad2(M)+"-"+pad2(dd), v2=byDay[k2], ms2=(memoBy[k2]||[]).filter(function(m){ return !m.done; }), mk=[];
    if(v2&&v2.w) mk.push(["w",v2.w]); if(v2&&v2.b) mk.push(["b",v2.b]); if(v2&&v2.r) mk.push(["r",v2.r]); if(ms2.length) mk.push(["m",ms2.length]);
    if(mk.length||(v2&&v2.amt)) days[dd]={amt:v2?v2.amt:0, marks:mk};
  }
  /* 오늘 할 일 — 워시 todoBtn · 「모두 보기」 그대로 */
  function todoBtn(t, onGo){
    var b=document.createElement("button");
    var isMemo=typeof t[0]==="string";
    if(t[4]==="imp")b.className="imp";
    if(isMemo){b.style.background="#fff7ec";b.style.borderColor="#f0c48a";}
    b.innerHTML='<span class="cnt" style="color:'+(isMemo?"#b45309":"var(--brand)")+';'+(isMemo&&t[0].length>2?"font-size:15px":"")+'">'+esc(String(t[0]))+'</span>'+
      '<span class="tx"><b>'+(t[4]==="imp"?'<span class="imptag">중요</span>':"")+esc(t[1])+'</b><span>'+esc(t[2])+'</span></span><span class="go">›</span>';
    b.onclick=function(){ if(onGo) onGo(); t[3](); window.scrollTo(0,0); };
    return b;
  }
  /* 할 일 3줄 — 급한 것(빨강) · 메모(주황) · 나머지(파랑). 0건은 뒤로 */
  var pick=todos.filter(function(t){ return typeof t[0]==="string" || Number(t[0])>0; });
  pick.sort(function(x,y){ return (y[4]==="imp")-(x[4]==="imp"); });
  var top3=pick.concat(todos.filter(function(t){ return pick.indexOf(t)<0; })).slice(0,3);
  var KG=["shops","pays","settle","pays"];
  CGG.home($("main"),{
    title:(late.length||unpaid.length)
      ? ('결제일 지난 업체 <em>'+late.length+'곳</em>, 못 받은 금액 <em>'+esc(won(unpaidAmt))+'</em>이 남아 있어요')
      : ('오늘 급한 일은 없어요. 업체 <em>'+(Number(s.shops)||0)+'곳</em>이 진행 중이에요'),
    desc:"오늘 "+(now.getMonth()+1)+"월 "+now.getDate()+"일 · "+pad2(now.getHours())+":"+pad2(now.getMinutes())+" 기준",
    quick:{feats:FEATS, key:"cgg_admin_quick", defs:["a-pay","a-tax","a-biz","a-code"], onGo:goFeat},
    todo:{items:top3.map(function(t){ var isMemo=typeof t[0]==="string";
        return {tone:t[4]==="imp"?"stop":(isMemo?"chk":"run"), icon:t[4]==="imp"?"wallet":(isMemo?"file":"shop"),
                title:t[1]+(isMemo?"":" "+String(t[0])+"건"), sub:t[2]||" "}; }),
      total:pick.length, onPick:function(i){ top3[i][3](); window.scrollTo(0,0); }, onAll:function(){ todoSheet(todos, todoBtn); }},
    kpis:[{label:"업체", value:String(Number(s.shops)||0), unit:"곳", delta:"", vs:"진행 중 "+Math.max(0,(s.shops||0)-(s.shopsOff||0))+"곳 · 보류 "+(s.shopsOff||0)+"곳"},
      {label:"이번 달 들어온 금액", value:paid.toLocaleString("ko-KR"), unit:"원", delta:"", vs:"받은 비율 "+(billed?Math.round(paid/billed*100):0)+"%"},
      {label:"이번 달 나간 금액", value:(Number(s.expMonth)||0).toLocaleString("ko-KR"), unit:"원", delta:"", vs:"남은 것 "+won(prof)},
      {label:"못 받은 금액", value:unpaidAmt.toLocaleString("ko-KR"), unit:"원", delta:"", vs:unpaid.length?("입금 대기 "+unpaid.length+"건"):"없어요"}],
    cal:{y:Y, m:M, today:(Y===now.getFullYear()&&M===now.getMonth()+1)?now.getDate():0, days:days,
      legend:[["w","유지비 결제일","chk"],["b","업체 이용 기한","run"],["r","체험 끝","stop"],["m","할 일","done"]], amtLabel:"그날 유지비",
      onMove:function(n){ if(n===0) CALM=null; else CALM=new Date(CALM.getFullYear(), CALM.getMonth()+n, 1); render(); },
      onDay:function(d0){ hqDaySheet(Y+"-"+pad2(M)+"-"+pad2(d0)); }},
    money:{title:"이번 달 입금", big:paid, bar:{done:paid, total:billed}, legend:[["받은 것",paid,"done"],["받을 것",unpaidAmt,"chk"]],
      rows:[["이번 달 남은 것 (들어온 금액 − 나간 금액)", won(prof)]], link:{label:"결제 내역", onClick:function(){ jgo("pays"); }}},
    rank:{title:"운영 상태", sub:"다달이 나가는 금액 "+won(OPS.monthCost||0), link:{label:"자세히 보기", onClick:function(){ jgo("ops"); }},
      items:[{label:"자료 용량", value:u?gbTxt(u.db_bytes):"—", pct:u&&L.dbGb?(Number(u.db_bytes)||0)/(L.dbGb*1073741824):0},
        {label:"차량 사진 용량", value:u?gbTxt(u.file_bytes):"—", pct:u&&L.fileGb?(Number(u.file_bytes)||0)/(L.fileGb*1073741824):0},
        {label:"문자 남은 금액", value:sms?won(sms.balance):"—", pct:sms&&sms.minBal>0?Math.min(1,(Number(sms.balance)||0)/(sms.minBal*4)):0}]},
    help:"관리 홈 차례도 워시 · 체크와 같아요: 자주 쓰는 기능 → 오늘 할 일 → 숫자 칸 4개 → 일정 · 이번 달 입금 · 운영 상태. 숫자 칸을 누르면 그 화면으로 가요."});
  /* 숫자 칸을 누르면 그 화면으로 (v4.8.3 그대로) */
  Array.prototype.forEach.call($("main").querySelectorAll(".cgg-kpis .cgg-kpi"),function(el,i){
    el.setAttribute("role","button"); el.tabIndex=0; el.style.cursor="pointer";
    el.onclick=function(){ jgo(KG[i]); }; el.onkeydown=function(e){ if(e.key==="Enter") jgo(KG[i]); }; });
  if(TODO.list===null) todoLoad();
  if(!OPS.loaded){ opsLoad(); }
}
''')
# 옛 달력 그림 글자는 더 쓰지 않아요 (계산은 그대로 둬요 — 할 일 · 금액 셈이 같은 자료를 써요)

# ③-2 손으로 그리던 표 → 같은 표 모양
# 체크 지갑 연결
cut("  host.innerHTML='<div class=\"card\"><h2>검사소 '+CW.list.length+'곳", "function cwWho(biz,ceo){",
'''  host.innerHTML='<div class="card"><h2>검사소 '+CW.list.length+'곳 <span class="rt">이어짐 '+linked+' · 안 이어짐 '+(CW.list.length-linked)+'</span></h2><div id="tCw"></div></div>'+
    '<details class="j-help"><summary>이 화면 사용법</summary><p>[연결]을 누르고 같은 회사의 워시 업체를 고르세요. 양쪽 사업자번호와 대표 이름을 나란히 보여 줘요. '+
    '잘못 연결하면 다른 업체의 캐시에서 금액이 나가고 결제 내역이 보이니, 다르면 연결하지 마세요. 끊으면 체크 화면은 다시 «아직 준비 중»으로 돌아가요.</p></details>';
  makeTable({ id:"tCw", rows:CW.list, search:["name","code","wallet","bizNo","ceo"], sortKey:"", find:"검사소 · 업체",
    empty:"체크 검사소가 아직 없어요.", rowId:function(o){ return String(o.code); }, mf:["wallet","st"],
    cols:[
      {k:"name", label:"검사소", w:170, html:function(o){ return esc(o.name||o.code); }},
      {k:"code", label:"코드", w:110, mono:true},
      {k:"bizNo", label:"사업자번호 · 대표", w:200, nosort:true, html:function(o){ return cwWho(o.bizNo,o.ceo); }},
      {k:"wallet", label:"연결한 워시 업체", w:170, html:function(o){ var s2=o.wallet?cwShop(o.wallet):null; return o.wallet?esc((s2&&s2.name)||o.wallet):'—'; }},
      {k:"wbiz", label:"업체 사업자번호 · 대표", w:200, nosort:true, html:function(o){ var s2=o.wallet?cwShop(o.wallet):null; return o.wallet?cwWho(s2&&s2.biz_no,s2&&s2.ceo):'—'; }},
      {k:"st", label:"상태", w:104, nosort:true, html:function(o){ return !o.wallet?'<span class="pill gray">안 이어짐</span>':cwMatchPill(o,o.wallet?cwShop(o.wallet):null); }},
      {k:"_a", label:"할 일", nosort:true, html:function(o){ return '<button type="button" class="btn sm" data-cw="'+esc(o.code)+'">'+(o.wallet?"바꾸기":"연결")+'</button>'; }}
    ]});
  Array.prototype.forEach.call(host.querySelectorAll("[data-cw]"),function(b){
    b.onclick=function(ev){ ev.stopPropagation(); cwSheet(b.getAttribute("data-cw")); }; });
}
''')
# 휴대폰 번호로 계정 찾기 › 기록
cut("    (lg.length?'<div class=\"tablebox\"><table><thead><tr><th style=\"width:140px\">언제</th>", "  host.innerHTML=h;\n  Array.prototype.forEach.call(host.querySelectorAll(\"[data-pa]\")",
'''    (lg.length?'<div id="tPplLog"></div>':'<div class="hint">아직 기록이 없어요.</div>')+'</div>';
''')
rep('''  host.innerHTML=h;
  Array.prototype.forEach.call(host.querySelectorAll("[data-pa]"),function(b){''',
'''  host.innerHTML=h;
  if(lg.length) makeTable({ id:"tPplLog", sortKey:"at", sortDir:"desc", find:"한 일 · 대상 · 누가", search:["what","tgt","who"],
    rows:lg.map(function(x,i){ var act=pv(x,["act","action"],""), res=pv(x,["result"],"됨");
      return {i:i, at:dt(pv(x,["at","created_at"],""),true), tgt:tgtTxt(pv(x,["target","product"],"-")), what:PACT_LOG[act]||(PACT[act]||[act])[0],
        ok:res===true||res==="ok"||res==="됨", why:String(res), who:String(pv(x,["who","by"],"-"))}; }),
    rowId:function(r){ return String(r.i); }, mf:["tgt","ok"],
    cols:[
      {k:"what", label:"한 일", w:180},
      {k:"at", label:"때", w:140},
      {k:"tgt", label:"대상", w:120},
      {k:"who", label:"누가", w:130},
      {k:"ok", label:"결과", w:90, html:function(r){ return r.ok?'<span class="cgg-st done">됨</span>':'<span class="cgg-st stop" title="'+esc(r.why)+'">안 됨</span>'; }}
    ]});
  Array.prototype.forEach.call(host.querySelectorAll("[data-pa]"),function(b){''')
# 정산 › 달마다 보기
cut("    if(!ms.length) h += '<div class=\"empty\">'+SETTLE_YEAR+'년에는 아직 기록이 없어요.</div>';", "    h += '</div>';\n\n    h += '<div class=\"card\"><h2>지출 적은 것</h2>'+",
'''    if(!ms.length) h += '<div class="empty">'+SETTLE_YEAR+'년에는 아직 기록이 없어요.</div>';
    else h += '<div id="tStl"></div>';
''')
rep('''    $("stYear").onchange = function(){ SETTLE_YEAR=this.value; viewSettle(); };''',
'''    if(ms.length) makeTable({ id:"tStl", rows:ms, sortKey:"ym", sortDir:"desc", find:"달", search:["ym"], mf:["income","expense","profit"],
      rowId:function(m){ return String(m.ym); },
      cols:[
        {k:"ym", label:"달", w:120, html:function(m){ return '<b>'+esc(m.ym)+'</b>'; }},
        {k:"income", label:"들어온 금액", w:130, num:true, html:function(m){ return esc(won(m.income)); }},
        {k:"cnt", label:"건수", w:80, num:true, kind:"num", html:function(m){ return (m.cnt||0)+"건"; }},
        {k:"expense", label:"나간 금액", w:130, num:true, html:function(m){ return esc(won(m.expense)); }},
        {k:"profit", label:"남은 것", w:130, num:true, kind:"money", html:function(m){ return '<span'+(m.profit<0?' style="color:var(--stop)"':'')+'>'+esc(won(m.profit))+'</span>'; }}
      ]});
    $("stYear").onchange = function(){ SETTLE_YEAR=this.value; viewSettle(); };''')
# 정산 숫자 칸 — 공통 숫자 칸 모양 (값 · 셈 그대로)
cut("      '<div class=\"dash\"><div class=\"dRow money\">'+", "    h += '<div class=\"card\"><h2>달마다 보기</h2>';",
'''      '<div id="stK"></div>';

''')
rep('''    $("main").innerHTML = h;

    if(ms.length) makeTable({ id:"tStl"''', '''    $("main").innerHTML = h;
    CGG.kpis($("stK"),[{label:SETTLE_YEAR+"년 들어온 금액", value:(Number(inc)||0).toLocaleString("ko-KR"), unit:"원", tone:"in", delta:"", vs:"업체에서 받은 금액"},
      {label:SETTLE_YEAR+"년 나간 금액", value:(Number(exp)||0).toLocaleString("ko-KR"), unit:"원", delta:"", vs:"유지비로 나간 금액"},
      {label:SETTLE_YEAR+"년 남은 것", value:(Number(prof)||0).toLocaleString("ko-KR"), unit:"원", tone:prof<0?"stop":"", delta:"", vs:prof<0?"나간 금액이 더 많아요":"들어온 금액 − 나간 금액"}]);

    if(ms.length) makeTable({ id:"tStl"''')

# ④ 확인 창 — «누구에게 · 대상 · 하는 일» 칸 (잠금 모두 풀기 · 접속 모두 끊기 · 계정 동작)
rep('''      confirmBox(label+" — "+n+"?", (nm||"")+" · "+phoneFmt(r.phone)+"\\n"+A[1], label, A[2], function(){''',
    '''      confirmBox("«"+label+"» 할까요?", "누구에게: "+((nm||"")+" · "+phoneFmt(r.phone)).replace(/^ · /,"")+"\\n대상: "+n+(t==="all"?" (계정 "+cards.length+"개)":"")+"\\n하는 일: "+String(A[1]).replace(/\\n/g," "), label, A[2], function(){''')

# ④-2 환불 · 입금 확인 · 캐시 넣기/빼기 · 지갑 연결 — «누구에게 · 몇 건 · 얼마» 칸 (보내는 값 · 차례는 그대로, 넣기 · 입금 확인 앞에 확인 창만 더해요)
rep('''      confirmBox("환불할까요?", row.shop+" · "+row.kind+" · "+won(w)+"\\n되돌릴 수 없어요.", "환불하기", true, function(){''',
    '''      confirmBox("환불할까요?", "누구에게: "+row.shop+"\\n몇 건: 1건 ("+row.kind+")\\n얼마: "+won(w)+"\\n그 뒤: 되돌릴 수 없어요", "환불하기", true, function(){''')
rep('''  if($("pPaid")) $("pPaid").onclick=function(){
    api("hqPayMark",[id,"paid",$("pMethod").value]).then(function(){ return loadAll(); })
      .then(function(){ closeSheet(); toast("받음으로 바꿨어요"); render(); })
      .catch(function(e){ toast(emsg(e),true); });
  };''', '''  if($("pPaid")) $("pPaid").onclick=function(){
    var how=$("pMethod").value;
    confirmBox("입금 확인할까요?", "누구에게: "+(p.shopName||p.biz_name||"-")+"\\n몇 건: 1건 ("+(p.period||"기간 없음")+")\\n얼마: "+won(p.amount)+"\\n받은 방법: "+how, "입금 확인", false, function(){
    api("hqPayMark",[id,"paid",how]).then(function(){ return loadAll(); })
      .then(function(){ closeSheet(); toast("받음으로 바꿨어요"); render(); })
      .catch(function(e){ toast(emsg(e),true); }); });
  };''')
rep('''    confirmBox("캐시 빼기", shop+" 에서 "+won(v)+" 을 빼요.","빼기",true,function(){''',
    '''    confirmBox("캐시를 뺄까요?", "누구에게: "+cgName(shop)+"\\n몇 건: 1건\\n얼마: "+won(v)+" 빼기\\n메모: "+(memo||"본사 조정"),"빼기",true,function(){''')
rep('''  api("hqCashAdd",[shop,v,d,memo,"paid"]).then(function(r){
    if(r && r.confirm){
      confirmBox("큰 금액이에요", won(v)+" 을 "+shop+" 지갑에 넣어요. 맞나요?","넣기",false,function(){''',
    '''  confirmBox("캐시를 넣을까요?", "누구에게: "+cgName(shop)+"\\n몇 건: 1건\\n얼마: "+won(v)+" 넣기\\n쓸 수 있는 기간: "+d+"일","넣기",false,function(){
  api("hqCashAdd",[shop,v,d,memo,"paid"]).then(function(r){
    if(r && r.confirm){
      confirmBox("큰 금액이에요", "누구에게: "+cgName(shop)+"\\n얼마: "+won(v)+" 넣기\\n한 번 더 확인해 주세요: 맞나요?","넣기",false,function(){''')
rep('''    toast("넣었어요"); cashLoad();
  }).catch(function(e){ toast(emsg(e),true); });
}''', '''    toast("넣었어요"); cashLoad();
  }).catch(function(e){ toast(emsg(e),true); }); });
}
function cgName(code){ var x=(D.shops||[]).filter(function(s2){ return s2.shop===code; })[0]; return x&&x.name?x.name+" ("+code+")":code; }''')
rep('''    var t = !w ? (o.name+"을(를) 지갑에서 끊을까요?") : (o.name+" ↔ "+(s?s.name:w)+" 을(를) 이을까요?");
    var body = !w ? "체크 결제 화면이 «아직 준비 중»으로 돌아가요."
      : "사업자번호 "+(o.bizNo?fmtBizNo(o.bizNo):"없음")+" / "+(s&&s.biz_no?fmtBizNo(s.biz_no):"없음")+" · 대표 "+(o.ceo||"없음")+" / "+(s&&s.ceo||"없음")+
        (m==="same"?"":"\\n같은 회사인지 확인하지 못했어요.")+"\\n이 검사소의 결제 · 캐시가 이 업체 지갑으로 처리돼요.";''',
    '''    var t = !w ? "지갑 연결을 끊을까요?" : "지갑을 연결할까요?";
    var body = !w ? "검사소: "+(o.name||o.code)+"\\n그 뒤: 체크 결제 화면이 «아직 준비 중»으로 돌아가요"
      : "검사소: "+(o.name||o.code)+"\\n워시 업체: "+(s?s.name:w)+"\\n사업자번호: "+(o.bizNo?fmtBizNo(o.bizNo):"없음")+" / "+(s&&s.biz_no?fmtBizNo(s.biz_no):"없음")+"\\n대표: "+(o.ceo||"없음")+" / "+(s&&s.ceo||"없음")+
        (m==="same"?"":"\\n주의: 같은 회사인지 확인하지 못했어요")+"\\n그 뒤: 이 검사소의 결제 · 캐시가 이 업체 지갑으로 처리돼요";''')

# ⑤ 말 (디자인/말_대조표.md · 검수 3)
rep('["ppl","번호로 계정 찾기",viewPpl],', '["ppl","휴대폰 번호로 계정 찾기",viewPpl],')
rep("""$("main").innerHTML='<div class="dashhead"><h2>번호로 계정 찾기</h2>'+""", """$("main").innerHTML='<div class="dashhead"><h2>휴대폰 번호로 계정 찾기</h2>'+""")
rep('["cwal","체크 지갑 잇기",viewCwal],', '["cwal","체크 지갑 연결",viewCwal],')
rep("""  $("main").innerHTML='<div class="dashhead"><h2>체크 지갑 잇기</h2>'+
    '<div class="sub2">체크 검사소의 이용요금 · 캐시는 여기서 이어 둔 워시 업체 지갑으로 처리돼요. 같은 회사(같은 사업자 · 같은 대표)끼리만 이어 주세요.</div></div>'+""",
    """  $("main").innerHTML='<div class="dashhead"><h2>체크 지갑 연결</h2>'+
    '<div class="sub2">체크 검사소의 이용요금 · 캐시는 여기서 연결해 둔 워시 업체 지갑으로 처리돼요. 같은 회사(같은 사업자 · 같은 대표)끼리만 연결해 주세요.</div></div>'+""")
rep("""  openSheet('<h3 style="margin:0 0 4px">체크 지갑 잇기 — '+esc(o.name||o.code)+'</h3>'+
    '<div class="hint" style="margin:0 0 12px">이 검사소의 이용요금 · 캐시를 처리할 워시 업체를 고르세요. 같은 회사끼리만 이어요.</div>'+""",
    """  openSheet('<h3 style="margin:0 0 4px">체크 지갑 연결 — '+esc(o.name||o.code)+'</h3>'+
    '<div class="hint" style="margin:0 0 12px">이 검사소의 이용요금 · 캐시를 처리할 워시 업체를 고르세요. 같은 회사끼리만 연결해요.</div>'+""")
rep('''    confirmBox(t, body, w?"잇기":"끊기", m!=="same", function(){''', '''    confirmBox(t, body, w?"연결":"끊기", m!=="same", function(){''')
rep('["me","내 계정",viewMe]', '["me","관리자 계정",viewMe]')
rep("""    '<div class="dashhead"><h2>내 관리자 계정</h2>'+""", """    '<div class="dashhead"><h2>관리자 계정</h2>'+""")
rep('"짧거나 흔한 비밀번호는 몇 번만 찍어봐도 뚫려요. 「내 계정」에서 바꿀 수 있어요."', '"짧거나 흔한 비밀번호는 몇 번만 찍어봐도 뚫려요. 「관리자 계정」에서 바꿀 수 있어요."')
rep('{label:"대략 요금 (VAT 별도)", value:', '{label:"대략 요금 (부가세 별도)", value:')
rep("알림톡 13원 · SMS 18원 · LMS 45원 · MMS 110원 (VAT 별도)", "알림톡 13원 · 문자 단문 18원 · 장문 45원 · 사진 문자 110원 (부가세 별도)")
rep("세금계산서는 결제 완료 뒤 발급돼요", "세금계산서는 결제 완료 뒤 발행돼요", 2)
rep("결제 완료 뒤 발급돼요", "결제 완료 뒤 발행돼요")
rep('''<label class="f" for="exBal">잔액 안내 기준 금액 (원)</label>''', '''<label class="f" for="exBal">남은 금액 안내 기준 금액 (원)</label>''')
rep('how:"카드 한도와 잔액을 확인해 주세요."', 'how:"카드 한도와 남은 금액을 확인해 주세요."')
rep("실제 잔액은 「연결된 곳 상태 새로 받기」로 맞춰", "실제 남은 금액은 「연결된 곳 상태 새로 받기」로 맞춰")

# 폰 «이름표: 값» 3칸 — 미리보기 11판과 같은 칸 (업체 관리 · 가입 코드 · 결제 내역 · 세금계산서 등)
rep('    id:"tShops", rows:rows, search:["name","shop","owner_phone"],', '    id:"tShops", rows:rows, search:["name","shop","owner_phone"], mf:["plan","endAt","active"],')
rep('    id:"tUsers", rows:(D.users||[]).slice(), search:["name","phone","shopName"],', '    id:"tUsers", rows:(D.users||[]).slice(), search:["name","phone","shopName"], mf:["active","last_login","created_at"],')
rep('    id:"tPays", rows:(D.pays||[]).slice(), search:["shopName","biz_name","period","id"],', '    id:"tPays", rows:(D.pays||[]).slice(), search:["shopName","biz_name","period","id"], mf:["amount","status","period"],')
rep('    id:"tInv", rows:(D.invites||[]).slice(), search:["phone","biz_name"],', '    id:"tInv", rows:(D.invites||[]).slice(), search:["phone","biz_name"], mf:[["biz_name","업체"],"used_at","expires_at"],')
rep('    id:"tTax", rows:rows, search:["name","period"], sortKey:"at", sortDir:"desc",', '    id:"tTax", rows:rows, search:["name","period"], sortKey:"at", sortDir:"desc", mf:["amount","st","at"],')
rep('  makeTable({ id:"tPR", sortKey:"at", sortDir:"desc",', '  makeTable({ id:"tPR", sortKey:"at", sortDir:"desc", mf:["amount","status","at"],')

# 숫자 칸 뜻 색 — 1.12 부터 숫자 칸은 tone(입금 초록 · 확인 필요 주황 · 막힘 빨강)으로 칠해요. 화면이 주던 옛 color 를 tone 으로 (값 · 셈은 그대로)
rep('''(function(open){ CGG.dialog=function(o){ var d=open(o); if(d) d.scrollTop=0; return d; }; })(CGG.dialog);''',
'''(function(open){ CGG.dialog=function(o){ var d=open(o); if(d) d.scrollTop=0; return d; }; })(CGG.dialog);
(function(k){ var T={"#1e9e5a":"in","#e08a00":"due","#b26b00":"due","#d64545":"stop"};
  CGG.kpis=function(el,items){ return k(el,(items||[]).map(function(x){ var t=x&&!x.tone&&x.color?T[String(x.color).toLowerCase()]:"";
    return t?Object.assign({},x,{tone:t,zeroMuted:t!=="in"}):x; })); }; })(CGG.kpis);''')
# 결제 내역 숫자 칸 뜻 색 — 11판처럼 받은 금액 초록 · 실패 빨강 · 환불 기본색
rep('''    {label:"환불 합계", value:won(ref).replace(/원$/,""), unit:"원", color:"#D64545"},
    {label:"실패 · 결제 중", value:String(bad), unit:"건", color:"#E08A00"},''',
    '''    {label:"환불 합계", value:won(ref).replace(/원$/,""), unit:"원", color:"#0B2545"},
    {label:"실패 · 결제 중", value:String(bad), unit:"건", color:"#D64545"},''')
rep('''{label:thisMonth?"이번 달 받은 금액":"이 기간 받은 금액", value:won(got).replace(/원$/,""), unit:"원", color:"#1668C4"},''',
    '''{label:thisMonth?"이번 달 받은 금액":"이 기간 받은 금액", value:won(got).replace(/원$/,""), unit:"원", color:"#1E9E5A"},''')
# 결제 내역 — 화면 뼈대 차례(제목 → 도구줄 → 숫자 칸 → 표)
rep('''  host.innerHTML='<div id="prK"></div>'+
    '<div class="tools"><label class="f" style="margin:0">기간</label><input type="date" id="prFrom" value="'+esc(PR2.from)+'"><span>~</span><input type="date" id="prTo" value="'+esc(PR2.to)+'">'+
      '<button class="btn" id="prGo">새로고침</button><span class="sp"></span><button class="btn" id="payNew">청구 만들기</button></div>'+
    '<div id="tPR"></div>';''',
'''  host.innerHTML='<div class="tools"><label class="f" style="margin:0">기간</label><input type="date" id="prFrom" value="'+esc(PR2.from)+'"><span>~</span><input type="date" id="prTo" value="'+esc(PR2.to)+'">'+
      '<button class="btn" id="prGo">새로고침</button><span class="sp"></span><button class="btn" id="payNew">청구 만들기</button></div>'+
    '<div id="prK"></div><div id="tPR"></div>';''')

# 알림톡 템플릿 숫자 칸 4개 — 공통 숫자 칸 모양(점 없음 · 가운데)으로 (값 · 셈 그대로)
rep("""    '<div class="j-kpis">'+""", """    '<div class="cgg-kpis">'+""")
rep("""        return '<div class="j-kpi"><small><i style="background:'+x[2]+'"></i>'+esc(x[0])+' · '+esc(ym.replace("-","년 "))+'월</small>'+
          '<strong>'+x[1].cnt.toLocaleString("ko-KR")+'<em>건</em></strong><span class="tr">'+won(x[1].won)+' · '+x[3]+'</span></div>'; }).join("")+""",
    """        return '<div class="cgg-kpi"><small>'+esc(x[0])+' · '+esc(ym.replace("-","년 "))+'월</small>'+
          '<strong>'+x[1].cnt.toLocaleString("ko-KR")+'<em>건</em></strong><span class="tr"> <span>'+won(x[1].won)+' · '+x[3]+'</span></span></div>'; }).join("")+""")

# 정산 › 지출 적은 것 — 이름 칸은 «무엇에» (서비스 칸이 비어 «-»가 앞에 서지 않게)
rep('''        {k:"name", label:"무엇에", w:200, html:function(r){ return '<b>'+esc(r.name)+'</b>'; }},''',
    '''        {k:"name", label:"무엇에", w:200, isName:true, html:function(r){ return '<b>'+esc(r.name)+'</b>'; }},''')

rep('    id:"tSvc", rows:list, search:["name","what","code"], sortKey:"sort",', '    id:"tSvc", rows:list, search:["name","what","code"], sortKey:"sort", mf:["balance","next_due","_st"],')
# 업체 관리 — 11판처럼 숫자 칸 4개(업체 · 진행 중 · 보류 · 문자 다 씀) — 목록에서 셈만, 서버 요청 없음
rep('''    '<div id="tShops"></div>';
  var rows = (D.shops||[]).filter(function(s){ return s.shop!=="ADMIN"; });''',
'''    '<div id="shK"></div><div id="tShops"></div>';
  var rows = (D.shops||[]).filter(function(s){ return s.shop!=="ADMIN"; });
  var shOff=rows.filter(function(r){ return r.active===false; }).length, shOut=rows.filter(function(r){ var u=usageOf(r); return u.smsLeft===0; }).length;
  CGG.kpis($("shK"),[{label:"업체",value:String(rows.length),unit:"곳"},{label:"진행 중",value:String(rows.length-shOff),unit:"곳",tone:"in"},
    {label:"보류",value:String(shOff),unit:"곳",tone:"due",zeroMuted:true},{label:"문자 다 씀",value:String(shOut),unit:"곳",tone:"stop",zeroMuted:true}]);''')
# 알림톡 템플릿 검수 칸 — 원래 자료 말 «통과» 그대로
rep('''(x[3]==="통과"?"완료":(x[3]==="심사 대기"||x[3]==="등록 전"?x[3]:"확인 필요"))''', '''(x[3]==="통과"?"통과":(x[3]==="심사 대기"||x[3]==="등록 전"?x[3]:"확인 필요"))''')
# 세금계산서 확인 창 칸 이름 — 누구에게 · 몇 건 · 얼마
rep('''      "받는 곳: "+sh.name+(sh.biz_no?" ("+bizFmt(sh.biz_no)+")":"")+"\\n건수: 1장\\n합계: "+won(total)''',
    '''      "누구에게: "+sh.name+(sh.biz_no?" ("+bizFmt(sh.biz_no)+")":"")+"\\n몇 건: 1장\\n얼마: "+won(total)''')
# 관리자 계정 — 영어 «ADMIN» 대신 «본사»
rep("' · 자리 '+esc(me.shop||\"\")+'", "' · '+esc(me.shop===\"ADMIN\"?\"본사 관리자\":(me.shop||\"\"))+'")
# 충전 단가표 «남는 것» — 손해(0 아래)는 빨강
rep('''<td class="num" style="color:var(--ok);font-weight:700">'+won(v-r[2])+'</td></tr>''', '''<td class="num" style="color:'+(v-r[2]<0?"var(--stop)":"var(--done)")+';font-weight:700">'+won(v-r[2])+'</td></tr>''')

# 표 안 번호 칸 고정폭 글꼴(v4.4)은 빼요 — 11판 표와 같은 글꼴
rep(".cgg-table td .cgg-st+.cgg-st{margin-left:4px} .cgg-table td.mono{font-family:ui-monospace,Menlo,monospace;font-size:13px}", ".cgg-table td .cgg-st+.cgg-st{margin-left:4px}")

# CSS — 관리 몫 (공통 부품 앞): 카드 · 도구줄 · 창 바탕을 미리보기 11판 모양으로
rep(MK, '''/* 관리 v4.9 — 미리보기 11판 «관리» 모양 맞춤 (화면 안 카드 · 도구줄 · 창 바탕 · 화면 머리 설명 글) */
.card{border-radius:var(--r-card);box-shadow:var(--sh);padding:18px 20px;line-height:1.5}
.card h2{margin:0 0 4px;font-size:16px;font-weight:800}
.dashhead.cgg-head .hello .sub2{margin:6px 0 0;font-size:14px;color:var(--muted)}
.dashhead.cgg-head .hello h1 em{font-style:normal;color:inherit}
.cgg-tblock,.cgg-tblock .cgg-pager{line-height:normal}
.cgg-tblock .cgg-ttop select{width:auto;min-width:0;max-width:none}
.cgg-head .hello small.jcrumb{font-weight:400}
.pill{flex:none;width:auto;justify-self:start}
.cgg-nil{color:var(--muted)}
#pplQ{flex:1 1 180px;min-width:0}
/* 옛 숫자 칸(운영 상태 · 보안 점검 · 공지사항)을 공통 숫자 칸 모양으로 — kpiFix 가 바꿔요 */
.sheetbg{background:#0B254573}
.sheet{box-shadow:0 24px 60px #0B254559}
@media (max-width:600px){ .card{padding:14px 14px;margin-bottom:12px} .dashhead.cgg-head .hello .sub2{font-size:12.5px;margin-top:3px} }
''' + MK)

s = s.replace("관리 v4.4 (2026-10-15) · 공통 부품 cgg-j4 1.4 위에", "관리 v4.9 (2026-10-19) · 공통 부품 cgg-j4 1.13.2 위에")
# 설명 글(주석)도 같은 말로
s = s.replace("VAT 별도", "부가세 별도").replace("체크 지갑 잇기", "체크 지갑 연결")
for gone in ('id="hWho"', 'id="setSub"', "$(\"setSub\")", "\"번호로 계정 찾기", "체크 지갑 잇기", "VAT", "발급"):
    if gone in s: raise SystemExit("남은 것: " + gone)
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", OUT, len(s), "글자")
