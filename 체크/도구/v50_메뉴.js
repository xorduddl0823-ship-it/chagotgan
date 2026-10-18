/* v50 통합(대표님 시안 확인 10/18): 돈 도는 차례 — 홈 → 정산 기록 → 매출 → 월별 청구서 → 입·출금 내역 → 세금계산서 → (체크 전용: 배달 · 재검사 알림) → 설정
   메뉴 · 기능 찾기 · 폰 아래 탭 · 전체 메뉴는 공통 부품 cgg-j4 1.9 (CGG.nav · CGG.find · CGG.tabbar · CGG.allMenu) */
var JOBS=[["home","홈"],["history","정산 기록"],["sales","매출"],["bill","월별 청구서"],
  ["deposit","입·출금 내역"],["hometax","세금계산서"],["deliv","배달"],["remind","재검사 알림"],["set","설정"]];
/* 설정 안 — 자료 올리기는 «매출» 안으로, 휴지통은 마이페이지 안으로, 도움말은 머리말로 옮겼습니다 (「가」안)
   v50: «직원 계정 · 권한»을 «설정 백업»에서 꺼내 따로 칸으로 */
var SETS=[["partner","거래처"],["staff","직원 계정 · 권한"],["price","단가표"],["fee","검사자 수수료"],
  ["popbill","팝빌 연동"],["sms","문자 자동수집"],
  ["alarm","알람 소리"],["backup","설정 백업"]];
