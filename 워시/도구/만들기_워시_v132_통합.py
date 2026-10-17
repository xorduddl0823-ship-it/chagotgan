# 워시 v132 — 새 규칙(.claude/skills/chagotgan-builder/SKILL.md) 덧붙임. 만들기_워시_v132.py 가 맨 끝에서 불러요(s · rep 그대로 씀)
# 대표님 결정(10/18): ① 기능 찾기 = 메뉴 줄 오른쪽 끝 ② 세 번째 탭 = «매출»(지금 매출 화면 그대로, c0f996e) ③ 이번 달 입금
# «매출» 탭(세 번째)을 빼기로 하면 W132={REC:false} 한 줄만 바꾸면 돼요 → 매출은 «일감 › 매출»로

# ── A. 숫자 칸 4개 (규칙 4: 4칸 고정) ──
# (매출 화면 숫자 칸 5개는 그대로 — 대표님 c0f996e «지금 매출 화면 모양 그대로»)
rep('''      return '<div class="sums c5" style="margin-bottom:8px">'+''', '''      return '<div class="sums" style="margin-bottom:8px">'+''')
rep('''        '<div class="sum"><span>세금계산서 미발급</span><b'+(taxNo?' style="color:var(--warn)"':'')+'>'+taxNo+'건</b></div>'+
''', '')   # v132: 미발급은 세금계산서 화면 할 일 띠에서
rep('''  <div class="sums" id="olSums" style="grid-template-columns:repeat(5,1fr)"></div>''', '''  <div class="sums" id="olSums" style="grid-template-columns:repeat(4,1fr)"></div>''')
rep(''''<div class="sum"><span>못 보냄</span><b style="color:'+(fail?"var(--danger)":"")+'">'+fail+'건</b></div>'+
    '<div class="sum"><span>사진 있음</span><b>'+photo+'건</b></div>';''', ''''<div class="sum"><span>못 보냄</span><b style="color:'+(fail?"var(--danger)":"")+'">'+fail+'건</b></div>';''')
rep('''  <div class="sums" style="grid-template-columns:repeat(3,1fr)">
    <div class="sum"><span>자재 종류</span><b id="mKinds">0종</b></div>''', '''  <div class="sums" style="grid-template-columns:repeat(4,1fr)">
    <div class="sum"><span>자재 종류</span><b id="mKinds">0종</b></div>''')
rep('''    <div class="sum"><span>이번 달 구매</span><b id="mBuy">0원</b></div>
''', '''    <div class="sum"><span>이번 달 구매</span><b id="mBuy">0원</b></div>
    <div class="sum"><span>도매상</span><b id="mVend">0곳</b></div>
''')
rep('''  $("mBuy").textContent=won(buy);
''', '''  $("mBuy").textContent=won(buy);
  if($("mVend"))$("mVend").textContent=(S.vendors||[]).length+"곳";
''')

# ── B. 일감 달 고르기 — 목록 상자 대신 달력식(청구서 · 세금계산서와 같은 단추) ──
rep('''    <select id="lMonth"></select>''', '''    <span id="lMonthHost"></span><select id="lMonth" hidden></select>''')
rep('''  L.month=fillMonths($("lMonth"),L.month,L.monthSet);''', '''  L.month=fillMonths($("lMonth"),L.month,L.monthSet);
  if($("lMonthHost")){$("lMonthHost").innerHTML=monthBtnHtml("lMonthBtn");
    wireMonthBtn("lMonthBtn",L.month,function(k){var sl=$("lMonth");if(k&&!Array.prototype.some.call(sl.options,function(o){return o.value===k;})){var op=document.createElement("option");op.value=k;op.textContent=monthLabel(k);sl.appendChild(op);}sl.value=k||"";sl.onchange();},true);}''')

# ── C. 메뉴 — 탭 차례(규칙 3) · 이름 · 매출 탭 스위치 ──
rep('''function wGroups(){
  var M=window.CGG_MENU_WASH;if(!M)return [];''', '''/* v132 — 대표님 결정(10/18 c0f996e): 세 번째 탭 = «매출»(지금 매출 화면 그대로). REC:false 면 탭을 빼고 «일감 › 매출» */
var W132={REC:true};
var W132_ORDER=["home","ledger","sales","bill","money","tax","delivery","mat","settings"];
var W132_NAME={sales:"매출",bill:"월별 청구서",money:"입·출금 내역"};
function wGroups(){
  var g=wGroups0();
  if(!W132.REC&&g.some(function(x){return x.key==="sales";})){
    g=g.filter(function(x){return x.key!=="sales";});
    g.forEach(function(x){if(x.key==="ledger")x.subs=[{key:"list",label:"입고 · 출고 내역"},{key:"sales",label:"매출"}];});
  }
  g.forEach(function(x){if(W132_NAME[x.key])x.label=W132_NAME[x.key];});
  g.sort(function(a,b){return W132_ORDER.indexOf(a.key)-W132_ORDER.indexOf(b.key);});
  return g;
}
function wGroups0(){
  var M=window.CGG_MENU_WASH;if(!M)return [];''')
rep('''  if(t==="ledger")return "ledger/list";''', '''  if(t==="ledger")return "ledger/list";
  if(t==="sales")return W132.REC?"sales":"ledger/sales";''')
