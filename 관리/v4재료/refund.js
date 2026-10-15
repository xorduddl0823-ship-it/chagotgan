/* ═══════ 받는 금액 › 카드 결제 — 환불 · 자동 결제 스위치 (관리 v4.2) ═══════
   결제 방 요청서 결제/요청서/2026-10-15_관리_환불화면_자동결제스위치.md · 서버 워시 sb10 (설계 12)
   - 환불 금액은 서버가 셈해요: hqPgQuote([주문번호]) → {kind:"plan"|"cash", amount, max, suggest, leftDays?, unusedCash?}
   - 확정: hqPgCancel([주문번호, 사유, 금액]) → {ok, amount, note}  (금액을 비우면 서버 한도)
     · 월 요금: 환불한 금액만큼 이용 기간을 빼요 (30일 기준) · 캐시: 안 쓴 캐시만 · 같은 주문 두 번 환불 안 됨 (서버가 막음)
   - 자동 결제 스위치: hqBillingOn([참/거짓]) · 처음엔 꺼짐 (지금 상태는 hqInfo 의 hq.billing_on) */
var RF_CYCLE = 30;   /* 서버 CYCLE_DAYS 와 같은 값 — 줄어드는 날수 미리 보기용 (실제 셈은 서버) */
function pgTestMode(){ return /^test_/.test(String(PG.clientKey||"")); }
function refundSheet(oid, row){
  openSheet('<h3 style="margin:0 0 4px">환불</h3><div class="hint" style="margin:0 0 12px">서버가 셈한 금액을 불러오는 중이에요…</div>');
  api("hqPgQuote",[oid]).then(function(q){
    q=q||{};
    var isPlan = q.kind==="plan", mx=Number(q.max)||0, sg=Number(q.suggest)||0, amt=Number(q.amount)||0;
    var why = isPlan
      ? ('남은 이용 기간 <b>'+(Number(q.leftDays)||0)+'일</b> / '+RF_CYCLE+'일 → 권장 <b>'+won(sg)+'</b>')
      : ('안 쓴 캐시 <b>'+won(Number(q.unusedCash)||0)+'</b> (부가세 포함 '+won(mx)+') — 쓴 캐시는 환불하지 않아요');
    $("sheet").innerHTML=
      '<h3 style="margin:0 0 4px">환불'+(pgTestMode()?' <span class="pill wait">테스트 모드</span>':'')+'</h3>'+
      '<div class="hint" style="margin:0 0 12px">본사만 할 수 있어요. 금액은 서버가 셈한 한도 안에서만 돼요.</div>'+
      '<div class="kv"><span>업체</span><b>'+esc(row.shop)+'</b></div>'+
      '<div class="kv"><span>종류</span><b>'+esc(row.kind)+'</b></div>'+
      '<div class="kv"><span>카드 결제 금액</span><b>'+won(amt)+'</b></div>'+
      '<div class="kv"><span>환불 한도</span><b>최대 '+won(mx)+'</b></div>'+
      '<div class="hint" style="margin:8px 0 12px">'+why+'</div>'+
      '<label class="f" for="rfAmt">환불할 금액 (원)</label>'+
      '<input type="number" id="rfAmt" min="1" max="'+mx+'" value="'+(sg||mx)+'" placeholder="비우면 최대 '+mx+'원">'+
      '<div class="hint" id="rfDays" style="margin:6px 0 10px"></div>'+
      '<label class="f" for="rfWhy">사유</label>'+
      '<input type="text" id="rfWhy" maxlength="100" placeholder="예: 고객 요청 · 중복 결제">'+
      '<div class="sheetbtns" style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">'+
        '<button class="btn" id="rfNo">취소</button><button class="btn primary" id="rfGo"'+(mx>0?'':' disabled')+'>환불 확정</button></div>'+
      (mx>0?'':'<div class="hint" style="margin-top:8px"><b>환불할 금액이 없어요.</b> '+(isPlan?'남은 이용 기간이 없어요.':'남은 캐시가 없어요.')+'</div>');
    openSheet();
    function want(){ var v=$("rfAmt").value.trim(); return v===""?mx:Math.round(Number(v)||0); }
    function hint(){
      var w=want(), el=$("rfDays");
      if(w>mx){ el.innerHTML='<b style="color:var(--stop)">최대 '+won(mx)+'까지만 돼요.</b>'; $("rfGo").disabled=true; return; }
      $("rfGo").disabled = !(w>0);
      el.innerHTML = isPlan
        ? '이용 기간이 약 <b>'+Math.min(RF_CYCLE,Math.round(RF_CYCLE*w/Math.max(1,amt)))+'일</b> 줄어요 (환불한 날수만큼 빼요).'
        : '업체 캐시에서 <b>'+won(Math.round(w/1.1))+'</b>을 빼요.';
    }
    $("rfAmt").oninput=hint; hint();
    $("rfNo").onclick=closeSheet;
    $("rfGo").onclick=function(){
      var w=want(), reason=$("rfWhy").value.trim()||"고객 요청";
      if(!(w>0) || w>mx) return;
      confirmBox("환불할까요?", row.shop+" · "+row.kind+" · "+won(w)+"\n되돌릴 수 없어요.", "환불하기", true, function(){
        $("rfGo").disabled=true;
        api("hqPgCancel",[oid, reason, w]).then(function(r){
          closeSheet(); toast("환불했어요 · "+won((r&&r.amount)||w)+((r&&r.note)?" · "+r.note:"")); pgLoad();
        }, function(e){ $("rfGo").disabled=false; toast(e.message||"환불하지 못했습니다",true); });
      });
    };
  }, function(e){
    $("sheet").innerHTML='<h3 style="margin:0 0 6px">환불</h3><div class="hint"><b>환불 금액을 불러오지 못했습니다.</b><br>'+esc(e.message||"")+
      '<br>서버 새 판(워시 sb10)이 아직 안 올라갔으면 이렇게 보여요.</div>';
    openSheet();
  });
}
/* 자동 결제 스위치 카드 — 처음엔 꺼짐 */
function billCard(){
  var on = !!(D.hq && D.hq.billing_on);
  return '<div class="card"><div class="tools" style="margin:0"><h2>자동 결제</h2>'+
    '<span class="pill '+(on?"run":"gray")+'">'+(on?"켜짐 — 업체가 카드를 등록할 수 있어요":"꺼짐")+'</span>'+
    (pgTestMode()?'<span class="pill wait">테스트 모드</span>':'')+
    '<span class="sp"></span><button class="btn '+(on?"danger ":"")+'sm" id="billSw">'+(on?"끄기":"켜기")+'</button></div>'+
    '<div class="hint" style="margin-top:10px">켜면 업체 앱에 «카드 등록하고 매달 자동 결제»가 보여요. '+
    '<b>토스 자동결제 계약과 열쇠(PAY_ENC_KEY)를 넣은 뒤에만 켜세요.</b> 끄면 새 등록과 자동 결제가 멈추고, 등록한 카드는 그대로 남아요.</div></div>';
}
function billBind(){
  var b=$("billSw"); if(!b) return;
  b.onclick=function(){
    var on=!(D.hq && D.hq.billing_on);
    confirmBox(on?"자동 결제를 켤까요?":"자동 결제를 끌까요?",
      on?"토스 자동결제 계약과 열쇠(PAY_ENC_KEY)를 넣은 뒤에만 켜세요.":"새 등록과 자동 결제가 멈춰요.",
      on?"켜기":"끄기", !on, function(){
        api("hqBillingOn",[on]).then(function(r){ D.hq=D.hq||{}; D.hq.billing_on=!!(r&&r.on!==undefined?r.on:on); toast(on?"켰어요":"껐어요"); pgDraw(); },
          function(e){ toast(e.message||"바꾸지 못했습니다",true); });
      });
  };
}
