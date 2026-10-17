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
# 폰 아래 탭 (PC 화면) — 홈 · 일감 · 월별 청구서 · 입·출금 내역 · 전체
rep('''  var items=M.tabs.filter(function(t){return t.key==="__all"||has(t.key);}).map(function(t){var x={key:t.key,icon:t.icon,label:t.label};if(t.key==="delivery")x.badge=wDelivBad();return x;});''',
    '''  var W132_TABS=[{key:"home",icon:"home",label:"홈"},{key:"ledger",icon:"car",label:"일감"},{key:"bill",icon:"file",label:"월별 청구서"},{key:"money",icon:"wallet",label:"입·출금 내역"},{key:"__all",icon:"more",label:"전체"}];
  var items=W132_TABS.filter(function(t){return t.key==="__all"||has(t.key);}).map(function(t){return {key:t.key,icon:t.icon,label:t.label};});''')
# 메뉴 줄 오른쪽 끝 — 기능 찾기 (대표님 ①)
rep('''function wNav(){
  try{CGG.nav($("tabs"),wGroups(),wCur(),goKey);}catch(e){}''', '''function wNav(){
  try{CGG.nav($("tabs"),wGroups(),wCur(),goKey);}catch(e){}
  try{var ob=$("wNavFind");if(ob)ob.remove();
    if(S.mode==="pc"&&CGG.find){var fb=document.createElement("div");fb.id="wNavFind";fb.className="w-navfind";$("tabs").appendChild(fb);
      CGG.find(fb,wFeats(),goFeat,{phone:function(){wAllMenu(true);}});}}catch(e){}''')

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
    return {count:l.length,text:"아직 안 보낸 청구서 "+l.length+"곳 · "+won(l.reduce(function(t,x){return t+(x.amount||0);},0)),
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
    return {count:m,tone:"stop",text:"부족한 자재 "+m+"가지 — 도매상에 주문하세요",onGo:function(){var b=$("matOrder");if(b)try{CGG.spot(b);}catch(e){b.scrollIntoView();}}};}
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
/* ── v132 새 규칙 — 메뉴 줄 끝 기능 찾기 · 할 일 띠 자리 · 숫자 칸 가운데 · 도구줄 43/42 ── */
.w-navfind{margin-left:auto;align-self:center;flex:none;width:260px;position:relative;z-index:var(--z-drop)}
.cgg-nav:has(.w-navfind){overflow:visible}
.w-navfind .in{background:var(--surface);border-color:var(--ln2,#D0D5DD);color:var(--muted)}
.w-navfind input{color:var(--text)}
.w-navfind input::placeholder{color:var(--muted)}
.w-navfind .res button{text-align:left;align-items:flex-start}
@media (max-width:1000px){.w-navfind{display:none}}
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
