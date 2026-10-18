<script>
/* ═══ v51 — 검사비 금액 바로잡기 (대표님 10/18 «체크 금액이 안 맞아요»)
   까닭: 서버(invoiceBuild · salesStat)는 단가 항목을 «코드 = 접수리스트 상품명»으로만 찾아요. 코드가 비거나 이름과 다르면 못 찾고
         «금액 − 성능보험료»로 대신 셈해서 검사비가 부풀었어요. (선납_* 는 서버가 0원으로 셈해요)
   ① 단가 저장 때 코드가 비면 이름을 코드로 (만들기 도구에서 priceAddGo 고침)
   ② 단가표 화면 띠: «가온 규칙으로 맞추기» ~2026-05-31 국산 25,000 · 수입 35,000 / 2026-06-01~ 30,000 · 40,000 (부가세 별도, 대표님 확정)
      코드가 이름과 다른 항목이 있으면 «코드를 이름으로 맞추기»
   재검 · 가성능 0원 · 수출 가성능 손 입력 · 이름으로도 찾기는 서버 방 요청(체크/요청서/2026-10-18_검사비_단가_서버_요청.md) ═══ */
(function(){
var G1="2020-01-01", G2="2026-06-01", CARS=["국산차","수입차"];
var GAON={}; GAON[G1]={"국산차":25000,"수입차":35000}; GAON[G2]={"국산차":30000,"수입차":40000};
function nm(i){ return String(i.name||"").trim(); }
function cd(i){ return String(i.code||"").trim(); }
/* 서버는 코드 = 상품명으로 찾아요 — 이름이 있는데 코드가 다르면 못 찾아요 */
function badCode(i){ return !!nm(i) && cd(i)!==nm(i); }
function badN(){ var n=0; PRICE_BANDS.forEach(function(b){ b.items.forEach(function(i){ if(badCode(i)) n++; }); }); return n; }
function others(){ return PRICE_BANDS.filter(function(b){ return b.from!==G1&&b.from!==G2; }).map(function(b){ return b.from; }); }
function saveBands(list, done){
  busy(true);
  list.reduce(function(p,b){ return p.then(function(){ return call("priceSave",[{from:b.from, items:b.items}]); }); }, Promise.resolve())
    .then(function(){ busy(false); PRICE_OK=null; bar(done+" 매출은 바로 바뀌어요. 청구서는 그 달 «청구서 만들기»를 한 번 더 누르면 새 단가로 바뀌어요.","ok"); refresh(["set","sales","bill"]); })
    .catch(function(e){ busy(false); PRICE_OK=null; bar(niceMsg(e&&e.message)+" — 일부만 바뀌었을 수 있어요. 단가표를 보고 한 번 더 눌러 주세요.","err"); refresh(["set"]); });
}
/* 가온 규칙으로 맞추기 — 두 구간의 국산차 · 수입차만 바꾸고, 같은 구간의 다른 항목은 그대로 */
function gaonGo(){
  var chg=[], keepN=0;
  var list=[G1,G2].map(function(from){
    var old=(PRICE_BANDS.filter(function(b){ return b.from===from; })[0]||{items:[]}).items;
    var keep=old.filter(function(i){ return CARS.indexOf(cd(i))<0 && CARS.indexOf(nm(i))<0; }).map(function(i){ return {code:cd(i)||nm(i), name:i.name, price:i.price}; });
    keepN+=keep.length;
    CARS.forEach(function(c){ var was=old.filter(function(i){ return cd(i)===c||nm(i)===c; })[0];
      chg.push(from+" "+c+" "+(was?won(was.price):"없음")+" → "+won(GAON[from][c])+"원"); });
    return {from:from, items:CARS.map(function(c){ return {code:c, name:c, price:GAON[from][c]}; }).concat(keep)}; });
  var ot=others();
  ask({title:"가온 규칙으로 단가를 맞출까요?\n구간 2개 · 국산차 · 수입차 4줄 바꿈 · 다른 항목 "+keepN+"줄 그대로 (부가세 별도)",
       rows:chg.map(function(t){ return [esc(t),""]; }), rowsTitle:"바뀌는 줄",
       warn:ot.length?"따로 넣어 둔 구간("+esc(ot.join(", "))+")은 그 기간에 그 단가가 쓰여요. 틀렸으면 표에서 지워 주세요.":"", yes:"맞추기"}, function(){
    saveBands(list, "가온 규칙으로 단가를 맞췄어요.");
  });
}
/* 코드를 이름으로 맞추기 — 같은 구간에 이름이 같은 줄이 생기면(단가가 다르면) 멈추고 표에서 정리하게 */
function fixCodes(){
  var clash=[], gone=0;
  var list=PRICE_BANDS.filter(function(b){ return b.items.some(badCode); }).map(function(b){
    var by={}, items=[];
    b.items.forEach(function(i){ var k=nm(i)||cd(i), x={code:k, name:i.name||k, price:i.price};
      if(by[k]){ if(by[k].price!==x.price) clash.push(b.from+" «"+k+"» "+won(by[k].price)+" · "+won(x.price)+"원"); else gone++; return; }
      by[k]=x; items.push(x); });
    return {from:b.from, items:items}; });
  if(!list.length) return;
  if(clash.length){ tell("이름이 같은데 단가가 다른 줄이 있어요","표에서 하나를 지운 뒤 다시 눌러 주세요: "+esc(clash.join(" / "))); return; }
  ask({title:"코드를 이름과 같게 "+badN()+"줄 맞출까요?\n구간 "+list.length+"개"+(gone?" · 이름 · 단가가 똑같은 겹친 줄 "+gone+"개는 하나만 남겨요":""),
       k1:"구간", v1:list.map(function(b){ return b.from; }).join(", "), k2:"맞추는 값", v2:"항목 이름 그대로 (예: 국산차)", yes:"맞추기"}, function(){
    saveBands(list, "코드를 이름으로 맞췄어요.");
  });
}
var a=AFTER.price;
AFTER.price=function(){
  if(a) a.apply(this,arguments);
  if(PRICE_OK!==true||!isOwner()||$("v51Gaon")) return;
  var h=$("main").querySelector(".cgg-head"); if(!h) return;
  var n=badN(), ot=others();
  var has=function(from){ return CARS.every(function(c){ return PRICE_BANDS.some(function(b){ return b.from===from && b.items.some(function(i){ return cd(i)===c && i.price===GAON[from][c]; }); }); }); };
  var ok=has(G1)&&has(G2);
  var box=document.createElement("div"); box.id="v51Gaon";
  box.className="cgg-band "+(n||!ok||ot.length?"chk":"done"); box.setAttribute("role","status");
  box.innerHTML='<span class="tx">'+(n?"코드가 이름(상품명)과 다른 단가 "+n+"줄은 청구서 · 매출에 안 쓰여요 (금액이 부풀어요)"
      : !ok?"가온 규칙(2026-06-01 인상) 단가가 아직 없어요"
      : ot.length?"가온 규칙 단가는 들어 있어요 · 다른 구간 "+ot.length+"개("+esc(ot.join(", "))+")가 그 기간에 먼저 쓰여요"
      : "가온 규칙 단가가 들어 있어요 (2026-06-01 인상 · 선납 0원)")+'</span>'+
    (n?'<button type="button" class="cgg-btn" id="v51Fix">코드를 이름으로 맞추기</button>':'')+
    (ok?'':'<button type="button" class="cgg-btn pri" id="v51Go">가온 규칙으로 맞추기</button>');
  var bd=$("chkBand"); h.parentNode.insertBefore(box, (bd&&bd.parentNode===h.parentNode)?bd.nextSibling:h.nextSibling);
  var f=$("v51Fix"); if(f) f.onclick=fixCodes;
  var g=$("v51Go"); if(g) g.onclick=gaonGo;
};
})();
</script>
