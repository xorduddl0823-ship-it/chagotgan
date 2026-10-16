/* ═══════ 업체 › 결제 대기 + 누구나 가입 스위치 (관리 v4.3 · 워시 서버 sb13) ═══════
   근거: 서버/설계/15 · 결제/10 관리 A9 · 총괄 전달 2026-10-15 (paidOrder 는 «확인 필요»로 눈에 띄게)
     hqPayWait() → {list:[{shop, name, ownerPhone, joinPlan, createdAt, days, old(30일 지남), paidOrder(돈은 냈는데 아직 대기)}]}
     hqPayWaitDel([업체]) — 결제 대기 업체만 지워요. 결제 중 · 끝난 주문이 있으면 서버가 거절. 주문 · 장부는 남아요
     hqSignup() → {on, cfg:{perIp, allDay, waitPerIp}} · hqSignup([{on, perIp, allDay, waitPerIp}]) — 가입 코드 없이 가입 (처음 꺼짐) */
var PWROWS = [];
var PW = {list:null, err:"", loaded:false, busy:false, sg:null};
function pwLoad(after){
  if(PW.busy) return; PW.busy=true;
  api("hqPayWait",[]).then(function(r){ PW.list=(r&&r.list)||[]; PW.err=""; }, function(e){ PW.list=null; PW.err=e.message||"불러오지 못했습니다"; })
    .then(function(){ PW.busy=false; PW.loaded=true; if(after) after(); });
}
function pwKind(x){ return x.paidOrder?"chk":(x.old?"stop":(Number(x.days)>=7?"wait7":"run")); }
function pwChip(x){ var k=pwKind(x);
  return k==="chk"?'<span class="cgg-st chk">확인 필요</span>':k==="stop"?'<span class="cgg-st stop">30일 지남</span>':k==="wait7"?'<span class="cgg-st chk">7일 지남</span>':'<span class="cgg-st run">결제 기다림</span>'; }
