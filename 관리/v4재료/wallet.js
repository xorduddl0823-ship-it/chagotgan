/* ═══════ 받는 금액 › 체크 지갑 잇기 (관리 v4.2) ═══════
   체크 검사소의 결제 · 캐시는 이어 둔 워시 지갑(업체)으로 처리돼요. 본사만 이어요. (워시 서버 sb11, 설계 13)
   - 목록: hqCheckWallets() → {ok, offices:[{code, name, wallet, bizNo?, ceo?}]}
       · bizNo · ceo (검사소 사업자번호 · 대표)는 서버 방에 더해 달라고 요청함 — 없으면 화면이 «확인 못 함»으로 더 세게 물어요
   - 잇기 · 바꾸기 · 끊기: hqCheckWallet([검사소코드, 업체코드 또는 ""])
   - 보안 방 권고: 양쪽 사업자번호 · 대표 이름을 나란히 보여 주고, 같은 회사일 때만 잇도록 확정 전에 한 번 더 묻기.
     다르거나 확인할 수 없으면 업체 이름을 직접 적어야 확정돼요. */
var CW = {loaded:false, busy:false, err:"", list:[]};
function cwBiz(v){ return String(v||"").replace(/[^0-9]/g,""); }
function cwName(v){ return String(v||"").replace(/\s+/g,""); }
function cwShop(code){ return (D.shops||[]).filter(function(s){ return s.shop===code; })[0]||null; }
function viewCwal(){
  $("main").innerHTML='<div class="dashhead"><h2>체크 지갑 잇기</h2>'+
    '<div class="sub2">체크 검사소의 이용요금 · 캐시는 여기서 이어 둔 워시 업체 지갑으로 처리돼요. 같은 회사(같은 사업자 · 같은 대표)끼리만 이어 주세요.</div></div>'+
    '<div id="cwBody"><div class="hint">불러오는 중이에요…</div></div>';
  if(CW.loaded) cwDraw(); else cwLoad();
}
function cwLoad(){
  if(CW.busy) return; CW.busy=true;
  api("hqCheckWallets",[]).then(function(r){ CW.loaded=true; CW.err=""; CW.list=(r&&r.offices)||[]; },
    function(e){ CW.loaded=true; CW.err=e.message||"불러오지 못했습니다"; })
  .then(function(){ CW.busy=false; cwDraw(); });
}
function cwDraw(){
  var host=$("cwBody"); if(!host) return;
  if(CW.err){ host.innerHTML='<div class="card"><div class="hint"><b>불러오지 못했습니다.</b><br>'+esc(CW.err)+
    '<br>서버 새 판(워시 sb11)과 SQL 07 이 아직이면 이렇게 보여요. 그동안 체크 화면에는 «아직 준비 중»이 떠요.</div>'+
    '<div class="tools" style="margin:12px 0 0"><button class="btn" id="cwRe">다시 불러오기</button></div></div>';
    $("cwRe").onclick=function(){ CW.loaded=false; cwLoad(); }; return; }
  var linked=CW.list.filter(function(o){ return o.wallet; }).length;
  host.innerHTML='<div class="card"><h2>검사소 '+CW.list.length+'곳 <span class="rt">이어짐 '+linked+' · 안 이어짐 '+(CW.list.length-linked)+'</span></h2>'+
    '<div class="tablebox"><table><thead><tr><th class="c-name" style="left:0">검사소</th><th>사업자번호 · 대표</th><th>이어진 워시 업체</th><th>사업자번호 · 대표</th><th class="mid" style="width:104px">상태</th><th style="width:96px"></th></tr></thead><tbody>'+
    (CW.list.length? CW.list.map(function(o){
      var s=o.wallet?cwShop(o.wallet):null;
      var st=!o.wallet?'<span class="pill gray">안 이어짐</span>':cwMatchPill(o,s);
      return '<tr><td class="c-name" style="left:0">'+esc(o.name||o.code)+'<div class="hint" style="margin:0">'+esc(o.code)+'</div></td>'+
        '<td>'+cwWho(o.bizNo,o.ceo)+'</td>'+
        '<td>'+(o.wallet?esc((s&&s.name)||o.wallet)+'<div class="hint" style="margin:0">'+esc(o.wallet)+'</div>':'—')+'</td>'+
        '<td>'+(o.wallet?cwWho(s&&s.biz_no,s&&s.ceo):'—')+'</td>'+
        '<td class="mid">'+st+'</td>'+
        '<td><button type="button" class="btn sm" data-cw="'+esc(o.code)+'">'+(o.wallet?"바꾸기":"잇기")+'</button></td></tr>'; }).join("")
      : '<tr><td colspan="6" class="empty">체크 검사소가 아직 없어요.</td></tr>')+
    '</tbody></table></div></div>'+
    '<details class="j-help"><summary>이 화면 사용법</summary><p>[잇기]를 누르고 같은 회사의 워시 업체를 고르세요. 양쪽 사업자번호와 대표 이름을 나란히 보여 줘요. '+
    '잘못 이으면 다른 업체의 캐시에서 금액이 나가고 결제 내역이 보이니, 다르면 잇지 마세요. 끊으면 체크 화면은 다시 «아직 준비 중»으로 돌아가요.</p></details>';
  Array.prototype.forEach.call(host.querySelectorAll("[data-cw]"),function(b){
    b.onclick=function(){ cwSheet(b.getAttribute("data-cw")); }; });
}
function cwWho(biz,ceo){
  return (biz?esc(fmtBizNo(biz)):'<span class="hint" style="margin:0">번호 없음</span>')+' · '+(ceo?esc(ceo):'<span class="hint" style="margin:0">대표 없음</span>');
}
/* 같은 회사인지 — "same" 같음 · "diff" 다름 · "unknown" 확인 못 함 */
function cwMatch(o,s){
  if(!s) return "unknown";
  var b1=cwBiz(o.bizNo), b2=cwBiz(s.biz_no), c1=cwName(o.ceo), c2=cwName(s.ceo);
  if(!b1||!b2||!c1||!c2) return "unknown";
  return (b1===b2 && c1===c2) ? "same" : "diff";
}
function cwMatchPill(o,s){
  var m=cwMatch(o,s);
  return m==="same"?'<span class="pill ok">같은 회사</span>':(m==="diff"?'<span class="pill off">다른 회사</span>':'<span class="pill wait">확인 못 함</span>');
}
function cwSheet(code){
  var o=CW.list.filter(function(x){ return x.code===code; })[0]; if(!o) return;
  var shops=(D.shops||[]).filter(function(s){ return s.shop!=="ADMIN"; });
  /* 사업자번호가 같은 업체를 위로 */
  var b1=cwBiz(o.bizNo);
  shops.sort(function(x,y){ return (cwBiz(y.biz_no)===b1&&!!b1)-(cwBiz(x.biz_no)===b1&&!!b1) || String(x.name).localeCompare(String(y.name)); });
  openSheet('<h3 style="margin:0 0 4px">체크 지갑 잇기 — '+esc(o.name||o.code)+'</h3>'+
    '<div class="hint" style="margin:0 0 12px">이 검사소의 이용요금 · 캐시를 처리할 워시 업체를 고르세요. 같은 회사끼리만 이어요.</div>'+
    '<label class="f" for="cwSel">워시 업체</label>'+
    '<select id="cwSel"><option value="">— 끊기 (아무 지갑과도 잇지 않음)</option>'+
      shops.map(function(s){ return '<option value="'+esc(s.shop)+'"'+(s.shop===o.wallet?" selected":"")+'>'+esc(s.name||s.shop)+' ('+esc(s.shop)+')'+(b1&&cwBiz(s.biz_no)===b1?' · 사업자번호 같음':'')+'</option>'; }).join("")+
    '</select>'+
    '<div id="cwCmp" style="margin-top:14px"></div>'+
    '<div class="sheetbtns" style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">'+
      '<button class="btn" id="cwNo">취소</button><button class="btn primary" id="cwGo">확정</button></div>');
  function cmp(){
    var w=$("cwSel").value, s=w?cwShop(w):null, m=w?cwMatch(o,s):"";
    function row(k,v1,v2,hl){ return '<div style="color:var(--muted);font-weight:700">'+k+'</div><div style="min-width:0;overflow-wrap:anywhere">'+v1+'</div><div style="min-width:0;overflow-wrap:anywhere'+(hl?';font-weight:700':'')+'">'+v2+'</div>'; }
    var tb='<div style="display:grid;grid-template-columns:72px minmax(0,1fr) minmax(0,1fr);gap:8px 12px;font-size:13.5px;padding:12px 14px;border:1px solid var(--line);border-radius:12px">'+
      row('','<b>체크 검사소</b>','<b>워시 업체</b>')+
      row('이름',esc(o.name||o.code),s?esc(s.name||s.shop):'—')+
      row('사업자번호',o.bizNo?esc(fmtBizNo(o.bizNo)):'없음',s&&s.biz_no?esc(fmtBizNo(s.biz_no)):(s?'없음':'—'))+
      row('대표',o.ceo?esc(o.ceo):'없음',s&&s.ceo?esc(s.ceo):(s?'없음':'—'))+'</div>';
    var msg = !w ? '<div class="hint" style="margin-top:10px">끊으면 이 검사소의 체크 결제 화면은 «아직 준비 중»으로 돌아가요.</div>'
      : m==="same" ? '<div class="hint" style="margin-top:10px"><span class="pill ok">같은 회사</span> 사업자번호와 대표가 같아요.</div>'
      : '<div class="hint" style="margin-top:10px;background:var(--stop-bg);border-radius:10px;padding:10px 12px">'+
          '<b style="color:var(--stop)">'+(m==="diff"?"사업자번호나 대표가 달라요.":"양쪽을 비교할 수 없어요 (번호나 대표가 비어 있음).")+'</b><br>'+
          '잘못 이으면 다른 업체의 캐시에서 금액이 나가고 결제 내역이 보여요. 정말 같은 회사라면 아래에 워시 업체 이름 <b>'+esc(s?(s.name||s.shop):"")+'</b>을 그대로 적어 주세요.'+
          '<input type="text" id="cwType" placeholder="업체 이름 그대로" style="margin-top:8px"></div>';
    $("cwCmp").innerHTML=(w?tb:'')+msg;
    var need=w && m!=="same";
    function ok(){ $("cwGo").disabled = need && cwName($("cwType")&&$("cwType").value)!==cwName(s&&(s.name||s.shop)); }
    if($("cwType")) $("cwType").oninput=ok; ok();
  }
  $("cwSel").onchange=cmp; cmp();
  $("cwNo").onclick=closeSheet;
  $("cwGo").onclick=function(){
    var w=$("cwSel").value, s=w?cwShop(w):null, m=w?cwMatch(o,s):"";
    if(w===String(o.wallet||"")){ closeSheet(); return; }
    var t = !w ? (o.name+"을(를) 지갑에서 끊을까요?") : (o.name+" ↔ "+(s?s.name:w)+" 을(를) 이을까요?");
    var body = !w ? "체크 결제 화면이 «아직 준비 중»으로 돌아가요."
      : "사업자번호 "+(o.bizNo?fmtBizNo(o.bizNo):"없음")+" / "+(s&&s.biz_no?fmtBizNo(s.biz_no):"없음")+" · 대표 "+(o.ceo||"없음")+" / "+(s&&s.ceo||"없음")+
        (m==="same"?"":"\n같은 회사인지 확인하지 못했어요.")+"\n이 검사소의 결제 · 캐시가 이 업체 지갑으로 처리돼요.";
    confirmBox(t, body, w?"잇기":"끊기", m!=="same", function(){
      $("cwGo").disabled=true;
      api("hqCheckWallet",[o.code, w]).then(function(){ o.wallet=w; closeSheet(); toast(w?"이었어요":"끊었어요"); cwDraw(); },
        function(e){ $("cwGo").disabled=false; toast(e.message||"바꾸지 못했습니다",true); });
    });
  };
}
