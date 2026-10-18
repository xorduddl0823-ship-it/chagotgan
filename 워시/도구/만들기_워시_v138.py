"""워시 v137 → v138. 총괄 10/18 밤: v137 보안 통과 뒤에 나온 것들
쓰는 법: python3 워시/도구/만들기_워시_v138.py  (v137 판 위에 덧붙임 — v137 은 덮어쓰지 않아요)
  1) 공통 1.13 손질판(85fe100 — 밀린 달 고르기 줄 고침)으로 바꾸고, v137 의 워시 쪽 임시 CSS 줄을 빼요
  2) 설정 › 알림 화면 차례 = 시안 차례: 메시지 발송 연동 → 카카오 알림톡 → PC 알림창 · 소리 → 보낸 기록(맨 아래)
  3) 홈 «이번 달 어디까지 왔나» (체크 v56 과 같은 4칸 · 같은 제목 모양 · 누르기 없음 — 디자인 방에 공통 부품으로 옮기기 부탁)
     ① 입고 · 출고(워시 첫 칸 · 체크는 자료 올리기) ② 청구서 만들기 ③ 청구서 보내기 ④ 입금 확인 — 매니저는 돈 화면이 없어 안 보여요
운영 v111 · 시험판 v125 · v126 ~ v137 은 덮어쓰지 않는다.
"""
import os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE); ROOT = os.path.dirname(BASE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v137.html"); OUT = os.path.join(BASE, "1_차곳간_워시_index_v138.html")
G = os.path.join(ROOT, "디자인", "공통")
def gd(n): return open(os.path.join(G, n), encoding="utf-8").read()
def gitshow(rev, path): return subprocess.check_output(["git", "-C", ROOT, "show", rev + ":" + path]).decode("utf-8")
s = open(SRC, encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('var APP_VER="워시 v137 · UI 3.0 · 2026-10-18";', 'var APP_VER="워시 v138 · UI 3.0 · 2026-10-18";')

# 1) 공통 1.13 (v137 에 들어간 50d8b8f 판) → 손질판(지금 디자인/공통 · 85fe100 달 줄 고침) · 임시 줄 빼기
rep(gitshow("50d8b8f", "디자인/공통/cgg-j4-1.13.css"), gd("cgg-j4-1.13.css"))
rep(gitshow("50d8b8f", "디자인/공통/cgg-j4-1.13.js"), gd("cgg-j4-1.13.js"))
rep('''/* v137 공통 1.13 고쳐질 때까지: 밀린 달 고르기 줄은 가로 한 줄 (체크 v56 .chk-bb 와 같은 모양) */
.cgg-dlg label.cgg-bbrow{flex-direction:row;text-align:left;font-size:14px;font-weight:400;color:var(--text)}
''', '')

# 2) 알림 화면 차례 — 보낸 기록은 맨 아래(PC 알림창 · 소리 다음)
rep('''    <h2>PC 알림창 <span class="rt">현장에서 입고·출고가 되면 PC에 알려 줘요</span></h2>''',
'''    <h2>PC 알림창 · 소리 <span class="rt">현장에서 입고·출고가 되면 PC에 알려 줘요</span></h2>''')
rep("/* v137 보낸 기록은 «알림» 안 — 맨 위 카드(메뉴 지도 «설정 › 알림 › 보낸 기록» · 체크는 다음 판에 같은 카드) */",
    "/* v138 보낸 기록은 «알림» 안 — 맨 아래 카드(시안 차례 · 메뉴 지도 «설정 › 알림 › 보낸 기록» · 체크는 다음 판에 같은 카드) */")
rep('''<section id="vSend" hidden>''', '''<section id="vSend" hidden>
  <!-- v138 시안 차례: 메시지 발송 연동 → 카카오 알림톡 → PC 알림창 · 소리 → 보낸 기록 -->''')
# 보낸 기록 카드를 sendBody 맨 위에서 빼서, 알림 화면 맨 아래 칸(sendObBox)에 그려요
rep('''  $("sendBody").innerHTML=
  '<div class="card" id="sendOutbox"><h2>보낸 기록 <span class="rt">'+(obFail?'<span style="color:var(--stop)">못 보냄 '+obFail+'건</span>':'보냄 '+obSent+'건')+'</span></h2>'+
   '<div class="hint" style="margin:-6px 0 12px">보낸 메시지를 보고, 못 보낸 것은 다시 보내요.</div>'+
   '<button class="btn'+(obFail?' primary':'')+'" id="sendObGo">보낸 기록 열기</button></div>'+
''', '''  var obBox=$("sendObBox");
  if(!obBox){obBox=document.createElement("div");obBox.id="sendObBox";var sec=$("vSend");if(sec)sec.appendChild(obBox);}
  obBox.innerHTML=
  '<div class="card" id="sendOutbox"><h2>보낸 기록 <span class="rt">'+(obFail?'<span style="color:var(--stop)">못 보냄 '+obFail+'건</span>':'보냄 '+obSent+'건')+'</span></h2>'+
   '<div class="hint" style="margin:-6px 0 12px">보낸 메시지를 보고, 못 보낸 것은 다시 보내요.</div>'+
   '<button class="btn'+(obFail?' primary':'')+'" id="sendObGo">보낸 기록 열기</button></div>';
  $("sendBody").innerHTML=
''')

# 3) 홈 «이번 달 어디까지 왔나» — renderHome 의 값으로 셈해서 wHome 에 넘겨요
rep('''pick:(typeof pick!=="undefined"?pick:[]),paid:paid,dueAmt:dueAmt,''',
'''pick:(typeof pick!=="undefined"?pick:[]),paid:paid,dueAmt:dueAmt,steps:(function(){   /* v138 이번 달 어디까지 왔나 */
    var nIn=rows.length,nWk=rows.filter(function(r){return statusOf(r)==="입고";}).length;
    var nB=Object.keys(billComps).length;
    var bm=S.records.filter(function(r){var st=statusOf(r);return (r.month||mKey(r.createdAt))===billM&&(st==="출고"||st==="수금완료");});
    var bAll=bm.reduce(function(t,r){return t+(r.total||0);},0),bGot=bm.filter(function(r){return statusOf(r)==="수금완료";}).reduce(function(t,r){return t+(r.total||0);},0);
    return {inM:D.month,nIn:nIn,nWk:nWk,nB:nB,nUn:(notBilled||[]).length,billM:billM,bAll:bAll,bGot:bGot};})(),''')
rep('''  /* 정산(이번 달 입금)은 매니저에게 보이지 않아요 */
  if(mgr){var mc=host.querySelector(".cgg-homeside .cgg-side");if(mc)mc.remove();}''',
'''  /* 정산(이번 달 입금)은 매니저에게 보이지 않아요 */
  if(mgr){var mc=host.querySelector(".cgg-homeside .cgg-side");if(mc)mc.remove();}
  /* v138 이번 달 어디까지 왔나 (체크와 같은 4칸 · 대표만) — 왼쪽부터 차례대로 */
  if(!mgr&&c.steps){
    var st=c.steps,pc=function(a,b){return b>0?Math.max(0,Math.min(100,Math.round(a/b*100))):0;};
    var stp=function(done,title,pct,sub){return '<div class="'+(done?"done":"")+'"><b>'+esc(title)+'</b><div class="bar"><i style="width:'+pct+'%"></i></div><small>'+esc(sub)+'</small></div>';};
    var bmL=periodLabel(st.billM),inL=periodLabel(st.inM),sent=st.nB-st.nUn;
    var sb=document.createElement("div");sb.className="card wsh-steps-card";sb.id="homeSteps";
    sb.innerHTML='<h2>이번 달 어디까지 왔나</h2><div class="hint" style="margin:-6px 0 12px">왼쪽부터 차례대로 하시면 돼요.</div><div class="wsh-steps">'+
      stp(st.nIn>0&&st.nWk===0,"1. 입고 · 출고",pc(st.nIn-st.nWk,st.nIn),st.nIn?(inL+" "+st.nIn+"대 · 작업 중 "+st.nWk+"대"):(inL+" 들어온 차가 없어요"))+
      stp(st.nB>0,"2. 청구서 만들기",st.nB?100:0,st.nB?(bmL+" · "+st.nB+"장 만듦"):(bmL+" 청구할 차가 없어요"))+
      stp(st.nB>0&&st.nUn===0,"3. 청구서 보내기",pc(sent,st.nB),sent+"장 보냄 · "+st.nUn+"장 남음")+
      stp(st.bAll>0&&st.bGot>=st.bAll,"4. 입금 확인",pc(st.bGot,st.bAll),pc(st.bGot,st.bAll)+"% 입금")+'</div>';
    var hp=host.querySelector(".cgg-help");host.insertBefore(sb,hp||null);
  }''')
rep('''.dashhead h2 em,.jsay em{font-style:normal;color:inherit}''',
'''.dashhead h2 em,.jsay em{font-style:normal;color:inherit}
/* v138 이번 달 어디까지 왔나 — 체크 v56 .chk-steps 와 같은 모양 (공통 부품으로 옮기면 걷어내요) */
.wsh-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.wsh-steps>div{background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:12px 14px;font-size:13.5px;line-height:1.5}
.wsh-steps>div b{display:block;font-size:14px}
.wsh-steps>div .bar{height:6px;border-radius:3px;background:var(--line);margin:8px 0 4px;overflow:hidden}
.wsh-steps>div .bar i{display:block;height:100%;background:var(--blue)}
.wsh-steps>div.done .bar i{background:var(--done)}
.wsh-steps>div small{color:var(--muted)}
@media (max-width:800px){.wsh-steps{grid-template-columns:repeat(2,minmax(0,1fr))}}''')

open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s))
