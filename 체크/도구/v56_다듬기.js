<script>
/* ═══ v56 — 대표님 TEST(10/18) 다듬기
   ① 여러 건 결과 창: 한 줄로 붙이지 않고 한 곳씩 줄 바꿔 목록 + 할 일 단추 (청구서 지우기 · 세금계산서 발급 · 딜러 등록)
   ② 메뉴 · 안쪽 칸을 바꿀 때 «불러오는 중이에요…»로 화면을 지우지 않고, 예전 내용 위에 얇은 진행 줄만 (만들기 도구에서 go 고침)
   ③ 디자인 메뉴 지도 이름(10/18 e24c0ec): 세금계산서 발행 · 입금 · 출금 · 받을 금액 · 보험료 맞춰 보기 · 청구서 목록 · 받는 곳 합치기 ·
      알림톡 문구는 설정 › 알림 안으로 · 문자 자동수집은 설정 › 입금 자동 확인 안으로(메뉴 표시) ═══ */
(function(){
/* ① 결과 목록 창 — items:[{name, why}] · go:{label, page} */
window.chkResult=function(title, lead, items, more, go1){
  var L=(items||[]).slice(0,30);
  var html=(lead?esc(lead)+'<br>':'')+
    '<ul class="v56-list">'+L.map(function(x){ return '<li><b>'+esc(x.name||"")+'</b>'+(x.why?' — '+esc(x.why):'')+'</li>'; }).join("")+
    ((items||[]).length>30?'<li>… 외 '+((items||[]).length-30)+'곳</li>':'')+'</ul>'+
    (more?'<span class="v56-more">'+esc(more)+'</span>':'')+
    (go1?'<br><button type="button" class="btn primary" id="v56Go">'+esc(go1.label)+'</button>':'');
  tell(title, html);
  if(go1) setTimeout(function(){ var b=$("v56Go"); if(b) b.onclick=function(){ var ok=document.querySelector(".cgg-dlg [data-dok]"); if(ok) ok.click(); else { try{ CGG.closeDialog(); }catch(e){} } go(go1.page); }; },0);
};
/* 서버 글(«이름: 까닭» · «이름(까닭)»)을 이름 · 까닭으로 */
window.chkSplit=function(t){ t=String(t||""); var m=t.match(/^(.*?)\s*[:—-]\s*(.+)$/)||t.match(/^(.*?)\((.+)\)$/); return m?{name:m[1], why:m[2]}:{name:t, why:""}; };

/* ③ 메뉴 지도 — 알림톡 문구 · 문자 자동수집은 설정 묶음 안에서 그 칸이 켜지게 */
var _g1=window.groupOf;
if(_g1) window.groupOf=groupOf=function(p){ if(p==="billtpl") return ["set",SETS]; return _g1.apply(this,arguments); };
var _cc=window.chkCur;
if(_cc) window.chkCur=chkCur=function(){ if(page==="sms") return "set/popbill"; if(page==="billtpl") return "set/alarm"; return _cc.apply(this,arguments); };
/* 알림 화면 — 알림톡 문구 여는 칸 */
var _pa2=PAGE.alarm;
PAGE.alarm=function(){
  return _pa2.apply(this,arguments)+card("알림톡 문구","청구서 · 재검사 알림톡에 쓰는 문구(본사가 관리해요)를 봐요.",
    '<div class="tools"><button type="button" class="btn" data-v55go="billtpl">알림톡 문구 보기</button></div>');
};
})();
</script>
<style>
/* v56 결과 목록 · 얇은 진행 줄 */
.v56-list{margin:8px 0 6px;padding-left:20px;display:grid;gap:4px;font-size:14px;line-height:1.5}
.v56-more{display:block;margin-top:6px;color:var(--muted);font-size:13px}
body.chk-loading::before{content:"";position:fixed;left:0;top:0;height:3px;width:40%;background:var(--brand);z-index:9999;animation:chkLoad 1s ease-in-out infinite}
@keyframes chkLoad{0%{left:-40%}100%{left:100%}}
@media (prefers-reduced-motion:reduce){ body.chk-loading::before{animation:none;width:100%;opacity:.6} }
</style>
