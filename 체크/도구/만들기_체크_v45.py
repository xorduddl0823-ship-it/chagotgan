"""체크 v44 → v45 — 시험 뒤 판 (v44 는 읽기만 · 시험판 v42 는 그대로)
받은 일: 대표님 결정 10/18 (총괄) — «워시 · 체크 UI 통합: 공통 부품 1.8 페이지 뼈대 + 메뉴 A+C+D + 배달 큰 메뉴»
재료: 디자인/공통/cgg-j4-1.8.css · .js (글자 그대로) · 디자인/메뉴지도/체크_메뉴.js (글자 그대로) · 디자인/메뉴지도/README.md · 디자인/통합검사/README.md
바꾸는 것:
  1) 공통 부품 1.5 → 1.8 (CSS · JS 통째로) + 체크_메뉴.js
  2) 머리말: CGG.header — 로고 · «차곳간 체크» · 성능점검 정산 · v45 | 검사소 | 기능 찾기 · 공지사항 · 도움말 · 링크 복사 · 새로고침 · 자동 · 저장 표시 · 이름 ▾
     (예전 머리말 단추는 숨은 칸에 남겨 두고 그 동작을 그대로 부름 — 로그아웃 · 자동 새로고침 · 링크 복사 코드는 그대로)
  3) 메뉴: CGG.nav(왼쪽 늘 펼침) · CGG.tabbar(홈 · 청구서 · 배달 · 입출금 · 전체) · CGG.allMenu · 기능 찾기 · 바로가기
     «알림» → «재검사 알림», «차량 배달 알림» → 큰 메뉴 «배달», 배달 휴지통은 «휴지통» 화면 안으로
  4) 홈: CGG.home — 한 줄 요약 · 자주 쓰는 기능 · 할 일 3장 · 숫자 칸 4개(작은 그래프 + 지난달보다) · 달력 · 이번 달 입금 · 많이 밀린 곳
  5) 기능 찾기로 올 칸 id: #billSendCard · #dealerWait · #ptCompanies · #ptDealers · #ptSupplier
"""
import re
ROOT = "/home/user/chagotgan/"
BASE = ROOT + "체크/"
s = open(BASE + "2_차곳간_체크_index_v44.html", encoding="utf-8").read()
c15 = open(ROOT + "디자인/공통/cgg-j4.css", encoding="utf-8").read().strip()
j15 = open(ROOT + "디자인/공통/cgg-j4.js", encoding="utf-8").read().strip()
c18 = open(ROOT + "디자인/공통/cgg-j4-1.8.css", encoding="utf-8").read().strip()
j18 = open(ROOT + "디자인/공통/cgg-j4-1.8.js", encoding="utf-8").read().strip()
menu = open(ROOT + "디자인/메뉴지도/체크_메뉴.js", encoding="utf-8").read().strip()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

def cut(a_mark, b_mark, new):
    global s
    if s.count(a_mark) != 1 or s.count(b_mark) != 1:
        raise SystemExit("자리 표시가 하나가 아님: %s / %s" % (a_mark[:60], b_mark[:60]))
    a = s.index(a_mark); b = s.index(b_mark); assert a < b
    s = s[:a] + new + s[b:]

# ── 1) 공통 부품 1.5 → 1.8 ──
rep(c15, c18)
rep(j15, j18 + "\n" + menu)
rep('<!-- ===== 차곳간 공통 부품 cgg-j4 (디자인/공통 최신판 — 글자 그대로. 고칠 것은 디자인 방에 요청) ===== -->',
    '<!-- ===== 차곳간 공통 부품 cgg-j4 1.8 (디자인/공통/cgg-j4-1.8.css — 글자 그대로. 고칠 것은 디자인 방에 요청) ===== -->')

# ── 2) 머리말: 새 칸은 비워 두고 CGG.header 가 그림 · 예전 단추는 숨은 칸으로 (동작 코드가 id 로 찾음) ──
a = s.index('    <div class="cgg-top">\n      <div class="cgg-brand">')
b = s.index('    <nav class="cgg-nav" id="cggNav" role="tablist" aria-label="메뉴"></nav>')
legacy = s[a:b]
s = s[:a] + '    <div class="cgg-top" id="cggTop"></div>\n' + s[b:]
rep('    <nav class="cgg-nav" id="cggNav" role="tablist" aria-label="메뉴"></nav>', '    <nav class="cgg-nav" id="cggNav"></nav>')
rep('<div id="root"></div>', '<div id="legacyHdr" hidden aria-hidden="true">\n' + legacy.replace('class="cgg-top"', 'class="legacy-top"').replace('class="cgg-biz"', 'class="legacy-biz"').replace('class="cgg-brand"', 'class="legacy-brand"').replace('class="cgg-ci"', 'class="legacy-ci"').replace('class="cgg-right"', 'class="legacy-right"') + '</div>\n<div id="root"></div>')

