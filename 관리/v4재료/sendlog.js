/* ═══════ 알림 › 발송 기록 (관리 v4.6) — 대표님 «알림톡 발송 데이터 기록» (운영/요청서/07 덧붙임) ═══════
   창구: 워시 서버 sb15 (서버/설계/18) — 모든 서버가 같은 모양으로 남긴 발송 기록
     hqSendLog([시작일, 끝일, {거르기}]) → {from, to, list:[…], need?(준비 전 안내)}  · hqSendSum(["YYYY-MM"]) → {total:{ata, sms, sent, fail, wait, skip, cost}, price}
     hqSendCheck([]) → {n} (솔라피 결과 새로 받기 — 서버가 10분마다도 채워요)
     result 6가지: ata(알림톡 도착) · sent(문자 도착, 처음부터 문자) · sms(문자 대체) · fail(실패) · skip(안 보냄) · wait(대기)
     줄: {at, product(워시·체크·딜러·통합), shop, shopName, tpl(템플릿 키), to(받는 번호 — 가린 모양), via/kind(알림톡 · SMS · LMS),
          result(알림톡 도착 · 문자 대체 · 실패 · 대기), msgId(솔라피 번호), err(오류)}
   칸 이름은 서버 판이 나오면 맞춰요. 지금은 이름이 조금 달라도 읽게 넉넉히 받아요.
   받는 번호는 서버가 가려 주지만, 화면에서도 한 번 더 가려요 (앞 3자리 · 끝 4자리만).
   요금은 대략: 알림톡 13원 · SMS 18원 · LMS 45원 (VAT 별도) — 알림톡 방 · 결제 방 기준 */
var SLOG = {from:"", to:"", list:null, err:"", busy:false, sum:null, need:""};
var SL_COST = {ata:13, sms:18, lms:45, mms:110};
function slv(o,ks,d){ for(var i=0;i<ks.length;i++){ var v=o&&o[ks[i]]; if(v!==undefined&&v!==null&&v!=="") return v; } return d; }
function slMask(p){ var t=String(p||""), d=t.replace(/\D/g,"");
  if(!d) return "-";
  if(/\*/.test(t) && d.length<=7) return t;            /* 서버가 이미 가린 모양 (010-****-1234) 그대로 */
  if(d.length>=8) return d.slice(0,3)+"-****-"+d.slice(-4);
  return t.replace(/\d/g,"*"); }
/* 최종 결과 여섯: ata(알림톡 도착) · sent(문자 도착) · sms(문자 대체) · fail(실패) · skip(안 보냄) · wait(대기) */
var SL_CODE={ata:"ata",sent:"sent",sms:"sms",fail:"fail",skip:"skip",wait:"wait","알림톡 도착":"ata","문자 도착":"sent","문자 대체":"sms","실패":"fail","안 보냄":"skip","대기":"wait"};
function slRes(r){ var raw=String(slv(r,["result","final","status","state"],"")).trim(); if(SL_CODE[raw]) return SL_CODE[raw];
  var t=raw.toLowerCase();
  if(/안 보냄|skip/.test(t)) return "skip";
  if(/문자 도착|^sent/.test(t)) return "sent";
  if(/fail|실패|오류|err|reject|거부/.test(t)) return "fail";
  if(/sms|lms|문자|대체|fallback|replace/.test(t)) return "sms";
  if(/ata|알림톡|도착|deliver|success|성공|완료|done/.test(t)) return "ata";
  return "wait"; }
function slVia(r){ var t=String(slv(r,["via","kind","type","msgType"],"")).toLowerCase();
  if(/mms/.test(t)) return "mms"; if(/lms/.test(t)) return "lms"; if(/sms/.test(t)) return "sms"; return slRes(r)==="sms"?"sms":"ata"; }
