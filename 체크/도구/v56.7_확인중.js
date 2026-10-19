<script>
/* ═══ 체크 v56.7 — 알림 «확인 중»(결과 불명) 바르게 (출시마감 3차 · 운영/긴급/2026-10-19_출시마감_3차_요청.md «체크» 줄)
   서버가 «보냈는지 아직 모름»(공급자 접수 뒤 답 잃음 · 완료 기록 실패 · 시간 넘김)으로 답하면
   «보냄»도 «못 보냄»도 아닌 «확인 중 — 보낸 기록에서 확인해 주세요»로 보여 주고, 다시 하기 단추를 붙이지 않아요(자동으로 다시 보내지 않음).
   알아보는 법(서버 칸 이름이 정해지기 전에도 맞게): 줄에 unsure:true · state "확인 중" · 까닭이 «확인 중»으로 시작 / 오류 글이 «확인 중»으로 시작
   돈 셈 · 보내기 함수(billSendGo · billSendResult) 본문은 그대로 — 받은 답을 바깥에서 고르고 그린 뒤 표를 고쳐요. ═══ */
(function(){
  if(typeof window.call!=="function") return;
  var MSG="확인 중 — 보낸 기록에서 확인해 주세요";
  var SEND={billSend:1, remindSend:1, billBundleSend:1, deliv_resend:1};
  function unsure(x){ return !!x && (x.unsure===true || x.state==="확인 중" || /^확인 중/.test(String(x.why||""))); }
  function isUnsureErr(e){ return !!e && (e.unsure===true || /^확인 중/.test(String(e.message||""))); }
  try{ var st=document.createElement("style"); st.textContent="@media (max-width:600px){ [data-v567-log]{min-height:42px;padding:0 14px} }"; document.head.appendChild(st); }catch(e){}
  function goLog(){ try{ go("sendlog"); }catch(e){} }
  function barInfo(text){
    if(typeof bar!=="function") return; bar(text,"info");
    var m=document.querySelector("#bar .msg"); if(!m) return;
    var b=document.createElement("button"); b.type="button"; b.className="cgg-btn sm"; b.setAttribute("data-v567-log","1");
    b.style.marginLeft="10px"; b.textContent="보낸 기록 보기"; b.onclick=goLog; m.appendChild(b);
  }
  /* 표 · 폰 목록의 «못 보냄» 칩 가운데 까닭이 «확인 중»인 줄은 노란 «확인 중» 칩으로 */
  function patch(){
    try{
      Array.prototype.forEach.call(document.querySelectorAll("#main .tag, #main .cgg-st"),function(t){
        if(String(t.textContent).trim()!=="못 보냄") return;
        var row=t.closest("tr,.cgg-mrow,li,.cgg-mf"); if(!row || String(row.textContent).indexOf(MSG)<0) return;
        t.textContent="확인 중";
        if(t.classList.contains("cgg-st")){ t.classList.remove("stop"); t.classList.add("chk"); }   /* 확인 필요 = 주황 */ else { t.style.background="var(--warn-soft)"; t.style.color="var(--warn)"; }
      });
      Array.prototype.forEach.call(document.querySelectorAll("#main .card, #main .cgg-card"),function(c){
        var u=0; Array.prototype.forEach.call(c.querySelectorAll("tbody tr"),function(r){   /* 표 줄만 셈(폰 목록은 같은 줄을 한 번 더 그려요) */ if(String(r.textContent).indexOf(MSG)>=0) u++; });
        if(!u) return;
        Array.prototype.forEach.call(c.querySelectorAll(".csub b, .csub, .sub"),function(b){
          if(b.getAttribute("data-v567")) return;
          var m=String(b.textContent).match(/(\d[\d,]*)(곳|명) 못 보냄/); if(!m || b.children.length) return;
          var n=Number(m[1].replace(/,/g,""))-u; b.setAttribute("data-v567","1");
          b.textContent=String(b.textContent).replace(m[0],(n>0?won(n)+m[2]+" 못 보냄 · ":"")+"확인 중 "+won(u)+m[2]);
          if(n<=0) b.style.color="var(--warn)";
        });
      });
    }catch(e){}
  }
  var rawDraw=window.draw;
  if(typeof rawDraw==="function") window.draw=function(){ var r=rawDraw.apply(this,arguments); patch(); return r; };

  var inner=window.call;
  window.call=function(fn,args){
    var p=inner.apply(this,arguments);
    if(!SEND[fn]) return p;
    return p.then(function(r){
      r=r||{}; var u=0, ok=0, bad=0, unit=(fn==="billSend")?"곳":"명";
      if(Array.isArray(r.results)){
        r.results.forEach(function(x){ if(unsure(x)){ x.ok=false; x.why=MSG; u++; } else if(x.ok) ok++; else bad++; });
      } else if(fn==="billBundleSend"){ if(unsure(r)){ r.ok=false; r.why=MSG; } }
      else if(fn==="deliv_resend"){ u=Number(r.unsure)||0; ok=Number(r.ok)||0; bad=Number(r.bad)||0; unit="건"; }
      if(u && fn!=="billBundleSend") setTimeout(function(){   /* 보내기 함수가 맨 위 글을 쓴 뒤 — 숫자를 셋으로 나눠 다시 */
        var sent=ok?won(ok)+(unit==="명"?"명에게 보냈어요. ":unit==="곳"?"곳에 보냈어요. ":"건을 보냈어요. "):"";
        var t=sent+"확인 중 "+won(u)+unit+" — 보낸 기록에서 확인해 주세요. 다시 보내지 마세요."+(bad?" 못 보낸 "+won(bad)+unit+"은 아래에서 까닭을 확인해 주세요.":"");
        if(bad && typeof bar==="function") bar(t,"err"); else barInfo(t);
        patch(); },0);
      else setTimeout(patch,0);
      return r;
    },function(e){
      if(isUnsureErr(e)){ e.unsure=true;
        setTimeout(function(){   /* 같은 일을 다시 보냈는데 앞 것이 확인 중 — 다시 하기 대신 보낸 기록으로 */
          Array.prototype.forEach.call(document.querySelectorAll("[data-v566-retry],[data-v566-err]"),function(x){ x.remove(); });
          barInfo("알림이 나갔는지 확인 중이에요. 보낸 기록에서 확인해 주세요. 다시 보내지 마세요."); },0); }
      throw e;
    });
  };
  window.chkV567={unsure:unsure, patch:patch, barInfo:barInfo};
})();
</script>