# ── 3) 메뉴 (JOBS · 묶음 · 이동) ──
rep('''var JOBS=[["home","홈"],["sales","매출"],["history","정산 기록"],["bill","청구서"],
  ["deposit","입출금"],["hometax","세금계산서"],["remind","알림"],["set","설정"]];''',
    '''var JOBS=[["home","홈"],["sales","매출"],["history","정산 기록"],["bill","청구서"],
  ["deposit","입출금"],["hometax","세금계산서"],["delivery","배달"],["remind","재검사 알림"],["set","설정"]];   /* v45: 메뉴 지도 확정본 */''')
rep('''var JOBIC={home:"home",sales:"chart",history:"today",bill:"file",deposit:"wallet",hometax:"receipt",remind:"bell",set:"gear"};''',
    '''var JOBIC={home:"home",sales:"chart",history:"today",bill:"file",deposit:"wallet",hometax:"receipt",delivery:"truck",remind:"bell",set:"gear"};''')
rep('''  if(p==="remind" || (typeof DELIVSUB!=="undefined" && DELIVSUB.some(function(x){return x[0]===p;}))) return ["remind",ALSUB];''',
    '''  if(p==="remind") return ["remind",null];   /* v45: «재검사 알림»은 큰 메뉴 하나 */
  if(typeof DELIVSUB!=="undefined" && DELIVSUB.some(function(x){return x[0]===p;})) return ["delivery",DELIVSHOW];   /* v45: 큰 메뉴 «배달» */''')
rep('''var DELIVSUB=[["deliv","배달 기록"],["delivdest","목적지별"],["delivplace","목적지 관리"],
  ["delivmsg","문구 · 발송 설정"],["delivdriver","기사 계정"],["delivtrash","휴지통"]];
function delivTabs(now){ return subBar(DELIVSUB, now); }''',
    '''var DELIVSUB=[["deliv","배달 기록"],["delivdest","목적지별"],["delivplace","목적지 관리"],
  ["delivmsg","문구 · 발송 설정"],["delivdriver","기사 계정"],["delivtrash","휴지통"]];
/* v45: 배달 휴지통은 사람 버튼 ▾ «휴지통» 안으로 — 배달 탭에서는 뺌 */
var DELIVSHOW=DELIVSUB.filter(function(x){ return x[0]!=="delivtrash"; });
function delivTabs(now){ return subBar(DELIVSHOW, now); }''')

