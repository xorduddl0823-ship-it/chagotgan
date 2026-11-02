<style id="chk-v57">
/* ═══ 체크 v57 — 통합 디자인 11판(디자인/완성_미리보기.html #check)대로 자리 맞춤 · 모양만(돈 셈 · 서버 · 로그인 · rid · 확인 중 그대로) ═══ */
/* 체크 전용 상자(많이 밀린 곳 · 성능보증보험료)는 «체크 전용» 표시 달고 «어디까지 왔나» 다음 — 워시 v144와 같은 규칙(11/1) */
/* 큰 표는 카드 밖 맨바닥(11판) — 카드 테두리·그림자·안쪽 여백 없음 */
.card.v57-flat{background:transparent!important;box-shadow:none!important;border:0!important;padding:0!important;margin:0 0 16px!important}
.card.v57-flat>h3,.card.v57-flat>.csub,.card.v57-flat>.chd,.card.v57-flat>.chk-ch{display:none!important}
.card.v57-flat .cgg-tblock{margin-top:0}
/* 기간 고르기 줄은 카드 밖(11판) */
.card.v57-bare{background:transparent!important;box-shadow:none!important;border:0!important;padding:0!important;margin:0 0 14px!important}
/* «자료 점검 · 청구 합계»는 워시에도 있는 칸이라 «체크 전용» 표시 없음 */
#v52Sub.chk-own>h3::after{content:none!important}
/* 표 아래 단추는 3개만 · 나머지는 «더 보기 ▾» 하나로(11판 · 워시 v144와 같은 규칙) */
details.v57-more{position:relative;display:inline-block}
details.v57-more>summary{list-style:none;cursor:pointer}
details.v57-more>summary::-webkit-details-marker{display:none}
details.v57-more>.v57-menu{position:absolute;left:0;bottom:calc(100% + 6px);z-index:30;display:flex;flex-direction:column;gap:6px;min-width:240px;padding:8px;background:var(--card,#fff);border:1px solid var(--ln2);border-radius:12px;box-shadow:0 8px 24px rgba(15,23,42,.14)}
details.v57-more>.v57-menu>button{width:100%;justify-content:flex-start}
@media (max-width:600px){ details.v57-more{display:block;width:100%} details.v57-more>summary{width:100%;justify-content:center;min-height:42px} details.v57-more>.v57-menu{position:static;margin-top:6px;box-shadow:none} }
/* 홈 숫자 카드 4개는 검정 숫자(11판) */
#chkHome .cgg-kpis .cgg-kpi strong{color:var(--text)!important}
/* 배달 숫자 카드 뜻 색(11판): 알림 보냄 초록 · 못 보냄 빨강(0이면 흐림) */
.v57-deliv .cgg-kpis .cgg-kpi:nth-child(3) strong{color:var(--done)}
.v57-deliv .cgg-kpis .cgg-kpi:nth-child(4):not(.t-zero) strong{color:var(--stop)}
</style>
<script>
/* 체크 v57 — 그린 뒤 자리만 옮겨요(돈 셈 · 표 내용 · 단추 동작 그대로) */
(function(){
  if(typeof window.draw!=="function") return;
  function kpiText(main,label){ var k=[].filter.call(main.querySelectorAll(".cgg-kpis .cgg-kpi"),function(x){ var s=x.querySelector("small"); return s&&s.textContent.trim()===label; })[0];
    var st=k&&k.querySelector("strong"); return st?st.textContent.trim():""; }
  function setTitle(main,t){ var h=main.querySelector(".cgg-head h1"); if(h&&t) h.textContent=t; }
  function cardBy(main,title){ return [].filter.call(main.querySelectorAll(":scope > .card"),function(c){ var h=c.querySelector("h3"); return h&&h.textContent.trim().indexOf(title)===0; })[0]; }
  function fix(){
    var main=document.getElementById("main"); if(!main) return;
    var pg=(window.page||"");
    main.classList.toggle("v57-deliv", pg==="deliv");
    if(pg==="bill"){
      /* 제목 = 자료 문장 «11월 청구서 8곳 · 6,820,000원» */
      var n=kpiText(main,"청구처"), amt=kpiText(main,"총 청구액"), ym=String((window.ST&&ST.ym)||"");
      if(n && amt && /-\d\d$/.test(ym)) setTitle(main, Number(ym.slice(5))+"월 청구서 "+n+" · "+amt);
      /* 자료 점검 줄을 «청구 합계» 점선 상자 안으로 · 숫자 카드 위로(11판 차례: 만들기 → 자료 점검·합계 → 숫자 카드 → 표) */
      var sub=main.querySelector("#v52Sub"), ck=main.querySelector(":scope > .ckbar"), kp=main.querySelector(":scope > .cgg-kpis");
      if(sub && kp && sub.compareDocumentPosition(kp)&Node.DOCUMENT_POSITION_PRECEDING) main.insertBefore(sub,kp);
      if(sub && ck){ var h=sub.querySelector("h3"); if(h&&h.nextSibling) h.parentNode.insertBefore(ck,h.nextSibling); else sub.appendChild(ck); ck.classList.add("v57-in"); }
      if(sub){ var h3=sub.querySelector("h3"); if(h3 && h3.firstChild && h3.firstChild.nodeType===3) h3.firstChild.nodeValue="자료 점검 · 청구 합계"; }
      var lc=cardBy(main,"청구서 목록"); if(lc) lc.classList.add("v57-flat");
      /* 표 아래 단추: 미리보기·인쇄 · 그림으로 받기 · 엑셀(요약)만 보이고 나머지는 «더 보기 ▾» 안으로(단추 자체를 옮겨서 하는 일은 그대로) */
      var pr=main.querySelector("#bPrint"), row=pr&&pr.parentNode;
      if(row && !row.querySelector("details.v57-more")){
        var d=document.createElement("details"); d.className="v57-more";
        d.innerHTML='<summary class="cgg-btn btn">더 보기 ▾</summary><div class="v57-menu"></div>';
        var menu=d.querySelector(".v57-menu");
        ["bBundle","bBundleAll","bXlsAll","bMove","bUnsend"].forEach(function(id){ var b=row.querySelector("#"+id); if(b) menu.appendChild(b); });
        menu.addEventListener("click",function(e){ if(e.target.closest("button")) d.open=false; });
        if(menu.children.length) row.appendChild(d);
      }
    }
    if(pg==="deliv"){
      var dn=kpiText(main,"배달"), on=main.querySelector(".v55-per .cgg-fp.on, .v55-per .on");
      if(dn) setTitle(main,(on?on.textContent.trim()+" ":"")+"배달 "+dn);
      var per=main.querySelector(":scope > .card.v55-per"); if(per) per.classList.add("v57-bare");
      var lg=cardBy(main,"배달 기록"); if(lg) lg.classList.add("v57-flat");
    }
  }
  var raw=window.draw;
  window.draw=function(){ var r=raw.apply(this,arguments); try{ fix(); }catch(e){} return r; };
  /* 다른 덧붙임이 그린 뒤에 늦게 붙이는 상자도 맞추게 — 화면이 바뀌면 한 번 더(자리만 옮김 · 반복 안 함) */
  var busy=false, tm=0;
  try{ new MutationObserver(function(){ if(busy||tm) return; tm=setTimeout(function(){ tm=0; busy=true; try{ fix(); }catch(e){} setTimeout(function(){ busy=false; },0); },40); })
    .observe(document.body,{childList:true,subtree:true}); }catch(e){}
  window.chkV57={fix:fix};
})();
</script>
