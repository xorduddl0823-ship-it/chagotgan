/* ═══════ J안 4판 — 머리말 버튼 · 사람 단추 ▾ · 메뉴 배치 셋 · 폰 아래 탭바 (관리 v4.0) ═══════
   서버 창구는 하나도 새로 쓰지 않습니다. 화면 이동(TAB · render)과 기존 단추(btnOut · btnReload)만 씁니다. */
var LAYKEY = "cgg_admin_layout";   /* 이 기기에만 저장 (워시와 같은 식) */
function layGet(){ var v=ls(LAYKEY); return (v==="side"||v==="icon")?v:"top"; }
function laySet(v){
  ls(LAYKEY, v);
  var a=$("app"); a.classList.remove("lay-top","lay-side","lay-icon"); a.classList.add("lay-"+v);
  render();
}
function jgo(t){ TAB=t; closeMe(); window.scrollTo(0,0); render(); }

/* 사람 단추 ▾ — 마이페이지 · 화면 설정 · 로그아웃 (관리에는 요금제 · 휴지통이 없어 넣지 않음) */
function closeMe(){ var d=$("jMe"); if(d) d.hidden=true; $("hWho").setAttribute("aria-expanded","false"); }
function openMe(){
  var d=$("jMe"), b=$("hWho").getBoundingClientRect();
  d.innerHTML=
    '<div class="jdwho"><b>'+esc((D.me&&D.me.name)||"-")+'</b>본사 관리자</div><hr>'+
    '<button type="button" data-m="me">'+ic("user")+'마이페이지</button>'+
    '<button type="button" data-m="lay">'+ic("pc")+'화면 설정<small>'+({top:"가로 메뉴",side:"세로 메뉴",icon:"아이콘 메뉴"})[layGet()]+'</small></button>'+
    '<hr><button type="button" data-m="out">'+ic("out")+'로그아웃</button>';
  d.hidden=false;
  var w=240, left=Math.min(window.innerWidth-w-8, Math.max(8, b.right-w));
  d.style.left=left+"px"; d.style.top=(b.bottom+6)+"px";
  if(b.bottom+6+180>window.innerHeight){ d.style.top=Math.max(8,b.top-6-170)+"px"; }
  $("hWho").setAttribute("aria-expanded","true");
  Array.prototype.forEach.call(d.querySelectorAll("[data-m]"),function(x){
    x.onclick=function(e){ e.stopPropagation(); var m=x.getAttribute("data-m"); closeMe();
      if(m==="me") jgo("me"); else if(m==="lay") laySheet(); else if(m==="out") $("btnOut").click(); }; });
}
$("hWho").onclick=function(e){ e.stopPropagation(); if($("jMe").hidden) openMe(); else closeMe(); };
document.addEventListener("click",function(e){ var d=$("jMe"); if(d && !d.hidden && !d.contains(e.target)) closeMe(); });
document.addEventListener("keydown",function(e){ if(e.key==="Escape"){ closeMe(); closeSheet(); closeAsk(); } });
window.addEventListener("resize",closeMe);

/* 화면 설정 — 메뉴 배치 셋 (넓은 화면에서만 바뀌고, 폰은 늘 같은 모양) */
function laySheet(){
  var cur=layGet();
  openSheet('<h3 style="margin:0 0 4px">화면 설정</h3>'+
    '<div class="hint" style="margin:0 0 14px">메뉴 자리를 고르세요. 이 기기에만 저장돼요. 폰에서는 늘 아래 탭바로 보여요.</div>'+
    '<div class="j-lays">'+
    [["top","가로 메뉴","메뉴가 화면 위에 가로로 놓여요. 지금까지 쓰던 모습이에요."],
     ["side","세로 메뉴","메뉴가 왼쪽에 세로로 놓여요. 메뉴 이름이 함께 보여요."],
     ["icon","아이콘 메뉴","왼쪽에 아이콘만 좁게 놓여요. 본문을 넓게 써요."]].map(function(x){
      return '<button type="button" data-lay="'+x[0]+'" aria-pressed="'+(x[0]===cur)+'"><b>'+x[1]+'</b><small>'+x[2]+'</small></button>'; }).join("")+
    '</div>');
  Array.prototype.forEach.call($("sheet").querySelectorAll("[data-lay]"),function(b){
    b.onclick=function(){ laySet(b.getAttribute("data-lay")); closeSheet(); toast("메뉴 배치를 바꿨어요"); }; });
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
  users:"가입 코드를 보내고, 업체 사람들의 로그인 계정을 관리해요.",
  shops:"업체별 요금제 · 이용 기한 · 상태를 보고, 결제가 밀린 곳을 잠그거나 풀어요.",
  pays:"요금제 · 결제 내역 · 충전 · 카드 결제 — 업체에서 본사로 들어오는 금액이에요.",
  settle:"정산 · 유지비 — 본사가 내보내는 금액이에요.",
  tax:"세금계산서를 발행하고 확인해요.",
  noti:"기한 안내 문자와 공지사항으로 업체에 알려요.",
  settings:"보안 점검과 내 계정이에요." };

/* 폰 아래 탭바 5칸 — 홈 · 업체 · 받는 금액 · 계산서 · 전체 */
function tbarDraw(){
  var g=navOf(TAB), k=g?g[0]:"";
  $("jTbar").innerHTML=[["sum","home","홈"],["shops","shop","업체"],["pays","wallet","받는 금액"],["tax","receipt","계산서"],["all","more","전체"]].map(function(x){
    var on = x[0]==="all" ? ["sum","shops","pays","tax"].indexOf(k)<0 : x[0]===k;
    return '<button type="button" data-tb="'+x[0]+'" class="'+(on?"on":"")+'">'+ic(x[1])+'<span>'+x[2]+'</span></button>'; }).join("");
  Array.prototype.forEach.call($("jTbar").children,function(b){
    b.onclick=function(){ var t=b.getAttribute("data-tb"); if(t==="all") allSheet(); else { var n=NAV.filter(function(z){return z[0]===t;})[0]; jgo(n?n[2][0]:t); } }; });
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
(function(){ var a=$("app"); a.classList.add("lay-"+layGet()); })();

/* ② 묶음 › 화면 이름 — 화면이 자료를 받은 뒤 다시 그려져도 늘 붙게 */
function addCrumb(){
  var g=navOf(TAB), dh=$("main").querySelector(".dashhead");
  if(dh && g && !dh.querySelector(".jcrumb"))
    dh.insertAdjacentHTML("afterbegin",'<small class="jcrumb">'+esc(g[1])+(g[1]===tabLabel(TAB)?"":" › "+esc(tabLabel(TAB)))+'</small>');
}
try{ new MutationObserver(addCrumb).observe($("main"),{childList:true}); }catch(e){}