rep('''  if(g==="ledger")S.tab="ledger";''', '''  if(g==="ledger")S.tab=(sub==="sales")?"sales":"ledger";''')
# 기능 찾기 목록 — 새 메뉴 이름 · 자리로
rep('''  return M.feats.filter(function(f){return ok(f.go);});''', '''  return M.feats.map(wFeat).filter(function(f){return ok(f.go);});''')
rep('''/* 배달 안쪽 작은 탭 */''', '''/* v132 기능 하나 — 새 탭 이름 · 매출 자리 · «주소» */
function wFeat(f){
  var x={},k;for(k in f)if(Object.prototype.hasOwnProperty.call(f,k))x[k]=f[k];
  var p=String(x.path||"");
  if(x.go==="sales"){x.go=W132.REC?"sales":"ledger/sales";p=W132.REC?"매출":"일감 › 매출";}
  p=p.replace(/^청구서 › .*/,"월별 청구서").replace(/^청구서$/,"월별 청구서").replace(/^입출금 ›/,"입·출금 내역 ›").replace("머리말 › 링크 복사","머리말 › 주소").replace(/^사람 버튼/,"사람 단추");
  x.path=p;return x;
}
/* 배달 안쪽 작은 탭 */''')
# 메뉴 줄 오른쪽 끝 — 기능 찾기 (대표님 ①) · 공통 부품 1.9 opt.find (좁은 화면 · 세로 배치는 머리말 [찾기] 단추가 대신)
rep('''function wNav(){
  try{CGG.nav($("tabs"),wGroups(),wCur(),goKey);}catch(e){}''', '''function wNav(){
  try{CGG.nav($("tabs"),wGroups(),wCur(),goKey,S.mode==="pc"?{find:{feats:wFeats(),onGo:goFeat}}:{});}catch(e){}''')

# ── D. 머리말 — 설명 · 판 · 날짜 / 주소 / 연결됨 / 사람 단추 아래 줄 ──
rep('''    find:pc?{feats:wFeats(),onGo:goFeat,onPhone:function(){wAllMenu(true);}}:null,''', '''    find:null,   /* v132: 기능 찾기는 메뉴 줄 오른쪽 끝(대표님 결정) */
    date:(APP_VER.match(/\\d{4}-(\\d{2})-(\\d{2})/)||[]).slice(1).map(Number).join("/"),''')
rep('''    saved:($("dbState")?$("dbState").textContent:""),''', '''    saved:wSaved(),''')
rep('''    me:{name:(S.me&&S.me.name)||"내 정보",role:roleDesc(),items:cggMeItems,onPick:cggMePick}};''',
    '''    me:{name:(S.me&&S.me.name)||"내 정보",role:roleDesc(),sub:isOwner()?"마이페이지 · 휴지통":"마이페이지",items:cggMeItems,onPick:cggMePick}};''')
rep('''  try{WM.h.saved($("dbState")?$("dbState").textContent:"");}catch(e){}''', '''  try{var sv=wSaved();WM.h.saved(sv===true?"연결됨":sv);var se=$("hdrTop").querySelector('[data-hb="saved"]');if(se)se.classList.toggle("w-off",sv!==true);}catch(e){}''')
rep('''/* 숨긴 옛 단추에서 바뀐 것''', '''/* v132 저장 연결 — 잘 되면 «연결됨»(초록 점), 아니면 옛 글(저장 안 됨 · 확인 중) 그대로 */
function wSaved(){var t=$("dbState")?String($("dbState").textContent||""):"";return /저장됨|●/.test(t)?true:(t||"확인 중");}
/* 숨긴 옛 단추에서 바뀐 것''')

# ── E. 홈 — 오른쪽 카드 이름 · 이동 이름 ──
rep('''    money:{title:"이번 달 입금",link:{label:"입출금",onClick:function(){goKey("money/io");}},big:c.paid,''',
    '''    money:{title:"이번 달 입금",link:{label:"입·출금 내역",onClick:function(){goKey("money/io");}},big:c.paid,''')
rep('''{label:"매출",onClick:function(){goKey("sales");}},''', '''{label:"매출",onClick:function(){goKey(W132.REC?"sales":"ledger/sales");}},''')

# ── F. 화면 머리 작은 길 · 이름 ──
rep('''var JGROUP={home:"홈",sales:"매출",ledger:"일감",outlog:"배달",bill:"청구서",money:"입출금",''',
    '''var JGROUP={home:"홈",sales:"매출",ledger:"일감",outlog:"배달",bill:"월별 청구서",money:"입·출금 내역",''')

# ── G. 화면 뼈대 (규칙 4): 제목+설명 → 할 일 띠 → 도구줄 → 숫자 칸 4 → 표 → 도움 ──
rep('''    if(S.tab==="ledger"){jLedger();jLedgerTable();}''', '''    if(S.tab==="ledger"){jLedger();jLedgerTable();}
    wSkel(sec);''')
