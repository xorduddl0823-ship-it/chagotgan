"""체크 v47 → v47.1 — 작은 고침 (v47 최종 987f5dd 는 읽기만 · 보안 통과 판은 그 자리에서 고치지 않음)
대표님 TEST v47 시험(10/18): 사업자등록증 사진으로 채운 뒤 «번호 모양 맞음»만 나오고 국세청 결과 · 단추가 없음
  → 서버 v38 은 확인이 안 될 때 {ready:false, why} 를 주는데 화면이 why 를 버렸음
  · 거래처 부품 cpt 1.2 → 1.3: why 가 있으면 «번호 모양 맞음 · 국세청 확인 안 됨: {why}» + «다시 확인» 단추 (열쇠 없음 «준비 중»만 조용히)
  · 이음새가 why 를 그대로 넘김
"""
BASE = "/home/user/chagotgan/체크/"
s = open(BASE + "2_차곳간_체크_index_v47.html", encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

JS12 = open(BASE + "부품/거래처_부품_1.2.js", encoding="utf-8").read()
JS13 = open(BASE + "부품/거래처_부품_1.3.js", encoding="utf-8").read()
rep(JS12, JS13)
rep('''          return {ready:r.ready!==false, state:r.state||"", since:r.since||r.closedAt||"",''',
    '''          return {ready:r.ready!==false, state:r.state||"", since:r.since||r.closedAt||"", why:String(r.why||""),   /* v47.1: 안 될 때 까닭 */''')
rep('$("hdVer").textContent="체크 v47 · "', '$("hdVer").textContent="체크 v47.1 · "')
assert JS13 in s and JS12 not in s
open(BASE + "2_차곳간_체크_index_v47.1.html", "w", encoding="utf-8").write(s)
print("OK v47.1", len(s))
