/* ═══════ 업체 › 사업자번호 승인 요청 (관리 v4.9.2 · 대표님 정책 04 · SQL 24) ═══════
   같은 사업자번호로 두 번째 업체나 두 번째 제품을 쓰는 것은 본사가 승인할 때만 돼요(개인 · 법인 같아요).
   서버 창구 (워시 서버 sb28~sb30):
     hqBizShareList([상태 ""|"wait"|"ok"|"no"]) → {ok, list:[{id, at, product "워시"|"체크", code, name, bizNo, bizSub, who, state "대기"|"승인"|"거절", decidedAt, memo, usedBy:[…]}], need?}
     hqBizShareDecide([요청번호, true|false, 메모]) → {ok, state}   (승인하면 그때 그 업체에 번호를 넣고 hq_audit 에 남겨요)
   번호는 화면에서 가려요(사업자번호 앞 3 · 끝 2, 휴대폰 앞 3 · 끝 4). 서버가 거절하면 그 글을 그대로 보여 줘요. */
var BSR = {list:null, err:"", need:"", busy:false, note:"", wait:0};
function bsBiz(v){ var d=String(v||"").replace(/[^0-9]/g,""); return d.length>=10 ? d.slice(0,3)+"-**-***"+d.slice(-2) : (d?"***":"-"); }
function bsPhone(v){ var d=String(v||"").replace(/[^0-9]/g,""); return d.length>=10 ? d.slice(0,3)+"-****-"+d.slice(-4) : (d?"***":"-"); }
function bsSub(v){ v=String(v||"0000"); return v==="0000" ? "" : " · 종 "+v; }
/* 서버 시각(세계 표준시) → 한국 시각 «월-일 시:분» (서버 hqBizList 의 kt() 와 같은 셈) */
function bsKt(v){ var t=Date.parse(String(v||"")); return isNaN(t)?"":new Date(t+9*3600e3).toISOString().slice(5,16).replace("T"," "); }
function bsUsed(u){ u=Array.isArray(u)?u.map(String):[]; return u.length?u.slice(0,3).join(" · ")+(u.length>3?" 외 "+(u.length-3)+"곳":""):"없음"; }
function bsLoad(after){
  if(BSR.busy) return; BSR.busy=true;
  api("hqBizShareList",[""]).then(function(r){ BSR.list=(r&&Array.isArray(r.list))?r.list:[]; BSR.need=(r&&r.need)||""; BSR.err="";
      BSR.wait=BSR.list.filter(function(x){ return x.state==="대기"; }).length; },
    function(e){ BSR.list=null; BSR.err=emsg(e,"불러오지 못했어요. 다시 시도해 주세요."); })
  .then(function(){ BSR.busy=false; if(after) after(); });
}
function viewBizShare(){
  $("main").innerHTML='<div class="dashhead"><h2>사업자번호 승인 요청</h2>'+
    '<div class="sub2">같은 사업자번호로 두 번째 업체나 두 번째 제품을 쓰려면 본사 승인이 있어야 해요.</div></div>'+
    '<div id="bsBody"><div class="hint">불러오는 중이에요…</div></div>';
  bsLoad(bsDraw);
}
function bsDraw(){
  var host=$("bsBody"); if(!host) return;
  if(BSR.list===null){ host.innerHTML='<div class="card"><div class="hint" style="color:var(--stop)">'+esc(BSR.err||"불러오지 못했어요. 다시 시도해 주세요.")+'</div></div>'; return; }
  var L=BSR.list, ok=L.filter(function(x){ return x.state==="승인"; }).length, no=L.filter(function(x){ return x.state==="거절"; }).length;
  host.innerHTML='<div id="bsBand"></div>'+(BSR.need?'<div class="cgg-band chk" role="status"><span class="tx">서버 준비가 아직이에요 — '+esc(BSR.need)+'</span></div>':'')+
    (BSR.note?'<div class="hint" style="margin:0 0 12px;color:var(--stop)">'+esc(BSR.note)+'</div>':'')+
    '<div id="bsK"></div><div id="tBs"></div>'+
    '<details class="j-help"><summary>이 화면 사용법</summary><p>«같은 번호를 쓰는 곳»을 보고 같은 사업자인지 확인한 뒤 [승인]을 눌러 주세요. 승인하면 그 업체(검사소)에 사업자번호가 들어가고 «확인됨»이 돼요. 거절하면 번호는 들어가지 않아요. 둘 다 메모와 함께 기록에 남아요.</p></details>';
  CGG.todoBand($("bsBand"),{count:BSR.wait, text:"승인을 기다리는 요청 "+BSR.wait+"건이 있어요", tone:"chk", go:"해결하러 가기",
    onGo:function(){ (TSTATE.tBs||(TSTATE.tBs={q:"",size:20,page:1,key:"at",dir:"desc",sel:{},tab:""})).tab="대기"; TSTATE.tBs.page=1; bsDraw(); }});
  bsBadge(); var nb=document.querySelector('#nav .cgg-ngrp > button[data-nk^="shops"] .cgg-nbadge'); if(nb){ if(BSR.wait) nb.textContent=String(BSR.wait); else nb.remove(); }
  CGG.kpis($("bsK"),[{label:"승인 대기",value:String(BSR.wait),unit:"건",tone:"due",zeroMuted:true},{label:"승인함",value:String(ok),unit:"건",tone:"in",zeroMuted:true},
    {label:"거절함",value:String(no),unit:"건"},{label:"전체",value:String(L.length),unit:"건"}]);
  makeTable({ id:"tBs", sortKey:"at", sortDir:"desc", rowId:function(r){ return String(r.id); }, find:"업체 · 코드",
    tabs:[["","전체"],["대기","대기"],["승인","승인"],["거절","거절"]], tabOf:function(r){ return r.state; },
    rows:L.map(function(x){ return {id:Number(x.id)||0, at:bsKt(x.at), atRaw:String(x.at||""), product:String(x.product||""), code:String(x.code||""),
      name:String(x.name||x.code||""), biz:bsBiz(x.bizNo)+bsSub(x.bizSub), who:bsPhone(x.who), state:String(x.state||"대기"),
      used:(Array.isArray(x.usedBy)?x.usedBy:[]).map(String), dec:bsKt(x.decidedAt), memo:String(x.memo||""), raw:x}; }),
    search:["name","code","product"], mf:["product","used","at"],
    cols:[
      {k:"name", label:"업체", w:170, isName:true, html:function(r){ return '<b>'+esc(r.name)+'</b> <span class="hint" style="margin:0">'+esc(r.code)+'</span>'; }},
      {k:"product", label:"제품", w:80},
      {k:"biz", label:"사업자번호", w:190},
      {k:"used", label:"같은 번호를 쓰는 곳", w:220, nosort:true, html:function(r){ return r.used.length?esc(bsUsed(r.used)):'<span class="hint" style="margin:0">없음</span>'; }},
      {k:"who", label:"요청한 사람", w:130},
      {k:"at", label:"요청 시각", w:130, kind:"time", sortVal:function(r){ return r.atRaw; }},
      {k:"state", label:"상태", w:90, html:function(r){ return '<span class="cgg-st '+(r.state==="승인"?"done":r.state==="거절"?"stop":"chk")+'">'+esc(r.state)+'</span>'; }},
      {k:"memo", label:"처리 · 메모", w:200, nosort:true, html:function(r){ return r.state==="대기"?'':esc((r.dec?r.dec+" ":"")+r.memo); }},
      {k:"_a", label:"할 일", nosort:true, html:function(r){ return r.state!=="대기"?'':
        '<button type="button" class="btn sm" data-bsok="'+r.id+'">승인</button><button type="button" class="btn sm danger" data-bsno="'+r.id+'">거절</button>'; }}
    ]});
  function act(id,yes){ var x=L.filter(function(y){ return Number(y.id)===Number(id); })[0]; if(!x) return;
    var used=(Array.isArray(x.usedBy)?x.usedBy:[]);
    var d=CGG.dialog({size:"confirm", title:yes?"이 요청을 승인할까요?":"이 요청을 거절할까요?",
      rows:[["누구에게",String(x.name||x.code)+" ("+String(x.product||"")+")"],["사업자번호",bsBiz(x.bizNo)+bsSub(x.bizSub)],["같은 번호를 쓰는 곳",bsUsed(used)],
        ["하는 일",yes?"그 업체에 사업자번호를 넣고 «확인됨»으로 바꿔요":"번호를 넣지 않아요"]],
      body:'<label>메모 (기록에 남아요)<input type="text" id="bsMemo" maxlength="200" placeholder="'+(yes?"예: 같은 대표 확인":"예: 다른 사업자로 보임")+'"></label>',
      ok:yes?"승인":"거절", cancel:"취소",
      onOk:function(dlg){ var memo=String((dlg.querySelector("#bsMemo")||{}).value||"").trim();
        setTimeout(function(){ BSR.note="";
          api("hqBizShareDecide",[Number(x.id), !!yes, memo]).then(function(){ toast(yes?"승인했어요":"거절했어요"); BSR.wait=Math.max(0,(BSR.wait||0)-1); render(); },
            function(e){ BSR.note=emsg(e,"처리하지 못했어요. 다시 시도해 주세요."); toast(BSR.note,true); bsDraw(); }); },0); }});
    var y=d&&d.querySelector("[data-dok]"); if(y&&!yes) y.classList.add("danger"); }
  host.onclick=function(ev){ var b=ev.target&&ev.target.closest&&ev.target.closest("[data-bsok],[data-bsno]"); if(!b||!host.contains(b)) return;
    ev.stopPropagation(); if(b.hasAttribute("data-bsok")) act(b.getAttribute("data-bsok"),true); else act(b.getAttribute("data-bsno"),false); };
}
/* 대기 건수 — 메뉴 «업체» 빨간 숫자 (화면이 다시 그려질 때 함께) */
function bsBadge(){ var g=GROUPS.filter(function(x){ return x.key==="shops"; })[0]; if(g) g.badge=BSR.wait||0; }
