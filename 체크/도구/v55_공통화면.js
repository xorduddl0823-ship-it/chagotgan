<script>
/* ═══ v55 — 공통 화면(대표님 10/18 결정 · 운영/04)
   세금계산서 = 시안 A안 + 체크 전용 기능 그대로 · 입·출금 내역 · 배달 = 워시 v134 지금 화면과 같게(체크 전용 칸은 체크에만)
   설정 = 항목 차례 · 이름만 시안대로(항목 목록 모양은 사용자가 고른 메뉴 모양 — 가로 위 / 세로 왼쪽 — 을 따라요)
   단추 · 창구 · 셈은 v54 그대로 — 차례 · 이름 · 숫자 칸 · 할 일 띠만 바꿔요 ═══ */
(function(){
/* ── 할 일 띠 ── */
BANDS.hometax=function(){
  if(!(OFFICE.popbill_userid && OFFICE.biz_no)) return {count:1, tone:"stop", text:"팝빌 회원아이디나 사업자번호가 비어 있어요", go:"연결 · 팝빌로", onGo:function(){ go("popbill"); }};
  var able=TAXES.filter(function(t){ return t.can && !t.skip && !/발급|전송/.test(t.state||""); }), tot=0;
  able.forEach(function(t){ tot+=Number(t.total)||0; });
  return {count:able.length, text:"발급할 곳 "+able.length+"곳 · "+won(tot)+"원", empty:"발급할 곳이 없어요 — 입금이 끝나면 여기에 떠요",
    onGo:function(){ var t=$("htx-blk"); if(t) CGG.spot(t); }};
};
BANDS.deposit=function(){
  var w=DEPS.filter(function(d){ return d.state==="확인 대기"; });
  if(w.length) return {count:w.length, text:"누가 보낸 돈인지 확인할 입금 "+w.length+"건 · "+won(w.reduce(function(t,d){ return t+(Number(d.amount)||0); },0))+"원",
    onGo:function(){ perSet("dep","all"); var x=ts("dep"); x.tf="확인 필요"; x.page=1; draw(); var t=$("dep-blk"); if(t) CGG.spot(t); }};
  var L=(BILLS||[]).filter(function(b){ return Number(b.left)>0; }), s=0; L.forEach(function(b){ s+=Number(b.left)||0; });
  return {count:L.length, tone:"run", text:"받을 금액 "+won(s)+"원 · "+L.length+"곳", go:"받을 금액 보기", empty:"받을 금액도 확인할 입금도 없어요",
    onGo:function(){ go("recv"); }};
};
BANDS.deliv=function(){
  var f=DRIVES.filter(function(d){ return d.alarm==="못 보냄"; }).length;
  return {count:f, text:"도착 알림을 못 보낸 차 "+f+"대", empty:"못 보낸 도착 알림이 없어요",
    onGo:function(){ var t=$("drv-blk"); if(t) CGG.spot(t); }};
};
BANDS.recv=function(){
  var L=(BILLS||[]).filter(function(b){ return Number(b.left)>0; }), s=0; L.forEach(function(b){ s+=Number(b.left)||0; });
  return {count:L.length, text:"아직 다 안 들어온 곳 "+L.length+"곳 · "+won(s)+"원", empty:"받을 금액이 없어요",
    onGo:function(){ var t=$("rcv-blk"); if(t) CGG.spot(t); }};
};

/* ── 세금계산서 › 보낸 계산서만 보기 ── */
var ah=AFTER.hometax;
AFTER.hometax=function(){ if(ah) ah.apply(this,arguments);
  var b=$("txDoneOnly"); if(b) b.onclick=function(){ TXFIL="done"; var f=$("txFil"); if(f) f.value="done"; refresh(["tax"]); };
};

/* ── 기간 칸 — 워시 입·출금 내역 · 출고 기록과 같은 모양: 오늘 · 어제 · 최근 7일 · 이번 달 · 지난 달 · 날짜 ~ 날짜 · 검색 (표만 거름) ── */
function kst(){ return new Date(Date.now()+9*3600e3); }
function ymd(d){ return d.toISOString().slice(0,10); }
function rangeOf(k){
  var n=kst(), t=ymd(n), y=ymd(new Date(n.getTime()-864e5)), w=ymd(new Date(n.getTime()-6*864e5));
  var m1=t.slice(0,8)+"01", pe=ymd(new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 0))), p1=pe.slice(0,8)+"01";
  return k==="today"?[t,t] : k==="yday"?[y,y] : k==="7"?[w,t] : k==="month"?[m1,t] : k==="prev"?[p1,pe] : k==="30"?[ymd(new Date(n.getTime()-29*864e5)),t] : ["",""];
}
var PER={dep:{k:"month"}, drv:{k:"30"}};
window.perSet=function(id,k){ var r=rangeOf(k); PER[id]={k:k, f:r[0], t:r[1]}; if(ts(id==="dep"?"dep":"drv")) ts(id==="dep"?"dep":"drv").page=1; };
perSet("dep","month"); perSet("drv","30");
function dayOf(d){ var m=String(d.day||d.at||"").match(/(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})/); return m?m[1]+"-"+("0"+m[2]).slice(-2)+"-"+("0"+m[3]).slice(-2):""; }
window.perFilter=function(id,L){ var P=PER[id]||{}; if(!P.f&&!P.t) return (L||[]).slice();
  return (L||[]).filter(function(d){ var x=dayOf(d); return x && (!P.f||x>=P.f) && (!P.t||x<=P.t); }); };
