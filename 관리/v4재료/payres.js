/* ═══════ 받는 금액 › 결제 내역 — 모든 제품 결제 결과 한 화면 (관리 v4.3 시안) ═══════
   근거: 결제/03_설계_초안.md «관리에서 보는 결제 결과» · 서버/설계/14 (워시 sb12, 보안 설계 검토 중)
     hqPayResults([시작일, 끝일, 걸러보기]) → 줄 목록 {product(꼬리표), at, shop, shopName, kind, method, amount, status, period, orderId, from, office, payId?}
       꼬리표: 워시 · 체크 · <검사소명> · 자동 결제 · 환불 · 홈페이지 가입 · 계좌 입금(수동) · 딜러 청구서
       딜러 청구서 금액은 참고용 — 합계에서 빼요 (차곳간을 거치지 않는 돈)
   서버 새 판이 없으면 지금까지의 «결제 내역»(계좌 입금 장부)을 그대로 보여 줘요. */
var PR2 = {from:"", to:"", rows:null, err:"", busy:false};
function prTagKind(t){ t=String(t||"");
  if(t.indexOf("딜러")===0) return "dealer"; if(t.indexOf("환불")===0) return "refund"; if(t.indexOf("자동")===0) return "bill";
  if(t.indexOf("홈페이지")===0) return "home"; if(t.indexOf("계좌")===0) return "bank"; if(t.indexOf("체크")===0) return "check"; return "wash"; }
var PR_TAGS=[["","제품 전체"],["wash","워시"],["check","체크"],["bill","자동 결제"],["refund","환불"],["home","홈페이지 가입"],["bank","계좌 입금"],["dealer","딜러 청구서"]];
function prTagPill(t){ var k=prTagKind(t), c={wash:"run",check:"ok",bill:"run",refund:"off",home:"wait",bank:"gray",dealer:"gray"}[k];
  return '<span class="pill '+c+'">'+esc(t||"워시")+'</span>'; }
function prStPill(s){ s=String(s||"");
  var c=/결제됨|입금 확인|paid|done/i.test(s)?"ok":(/실패|fail|기한 지남/i.test(s)?"off":(/환불|cancel/i.test(s)?"gray":"wait"));
  var t=({paid:"결제됨",ready:"입금 전",failed:"실패",canceled:"환불됨",pending:"결제 중"})[s]||s;
  return '<span class="pill '+c+'">'+esc(t)+'</span>'; }
