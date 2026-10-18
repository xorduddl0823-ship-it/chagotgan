<script>
/* ═══ v54 — 대표님 TEST(10/18) 고침
   ② 월별 청구서: 거래처에 없는 «신청인»의 차는 청구서에 안 들어가요(서버 invoiceBuild 는 딜러가 이어진 차만 셈)
      → «거래처에 없는 신청인 넣고 청구서 다시 만들기»(대표만): 이름 목록 확인 창 → dealerAddMissing(이 달) → invoiceBuild
      서버가 번호 없는 청구서(bill_to_id 빈 것)를 보내 주면 «번호 없음 · 거래처에 넣기» 띠로 같은 길 (서버 방 요청)
   ① 청구서 지우기 뒤 이 달 청구서가 모두 없어지면 invoiceList(auto) 가 저절로 다시 만들어요 → 그 달은 저절로 만들기를 꺼요
      («청구서 만들기»를 누르면 다시 켜져요) ═══ */
(function(){
var KEY="cgg_noauto";
function rd(){ try{ return JSON.parse(localStorage.getItem(KEY)||"{}")||{}; }catch(e){ return {}; } }
function wr(o){ try{ localStorage.setItem(KEY, JSON.stringify(o)); }catch(e){} }
var MEMO=rd();
window.chkNoAuto=function(ym){ return !!MEMO[ym]; };
window.chkNoAutoSet=function(ym, on){ if(on) MEMO[ym]=1; else delete MEMO[ym]; wr(MEMO); };

/* 거래처에 없는 신청인 넣고 청구서 다시 만들기 */
function addGo(){
  if(!isOwner()){ tell("대표만 할 수 있어요","거래처에 딜러를 넣는 것은 대표 계정으로 해 주세요."); return; }
  var ym=ST.ym; busy(true);
  call("carHealth",[ym]).then(function(h){
    busy(false); h=h||{};
    var top=Array.isArray(h.top)?h.top:[], n=Number(h.noDealer)||0;
    if(!n&&!top.length){ tell("넣을 신청인이 없어요", esc(ymText(ym))+" 차는 모두 거래처 딜러와 이어져 있어요."); return; }
    ask({title:"거래처에 없는 신청인을 딜러로 넣고 청구서를 다시 만들까요?\n"+ymText(ym)+" · 이어지지 않은 차 "+won(n)+"대",
         rows:top.map(function(t){ return [esc(t.name||"(비어 있음)"), won(Number(t.n)||0)+"대"]; }), rowsTitle:"넣을 신청인"+(top.length>=15?" (많으면 15명까지 보여요)":""),
         warn:"신청인 이름으로 딜러를, 회사명으로 상사를 만들어요. 계산서를 끊었거나 입금된 청구서는 그대로 둬요.",
         yes:"넣고 다시 만들기"}, function(){
      bar("신청인을 거래처에 넣는 중이에요…","info"); busy(true);
      call("dealerAddMissing",[ym]).then(function(r){
        r=r||{}; chkNoAutoSet(ym,false);
        return call("invoiceBuild",[ym,{keepZero:false}]).then(function(b){
          busy(false); DEALERS=[];
          bar("딜러 "+won(r.n||0)+"명을 넣고 "+won(r.linked||0)+"대를 이었어요 · "+ymText(ym)+" 청구서 "+won((b&&b.n)||0)+"장을 다시 만들었어요. 사업자번호는 설정 › 거래처에서 채워 주세요.","ok");
          refresh(["set","up","bill","sales"]); });
      }).catch(function(e){ busy(false); fail(e); });
    });
  }).catch(function(e){ busy(false); fail(e); });
}
window.chkAddMissing=addGo;
var ab=AFTER.bill;
AFTER.bill=function(){ if(ab) ab.apply(this,arguments);
  var fx=$("bFix");
  if(fx && isOwner() && !$("bAddMiss")){ var b=document.createElement("button"); b.type="button"; b.id="bAddMiss"; b.className="btn small go"; b.textContent="거래처에 없는 신청인 넣고 청구서 다시 만들기";
    fx.parentNode.insertBefore(b, fx); b.onclick=addGo; }
  var noId=(BILLS||[]).filter(function(x){ return x.noId; });
  if(noId.length && !$("v54NoId")){
    var h=$("main").querySelector(".cgg-head"); if(!h) return;
    var box=document.createElement("div"); box.id="v54NoId"; box.className="cgg-band chk"; box.setAttribute("role","status");
    box.innerHTML='<span class="tx">번호 없음(거래처에 없는 신청인) '+won(noId.length)+'곳 — '+esc(noId.slice(0,3).map(function(x){ return x.name; }).join(", "))+(noId.length>3?" 외":"")+'</span>'+
      (isOwner()?'<button type="button" class="cgg-btn pri">거래처에 넣기</button>':'');
    var bd=$("chkBand"); h.parentNode.insertBefore(box,(bd&&bd.parentNode===h.parentNode)?bd.nextSibling:h.nextSibling);
    var bt=box.querySelector("button"); if(bt) bt.onclick=addGo;
  }
};
})();
</script>
