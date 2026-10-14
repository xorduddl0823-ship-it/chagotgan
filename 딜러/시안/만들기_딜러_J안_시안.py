"""J안 4판(디자인 서랍)에서 딜러 J안 시안을 만든다. 원본은 읽기만 한다.
쓰는 법: python3 딜러/시안/만들기_딜러_J안_시안.py 딜러/시안/딜러_J안_시안.html
기준: 디자인/01_J안_제품별_시안_기준.md 4-1장 · 딜러/02_J안_시안_재료.md
지금 운영 중인 딜러앱(dealer.cgg.co.kr)은 건드리지 않는다. 예시 자료는 모두 지어낸 것."""
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
rep("<title>차곳간 합친 디자인 J</title>", "<title>딜러 J안 시안</title>")

# 2) 제품 등록부: 워시 · 관리는 빼고 딜러 한 덩어리만
i = s.index("var PR = {\n") + len("var PR = {\n")
j = s.index("\n};\nvar PK=", i)
DEALER = r'''dealer:{ label:"딜러", desc:"내 차 상품화", sub:"딜러앱 · 딜러 d2.3 · UI 3.0", biz:["김하나 딜러","한결모터스 (예시)"], me:["김","김하나 님"], hello:"김하나 님",
  field:false, find:"차량번호 · 차종 · 업체 찾기",
  /* 메뉴 차례 = 지금 딜러앱 아래 탭 차례 그대로 (내 차 · 알림 · 청구서 · 카히스토리 · 내 정보) + J안 공통 «홈» */
  menu:[["홈",[["홈","home"]],"home"],["내 차",[["내 차","work"]],"car"],["알림",[["알림"]],"bell"],
        ["청구서",[["청구서"]],"file"],["카히스토리",[["카히스토리 조회"]],"search"],["내 정보",[["내 정보"]],"user"]],
  /* 표 열 차례 = 공통 차례: 지금 위치(이름) → 차량번호 → 차종 → 작업 → 마지막 기록 → 들어간 금액 → 단계 */
  rows:[["바른리페어","12가 3456","그랜저 IG","판금 · 도색","10.13 15:20",320000,"작업 중"],
        ["한결광택","34나 7788","쏘렌토 MQ4","광택","10.13 14:05",180000,"작업 중"],
        ["한결광택","56다 1122","K5 3세대","광택 + 실내","10.13 09:40",null,"입고"],
        ["맑은세차","78라 9090","BMW 520d","세차","10.13 11:10",40000,"출고"],
        ["바른리페어 → 한결광택","90마 4545","카니발 4세대","판금","10.13 13:30",250000,"출고"],
        ["한결모터스 (내 상사)","11바 2323","GV80","광택","10.13 10:50",220000,"도착"],
        ["한결모터스 (내 상사)","22사 6767","아반떼 CN7","세차","10.12 17:20",40000,"도착"],
        ["새빛휠","33아 8181","팰리세이드","휠 복원","10.12 16:00",null,"입고"],
        ["새빛휠","44자 1919","레이","휠 복원","10.10 10:15",90000,"작업 중"],
        ["맑은세차","55차 2828","벤츠 E220d","실내","10.09 14:40",60000,"작업 중"],
        ["한결모터스 (내 상사)","77타 4646","스포티지","광택","10.08 18:00",180000,"상품화 완료"]],
  cols:["지금 위치","차량번호","차종","작업","마지막 기록","들어간 금액","단계"], kinds:["name","id","text","text","date","money","state"],
  /* 숫자 카드 4개 — 가안 (시안용, 시안을 보고 대표님이 정함) */
  nums:[["작업 중인 차","4","대","+1","",[2,3,3,4,3,3,4],"#1668C4"],["오늘 출고·도착","3","대","+1","",[1,2,1,3,2,2,3],"#4C93E0"],
        ["이번 주 입고된 차","9","대","+2","",[4,5,6,7,7,8,9],"#0B2545"],["완료 기다리는 차","2","대","−1","dn",[3,3,2,4,3,3,2],"#E08A00"]],
  home:{ jobs:[["한결광택","2대",400000],["바른리페어","2대",570000],["맑은세차","2대",100000],["새빛휠","2대",90000]],
         days:{8:["완료 1대",""],10:["입고 1대",""],12:["입고 1대","도착 1대"],13:["입고 2대","출고 2대"]} },
  tabbar:[[0,"home","홈"],[1,"car","내 차"],[2,"bell","알림"],[3,"file","청구서"],[5,"more","전체"]],
  /* 할 일 3가지 — 가안 (시안용) */
  acts:[["chk","car","도착한 차 2대 «상품화 완료» 누르기","GV80 · 아반떼 CN7 · 한결모터스에 도착"],
        ["run","out","오늘 출고되는 차 2대 받을 준비","BMW 520d · 카니발 4세대 · 오늘 오후"],
        ["stop","today","작업이 3일 넘게 걸리는 차 2대","레이(새빛휠) · 벤츠 E220d(맑은세차) · 업체에 확인해 보세요"]],
  work:{ crumb:"내 차", h1:'작업 중인 차 <em>4대</em>, 도착한 차 <em>2대</em>가 있어요', desc:"업체에 맡긴 내 차가 지금 어디 있는지, 어디까지 됐는지 확인해요.",
    sel:"선택한 차 상품화 완료", add:"", filters:["기록: 최근 30일 ✕","＋ 업체","＋ 작업","＋ 금액"],
    tabs:[["","전체"],["입고","입고"],["작업 중","작업 중"],["출고","출고"],["도착","도착"]],
    mline:function(x){ return x[2]+' · '+x[3]+' · '+x[4]; }, sorts:[[4,-1,"최근 기록순"],[1,1,"차량번호순"],[5,-1,"금액 높은순"],[6,1,"단계순"]],
    help:"업체가 입고 · 출고를 찍으면 여기에 바로 보여요. 차를 누르면 사진과 지나온 기록(택배 조회처럼 최근이 위)이 나와요. 내 상사에 도착한 차는 선택해서 «선택한 차 상품화 완료»를 눌러 주세요. 금액이 «—»이면 업체가 아직 금액을 넣지 않은 거예요.",
    ask:["상품화 완료로 표시할까요?","지금 위치","대수","대","들어간 금액 합계","완료로 표시"] },
  homeH:{ h1:'도착한 차 <em>2대</em>가 완료를 기다려요', add:"",
    cashT:"이번 달 들어간 금액", cashL:"내 차 보기", cash:"1,380,000", pct:100, cashLine:"업체가 넣은 금액을 더한 값이에요. 청구서가 열리면 낼 금액 · 낸 금액이 여기 보여요.",
    jobsT:"업체별 내 차", jobsL:"내 차 보기" } }'''
