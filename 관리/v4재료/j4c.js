/* ═══════ 관리 — 머리말 버튼 · 사람 단추 ▾ · 메뉴 배치 · 폰 아래 탭바 (관리 v4.3) ═══════
   메뉴 배치 · 탭바 · 할 일 카드 · 사람 단추 ▾ 는 디자인 방 공통 부품 cgg-j4 1.3 (CGG) 를 써요.
   서버 창구는 하나도 새로 쓰지 않아요. 화면 이동(TAB · render)과 기존 단추(btnOut · btnReload)만 써요. */
CGG.layout.init($("app"), "cgg_admin_layout");   /* 저장 이름은 v4.0 그대로 — 고른 배치가 유지돼요 */
function jgo(t){ TAB=t; CGG.closeMenu(); window.scrollTo(0,0); render(); }

/* 사람 단추 ▾ — 마이페이지 · 화면 설정 · 로그아웃 (관리에는 요금제 · 휴지통이 없어 넣지 않음) */
var WHO = {name:"", role:"본사 관리자"};
CGG.menu($("hWho"), WHO, function(){ return [
  {key:"me",icon:"user",label:"마이페이지"}, "-",
  {key:"lay",icon:"pc",label:"화면 설정",note:CGG.layout.name()}, "-",
  {key:"out",icon:"out",label:"로그아웃"}]; },
  function(k){ if(k==="me") jgo("me"); else if(k==="lay") laySheet(); else if(k==="out") $("btnOut").click(); });
document.addEventListener("keydown",function(e){ if(e.key==="Escape"){ closeSheet(); closeAsk(); } });

/* 화면 설정 — 메뉴 배치 셋 (넓은 화면에서만 바뀌고, 폰은 늘 같은 모양) */
function laySheet(){
  openSheet('<h3 style="margin:0 0 4px">화면 설정</h3>'+
    '<div class="hint" style="margin:0 0 14px">메뉴 자리를 고르세요. 이 기기에만 저장돼요. 폰에서는 늘 아래 탭바로 보여요.</div>'+
    '<div id="layBox"></div>');
  CGG.layout.chooser($("layBox"), function(){ closeSheet(); render(); toast("메뉴 배치를 바꿨어요"); });
}

/* 머리말 버튼 — 공지사항 · 도움말 · 링크 복사 (새로고침 · 로그아웃은 원래 단추 그대로) */
$("btnNotice").onclick=function(){ jgo("noti"); };
$("btnLink").onclick=function(){
  var u=location.href.split("#")[0];
  function done(){ toast("링크를 복사했어요"); }
  try{ navigator.clipboard.writeText(u).then(done,function(){ prompt0(u); }); }catch(e){ prompt0(u); }
  function prompt0(x){ openSheet('<h3 style="margin:0 0 8px">링크 복사</h3><div class="hint" style="margin:0 0 10px">아래 주소를 길게 눌러 복사해 주세요.</div><input type="text" readonly value="'+esc(x)+'" onfocus="this.select()">'); }
};
$("btnHelp").onclick=function(){
  openSheet('<h3 style="margin:0 0 4px">도움말</h3><div class="hint" style="margin:0 0 12px">메뉴마다 하는 일이에요. 누르면 그 화면으로 가요.</div>'+
    '<div class="j-allm">'+NAV.map(function(n){
      return '<div><h4>'+esc(n[1])+'</h4><div class="row">'+n[2].map(function(t){
        return '<button type="button" data-go2="'+t+'">'+esc(tabLabel(t))+'</button>'; }).join("")+'</div><div class="hint" style="margin-top:4px">'+esc(NAVHELP[n[0]]||"")+'</div></div>'; }).join("")+'</div>');
  Array.prototype.forEach.call($("sheet").querySelectorAll("[data-go2]"),function(b){
    b.onclick=function(){ closeSheet(); jgo(b.getAttribute("data-go2")); }; });
};
var NAVHELP={ sum:"오늘 할 일 · 이번 달 숫자 · 일정 달력 · 운영 상태를 한눈에 봐요.",
  users:"가입 코드를 보내고, 업체 사람들의 로그인 계정을 관리하고, 번호 하나로 모든 제품 계정을 찾아요.",
  shops:"업체별 요금제 · 이용 기한 · 상태를 보고, 결제가 밀린 곳을 잠그거나 풀어요. 홈페이지에서 가입만 하고 결제를 안 한 곳(결제 대기)과 누구나 가입 스위치도 여기 있어요.",
  pays:"요금제 · 모든 제품 결제 내역 · 충전 · 카드 결제(환불 · 자동 결제) · 체크 지갑 잇기 — 업체에서 본사로 들어오는 금액이에요.",
  settle:"정산 · 유지비 — 본사가 내보내는 금액이에요.",
  tax:"세금계산서를 발행하고 확인해요.",
  noti:"기한 안내 문자 · 공지사항 · 알림톡 템플릿 코드예요. 안내는 알림톡이 먼저 나가요.",
  settings:"보안 점검과 내 계정이에요." };