cut('''function drawTabs(){''', '''/* 화면 이름 ↔ 주소에 쓰는 한글 이름 */''', r'''/* ═══ v45: 메뉴 — 공통 부품 1.8 (CGG.nav 왼쪽 늘 펼침 · CGG.tabbar · CGG.allMenu · 기능 찾기 · 바로가기)
   메뉴 지도 «go»(묶음/칸) ↔ 체크 화면 이름 (디자인/메뉴지도/README.md «체크 열쇠 표») ═══ */
var P2K={home:"home", sales:"sales/list", files:"sales/upload", history:"history",
  bill:"bill/month", billgrp:"bill/group", billtpl:"bill/tpl", deposit:"deposit/in", unpaid:"deposit/ins", hometax:"hometax",
  deliv:"delivery/log", delivdest:"delivery/bydest", delivplace:"delivery/dest", delivmsg:"delivery/msg", delivdriver:"delivery/driver",
  delivtrash:"delivery/log", remind:"remind",
  partner:"set/partner", price:"set/price", fee:"set/fee", popbill:"set/popbill", sms:"set/sms", alarm:"set/alarm", backup:"set/backup",
  trash:"home", help:"home"};
var K2P={}; Object.keys(P2K).forEach(function(p){ if(p!=="delivtrash" && p!=="trash" && p!=="help") K2P[P2K[p]]=p; });
var SPOT="";
function nowKey(){ return P2K[page]||"home"; }
function goKey(k){
  k=String(k||"");
  if(K2P[k]) return go(K2P[k]);
  var g=CGG_MENU_CHECK.groups.filter(function(x){ return x.key===k.split("/")[0]; })[0];
  if(g && g.subs && g.subs.length && K2P[g.key+"/"+g.subs[0].key]) return go(K2P[g.key+"/"+g.subs[0].key]);
  go("home");
}
function goFeat(f){
  f=f||{}; var k=String(f.go||"");
  SPOT = f.spot ? String(f.spot) : "";
  if(k==="me/trash") return go("trash");
  if(k==="me/plan"){ SPOT=""; try{ window.ccwPlanPay(); }catch(e){ bar("요금제 기능이 아직 준비 중이에요"); } return; }
  if(k==="me/me"){ SPOT=""; try{ chkMyPage(); }catch(e){} return; }
  if(k==="hdr/link"){ SPOT=""; $("btnLink").click(); return; }
  if(k==="hdr/help") return go("help");
  if(k==="hdr/notice"){ SPOT=""; try{ window.ccwNotice(); }catch(e){} return; }
  goKey(k);
}
function cggAll(focus){ var M=CGG_MENU_CHECK; CGG.allMenu(M.groups, nowKey(), goKey, M.feats, goFeat, focus?{focus:true}:undefined); }
/* 배달 빨간 숫자 — 오늘 못 보낸 도착 알림 (홈은 정산만 · 배달은 메뉴 옆 숫자, 디자인 1.8 · 대표님 10/18) */
var DELIV_BAD=0, DELIV_PEEK=false;
function delivBad(){
  var t=ymd(new Date());
  return (DRIVES||[]).filter(function(d){ return d.alarm==="못 보냄" && String(d.at||"").slice(0,10)===t; }).length;
}
function delivPeek(){   /* 앱을 열 때 한 번 — 배달 화면에 안 가도 숫자가 보이게 */
  if(DELIV_PEEK || LOADED.deliv) return; DELIV_PEEK=true;
  LOADERS.deliv().then(function(){ LOADED.deliv=1; drawTabs(); }).catch(function(){});
}
function badged(list){ return list.map(function(g){ return g.key==="delivery" ? Object.assign({}, g, {badge:DELIV_BAD}) : g; }); }
function drawTabs(){
  var G=groupOf(page), M=CGG_MENU_CHECK, key=nowKey(), gk=key.split("/")[0];
  DELIV_BAD=delivBad();
  CGG.nav($("cggNav"), badged(M.groups), key, goKey);
  CGG.tabbar($("cggTbar"), badged(M.tabs), M.tabs.some(function(t){ return t.key===gk; })?gk:"__all", function(k){
    if(k==="__all"){ if(!CGG.closeSheet()) cggAll(false); return; }
    CGG.closeSheet(); goKey(k); });
  var subs=G[1];
  $("cggSub").hidden=!subs;
  $("wrap").classList.toggle("hasSub", !!subs);
  if(subs) $("cggSub").innerHTML=subs.map(function(s){
    return '<button role="tab" aria-selected="'+(page===s[0]?"true":"false")+'" data-go="'+s[0]+'">'+s[1]+'</button>';
  }).join("");
  document.querySelectorAll("#cggSub [data-go]").forEach(function(b){
    b.onclick=function(){ go(b.getAttribute("data-go")); };
  });
}
/* 바로가기 저장 이름 — 검사소 · 사람별 (디자인 방 10-18 · 이 기기에만) */
function quickKey(){ return CGG_MENU_CHECK.quickKey+":"+String(ST.shop||"")+":"+String(ST.who||""); }
/* 머리말 — CGG.header (두 제품 같은 차례). 예전 단추(숨은 칸)의 동작을 그대로 불러요 */
var CGGH=null;
/* 저장 표시 — 체크는 누를 때마다 서버에 바로 저장돼요. 서버와 이어져 있으면 «저장됨 시:분», 끊기면 «저장 안 됨» */
function savedText(){ var d=$("dbState"), c=$("clock"); var t=d?String(d.textContent||""):"";
  if(/연결됨/.test(t)) return "저장됨 "+String((c&&c.textContent)||"").trim();
  if(/안 됨/.test(t)) return "저장 안 됨 · 연결 끊김";
  return "저장 확인 중…"; }
function cggHdr(){
  var M=CGG_MENU_CHECK, code=String(ST.officeCode||ST.shop||"");
  var line=[code?("검사소 "+code):"", ST.who?("대표 "+ST.who):""].filter(Boolean).join(" · ");
  var top=$("cggTop"); if(!top) return;
  CGGH=CGG.header(top, {product:"체크", sub:"성능점검 정산", ver:"v45",
    biz:{name:ST.shopName||"—", line:line},
    find:{feats:M.feats, onGo:goFeat, onPhone:function(){ cggAll(true); }},
    notice:function(){ try{ window.ccwNotice(); }catch(e){} },
    help:function(){ go("help"); },
    link:function(){ $("btnLink").click(); },
    refresh:function(){ refresh(); },
    auto:{value:String(($("pollSel")||{}).value||"30000"),
      options:[["0","자동 끄기"],["15000","15초마다"],["30000","30초마다"],["60000","1분마다"],["180000","3분마다"]],
      onChange:function(v){ var p=$("pollSel"); if(p){ p.value=v; pollSet(Number(v)||0); } }},
    saved:savedText(),
    me:{name:ST.who||"내 정보", role:ST.role==="owner"?"대표":"직원", items:function(){
      var owner=ST.role==="owner";
      return [{key:"me",icon:"user",label:"마이페이지"}]
        .concat(owner?[{key:"plan",icon:"wallet",label:"요금제"}]:[])
        .concat([{key:"trash",icon:"trash",label:"휴지통"},"-",
                 {key:"lay",icon:"pc",label:"화면 설정",note:CGG.layout.name()},"-",
                 {key:"out",icon:"out",label:"로그아웃"}]); },
      onPick:function(k){
        if(k==="me") chkMyPage();
        else if(k==="plan"){ try{ window.ccwPlanPay(); }catch(e){ bar("요금제 기능이 아직 준비 중이에요"); } }
        else if(k==="trash") go("trash");
        else if(k==="lay") cggScreenSet();
        else if(k==="out") $("btnOut").click(); }}});
}
setInterval(function(){ try{ if(CGGH && CGGH.saved) CGGH.saved(savedText()); }catch(e){} }, 30000);
''')