window.perBox=function(id){ var P=PER[id]||{};
  return '<div class="card v55-per"><div class="tools" role="group" aria-label="기간">'+[["today","오늘"],["yday","어제"],["7","최근 7일"],["month","이번 달"],["prev","지난 달"]].map(function(x){
    return '<button type="button" class="btn'+(P.k===x[0]?' on':'')+'" data-per="'+id+'|'+x[0]+'" aria-pressed="'+(P.k===x[0])+'">'+x[1]+'</button>'; }).join("")+
    '<input type="date" id="pf-'+id+'" value="'+esc(P.f||"")+'" aria-label="시작 날짜"><span class="v55-tilde">~</span><input type="date" id="pt-'+id+'" value="'+esc(P.t||"")+'" aria-label="끝 날짜">'+
    '<button type="button" class="btn primary" data-pergo="'+id+'">검색</button></div></div>'; };
function perWire(){
  document.querySelectorAll("[data-per]").forEach(function(b){ b.onclick=function(){ var v=b.getAttribute("data-per").split("|"); perSet(v[0],v[1]); draw(); }; });
  document.querySelectorAll("[data-pergo]").forEach(function(b){ b.onclick=function(){ var id=b.getAttribute("data-pergo"), f=($("pf-"+id)||{}).value||"", t=($("pt-"+id)||{}).value||"";
    if(f&&t&&f>t){ var z=f; f=t; t=z; } PER[id]={k:"", f:f, t:t}; var x=ts(id); if(x) x.page=1; draw(); }; });
}
var ad=AFTER.deposit;
AFTER.deposit=function(){ if(ad) ad.apply(this,arguments); perWire();
  var c=$("depBankGo"); if(c) c.onclick=function(){ go("popbill"); };
  /* 워시처럼 표 아래로: 팝빌에서 가져오기 칸 */
  var pull=$("depPull"), pc=pull&&pull.closest(".card"), bank=$("depBankGo"), bc=bank&&bank.closest(".card");
  if(pc&&bc&&bc.parentNode){ bc.parentNode.insertBefore(pc, bc); var h=pc.querySelector("h3"); if(h) h.textContent="팝빌에서 가져오기 · 다시 맞추기"; }
};
var av=AFTER.deliv;
AFTER.deliv=function(){ if(av) av.apply(this,arguments); perWire(); };

/* ── 입·출금 내역 › 받을 금액 ── */
PAGE.recv=function(){
  var L=(BILLS||[]).filter(function(b){ return Number(b.left)>0; }).map(function(b){
    return {id:b.id, name:b.name, total:Number(b.total)||0, paid:Number(b.paid)||0, left:Number(b.left)||0, sent:b.sent?"보냄":"안 보냄", _q:b.name}; });
  var s=0, part=0; L.forEach(function(r){ s+=r.left; if(r.paid>0) part++; });
  return head("받을 금액 <em>"+won(s)+"원</em>", ymText(ST.ym)+" 청구서 가운데 아직 다 안 들어온 곳이에요. 입금이 들어오면 «입금·출금»에서 맞춰요.")+
    '<div class="tools">'+ymPicker("rcYm","청구 달")+'</div>'+
    sums([["받을 곳",won(L.length)+"곳"],["받을 금액",won(s)+"원",s?"bad":""],["일부 입금",won(part)+"곳"],["청구서",won((BILLS||[]).length)+"곳"]])+
    card("받을 곳","이름을 누르면 월별 청구서로 가요.",
      tableBlock("rcv",[
        {k:"name",t:"청구처",name:true,fmt:function(v){ return '<a href="#" data-rcgo="1"><b>'+esc(v)+'</b></a>'; }},
        {k:"total",t:"청구",num:true,fmt:function(v){ return won(v); }},
        {k:"paid",t:"들어온 돈",num:true,fmt:function(v){ return won(v); }},
        {k:"left",t:"받을 금액",num:true,fmt:function(v){ return '<span style="color:var(--danger);font-weight:800">'+won(v)+'</span>'; }},
        {k:"sent",t:"청구서",fmt:function(v){ return '<span class="cgg-st '+(v==="보냄"?"done":"chk")+'">'+esc(v)+'</span>'; }}
      ], L, {}))+
    CGG.help("받을 금액 = 청구 − 들어온 돈이에요. 입금은 «입금·출금»에서 청구서와 맞추면 여기서 빠져요.","이 화면 사용법");
};
NEEDS.recv=["bill"];
AFTER.recv=function(){ wireTable("rcv",function(){ draw(); }); wireYm("rcYm",["bill"]);
  document.querySelectorAll("[data-rcgo]").forEach(function(a){ a.onclick=function(e){ e.preventDefault(); go("bill"); }; });
};