/* 폰 아래 탭바 5칸 — 홈 · 업체 · 받는 금액 · 계산서 · 전체 */
function tbarDraw(){
  var g=navOf(TAB), k=g?g[0]:"";
  CGG.tabbar($("jTbar"), [{key:"sum",icon:"home",label:"홈"},{key:"shops",icon:"shop",label:"업체"},{key:"pays",icon:"wallet",label:"받는 금액"},
                          {key:"tax",icon:"receipt",label:"계산서"},{key:"all",icon:"more",label:"전체"}],
    ["sum","shops","pays","tax"].indexOf(k)<0?"all":k,
    function(t){ if(t==="all") allSheet(); else { var n=NAV.filter(function(z){return z[0]===t;})[0]; jgo(n?n[2][0]:t); } });
}
function allSheet(){
  openSheet('<h3 style="margin:0 0 12px">전체 메뉴</h3><div class="j-allm">'+NAV.map(function(n){
    return '<div><h4>'+esc(n[1])+'</h4><div class="row">'+n[2].map(function(t){
      return '<button type="button" data-go2="'+t+'" class="'+(t===TAB?"on":"")+'">'+esc(tabLabel(t))+'</button>'; }).join("")+'</div></div>'; }).join("")+
    '<div><h4>내 정보</h4><div class="row"><button type="button" data-go3="lay">화면 설정</button><button type="button" data-go3="out">로그아웃</button></div></div></div>');
  Array.prototype.forEach.call($("sheet").querySelectorAll("[data-go2]"),function(b){
    b.onclick=function(){ closeSheet(); jgo(b.getAttribute("data-go2")); }; });
  Array.prototype.forEach.call($("sheet").querySelectorAll("[data-go3]"),function(b){
    b.onclick=function(){ closeSheet(); if(b.getAttribute("data-go3")==="lay") laySheet(); else $("btnOut").click(); }; });
}

/* ② 화면 머리 — 공통 부품 1.3 의 모양(.cgg-head > .hello + .acts)으로 맞춰요.
   화면마다 만든 제목 · 설명 · 버튼을 «옮기기만» 해서 id 와 누르면 하는 일은 그대로예요. 화면이 다시 그려져도 늘 붙어요. */
function addCrumb(){
  var dh=$("main").querySelector(".dashhead"); if(!dh || dh.classList.contains("cgg-head")) return;
  var g=navOf(TAB), kids=Array.prototype.slice.call(dh.children);
  var hello=document.createElement("div"); hello.className="hello";
  var acts=document.createElement("div"); acts.className="acts";
  if(!dh.querySelector(":scope > .jcrumb") && g)
    hello.insertAdjacentHTML("beforeend",'<small class="jcrumb">'+esc(g[1])+(g[1]===tabLabel(TAB)?"":" › "+esc(tabLabel(TAB)))+'</small>');
  kids.forEach(function(c){ (c.tagName==="BUTTON"||c.classList.contains("btns")?acts:hello).appendChild(c); });
  dh.classList.add("cgg-head"); dh.appendChild(hello); if(acts.children.length) dh.appendChild(acts);
}
try{ new MutationObserver(addCrumb).observe($("main"),{childList:true}); }catch(e){}