var SETLBL={partner:"거래처 · 계정",price:"정산 기준",popbill:"연결",alarm:"이 화면"};
var SALESUB=[["sales","매출 내역"],["files","자료 올리기"]];
/* 큰 메뉴 아이콘 (공통 부품 CGG.ic 이름) */
var JOBIC={home:"home",history:"today",sales:"chart",bill:"file",deposit:"wallet",hometax:"receipt",deliv:"truck",remind:"bell",set:"gear"};
function cggIc(n){ return (window.CGG&&CGG.ic)?CGG.ic(n):""; }
/* v25: 홈 옛 「오늘 할 일」 칸은 그리지 않음 (할 일 계산만 하고 버림) */
function cggNoCard(){ return ""; }
/* 폰 아래 탭바 5칸 — 홈 · 정산 기록 · 월별 청구서 · 입·출금 · 전체 (시안 v50) */
function cggTabbar(grp){
  if(!window.CGG) return;
  var main=["home","history","bill","deposit"];
  CGG.tabbar($("cggTbar"),[{key:"home",icon:"home",label:"홈"},{key:"history",icon:"today",label:"정산 기록"},
    {key:"bill",icon:"file",label:"월별 청구서"},{key:"deposit",icon:"wallet",label:"입·출금"},{key:"all",icon:"more",label:"전체"}],
    main.indexOf(grp)>=0?grp:"all", function(k){ if(k==="all"){ if(!CGG.closeSheet()) cggAllMenu(); } else { CGG.closeSheet(); go(k); } });
}
/* 「전체」 — 공통 전체 메뉴 판(맨 위 기능 찾기 + 모든 메뉴) */
function cggAllMenu(focus){
  try{ CGG.allMenu(chkGroups(), chkCur(), chkPick, chkFeats(), chkGoFeat, {focus:!!focus}); }catch(e){}
}
/* 보험료 미납 대조는 «입·출금 내역» 안쪽 작은 탭으로 들어갑니다 */
var DEPSUB=[["deposit","입금 내역"],["unpaid","보험료 대조"]];
/* 월별 청구서 + 청구서 발송은 «월별 청구서» 하나로 묶고 안쪽 탭으로 나눕니다 */
var BILLSUB=[["bill","월별 청구서"],["billgrp","청구처 묶음"],["billtpl","알림톡 템플릿"]];
function subBar(list, now){
  return '<div id="subTabs">'+list.map(function(s){
    return '<button data-go="'+s[0]+'" aria-selected="'+(now===s[0]?"true":"false")+'">'+s[1]+'</button>';
  }).join("")+'</div>';
}
/* 작은 탭은 이제 머리말 아래 한 곳(#setSub)에서만 그립니다 — 화면 안에서는 그리지 않음 */
function subTabs(now){ return ""; }
function billTabs(now){ return ""; }
/* 큰 메뉴 하나 → 그 안의 작은 탭 (v50: 배달 · 재검사 알림은 큰 메뉴 둘로) */
function groupOf(p){
  if(SALESUB.some(function(x){return x[0]===p;})) return ["sales",SALESUB];
  if(BILLSUB.some(function(x){return x[0]===p;})) return ["bill",BILLSUB];
  if(DEPSUB.some(function(x){return x[0]===p;})) return ["deposit",DEPSUB];
  if(typeof DELIVSUB!=="undefined" && DELIVSUB.some(function(x){return x[0]===p;})) return ["deliv",DELIVSUB];
  if(SETS.some(function(x){return x[0]===p;})) return ["set",SETS];
  return [p,null];
}
var page="home";
/* 공통 메뉴 묶음 — {key, label, icon, subs:[{key,label}]} · 지금 위치 열쇠 = "묶음/화면" */
function chkGroups(){
  return JOBS.map(function(t){ var G=groupOf(t[0]==="set"?SETS[0][0]:t[0])[1];
    var g={key:t[0], label:t[1], icon:JOBIC[t[0]]};
    if(G) g.subs=G.map(function(s){ return {key:s[0], label:s[1]}; });
    return g; });
}
function chkCur(){ var G=groupOf(page); return G[1]?G[0]+"/"+page:G[0]; }
function chkPick(k){ try{ CGG.closeSheet(); }catch(e){} var p=String(k||"home").split("/"); go(p[1]||p[0]); }
/* 기능 찾기 · 전체 메뉴 목록 (go = "묶음/화면", words = 사람들이 칠 만한 쉬운 말) */
function chkFeats(){
  return [
    {id:"home",label:"홈 (달력 · 할 일)",path:"홈",go:"home",words:"처음 첫 화면 달력 일정 오늘 할 일"},
    {id:"history",label:"정산 기록",path:"정산 기록",go:"history",words:"검사 기록 차량 목록 월별 기록 지난 청구"},
    {id:"sales",label:"매출 보기",path:"매출 › 매출 내역",go:"sales/sales",words:"매출 실적 월별 연 합계 검사 대수 얼마 벌었"},
    {id:"files",label:"접수리스트 엑셀 올리기",path:"매출 › 자료 올리기",go:"sales/files",words:"엑셀 올리기 업로드 접수리스트 자료 파일"},
    {id:"bill-make",label:"청구서 만들기",path:"월별 청구서",go:"bill/bill",words:"청구서 정산서 청구 만들기 명세 딜러"},
    {id:"bill-send",label:"청구서 보내기 (알림톡)",path:"월별 청구서 › 2. 청구서 보내기",go:"bill/bill",words:"청구서 발송 알림톡 문자 보내기 시험 입금 기한"},
    {id:"bill-print",label:"청구서 인쇄 · 그림 · 엑셀",path:"월별 청구서 › 표 위 단추",go:"bill/bill",words:"인쇄 출력 그림 jpg png 엑셀 내려받기 다운로드"},
    {id:"billgrp",label:"청구처 묶음 (받는 곳 합치기)",path:"월별 청구서 › 청구처 묶음",go:"bill/billgrp",words:"청구처 묶음 받는 곳 합치기 대표 딜러 청구서 받는 사람"},
    {id:"billtpl",label:"알림톡 템플릿",path:"월별 청구서 › 알림톡 템플릿",go:"bill/billtpl",words:"알림톡 문구 템플릿 카카오 메시지"},
    {id:"deposit",label:"입금 내역 · 청구서와 맞추기",path:"입·출금 내역 › 입금 내역",go:"deposit/deposit",words:"입금 출금 통장 수금 맞추기 되돌리기 팝빌 계좌 입출금"},
    {id:"dep-xls",label:"은행 거래내역 엑셀 가져오기",path:"입·출금 내역 › 입금 내역 › 아래쪽",go:"deposit/deposit",words:"은행 엑셀 거래내역 인터넷뱅킹 가져오기"},
    {id:"unpaid",label:"보험료 대조",path:"입·출금 내역 › 보험료 대조",go:"deposit/unpaid",words:"보험료 성능보증보험 미납 상사 대조"},
    {id:"hometax",label:"세금계산서 발행",path:"세금계산서",go:"hometax",words:"세금계산서 계산서 홈택스 발행 국세청 팝빌 부가세"},
    {id:"deliv",label:"차량 배달 기록",path:"배달 › 배달 기록",go:"deliv/deliv",words:"배달 탁송 기사 배달 기록 알림"},
    {id:"delivplace",label:"목적지 추가",path:"배달 › 목적지 관리",go:"deliv/delivplace",words:"목적지 배달 도착지 추가"},
    {id:"delivdriver",label:"기사 계정 · 기사 화면 주소",path:"배달 › 기사 계정",go:"deliv/delivdriver",words:"기사 추가 기사 계정 기사 화면 주소 비밀번호"},
    {id:"remind",label:"재검사 알림",path:"재검사 알림",go:"remind",words:"재검사 재검 알림 다시 검사"},
    {id:"partner",label:"딜러 · 상사 추가",path:"설정 › 거래처",go:"set/partner",words:"거래처 딜러 상사 추가 명함 사업자등록증 세금계산서 정보"},
    {id:"office",label:"우리 사업장 · 계좌",path:"설정 › 거래처 › 아래쪽",go:"set/partner",words:"공급자 사업자 상호 대표 계좌 입금 계좌 우리 검사소"},
    {id:"staff",label:"직원 계정 · 권한",path:"설정 › 직원 계정 · 권한",go:"set/staff",words:"직원 계정 권한 추가 비밀번호 초기화 대표"},
    {id:"price",label:"단가표 고치기",path:"설정 › 단가표",go:"set/price",words:"단가 검사비 가격 요금 구간"},
    {id:"fee",label:"검사자 수수료",path:"설정 › 검사자 수수료",go:"set/fee",words:"수수료 검사자"},
    {id:"popbill",label:"팝빌 연동",path:"설정 › 팝빌 연동",go:"set/popbill",words:"팝빌 연동 계좌 조회 세금계산서 연결"},
    {id:"sms",label:"문자 자동수집",path:"설정 › 문자 자동수집",go:"set/sms",words:"문자 수집 입금 문자"},
    {id:"alarm",label:"알람 소리",path:"설정 › 알람 소리",go:"set/alarm",words:"알람 소리 알림음"},
    {id:"backup",label:"설정 백업",path:"설정 › 설정 백업",go:"set/backup",words:"백업 연결 서버"},
    {id:"me",label:"마이페이지 · 요금제",path:"사람 단추 ▾ › 마이페이지",go:"me/me",words:"내 정보 요금제 결제 사용량 비밀번호"},
    {id:"trash",label:"휴지통",path:"사람 단추 ▾ › 휴지통",go:"me/trash",words:"휴지통 지운 것 되돌리기 복구 삭제"},
    {id:"help",label:"도움말 (기능 설명서)",path:"머리말 › 도움말",go:"help",words:"도움말 설명서 사용법 모르겠 어떻게"}
  ];
}
function chkGoFeat(f){
  var g=String((f&&f.go)||"home");
  try{ CGG.closeSheet(); }catch(e){}
  if(g==="me/me"){ if(typeof chkMyPage==="function") chkMyPage(); return; }
  if(g==="me/trash"){ go("trash"); return; }
  chkPick(g);
  if(f&&f.id==="bill-send") setTimeout(function(){ var c=$("bsSend"); if(c&&CGG.spot) CGG.spot(c.closest(".card")||c); },300);
  if(f&&f.id==="dep-xls") setTimeout(function(){ var c=$("depXlsFold"); if(c){ c.open=true; if(CGG.spot) CGG.spot(c); } },300);
}