# 큰 메뉴 이름(delivery)으로 불러도 첫 칸으로
rep("""function go(k){
  page=(k==="set")?SETS[0][0]:k;""", """function go(k){
  if(k==="delivery") k="deliv";   /* v45: 큰 메뉴 «배달» */
  page=(k==="set")?SETS[0][0]:k;""")

# 이동 뒤: 기능 찾기 · 바로가기로 온 칸 빛내기
rep('''function draw(){
  var f=PAGE[page]||PAGE.home;
  $("main").innerHTML=f();
  if(AFTER[page]) AFTER[page]();''', '''function draw(){
  var f=PAGE[page]||PAGE.home;
  $("main").innerHTML=f();
  if(AFTER[page]) AFTER[page]();
  if(SPOT){ var sp=SPOT; SPOT=""; setTimeout(function(){ try{ CGG.spot(sp); }catch(e){} }, 60); }   /* v45: 기능 찾기 · 바로가기 */''')

# 머리말 그리기 시점: 앱 열 때 · 서버 답 받은 뒤
rep('''  $("root").innerHTML="";
  $("wrap").hidden=false;''', '''  $("root").innerHTML="";
  $("wrap").hidden=false;
  cggHdr();   /* v45 */
  setTimeout(delivPeek, 1200);   /* v45: 배달 빨간 숫자 */''')
rep('''  $("hdVer").textContent="체크 v44 · "+(_m?("서버 "+_m[0]):"");
  $("hdVer").title=_v||"";
    $("dbState").innerHTML='연결됨 <span id="clock"></span>';''', '''  $("hdVer").textContent="체크 v45 · "+(_m?("서버 "+_m[0]):"");
  $("hdVer").title=_v||"";
    $("dbState").innerHTML='연결됨 <span id="clock"></span>';
    (function(){ var d=new Date(), z=function(n){return (n<10?"0":"")+n;}, c=$("clock"); if(c) c.textContent=z(d.getHours())+":"+z(d.getMinutes()); })();
    cggHdr();   /* v45: 검사소 이름 · 코드 · 연결 상태를 받은 뒤 다시 */''')
rep('''    $("dbState").textContent="연결 안 됨";''', '''    $("dbState").textContent="연결 안 됨"; cggHdr();''')
# 로그아웃하면 바로가기도 지움 (메모처럼 검사소 · 사람별 · 이 기기)
rep('''  del("cgg_lastph"); try{ localStorage.removeItem("ccw_pay"); }catch(e){}   /* v40: 보안 낮음 */''',
    '''  del("cgg_lastph"); try{ localStorage.removeItem("ccw_pay"); }catch(e){}   /* v40: 보안 낮음 */
  try{ Object.keys(localStorage).forEach(function(x){ if(x.indexOf("cgg_check_quick")===0) localStorage.removeItem(x); }); }catch(e){}   /* v45: 바로가기 */''')
