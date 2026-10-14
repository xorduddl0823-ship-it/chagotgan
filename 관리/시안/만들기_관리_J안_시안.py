"""J안 4판(디자인 서랍)에서 관리 J안 시안을 만든다. 원본은 읽기만 한다.
쓰는 법: python3 만들기_관리_J안_시안.py 관리/시안/관리_J안_시안.html
J안 안에 이미 있는 관리 덩어리(PR.admin)를 그대로 쓰고, 워시 덩어리만 뺀다.
지금 쓰는 관리 화면(관리/3_차곳간_관리_index.html)은 건드리지 않는다 (다음 주 시험은 지금 화면으로)."""
import sys
SRC = "/home/user/chagotgan/디자인/차곳간_공통_E안_클로드코드_전달파일/08_차곳간_합친디자인_J.html"
OUT = sys.argv[1]
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    if s.count(old) < 1:
        raise SystemExit("못 찾음: " + old[:80])
    s = s.replace(old, new, count)

# 1) 제목
rep("<title>차곳간 합친 디자인 J</title>", "<title>관리 J안 시안</title>")

# 2) 제품 등록부: 워시는 빼고 관리 한 덩어리만 (관리 서랍 시안이라 관리만)
i = s.index("var PR = {\n") + len("var PR = {\n")
j = s.index("\nadmin:{", i) + 1
s = s[:i] + s[j:]
# 예시 값은 지어낸 값으로 (기준서 6-3)
rep('biz:["티와이컴퍼니","304-32-00956 · 대표 유현호"], me:["유","유 대표"], hello:"유 대표님"',
    'biz:["차곳간 본사","123-45-67890 · 대표 한본사"], me:["한","한 대표"], hello:"한 대표님"')
rep('var PK="wash"; try{ var pk0=localStorage.getItem("cgg_prod"); if(PR[pk0]) PK=pk0; }catch(e){}', 'var PK="admin";')
rep('''function setProd(k){ var kk=key()||"work"; useProduct(k); try{ localStorage.setItem("cgg_prod",k); }catch(e){}''',
    '''function setProd(k){ var kk=key()||"work"; useProduct(k);''')
# 워시 현장 화면 버튼은 관리에 없음
rep('if(sc==="field"){ if(PK!=="wash") setProd("wash"); enterField(); return; } ', '')

# 3) 바깥 안내 페이지 — 관리용
a = s.index('<div class="pg">'); b = s.index('<div class="pick" role="group" aria-label="메뉴 배치">')
PG = '''<div class="pg">
  <h1>관리 J안 시안</h1>
  <p class="lead">
    디자인 방의 <b>합친 디자인 J안(4판)</b>을 그대로 복사하고, 그 안의 <b>관리(본사)</b> 부분만 남긴 시안이에요.
    <b>홈 · 업체 관리</b> 화면을 볼 수 있어요. 업체 이름 · 번호 · 금액은 모두 지어낸 예시예요.
    <b>지금 쓰는 관리 화면은 하나도 바꾸지 않았어요</b> (다음 주 시험은 지금 화면으로 해요).
  </p>
  '''
s = s[:a] + PG + s[b:]
rep('''    <button class="pb" data-scr="work" aria-pressed="true">대표 목록 (워시 일감 · 관리 업체)</button>
    <button class="pb" data-scr="field" aria-pressed="false">워시 현장 화면 (폰)</button>''',
    '''    <button class="pb" data-scr="work" aria-pressed="true">업체 관리</button>''')
rep('<button class="pb" data-scr="home" aria-pressed="false">홈 (현황판)</button>', '<button class="pb" data-scr="home" aria-pressed="false">홈</button>')

# 4) 아래 설명 — J안 설명 대신 관리 메뉴 대조표
a = s.index('<div class="note">'); b = s.index('<div id="dim" hidden></div>')
NOTE = '''<div class="note">
    <h2>메뉴 8묶음 (지금 관리 화면 → J안)</h2>
    <p>17개 화면은 하나도 빼지 않았어요. 묶음 차례는 지금 관리 화면의 메뉴 차례(처음 나오는 순서) 그대로예요.</p>
    <div class="wt"><table><thead><tr><th>묶음</th><th>지금 관리 화면 (3_차곳간_관리_index.html)</th><th>J안</th></tr></thead><tbody>
    <tr><td>홈</td><td>홈 · 운영 상태</td><td>홈 · 운영 상태</td></tr>
    <tr><td>계정</td><td>계정 · 가입 코드 <small>(2번째 묶음 「업체」 다음)</small></td><td class="new">가입 코드 · 계정 관리 <small>(2번째로 올라옴)</small></td></tr>
    <tr><td>업체</td><td>업체 · 잠금·차단</td><td class="new">업체 관리 · 잠금 · 차단</td></tr>
    <tr><td>받는 금액</td><td class="old">받는 돈: 요금제 · 결제 · 충전 · 카드 결제</td><td class="new">받는 금액: 요금제 · 결제 내역 · 충전 · 카드 결제</td></tr>
    <tr><td>내는 금액</td><td class="old">내는 돈: 정산 · 유지비</td><td class="new">내는 금액: 정산 · 유지비</td></tr>
    <tr><td>세금계산서</td><td>세금계산서</td><td>세금계산서</td></tr>
    <tr><td>알림</td><td>공지사항 · 기한 안내 문자</td><td>기한 안내 문자 · 공지사항</td></tr>
    <tr><td>설정</td><td>보안 · 내 계정</td><td class="new">보안 점검 · 내 관리자 계정</td></tr>
    </tbody></table></div>
    <p><b>대표님이 정해 주실 것</b> — ① 「계정」을 「업체」 앞(2번째)으로 올릴지 ② 화면 이름 바뀐 곳(업체 → 업체 관리, 결제 → 결제 내역, 보안 → 보안 점검, 내 계정 → 내 관리자 계정)을 이대로 할지.</p>
  </div>
</div>
'''
s = s[:a] + NOTE + s[b:]

open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", OUT, len(s), "글자")
