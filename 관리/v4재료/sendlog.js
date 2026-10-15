/* ═══════ 알림 › 발송 기록 (관리 v4.6) — 대표님 «알림톡 발송 데이터 기록» (운영/요청서/07 덧붙임) ═══════
   창구: 서버 방이 만들 hqSendLog([시작일, 끝일]) — 모든 서버가 같은 모양으로 남긴 발송 기록
     줄: {at, product(워시·체크·딜러·통합), shop, shopName, tpl(템플릿 키), to(받는 번호 — 가린 모양), via/kind(알림톡 · SMS · LMS),
          result(알림톡 도착 · 문자 대체 · 실패 · 대기), msgId(솔라피 번호), err(오류)}
   칸 이름은 서버 판이 나오면 맞춰요. 지금은 이름이 조금 달라도 읽게 넉넉히 받아요.
   받는 번호는 서버가 가려 주지만, 화면에서도 한 번 더 가려요 (앞 3자리 · 끝 4자리만).
   요금은 대략: 알림톡 13원 · SMS 18원 · LMS 45원 (VAT 별도) — 알림톡 방 · 결제 방 기준 */
var SLOG = {from:"", to:"", list:null, err:"", busy:false};
var SL_COST = {ata:13, sms:18, lms:45};
function slv(o,ks,d){ for(var i=0;i<ks.length;i++){ var v=o&&o[ks[i]]; if(v!==undefined&&v!==null&&v!=="") return v; } return d; }
function slMask(p){ var t=String(p||""), d=t.replace(/\D/g,"");
  if(!d) return "-";
  if(/\*/.test(t) && d.length<=7) return t;            /* 서버가 이미 가린 모양 (010-****-1234) 그대로 */
  if(d.length>=8) return d.slice(0,3)+"-****-"+d.slice(-4);
  return t.replace(/\d/g,"*"); }
/* 최종 결과 넷: ata(알림톡 도착) · sms(문자 대체) · fail(실패) · wait(대기) */
function slRes(r){ var t=String(slv(r,["result","final","status","state"],"")).toLowerCase();
  if(/fail|실패|오류|err|reject|거부/.test(t)) return "fail";
  if(/sms|lms|문자|대체|fallback|replace/.test(t)) return "sms";
  if(/ata|알림톡|도착|deliver|success|성공|완료|done/.test(t)) return "ata";
  return "wait"; }
function slVia(r){ var t=String(slv(r,["via","kind","type","msgType"],"")).toLowerCase();
  if(/lms|mms/.test(t)) return "lms"; if(/sms/.test(t)) return "sms"; return slRes(r)==="sms"?"sms":"ata"; }
