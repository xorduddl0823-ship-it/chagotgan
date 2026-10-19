"""기사 앱 v29 = v28 + 도착 보내기 믿음 (대표님 10/19 최우선 · 운영/긴급/2026-10-19_기록_알림톡_출시마감_요청.md «체크» 줄)
쓰는 법: python3 체크/도구/만들기_기사앱_v29.py   (v28 은 읽기만)
  ① 도착 보내기(api_arrive)에 같은 일 표시(rid 24자)를 붙여요 — 답을 못 받아 다시 보내도 같은 rid(서버가 한 번만 처리 · 알림 한 번)
     «그래도 보내기»(일부러 한 번 더)는 새 rid
  ② 보내지 못했어요 창에 «다시 보내기» 단추(같은 rid 로 다시) — 예전엔 «닫기»만
"""
import os, hashlib
HERE = os.path.dirname(os.path.abspath(__file__)); CHK = os.path.dirname(HERE)
SRC = os.path.join(CHK, "driver", "index_v28.html"); OUT = os.path.join(CHK, "driver", "index_v29.html")
s = open(SRC, encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:120]))
    s = s.replace(old, new)
rep("<!DOCTYPE html>\n", "<!DOCTYPE html>\n<!-- 기사 앱 v29 (v28 + 도착 보내기 같은 일 표시 rid · 다시 보내기 · 10/19) -->\n")
rep("""    body: JSON.stringify({ fn: String(fn).replace(/^api_/,'deliv_'), args: a }) })""",
    """    body: JSON.stringify(DRV_RID ? { fn: String(fn).replace(/^api_/,'deliv_'), args: a, rid: DRV_RID } : { fn: String(fn).replace(/^api_/,'deliv_'), args: a }) })""")
rep("""var API='https://ybfpxmmjofyvfprtvmhj.supabase.co/functions/v1/check-api';""",
    """var API='https://ybfpxmmjofyvfprtvmhj.supabase.co/functions/v1/check-api';
/* v29: 같은 일 표시 — 도착 보내기 한 건마다 무작위 24자. 답을 못 받아 다시 보내면 같은 값(서버가 한 번만 처리 · 알림 한 번) */
var DRV_RID='';
function newRid(){ var A='abcdefghijklmnopqrstuvwxyz0123456789', a=new Uint8Array(24); try{ crypto.getRandomValues(a); }catch(e){ for(var i=0;i<24;i++) a[i]=Math.floor(Math.random()*256); }
  return Array.prototype.map.call(a,function(x){ return A[x%36]; }).join(''); }""")
rep("""  call('api_arrive', me.pin, rec).then(function(r){""",
    """  if(force || !S.rid) S.rid=newRid();   /* v29: «그래도 보내기»는 새 일 · 다시 보내기는 같은 일 */
  DRV_RID=S.rid; var sent=call('api_arrive', me.pin, rec); DRV_RID='';
  sent.then(function(r){""")
rep("""    modal('<h3>보내지 못했어요</h3><div class="bad" style="margin-bottom:14px">'+esc(e.message)+'</div><button class="big b-sub" id="m-no">닫기</button>');
    $('m-no').onclick=closeModal;""",
    """    modal('<h3>보내지 못했어요</h3><div class="bad" style="margin-bottom:14px">'+esc(e.message)+'</div>'+
      '<button class="big b-main" id="m-again">다시 보내기</button><div style="height:8px"></div><button class="big b-sub" id="m-no">닫기</button>');
    $('m-no').onclick=function(){ S.rid=''; closeModal(); }; $('m-again').onclick=function(){ doSend(false); };   /* v29: «다시 보내기»만 같은 일 표시 — 닫고 고쳐 보내면 새 일 */""")
# 내용을 고치면 새 일(같은 표시는 «다시 보내기»에서만)
rep("""function check(){
  saveDraft();""", """function check(){
  saveDraft(); S.rid='';   /* v29: 내용이 바뀌면 새 일 */""")
# 보낸 방법 말 — 용어사전(짧은 문자 · 긴 문자)
rep("""(h==='LMS'||h==='SMS')?'문자':(h||'-'); }""", """h==='LMS'?'긴 문자':h==='SMS'?'짧은 문자':'—'; }""")
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", os.path.relpath(OUT, os.path.dirname(CHK)), hashlib.sha256(s.encode()).hexdigest()[:12])