s = s[:i] + DEALER + s[j:]
rep('var PK="wash"; try{ var pk0=localStorage.getItem("cgg_prod"); if(PR[pk0]) PK=pk0; }catch(e){}', 'var PK="dealer";')
rep('''function setProd(k){ var kk=key()||"work"; useProduct(k); try{ localStorage.setItem("cgg_prod",k); }catch(e){}''',
    '''function setProd(k){ var kk=key()||"work"; useProduct(k);''')

# 3) 처음 화면 = «내 차»(2번째 메뉴)
rep('var view="fit", g=2, s=0, drop=false;', 'var view="fit", g=1, s=0, drop=false;')

# 3-1) 처음 정렬 = 최근 기록순
rep('var T={f:"", q:"", k:0, dir:1, size:10, page:1, sel:{}};', 'var T={f:"", q:"", k:4, dir:-1, size:10, page:1, sel:{}};')

# 4) 단계 이름(입고 · 작업 중 · 출고 · 도착)은 그대로, 칩 색은 공통 네 가지만
rep('var ST={"진행 중":"run","완료":"done","확인 필요":"chk","보류":"stop"};',
    'var ST={"진행 중":"run","완료":"done","확인 필요":"chk","보류":"stop","입고":"run","작업 중":"run","출고":"run","도착":"chk","상품화 완료":"done"};')

# 5) 상태 탭은 제품마다 (딜러: 전체 · 입고 · 작업 중 · 출고 · 도착)
rep('var tabs=[["","전체"],["진행 중","진행 중"],["확인 필요","확인 필요"],["보류","보류"],["완료","완료"]];',
    'var tabs=P().work.tabs||[["","전체"],["진행 중","진행 중"],["확인 필요","확인 필요"],["보류","보류"],["완료","완료"]];')

# 6) 금액이 없으면 «—»
rep('''function won(n){ return (Number(n)||0).toLocaleString("ko-KR"); }''',
    '''function won(n){ return (Number(n)||0).toLocaleString("ko-KR"); }
function wonD(n){ return n==null?"—":won(n)+"원"; }''')
rep('''<td class="n">'+won(x[5])+'원</td>''', '''<td class="n">'+wonD(x[5])+'</td>''')
rep('''<span class="r"><b>'+won(x[5])+'원</b>''', '''<span class="r"><b>'+wonD(x[5])+'</b>''')

# 7) 딜러는 등록하는 일이 없음 → 등록 버튼이 비어 있으면 그리지 않음
rep('''<button class="j-btn pri" id="newBtn">'+ic("plus")+P().work.add+'</button>''',
    '''\'+(P().work.add?'<button class="j-btn pri" id="newBtn">'+ic("plus")+P().work.add+'</button>':'')+\'''')
rep('''<div class="acts"><button class="j-btn pri">'+ic("plus")+P().homeH.add+'</button></div>''',
    '''<div class="acts">'+(P().homeH.add?'<button class="j-btn pri">'+ic("plus")+P().homeH.add+'</button>':'')+'</div>''')

# 8) 딜러는 휴대폰이 먼저 → 처음 보기는 «폰 화면»
rep('draw();\n</script>', 'setView("vm");\ndraw();\n</script>')

