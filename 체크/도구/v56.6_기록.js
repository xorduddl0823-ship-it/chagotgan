<script>
/* ═══ 체크 v56.6 — 기록 저장 믿음 (대표님 10/19 최우선 · 운영/긴급/2026-10-19_기록_알림톡_출시마감_요청.md «체크» 줄)
   돈 셈 · 서버 부르기 함수(call) 본문은 그대로 두고, 바깥에서 감싸요.
   ① 같은 일 표시(rid): 저장 · 고치기 · 지우기 · 보내기 창구에만 «한 번 누름»마다 무작위 24자를 몸통 {shop, token, fn, args, rid} 에 붙여요.
      답을 못 받은 일(연결 끊김 · 답 못 읽음)을 다시 하면 같은 rid — 서버가 같은 rid 를 한 번만 처리하면 두 번 생기지 않아요(서버 방 약속).
   ② 겹침 막기: 같은 창구 · 같은 내용이 아직 처리 중이면 새로 보내지 않고 처음 것의 답을 같이 받아요(연속 클릭 · 엔터 두 번).
      확인 창 단추를 0.8초 안에 또 누르면 무시하고, 화면 단추는 저장이 끝날 때까지 잠가요.
   ③ 실패하면 «저장됨»이 아니라 빨간 글 + «다시 하기» 단추(처음 누른 단추를 다시 눌러 줘요).
   ④ 검사자 수수료(feeRules)처럼 실패를 조용히 넘기던 저장도 빨간 글로 알려요. ═══ */
