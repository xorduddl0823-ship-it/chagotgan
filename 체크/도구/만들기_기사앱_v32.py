"""기사 앱 v32 = v31 + 도착 알림 «꺼짐» (체크 v56.10 · 총괄 11/2 대표님 요청)
쓰는 법: python3 체크/도구/만들기_기사앱_v32.py   (v31 은 읽기만 · 운영 중)
  ① 시작 답 arrive_on:false 면 위에 띠 «지금 도착 알림이 꺼져 있어요 — 기록만 남아요»
  ② 도착 보낸 뒤 서버가 alarmOff:true 또는 발송결과 «꺼짐»이면: «기록은 됐어요 — 도착 알림은 꺼져 있어요» (v31 은 «보냈어요»로 잘못 보였음)
  ③ 내 기록 칩 «알림 꺼짐»
  서버가 이 칸을 아직 안 주면(v54) 지금과 똑같이 움직여요.
"""
import os, hashlib
HERE = os.path.dirname(os.path.abspath(__file__)); CHK = os.path.dirname(HERE)
SRC = os.path.join(CHK, "driver", "index_v31.html"); OUT = os.path.join(CHK, "driver", "index_v32.html")
s = open(SRC, encoding="utf-8").read()
if hashlib.sha256(s.encode()).hexdigest()[:12] != "512339bfb3eb": raise SystemExit("기사 앱 v31 이 보안 통과 판과 달라요")
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:120]))
    s = s.replace(old, new)
rep("<!-- 기사 앱 v31 (", "<!-- 기사 앱 v32 (v31 + 도착 알림 «꺼짐» · 11/2) · 기사 앱 v31 (")
rep("""  if(r.발송결과==='확인 중') return ['확인 중','p-test'];""", """  if(r.발송결과==='확인 중') return ['확인 중','p-test'];
  if(r.발송결과==='꺼짐') return ['알림 꺼짐','p-test'];   /* v32: 사무실에서 도착 알림을 꺼 둔 동안 */""")
rep("""    <div id="test-banner" class="warn hide">""", """    <div id="off-banner" class="warn hide">지금은 <b>도착 알림이 꺼져</b> 있어요 — 도착을 남기면 기록과 사진만 남고, 딜러에게 알림은 안 가요.</div>
    <div id="test-banner" class="warn hide">""")
rep("""    $('ver').textContent=b.ver+' · 딜러 '+(b.dealers||[]).length+'명';
    show('main');""", """    $('ver').textContent=b.ver+' · 딜러 '+(b.dealers||[]).length+'명';
    $('off-banner').classList.toggle('hide', b.arrive_on!==false);   /* v32: 사무실이 도착 알림을 꺼 둠 */
    show('main');""")
rep("""    var row=r.row, ok=row.발송결과!=='실패';
    clearDraft();""", """    if(r.alarmOff===true || (r.row&&r.row.발송결과==='꺼짐')){ offDone(r.row||null); return; }   /* v32: 알림 꺼짐 — «보냈어요» 아님 */
    var row=r.row, ok=row.발송결과!=='실패';
    clearDraft();""")
rep("""function clearForm(){""", """/* v32: 기록은 저장됐고 도착 알림은 사무실에서 꺼 둠 — 다시 보낼 것 없음 */
function offDone(row){
  if(S.dest){ var rc=(ls(RECENT)||[]).filter(function(x){ return x!==S.dest; }); rc.unshift(S.dest); ls(RECENT, rc.slice(0,30)); freqAdd(S.dest); }
  clearDraft(); S.rid='';
  $('off-banner').classList.remove('hide');
  modal('<h3>기록은 됐어요 — 도착 알림은 꺼져 있어요</h3><div class="warn" style="margin-bottom:14px">'+(row?esc(row.차량번호)+' → '+esc(row.목적지)+'<br>':'')+
    '사무실에서 도착 알림을 꺼 두어서 딜러에게 알림은 안 갔어요. 기록과 사진은 남았어요.</div>'+
    '<button class="big b-main" id="m-next">다음 차량</button>');
  $('m-next').onclick=function(){ closeModal(); clearForm(); start(); };
}
function clearForm(){""")
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", os.path.relpath(OUT, os.path.dirname(CHK)), hashlib.sha256(s.encode()).hexdigest()[:12])