SKEL_JS = r'''
/* ══════════════ v132 — 일 화면 뼈대 (SKILL.md 4) · 할 일 띠 CGG.todoBand ══════════════ */
function wBandOf(tab){
  var recs=S.records||[];
  function sum(a){return a.reduce(function(t,r){return t+(Number(r.total)||0);},0);}
  if(tab==="ledger"){var o=recs.filter(function(r){return statusOf(r)==="출고"&&(!L.month||(r.month||mKey(r.createdAt))===L.month);});
    return {count:o.length,text:"출고했는데 아직 입금 안 된 차 "+o.length+"대 · "+won(sum(o)),
      onGo:function(){var b=Array.prototype.filter.call(document.querySelectorAll("#jLT .cgg-tabsH button"),function(x){return /입금 대기|수금 대기/.test(x.textContent);})[0];
        if(b)b.click();var t=$("jLT");if(t)try{CGG.spot(t);}catch(e){t.scrollIntoView({block:"start"});}}};}
  if(tab==="bill"){var l=[];try{l=(B.made||buildBills()).filter(function(x){return x.amount>0&&!billState(x.name);});}catch(e){}
    return {count:l.length,text:"아직 안 보낸 청구서 "+l.length+(B.unit==="company"?"곳":"명")+" · "+won(l.reduce(function(t,x){return t+(x.amount||0);},0)),
      onGo:function(){var c=$("billSendCard");if(c)try{CGG.spot(c);}catch(e){c.scrollIntoView();}}};}
  if(tab==="money"){var d=recs.filter(function(r){return statusOf(r)==="출고";});
    return {count:MNTAB==="due"?0:d.length,text:"받을 금액 "+won(sum(d))+" · 차 "+d.length+"대",empty:"지금 처리할 일이 없어요",go:"받을 금액 보기",
      onGo:function(){goKey("money/due");}};}
  if(tab==="tax"){var n=0;try{n=taxGroups().filter(function(g){var d=taxDoc(g);return g.issue&&!(d&&d.status==="발급");}).length;}catch(e){}
    return {count:n,text:"아직 발급 안 한 세금계산서 "+n+"건",onGo:function(){var t=$("tTable");if(t)try{CGG.spot(t);}catch(e){t.scrollIntoView();}}};}
  if(tab==="outlog"){var f=wDelivBad();
    return {count:(S.dSub||"outlog")==="outlog"?f:0,tone:"stop",text:"오늘 못 보낸 출고 알림 "+f+"건 — 다시 보내 주세요",
      onGo:function(){var b=$("olResend");if(b)try{CGG.spot(b);}catch(e){b.scrollIntoView();}}};}
  if(tab==="mat"){var m=parseInt(String(($("mLow")||{}).textContent||"0").replace(/[^0-9]/g,""),10)||0;
    return {count:m,tone:"chk",text:"부족한 자재 "+m+"가지 — 도매상에 주문하세요",onGo:function(){var b=$("matOrder");if(b)try{CGG.spot(b);}catch(e){b.scrollIntoView();}}};}
  /* 매출은 지금 화면 그대로(대표님 c0f996e) — 할 일 띠 없음 */
  return null;
}
function wSkel(sec){
  if(!sec||S.mode!=="pc"||!window.CGG||!CGG.todoBand)return;
  var cf=wBandOf(S.tab), head=sec.querySelector(":scope > .dashhead")||sec.querySelector(".phead");
  var bd=$("wBand");
  if(!cf||!head){if(bd)bd.hidden=true;return;}
  if(!bd){bd=document.createElement("div");bd.id="wBand";}
  if(head.nextElementSibling!==bd)head.parentNode.insertBefore(bd,head.nextSibling);
  bd.hidden=false;CGG.todoBand(bd,cf);
  /* 도구줄은 숫자 칸 위로 (일감: 달 고르기 줄 · 자재: 추가 · 주문 줄) */
  var sums=sec.querySelector(":scope > .sums");
  if(sums){var nx=sums.nextElementSibling;
    if(nx&&(nx.classList.contains("tools")||(nx.classList.contains("card")&&nx.querySelector(":scope > .tools")&&!nx.querySelector("h2"))))sums.parentNode.insertBefore(nx,sums);}
}
'''
rep('''/* 새 모양(J안)으로 바뀐 것을 한 번만 알려 드려요 */''', SKEL_JS + '''/* 새 모양(J안)으로 바뀐 것을 한 번만 알려 드려요 */''')
# 새 모양 안내 글 (한 번만)
rep('''"화면이 새 모양으로 바뀌었어요. 메뉴는 왼쪽에 늘 펼쳐져 있고, 출고 기록 · 목적지는 «배달» 안에 있어요. 위 «기능 찾기»에 하고 싶은 일을 쳐 보세요"''',
    '''"화면이 새 모양으로 바뀌었어요. 출고 기록 · 목적지는 «배달» 안에 있어요. 메뉴 줄 오른쪽 «기능 찾기»에 하고 싶은 일을 쳐 보세요"''')

# 상태 색(규칙 1): 파랑 = 하는 중 → «작업 중» 숫자 칸도 파랑
rep('''busyAt(end(k));}),color:"#B26B00"},''', '''busyAt(end(k));}),color:"#1668C4"},''')

# ── H. CSS ──
V132_CSS = """
/* ── v132 새 규칙 — 할 일 띠 자리 · 숫자 칸 가운데 · 도구줄 43/42 ── */
#wBand{margin:0 0 16px}
.cgg-main section .sums .sum{text-align:center}
.cgg-main section .sums .sum > span{display:block;text-align:center;justify-content:center}
.cgg-main section .sums .sum b{font-variant-numeric:tabular-nums}
.cgg-main section .tools .btn,.cgg-main section .tools select,.cgg-main section .tools input:not([type=checkbox]):not([type=radio]){min-height:43px;box-sizing:border-box}
@media (max-width:600px){.cgg-main section .tools .btn,.cgg-main section .tools select,.cgg-main section .tools input:not([type=checkbox]):not([type=radio]){min-height:42px}}
.cgg-hb.cgg-conn.w-off i{background:#F59E0B;box-shadow:0 0 0 3px #F59E0B33}
"""
a3 = s.index('<style id="cgg-j4-wash-done">\n') + len('<style id="cgg-j4-wash-done">\n'); b3 = s.index('</style>', a3)
s = s[:b3] + V132_CSS + s[b3:]

# ══ 검사 일꾼(v132) 고침 ══
# A. 되돌리기 어려운 일 — 확인 창에 «누구에게 · 몇 건 · 얼마» (규칙 5)
rep('''function resendOut(list){''', '''/* v132: 확인 창 «누구에게» 줄 — 이름 셋까지 + 외 N곳 */
function wWho(names){var u=[];(names||[]).forEach(function(n){n=String(n||"").trim();if(n&&u.indexOf(n)<0)u.push(n);});
  return u.length?(u.slice(0,3).join(", ")+(u.length>3?" 외 "+(u.length-3)+"곳":"")):"-";}
/* 번호 → 딜러 · 상사 이름 (보낸 기록은 번호만 남아요) */
function wNameOf(ph){var d=String(ph||"").replace(/\\D/g,"");if(!d)return "";
  var x=(S.dealers||[]).filter(function(r){return String(r.phone||"").replace(/\\D/g,"")===d;})[0]||(S.comps||[]).filter(function(r){return String(r.managerPhone||r.mainPhone||"").replace(/\\D/g,"")===d;})[0];
  return x?x.name+" ("+ph+")":"";}
function resendOut(list){''')
rep('''  ask(ok.length+"건에 출고 알림을 다시 보내요.\\n보내는 방식: "+''',
    '''  ask("받는 딜러 · "+wWho(ok.map(function(r){return r.dealer||r.company;}))+"\\n몇 건 · "+ok.length+"건\\n얼마 · 약 "+won(ok.length*8)+" (알림톡 기준 · 문자로 가면 한 통 약 20~100원)\\n\\n출고 알림을 다시 보내요.\\n보내는 방식: "+''')