# 바닥 셋업: 예전 사람 버튼 메뉴는 숨은 칸이라 붙이지 않음 · 처음 배치는 세로(1.7)
rep('''  var hw=document.getElementById("hWho");
  if(hw){''', '''  var hw=null;   /* v45: 사람 버튼 ▾ 는 CGG.header 가 그려요 (cggHdr) */
  if(hw){''')

# ── 4) 홈: CGG.home ──
HOME = r'''/* ═══ v45: 홈 — 공통 부품 1.8 CGG.home (워시와 같은 차례 · 통합 검사표)
   한 줄 요약 → 자주 쓰는 기능 → 오늘 할 일 3장 → 숫자 칸 4개(작은 그래프 + 지난달보다) → 일정 달력 | 이번 달 입금 · 많이 밀린 곳 → 도움 ═══ */
function homeTodos(){
  var wait=DEPS.filter(function(d){return d.state==="확인 대기";});
  var notSent=BILLS.filter(function(b){return b.sendState==="안 보냄";});
  var noTel=BILLS.filter(function(b){return !b.tel;});
  var taxWait=BILLS.filter(function(b){return b.tax==="끊음";});
  var _tk=(function(){var n=new Date();return n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0")+"-"+String(n.getDate()).padStart(2,"0");})();
  var _ms=[];
  try{ _ms=chkMemos().filter(function(m){ return m.day===_tk && !m.done; }); }catch(e){}
  TODOS=[];
  _ms.slice(0,3).forEach(function(m){
    TODOS.push([(m.time||"메모"), "memo", "오늘 메모 · "+m.text, ((m.by?m.by+" 적음":"")+" — 누르면 완료 표시·수정"), "home"]); });
  TODOS=TODOS.concat([
    [wait.length, wait.length?"r":"g", "확인 필요 입금", "", "deposit"],
    [notSent.length, notSent.length?"w":"g", "아직 안 보낸 청구서", "", "bill"],
    [noTel.length, noTel.length?"r":"g", "보낼 번호가 없는 청구처", "", "partner"],
    [taxWait.length, "", "세금계산서 대상", "", "hometax"]
  ]);
  return TODOS;
}
function todoPick(t){
  if(!t) return;
  if(t[1]==="memo"){ try{ chkDaySheet(new Date().getDate()); }catch(e){} return; }
  if(t[4] && t[4]!=="home") go(t[4]);
}
function todoAll(){
  var sh=document.getElementById("sheet"); if(!sh) return;
  sh.innerHTML='<h3 style="margin:0 0 2px">오늘 할 일</h3>'+
    '<div style="color:var(--muted);font-size:12.5px;margin-bottom:13px">모두 '+TODOS.length+'건이에요. 누르면 그 화면으로 가요.</div>'+
    '<div class="todo todolist">'+TODOS.map(function(x,i){
      var imp=(x[1]==="r" && Number(x[0])>0);
      return '<button data-ti="'+i+'"'+(imp?' class="imp"':'')+'>'+
        '<span class="cnt">'+esc(x[0])+'</span>'+   /* v40: 보안 S-M1 */
        '<span class="tx"><b>'+(imp?'<span class="imptag">중요</span>':'')+esc(x[2])+'</b>'+
        '<span>'+esc(x[3])+'</span></span><span class="go">›</span></button>';
    }).join("")+'</div>'+
    '<div class="sheetbtns"><button class="btn" id="todoClose">닫기</button></div>';
  openSheet();
  sh.querySelectorAll("[data-ti]").forEach(function(b){
    b.onclick=function(){ closeSheet(); todoPick(TODOS[Number(b.getAttribute("data-ti"))]); };
  });
  document.getElementById("todoClose").onclick=closeSheet;
}
function calJump(v){
  if(v===ST.ym) return;
  ST.ym=v; try{ set("cgg_ym",v); }catch(e){}
  if(typeof refresh==="function") refresh(); else draw();
}
function calStep(dy){
  var y=Number(String(ST.ym).slice(0,4)), m=Number(String(ST.ym).slice(5,7))+dy;
  while(m<1){ m+=12; y--; } while(m>12){ m-=12; y++; }
  calJump(y+"-"+String(m).padStart(2,"0"));
}
PAGE.home=function(){ return '<div id="cggHome"></div><div id="homeSteps"></div>'; };
AFTER.home=function(){
  var M=CGG_MENU_CHECK;
  var totFee=0,totRep=0,totPaid=0,cnt=0;
  BILLS.forEach(function(b){ totFee+=b.fee; totRep+=b.rep; totPaid+=b.paid; cnt+=b.cnt; });
  var tot=totFee+totRep, left=Math.max(0,tot-totPaid);
  var pct=tot?Math.round(totPaid/tot*100):0;
  var notSent=BILLS.filter(function(b){return b.sendState==="안 보냄";}).length;
  var now=new Date(), z=function(n){return (n<10?"0":"")+n;};
  var DOW=["일","월","화","수","목","금","토"];
  /* 한 줄 요약 — 숫자는 <em> (사용자 글 없음) */
  var parts=[]; if(notSent) parts.push('청구서 보낼 곳 <em>'+won(notSent)+'곳</em>'); if(left>0) parts.push('입금 대기 <em>'+won(left)+'원</em>');
  var title=parts.length ? parts.join(", ")+'이 있어요' : (BILLS.length ? '이번 달 청구 · 입금을 모두 마쳤어요' : '이번 달 청구서를 아직 안 만들었어요');
  /* 숫자 칸 — 달마다 숫자(매출 기록 · 최근 7달) + 지난달보다 */
  var rows=(SALES||[]).slice().filter(function(r){ return String(r.ym)<=ST.ym; }).sort(function(a,b){ return a.ym<b.ym?-1:a.ym>b.ym?1:0; }).slice(-7);
  function ser(k, curV){ var a=rows.map(function(r){ return Number(r[k])||0; });
    if(rows.length && rows[rows.length-1].ym===ST.ym) a[a.length-1]=curV; else a.push(curV); return a.slice(-7); }
  function dl(a, unit){ if(a.length<2) return null; var c=a[a.length-1], p=a[a.length-2];
    if(unit==="건"){ var d=c-p; return {t:(d>=0?"+":"−")+won(Math.abs(d))+"건", down:d<0}; }
    if(!p) return null; var q=Math.round((c-p)/p*100); return {t:(q>=0?"+":"−")+Math.abs(q)+"%", down:q<0}; }
  var sN=ser("n",cnt), sT=ser("x",tot), sF=ser("fee",totFee), sR=ser("rep",totRep);
  sT=rows.map(function(r){ return (Number(r.fee)||0)+(Number(r.rep)||0); }); if(rows.length && rows[rows.length-1].ym===ST.ym) sT[sT.length-1]=tot; else sT.push(tot); sT=sT.slice(-7);
  function kp(label, v, unit, a, color, du){ var d=dl(a, du||unit); return {label:label, value:won(v), unit:unit, spark:a, color:color,
    delta:d?d.t:null, down:d?d.down:false, vs:"지난달보다"}; }
  var kpis=[kp("이번 달 검사 건수",cnt,"건",sN,"#1668C4"), kp("청구 합계",tot,"원",sT,"#0B2545"),
            kp("검사비",totFee,"원",sF,"#1E9E5A"), kp("정비비",totRep,"원",sR,"#B26B00")];
  /* 일정 달력 — 그날 들어온 돈 + 갈래별 건수 + 메모 */
  var cy=Number(ST.ym.slice(0,4)), cm=Number(ST.ym.slice(5,7));
  var thisMonth=(now.getFullYear()===cy && now.getMonth()+1===cm);
  var days={};
  DEPS.forEach(function(d){
    if(String(d.day).slice(0,7)!==ST.ym) return;
    var dd=Number(String(d.day).slice(8,10)); if(!dd) return;
    var k = d.kind==="정비비" ? "r" : (d.kind==="보험료" ? "s" : "f");
    var o=days[dd]=days[dd]||{amt:0,c:{}}; o.amt+=(d.amount||0); o.c[k]=(o.c[k]||0)+1;
  });
  try{ chkMemos().forEach(function(m){
    if(String(m.day).slice(0,7)!==ST.ym || m.done) return;
    var dd=Number(String(m.day).slice(8,10)); if(!dd) return;
    var o=days[dd]=days[dd]||{amt:0,c:{}}; o.c.m=(o.c.m||0)+1; o.tone="chk"; }); }catch(e){}
  var cal={y:cy, m:cm, today:thisMonth?now.getDate():0, days:{}, amtLabel:"그날 입금",
    legend:[["f","검사비","run"],["r","정비비","done"],["s","보험료","chk"],["m","메모","stop"]],
    onMove:function(k){ if(k===0) calJump(now.getFullYear()+"-"+z(now.getMonth()+1)); else calStep(k); },
    onDay:function(d){ chkDaySheet(d); }};
  Object.keys(days).forEach(function(d){ var o=days[d];
    cal.days[d]={amt:o.amt||0, marks:["f","r","s","m"].filter(function(k){ return o.c[k]; }).map(function(k){ return [k,o.c[k]]; }), tone:o.tone||""}; });
  /* 많이 밀린 곳 — 입금 대기 많은 차례 5곳 */
  var late=BILLS.filter(function(b){return b.left>0;}).sort(function(a,b){return b.left-a.left;});
  var mx=late.length?late[0].left:1;
  homeTodos();
  CGG.home($("cggHome"), {
    date:(now.getMonth()+1)+"월 "+now.getDate()+"일 "+DOW[now.getDay()]+"요일", title:title,
    desc:"오늘 "+(now.getMonth()+1)+"월 "+now.getDate()+"일 · "+z(now.getHours())+":"+z(now.getMinutes())+" 기준"+(thisMonth?"":" · "+ymText(ST.ym)+" 자료"),
    quick:{feats:M.feats, key:quickKey(), defs:M.quickDefault, onGo:goFeat},
    todo:{items:TODOS.slice(0,3).map(function(x){ var memo=(x[1]==="memo");
        return {tone:x[1]==="r"?"stop":x[1]==="w"?"chk":"run", icon:({deposit:"wallet",bill:"file",partner:"shop",hometax:"receipt",home:"today"})[x[4]]||"file",
          title:memo?x[2]:(x[2]+" "+x[0]+"건"), sub:x[3]||(Number(x[0])?"눌러서 바로 처리해요":"지금은 할 일이 없어요")}; }),
      total:TODOS.length, onPick:function(i){ todoPick(TODOS[i]); }, onAll:todoAll},
    kpis:kpis, cal:cal,
    money:{title:"이번 달 입금", link:{label:"입금 내역", onClick:function(){ go("deposit"); }}, big:totPaid,
      bar:{done:totPaid,total:tot}, legend:[["받은 것",totPaid,"done"],["받을 것",left,"chk"]],
      rows:[["검사비 · 정비비 청구", won(totFee)+" · "+won(totRep)],["청구처", won(BILLS.length)+"곳"]]},
    rank:{title:"많이 밀린 곳", link:{label:"청구서", onClick:function(){ go("bill"); }},
      sub:late.length?"입금 대기가 많은 차례 (검사비 · 정비비)":"입금 대기가 없어요",
      items:late.slice(0,5).map(function(b){ return {label:b.name, value:won(b.left)+"원", pct:b.left/mx}; })},
    help:"홈은 워시와 같은 차례예요. 맨 위 «자주 쓰는 기능»은 «바로가기 고르기»로 바꿀 수 있고, 이 기기에만 저장돼요."});
  /* 이번 달 어디까지 왔나 (체크만 — 홈 차례 맨 아래) */
  var made=BILLS.length, sentN=BILLS.filter(function(b){return b.sendState!=="안 보냄";}).length, sp=made?Math.round(sentN/made*100):0;
  $("homeSteps").innerHTML=card("이번 달 어디까지 왔나","왼쪽부터 순서대로 하시면 돼요",
    '<div class="steps">'+
      '<div class="stp'+(made?" done":"")+'"><span class="n">1단계</span><b>자료 올리기</b><div class="bar"><i style="width:'+(made?100:0)+'%"></i></div><small>매출 → 자료 올리기</small></div>'+
      '<div class="stp'+(made?" done":"")+'"><span class="n">2단계</span><b>청구서 만들기</b><div class="bar"><i style="width:'+(made?100:0)+'%"></i></div><small>'+won(made)+'장 만듦</small></div>'+
      '<div class="stp"><span class="n">3단계</span><b>청구서 보내기</b><div class="bar"><i style="width:'+sp+'%"></i></div><small>'+won(sentN)+'장 보냄 · '+won(made-sentN)+'장 남음</small></div>'+
      '<div class="stp"><span class="n">4단계</span><b>입금 확인</b><div class="bar"><i style="width:'+pct+'%"></i></div><small>'+pct+'% 입금</small></div>'+
    '</div>');
};

'''
cut('''PAGE.home=function(){''', '''/* ═══════ 그 날 창 — 워시''', HOME)
rep('''  home:["bill","dep"], sales:["sales"],''', '''  home:["bill","dep","sales"], sales:["sales"],''')