function viewPays(){
  var d=new Date(); if(!PR2.from){ PR2.from=d.toISOString().slice(0,8)+"01"; PR2.to=d.toISOString().slice(0,10); }
  $("main").innerHTML='<div class="dashhead"><h2>결제 내역</h2>'+
    '<div class="sub2">워시 · 체크 · 자동 결제 · 환불 · 홈페이지 가입 · 계좌 입금 · 딜러 청구서를 한 목록으로 봐요.</div></div>'+
    '<div id="prBody"><div class="hint">불러오는 중이에요…</div></div>';
  prLoad();
}
function prLoad(){
  if(PR2.busy) return; PR2.busy=true;
  api("hqPayResults",[PR2.from, PR2.to, {}]).then(function(r){ PR2.rows=(r&&(r.rows||r.list||r.results))||(Array.isArray(r)?r:[]); PR2.err=""; },
    function(e){ PR2.rows=null; PR2.err=e.message||"불러오지 못했습니다"; })
  .then(function(){ PR2.busy=false; if(PR2.rows===null){ viewPaysOld(); prOldNote(); } else prDraw(); });
}
function prOldNote(){
  var dh=$("main").querySelector(".dashhead .sub2");
  if(dh) dh.insertAdjacentHTML("afterend",'<div class="hint" style="margin:6px 0 0">모든 제품 결제 결과는 서버 새 판(워시 sb12)이 올라가면 이 화면에 함께 보여요. 지금은 계좌 입금 장부만 보여요.</div>');
}
function prDraw(){
  var host=$("prBody"); if(!host) return;
  var rows=PR2.rows||[], ym=new Date().toISOString().slice(0,7);
  var real=rows.filter(function(r){ return prTagKind(r.product)!=="dealer"; });
  var got=real.filter(function(r){ var k=prTagKind(r.product); return k!=="refund" && /결제됨|입금 확인|paid/i.test(String(r.status)); }).reduce(function(a,b){ return a+(Number(b.amount)||0); },0);
  var ref=real.filter(function(r){ return prTagKind(r.product)==="refund"; }).reduce(function(a,b){ return a+Math.abs(Number(b.amount)||0); },0);
  var bad=real.filter(function(r){ return /실패|fail|결제 중|pending/i.test(String(r.status)); }).length;
  var billShops={}; real.forEach(function(r){ if(prTagKind(r.product)==="bill" && /결제됨|paid/i.test(String(r.status))) billShops[r.shop]=1; });
  host.innerHTML=
    '<div class="j-kpis">'+
      [["받은 금액 (차곳간)",won(got),"#1668C4","딜러 청구서는 빼고 셈"],["환불 합계",won(ref),"#D64545",""],
       ["실패 · 결제 중",bad+"건","#E08A00",bad?"확인이 필요해요":"없어요"],["자동 결제 업체",Object.keys(billShops).length+"곳","#0B2545","이 기간에 자동 결제된 곳"]].map(function(x){
        return '<div class="j-kpi"><small><i style="background:'+x[2]+'"></i>'+esc(x[0])+'</small><strong style="font-size:24px">'+x[1]+'</strong><span class="tr">'+esc(x[3])+'</span></div>'; }).join("")+
    '</div>'+
    '<div class="tools"><label class="f" style="margin:0">기간</label><input type="date" id="prFrom" value="'+esc(PR2.from)+'"><span>~</span><input type="date" id="prTo" value="'+esc(PR2.to)+'">'+
      '<button class="btn" id="prGo">다시 불러오기</button><span class="sp"></span><button class="btn" id="payNew">청구 만들기</button></div>'+
    '<div id="tPR"></div>';
  $("prGo").onclick=function(){ PR2.from=$("prFrom").value; PR2.to=$("prTo").value; prLoad(); };
  $("payNew").onclick=payAddSheet;
  makeTable({ id:"tPR", sortKey:"at", sortDir:"desc",
    rows:rows.map(function(r,i){ var k=prTagKind(r.product);
      return { i:i, at:String(r.at||"").slice(0,16).replace("T"," "), tag:String(r.product||"워시"), tk:k,
        shop:String(r.shopName||r.shop||"")+(r.office&&k==="check"?" ← "+r.office:""), kind:String(r.kind||""), method:String(r.method||""),
        amount:Number(r.amount)||0, status:String(r.status||""), period:String(r.period||""), oid:String(r.orderId||""), raw:r }; }),
    search:["shop","oid","tag"],
    filters:[{k:"tk",label:"제품",opts:PR_TAGS},
             {k:"status",label:"상태",opts:[["","상태 전체"]].concat(rows.map(function(r){ return String(r.status||""); }).filter(function(v,i,a){ return v&&a.indexOf(v)===i; }).map(function(v){ return [v,v]; }))}],
    cols:[
      {k:"at",label:"시각",w:130,stick:true},
      {k:"tag",label:"제품",w:120,html:function(r){ return prTagPill(r.tag); }},
      {k:"shop",label:"업체",w:170},
      {k:"kind",label:"종류",w:90},
      {k:"method",label:"수단",w:100},
      {k:"amount",label:"금액",w:120,num:true,html:function(r){
        var t=(r.tk==="refund"?"−":"")+won(Math.abs(r.amount));
        return r.tk==="dealer"?'<span style="opacity:.55" title="참고용 — 합계에서 빠져요">'+t+'</span>':t; }},
      {k:"status",label:"상태",w:104,html:function(r){ return prStPill(r.status); }},
      {k:"period",label:"이용기간",w:96},
      {k:"oid",label:"주문번호",w:170,mono:true},
      {k:"_a",label:"할 일",w:100,nosort:true,html:function(r){
        if(r.oid && /결제됨|paid/i.test(r.status) && ["wash","check","bill","home"].indexOf(r.tk)>=0)
          return '<button type="button" class="btn sm" data-prf="'+r.i+'">환불</button>';
        if(r.raw.payId && /입금 전|ready/i.test(r.status)) return '<button type="button" class="btn sm" data-prp="'+esc(r.raw.payId)+'">입금 확인</button>';
        return ''; }}
    ]});
  Array.prototype.forEach.call(document.querySelectorAll("[data-prf]"),function(b){
    b.onclick=function(ev){ ev.stopPropagation(); var r=rows[Number(b.getAttribute("data-prf"))];
      refundSheet(String(r.orderId),{shop:String(r.shopName||r.shop||""), kind:String(r.kind||r.product||"")}); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-prp]"),function(b){
    b.onclick=function(ev){ ev.stopPropagation(); paySheet(b.getAttribute("data-prp")); }; });
}
