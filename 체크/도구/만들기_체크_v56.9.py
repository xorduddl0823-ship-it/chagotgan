"""체크 v56.9 = v56.8 + 서버 v54 답 모양 확정에 맞춤 (서버 방 10/20 · main 2afaead)
쓰는 법: python3 체크/도구/만들기_체크_v56.9.py   (v56.8 은 읽기만)
  ① 배달 다시 보내기 답이 {ok:true, sent, bad, unsure}로 바뀜 — 보낸 수는 sent 로 셈(예전 ok 숫자 자리) · 한 건 다시 보내기도 sent 로 «다시 보냈어요» 판단
  ② 딜러 승인 뒤 다시 보낸 알림: results[i].unsure(확인 중) 수를 따로 알림
  ③ 재검사 «매일 자동»: 서버가 autoBlocked:true(알림톡 승인 전)면 칸을 잠그고 «알림톡 승인 전이라 아직 켤 수 없어요»
"""
import os, hashlib
HERE = os.path.dirname(os.path.abspath(__file__)); CHK = os.path.dirname(HERE); ROOT = os.path.dirname(CHK)
SRC = os.path.join(CHK, "2_차곳간_체크_index_v56.8.html"); OUT = os.path.join(CHK, "2_차곳간_체크_index_v56.9.html")
s = open(SRC, encoding="utf-8").read()
if hashlib.sha256(s.encode()).hexdigest()[:12] != "c35224486212": raise SystemExit("v56.8 이 보안 통과 판과 달라요")
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:120]))
    s = s.replace(old, new)
rep('ver:"체크 v56.8", date:"10/19"', 'ver:"체크 v56.9", date:"10/20"')
rep('$("hdVer").textContent="체크 v56.8 · "', '$("hdVer").textContent="체크 v56.9 · "')
rep('<!-- 체크 v56.8 (', '<!-- 체크 v56.9 (v56.8 + 서버 v54 답 모양 · 다시 보내기 sent · 승인 알림 확인 중 · 매일 자동 잠금) · 체크 v56.8 (')
# ① 배달 다시 보내기 — v54 {ok:true, sent, bad, unsure}
rep('else if(fn==="deliv_resend"){ u=Number(r.unsure)||Number(r.checking)||0;',
    'else if(fn==="deliv_resend"){ if(typeof r.ok==="boolean") r.ok=Number(r.sent)||0;   /* v56.9: 서버 v54 — 보낸 수는 sent */\n        u=Number(r.unsure)||Number(r.checking)||0;')
rep('      if(Array.isArray(r.results)){', '      if(fn!=="deliv_resend" && Array.isArray(r.results)){   /* v56.9: 배달 다시 보내기는 v54 부터 results 도 오지만 수(sent · bad · unsure)로 셈 */')
# ② 딜러 승인 뒤 알림 — 확인 중 따로
rep('R.forEach(function(x){ sent+=Number(x.sent)||0; failN+=Number(x.failed)||0; });',
    'var unN=0; R.forEach(function(x){ sent+=Number(x.sent)||0; failN+=Number(x.failed)||0; unN+=Number(x.unsure)||0; });   /* v56.9: 확인 중 */')
rep('''(resend?" 알림 "+won(sent)+"건을 다시 보냈어요."+(failN?" "+won(failN)+"건은 못 보냈어요.":""):"")+''',
    '''(resend?" 알림 "+won(sent)+"건을 다시 보냈어요."+(failN?" "+won(failN)+"건은 못 보냈어요.":"")+(unN?" 확인 중 "+won(unN)+"건 — 보낸 기록에서 확인해 주세요. 다시 보내지 마세요.":""):"")+''')
# ③ 매일 자동 — 알림톡 승인 전 잠금
rep('''      '<label class="chip"><input type="checkbox" id="rmAuto"'+(RRULE.auto?" checked":"")+(own?"":" disabled")+'> 매일 아침 9시쯤 자동으로 보내기</label>'+''',
    '''      '<label class="chip"><input type="checkbox" id="rmAuto"'+(RRULE.auto&&!RRULE.autoBlocked?" checked":"")+(own&&!RRULE.autoBlocked?"":" disabled")+'> 매일 아침 9시쯤 자동으로 보내기</label>'+
      (RRULE.autoBlocked?'<span class="note" style="color:var(--warn)">알림톡 승인 전이라 «매일 자동»은 아직 켤 수 없어요. 손으로 보내기는 돼요.</span>':'')+   /* v56.9: 서버 autoBlocked */''')
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", os.path.relpath(OUT, ROOT), hashlib.sha256(s.encode()).hexdigest()[:12])