# ── 4-0) 체크 바탕 입력 칸 규칙이 머리말 «자동 새로고침» 고르기 칸(.cgg-hb)을 넓히지 않게 ──
rep("""input[type=text],input[type=tel],input[type=number],input[type=password],select,textarea{
  width:100%;""", """input[type=text],input[type=tel],input[type=number],input[type=password],select:not(.cgg-hb),textarea{
  width:100%;""")
rep("""input:focus,select:focus,textarea:focus{""", """input:focus,select:not(.cgg-hb):focus,textarea:focus{""")

# ── 4-1) 뼈대 부품 줄 높이 — 체크 바탕 글(line-height 1.55)이 할 일 카드 높이를 바꾸지 않게 (통합 검사표 «할 일 카드 높이» 74) ──
m = re.search(r'<style id="v43-piece">\n.*?</style>', s, re.S)
s = s[:m.end()] + """
<style id="v45-piece">
/* 뼈대 부품 줄 높이는 1.8 보강(8cfa2ea)이 정해요. 메뉴 줄만 아직 빠져 있어 1.8 과 같은 값(1.45)을 임시로 — 디자인 방에 1.8 목록에 넣어 달라고 알림 */
.cgg-nav,.cgg-navsub{line-height:1.45}
/* 넓은 화면에서는 1.8 이 아래 칸을 그려요(가로: .cgg-navsub · 세로: 왼쪽 늘 펼침) — 예전 아래 칸 줄은 폰에서만 */
@media (min-width:601px){ #cggSub{display:none!important} }
</style>""" + s[m.end():]