function drawTabs(){
  var G=groupOf(page);
  try{ CGG.nav($("cggNav"), chkGroups(), chkCur(), chkPick, {find:{feats:chkFeats(), onGo:chkGoFeat}}); }catch(e){}
  var subs=G[1];
  /* 작은 탭(#cggSub)은 폰에서만 — 넓은 화면은 공통 메뉴 밑 줄(가로) · 왼쪽 펼침(세로)에 같은 칸이 보여요 */
  $("cggSub").hidden=!subs;
  cggTabbar(G[0]);
  if(subs) $("cggSub").innerHTML=subs.map(function(s){
    return (G[0]==="set" && SETLBL[s[0]] ? '<span class="cgg-sublbl">'+SETLBL[s[0]]+'</span>' : '')+'<button role="tab" aria-selected="'+(page===s[0]?"true":"false")+'" data-go="'+s[0]+'">'+s[1]+'</button>';
  }).join("");
  Array.prototype.forEach.call($("cggSub").querySelectorAll("[data-go]"),function(b){
    b.onclick=function(){ go(b.getAttribute("data-go")); };
  });
  try{ chkHdr(); }catch(e){}
}
/* ═══ v50 머리말 — 공통 부품 CGG.header 가 차례 · 크기를 그려요 (워시 v132 와 같은 방식)
   예전 단추(#hdrOld, 숨김)는 그대로 두고 눌린 것을 넘겨요 — 단추 동작 코드는 바꾸지 않아요 ═══ */