var SL_RES = {ata:["알림톡 도착","done"], sent:["문자 도착","done"], sms:["문자 대체","chk"], fail:["실패","stop"], skip:["안 보냄","stop"], wait:["대기","run"]};
/* 템플릿 이름 — «키_sms» 는 그 안내의 문자, sms_free 는 직접 쓴 문자, check_arrive_office 는 검사소 템플릿 */
function slTplName(k){ k=String(k||""); var L=(typeof ATA_LIST!=="undefined"?ATA_LIST:[]);
  function nm(x){ var f=L.filter(function(r){ return r[0]===x; })[0]; return f?f[1]:""; }
  if(!k) return "-"; if(k==="sms_free") return "직접 쓴 문자";
  if(/_sms$/.test(k)){ var b=nm(k.replace(/_sms$/,"")); return (b||k.replace(/_sms$/,""))+" (문자)"; }
  if(k==="check_arrive_office") return (nm("check_arrive")||"차량 도착")+" (검사소 템플릿)";
  return nm(k)||k; }
function viewSendLog(){
  var d=new Date(); if(!SLOG.from){ SLOG.from=d.toISOString().slice(0,8)+"01"; SLOG.to=d.toISOString().slice(0,10); }
  $("main").innerHTML='<div class="dashhead"><h2>발송 기록</h2>'+
    '<div class="sub2">워시 · 체크 · 딜러 · 통합 입구에서 나간 알림톡과 문자를 한 곳에서 봐요. 알림톡이 안 되면 문자로 대신 나가고, 요금이 달라요. 줄을 누르면 자세히 보여요.</div></div>'+
    '<div id="slBody"><div class="hint">불러오는 중이에요…</div></div>';
  slLoad();
}
function slLoad(){
  if(SLOG.busy) return; SLOG.busy=true;
  var ym=SLOG.from.slice(0,7), whole=SLOG.from===ym+"-01" && SLOG.to.slice(0,7)===ym;
  Promise.all([
    api("hqSendLog",[SLOG.from, SLOG.to, {}]).then(function(r){ var L=r&&(r.list||r.rows||r.logs); if(!L && Array.isArray(r)) L=r;
      SLOG.need=(r&&r.need)?String(r.need):""; SLOG.list=(Array.isArray(L) && !(SLOG.need && !L.length))?L:null; SLOG.err=""; },   /* 목록이 없는 답 = 서버 새 판 전 */
      function(e){ SLOG.list=null; SLOG.err=e.message||""; }),
    whole ? api("hqSendSum",[ym]).then(function(r){ SLOG.sum=(r&&r.total)||null; }, function(){ SLOG.sum=null; }) : Promise.resolve(SLOG.sum=null)
  ]).then(function(){ SLOG.busy=false; slDraw(); });
}
function slDraw(){
  var host=$("slBody"); if(!host) return;
  var tools='<div class="tools"><label class="f" style="margin:0">기간</label><input type="date" id="slFrom" value="'+esc(SLOG.from)+'"><span>~</span><input type="date" id="slTo" value="'+esc(SLOG.to)+'">'+
    '<button class="btn" id="slGo">다시 불러오기</button><span class="sp"></span><button class="btn" id="slCheck" title="솔라피에 최종 결과를 다시 물어봐요. 10분마다 자동으로도 채워요.">결과 새로 받기</button></div>';
  if(SLOG.list===null){
    host.innerHTML=tools+'<div class="card"><div class="hint"><b>발송 기록은 서버 새 판이 아직이에요.</b><br>서버 방이 모든 제품의 발송 기록 창구를 올리면 이 화면에 바로 보여요. 지금 나가는 알림톡 · 문자는 그대로 나가요.'+
      (SLOG.err?'<br><span style="opacity:.7">서버 안내: '+esc(SLOG.err)+'</span>':'')+'</div></div>';
    slBind(); return; }
  var L=SLOG.list, ata=0, sms=0, sent=0, fail=0, skip=0, won0=0;
  L.forEach(function(r){ var k=slRes(r); if(k==="ata") ata++; else if(k==="sms") sms++; else if(k==="sent") sent++; else if(k==="fail") fail++; else if(k==="skip") skip++;
    if(k==="ata"||k==="sms"||k==="sent") won0+=SL_COST[k==="ata"?"ata":slVia(r)]||SL_COST.sms; });
  var T=SLOG.sum; if(T){ ata=Number(T.ata)||0; sms=Number(T.sms)||0; sent=Number(T.sent)||0; fail=Number(T.fail)||0; skip=Number(T.skip)||0; won0=Number(T.cost)||0; }
  var thisMonth=SLOG.from===new Date().toISOString().slice(0,8)+"01";
  host.innerHTML=tools+'<div id="slK"></div>'+
    '<div class="hint" style="margin:-6px 0 12px">요금은 대략이에요: 알림톡 13원 · SMS 18원 · LMS 45원 · MMS 110원 (VAT 별도). 정확한 금액은 솔라피 청구서를 봐 주세요.</div>'+
    '<div id="tSL"></div>';
  CGG.kpis($("slK"),[
    {label:(thisMonth?"이번 달 ":"이 기간 ")+"알림톡 도착", value:String(ata), unit:"건", color:"#1E9E5A"},
    {label:"문자 대체 · 문자 도착", value:String(sms+sent), unit:"건", color:"#E08A00"},
    {label:"실패"+(skip?" (안 보냄 "+skip+"건 따로)":""), value:String(fail), unit:"건", color:"#D64545"},
    {label:"대략 요금 (VAT 별도)", value:won(won0).replace(/원$/,""), unit:"원", color:"#0B2545"}]);
  var prods=[], shops=[], tpls=[];
  var rows=L.map(function(r,i){ var p=String(slv(r,["product","prod","app"],"워시")), sh=String(slv(r,["shopName","shop_name","shop","office"],"-")), tk=String(slv(r,["tpl","template","tplKey","key"],""));
    if(prods.indexOf(p)<0) prods.push(p); if(shops.indexOf(sh)<0) shops.push(sh); if(tk && tpls.indexOf(tk)<0) tpls.push(tk);
    return {i:i, at:String(slv(r,["at","created_at","sentAt"],"")).slice(5,16).replace("T"," "), atFull:String(slv(r,["at","created_at","sentAt"],"")),
      product:p, shop:sh, tk:tk, tpl:slTplName(tk), to:slMask(slv(r,["to","to_mask","phone","receiver"],"")), via:{ata:"알림톡",sms:"SMS",lms:"LMS",mms:"MMS"}[slVia(r)],
      res:slRes(r), raw:r}; });
  makeTable({ id:"tSL", sortKey:"atFull", sortDir:"desc", rowId:function(r){ return String(r.i); },
    tabs:[["","전체"],["ata","알림톡 도착"],["sent","문자 도착"],["sms","문자 대체"],["fail","실패"],["skip","안 보냄"],["wait","대기"]], tabOf:function(r){ return r.res; },
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
  if($("slCheck")) $("slCheck").onclick=function(){ var b=$("slCheck"); b.disabled=true;
    api("hqSendCheck",[]).then(function(r){ toast("결과를 새로 받았어요"+(r&&r.n!=null?" · "+Number(r.n)+"건":"")); slLoad(); },
      function(e){ b.disabled=false; toast(emsg(e,"결과를 받지 못했어요. 다시 시도해 주세요."),true); }); };
}
/* 자세히 창 — 받는 번호는 가린 모양, 본문은 템플릿 이름뿐 (서버도 본문을 남기지 않아요) */
function slDetail(r){ if(!r) return; var x=r.raw, R=SL_RES[r.res];
  var err=String(slv(x,["err","error","reason"],""));
  CGG.dialog({size:"detail", title:"발송 기록 자세히", desc:r.shop+" · "+r.tpl,
    rows:[["시각",String(r.atFull).slice(0,19).replace("T"," ")],["제품",r.product],["업체",r.shop],["템플릿",r.tpl+(r.tk?" ("+r.tk+")":"")],
          ["받는 번호",r.to],["보낸 방법",r.via],["결과",R[0]],["대략 요금",(r.res==="ata"||r.res==="sms"||r.res==="sent")?won(SL_COST[{알림톡:"ata",SMS:"sms",LMS:"lms",MMS:"mms"}[r.via]]||0)+" (VAT 별도)":"0원"],
          ["솔라피 번호",String(slv(x,["msgId","messageId","msg_id"],"-"))]].concat(slv(x,["ref"],"")?[["관련 번호",String(x.ref)]]:[])
          .concat(Array.isArray(x.vars)&&x.vars.length?[["넣은 말 (이름만)",x.vars.join(" · ")]]:[]).concat(err?[["안 된 이유",err]]:[]),
    cancel:"닫기"});
}