# 9) 바깥 안내 페이지 — 딜러용
a = s.index('<div class="pg">'); b = s.index('<div id="dim" hidden></div>')
PG = '''<div class="pg">
  <h1>딜러 J안 시안</h1>
  <p class="lead">
    디자인 방의 <b>합친 디자인 J안(4판)</b> 틀을 그대로 쓰고, 그 안에 <b>딜러앱의 실제 메뉴</b>를 채운 시안이에요.
    <b>홈 · 내 차</b>를 그렸어요. 딜러 이름 · 업체 · 차량번호 · 금액은 모두 <b>지어낸 예시</b>예요.
    <b>지금 운영 중인 딜러앱(dealer.cgg.co.kr)은 하나도 바꾸지 않았어요.</b>
  </p>
  <div class="pick" role="group" aria-label="화면">
    <span>화면</span>
    <button class="pb" data-scr="home" aria-pressed="false">홈</button>
    <button class="pb" data-scr="work" aria-pressed="true">내 차</button>
  </div>
  <div class="pick" role="group" aria-label="보기 방식">
    <span>보기</span>
    <button class="pb" data-v="vm" aria-pressed="true">폰 화면</button>
    <button class="pb" data-v="fit" aria-pressed="false">PC 한눈에</button>
    <button class="pb" data-v="full" aria-pressed="false">PC 원래 크기</button>
  </div>
  <div class="pick" role="group" aria-label="메뉴 배치">
    <span>PC 메뉴 배치</span>
    <button class="pb" data-ly="top" aria-pressed="false">가로 메뉴</button>
    <button class="pb" data-ly="side" aria-pressed="true">세로 메뉴</button>
    <button class="pb" data-ly="icon" aria-pressed="false">아이콘 메뉴</button>
  </div>

  <div class="stage vm" id="stage"><section class="mock" id="mock" aria-label="시안 화면"></section></div>
  <p class="hint" id="hint">폰(가로 390)에서 열었을 때 모습이에요.</p>

  <div class="note">
    <h2>이번 시안에서 한 것</h2>
    <ul>
      <li><b>메뉴 차례는 지금 딜러앱 그대로</b> — 내 차 · 알림 · 청구서 · 카히스토리 · 내 정보. J안 공통 «홈»만 맨 앞에 붙었어요.
        폰 아래 탭바는 <b>홈 · 내 차 · 알림 · 청구서 · 전체</b>(카히스토리 · 내 정보는 «전체» 안).</li>
      <li><b>머리말</b> — 업체 이름 대신 <b>딜러 이름 · 상사 이름</b>. 현장 화면 버튼은 없어요(딜러는 현장 입력이 없음).</li>
      <li><b>«내 차» 표</b> — 공통 열 차례: 지금 위치 → 차량번호 → 차종 → 작업 → 마지막 기록 → 들어간 금액 → 단계.
        «작업» 열은 다른 제품과 열 수를 맞추려고 넣었어요(지금 딜러앱도 차 상세에 작업 이름이 있어요). 빼도 돼요.</li>
      <li><b>금액이 없으면 «—»</b> — 업체가 아직 금액을 넣지 않은 차.</li>
      <li><b>단계 이름은 그대로</b>(입고 · 작업 중 · 출고 · 도착 · 상품화 완료), <b>칩 색은 공통 네 가지만</b> — 입고 · 작업 중 · 출고 = 파랑(진행 중), 도착 = 주황(확인 필요: 딜러가 «상품화 완료»를 눌러야 함), 상품화 완료 = 초록(완료).</li>
      <li><b>숫자 카드 4개 · 할 일 3가지는 «가안»으로 넣었어요</b> — 아직 확정이 아니에요. 시안을 보고 대표님이 정해요.</li>
      <li>알림 · 청구서 · 카히스토리 · 내 정보는 자리만 그렸어요.</li>
    </ul>
  </div>
  <div class="note">
    <h2>일부러 넣지 않은 것</h2>
    <ul>
      <li><b>개인정보 · 차량 매칭 화면</b>(업체 연결 확인, «내 차 아님» 신고, 동의 화면) — 보안 방 검토 전이라 넣지 않았어요.</li>
      <li><b>등록 버튼</b> — 딜러는 차를 직접 등록하지 않아서 뺐어요.</li>
    </ul>
  </div>
  <div class="note">
    <h2>대표님이 보고 정할 것</h2>
    <ul>
      <li>숫자 카드 4개 — 지금은 «작업 중인 차 · 오늘 출고·도착 · 이번 주 입고된 차 · (상품화) 완료 기다리는 차» (카드 이름은 칸에 맞게 줄였어요)</li>
      <li>할 일 3가지 — 지금은 «도착한 차 «상품화 완료» 누르기 · 오늘 출고되는 차 받을 준비 · 작업이 3일 넘게 걸리는 차 확인»</li>
      <li>«작업» 열을 남길지</li>
      <li>청구서 · 카히스토리 같은 기능이 열리면 숫자 · 할 일을 바꿀지 (그때 다시 여쭤요)</li>
    </ul>
  </div>
</div>

'''
s = s[:a] + PG + s[b:]
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", OUT, len(s), "글자")
