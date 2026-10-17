"""워시 v131 → v132 (화면 통합 · 출시 전). 대표님 10/18 «화면 통합은 출시 전에» · 통합 시안 확인(«이렇게 하면 된다»)
쓰는 법: 만들기_워시_v131 다음에. 이 파일 = v129 에서 한 1.8 뼈대 옮기기(그대로) + 1.8 → 1.9 + 만들기_워시_v132_통합.py(새 규칙 덧붙임)
  대표님 고른 것: ① 기능 찾기 = 메뉴 줄 오른쪽 끝 ② 기록 = 매출 기록(탭 하나만 끄면 일감 안으로 — W132_REC) ③ 이번 달 입금
  v129(보류 판)는 덮어쓰지 않아요. 운영 v111 · 시험판 v125 · v126 ~ v131 은 덮어쓰지 않는다.
--- 아래 설명은 v129 때 그대로 ---
워시 v128 → v129 (시험 뒤 판). 공통 부품 cgg-j4 1.8 «페이지 뼈대» + 메뉴 찾기(A + C + D) + 배달 큰 메뉴
쓰는 법: 만들기_워시_v128 다음에
대표님 결정 10/18: 워시 · 체크 «UI 통합» — 머리말 · 홈 차례 · 숫자 칸 · 달력 · 오른쪽 칸을 공통 부품 하나로,
                  메뉴는 왼쪽 늘 펼침 + 기능 찾기 + 홈 바로가기, 배달(출고 기록 · 도착지 · 문구)은 큰 메뉴
바꾸는 것:
  0) 공통 부품 1.5 → 1.8 (디자인/공통/cgg-j4-1.8.css · .js) + 메뉴 목록 디자인/메뉴지도/워시_메뉴.js
  1) 머리말: CGG.header (차곳간 «차» 로고 · «차곳간 워시» · 업체명 15px · 단추 차례 · 이름 ▾). 옛 단추는 숨겨 두고 그 동작을 그대로 불러요
  2) 메뉴: CGG.nav(왼쪽 늘 펼침) · CGG.find(기능 찾기) · CGG.allMenu(폰 «전체») · 폰 아래 탭 홈 · 일감 · 배달 · 입출금 · 전체
  3) 배달 큰 메뉴: 출고 기록 · 도착지(설정에서 옮김) · 문구 · 발송 설정(출고 기록 아래 카드). 일감에는 입출고 내역만
  4) 홈: CGG.home 차례 (바로가기 → 할 일 3장 + 위 오른쪽 «모두 보기» → 숫자 칸 4개(모두 그래프 + 비교) → 달력 | 이번 달 입금 · 이번 달 일감)
  5) 기능 찾기 · 바로가기로 오면 빛날 칸 id: wkBulkPaid · billSendCard · matShops · ptDealers · smsFrom
  저장 값 · 서버 창구 · 손님에게 가는 글은 그대로. 현장 화면(직원 폰)의 모양 · 탭도 그대로.
운영 v111 · 시험판 v125 · v126 · v127 · v128 은 덮어쓰지 않는다.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE); ROOT = os.path.dirname(BASE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v131.html"); OUT = os.path.join(BASE, "1_차곳간_워시_index_v132.html")
G = os.path.join(ROOT, "디자인", "공통")
CSS15 = open(os.path.join(G, "cgg-j4.css"), encoding="utf-8").read()
JS15 = open(os.path.join(G, "cgg-j4.js"), encoding="utf-8").read()
CSS18 = open(os.path.join(G, "cgg-j4-1.9.css"), encoding="utf-8").read()
JS18 = open(os.path.join(G, "cgg-j4-1.9.js"), encoding="utf-8").read()
MENU = open(os.path.join(ROOT, "디자인", "메뉴지도", "워시_메뉴.js"), encoding="utf-8").read()
s = open(SRC, encoding="utf-8").read(); assert CSS15 in s and JS15 in s
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('var APP_VER="워시 v131 · UI 3.0 · 2026-10-18";', 'var APP_VER="워시 v132 · UI 3.0 · 2026-10-18";')

# 0) 공통 부품 1.5 → 1.8 (+ 메뉴 목록은 1.8 JS 바로 뒤)
rep(CSS15, CSS18)
rep(JS15, JS18 + "\n" + MENU)

# 1) 머리말 틀 — 새 윗줄은 CGG.header 가 그려요. 옛 단추 · 칸(id 그대로)은 숨긴 상자에 두고 동작만 빌려 써요
a = s.index('<header class="cgg-hdr">\n  <div class="brandrow cgg-top">') + len('<header class="cgg-hdr">\n')
b = s.index('  <nav class="tabs cgg-nav" id="tabs"')
old = s[a:b]
for x, y in [(' cgg-top"', '"'), (' cgg-ci"', '"'), ('class="cgg-brand"', 'class="obrand"'), (' cgg-biz"', '"'), (' cgg-right"', '"')]:
    assert old.count(x) == 1, x
    old = old.replace(x, y)
assert 'cgg-' not in old
s = s[:a] + '  <div class="cgg-top" id="hdrTop"></div>\n  <div id="hdrOld" hidden>\n' + old + '  </div>\n' + s[b:]

# 2) 홈 틀 — 새 홈은 #jHome 에 CGG.home 이 그려요. 옛 칸(id 그대로)은 숨긴 상자에
rep('<section id="vHome" hidden>\n  <div class="dashhead">', '<section id="vHome" hidden>\n  <div id="jHome"></div>\n  <div id="homeOld" hidden>\n  <div class="dashhead">')
rep('''    <div id="dashWorks"></div>
  </div>
</section>''', '''    <div id="dashWorks"></div>
  </div>
  </div>
</section>''')

# 3) 빛날 칸 id (메뉴 지도 spot)
rep('<div class="tools" style="margin-top:12px">\n    <button class="btn primary" id="lPayed">', '<div class="tools" style="margin-top:12px" id="wkBulkPaid">\n    <button class="btn primary" id="lPayed">')
rep('id="bmCard"', 'id="billSendCard"')
rep('<div class="card" style="margin-top:14px;padding:14px 16px;margin-bottom:12px">\n    <h2 style="margin:0 0 6px">도매상 목록</h2>',
    '<div class="card" style="margin-top:14px;padding:14px 16px;margin-bottom:12px" id="matShops">\n    <h2 style="margin:0 0 6px">도매상 목록</h2>')
rep("""'<div><label class="f">발신번호 (솔라피 등록 번호)</label>""", """'<div id="smsFrom"><label class="f">발신번호 (솔라피 등록 번호)</label>""")
# 출고 기록 화면 아래 «출고 알림 — 문구와 보내는 방식» 카드 → 배달 › 문구 · 발송 설정 칸
rep('''  <div class="card" style="margin-top:16px">
    <h2>출고 알림 — 문구와 보내는 방식</h2>''', '''  <div class="card" style="margin-top:16px" id="olMsgCard">
    <h2>출고 알림 — 문구와 보내는 방식</h2>''')

# 4) 화면 고르기(decideMode) — 배달 큰 메뉴 · 새 메뉴
rep('''  if(!canPC()) S.mode="mobile";
  $("btnMode").hidden=!canPC();''', '''  if(!canPC()) S.mode="mobile";
  /* v129: 배달 도착지는 설정이 아니라 «배달 › 도착지» */
  if(S.tab==="settings"&&S.setSub==="sms"){S.tab="outlog";S.dSub="dest";}
  if(S.tab==="outlog"&&S.dSub==="dest"&&!isOwner())S.dSub="outlog";
  $("btnMode").hidden=!canPC();''')
rep('''  var pcT=(S.mode==="pc"), hasL=tabs.some(function(t){return t[0]==="ledger";});''',
    '''  if(S.mode==="pc"&&window.CGG_MENU_WASH&&CGG.nav){wNav();}else{
  var pcT=(S.mode==="pc"), hasL=tabs.some(function(t){return t[0]==="ledger";});''')
rep('''      S.tab=t;decideMode(false);window.scrollTo(0,0);};});
  ["vFHome",''', '''      S.tab=t;decideMode(false);window.scrollTo(0,0);};});
  }
  ["vFHome",''')
rep('''  var inWork=(S.mode==="pc"&&(S.tab==="ledger"||S.tab==="outlog"));''', '''  var inWork=(S.mode==="pc"&&S.tab==="outlog");''')
rep('''  if(inWork){
    var ws=WORKSUB.filter(function(w){return tabs.some(function(t){return t[0]===w[0];});});
    $("setSub").hidden=ws.length<2;
    $("setSub").innerHTML=ws.map(function(w){
      return '<button data-s="'+w[0]+'" aria-selected="'+(w[0]===S.tab)+'">'+w[1]+'</button>';}).join("");
    Array.prototype.forEach.call($("setSub").children,function(b){
      b.onclick=function(){S.tab=b.getAttribute("data-s");decideMode(false);window.scrollTo(0,0);};});
  }''', '''  if(inWork){
    /* v129: 배달 안쪽 작은 탭 — 출고 기록 · 도착지 · 문구 · 발송 설정 */
    var ws=wDSubs(), ds=S.dSub||"outlog";
    $("setSub").hidden=ws.length<2;
    $("setSub").innerHTML=ws.map(function(w){
      return '<button data-s="'+w[0]+'" aria-selected="'+(w[0]===ds)+'">'+w[1]+'</button>';}).join("");
    Array.prototype.forEach.call($("setSub").children,function(b){
      b.onclick=function(){goKey("delivery/"+b.getAttribute("data-s"));};});
    if(ds==="dest"){$("vOutLog").hidden=true;$("vSms").hidden=false;}
    $("vOutLog").classList.toggle("d-msg",ds==="msg");
    $("vOutLog").classList.toggle("d-log",ds==="outlog");
  }''')
rep('''  else if(S.tab==="outlog")renderOutLog();''', '''  else if(S.tab==="outlog"){if((S.dSub||"outlog")==="dest")renderSms();else renderOutLog();}''')
rep('''  jPage();jTrialBand();
  if(!window.__jBuyDone''', '''  jPage();jTrialBand();wSpots();
  if(!window.__jBuyDone''')
# 폰 아래 탭 (PC 화면일 때) — 홈 · 일감 · 배달 · 입출금 · 전체
rep('''    var pc=(S.mode==="pc"), all=pc?tabsFor():MTABS.concat((S.cfg&&S.cfg.matMobile)?[["matm","자재"]]:[]);''',
    '''    var pc=(S.mode==="pc"), all=pc?tabsFor():MTABS.concat((S.cfg&&S.cfg.matMobile)?[["matm","자재"]]:[]);
    if(pc&&window.CGG_MENU_WASH){wTabbar();return;}''')
# 사람 버튼 ▾ — 옛 머리말 «상단 버튼 위치»는 없어요(머리말 차례는 공통 부품이 정함)
rep('''  if(S.mode==="pc"&&window.innerWidth>600)L.push({key:"arr",icon:"gear",label:"상단 버튼 위치"});\n''', '')
# 머리말 다시 그리기 — 업체명 · 권한 · 현장 화면 단추가 바뀔 때마다
rep('''    el.style.color=""; el.style.borderColor="";
  }
}
''', '''    el.style.color=""; el.style.borderColor="";
  }
  wHdr();
}
''')
# 새 모양 안내 (한 번만)
rep('''    if(localStorage.getItem("ccw_rn_j4"))return;
    localStorage.setItem("ccw_rn_j4","1");
    setTimeout(function(){toast(isOwner()?"화면이 새 모양으로 바뀌었어요. 입출고 내역 · 출고 기록은 «일감» 안에, 휴지통은 오른쪽 위 «마이페이지 ▾» 안에 있어요":"화면이 새 모양으로 바뀌었어요. 입출고 내역 · 출고 기록은 «일감» 안에 있어요");},1600);''',
    '''    if(localStorage.getItem("ccw_rn_j18"))return;
    try{localStorage.setItem("ccw_rn_j4","1");}catch(e){}
    localStorage.setItem("ccw_rn_j18","1");
    setTimeout(function(){toast("화면이 새 모양으로 바뀌었어요. 메뉴는 왼쪽에 늘 펼쳐져 있고, 출고 기록 · 도착지는 «배달» 안에 있어요. 위 «기능 찾기»에 하고 싶은 일을 쳐 보세요");},1600);''')

# 5) 숫자 칸 4개 — 모두 작은 그래프 + 비교 줄 (넷째 칸: 최근 7달)
rep('''  if(isManager()){var cs={};S.records.forEach(function(r){if(r.company)cs[r.company]=1;});L4={label:"거래 상사",value:String(Object.keys(cs).length),unit:"곳",color:"#0B2545"};}
  else L4={label:"이번 달 청구 금액",value:Number(monthAmt||0).toLocaleString("ko-KR"),unit:"원",color:"#0B2545"};''',
    '''  /* v129: 넷째 칸도 최근 7달 그래프 + «지난달보다» (통합 검사표 4/4) */
  var M7=[],mi;for(mi=6;mi>=0;mi--){var md=new Date(today.getFullYear(),today.getMonth()-mi,1);M7.push(md.getFullYear()+"-"+String(md.getMonth()+1).padStart(2,"0"));}
  function mOf(r){return r.month||mKey(r.createdAt);}
  if(isManager()){
    var csM=M7.map(function(k){var o={};S.records.forEach(function(r){if(r.company&&mOf(r)===k)o[r.company]=1;});return Object.keys(o).length;});
    var cs={};S.records.forEach(function(r){if(r.company)cs[r.company]=1;});
    var dM=dl(csM[6],csM[5],"곳");
    L4={label:"거래 상사",value:String(Object.keys(cs).length),unit:"곳",delta:dM.delta,down:dM.down,vs:"지난달보다",spark:csM,color:"#0B2545"};}
  else{
    var amM=M7.map(function(k){return S.records.filter(function(r){return mOf(r)===k;}).reduce(function(t,r){return t+(Number(r.total)||0);},0);});
    var pv=amM[5],nw=Number(monthAmt||0),pc4=pv?Math.round((nw-pv)/pv*100):0;
    L4={label:"이번 달 청구 금액",value:nw.toLocaleString("ko-KR"),unit:"원",delta:pv?((pc4>0?"+":pc4<0?"−":"±")+Math.abs(pc4)+"%"):"",down:pc4<0,vs:pv?"지난달보다":"지난달 자료 없음",spark:amM,color:"#0B2545"};}''')
for lab, nl in [('{label:"오늘 입고",', '{label:"오늘 입고차량",'), ('{label:"작업 중",', '{label:"작업 중",'), ('{label:"오늘 출고",', '{label:"오늘 출고차량",')]:
    rep(lab, nl + 'vs:"지난주보다",')   # 1.8 보강: «오늘 입고차량 · 오늘 출고차량» (두 제품 같은 말)

# 6) 옛 홈 그리기 끝에서 새 홈(CGG.home)을 그려요 — 숫자는 위에서 이미 구한 값 그대로
rep('''    : '<div class="hint">아직 자료가 없어요.</div>';
}
/* ===== 달력 메모 (그날 할 일) ===== */''', '''    : '<div class="hint">아직 자료가 없어요.</div>';
  try{ wHome({Y:Y,M:M,rows:rows,byDay:byDay,memoBy:memoBy,todos:todos,todoBtn:todoBtn,pick:(typeof pick!=="undefined"?pick:[]),paid:paid,dueAmt:dueAmt,billed:billed,works:list}); }catch(e){ try{console.warn(e);}catch(x){} }
}
/* ===== 달력 메모 (그날 할 일) ===== */''')

# 7) 새 함수들 — 메뉴 · 머리말 · 홈 (화면 열쇠 S.tab · S.setSub · S.dSub · MNTAB 은 그대로)
NEW_JS = r'''
/* ══════════════ v129 — 공통 부품 1.8 페이지 뼈대 · 메뉴 찾기 (디자인/메뉴지도/README.md 열쇠 표) ══════════════ */
var WM={h:null,sig:"",obs:null};
/* 이 권한이 쓸 수 있는 큰 메뉴 · 아래 칸 */
function wGroups(){
  var M=window.CGG_MENU_WASH;if(!M)return [];
  var allow=tabsFor().map(function(t){return t[0];});
  var tabOf={home:"home",ledger:"ledger",delivery:"outlog",sales:"sales",bill:"bill",money:"money",tax:"tax",mat:"mat",settings:"settings"};
  var setK=setSubFor().map(function(t){return t[0];}).filter(function(k){return k!=="trash"&&k!=="sms";});
  return M.groups.filter(function(g){return allow.indexOf(tabOf[g.key])>=0;}).map(function(g){
    var o={key:g.key,label:g.label,icon:g.icon,isNew:g.isNew};
    if(g.key==="delivery")o.badge=wDelivBad();
    if(g.subs){
      var subs=g.subs.filter(function(x){
        if(g.key==="settings")return setK.indexOf(x.key)>=0;
        if(g.key==="delivery"&&x.key==="dest")return isOwner();
        if(g.key==="money"&&x.key==="due")return canSettle();
        return true;});
      if(g.key==="settings")subs.sort(function(a,b){return setK.indexOf(a.key)-setK.indexOf(b.key);});
      o.subs=subs.map(function(x){return {key:x.key,label:x.label};});
    }
    return o;});
}
/* 배달 옆 빨간 숫자 — 오늘 못 보낸 출고(도착) 알림 (1.8 보강: 배달은 홈에 두지 않아요) */
function wDelivBad(){
  var tk=dayKey(nowIso());
  return (S.outbox||[]).filter(function(o){return o.status==="실패"&&/출고/.test(String(o.type||""))&&dayKey(o.createdAt||o.sentAt||o.at||nowIso())===tk;}).length;
}
/* 바로가기 저장 이름 — 한 PC 에 여러 사람이 로그인할 수 있어서 업체 · 사람마다 (메뉴 지도 README) */
function wQuickKey(){
  var sh="";try{sh=(typeof SUPA!=="undefined"&&SUPA&&SUPA.shop)||localStorage.getItem("ccw_shop")||"";}catch(e){}
  return CGG_MENU_WASH.quickKey+":"+sh+":"+((S.me&&S.me.id)||"");
}
/* 기능 찾기 · 바로가기 목록 — 쓸 수 없는 메뉴로 가는 줄은 빼요 */
function wFeats(){
  var M=window.CGG_MENU_WASH;if(!M)return [];
  var gs=wGroups();
  function ok(go){
    var p=String(go||"").split("/");
    if(p[0]==="me")return p[1]==="me"||isOwner();
    if(p[0]==="hdr")return p[1]!=="link"||S.mode==="pc";
    if(p[0]==="field")return true;
    var g=gs.filter(function(x){return x.key===p[0];})[0];if(!g)return false;
    if(!p[1]||!g.subs)return true;
    return g.subs.some(function(x){return x.key===p[1];});
  }
  return M.feats.filter(function(f){return ok(f.go);});
}
/* 배달 안쪽 작은 탭 */
function wDSubs(){
  var g=wGroups().filter(function(x){return x.key==="delivery";})[0];
  return g&&g.subs?g.subs.map(function(x){return [x.key,x.label];}):[["outlog","출고 기록"]];
}
/* 지금 화면 → go 이름표 */
function wCur(){
  var t=S.tab;
  if(t==="ledger")return "ledger/list";
  if(t==="outlog")return "delivery/"+(S.dSub||"outlog");
  if(t==="money")return "money/"+(MNTAB==="due"?"due":"io");
  if(t==="settings")return S.setSub==="trash"?"settings":"settings/"+(S.setSub||"");
  return t||"home";
}
/* go 이름표 → 화면 */
function goKey(go){
  try{CGG.closeSheet();}catch(e){}
  var p=String(go||"home").split("/"),g=p[0],sub=p[1]||"";
  if(S.tab!=="settings")S.prevTab=S.tab;
  if(g==="ledger")S.tab="ledger";
  else if(g==="delivery"){S.tab="outlog";S.dSub=sub||"outlog";}
  else if(g==="money"){S.tab="money";MNTAB=(sub==="due"&&canSettle())?"due":"io";}
  else if(g==="settings"){S.tab="settings";if(sub)S.setSub=sub;}
  else S.tab=g||"home";
  decideMode(false);window.scrollTo(0,0);
  if(S.tab==="money"){try{mnShowTab();}catch(e){}}
}
/* 기능 찾기 · 바로가기에서 고른 기능 */
function goFeat(f){
  var go=String((f&&f.go)||"");
  if(go==="me/trash"){$("btnTrash").click();return;}
  if(go==="me/plan"||go==="me/me"){cggMePick(go.slice(3));return;}
  if(go==="hdr/link"){$("btnLink").click();return;}
  if(go==="hdr/help"){$("btnHelp").click();return;}
  if(go==="hdr/notice"){if(window.ccwNotice)window.ccwNotice();return;}
  if(go==="field/in"||go==="field/out"){if(S.mode==="pc"&&canPC())$("btnMode").click();S.tab=go.slice(6);decideMode(false);window.scrollTo(0,0);return;}
  if(f&&f.id==="dealer-add")P.sub="roster";
  if(f&&f.id==="company-add")P.sub="comp";
  goKey(go);
}
function wAllMenu(focus){
  try{CGG.allMenu(wGroups(),wCur(),goKey,wFeats(),goFeat,{focus:!!focus});}catch(e){}
}
function wNav(){
  try{CGG.nav($("tabs"),wGroups(),wCur(),goKey);}catch(e){}
  wSubDup();
}
/* 아래 칸이 공통 메뉴에 이미 보이면(가로: 메뉴 밑 줄 · 세로: 왼쪽 펼침) 화면 안 작은 탭은 숨겨요 — 폰은 그대로 */
function wSubDup(){
  var a=$("app");if(!a)return;
  var r=document.querySelector(".cgg-navsub"),ns=document.querySelector("#tabs .cgg-ngrp.on .cgg-nsubs");
  var vis=(S.mode==="pc")&&((r&&!r.hidden&&r.offsetParent!==null)||(ns&&getComputedStyle(ns).display!=="none"));
  a.classList.toggle("wsubdup",!!vis);
}
window.addEventListener("resize",function(){clearTimeout(WM.rt);WM.rt=setTimeout(wSubDup,120);});
function wTabbar(){
  var M=window.CGG_MENU_WASH,gs=wGroups(),has=function(k){return gs.some(function(g){return g.key===k;});};
  var items=M.tabs.filter(function(t){return t.key==="__all"||has(t.key);}).map(function(t){var x={key:t.key,icon:t.icon,label:t.label};if(t.key==="delivery")x.badge=wDelivBad();return x;});
  /* 매니저처럼 칸이 빠지면 자재 · 설정으로 채워 늘 다섯 칸 */
  ["mat","settings"].forEach(function(k){
    if(items.length<5&&has(k)&&!items.some(function(t){return t.key===k;})){
      var g=gs.filter(function(x){return x.key===k;})[0];
      items.splice(items.length-1,0,{key:k,icon:g.icon,label:g.label});}});
  var cg=wCur().split("/")[0];
  var cur=items.some(function(t){return t.key===cg;})?cg:"__all";
  CGG.tabbar($("cggTbar"),items,cur,function(k){
    if(k==="__all"){if(!CGG.closeSheet())wAllMenu(false);return;}
    goKey(k);
  });
}
/* 머리말 윗줄 — 차례 · 크기는 공통 부품. 단추 동작은 숨긴 옛 단추를 그대로 불러요 */
function wHdr(){
  if(!window.CGG||!CGG.header||!$("hdrTop")||!S.me)return;
  var pc=(S.mode==="pc"),sp=(S.cfg&&S.cfg.supplier)||{},nm=String(sp.bizName||"");
  var ps=$("pollSel"),opts=ps?Array.prototype.map.call(ps.options,function(o){return [o.value,o.textContent];}):[];
  var fieldOn=canPC()&&$("btnMode")&&!$("btnMode").hidden;
  var o={product:"워시",sub:pc?(isManager()?"입출고 관리":"광택 · 세차 정산"):"현장 화면",ver:(APP_VER.split(" ")[1]||""),
    biz:{name:nm||appName(),line:sp.bizNo?("사업자 "+fmtBizNo(sp.bizNo)+(sp.ceo?(" · 대표 "+sp.ceo):"")):""},
    find:pc?{feats:wFeats(),onGo:goFeat,onPhone:function(){wAllMenu(true);}}:null,
    notice:function(){if(window.ccwNotice)window.ccwNotice();},
    help:function(){$("btnHelp").click();},
    link:pc?function(){$("btnLink").click();}:null,
    refresh:function(){$("btnRefresh").click();},
    auto:ps?{value:ps.value,options:opts,onChange:function(v){ps.value=v;try{ps.dispatchEvent(new Event("change"));}catch(e){}}}:null,
    saved:($("dbState")?$("dbState").textContent:""),
    field:fieldOn?{label:$("btnMode").textContent,on:function(){$("btnMode").click();}}:null,
    me:{name:(S.me&&S.me.name)||"내 정보",role:roleDesc(),items:cggMeItems,onPick:cggMePick}};
  var sig=[o.product,o.sub,o.ver,o.biz.name,o.biz.line,pc,fieldOn,o.me.name,o.me.role,o.find?o.find.feats.length:0,!!o.link,ps?ps.value:""].join("|");
  if(WM.h&&WM.sig===sig&&$("hdrTop").firstChild){wHdrSync();return;}
  WM.sig=sig;
  WM.h=CGG.header($("hdrTop"),o);
  if(!WM.obs&&window.MutationObserver&&$("hdrOld")){
    WM.obs=new MutationObserver(function(){clearTimeout(WM.t);WM.t=setTimeout(wHdrSync,30);});
    WM.obs.observe($("hdrOld"),{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["hidden"]});
  }
  wHdrSync();
}
/* 숨긴 옛 단추에서 바뀐 것(저장 표시 · 공지 빨간 점 · 현장 화면 글 · 휴지통 개수)을 새 머리말로 */
function wHdrSync(){
  if(!WM.h||!$("hdrTop"))return;
  var top=$("hdrTop");
  try{WM.h.saved($("dbState")?$("dbState").textContent:"");}catch(e){}
  var nb=top.querySelector('[data-hb="notice"]'),od=document.querySelector("#ccwNotiBtn .ntDot");
  if(nb){var dt=nb.querySelector(".ntDot");
    if(od){if(!dt){dt=document.createElement("i");dt.className="ntDot";nb.appendChild(dt);}dt.title="안 읽은 공지 "+od.textContent+"건";}
    else if(dt)dt.remove();}
  var fb=top.querySelector('[data-hb="field"]'),fieldOn=canPC()&&$("btnMode")&&!$("btnMode").hidden;
  if(!!fb!==!!fieldOn){WM.sig="";wHdr();return;}
  if(fb)fb.textContent=$("btnMode").textContent;
  try{if(WM.h.me)CGG.badge(WM.h.me,isOwner()?(S.trash||[]).length:0);}catch(e){}
}
/* 기능 찾기 · 바로가기로 오면 빛날 칸 — 그려진 뒤에 붙이는 것 */
function wSpots(){
  var rt=$("rTable");
  if(rt&&!$("ptDealers")&&rt.parentNode){var w=document.createElement("div");w.id="ptDealers";rt.parentNode.insertBefore(w,rt);w.appendChild(rt);}
}
/* 새 홈 — CGG.home 차례 (두 제품 같음) */
function wHome(c){
  var host=$("jHome");if(!host||!window.CGG||!CGG.home)return;
  var demo=$("demoBox");if(demo&&host.contains(demo))$("homeOld").appendChild(demo);
  var now=new Date(),isNow=(c.Y===now.getFullYear()&&c.M===now.getMonth()+1);
  var pre=c.Y+"-"+String(c.M).padStart(2,"0")+"-";
  var days={};
  Object.keys(c.byDay).forEach(function(k){if(k.indexOf(pre)!==0)return;var v=c.byDay[k],d=Number(k.slice(8,10));
    var mk=[];if(v.ins)mk.push(["in",v.ins]);if(v.outs)mk.push(["out",v.outs]);
    days[d]={amt:v.amt||0,marks:mk};});
  Object.keys(c.memoBy).forEach(function(k){if(k.indexOf(pre)!==0)return;var d=Number(k.slice(8,10));
    var open=c.memoBy[k].filter(function(m){return !m.done;}).length;if(!open)return;
    days[d]=days[d]||{marks:[]};days[d].marks=(days[d].marks||[]).concat([["memo",open]]);});
  /* 할 일 3장 — 홈은 정산만 (배달은 메뉴 옆 빨간 숫자, 1.8 보강) */
  var strip=function(v){return String(v==null?"":v).replace(/<[^>]*>/g,"");};
  var pk=(c.pick||[]).filter(function(t){return typeof t[0]==="string"||Number(t[0])>0;});
  var items=pk.slice(0,3).map(function(t){var memo=typeof t[0]==="string";
    return {tone:t[4]==="imp"?"stop":(memo?"chk":"run"),icon:memo?"file":"car",title:strip(t[1])+(memo?"":" "+t[0]+"건"),sub:strip(t[2])};});
  var ri=c.works.slice(0,5),mx=ri.length?ri[0].amt||1:1;
  var mgr=isManager();
  CGG.home(host,{date:(now.getMonth()+1)+"월 "+now.getDate()+"일 "+"일월화수목금토".charAt(now.getDay())+"요일",
    title:($("dhSay")?$("dhSay").innerHTML:""),desc:($("dhSub")?$("dhSub").textContent:""),
    quick:{feats:wFeats(),key:wQuickKey(),defs:CGG_MENU_WASH.quickDefault,onGo:goFeat},
    todo:{items:items,total:c.todos.length,
      onPick:function(i){var t=pk[i];if(t){t[3]();window.scrollTo(0,0);}},
      onAll:function(){todoSheet(c.todos,c.todoBtn);}},
    kpis:jKpiItems(c.rows.reduce(function(t,r){return t+(r.total||0);},0)),
    cal:{y:c.Y,m:c.M,today:isNow?now.getDate():0,days:days,amtLabel:"그날 들어온 차 금액",
      legend:[["in","입고","run"],["out","출고","done"],["memo","메모","chk"]],
      onMove:function(d){if(d<0)$("calPrev").click();else if(d>0)$("calNext").click();else $("calNow").click();},
      onDay:function(d){daySheet(pre+String(d).padStart(2,"0"));}},
    money:{title:"이번 달 입금",link:{label:"입출금",onClick:function(){goKey("money/io");}},big:c.paid,
      bar:{done:c.paid,total:c.billed||0},legend:[["받은 것",c.paid,"done"],["받을 것",c.dueAmt,"chk"]],
      rows:[["아직 작업 중(청구 전)",won(c.rows.filter(function(r){return statusOf(r)==="입고";}).reduce(function(t,r){return t+(r.total||0);},0))]]},
    rank:{title:"이번 달 일감",link:mgr?{label:"일감",onClick:function(){goKey("ledger/list");}}:{label:"매출",onClick:function(){goKey("sales");}},
      sub:"작업 항목별 · 금액 많은 차례",items:ri.map(function(x){return {label:x.name,value:x.n+"대",pct:(x.amt||0)/mx};})}});   /* 도움 카드는 워시 «이 화면 사용법»(jPage) 하나만 */
  /* 정산(이번 달 입금)은 매니저에게 보이지 않아요 */
  if(mgr){var mc=host.querySelector(".cgg-homeside .cgg-side");if(mc)mc.remove();}
  /* 샘플 자료 안내 띠는 머리 바로 아래 */
  if(demo){var hd=host.firstElementChild;if(hd&&hd.nextSibling)host.insertBefore(demo,hd.nextSibling);else host.appendChild(demo);}
}
'''
rep('''/* 새 모양(J안)으로 바뀐 것을 한 번만 알려 드려요 */''', NEW_JS + '''/* 새 모양(J안)으로 바뀐 것을 한 번만 알려 드려요 */''')

# 설정 안쪽 작은 탭에서 «배달 도착지»를 빼요(배달 › 도착지로 옮김) · 입출금 작은 탭을 바꾸면 왼쪽 메뉴도 따라가요
rep('''  $("setSub").innerHTML=setSubFor().filter(function(t){return t[0]!=="trash";}).map(function(t){''',
    '''  $("setSub").innerHTML=setSubFor().filter(function(t){return t[0]!=="trash"&&t[0]!=="sms";}).map(function(t){''')
rep('''    b.setAttribute("aria-selected", String(b.getAttribute("data-mntab") === MNTAB));
  });
}''', '''    b.setAttribute("aria-selected", String(b.getAttribute("data-mntab") === MNTAB));
  });
  try { if (S.mode === "pc" && typeof wNav === "function") wNav(); } catch (e) {}
}''')
# 이 화면 사용법 · 화면 머리 작은 길(일감 › … ) — 배달 칸에 맞게
rep('''var JGROUP={home:"홈",sales:"매출",ledger:"일감",outlog:"일감",''', '''var JGROUP={home:"홈",sales:"매출",ledger:"일감",outlog:"배달",''')
rep('''    if(S.tab==="ledger"||S.tab==="outlog")sub=(WORKSUB.filter(function(x){return x[0]===S.tab;})[0]||[])[1]||"";''',
    '''    if(S.tab==="ledger")sub="입출고 내역";
    else if(S.tab==="outlog")sub=(wDSubs().filter(function(x){return x[0]===(S.dSub||"outlog");})[0]||[])[1]||"";''')
rep('''  vOutLog:"차가 어디로 갔는지, 딜러에게 알림이 나갔는지 봐요. 아래에서 출고 알림 문구와 보내는 방식을 고쳐요.",''',
    '''  vOutLog:"차가 어디로 갔는지, 딜러에게 알림이 나갔는지 봐요. 출고 알림 문구와 보내는 방식은 «배달 › 문구 · 발송 설정»에서 고쳐요.",
  vSms:"자주 가는 도착지를 이름 · 주소와 함께 적어 둬요. 출고할 때 도착지를 고르면 알림에 주소와 지도 링크가 붙어요.",''')
# 8) CSS (워시 완성 CSS 끝에) — 뼈대 치수는 덮어쓰지 않아요. 숨긴 옛 칸 · 배달 칸 나누기만
V129_CSS = """
/* ── v129 공통 부품 1.8 뼈대 — 숨긴 옛 머리말 · 옛 홈, 배달 안쪽 칸 ── */
#hdrOld,#homeOld{display:none!important}
.wsubdup #setSub,.wsubdup #mnTabs{display:none!important}
#vOutLog.d-log #olMsgCard{display:none}
#vOutLog.d-msg > :not(#olMsgCard):not(#jHelp){display:none}
#vOutLog.d-msg #olMsgCard{margin-top:0!important}
.cgg-hb .ntDot{display:inline-block;width:8px;height:8px;min-width:0;padding:0;margin-left:5px;border-radius:50%;background:#C0392B;vertical-align:middle}
"""
a2 = s.index('<style id="cgg-j4-wash-done">\n') + len('<style id="cgg-j4-wash-done">\n'); b2 = s.index('</style>', a2)
s = s[:b2] + V129_CSS + s[b2:]

# 9) 용어 사전(디자인/워딩/용어사전.md) — 디자인 방 요청 이름만 먼저: 상태 칩 «입금 완료»(대표님 10/18) · 탭 · 화면 이름
#    공통 부품 · 메뉴 목록 · 손님에게 가는 문자 줄 · 도움말 비슷한 말 사전(HSYN)은 건드리지 않아요. 저장 값(«수금완료» 등)도 그대로
KEEP = [CSS18, JS18 + "\n" + MENU, 'out+="\\n\\n도착지: "']
h0 = s.index("var HSYN={"); h1 = s.index("\n};", h0) + 3; KEEP.append(s[h0:h1])
for i, k in enumerate(KEEP):
    assert k in s, ("KEEP", i)
    s = s.replace(k, "\u0000KEEP%d\u0000" % i)
WORDS = [("수금 완료", "입금 완료"), ("수금 대기", "입금 대기"), ("입출고 내역", "입고 · 출고 내역"), ("발송함", "보낸 기록"),
         ("배달 도착지", "목적지"), ("도착지", "목적지"), ("입·출금", "입금 · 출금"), ("받아야 할 금액", "받을 금액")]
for a_, b_ in WORDS:
    s = s.replace(a_, b_)
for i, k in enumerate(KEEP):
    s = s.replace("\u0000KEEP%d\u0000" % i, k)
assert CSS18 in s and JS18 in s and MENU in s
exec(open(os.path.join(HERE, "만들기_워시_v132_통합.py"), encoding="utf-8").read())
open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s))
