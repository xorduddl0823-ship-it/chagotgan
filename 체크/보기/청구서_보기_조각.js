/* 차곳간 체크 · 청구서 한 장 그리기 조각 v1 (2026-10-16 · 체크 방)
   쓰는 곳: app.cgg.co.kr/v.html (워시 방 화면) — 보기코드가 «k» 로 시작하면 check-api v33 invoiceView(코드)를 부르고,
            받은 값을 cggCheckInvoice(넣을 칸, 값) 으로 그립니다. (총괄 결정 ① 1안 · 서버 방이 k 코드 나누기)
   받는 값 (check-api v33 invoiceView — 정한 칸만, 창구 약속 문서 3절):
     { ym:"2026-09", to:"홍길동", members:["김철수"], total:1243000,
       office:{ name, tel, bank_fee, bank_repair },
       fee:{ n:40, amount:1177000, lines:[{ name:"국산차", unit:30000, n:32, amount:960000 }, …] },
       rep:{ n:2, amount:66000, lines:[{ name:"타이어 교체", amount:44000 }, …] },
       expired:false }
   글은 모두 esc 해서 넣고, 바깥 주소 · 스크립트를 넣지 않습니다. 비밀 열쇠 없음. */
(function(){
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function won(n){ return (Math.round(Number(n)||0)).toLocaleString("ko-KR"); }
  function ymText(ym){ var m=String(ym||"").match(/^(\d{4})-(\d{2})/); return m ? m[1]+"년 "+(+m[2])+"월" : esc(ym); }
  var CSS = '.cgi{font:15px/1.6 "Pretendard","Noto Sans KR",system-ui,sans-serif;color:var(--cgi-ink,#111827);word-break:keep-all}'+
    '.cgi h2{font-size:20px;margin:2px 0 4px}.cgi .sub{color:var(--cgi-muted,#5B6472);font-size:13.5px;margin:0 0 14px}'+
    '.cgi .doc{background:var(--cgi-card,#fff);border:1px solid var(--cgi-line,#E3E7EE);border-radius:14px;padding:14px 16px;margin-bottom:12px}'+
    '.cgi .doc h3{font-size:15px;margin:0 0 8px;display:flex;justify-content:space-between;gap:10px}'+
    '.cgi .ln{display:flex;justify-content:space-between;gap:12px;padding:5px 0;border-top:1px solid var(--cgi-line,#E3E7EE);font-size:14px}'+
    '.cgi .ln:first-of-type{border-top:0}.cgi .ln span:last-child{font-variant-numeric:tabular-nums;text-align:right;flex:none}'+
    '.cgi .tot{font-weight:800}.cgi .acct{font-size:13px;color:var(--cgi-muted,#5B6472);margin-top:6px}'+
    '.cgi .msg{text-align:center;padding:40px 10px;color:var(--cgi-muted,#5B6472)}.cgi .msg b{display:block;color:inherit;font-size:17px;margin-bottom:6px}';
  function part(title, p, acct, isFee){
    if(!p || !(Number(p.amount)>0)) return "";
    var lines=(Array.isArray(p.lines)?p.lines:[]).map(function(l){
      var left = isFee && l.unit ? esc(l.name)+" "+won(l.unit)+" × "+won(l.n) : esc(l.name);
      return '<div class="ln"><span>'+left+'</span><span>'+won(l.amount)+'</span></div>';
    }).join("");
    return '<div class="doc"><h3><span>'+title+'</span><span>'+won(p.n)+'건</span></h3>'+lines+
      '<div class="ln tot"><span>합계 (부가세 포함)</span><span>'+won(p.amount)+'원</span></div>'+
      (acct?'<div class="acct">입금 계좌 : '+esc(acct)+'</div>':'')+'</div>';
  }
  window.cggCheckInvoice = function(el, d){
    if(!el) return;
    if(!document.getElementById("cgi-css")){ var st=document.createElement("style"); st.id="cgi-css"; st.textContent=CSS; document.head.appendChild(st); }
    d = d || {};
    var off = d.office || {};
    if(d.expired){ el.innerHTML='<div class="cgi"><div class="msg"><b>기한이 지난 주소예요</b>'+esc(off.name||"검사소")+'에 문의해 주세요.</div></div>'; return; }
    var mem = (Array.isArray(d.members)?d.members:[]).filter(function(x){ return x && x!==d.to; });
    el.innerHTML = '<div class="cgi">'+
      '<h2>'+esc(d.to||"")+' 님 '+ymText(d.ym)+' 청구서</h2>'+
      '<p class="sub">'+esc(off.name||"")+(mem.length?' · 함께 묶인 분: '+esc(mem.join(", ")):'')+'</p>'+
      part("검사비 청구서", d.fee, off.bank_fee, true)+
      part("정비비 청구서", d.rep, off.bank_repair, false)+
      '<div class="doc"><div class="ln tot"><span>모두 합계</span><span>'+won(d.total)+'원</span></div>'+
        '<div class="acct">문의 '+esc(off.tel||"")+'</div></div>'+
    '</div>';
  };
})();