rep('''  ask(periodLabel(B.month)+"\\n"+(tt.all?"전체 ":"고른 곳 ")+targets.length+"곳 · 합계 "+wonExact(tt.sum)+"\\n청구 알림을 보내요.''',
    '''  ask(periodLabel(B.month)+"\\n받는 곳 · "+wWho(targets.map(function(b){return b.name;}))+"\\n"+(tt.all?"전체 ":"고른 곳 ")+targets.length+"곳 · 합계 "+wonExact(tt.sum)+"\\n청구 알림을 보내요.''')
rep('''      go.length+"건 · 합계 "+wonExact(go.reduce(function(s,g){return s+g.amount;},0))+''',
    '''      "받는 곳 · "+wWho(go.map(function(g){return g.issuerName;}))+"\\n"+go.length+"건 · 합계 "+wonExact(go.reduce(function(s,g){return s+g.amount;},0))+''')
rep('''  ask(keys.length+"건에 주문 문자를 보내요.\\n"+''',
    '''  ask("도매상 · "+wWho(keys.map(function(k){var m=g[k][0];return (m&&m.vendor)||k;}))+"\\n몇 건 · 문자 "+keys.length+"통 (자재 "+keys.reduce(function(t,k){return t+g[k].length;},0)+"가지)\\n얼마 · 문자 요금 약 "+won(keys.length*50)+"\\n\\n주문 문자를 보내요.\\n"+''')
# B. 일감 달력 — 자료 없는 달을 골라도 그 달 그대로
rep('''function fillMonths(sel,cur,keepAll){
  var ks=monthsList();''', '''function fillMonths(sel,cur,keepAll){
  var ks=monthsList();
  if(cur&&ks.indexOf(cur)<0)ks=ks.concat([cur]).sort().reverse();   /* v132: 달력에서 고른 달(자료 없음)도 목록에 */''')
rep('''sl.value=k||"";sl.onchange();},true);}''', '''L.month=k||"";L.monthSet=true;L.page=1;renderLedger();jPage();},true);}''')
rep('''var op=document.createElement("option");op.value=k;op.textContent=monthLabel(k);sl.appendChild(op);}''', '''}''')
rep('''    wireMonthBtn("lMonthBtn",L.month,function(k){var sl=$("lMonth");if(k&&!Array.prototype.some.call(sl.options,function(o){return o.value===k;})){}''',
    '''    wireMonthBtn("lMonthBtn",L.month,function(k){''')
# C. 세로 · 아이콘 배치 — 찾기 칸은 왼쪽 메뉴 안(세로) · 머리말 돋보기 단추(아이콘)
rep('''    find:null,   /* v132: 기능 찾기는 메뉴 줄 오른쪽 끝(대표님 결정) */''',
    '''    find:pc?{mode:"nav",feats:wFeats(),onGo:goFeat}:null,   /* v132: 기능 찾기 = 메뉴 줄 오른쪽 끝(대표님 결정, 1.9 mode:"nav") */''')
rep('''  var sig=[o.product,''', '''  var sig=[wLay(),o.product,''')
rep('''function wSaved(){''', '''function wLay(){var a=$("app");return a&&a.classList.contains("lay-icon")?"icon":(a&&a.classList.contains("lay-side")?"side":"top");}
function wSaved(){''')
# D. 상태 색 — 빨강은 «막힘»에만. 확인 필요 = 주황, 출금 = 기본 글색
rep('''    '<div class="sum"><span>출금 금액</span><b style="color:var(--danger)">'+won(outSum)+'</b></div>'+''',
    '''    '<div class="sum"><span>출금 금액</span><b>'+won(outSum)+'</b></div>'+''')
rep('''      (todo.length?"var(--danger)":"var(--muted)")+'">'+todo.length+'건</b></div>'+''',
    '''      (todo.length?"var(--warn)":"var(--muted)")+'">'+todo.length+'건</b></div>'+''')
rep('''        '<div class="sum"><span>받을 금액</span><b'+(dueSum?' style="color:var(--danger)"':'')+'>'+won(dueSum)+'</b></div>'+''',
    '''        '<div class="sum"><span>받을 금액</span><b'+(dueSum?' style="color:var(--warn)"':'')+'>'+won(dueSum)+'</b></div>'+''')
# E. 받을 금액 칸에서는 띠에 금액만(단추 없음)
rep('''    return {count:MNTAB==="due"?0:d.length,text:"받을 금액 "+won(sum(d))+" · 차 "+d.length+"대",empty:"지금 처리할 일이 없어요",go:"받을 금액 보기",
      onGo:function(){goKey("money/due");}};}''', '''    if(MNTAB==="due")return {count:d.length,text:"받을 금액 "+won(sum(d))+" · 차 "+d.length+"대 — 상사를 눌러 입금 완료를 해요"};
    return {count:d.length,text:"받을 금액 "+won(sum(d))+" · 차 "+d.length+"대",go:"받을 금액 보기",onGo:function(){goKey("money/due");}};}''')
