  /* v122 · 결제 확인표 W5 — 내 결제 내역 (payMine) */
  var PAYST={paid:["완료","#1E9E5A"],ready:["결제 중","#1668C4"],failed:["실패","#D64545"],canceled:["환불","#B26B00"]};
  var PAYKIND={plan:"이용요금",cash:"캐시 충전"};
  function payHist(){
    cashBox('<h3 style="margin:0 0 6px">결제 내역</h3><div class="sub">불러오는 중이에요…</div>');
    cwRpc("payMine",[]).then(function(r){
      var L=((r&&r.orders)||[]).slice(0,50);
      cashBox('<h3 style="margin:0 0 4px">결제 내역</h3><div class="sub" style="margin-bottom:12px">최근 '+L.length+'건 · 영수증은 결제할 때 토스가 보내 드린 안내에서 볼 수 있어요</div>'+
        '<div style="border:1px solid #DDE3EC;border-radius:12px;max-height:56vh;overflow:auto">'+
        (L.length?L.map(function(o){var st=PAYST[o.status]||[o.status||"-","#667085"];
          return '<div style="display:flex;gap:10px;align-items:center;padding:11px 13px;border-bottom:1px solid #EEF2F7;font-size:13.5px">'+
            '<span style="min-width:74px;color:#667085;font-size:12px">'+esc2(String(o.paid_at||o.created_at||"").slice(0,10))+'</span>'+
            '<span style="flex:1;min-width:0">'+esc2(o.order_name||PAYKIND[o.kind]||"-")+'<br><small style="color:#667085">'+esc2(PAYKIND[o.kind]||o.kind||"")+(o.method?' · '+esc2(o.method):'')+(Number(o.use_cash)>0?' · 캐시 '+w(o.use_cash):'')+'</small></span>'+
            '<b style="white-space:nowrap">'+w(o.amount)+'</b>'+
            '<span style="min-width:52px;text-align:center;font-size:12px;font-weight:700;color:'+st[1]+'">'+esc2(st[0])+'</span></div>';}).join("")
          :'<div style="padding:16px;text-align:center;color:#667085;font-size:13px">아직 결제한 내역이 없어요.</div>')+'</div>'+
        '<div class="sheetbtns" style="margin-top:14px"><button class="btn" type="button" id="phBack">이용요금 창으로</button><button class="btn" data-cwclose>닫기</button></div>');
      var bk=document.getElementById("phBack"); if(bk) bk.onclick=function(){ window.ccwPlanPay(); };
    }).catch(function(e){
      cashBox('<h3 style="margin:0 0 6px">결제 내역</h3><div style="color:#C0392B;font-size:14px">'+esc2((e&&e.message)||"불러오지 못했어요")+'</div>'+
        '<div class="sheetbtns" style="margin-top:14px"><button class="btn" data-cwclose>닫기</button></div>');
    });
  }
  document.addEventListener("click",function(ev){ var t=ev.target&&ev.target.closest&&ev.target.closest("[data-pvhist]"); if(t){ ev.preventDefault(); payHist(); } });
  window.ccwPayHist = payHist;