/* ── 설정 › 우리 사업장 (거래처 화면에서 나눔) ── */
function splitPartner(){
  var tmp=document.createElement("div"); tmp.innerHTML=PAGE._partnerAll();
  var cards=tmp.querySelectorAll(".card"); return {cards:cards};
}
PAGE._partnerAll=PAGE.partner;
PAGE.partner=function(){
  var c=splitPartner().cards;
  return head("거래처","딜러 · 매매상사를 넣고, 세금계산서를 누구 이름으로 끊을지 정해요.")+(c[0]?c[0].outerHTML:"");
};
PAGE.office=function(){
  var c=splitPartner().cards, out="";
  for(var i=1;i<c.length;i++) out+=c[i].outerHTML;
  return head("우리 사업장","세금계산서 · 청구서에 찍히는 정보예요. 상호는 맨 위 이름 · 알림 보내는 이름에도 쓰여요.")+out;
};
NEEDS.office=NEEDS.partner;
AFTER.office=function(){ if(AFTER.partner) AFTER.partner.apply(this,arguments); };

/* ── 설정 › 자료 올리기 (카모두 명부 · 첫날 쓰는 순서) ── */
PAGE.roster=function(){
  var own=isOwner();
  return head("명부 올리기","카모두에서 받은 상사 · 딜러 명부를 올려요. 처음 쓰는 날은 아래 «첫날 쓰는 순서»대로 하면 돼요.")+
  card("카모두 상사명부 · 딜러명부","카모두 상사리스트 · 딜러리스트 엑셀을 그대로 올려요. 영업 · 재직만 들어가고, 이미 있는 이름은 건너뛰어요.",
    own?'<div class="tools"><button type="button" class="btn primary" id="rsComp">① 상사명부 올리기</button><button type="button" class="btn primary" id="rsDealer">② 딜러명부 올리기</button><button type="button" class="btn" id="rsTpl">거래처 양식 받기 (CSV)</button></div>'
       :'<p class="note">명부 올리기는 대표만 할 수 있어요.</p>')+
  card("접수리스트 · 나스 엑셀","카모두 접수리스트와 나스 전산외 · 정비비 엑셀은 매출 › 자료 올리기에서 올려요.",
    '<div class="tools"><button type="button" class="btn" id="rsFiles">매출 › 자료 올리기로 가기</button></div>')+
  card("첫날 쓰는 순서","위에서부터 하나씩 하면 그달 청구서까지 나와요.",
    '<ol class="v55-steps">'+
    '<li><b>카모두 상사명부</b> 올리기 — 위 «① 상사명부 올리기»</li>'+
    '<li><b>카모두 딜러명부</b> 올리기 — 위 «② 딜러명부 올리기»</li>'+
    '<li><b>단가표</b> «가온 규칙으로 맞추기» <button type="button" class="btn small" data-v55go="price">단가표로</button></li>'+
    '<li><b>접수리스트</b> 올리기 (청구할 달) <button type="button" class="btn small" data-v55go="files">매출 › 자료 올리기로</button></li>'+
    '<li><b>청구서</b> 확인 — 청구처 수 · 총계가 나스 «가온 정산»과 같으면 맞아요 <button type="button" class="btn small" data-v55go="bill">월별 청구서로</button></li>'+
    '</ol>');
};
NEEDS.roster=["set"];
AFTER.roster=function(){
  var o=function(){ if(COMPS===null){ tell("아직 쓸 수 없어요","서버를 새로 올려야 쓸 수 있어요(체크 서버 v34). 차곳간에 알려 주세요."); return; } if(window.chkCsvOpen) chkCsvOpen(); };
  var a=$("rsComp"); if(a) a.onclick=o; var b=$("rsDealer"); if(b) b.onclick=o;
  var t=$("rsTpl"); if(t) t.onclick=function(){ if(window.chkCsvTpl) chkCsvTpl(); };
  var f=$("rsFiles"); if(f) f.onclick=function(){ go("files"); };
  document.querySelectorAll("[data-v55go]").forEach(function(x){ x.onclick=function(){ go(x.getAttribute("data-v55go")); }; });
};

})();
</script>
<style>
/* v55 기간 칸 (워시와 같게) */
.v55-per .tools{margin:0;flex-wrap:wrap;align-items:center}
.v55-per .btn.on{background:var(--brand-soft);color:var(--brand);border-color:var(--brand)}
.v55-per input[type=date]{width:auto;min-width:150px}
.v55-tilde{color:var(--muted);padding:0 2px}

.v55-steps{margin:0;padding-left:22px;display:grid;gap:10px;font-size:15px}
.v55-steps li{line-height:1.6}
.v55-steps .btn{margin-left:8px}
</style>