var CHK_H=null, CHK_SIG="", CHK_CONN=null;
function chkMeItems(){
  var owner=(ST&&ST.role)==="owner";
  return [{key:"me",icon:"user",label:"마이페이지",note:"요금제 · 사용량"}]
    .concat(owner?[{key:"plan",icon:"wallet",label:"요금제"}]:[])
    .concat([{key:"trash",icon:"trash",label:"휴지통"},"-",
             {key:"lay",icon:"pc",label:"화면 설정",note:(window.CGG&&CGG.layout)?CGG.layout.name():""},"-",
             {key:"out",icon:"out",label:"로그아웃"}]);
}
function chkMePick(k){
  if(k==="me"){ if(typeof chkMyPage==="function") chkMyPage(); }
  else if(k==="plan"){ try{ window.ccwPlanPay(); }catch(e){ bar("요금제 기능이 아직 준비 중이에요"); } }
  else if(k==="trash") go("trash");
  else if(k==="lay"){ if(typeof cggScreenSet==="function") cggScreenSet(); }
  else if(k==="out") $("btnOut").click();
}
function chkSaved(){ return CHK_CONN===true ? true : (CHK_CONN===false ? "연결 안 됨" : "확인 중"); }
function chkHdr(){
  if(!window.CGG||!CGG.header||!$("hdrTop")) return;
  var off=$("hdOff"), b=off&&off.querySelector("b"), sm=off&&off.querySelector("small");
  var ps=$("pollSel"), opts=ps?Array.prototype.map.call(ps.options,function(o){ return [o.value,o.textContent]; }):[];
  var nm=b?String(b.textContent||"").trim():"", ln=sm?String(sm.textContent||"").replace(/ /g," ").trim():"";
  var who=(ST&&ST.who)||"내 정보";
  var sig=[nm,ln,who,(ST&&ST.role)||"",ps?ps.value:""].join("|");
  if(CHK_H && CHK_SIG===sig && $("hdrTop").firstChild){ chkHdrSync(); return; }
  CHK_SIG=sig;
  CHK_H=CGG.header($("hdrTop"),{product:"체크", sub:"성능점검 정산", ver:"체크 v50", date:"10/18",
    biz:{name:nm||"—", line:ln},
    find:{mode:"nav", feats:chkFeats(), onGo:chkGoFeat},
    notice:function(){ if(window.ccwNotice) window.ccwNotice(); },
    help:function(){ $("btnHelp").click(); },
    link:function(){ $("btnLink").click(); },
    refresh:function(){ $("btnRefresh").click(); },
    auto:ps?{value:ps.value, options:opts, onChange:function(v){ ps.value=v; if(ps.onchange) ps.onchange(); }}:null,
    saved:chkSaved(),
    me:{name:who, role:(ST&&ST.role)==="owner"?"대표":"직원", sub:"마이페이지 · 휴지통", items:chkMeItems, onPick:chkMePick}});
  if(!CHK_H.__obs && window.MutationObserver && $("hdrOld")){
    CHK_H.__obs=1;
    var t=null, mo=new MutationObserver(function(){ clearTimeout(t); t=setTimeout(function(){ try{ chkHdr(); }catch(e){} },30); });
    mo.observe($("hdrOld"),{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["hidden"]});
  }
  chkHdrSync();
}
/* 숨긴 옛 단추에서 바뀐 것(연결 · 공지 빨간 점 · 휴지통 개수)을 새 머리말로 */
function chkHdrSync(){
  if(!CHK_H||!$("hdrTop")) return;
  var top=$("hdrTop");
  try{ CHK_H.saved(CHK_CONN===true?"연결됨":chkSaved()); var se=top.querySelector('[data-hb="saved"]'); if(se) se.classList.toggle("chk-off",CHK_CONN!==true); }catch(e){}
  var nb=top.querySelector('[data-hb="notice"]'), od=document.querySelector("#ccwNotiBtn .ntDot");
  if(nb){ var dt=nb.querySelector(".ntDot");
    if(od){ if(!dt){ dt=document.createElement("i"); dt.className="ntDot"; nb.appendChild(dt); } dt.textContent=od.textContent; dt.title="안 읽은 공지 "+od.textContent+"건"; }
    else if(dt) dt.remove(); }
  try{ if(CHK_H.me) CGG.badge(CHK_H.me, (typeof DCONF!=="undefined"&&DCONF&&DCONF.trashN)||0); }catch(e){}
}