# F. 이름 — 탭과 같게 «입·출금 내역»
rep('''  <div class="dashhead"><h2>입금 · 출금 내역</h2>''', '''  <div class="dashhead"><h2>입·출금 내역</h2>''')
rep('''toast("「입출금 기록」이 「입금 · 출금 내역」으로 이름이 바뀌었어요");''', '''toast("「입출금 기록」이 「입·출금 내역」으로 이름이 바뀌었어요");''')
# G. 수정발행 확인 창 — 이름을 두 번 바꾸지 않게
rep('''      pick[1]+"\\n"+esc(g.issuerName)+" · "+''', '''      pick[1]+"\\n"+g.issuerName+" · "+''')

# ══ 검사 일꾼(v132 두 번째) 고침 ══
# 1. 자재 한 가지 주문 · 사용 뒤 주문 — 확인 창에 «누구에게 · 몇 건 · 얼마»
rep('''    if(shortQty(cur)<=0&&!confirmed("아직 부족하지 않아요. 그래도 주문 문자를 보낼까요?",this))return;
    orderSend([cur],cur.vendorPhone);''', '''    ask("도매상 · "+(cur.vendor||cur.vendorPhone)+"\\n몇 건 · 문자 1통 (자재 1가지: "+(cur.name||"")+")\\n얼마 · 문자 요금 약 50원"+
        (shortQty(cur)<=0?"\\n\\n아직 부족하지 않아요.":"")+"\\n\\n주문 문자를 보내요.",function(){orderSend([cur],cur.vendorPhone);},"보내기");''')
rep('''        ask(o.name+" 재고가 부족해요.\\n도매상에 주문 문자를 보낼까요?",function(){orderSend([o],matPhone(o));},"보내기");''',
    '''        ask(o.name+" 재고가 부족해요.\\n\\n도매상 · "+(o.vendor||matPhone(o))+"\\n몇 건 · 문자 1통 (자재 1가지)\\n얼마 · 문자 요금 약 50원\\n\\n주문 문자를 보낼까요?",function(){orderSend([o],matPhone(o));},"보내기");''')
# 2. 설정 › 보낸 기록 «선택항목 다시 보내기» — 확인 창 뒤에 보내기
rep('''    jobs.forEach(function(o){if(o.scheduledDate&&new Date(o.scheduledDate)<new Date(Date.now()+10*60000))o.scheduledDate="";});
    Promise.all(jobs.map(function(o){return sendNow(o).catch(function(){});}))
     .then(function(){OB.sel={};toast("다시 보냈어요");renderOutbox();});''', '''    ask("받는 곳 · "+wWho(jobs.map(function(o){return wNameOf(o.to)||o.to;}))+"\\n몇 건 · "+jobs.length+"건\\n얼마 · 약 "+won(jobs.length*8)+" ~ "+won(jobs.length*100)+" (알림톡이면 적게 · 사진 문자면 많이)\\n\\n고른 알림을 다시 보내요.",function(){
    jobs.forEach(function(o){if(o.scheduledDate&&new Date(o.scheduledDate)<new Date(Date.now()+10*60000))o.scheduledDate="";});
    Promise.all(jobs.map(function(o){return sendNow(o).catch(function(){});}))
     .then(function(){OB.sel={};toast("다시 보냈어요");renderOutbox();});},"다시 보내기");''')
# 3. 이름 «입·출금 내역» — 기능 찾기 줄(메뉴 지도 글은 그대로 두고 화면에서만) · 도움말 · 화면 설명
rep('''  x.path=p;return x;''', '''  if(x.label==="입금 · 출금 내역")x.label="입·출금 내역";
  x.path=p;return x;''')
rep('''t:"PC · 입금 · 출금 내역",''', '''t:"PC · 입·출금 내역",''')
rep('''  vMoney:"입금 · 출금 내역과 받을 금액을 봐요.",''', '''  vMoney:"입·출금 내역과 받을 금액을 봐요.",''')
# 다음 판에서 하려던 것 — 배치를 바꾸면 머리말 · 메뉴를 바로 다시 그려요(아이콘 배치 돋보기)
rep('''function applyLayout(){''', '''function applyLayout(){
  setTimeout(function(){try{if(S.mode==="pc"&&typeof wHdr==="function"){WM.sig="";wHdr();wNav();}}catch(e){}},0);''')

# ══ 대표님 지적(b9d1e4e): 청구는 딜러 개개인에게 — 월별 청구서 처음 단위 = 딜러 (상사로 묶어 보기는 그대로 고를 수 있어요) ══
rep('''var B={q:"",size:20,page:1,key:"amount",dir:"desc",month:"",sel:{},unit:"company",''', '''var B={q:"",size:20,page:1,key:"amount",dir:"desc",month:"",sel:{},unit:"dealer",''')
rep('''        <option value="dealer">딜러별로 청구</option>
        <option value="company" selected>매매상사별로 청구</option>''', '''        <option value="dealer" selected>딜러별로 청구 (기본)</option>
        <option value="company">매매상사로 묶어 보기</option>''')

# ══ 검사 일꾼(v132 마지막) — 딜러 단위 청구 안전하게 ══
# 2. 같은 이름 딜러 · 딜러 없는 차를 상사마다 따로 묶어요 (이름이 겹칠 때만 «이름 (상사)»로 보여요. 서버로 가는 이름은 딜러 이름 그대로 — b.who)
rep('''  var g={};
  rows.forEach(function(r){
    var name=(B.unit==="company")?(r.company||"(상사명 없음)"):(r.dealer||"(딜러 없음)");
    if(!g[name])g[name]={name:name,month:mk,unit:B.unit,recs:[],cars:0,amount:0,works:{},company:r.company||""};
    var G=g[name];G.recs.push(r);G.cars++;G.amount+=r.total||0;
    (r.works||[]).forEach(function(w){G.works[w.name]=(G.works[w.name]||0)+1;});
  });''', '''  var g={},seen={};
  rows.forEach(function(r){
    var who=(B.unit==="company")?(r.company||"(상사명 없음)"):(String(r.dealer||"").trim()||"(딜러 없음)");
    var gk=(B.unit==="company")?who:(who+"\\u0001"+(r.company||""));   /* v132: 딜러 = 딜러 + 소속 상사 */
    if(!g[gk]){g[gk]={name:who,who:who,month:mk,unit:B.unit,recs:[],cars:0,amount:0,works:{},company:r.company||""};seen[who]=(seen[who]||0)+1;}
    var G=g[gk];G.recs.push(r);G.cars++;G.amount+=r.total||0;
    (r.works||[]).forEach(function(w){G.works[w.name]=(G.works[w.name]||0)+1;});
  });
  Object.keys(g).forEach(function(k){var G=g[k];if(B.unit!=="company"&&seen[G.who]>1)G.name=G.who+" ("+(G.company||"상사 없음")+")";});''')