(function(){
  if(typeof window.call!=="function" || typeof API==="undefined") return;
  var WR={};
  ("bankDel bankSave billBundleSend billGroupSet billSend carFeeSet companyDel companySave dealerAddMissing dealerDel dealerSave "+
   "delivApproveDealer delivRejectDealer depositApply depositDel depositImport depositKind depositMatch depositRestore depositUnapply "+
   "excelPut feeRules importLegacy insMatch invoiceBuild invoiceDel invoiceMove invoiceRekey invoiceUnsend officeSave popJoin "+
   "priceDel priceSave relink remindOff remindRuleSave remindSend smsConf staffAdd staffEdit taxIssue taxSkip tplSave "+
   "deliv_update deliv_cancel deliv_trash deliv_resend deliv_fillBlanks deliv_saveConf deliv_addDest deliv_accountAdd deliv_accountEdit").split(" ").forEach(function(k){ WR[k]=1; });
  /* 읽기로 쓰는 경우(빈 args) — feeRules() · smsConf() 는 읽기 */
  function isWrite(fn,args){ if(!WR[fn]) return false; if((fn==="feeRules"||fn==="smsConf") && !(args&&args.length)) return false; return true; }
  var A="abcdefghijklmnopqrstuvwxyz0123456789";
  function newRid(){ var a=new Uint8Array(24); try{ crypto.getRandomValues(a); }catch(e){ for(var i=0;i<24;i++) a[i]=Math.floor(Math.random()*256); }
    return Array.prototype.map.call(a,function(x){ return A[x%36]; }).join(""); }
  var FLY={}, LOST={}, CUR="";
  function keyOf(fn,args){ var s=""; try{ s=JSON.stringify(args||[]); }catch(e){ s=String(Math.random()); } return fn+"|"+s; }
  function unknown(m){ return /연결이 잠시 끊겼|서버에서 답을 받지 못했|Failed to fetch|NetworkError|Load failed|timed? ?out/i.test(String(m||"")); }

  /* 몸통에 rid 붙이기 — call 이 fetch 를 바로(같은 차례에) 부르는 동안만 */
  var rawFetch=window.fetch;
  window.fetch=function(url,opt){
    if(CUR && String(url)===String(API) && opt && typeof opt.body==="string"){
      try{ var b=JSON.parse(opt.body); if(b && typeof b==="object" && !b.rid){ b.rid=CUR; opt=Object.assign({},opt,{body:JSON.stringify(b)}); } }catch(e){}
    }
    return rawFetch.apply(this,[url,opt]);
  };

  /* 누른 단추 기억 (다시 하기 · 잠그기) */
  var LAST={el:null,t:0}, PAGEBTN={el:null,t:0}, TAPS=[];
  document.addEventListener("click",function(ev){
    var b=ev.target&&ev.target.closest&&ev.target.closest("button,[role=button],a.btn,a.cgg-btn");
    if(!b || b.hasAttribute("data-v566-retry")) return;
    var now=Date.now();
    var dup=TAPS.filter(function(x){ return x.el===b && now-x.t<800; }).length;
    TAPS=TAPS.filter(function(x){ return now-x.t<800; }); TAPS.push({el:b,t:now});
    if(dup && b.closest(".cgg-dlg,#ovl,.sheet,.cgg-sheet")){ ev.preventDefault(); ev.stopImmediatePropagation(); return; }   /* 확인 창 단추를 0.8초 안 두 번 (화면 단추는 저장 중 잠금으로 막아요) */
    LAST={el:b,t:now};
    if(!b.closest(".cgg-dlg,#ovl,.sheet,.cgg-sheet")) PAGEBTN={el:b,t:now};
  },true);

  function lockBtn(b){ if(!b || b.disabled) return null; b.disabled=true; b.setAttribute("aria-busy","true"); return b; }
  function unlockBtn(b){ if(!b) return; b.disabled=false; b.removeAttribute("aria-busy"); }

  /* 다시 하기 단추 */
  function retryBtn(origin){
    return function(){
      var target=(origin.el&&origin.el.isConnected&&!origin.el.closest("[hidden]"))?origin.el:(origin.page&&origin.page.isConnected?origin.page:null);
      if(target){ target.disabled=false; target.click(); }
      else if(typeof bar==="function") bar("처음 누른 단추를 다시 눌러 주세요.","info");
    };
  }
  function niceMsgSafe(m){ try{ return typeof niceMsg==="function"?niceMsg(m):String(m||"저장하지 못했어요. 다시 시도해 주세요."); }catch(e){ return "저장하지 못했어요. 다시 시도해 주세요."; } }
  function showRetry(origin, msg){
    setTimeout(function(){
      var where=null, m=document.querySelector("#bar .msg.err");
      /* 누른 단추가 열린 창(배달 상세 · 시트) 안이면 맨 위 알림이 창에 가려요 — 창 안에 빨간 글 + 다시 하기 */
      var box=origin.el&&origin.el.isConnected&&origin.el.closest(".modal,.sheet,.cgg-sheet");
      if(box && box.getClientRects().length){
        var old=box.querySelector("[data-v566-err]"); if(old) old.remove();
        var d=document.createElement("div"); d.className="msg err"; d.setAttribute("data-v566-err","1"); d.setAttribute("role","alert");
        d.style.margin="0 0 10px"; d.textContent=(m&&m.firstChild&&m.firstChild.nodeType===3?m.firstChild.nodeValue:"")||niceMsgSafe(msg);
        var host=origin.el.parentNode; host.parentNode.insertBefore(d,host); where=d;
      }
      else if(m) where=m;
      else{   /* 화면 안 알림 칸(say) — 대화 창 안은 그 창 단추로 다시 해요 */
        var cand=Array.prototype.filter.call(document.querySelectorAll("#main .err, #main .msg.err"),function(e){
          return e.offsetParent!==null && !e.closest(".cgg-dlg,#ovl") && (!msg || String(e.textContent).indexOf(String(msg).slice(0,12))>=0); });
        where=cand[cand.length-1]||null;
      }
      if(!where || where.querySelector("[data-v566-retry]")) return;
      var r=document.createElement("button"); r.type="button"; r.className="cgg-btn sm"; r.setAttribute("data-v566-retry","1");
      r.style.marginLeft="10px"; r.textContent="다시 하기"; r.onclick=retryBtn(origin); where.appendChild(r);
    },0);
  }

  var raw=window.call;
  window.call=function(fn,args){
    if(!isWrite(fn,args)) return raw.apply(this,arguments);
    var k=keyOf(fn,args);
    if(FLY[k]) return FLY[k];   /* 같은 일이 처리 중 — 새로 보내지 않음 */
    var lost=LOST[k], rid=(lost && Date.now()-lost.t<30*60000) ? lost.rid : newRid();
    var now=Date.now(), origin={el:(now-LAST.t<4000)?LAST.el:null, page:(now-PAGEBTN.t<60000)?PAGEBTN.el:null};
    var locked=lockBtn(origin.el && !origin.el.closest(".cgg-dlg,#ovl") ? origin.el : null);
    var p;
    CUR=rid; try{ p=raw.apply(this,arguments); } finally{ CUR=""; }
    FLY[k]=p;
    p.then(function(){ delete FLY[k]; delete LOST[k]; unlockBtn(locked); },
      function(e){ delete FLY[k]; unlockBtn(locked);
        var m=e&&e.message;
        if(unknown(m)) LOST[k]={rid:rid,t:Date.now()}; else delete LOST[k];
        if(fn==="feeRules" && typeof bar==="function") bar("검사자 수수료를 서버에 저장하지 못했어요 — "+(m||"다시 시도해 주세요."),"err");
        showRetry(origin, m); });
    return p;
  };
  window.chkV566={isWrite:isWrite, fly:function(){ return Object.keys(FLY).length; }};
})();
</script>
