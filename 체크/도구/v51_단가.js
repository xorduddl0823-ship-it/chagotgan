<script>
/* ═══ v51 — 검사비 금액 바로잡기 (대표님 10/18 «체크 금액이 안 맞아요»)
   까닭: 서버(invoiceBuild · salesStat)는 단가표 항목을 «코드 = 접수리스트 상품명»으로만 찾아요. 코드가 빈 항목은 못 찾고
         «금액 − 성능보험료»로 대신 셈해서 검사비가 부풀었어요.
   ① 단가 저장 때 코드가 비면 이름을 코드로 (만들기 도구에서 priceAddGo 고침)
   ② 단가표 화면에 «가온 규칙으로 맞추기»: ~2026-05-31 국산 25,000 · 수입 35,000 / 2026-06-01~ 30,000 · 40,000 (부가세 별도, 대표님 확정)
      코드가 이름과 다른 항목이 있으면 경고 + «코드를 이름으로 맞추기»
   재검 · 가성능 0원 · 수출 가성능 손 입력 · 이름으로도 찾기는 서버 방 요청(체크/요청서/2026-10-18_검사비_단가_서버_요청.md) ═══ */
(function(){
var GAON=[{from:"2020-01-01", items:[{code:"국산차",name:"국산차",price:25000},{code:"수입차",name:"수입차",price:35000}]},
          {from:"2026-06-01", items:[{code:"국산차",name:"국산차",price:30000},{code:"수입차",name:"수입차",price:40000}]}];
function badCode(i){ return String(i.code||"").trim()!==String(i.name||"").trim(); }   /* 서버는 코드 = 접수리스트 상품명으로 찾아요 */
function emptyCodes(){ var n=0; PRICE_BANDS.forEach(function(b){ b.items.forEach(function(i){ if(badCode(i)) n++; }); }); return n; }
function saveBands(list, done){
  busy(true);
  list.reduce(function(p,b){ return p.then(function(){ return call("priceSave",[{from:b.from, items:b.items}]); }); }, Promise.resolve())
    .then(function(){ busy(false); PRICE_OK=null; bar(done+" 매출은 바로 바뀌어요. 청구서는 그 달 «청구서 만들기»를 한 번 더 누르면 새 단가로 바뀌어요.","ok"); refresh(["set","sales","bill"]); })
    .catch(function(e){ busy(false); fail(e); });
}
/* 가온 규칙으로 맞추기 — 두 구간의 국산차 · 수입차만 바꾸고, 같은 날짜 구간에 있던 다른 항목은 그대로 둬요 */
function gaonGo(){
  var list=GAON.map(function(g){
    var old=(PRICE_BANDS.filter(function(b){ return b.from===g.from; })[0]||{items:[]}).items;
    var keep=old.filter(function(i){ var k=String(i.code||"").trim(), n=String(i.name||"").trim(); return ["국산차","수입차"].indexOf(k)<0 && ["국산차","수입차"].indexOf(n)<0; }).map(function(i){ return {code:String(i.code||i.name).trim(), name:i.name, price:i.price}; });
    return {from:g.from, items:g.items.concat(keep)}; });
  var later=PRICE_BANDS.filter(function(b){ return b.from!=="2020-01-01"&&b.from!=="2026-06-01"; }).map(function(b){ return b.from; });
  ask({title:"가온 규칙으로 단가를 맞출까요?", k1:"2026-05-31까지", v1:"국산차 25,000 · 수입차 35,000원 (부가세 별도)", k2:"2026-06-01부터", v2:"국산차 30,000 · 수입차 40,000원 (부가세 별도)",
       warn:"선납은 0원(대수만 셈)이에요. 재검 · 가성능 0원과 수출 가성능 손 입력은 서버 다음 판에서 확실히 돼요(요청함)."+(later.length?" 따로 넣어 둔 구간("+later.join(", ")+")이 있어 그 날짜부터 다음 구간까지는 그 구간 단가가 쓰여요 — 틀렸으면 표에서 지워 주세요.":""), yes:"맞추기"}, function(){
    saveBands(list, "가온 규칙으로 단가를 맞췄어요.");
  });
}
/* 코드가 빈 항목 → 이름을 코드로 */
function fixCodes(){
  var list=PRICE_BANDS.filter(function(b){ return b.items.some(badCode); })
    .map(function(b){ var seen={}; return {from:b.from, items:b.items.map(function(i){ return {code:String(i.name).trim(), name:i.name, price:i.price}; }).filter(function(i){ if(seen[i.code]) return false; seen[i.code]=1; return true; })}; });
  if(!list.length) return;
  ask({title:"코드를 이름과 같게 "+emptyCodes()+"줄 맞출까요?", k1:"구간", v1:list.map(function(b){ return b.from; }).join(", "), k2:"채우는 값", v2:"항목 이름 그대로 (예: 국산차)",
       warn:"접수리스트 «상품명»과 이름이 같아야 그 단가로 셈해요.", yes:"채우기"}, function(){ saveBands(list, "코드를 채웠어요."); });
}
var a=AFTER.price;
AFTER.price=function(){
  if(a) a.apply(this,arguments);
  if(PRICE_OK!==true||!isOwner()||$("v51Gaon")) return;
  var h=$("main").querySelector(".cgg-head"); if(!h) return;
  var n=emptyCodes(), has=function(from,code,price){ return PRICE_BANDS.some(function(b){ return b.from===from && b.items.some(function(i){ return i.code===code && i.price===price; }); }); };
  var ok=has("2026-06-01","국산차",30000)&&has("2026-06-01","수입차",40000)&&has("2020-01-01","국산차",25000)&&has("2020-01-01","수입차",35000);
  var box=document.createElement("div"); box.id="v51Gaon";
  box.className="cgg-band "+(n||!ok?"chk":"done"); box.setAttribute("role","status");
  box.innerHTML='<span class="tx">'+(n?"코드가 이름(상품명)과 다른 단가 "+n+"줄은 청구서 · 매출에 안 쓰여요 (금액이 부풀어요)":ok?"가온 규칙 단가가 들어 있어요 (2026-06-01 인상 · 선납 0원)":"가온 규칙(6/1 인상) 단가가 아직 없어요")+'</span>'+
    (n?'<button type="button" class="cgg-btn" id="v51Fix">코드를 이름으로 맞추기</button>':'')+
    (ok?'':'<button type="button" class="cgg-btn pri" id="v51Go">가온 규칙으로 맞추기</button>');
  var bd=$("chkBand"); h.parentNode.insertBefore(box, (bd&&bd.parentNode===h.parentNode)?bd.nextSibling:h.nextSibling);
  var f=$("v51Fix"); if(f) f.onclick=fixCodes;
  var g=$("v51Go"); if(g) g.onclick=gaonGo;
};
})();
</script>
