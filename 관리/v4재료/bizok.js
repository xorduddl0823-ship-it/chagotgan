/* ═══════ 업체 › 사업자 확인 (관리 v4.6) — 서버 방 보안 고침 (워시 sb15 · 서버/설계/18) ═══════
   업체가 사업자번호를 처음 넣으면, 본사가 확인하기 전까지 실제 세금계산서 · 팝빌을 쓸 수 없어요.
     hqBizList([]) → {list:[{product "워시"|"체크", code, name, bizNo, ceo, owner(가린 번호), ok(true|false), okAt}]}  — 확인 안 된 것이 먼저
     hqBizOk([product, code, true|false]) → {ok}
   지금 있는 업체는 모두 «확인됨»으로 시작해요. */
var BIZ = {list:null, err:"", busy:false};
function viewBizOk(){
  $("main").innerHTML='<div class="dashhead"><h2>사업자 확인</h2>'+
    '<div class="sub2">업체가 사업자번호를 처음 넣거나 바꾸면, 본사가 확인할 때까지 실제 세금계산서를 보낼 수 없어요. 국세청 사업자 조회 등으로 번호와 대표 이름을 확인한 뒤 [확인]을 눌러 주세요.</div></div>'+
    '<div id="bizBody"><div class="hint">불러오는 중이에요…</div></div>';
  bizLoad();
}
function bizLoad(){
  if(BIZ.busy) return; BIZ.busy=true;
  api("hqBizList",[]).then(function(r){ var L=r&&(r.list||r.rows); BIZ.list=Array.isArray(L)?L:null; BIZ.err=""; },
    function(e){ BIZ.list=null; BIZ.err=e.message||""; })
    .then(function(){ BIZ.busy=false; bizDraw(); });
}
function bizDraw(){
  var host=$("bizBody"); if(!host) return;
  if(BIZ.list===null){ host.innerHTML='<div class="card"><div class="hint"><b>사업자 확인 목록을 불러오지 못했어요.</b> 서버 준비가 아직이면 이렇게 보여요 — 서버 방에 확인해 주세요.</div></div>'; return; }
  var L=BIZ.list, need=L.filter(function(x){ return !x.ok; }).length;
  host.innerHTML='<div id="bizK"></div><div id="tBiz"></div>';
  CGG.kpis($("bizK"),[{label:"확인 필요",value:String(need),unit:"곳",color:"#E08A00"},{label:"확인됨",value:String(L.length-need),unit:"곳",color:"#1E9E5A"}]);
  makeTable({ id:"tBiz", sortKey:"", rowId:function(r){ return String(r.i); },
    tabs:[["","전체"],["need","확인 필요"],["ok","확인됨"]], tabOf:function(r){ return r.st; },
    rows:L.map(function(x,i){ return {i:i, name:String(x.name||x.code||""), code:String(x.code||""), product:String(x.product||"워시"),
      biz:fmtBizNo?fmtBizNo(String(x.bizNo||"")):String(x.bizNo||""), ceo:String(x.ceo||"-"), owner:slMask?slMask(x.owner):String(x.owner||""),
      okAt:String(x.okAt||"").slice(0,10), st:x.ok?"ok":"need", raw:x}; }),
    search:["name","code","biz","ceo"],
    filters:[{k:"product",label:"제품",opts:[["","제품 전체"],["워시","워시"],["체크","체크"]]}],
    cols:[
      {k:"name",label:"업체명",w:170},
      {k:"biz",label:"사업자번호",w:130,mono:true},
      {k:"code",label:"코드",w:110,mono:true},
      {k:"product",label:"제품",w:80},
      {k:"ceo",label:"대표",w:100},
      {k:"owner",label:"대표 번호",w:130},
      {k:"okAt",label:"확인한 날",w:100,html:function(r){ return esc(r.okAt||"-"); }},
      {k:"st",label:"상태",w:104,html:function(r){ return r.st==="ok"?'<span class="cgg-st done">확인됨</span>':'<span class="cgg-st chk">확인 필요</span>'; }},
      {k:"_a",label:"할 일",nosort:true,html:function(r){
        return r.st==="ok"?'<button type="button" class="btn sm danger" data-bizx="'+r.i+'">확인 취소</button>':'<button type="button" class="btn sm" data-bizok="'+r.i+'">확인</button>'; }}
    ]});
  function act(i,on){ var x=L[Number(i)]; if(!x) return;
    confirmBox(on?"사업자번호를 확인했나요?":"확인을 취소할까요?",
      "업체: "+(x.name||x.code)+"\n사업자번호: "+(fmtBizNo?fmtBizNo(String(x.bizNo||"")):x.bizNo||"-")+"\n대표: "+(x.ceo||"-")+"\n그 뒤: "+(on?"세금계산서를 보낼 수 있어요":"세금계산서를 다시 보낼 수 없게 돼요"),
      on?"확인":"확인 취소", !on, function(){
        api("hqBizOk",[String(x.product||"워시"), String(x.code||""), !!on]).then(function(){ toast(on?"확인했어요":"확인을 취소했어요"); bizLoad(); },
          function(e){ toast(emsg(e,"바꾸지 못했어요. 다시 시도해 주세요."),true); }); }); }
  Array.prototype.forEach.call(document.querySelectorAll("[data-bizok]"),function(b){ b.onclick=function(ev){ ev.stopPropagation(); act(b.getAttribute("data-bizok"),true); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-bizx]"),function(b){ b.onclick=function(ev){ ev.stopPropagation(); act(b.getAttribute("data-bizx"),false); }; });
}
