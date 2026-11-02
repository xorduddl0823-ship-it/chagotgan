"""워시 v143.1 → v144. 대표님 11/1 «통합이 아예 안 되어 있다» — 통합 디자인 11판(디자인/완성_미리보기.html · 공통 1.13.2)대로 모양만
쓰는 법: python3 워시/도구/만들기_워시_v144.py  (v143.1 판 위에 덧붙임 — v143.1 은 덮어쓰지 않아요)
  바꾸지 않는 것: 돈 셈(돈 지문 그대로) · 서버 요청과 답 · 로그인 · rid · «확인 중» 처리.
  1) 홈 숫자 4칸 = 11판 · 체크와 같은 «이번 달 차량 · 이번 달 청구 · 이번 달 입금 · 받을 금액»(숫자 검정, 아래 작은 글만 오름 초록 · 내림 빨강)
     매니저(돈 화면 없음)는 지금처럼 «오늘 입고 · 작업 중 · 오늘 출고 · 거래 상사».
  2) 홈 할 일 아이콘 = 일 종류마다(자재 상자 · 작업 차 · 입금 지갑 · 청구서/계산서 문서 · 알림 종) — 11판과 같게
  3) 월별 청구서 = 11판 차례: 제목은 자료 문장(«10월 청구서 N명 · 0원») · 숫자 4칸은 카드 없이 · 표 아래 단추 3개 + «더 보기» ·
     «2. 청구서 보내기»와 «알림톡 미리보기» 두 칸(PC 나란히 · 폰 위아래)
  4) 폰: 대표는 폰에서도 사무실 홈 + 아래 탭(11판). 현장 일은 «현장 화면» 단추. 직원(현장)은 그대로 현장 화면. (W144.OWNER_PHONE_HOME 한 줄로 끔)
운영 v111 · 시험판 v125 · v126 ~ v143.1 은 덮어쓰지 않는다.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v143.1.html"); OUT = os.path.join(BASE, "1_차곳간_워시_index_v144.html")
s = open(SRC, encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('var APP_VER="워시 v143.1 · UI 3.0 · 2026-10-19";', 'var APP_VER="워시 v144 · UI 3.0 · 2026-11-01";')

# 4) 폰: 대표는 사무실 홈부터
rep('''function decideMode(init){
  var wide=window.innerWidth>=1000;
  if(init) S.mode=(canPC()&&wide&&!isFieldUrl())?"pc":"mobile";''',
'''var W144={OWNER_PHONE_HOME:true};   /* v144 11판: 대표는 폰에서도 사무실 홈 + 아래 탭 (false 로 바꾸면 예전처럼 현장 화면부터) */
function decideMode(init){
  var wide=window.innerWidth>=1000;
  if(init) S.mode=(canPC()&&(wide||(W144.OWNER_PHONE_HOME&&isOwner()))&&!isFieldUrl())?"pc":"mobile";''')

# 1) 홈 숫자 4칸
rep('''    kpis:jKpiItems(c.rows.reduce(function(t,r){return t+(r.total||0);},0)),''',
'''    kpis:mgr?jKpiItems(c.rows.reduce(function(t,r){return t+(r.total||0);},0)):wKpi144(c),   /* v144 11판 4칸 */''')
rep('''/* v122: CGG.kpis 에 넘길 값 — {label, value, unit, delta, down, spark, color} */''',
'''/* v144 11판 · 체크와 같은 홈 4칸 — 이번 달 차량 · 이번 달 청구 · 이번 달 입금 · 받을 금액 (지난달과 견줌 · 7달 그래프 · 숫자는 검정)
   값은 홈이 이미 셈한 c(rows · billed · paid · dueAmt)를 그대로 써요 — 새 돈 셈 없음 */
function wKpi144(c){
  var today=new Date(),M7=[],mi;
  for(mi=6;mi>=0;mi--){var md=new Date(today.getFullYear(),today.getMonth()-mi,1);M7.push(md.getFullYear()+"-"+String(md.getMonth()+1).padStart(2,"0"));}
  function mOf(r){return r.month||mKey(r.createdAt);}
  function inM(k){return S.records.filter(function(r){return mOf(r)===k;});}
  var cars=M7.map(function(k){return inM(k).length;});
  var bill=M7.map(function(k){return inM(k).filter(function(r){var st=statusOf(r);return st==="출고"||st==="수금완료";}).reduce(function(t,r){return t+(Number(r.total)||0);},0);});
  var got=M7.map(function(k){return inM(k).filter(function(r){return statusOf(r)==="수금완료";}).reduce(function(t,r){return t+(Number(r.total)||0);},0);});
  var due=M7.map(function(k,i){return bill[i]-got[i];});
  function pct(now,before){if(!before)return {delta:"",vs:"지난달 자료 없음"};var p=Math.round((now-before)/before*100);return {delta:(p>0?"+":p<0?"−":"±")+Math.abs(p)+"%",down:p<0,vs:"지난달보다"};}
  function cnt(now,before){var x=now-before;return {delta:(x>0?"+":x<0?"−":"±")+Math.abs(x)+"대",down:x<0,vs:"지난달보다"};}
  function it(label,val,unit,d,sp){return {label:label,value:val,unit:unit,delta:d.delta,down:d.down,vs:d.vs,spark:sp,color:"#0B2545"};}
  var nCar=(c.rows||[]).length,nBill=Number(c.billed||0),nGot=Number(c.paid||0),nDue=Number(c.dueAmt||0);
  return [
    it("이번 달 차량",String(nCar),"대",cnt(nCar,cars[5]),cars),
    it("이번 달 청구",nBill.toLocaleString("ko-KR"),"원",pct(nBill,bill[5]),bill),
    it("이번 달 입금",nGot.toLocaleString("ko-KR"),"원",pct(nGot,got[5]),got),
    it("받을 금액",nDue.toLocaleString("ko-KR"),"원",pct(nDue,due[5]),due)];
}
/* v122: CGG.kpis 에 넘길 값 — {label, value, unit, delta, down, spark, color} */''')

# 2) 할 일 아이콘 — 일 종류마다
rep('''    return {tone:t[4]==="imp"?"stop":(memo?"chk":"run"),icon:memo?"file":"car",title:strip(t[1])+(memo?"":" "+t[0]+"건"),sub:strip(t[2])};});''',
'''    var ti=strip(t[1]),kd=memo?["file","chk"]:wTodoIc(ti);   /* v144 11판: 일 종류마다 아이콘 */
    return {tone:t[4]==="imp"?"stop":kd[1],icon:kd[0],title:ti+(memo?"":" "+t[0]+"건"),sub:strip(t[2])};});''')
rep('''function jDayKey(d){''', '''/* v144 할 일 아이콘 — [아이콘, 색] (11판: 자재 상자 빨강 · 작업 차 파랑 · 입금 지갑 주황) */
function wTodoIc(t){t=String(t||"");
  if(/자재/.test(t))return ["box","stop"];
  if(/입금|받을|미수/.test(t))return ["wallet","chk"];
  if(/알림|보내기 실패|확인 필요/.test(t))return ["bell","stop"];
  if(/세금계산서|계산서/.test(t))return ["receipt","chk"];
  if(/청구서/.test(t))return ["file","chk"];
  if(/배달/.test(t))return ["truck","run"];
  return ["car","run"];}
function jDayKey(d){''')

# 3) 월별 청구서 — 제목 자료 문장 · 숫자 4칸 카드 없이
rep('''  $("billSum").innerHTML=checkCardHtml(B.month)+
    '<div class="card"><h2>'+esc(periodLabel(B.month))+' 청구서'+''',
'''  /* v144 11판: 제목 = 자료 문장 */
  var bh=$("vBill")&&$("vBill").querySelector(".dashhead h2");
  if(bh){bh.__jsay=1;bh.textContent=Number(String(B.month).slice(5,7))+"월 청구서 "+list.length+(B.unit==="company"?"곳":"명")+" · "+won(totAmt);}   /* 위 작은 길 안내는 «월별 청구서» 그대로 */
  $("billSum").innerHTML=checkCardHtml(B.month)+
    '<div class="card w144bare"><h2>'+esc(periodLabel(B.month))+' 청구서'+''')
# 표 아래 단추: 3개 + 더 보기
rep('''  <div class="tools" style="margin-top:10px">
    <button class="btn primary" id="bPreview">청구서 미리보기 · 인쇄</button>
    <button class="btn go" id="bJpg">청구서 JPG로 받기 (청구처별)</button>
    <button class="btn" id="bCsv">엑셀 다운로드 (요약)</button>
    <button class="btn" id="bCsv2">명세까지 포함해 내려받기</button>
    <button class="btn" id="bUnsend">선택항목 보냄 표시 지우기</button>
    <button class="btn" id="bBundle" hidden>밀린 달 한꺼번에 (고른 딜러)</button>
    <button class="btn" id="bBundleAll" hidden>미수 모아 보내기</button>
    <span class="hint" id="bSelInfo"></span>
  </div>''', '''  <div class="tools w144acts" style="margin-top:10px">   <!-- v144 11판: 단추 3개 + 더 보기 -->
    <button class="btn" id="bPreview">청구서 미리보기 · 인쇄</button>
    <button class="btn" id="bJpg">JPG로 받기</button>
    <button class="btn" id="bCsv">엑셀 다운로드</button>
    <details class="w144more"><summary class="btn">더 보기 ▾</summary><div class="w144menu">
      <button class="btn" id="bCsv2">명세까지 포함해 내려받기</button>
      <button class="btn" id="bUnsend">선택항목 보냄 표시 지우기</button>
      <button class="btn" id="bBundle" hidden>밀린 달 한꺼번에 (고른 딜러)</button>
      <button class="btn" id="bBundleAll" hidden>미수 모아 보내기</button>
    </div></details>
    <span class="hint" id="bSelInfo"></span>
  </div>''')
# 2. 보내기 + 알림톡 미리보기 두 칸
rep('''  <div class="card bm-card" style="margin-top:16px" id="billSendCard">
    <h2>2. 청구서 보내기</h2>
    <div class="dash">
      <div>''', '''  <div class="bm-card w144two" style="margin-top:16px" id="billSendCard">   <!-- v144 11판: 보내기 · 미리보기 두 칸 -->
    <div class="dash">
      <div class="card w144left"><h2>2. 청구서 보내기</h2>
        <div class="hint" style="margin:-6px 0 12px">표에서 보낼 딜러를 고르고 문구 · 계좌 · 기한을 확인해요.</div>''')
rep('''      <details class="bm-pv" id="bmPvFold" open>
        <summary>미리보기</summary>''', '''      <details class="bm-pv card w144right" id="bmPvFold" open>
        <summary>알림톡 미리보기</summary>''')
# 보내기 줄(bm-go)은 왼쪽 칸 맨 아래로
rep('''        </details>
      </div>
      <details class="bm-pv card w144right" id="bmPvFold" open>''', '''        </details>
        <div id="w144goSlot"></div>
      </div>
      <details class="bm-pv card w144right" id="bmPvFold" open>''')
rep('''.dashhead h2 em,.jsay em{font-style:normal;color:inherit}''', '''.dashhead h2 em,.jsay em{font-style:normal;color:inherit}
/* v144 11판 — 청구서 숫자 4칸 카드 없이 · 단추 3개 + 더 보기 · 보내기/미리보기 두 칸 */
.w144bare{background:none;border:0;box-shadow:none;padding:0}
.w144bare>h2{display:none}
.w144bare .sums .sum{background:var(--card);border:1px solid var(--line);border-radius:16px}
.w144more{position:relative;display:inline-block}
.w144acts{align-items:center}
.w144more>summary{list-style:none;cursor:pointer;display:inline-flex;align-items:center;margin:0}
.w144acts .w144more>summary.btn{padding:0 14px;height:43px;font-size:14.5px;border-radius:11px;background:var(--surface2);border:1px solid var(--line);box-sizing:border-box}   /* 옆 단추와 같은 모양 */
.w144more>summary::-webkit-details-marker{display:none}
.w144menu{position:absolute;z-index:30;top:calc(100% + 6px);left:0;min-width:240px;background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);padding:8px;display:flex;flex-direction:column;gap:6px}
.w144menu .btn{width:100%;justify-content:flex-start}
.w144two{background:none;border:0;box-shadow:none;padding:0}
.w144two>.dash{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start}
.w144two .w144left,.w144two .w144right{margin:0}
.w144right>summary{font-size:16px;font-weight:800;list-style:none;margin-bottom:10px}
.w144right>summary::-webkit-details-marker{display:none}
.w144two .bm-go{position:static;margin-top:14px;border-radius:14px}
@media (max-width:800px){.w144two>.dash{grid-template-columns:minmax(0,1fr)}}''')
_i = s.rfind("</body>"); s = s[:_i] + '''<script>/* v144 보내기 줄을 «2. 청구서 보내기» 칸 맨 아래로 (id 는 그대로라 하는 일은 같아요) */
(function(){try{var g=document.getElementById("bmGo"),t=document.getElementById("w144goSlot");if(g&&t)t.appendChild(g);}catch(e){}})();</script>
''' + s[_i:]
open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s))