# ── 5) 기능 찾기로 올 칸 id ──
rep('''  /* v43: 보낸 상태 고르기 · 입금 기한 · 시험 · 보내기 */''', '''  /* v45: 기능 찾기 «청구서 보내기» 칸 */
  (function(){ var e=$("bsSend")||$("phoneMsg"); var c=e&&e.closest(".card"); if(c) c.id="billSendCard"; })();
  /* v43: 보낸 상태 고르기 · 입금 기한 · 시험 · 보내기 */''')
rep('''function pendWire(){
  if(!$("pnd-blk")) return;''', '''function pendWire(){
  if(!$("pnd-blk")) return;
  (function(){ var c=$("pnd-blk").closest(".card"); if(c) c.id="dealerWait"; })();   /* v45: 기능 찾기 «딜러 등록 대기» */''')
rep('''  /* v44: 딜러 · 매매상사 넣기 · 지우기 (대표만) */''', '''  /* v45: 기능 찾기로 올 칸 */
  [["of-name","ptSupplier"],["cmp-blk","ptCompanies"],["dlr-blk","ptDealers"]].forEach(function(x){
    var e=$(x[0]), c=e&&e.closest(".card"); if(c) c.id=x[1]; });
  /* v44: 딜러 · 매매상사 넣기 · 지우기 (대표만) */''')

# ── 6) 배달 휴지통 → «휴지통» 화면 안 ──
rep('''    ], T, {pick:true, tools:'<button class="btn primary">선택한 줄 되살리기</button><button class="btn">엑셀 다운로드</button>'}));
};
AFTER.trash=function(){ wireTable("trs",function(){ draw(); }); };''',
    '''    ], T, {pick:true, tools:'<button class="btn primary">선택한 줄 되살리기</button><button class="btn">엑셀 다운로드</button>'}))+
  card("배달 휴지통","지운 배달 기록은 30일 동안 여기서 되살릴 수 있어요.",
    '<div class="tools"><button class="btn primary" id="trDeliv">배달 휴지통 열기</button></div>');
};
AFTER.trash=function(){ wireTable("trs",function(){ draw(); });
  var b=$("trDeliv"); if(b) b.onclick=function(){ go("delivtrash"); }; };''')

rep('$("hdVer").textContent="체크 v44 · "', '$("hdVer").textContent="체크 v45 · "', 0) if False else None
for bad in ["cgg-j4 1.5"]:
    pass
open(BASE + "2_차곳간_체크_index_v45.html", "w", encoding="utf-8").write(s)
print("OK v45", len(s))
