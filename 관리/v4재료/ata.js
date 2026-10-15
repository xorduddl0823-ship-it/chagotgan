/* ═══════ 알림 › 알림톡 템플릿 (관리 v4.1, 규칙 5-6) ═══════
   안내는 알림톡이 먼저, 실패하면 솔라피가 문자로 대신 보내요.
   템플릿 코드가 비어 있으면 그 안내는 지금처럼 문자로만 보내요.
   서버 창구 (서버 방과 맞출 이름 — 관리/요청서/2026-10-15_서버_알림톡_템플릿코드_칸.md):
     hqAta([ym])        → {ok, pfSet, tpls:{키:코드}, ready:[서버가 지금 알림톡으로 보낼 수 있는 키], stats:{ym, ata:{cnt,won}, sms:{cnt,won}, lms:{cnt,won}, mms:{cnt,won}, error?}}
     hqAtaSave([{키:코드, pfId?}]) → {ok}    (워시 서버 sb7 · wash_hq.ata_cfg 에 저장, 빈 칸은 지움) */
var ATA_LIST = [   /* [키, 템플릿 이름, 언제 나가는지, 검수 상태] — 차례 · 이름 · 때는 알림톡/00_확정본_13개_원문.md 그대로. 키는 서버와 같은 이름 */
  ["intake",      "입고안내",       "차가 입고되어 접수가 끝났을 때",        "통과"],
  ["release",     "출고안내",       "작업이 끝나 차가 나갈 때",              "통과"],
  ["extra_work",  "추가작업",       "맡긴 것 말고 손봐야 할 것이 나왔을 때",  "통과"],
  ["bill",        "청구서",         "한 달치 청구서를 보낼 때",              "통과"],
  ["deposit_ok",  "입금확인",       "입금이 확인되었을 때",                  "통과"],
  ["expire_soon", "기간종료예정",   "끝나기 3일 전 · 당일",                  "재검수"],
  ["use_limit",   "이용제한시작",   "기간이 끝난 다음 날",                   "재검수"],
  ["login_block", "로그인제한예정", "로그인이 막히기 하루 전",               "재검수"],
  ["data_keep",   "자료보관기한",   "자료를 정리하기 7일 전",                "재검수"],
  ["pay_done",    "결제완료",       "카드 결제 또는 입금 확인이 끝났을 때",   "통과"],
  ["cash_done",   "충전완료",       "캐시가 충전되었을 때",                  "통과"],
  ["balance",     "잔액안내",       "남은 금액이 정해둔 선 아래로 내려갔을 때", "재검수"],
  ["auth",        "인증번호",       "인증번호를 보낼 때",                    "통과"],
  ["check_arrive","차량도착 (체크)", "체크 — 차가 목적지에 도착했을 때 (본사 채널, 비면 검사소 템플릿 → 문자)", "심사 대기"],
  ["staff_link",  "접속주소안내",   "직원에게 접속 주소를 보낼 때 (직원용 주소만, 로그인 열쇠 없음)", "심사 대기"]
];
var ATA = {loaded:false, busy:false, err:"", tpls:{}, ready:[], stats:null, pfSet:false, at:""};
function ataYm(){ var d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-1); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"); }
function viewAta(){
  $("main").innerHTML='<div class="dashhead"><h2>알림톡 템플릿</h2>'+
    '<div class="sub2">안내는 알림톡이 먼저 나가고, 알림톡이 안 되면 문자로 대신 나가요. 코드가 빈 안내는 문자로만 나가요.</div></div>'+
    '<div id="ataBody"><div class="hint">불러오는 중이에요…</div></div>';
  if(ATA.loaded) ataDraw(); else ataLoad();
}
function ataLoad(){
  if(ATA.busy) return; ATA.busy=true;
  api("hqAta",[ataYm()]).then(function(r){
    ATA.loaded=true; ATA.err="";
    ATA.tpls=(r&&r.tpls)||{}; ATA.ready=(r&&r.ready)||[]; ATA.stats=(r&&r.stats)||null; ATA.pfSet=!!(r&&r.pfSet);
    ATA.at=new Date().toISOString();
  },function(e){ ATA.loaded=true; ATA.err=e.message||"불러오지 못했습니다"; })
  .then(function(){ ATA.busy=false; ataDraw(); });
}
function ataDraw(){
  var host=$("ataBody"); if(!host) return;
  if(ATA.err){ host.innerHTML='<div class="card"><div class="hint"><b>불러오지 못했습니다.</b><br>'+esc(ATA.err)+
    '<br>서버 새 판(알림톡 템플릿 칸)이 아직 안 올라갔으면 이렇게 보여요. 그동안 안내는 모두 문자로 나가요.</div>'+
    '<div class="tools" style="margin:12px 0 0"><button class="btn" id="ataRe">다시 불러오기</button></div></div>';
    $("ataRe").onclick=function(){ ATA.loaded=false; ataLoad(); }; return; }
  var have=ATA_LIST.filter(function(x){ return String(ATA.tpls[x[0]]||"").trim(); }).length;
  var st=ATA.stats||{}, ym=st.ym||ataYm();
  function cell(k){ var o=st[k]||{}; return {cnt:Number(o.cnt)||0, won:Number(o.won)||0}; }
  var a=cell("ata"), s=cell("sms"), l=cell("lms"), m=cell("mms");
  var tot=a.won+s.won+l.won+m.won;
  var h=
    /* 지난달 발송 — 알림톡 · 문자 건수와 금액 */
    '<div class="j-kpis">'+
      [["알림톡",a,"#1668C4","건당 13원"],["문자 단문",s,"#4C93E0","건당 18원"],["문자 장문",l,"#E08A00","건당 45원"],["사진 문자",m,"#0B2545","건당 110원"]].map(function(x){
        return '<div class="j-kpi"><small><i style="background:'+x[2]+'"></i>'+esc(x[0])+' · '+esc(ym.replace("-","년 "))+'월</small>'+
          '<strong>'+x[1].cnt.toLocaleString("ko-KR")+'<em>건</em></strong><span class="tr">'+won(x[1].won)+' · '+x[3]+'</span></div>'; }).join("")+
    '</div>'+
    '<div class="hint" style="margin:-6px 0 16px">지난달 합계 <b>'+won(tot)+'</b> (부가세 별도). 금액은 솔라피 단가로 계산한 값이라 실제 청구와 조금 다를 수 있어요.<br>'+
      '건수는 업체 화면에서 나간 발송만 세요. 인증번호와 업체 대표에게 가는 안내는 아직 세지 않아요.'+
      (st.error?' <b style="color:var(--stop)">'+esc(st.error)+'</b>':'')+'</div>'+
    /* 템플릿 코드 15줄 (확정본 13개 + 체크 차량도착 + 접속주소안내) */
    '<div class="card"><h2>템플릿 코드 <span class="rt">'+have+' / '+ATA_LIST.length+' 넣음</span></h2>'+
      '<div class="csub">솔라피 › 카카오 알림톡 › 템플릿에서 코드를 복사해 넣어 주세요. 템플릿 본문과 보내는 글자가 똑같아야 해서, 문구는 여기서 고치지 않아요.'+
      '</div>'+
      '<label class="f" style="margin-top:4px">카카오 채널 ID (pfId)</label>'+
      '<input type="text" id="ataPf" placeholder="'+(ATA.pfSet?"넣어 둠 — 바꿀 때만 적어 주세요":"비어 있음 — 솔라피 › 카카오 채널에서 복사")+'" style="max-width:420px;height:40px;margin-bottom:12px">'+
      (ATA.pfSet?'':'<div class="hint" style="margin:-6px 0 12px"><b style="color:var(--stop)">채널 ID가 아직 없어요. 그동안은 모두 문자로 나가요.</b></div>')+
      '<div class="tablebox"><table><thead><tr><th style="width:150px">템플릿 이름</th><th>언제 나가요</th><th class="mid" style="width:96px">검수</th><th style="width:260px">템플릿 코드</th><th class="mid" style="width:170px">보내는 방법</th></tr></thead><tbody>'+
      ATA_LIST.map(function(x){
        var code=String(ATA.tpls[x[0]]||"");
        return '<tr><td class="c-name">'+esc(x[1])+'</td><td>'+esc(x[2])+'</td>'+
          '<td class="mid"><span class="pill '+(x[3]==="통과"?"ok":"wait")+'">'+(x[3]==="통과"?"완료":(x[3]==="심사 대기"?"심사 대기":"확인 필요"))+'</span></td>'+
          '<td><input type="text" data-ata="'+x[0]+'" value="'+esc(code)+'" placeholder="비어 있음" style="height:36px;font-size:13.5px;font-family:ui-monospace,monospace"></td>'+
          '<td class="mid" data-ataway="'+x[0]+'">'+ataWay(code,x[0])+'</td></tr>'; }).join("")+
      '</tbody></table></div>'+
      '<div class="hint" style="margin:10px 0 0">«검수 확인 필요» 템플릿은 카카오 재검수 중이고, «심사 대기»는 새로 심사받는 중이에요. 통과 전에 코드를 넣으면 알림톡이 실패하고 문자로 대신 나가요 — 안내가 끊기지는 않아요.</div>'+
      '<div class="tools" style="margin:14px 0 0"><button class="btn primary" id="ataSave">코드 저장</button>'+
        '<button class="btn" id="ataRe">다시 불러오기</button></div>'+
    '</div>'+
    '<details class="j-help"><summary>이 화면 사용법</summary><p>코드를 넣고 «코드 저장»을 누르면 그 안내부터 알림톡으로 나가요. 코드를 지우고 저장하면 다시 문자로만 나가요. '+
      '알림톡은 정보만 알릴 수 있어서 결제·충전·연장을 권하는 문구와 버튼은 넣지 않아요 (규칙 5-6).</p></details>';
  host.innerHTML=h;
  Array.prototype.forEach.call(host.querySelectorAll("[data-ata]"),function(inp){
    inp.oninput=function(){ var w=host.querySelector('[data-ataway="'+inp.getAttribute("data-ata")+'"]'); if(w) w.innerHTML=ataWay(inp.value,inp.getAttribute("data-ata")); }; });
  $("ataRe").onclick=function(){ ATA.loaded=false; ataLoad(); };
  $("ataSave").onclick=function(){
    var map={}, n=0, pf=$("ataPf").value.trim(); if(pf) map.pfId=pf;
    Array.prototype.forEach.call(host.querySelectorAll("[data-ata]"),function(inp){ var v=inp.value.trim(); map[inp.getAttribute("data-ata")]=v; if(v) n++; });
    var tp={}; ATA_LIST.forEach(function(x){ tp[x[0]]=map[x[0]]; });
    confirmBox("코드를 저장할까요?","코드 넣음 "+n+"개 · 비어 있음(문자로 보냄) "+(ATA_LIST.length-n)+"개","저장",false,function(){
      $("ataSave").disabled=true;
      api("hqAtaSave",[map]).then(function(){ ATA.tpls=tp; if(pf) ATA.pfSet=true; toast("코드를 저장했어요"); ataDraw(); },
        function(e){ $("ataSave").disabled=false; toast(e.message||"저장하지 못했습니다",true); });
    });
  };
}
/* 코드 있음 + 서버 준비됨 → 알림톡 먼저 · 코드 있음 + 서버 아직 → 문자로 보냄(서버 준비 중) · 코드 없음 → 문자로 보냄 */
function ataWay(code,key){
  var row=ATA_LIST.filter(function(x){ return x[0]===key; })[0];
  if(row && row[3]==="심사 대기") return '<span class="pill wait" title="카카오 심사가 끝나면 알림톡으로 나가요">문자로 보냄 · 심사 대기</span>';
  if(!String(code||"").trim()) return '<span class="pill gray">문자로 보냄</span>';
  if(ATA.ready.length && ATA.ready.indexOf(key)<0) return '<span class="pill wait" title="서버가 이 안내를 아직 알림톡으로 보내지 않아요">문자로 보냄 · 서버 준비 중</span>';
  return '<span class="pill run">알림톡 먼저</span>'; }
