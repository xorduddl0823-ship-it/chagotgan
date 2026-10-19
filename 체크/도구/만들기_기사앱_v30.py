"""기사 앱 v30 = v29 + 알림 «확인 중»(결과 불명) (출시마감 3차 · 10/19)
쓰는 법: python3 체크/도구/만들기_기사앱_v30.py   (v29 는 읽기만)
  ① 도착 보낸 뒤 서버가 발송결과 «확인 중»이면: «기록은 됐어요 — 알림은 확인 중이에요» (보냈어요/못 보냈어요 아님) · 다시 보내기 없음
  ② 같은 일을 다시 보냈는데 앞 것이 확인 중(오류 글이 «확인 중»으로 시작): 같은 창 · 다시 보내기 없음
  ③ 내 기록 칩 «확인 중»
"""
import os, hashlib
HERE = os.path.dirname(os.path.abspath(__file__)); CHK = os.path.dirname(HERE)
SRC = os.path.join(CHK, "driver", "index_v29.html"); OUT = os.path.join(CHK, "driver", "index_v30.html")
s = open(SRC, encoding="utf-8").read()
if hashlib.sha256(s.encode()).hexdigest()[:12] != "7c3c438faee0": raise SystemExit("기사 앱 v29 가 보안 통과 판과 달라요")
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:120]))
    s = s.replace(old, new)
rep("<!-- 기사 앱 v29 (", "<!-- 기사 앱 v30 (v29 + 알림 «확인 중» · 10/19) · 기사 앱 v29 (")
rep("""  if(r.발송결과==='실패') return ['못 보냄','p-bad'];""", """  if(r.발송결과==='실패') return ['못 보냄','p-bad'];
  if(r.발송결과==='확인 중') return ['확인 중','p-test'];   /* v30: 보냈는지 아직 모름 — 사무실 «보낸 기록»에서 확인 */""")
rep("""    var row=r.row, ok=row.발송결과!=='실패';""", """    var row=r.row, ok=row.발송결과!=='실패';
    if(row.발송결과==='확인 중'){ unsureDone(row); return; }   /* v30 */""")
rep("""  }).catch(function(e){
    modal('<h3>보내지 못했어요</h3>""", """  }).catch(function(e){
    if(/^확인 중/.test(String(e&&e.message||''))){ unsureDone(null); return; }   /* v30: 앞 것이 확인 중 — 다시 보내지 않아요 */
    modal('<h3>보내지 못했어요</h3>""")
rep("""function clearForm(){""", """/* v30: 기록은 저장됐고 알림만 결과를 아직 모름 — 다시 보내지 않게, 사무실 «보낸 기록»에서 확인 */
function unsureDone(row){
  clearDraft(); S.rid='';
  modal('<h3>기록은 됐어요 — 알림은 확인 중이에요</h3><div class="warn" style="margin-bottom:14px">'+(row?esc(row.차량번호)+' → '+esc(row.목적지)+'<br>':'')+
    '알림이 나갔는지 아직 확인 중이에요. 다시 보내지 말고, 사무실 «보낸 기록»에서 확인해 주세요.</div>'+
    '<button class="big b-main" id="m-next">다음 차량</button>');
  $('m-next').onclick=function(){ closeModal(); clearForm(); start(); };
}
function clearForm(){""")
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", os.path.relpath(OUT, os.path.dirname(CHK)), hashlib.sha256(s.encode()).hexdigest()[:12])
