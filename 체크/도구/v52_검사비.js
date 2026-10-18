<script>
/* ═══ v52 — 서버 check-api v44(검사비 셈 바로잡기)에 맞춘 화면
   · 매출 · 월별 청구서: «단가표에 없는 상품명 ○○ N대» · «금액 넣을 수출 가성능 N대» 알림 (salesStat rows[].unknown · feeNeed)
   · 월별 청구서: «수출 가성능 금액 넣기» — 이 달 청구서 줄(invoiceRows) 가운데 수출 가성능 차마다 검사비(부가세 별도) → carFeeSet (대표만)
   unknown[].goods 는 엑셀에서 온 글이라 늘 esc (보안 방 당부) ═══ */
(function(){
var EXP=/수출\s*가성능/;
function salesOf(ym){ return (SALES||[]).filter(function(x){ return x.ym===ym; })[0]||null; }
function warnText(r){
  if(!r) return "";
  var t=[], u=Array.isArray(r.unknown)?r.unknown:[];
  if(u.length) t.push("단가표에 없는 상품명 "+u.slice(0,3).map(function(x){ return "«"+String(x.goods||"")+"» "+(Number(x.n)||0)+"대"; }).join(", ")+(u.length>3?" 외 "+(u.length-3)+"가지":"")+" — 0원으로 셈했어요");
  if(Number(r.feeNeed)>0) t.push("금액 넣을 수출 가성능 "+Number(r.feeNeed)+"대");
  return t.join(" · ");
}
function addBand(id, text, btn, onBtn){
  if(!text||$(id)) return;
  var h=$("main").querySelector(".cgg-head"); if(!h) return;
  var box=document.createElement("div"); box.id=id; box.className="cgg-band chk"; box.setAttribute("role","status");
  box.innerHTML='<span class="tx">'+esc(text)+'</span>'+(btn?'<button type="button" class="cgg-btn pri">'+esc(btn)+'</button>':'');
  var bd=$("chkBand"); h.parentNode.insertBefore(box,(bd&&bd.parentNode===h.parentNode)?bd.nextSibling:h.nextSibling);
  var b=box.querySelector("button"); if(b) b.onclick=onBtn;
}
/* 수출 가성능 금액 넣기 */
function expGo(){
  if(!isOwner()){ tell("대표만 할 수 있어요","검사비 넣기는 대표 계정으로 해 주세요."); return; }
  if(!BILLS.length){ tell("이 달 청구서가 없어요","먼저 «청구서 만들기»를 눌러 주세요."); return; }
  busy(true); bar("청구서 줄을 불러오는 중…","info");
  billLoadRows(BILLS.slice()).then(function(){
    busy(false); bar("");
    var L=[]; BILLS.forEach(function(b){ (b.rows||[]).forEach(function(r){ if(r.car_id && EXP.test(String(r.item||""))) L.push({b:b, r:r}); }); });
    if(!L.length){ tell("수출 가성능 차가 없어요", esc(ymText(ST.ym))+" 청구서에 수출 가성능 줄이 없어요. 딜러가 이어지지 않은 차는 매출 › 자료 올리기에서 딜러를 먼저 이어 주세요."); return; }
    var seq={};
    CGG.dialog({size:"form", title:"수출 가성능 검사비 넣기", desc:ymText(ST.ym)+" · "+L.length+"대 · 금액은 부가세 별도 · 비운 칸은 그대로 둬요",
      body:'<div style="display:grid;gap:8px;max-height:52vh;overflow:auto">'+L.map(function(x,i){
        var k=x.b.name; seq[k]=(seq[k]||0)+1; var car=x.r.car||{};
        var who=(car.plate?car.plate+" · ":"")+(car.check_date?String(car.check_date).slice(5,10)+" · ":"")+x.b.name+(car.plate?"":" · "+seq[k]+"번째 수출 가성능");
        var v=Number(x.r.unit)||0;
        return '<label style="display:flex;gap:10px;align-items:center;font-weight:600;color:var(--text)"><span style="flex:1;min-width:0">'+esc(who)+'</span>'+
          '<input type="text" inputmode="numeric" maxlength="9" data-ex="'+i+'" value="'+(v?won(v):"")+'" data-was="'+(v?won(v):"")+'" placeholder="금액" style="width:130px;text-align:right" aria-label="'+esc(who)+' 검사비"> 원</label>'; }).join("")+'</div>'+
        '<div class="msg err" id="exErr" hidden style="margin-top:8px"></div>',
      ok:"저장", cancel:"닫기",
      onOk:function(){
        var e=$("exErr"), go=[];
        for(var i=0;i<L.length;i++){ var inp=document.querySelector('[data-ex="'+i+'"]'), typed=String(inp?inp.value:"").trim(), raw=typed.replace(/[^0-9]/g,"");
          if(!typed||typed===inp.getAttribute("data-was")) continue;   /* 빈칸 · 그대로인 칸은 안 보냄 (0 을 쳤으면 0원으로 보냄) */
          var fee=raw===""?0:Number(raw); if(!(fee>=0&&fee<=10000000)){ e.hidden=false; e.textContent=(i+1)+"번째 금액을 0~10,000,000원으로 넣어 주세요."; return false; }
          go.push({carId:String(L[i].r.car_id), fee:fee}); }
        if(!go.length){ CGG.closeDialog(); return; }
        var okb=document.querySelector(".cgg-dlg [data-dok]"); if(okb) okb.disabled=true;
        go.reduce(function(p,x){ return p.then(function(){ return call("carFeeSet",[x]); }); }, Promise.resolve()).then(function(){
          CGG.closeDialog(); bar(go.length+"대 검사비를 넣었어요. «청구서 만들기»를 한 번 더 누르면 청구서에 들어가요 (매출은 바로 바뀌어요).","ok"); refresh(["sales","bill"]);
        }).catch(function(er){ if(okb) okb.disabled=false; e.hidden=false; e.textContent=niceMsg(er&&er.message); });
        return false; }});
  }).catch(function(e){ busy(false); fail(e); });
}
var ab=AFTER.bill;
AFTER.bill=function(){ if(ab) ab.apply(this,arguments);
  var r=salesOf(ST.ym); addBand("v52Bill", warnText(r), (r&&Number(r.feeNeed)>0&&isOwner())?"수출 가성능 금액 넣기":"", expGo); };
var as=AFTER.sales;
AFTER.sales=function(){ if(as) as.apply(this,arguments);
  var r=(typeof HERO!=="undefined"&&SALES[HERO])||SALES[0]; var t=warnText(r);
  var unk=Array.isArray(r&&r.unknown)&&r.unknown.length, need=r&&Number(r.feeNeed)>0;
  if(t) addBand("v52Sales", (r?ymText(r.ym)+" · ":"")+t, !isOwner()?"":unk?"단가표 보기":need?"청구서에서 금액 넣기":"", function(){ if(unk){ go("price"); return; } if(r&&r.ym){ ST.ym=r.ym; try{ set("cgg_ym",r.ym); }catch(e){} } go("bill"); }); };
})();
</script>