rep('''    G.phone=billPhoneFor(B.unit,G.name,G.recs);''', '''    G.phone=billPhoneFor(B.unit,G.who,G.recs,G.company);''')
rep('''function billPhoneFor(kind,name,recs){
  if(kind==="company"){
    var c=S.comps.filter(function(x){return x.name===name;})[0];
    if(c&&(c.managerPhone||c.mainPhone))return c.managerPhone||c.mainPhone;
  }else{
    var d=S.dealers.filter(function(x){return x.name===name;})[0];''', '''function billPhoneFor(kind,name,recs,comp){
  if(kind==="company"){
    var c=S.comps.filter(function(x){return x.name===name;})[0];
    if(c&&(c.managerPhone||c.mainPhone))return c.managerPhone||c.mainPhone;
  }else{
    /* v132: 같은 이름이면 그 상사 소속 딜러 먼저 · 차에 적힌 번호가 그다음 */
    var dl=S.dealers.filter(function(x){return x.name===name;});
    var d=dl.filter(function(x){return comp&&x.company===comp;})[0]||(dl.length===1?dl[0]:null);
    if(!d){for(var j=0;j<recs.length;j++)if(recs[j].phone)return recs[j].phone;}''')
rep('''      : S.dealers.filter(function(x){return x.name===G.name;})[0];''', '''      : (S.dealers.filter(function(x){return x.name===G.who&&(!G.company||x.company===G.company);})[0]||S.dealers.filter(function(x){return x.name===G.who;})[0]);''')
rep('''  return {month:b.month,unit:b.unit||B.unit,name:b.name,company:b.company||"",''', '''  return {month:b.month,unit:b.unit||B.unit,name:b.who||b.name,company:b.company||"",''')
rep('''  return {"기간":periodLabel(b.month),"받는곳":b.name,''', '''  return {"기간":periodLabel(b.month),"받는곳":b.who||b.name,''')
rep('''"청구월":periodLabel(b.month),"받는분":b.name,''', '''"청구월":periodLabel(b.month),"받는분":b.who||b.name,''')
# 1. 예전에 상사로 보낸 청구서도 «보냄»으로 — 딜러 화면에서 같은 상사 열쇠도 봐요 (두 번 보내지 않게)
rep('''function billState(name){return (S.bills||{})[billKey(name)]||null;}''', '''function billState(name){
  var bs=S.bills||{},x=bs[billKey(name)];if(x)return x;
  if(B.unit!=="company"){   /* v132: 이 딜러의 상사로 이미 보냈으면 «보냄» */
    var gr=(B.made||[]).filter(function(b){return b.name===name;})[0],mk=B.month||mKey(nowIso());
    if(gr&&gr.company)return bs[mk+"|company|"+gr.company]||bs[mk+"|"+gr.company]||null;
  }
  return null;}''')
rep('''  if(tab==="bill"){var l=[];try{l=(B.made||buildBills()).filter(''', '''  if(tab==="bill"){var l=[];try{if(!B.made)B.made=buildBills();l=B.made.filter(''')
# 홈 «청구서 아직 안 보냄» — 딜러 기준 (딜러 열쇠 · 상사 열쇠 어느 쪽이든 있으면 보냄)
rep('''  var billComps={};billRows.forEach(function(r){billComps[r.company||"(상사명 없음)"]=1;});
  var notBilled=Object.keys(billComps).filter(function(c){
    return !(S.bills||{})[billM+"|company|"+c]&&!(S.bills||{})[billM+"|"+c];});''', '''  var billComps={};billRows.forEach(function(r){var dn=String(r.dealer||"").trim()||"(딜러 없음)",cn=r.company||"";billComps[dn+"\\u0001"+cn]={d:dn,c:cn};});
  var bsH=S.bills||{};
  var notBilled=Object.keys(billComps).filter(function(k){var x=billComps[k];   /* v132: 딜러 단위 청구 */
    return !bsH[billM+"|dealer|"+x.d]&&!bsH[billM+"|dealer|"+x.d+" ("+(x.c||"상사 없음")+")"]&&!bsH[billM+"|company|"+(x.c||"(상사명 없음)")]&&!bsH[billM+"|"+(x.c||"(상사명 없음)")];})
    .map(function(k){return billComps[k].d;});''')
# 3 · 4. 글 — 받을 금액 띠 · 단위(명/곳)
rep('''— 상사를 눌러 입금 완료를 해요"};''', '''— 딜러 줄의 [입금 확인]을 눌러요"};''')
rep('''  $("bmSelCnt").textContent=(t.all?"전체 ":"고른 곳 ")+n+"곳";''', '''  var U=(B.unit==="company")?"곳":"명";
  $("bmSelCnt").textContent=(t.all?"전체 ":(U==="명"?"고른 딜러 ":"고른 곳 "))+n+U;''')
