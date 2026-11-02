"""체크 v57 = v56.9 + 통합 디자인 11판 자리 맞춤 (총괄 11/1 · 대표님 «통합이 아예 안 되어 있다»)
쓰는 법: python3 체크/도구/만들기_체크_v57.py   (v56.9 는 읽기만 · 검사장에서 쓰는 중이라 덮어쓰지 않아요)
  체크/도구/v57_11판.js — 그린 뒤 자리만 옮겨요: 홈 숫자 검정 · «많이 밀린 곳» 홈에서 뺌 · 체크 전용 꼬리표 없앰 ·
  월별 청구서 제목 자료 문장 · 자료 점검을 청구 합계 상자 안으로 · 큰 표 카드 밖 · 배달 제목 · 기간 줄 카드 밖 · 배달 숫자 뜻 색
  돈 셈 · 서버 요청과 답 · 로그인 · rid · «확인 중» 처리는 그대로
"""
import os, hashlib
HERE = os.path.dirname(os.path.abspath(__file__)); CHK = os.path.dirname(HERE); ROOT = os.path.dirname(CHK)
SRC = os.path.join(CHK, "2_차곳간_체크_index_v56.9.html"); OUT = os.path.join(CHK, "2_차곳간_체크_index_v57.html")
s = open(SRC, encoding="utf-8").read()
if hashlib.sha256(s.encode()).hexdigest()[:12] != "8e730b3fbb8f": raise SystemExit("v56.9 가 보안 통과 판과 달라요")
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:120]))
    s = s.replace(old, new)
rep('ver:"체크 v56.9", date:"10/20"', 'ver:"체크 v57", date:"11/1"')
rep('$("hdVer").textContent="체크 v56.9 · "', '$("hdVer").textContent="체크 v57 · "')
rep('<!-- 체크 v56.9 (', '<!-- 체크 v57 (v56.9 + 통합 디자인 11판 자리 맞춤 · 11/1) · 체크 v56.9 (')
# 할 일 아이콘·색 — 워시 v144와 같은 규칙(입금 지갑 주황 · 청구서 파일 주황 · 세금계산서 영수증 주황 · 알림 못 감 종 빨강) · 모양만
rep('var HOMEIC={deposit:"wallet",bill:"file",partner:"shop",hometax:"receipt",home:"today"};',
    'var HOMEIC={deposit:"wallet",bill:"file",partner:"bell",hometax:"receipt",home:"today"};   /* v57: 워시 v144 할 일 아이콘 */')
rep('[taxWait.length,"","세금계산서 대상","hometax"]', '[taxWait.length,"w","세금계산서 대상","hometax"]')
rep("</body>", open(os.path.join(HERE, "v57_11판.js"), encoding="utf-8").read() + "</body>")
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", os.path.relpath(OUT, ROOT), hashlib.sha256(s.encode()).hexdigest()[:12])