var SL_RES = {ata:["알림톡 도착","done"], sms:["문자 대체","chk"], fail:["실패","stop"], wait:["대기","run"]};
function slTplName(k){ var f=(typeof ATA_LIST!=="undefined"?ATA_LIST:[]).filter(function(x){ return x[0]===k; })[0]; return f?f[1]:(k||"-"); }
function viewSendLog(){
  var d=new Date(); if(!SLOG.from){ SLOG.from=d.toISOString().slice(0,8)+"01"; SLOG.to=d.toISOString().slice(0,10); }
  $("main").innerHTML='<div class="dashhead"><h2>발송 기록</h2>'+
    '<div class="sub2">워시 · 체크 · 딜러 · 통합 입구에서 나간 알림톡과 문자를 한 곳에서 봐요. 알림톡이 안 되면 문자로 대신 나가고, 요금이 달라요. 줄을 누르면 자세히 보여요.</div></div>'+
    '<div id="slBody"><div class="hint">불러오는 중이에요…</div></div>';
  slLoad();
}
function slLoad(){
  if(SLOG.busy) return; SLOG.busy=true;
  api("hqSendLog",[SLOG.from, SLOG.to]).then(function(r){ var L=r&&(r.list||r.rows||r.logs); if(!L && Array.isArray(r)) L=r;
      SLOG.list=Array.isArray(L)?L:null; SLOG.err=""; },   /* 목록이 없는 답 = 서버 새 판 전 */
    function(e){ SLOG.list=null; SLOG.err=e.message||""; })
    .then(function(){ SLOG.busy=false; slDraw(); });
}
function slDraw(){
  var host=$("slBody"); if(!host) return;
  var tools='<div class="tools"><label class="f" style="margin:0">기간</label><input type="date" id="slFrom" value="'+esc(SLOG.from)+'"><span>~</span><input type="date" id="slTo" value="'+esc(SLOG.to)+'">'+
    '<button class="btn" id="slGo">다시 불러오기</button></div>';
  if(SLOG.list===null){
    host.innerHTML=tools+'<div class="card"><div class="hint"><b>발송 기록은 서버 새 판이 아직이에요.</b><br>서버 방이 모든 제품의 발송 기록 창구를 올리면 이 화면에 바로 보여요. 지금 나가는 알림톡 · 문자는 그대로 나가요.'+
      (SLOG.err?'<br><span style="opacity:.7">서버 안내: '+esc(SLOG.err)+'</span>':'')+'</div></div>';
    slBind(); return; }
  var L=SLOG.list, ata=0, sms=0, lms=0, fail=0, wait=0;
  L.forEach(function(r){ var k=slRes(r); if(k==="ata") ata++; else if(k==="sms"){ if(slVia(r)==="lms") lms++; else sms++; } else if(k==="fail") fail++; else wait++; });
  var won0=ata*SL_COST.ata+sms*SL_COST.sms+lms*SL_COST.lms;
  var thisMonth=SLOG.from===new Date().toISOString().slice(0,8)+"01";
  host.innerHTML=tools+'<div id="slK"></div>'+
    '<div class="hint" style="margin:-6px 0 12px">요금은 대략이에요: 알림톡 13원 · SMS 18원 · LMS 45원 (VAT 별도). 정확한 금액은 솔라피 청구서를 봐 주세요.</div>'+
    '<div id="tSL"></div>';
  CGG.kpis($("slK"),[
    {label:(thisMonth?"이번 달 ":"이 기간 ")+"알림톡 도착", value:String(ata), unit:"건", color:"#1E9E5A"},
    {label:"문자 대체", value:String(sms+lms), unit:"건", color:"#E08A00"},
    {label:"실패", value:String(fail), unit:"건", color:"#D64545"},
    {label:"대략 요금 (VAT 별도)", value:won(won0).replace(/원$/,""), unit:"원", color:"#0B2545"}]);
  var prods=[], shops=[], tpls=[];
  var rows=L.map(function(r,i){ var p=String(slv(r,["product","prod","app"],"워시")), sh=String(slv(r,["shopName","shop_name","shop","office"],"-")), tk=String(slv(r,["tpl","template","tplKey","key"],""));
    if(prods.indexOf(p)<0) prods.push(p); if(shops.indexOf(sh)<0) shops.push(sh); if(tk && tpls.indexOf(tk)<0) tpls.push(tk);
    return {i:i, at:String(slv(r,["at","created_at","sentAt"],"")).slice(5,16).replace("T"," "), atFull:String(slv(r,["at","created_at","sentAt"],"")),
      product:p, shop:sh, tk:tk, tpl:slTplName(tk), to:slMask(slv(r,["to","phone","receiver"],"")), via:{ata:"알림톡",sms:"SMS",lms:"LMS"}[slVia(r)],
      res:slRes(r), raw:r}; });
  makeTable({ id:"tSL", sortKey:"atFull", sortDir:"desc", rowId:function(r){ return String(r.i); },
    tabs:[["","전체"],["ata","알림톡 도착"],["sms","문자 대체"],["fail","실패"],["wait","대기"]], tabOf:function(r){ return r.res; },
    rows:rows, search:["shop","to","tpl","product"],
    filters:[{k:"product",label:"제품",opts:[["","제품 전체"]].concat(prods.map(function(v){ return [v,v]; }))},
             {k:"shop",label:"업체",opts:[["","업체 전체"]].concat(shops.map(function(v){ return [v,v]; }))},
             {k:"tk",label:"템플릿",opts:[["","템플릿 전체"]].concat(tpls.map(function(v){ return [v,slTplName(v)]; }))}],
    onRow:function(id){ slDetail(rows[Number(id)]); },
    cols:[
      {k:"shop",label:"업체",w:170},
      {k:"to",label:"받는 번호",w:130,mono:true},
      {k:"atFull",label:"시각",w:130,html:function(r){ return esc(r.at); }},
      {k:"product",label:"제품",w:90},
      {k:"tpl",label:"템플릿",w:140},
      {k:"via",label:"보낸 방법",w:90},
      {k:"res",label:"결과",w:110,html:function(r){ var x=SL_RES[r.res]; return '<span class="cgg-st '+x[1]+'">'+x[0]+'</span>'; }}
    ]});
  slBind();
}
function slBind(){
  if($("slGo")) $("slGo").onclick=function(){ SLOG.from=$("slFrom").value; SLOG.to=$("slTo").value; slLoad(); };
}
/* 자세히 창 — 받는 번호는 가린 모양, 본문은 템플릿 이름뿐 (서버도 본문을 남기지 않아요) */
function slDetail(r){ if(!r) return; var x=r.raw, R=SL_RES[r.res];
  var err=String(slv(x,["err","error","reason"],""));
  CGG.dialog({size:"detail", title:"발송 기록 자세히", desc:r.shop+" · "+r.tpl,
    rows:[["시각",String(r.atFull).slice(0,19).replace("T"," ")],["제품",r.product],["업체",r.shop],["템플릿",r.tpl+(r.tk?" ("+r.tk+")":"")],
          ["받는 번호",r.to],["보낸 방법",r.via],["결과",R[0]],["대략 요금",r.res==="fail"||r.res==="wait"?"0원":won(SL_COST[{알림톡:"ata",SMS:"sms",LMS:"lms"}[r.via]]||0)+" (VAT 별도)"],
          ["솔라피 번호",String(slv(x,["msgId","messageId","msg_id"],"-"))]].concat(err?[["안 된 이유",err]]:[]),
    cancel:"닫기"});
}
