<style id="chk-v5610">
/* ═══ 체크 v56.10 — 배달 «도착 알림» 켜기/끄기 스위치 (총괄 11/2 · 대표님 요청) · 홈 «오늘 할 일» 위 · 배달 기간 줄 위 ═══ */
.v5610-alarm{display:flex;align-items:center;gap:12px;background:var(--card,#fff);border:1px solid var(--ln,#e5e7eb);border-radius:16px;padding:12px 16px;margin:0 0 14px}
.v5610-alarm.off{background:var(--stop-soft,#fdecec);border-color:var(--stop,#d93025)}
.v5610-alarm .ic{flex:none;width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:var(--done-soft,#e6f4ea);color:var(--done,#1e8e3e)}
.v5610-alarm .ic svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.v5610-alarm.off .ic{background:#fff;color:var(--stop,#d93025)}
.v5610-alarm .tx{flex:1;min-width:0}
.v5610-alarm .tx b{display:block;font-size:15px}
.v5610-alarm .tx small{display:block;font-size:12.5px;color:var(--muted);margin-top:2px}
.v5610-alarm.off .tx small{color:var(--stop,#d93025);font-weight:700}
.v5610-alarm .st{font-size:13.5px;font-weight:800;color:var(--done,#1e8e3e);white-space:nowrap}
.v5610-alarm.off .st{color:var(--stop,#d93025)}
.v5610-sw{flex:none;position:relative;width:52px;height:30px;border-radius:999px;border:0;background:var(--done,#1e8e3e);cursor:pointer;padding:0}
.v5610-sw::after{content:"";position:absolute;top:3px;left:25px;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:left .15s}
.v5610-sw[aria-checked="false"]{background:#b8bec8}
.v5610-sw[aria-checked="false"]::after{left:3px}
.v5610-sw::before{content:"";position:absolute;top:-8px;bottom:-8px;left:-6px;right:-6px}   /* 손가락으로 누르는 칸 44px 이상 */
.v5610-sw:disabled{opacity:.45;cursor:not-allowed}
.v5610-alarm .lock{font-size:12px;color:var(--muted);white-space:nowrap}
@media (max-width:600px){ .v5610-alarm{flex-wrap:wrap;padding:12px} .v5610-alarm .tx{flex-basis:calc(100% - 50px)} .v5610-alarm .st{margin-left:48px} .v5610-sw{width:56px;height:32px;margin-left:auto} .v5610-sw::after{width:26px;height:26px;left:27px} .v5610-sw[aria-checked="false"]::after{left:3px} }
</style>
<script>
/* 체크 v56.10 — 도착 알림 켜기/끄기
   저장: deliv_saveConf([열쇠,{arrive_on}]) · 읽기: deliv_list 의 conf.arrive_on (서버가 이 칸을 아직 안 주면 스위치를 잠가요 — 조용히 버려지는 저장을 막음)
   대표만 바꿈(서버도 대표만 받음) · 바꿀 때 확인 창 · 저장 뒤 deliv_conf 로 다시 읽어 정말 바뀌었는지 확인
   돈 셈 · 보내기 함수 · rid · «확인 중» 처리는 그대로 */
(function(){
  function conf(){ try{ return (typeof DCONF!=="undefined" && DCONF) || {}; }catch(e){ return {}; } }
  function ready(){ return typeof conf().arrive_on==="boolean"; }
  /* 홈은 배달 자료를 안 읽어요 — 설정만 한 번 가볍게 읽어 둠(deliv_conf · 읽기만) */
  var asked=false, failed=false;
  function fetchConf(){
    if(asked || ready()) return; asked=true;
    try{ call("deliv_conf",[ST.key]).then(function(r){ var c=(r&&r.conf)||{};
      if(typeof c.arrive_on==="boolean"){ try{ if(typeof DCONF==="undefined"||!DCONF) DCONF={}; DCONF.arrive_on=c.arrive_on; }catch(e){} }
      place(); }).catch(function(){ failed=true; place(); }); }catch(e){ failed=true; }
  }
  function on(){ return conf().arrive_on!==false; }
  function owner(){ try{ return typeof isOwner==="function" ? isOwner() : false; }catch(e){ return false; } }
  function rowHtml(){
    var o=on(), r=ready(), w=owner();
    var lock=!r ? "서버 준비 중이에요" : (!w ? "대표만 바꿀 수 있어요" : "");
    return '<span class="ic" aria-hidden="true">'+(typeof cggIc==="function"?cggIc("bell"):"")+'</span>'+
      '<span class="tx"><b>도착 알림</b><small>'+(o?"차가 도착하면 딜러에게 알림톡이 나가요.":"꺼져 있어요 — 차가 도착해도 딜러에게 알림이 안 나가요.")+'</small></span>'+
      (lock?'<span class="lock">'+lock+'</span>':'')+
      '<span class="st">'+(o?"켜짐":"꺼짐")+'</span>'+
      '<button type="button" class="v5610-sw" role="switch" aria-label="도착 알림 '+(o?"끄기":"켜기")+'" aria-checked="'+(o?"true":"false")+'"'+(lock?" disabled":"")+'></button>';
  }
  function paint(el){ el.className="v5610-alarm"+(on()?"":" off"); el.innerHTML=rowHtml(); var b=el.querySelector(".v5610-sw"); if(b) b.onclick=ask; }
  function place(){
    var main=document.getElementById("main"); if(!main) return;
    var pg=(typeof page!=="undefined"?page:window.page)||"";
    var cur=main.querySelector(":scope .v5610-alarm"), anchor=null, before=true;
    if(pg==="home"){ if(!ready()&&!asked) fetchConf(); if(failed && !ready()){ if(cur) cur.remove(); return; } anchor=[].filter.call(main.querySelectorAll(".cgg-sec"),function(x){ return /^오늘 할 일/.test(String(x.textContent).trim()); })[0]; }
    else if(pg==="deliv"){ anchor=main.querySelector(":scope > .card.v55-per") || main.querySelector(":scope > .tools"); }
    if(!anchor){ if(cur) cur.remove(); return; }
    if(cur && cur.nextElementSibling===anchor){ var want="v5610-alarm"+(on()?"":" off"); if(cur.className!==want || cur.getAttribute("data-k")!==key()) { paint(cur); cur.setAttribute("data-k",key()); } return; }
    if(cur) cur.remove();
    var el=document.createElement("div"); paint(el); el.setAttribute("data-k",key());
    anchor.parentNode.insertBefore(el,anchor);
  }
  function key(){ return [on(),ready(),owner()].join(","); }
  function redrawAll(){ [].forEach.call(document.querySelectorAll(".v5610-alarm"),function(el){ paint(el); el.setAttribute("data-k",key()); }); }
  function ask(){
    if(!ready()){ if(typeof bar==="function") bar("도착 알림 켜기/끄기는 서버가 준비되면 쓸 수 있어요.","info"); return; }
    if(!owner()){ if(typeof bar==="function") bar("도착 알림 켜기/끄기는 대표만 바꿀 수 있어요.","info"); return; }
    var want=!on();
    CGG.dialog({size:"confirm",
      title: want ? "도착 알림을 다시 켤까요?" : "도착 알림을 끌까요?",
      desc: want ? "켜면 이제부터 차가 도착할 때 딜러에게 알림톡이 나가요(안 되면 문자). 꺼져 있던 동안 도착한 차에는 저절로 나가지 않아요."
                 : "끄는 동안 기사가 도착을 남겨도 딜러에게 알림이 안 나가요. 기록과 사진은 그대로 남아요.",
      body:'<div class="cpt-err" id="v5610Err" hidden></div>',
      ok: want ? "켜기" : "끄기", cancel:"취소",
      onOk:function(){
        var okb=document.querySelector(".cgg-dlg [data-dok]"); if(okb) okb.disabled=true;
        var er=document.getElementById("v5610Err");
        call("deliv_saveConf",[ST.key,{arrive_on:want}]).then(function(){
          return call("deliv_conf",[ST.key]);
        }).then(function(r){
          var c=(r&&r.conf)||{};
          if(typeof c.arrive_on!=="boolean" || c.arrive_on!==want) throw new Error("서버에 저장되지 않았어요. 잠시 뒤 다시 해 주세요.");
          try{ if(typeof DCONF==="undefined"||!DCONF) DCONF={}; DCONF.arrive_on=c.arrive_on; }catch(e){}
          CGG.closeDialog(); redrawAll();
          if(typeof bar==="function") bar(want?"도착 알림을 켰어요.":"도착 알림을 껐어요. 다시 켤 때까지 딜러에게 알림이 안 나가요.", want?"ok":"info");
        }).catch(function(e){
          if(okb) okb.disabled=false;
          if(er){ er.hidden=false; er.textContent=(typeof niceMsg==="function"?niceMsg(e&&e.message):String(e&&e.message||"저장하지 못했어요.")); }
        });
        return false;
      }});
  }
  var raw=window.draw;
  if(typeof raw==="function") window.draw=function(){ var r=raw.apply(this,arguments); try{ place(); }catch(e){} return r; };
  var tm=0;
  try{ new MutationObserver(function(){ if(tm) return; tm=setTimeout(function(){ tm=0; try{ place(); }catch(e){} },40); })
    .observe(document.body,{childList:true,subtree:true}); }catch(e){}
  window.chkV5610={place:place, ask:ask, ready:ready, on:on};
})();
</script>