rep('''  $("bmSelSkip").textContent=t.skip?("번호 없음 · 0원 "+t.skip+"곳은 빠져요"):"";
  $("bmSend").textContent=n?("③ "+n+"곳에 청구서 보내기"):"③ 청구서 보내기";''', '''  $("bmSelSkip").textContent=t.skip?("번호 없음 · 0원 "+t.skip+U+"은 빠져요"):"";
  $("bmSend").textContent=n?("③ "+n+U+"에게 청구서 보내기").replace("곳에게","곳에"):"③ 청구서 보내기";''')
rep('''textContent:"외 "+(n-5)+"곳"}));''', '''textContent:"외 "+(n-5)+(B.unit==="company"?"곳":"명")}));''')
rep('''textContent:"번호가 없거나 0원인 "+t.skip+"곳은 보내지 않아요"}));''', '''textContent:"번호가 없거나 0원인 "+t.skip+(B.unit==="company"?"곳은":"명은")+" 보내지 않아요"}));''')
rep('''id="blSend" style="flex:2">이 곳에 보내기</button>''', '''id="blSend" style="flex:2">'+(B.unit==="company"?"이 상사에 보내기":"이 딜러에게 보내기")+'</button>''')
rep('''"\\n받는 곳 · "+wWho(targets.map(function(b){return b.name;}))+"\\n"+(tt.all?"전체 ":"고른 곳 ")+targets.length+"곳 · 합계 "''',
    '''"\\n받는 "+(B.unit==="company"?"곳":"딜러")+" · "+wWho(targets.map(function(b){return b.name;}),B.unit==="company"?"곳":"명")+"\\n"+(tt.all?"전체 ":"고른 ")+targets.length+(B.unit==="company"?"곳":"명")+" · 합계 "''')
rep('''function wWho(names){''', '''function wWho(names,unit){''')
rep('''(u.length>3?" 외 "+(u.length-3)+"곳":"")''', '''(u.length>3?" 외 "+(u.length-3)+(unit||"곳"):"")''')

# ══ 검사 일꾼(v132 청구 재확인) — 보냄 열쇠 = 딜러 + 상사 · 이름 겹치는 딜러는 서버 고침 전까지 보내기 막음 ══
rep('''    if(!g[gk]){g[gk]={name:who,who:who,''', '''    if(!g[gk]){g[gk]={name:who,who:who,dup:false,''')
rep('''if(B.unit!=="company"&&seen[G.who]>1)G.name=G.who+" ("+(G.company||"상사 없음")+")";});''',
    '''if(B.unit!=="company"&&seen[G.who]>1){G.dup=true;G.name=G.who+" ("+(G.company||"상사 없음")+")";}});''')
rep('''function billKey(name){return (B.month||mKey(nowIso()))+"|"+B.unit+"|"+name;}''', '''/* v132: 딜러 단위 «보냄» 열쇠 = 달|dealer|딜러|상사 (같은 이름 딜러가 생겨도 안 바뀌어요). 옛 열쇠 달|dealer|딜러 는 이름이 하나뿐일 때만 «보냄» */
function wBillGroup(name){return (B.made||[]).filter(function(b){return b.name===name;})[0]||null;}
function billKey(name){var mk=B.month||mKey(nowIso()),g=(B.unit!=="company")?wBillGroup(name):null;
  if(g&&g.who)return mk+"|dealer|"+g.who+"|"+(g.company||"");
  return mk+"|"+B.unit+"|"+name;}
function wSent(mk,who,comp,uniq){var bs=S.bills||{},cn=comp||"(상사명 없음)";
  return bs[mk+"|dealer|"+who+"|"+(comp||"")]||(uniq&&bs[mk+"|dealer|"+who])||bs[mk+"|company|"+cn]||bs[mk+"|"+cn]||null;}
function wOwnSent(b){var bs=S.bills||{},mk=b.month||B.month||mKey(nowIso());   /* 딜러 열쇠로 보낸 것(지울 수 있는 것) */
  return bs[billKey(b.name)]||(!b.dup&&b.who&&bs[mk+"|dealer|"+b.who])||null;}''')
rep('''function billState(name){
  var bs=S.bills||{},x=bs[billKey(name)];if(x)return x;
  if(B.unit!=="company"){   /* v132: 이 딜러의 상사로 이미 보냈으면 «보냄» */
    var gr=(B.made||[]).filter(function(b){return b.name===name;})[0],mk=B.month||mKey(nowIso());
    if(gr&&gr.company)return bs[mk+"|company|"+gr.company]||bs[mk+"|"+gr.company]||null;
  }
  return null;}''', '''function billState(name){
  var bs=S.bills||{};
  if(B.unit==="company")return bs[billKey(name)]||null;
  var g=wBillGroup(name);if(!g)return bs[billKey(name)]||null;
  return wSent(B.month||mKey(nowIso()),g.who,g.company,!g.dup);}   /* v132: 딜러 열쇠 · (이름 하나면) 옛 열쇠 · 이 딜러의 상사로 보낸 것 */''')
# 홈 — 같은 함수로
rep('''  var notBilled=Object.keys(billComps).filter(function(k){var x=billComps[k];   /* v132: 딜러 단위 청구 */
    return !bsH[billM+"|dealer|"+x.d]&&!bsH[billM+"|dealer|"+x.d+" ("+(x.c||"상사 없음")+")"]&&!bsH[billM+"|company|"+(x.c||"(상사명 없음)")]&&!bsH[billM+"|"+(x.c||"(상사명 없음)")];})''',
    '''  var cntH={};Object.keys(billComps).forEach(function(k){var d=billComps[k].d;cntH[d]=(cntH[d]||0)+1;});
  var notBilled=Object.keys(billComps).filter(function(k){var x=billComps[k];   /* v132: 딜러 단위 청구 — 청구서 화면과 같은 wSent */
    return !wSent(billM,x.d,x.c,cntH[x.d]===1);})''')