function viewPayWait(){
  $("main").innerHTML='<div class="dashhead"><h2>결제 대기</h2>'+
    '<div class="sub2">홈페이지에서 가입만 하고 아직 결제를 안 한 업체예요. «확인 필요»는 돈은 냈는데 아직 열리지 않은 곳이라 차곳간이 직접 확인해야 해요.</div></div>'+
    '<div id="sgBox"></div><div id="pwBody"><div class="hint">불러오는 중이에요…</div></div>';
  sgDraw(); if(PW.sg===null) api("hqSignup",[]).then(function(r){ PW.sg=r||{}; }, function(){ PW.sg="?"; }).then(sgDraw);
  pwLoad(pwDraw);
}
function pwDraw(){
  var host=$("pwBody"); if(!host) return;
  if(PW.list===null){ host.innerHTML='<div class="card"><div class="hint"><b>목록을 불러오지 못했어요.</b><br>'+esc(PW.err)+'<br>서버 새 판(워시 sb13)이 올라가면 보여요.</div></div>'; return; }
  var L=PW.list, chk=L.filter(function(x){ return x.paidOrder; }).length, d7=L.filter(function(x){ return !x.paidOrder && Number(x.days)>=7 && !x.old; }).length, old=L.filter(function(x){ return x.old && !x.paidOrder; }).length;
  host.innerHTML='<div id="pwK"></div>'+
    (chk?'<div class="card" style="border:1px solid var(--chk);display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="cgg-st chk">확인 필요 '+chk+'곳</span>'+
      '<span style="flex:1 1 240px">돈은 냈는데 업체가 아직 열리지 않았어요. 결제 내역에서 주문을 확인하고, 업체 관리에서 이용 상태를 열어 주세요. 이 업체는 지울 수 없어요.</span>'+
      '<button type="button" class="btn sm" id="pwToPays">결제 내역 보기</button></div>':'')+
    '<div id="tPW"></div>';
  CGG.kpis($("pwK"),[{label:"결제 대기",value:String(L.length),unit:"곳",color:"#1668C4"},{label:"확인 필요 (돈은 냄)",value:String(chk),unit:"곳",color:"#E08A00"},
    {label:"7일 지남",value:String(d7),unit:"곳",color:"#0B2545"},{label:"30일 지남 · 지울 수 있음",value:String(old),unit:"곳",color:"#D64545"}]);
  if($("pwToPays")) $("pwToPays").onclick=function(){ TAB="pays"; window.scrollTo(0,0); render(); };
  /* 처음 차례: 확인 필요(돈 냄) → 오래된 것. 머리를 누르면 다른 차례로 */
  makeTable({ id:"tPW", sortKey:"", 
    rows:L.slice().sort(function(a,b){ return (b.paidOrder?1:0)-(a.paidOrder?1:0) || (Number(b.days)||0)-(Number(a.days)||0); }).map(function(x,i){ PWROWS[i]=x; return {i:i, name:String(x.name||""), shop:String(x.shop||""), phone:phoneFmt(x.ownerPhone||""), plan:PLAN_NAME[x.joinPlan]||String(x.joinPlan||"-"),
      at:String(x.createdAt||"").slice(0,10), days:Number(x.days)||0, k:pwKind(x), raw:x}; }),
    search:["name","shop","phone"],
    filters:[{k:"k",label:"상태",opts:[["","상태 전체"],["chk","확인 필요"],["wait7","7일 지남"],["stop","30일 지남"],["run","결제 기다림"]]}],
    cols:[
      {k:"name",label:"업체명",w:160,stick:true},
      {k:"shop",label:"코드",w:110,mono:true},
      {k:"phone",label:"대표 번호",w:130},
      {k:"plan",label:"고른 요금제",w:110},
      {k:"at",label:"가입일",w:100},
      {k:"days",label:"지난 날",w:80,num:true,html:function(r){ return r.days+"일"; }},
      {k:"k",label:"상태",w:110,html:function(r){ return pwChip(r.raw); }},
      {k:"_a",label:"할 일",w:110,nosort:true,html:function(r){
        return r.raw.paidOrder?'<span class="hint" style="margin:0">지울 수 없음</span>':'<button type="button" class="btn sm danger" data-pwd="'+r.i+'">지우기</button>'; }}
    ]});
  Array.prototype.forEach.call(document.querySelectorAll("[data-pwd]"),function(b){
    b.onclick=function(ev){ ev.stopPropagation(); var x=PWROWS[Number(b.getAttribute("data-pwd"))]; if(!x) return;
      confirmBox("결제 대기 업체를 지울까요?", "업체: "+(x.name||"-")+"\n코드: "+x.shop+"\n대표 번호: "+phoneFmt(x.ownerPhone||"")+"\n가입: "+(Number(x.days)||0)+"일 전\n남는 것: 주문 · 결제 장부",
        "지우기", true, function(){
          api("hqPayWaitDel",[x.shop]).then(function(){ toast("지웠어요 · "+(x.name||x.shop)); pwLoad(pwDraw); },
            function(e){ toast(e.message||"지우지 못했습니다",true); pwLoad(pwDraw); }); }); }; });
}
/* 누구나 가입 — 가입 코드 없이 홈페이지에서 가입 (처음 꺼짐) · 한도 셋 */
function sgDraw(){
  var el=$("sgBox"); if(!el) return; var g=PW.sg, ok=g&&g!=="?", on=ok&&!!g.on, c=(ok&&g.cfg)||{};
  el.innerHTML='<div class="card" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">'+
    '<div style="flex:1 1 280px;min-width:0"><b>누구나 가입 (가입 코드 없이)</b><div class="hint" style="margin:4px 0 0">'+
      (g===null?"불러오는 중이에요…":g==="?"?"서버 새 판(워시 sb13)이 올라가면 여기서 켜고 꺼요.":
       (on?"켜져 있어요. 홈페이지에서 누구나 가입하고 결제하면 바로 쓸 수 있어요.":"꺼져 있어요. 가입 코드를 받은 번호만 가입할 수 있어요.")+
       ' 한도: 같은 곳(IP)에서 하루 '+(c.perIp||5)+'번 · 전체 하루 '+(c.allDay||200)+'번 · 결제 대기 업체 같은 곳 하루 '+(c.waitPerIp||3)+'개')+'</div></div>'+
    (ok?'<span class="cgg-st '+(on?"done":"stop")+'">'+(on?"켜짐":"꺼짐")+'</span><button type="button" class="btn sm" id="sgEdit">바꾸기</button>':'')+'</div>';
  if($("sgEdit")) $("sgEdit").onclick=sgSheet;
}
function sgSheet(){
  var g=PW.sg||{}, c=g.cfg||{};
  openSheet('<h3 style="margin:0 0 4px">누구나 가입</h3><div class="hint" style="margin:0 0 14px">켜면 가입 코드 없이도 홈페이지에서 가입할 수 있어요. 결제를 마쳐야 업체가 열려요. 처음 값은 꺼짐이에요.</div>'+
    '<label class="f"><input type="checkbox" id="sgOn"'+(g.on?" checked":"")+'> 누구나 가입 켜기</label>'+
    '<div class="row2"><div><label class="f">같은 곳(IP)에서 하루 가입 (1~50)</label><input type="number" id="sgIp" min="1" max="50" value="'+esc(c.perIp||5)+'"></div>'+
    '<div><label class="f">전체 하루 가입 (1~5000)</label><input type="number" id="sgAll" min="1" max="5000" value="'+esc(c.allDay||200)+'"></div></div>'+
    '<label class="f">같은 곳에서 하루 결제 대기 업체 (1~20)</label><input type="number" id="sgWait" min="1" max="20" value="'+esc(c.waitPerIp||3)+'">'+
    '<div class="sheetbtns"><button type="button" class="btn" id="sgNo">취소</button><button type="button" class="btn primary" id="sgSave">저장</button></div>');
  $("sgNo").onclick=closeSheet;
  $("sgSave").onclick=function(){
    var v={on:$("sgOn").checked, perIp:Number($("sgIp").value)||5, allDay:Number($("sgAll").value)||200, waitPerIp:Number($("sgWait").value)||3};
    confirmBox("누구나 가입을 "+(v.on?"켤까요?":"끈 채로 저장할까요?"),
      "누구나 가입: "+(v.on?"켜짐":"꺼짐")+"\n같은 곳 하루: "+v.perIp+"번\n전체 하루: "+v.allDay+"번\n결제 대기 같은 곳: "+v.waitPerIp+"개", "저장", false, function(){
      api("hqSignup",[v]).then(function(r){ PW.sg=r||v; closeSheet(); toast(v.on?"누구나 가입을 켰어요":"저장했어요"); sgDraw(); },
        function(e){ toast(e.message||"저장하지 못했습니다",true); }); });
  };
}
