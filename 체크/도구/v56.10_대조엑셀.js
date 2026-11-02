<script>
/* ═══ 체크 v56.10 — 나스 청구서와 한 줄씩 맞춰 보기 (총괄 11/2 · 운영 v56.9 에서 33,000원 차이)
   «차 한 대씩 엑셀»: 청구처 · 신청인 · 차량번호 · 검사일 · 상품명 · 갈래 · 금액 · 확인 (서버 invoiceRows 가 이미 주는 car.plate · check_date)
   «확인» 칸: 같은 달에 같은 차량번호가 두 줄 · 상품명에 «선납»이 있는데 금액이 매겨짐
   돈 셈은 그대로 — 읽어서 보여 주기만 해요(billLoadRows · billTargets 를 부르기만 함). ═══ */
(function(){
  function plate(x){ return String(x||"").replace(/\s/g,""); }
  function carXls(){
    if(typeof XLSX==="undefined"){ bar("엑셀 도구를 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침(F5)해 주세요.","err"); return; }
    var L=(BILLS||[]).slice();   /* 나스와 맞춰 보려면 이 달 전부 — 고른 줄 · 거르기 · 100곳 제한 없이 */
    if(!L.length){ tell("청구서가 없어요","먼저 «청구서 만들기»를 눌러 주세요."); return; }
    bar("청구서 "+won(L.length)+"곳 내역을 불러오는 중이에요…","info",true); busy(true);
    billLoadRows(L).then(function(){
      busy(false);
      var out=[], seen={};
      L.forEach(function(b){ (b.rows||[]).forEach(function(r){
        if(r.kind==="repair") return;
        var c=r.car||{}, p=plate(c.plate), d=String(c.check_date||"").slice(0,10);
        var o={b:b.name, who:r.dealer_name||"", p:c.plate||"", d:d, g:r.item||"", k:r.kind==="ext"?"전산외":"검사", a:Number(r.amount)||0, chk:[]};
        if(p){ (seen[p]=seen[p]||[]).push(o); }
        if(/선납/.test(o.g) && o.a>0) o.chk.push("상품명에 선납이 있는데 금액이 들어갔어요");
        out.push(o); }); });
      Object.keys(seen).forEach(function(p){ if(seen[p].length>1) seen[p].forEach(function(o){ o.chk.push("같은 차량번호가 "+seen[p].length+"줄 있어요"); }); });
      var flag=out.filter(function(o){ return o.chk.length; }).length;
      var rows=[["청구처","신청인","차량번호","검사일","상품명","갈래","금액","확인"]].concat(
        out.map(function(o){ return [o.b,o.who,o.p,o.d,o.g,o.k,o.a,o.chk.join(" · ")]; }));
      var wb=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "차 한 대씩");
      XLSX.writeFile(wb, "차곳간체크_차한대씩_"+ST.ym+".xlsx");
      var t="차 한 대씩 엑셀을 받았어요 — 이 달 청구처 "+won(L.length)+"곳 전부 · "+won(out.length)+"대. 0원 딜러(청구서를 안 만든 곳) 차는 들어 있지 않아요.";
      if(flag) bar(t+" 확인 필요 "+won(flag)+"줄 — 엑셀 «확인» 칸을 봐 주세요.","warn",true); else bar(t,"ok",true);
    }).catch(function(e){ busy(false); fail(e); });
  }
  window.chkV5610Car={xls:carXls};
})();
</script>