# 보냄 지우기 — 딜러 열쇠(새 · 옛)는 지우고, 상사로 보낸 것은 안내
rep('''  var picks=(B.made||[]).filter(function(x){return ids.indexOf(x.name)>=0&&billState(x.name);});
  if(!picks.length)return toast("보냄 표시가 있는 곳이 없어요",true);
  ask(picks.length+"건의 '보냄' 표시를 지울까요?\\n(자료는 그대로 두고 표시만 지워요)",function(){
    Promise.all(picks.map(function(b){return markBilled(b,false);}))''', '''  var picks0=(B.made||[]).filter(function(x){return ids.indexOf(x.name)>=0&&billState(x.name);});
  var picks=(B.unit==="company")?picks0:picks0.filter(function(x){return wOwnSent(x);}),viaComp=picks0.length-picks.length;
  if(!picks.length)return toast(viaComp?"상사로 보낸 기록이에요 — 위 칸을 «매매상사로 묶어 보기»로 바꾸고 지워요":"보냄 표시가 있는 곳이 없어요",true);
  ask(picks.length+"건의 '보냄' 표시를 지울까요?\\n(자료는 그대로 두고 표시만 지워요)"+(viaComp?"\\n\\n상사로 보낸 "+viaComp+"건은 «매매상사로 묶어 보기»에서 지워요.":""),function(){
    Promise.all(picks.map(function(b){
      if(B.unit!=="company"&&!b.dup&&b.who){var lk=(b.month||B.month)+"|dealer|"+b.who;if((S.bills||{})[lk]){S.bills=Object.assign({},S.bills);delete S.bills[lk];if(S.db)S.db.collection("bills").doc(lk).delete();}}
      return markBilled(b,false);}))''')
# 1. 이름이 같은 딜러 — 서버 보기 주소가 상사를 아직 안 봐서(서버 방 요청) 보내기 · 예약을 막아요. 인쇄 · 그림 · 엑셀은 돼요
rep('''function sendOneBill(b,sched){
  if(b.amount<=0)''', '''function sendOneBill(b,sched){
  if(b.dup&&B.unit!=="company"){toast(b.name+" — 다른 상사에 같은 이름 딜러가 있어 지금은 보낼 수 없어요. 딜러 이름을 «박딜러B»처럼 바꾸거나 인쇄 · 그림으로 보내 주세요",true);return Promise.reject({message:"같은 이름 딜러"});}
  if(b.amount<=0)''')
rep('''      (tt.skip?("\\n번호 없음 · 0원 "+tt.skip+"곳은 빠져요."):"")+
      (already.length?("\\n\\n이미 보낸 곳 "+already.length+"건이 포함돼 있어요."):""),''', '''      (tt.skip?("\\n번호 없음 · 0원 "+tt.skip+(B.unit==="company"?"곳은":"명은")+" 빠져요."):"")+
      (targets.some(function(b){return b.dup;})?("\\n이름이 같은 딜러 "+targets.filter(function(b){return b.dup;}).length+"명은 보내지 않아요(이름을 바꾸면 보낼 수 있어요)."):"")+
      (already.length?("\\n\\n이미 보낸 "+(B.unit==="company"?"곳 ":"딜러 ")+already.length+(B.unit==="company"?"곳":"명")+"이 포함돼 있어요."):""),''')
# 6. 전월 비교 — 딜러 이름(빈칸 지움) + 상사로
rep('''    var nm=(B.unit==="company")?(r.company||"(상사명 없음)"):(r.dealer||"(딜러 없음)");
    return nm===b.name&&(r.month||mKey(r.createdAt))===pm;})''', '''    if(B.unit!=="company")return (String(r.dealer||"").trim()||"(딜러 없음)")===(b.who||b.name)&&(r.company||"")===(b.company||"")&&(r.month||mKey(r.createdAt))===pm;
    var nm=r.company||"(상사명 없음)";
    return nm===b.name&&(r.month||mKey(r.createdAt))===pm;})''')
# 7. 문자 글도 딜러 이름 그대로
rep('''  ["[받는 분]",function(b){return b.name;}],''', '''  ["[받는 분]",function(b){return b.who||b.name;}],''')
rep('''    .replace(/\\{받는분\\}/g,b.name).replace(/\\{기간\\}/g,periodLabel(b.month))''', '''    .replace(/\\{받는분\\}/g,b.who||b.name).replace(/\\{기간\\}/g,periodLabel(b.month))''')
# 몇 건 보냈는지 — 실제로 보낸 수만 · 보낸 뒤 할 일 띠도 새로
rep('''      var i=0;
      (function next(){
        if(i>=targets.length){toast(targets.length+"건에 보냈어요");renderBill();return;}
        var b=targets[i++];
        sendOneBill(b).then(next,next);''', '''      var i=0,okN=0;
      (function next(){
        if(i>=targets.length){toast(okN+"건에 보냈어요"+(okN<targets.length?" · "+(targets.length-okN)+"건은 못 보냈어요":""),okN<targets.length);renderBill();return;}
        var b=targets[i++];
        sendOneBill(b).then(function(){okN++;next();},next);''')
# 화면을 다시 그리면 할 일 띠 · 뼈대도 같이 (jPage 는 render 때만 불려서)
rep('''/* ══════════════ v132 — 일 화면 뼈대''', '''/* 화면만 다시 그릴 때(보내기 · 달 바꾸기 뒤)도 할 일 띠를 새로 — 이 스크립트 안 이름이라 하나씩 감싸요 */
function wAfter(f){return function(){var r=f.apply(this,arguments);try{if(S.mode==="pc")jPage();}catch(e){}return r;};}
renderBill=wAfter(renderBill);renderLedger=wAfter(renderLedger);renderMoney=wAfter(renderMoney);
renderTax=wAfter(renderTax);renderOutLog=wAfter(renderOutLog);renderMat=wAfter(renderMat);
/* ══════════════ v132 — 일 화면 뼈대''')
