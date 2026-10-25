"""관리 v4.9.2 만들기 — v4.9.1(보안 통과)에 «업체 › 사업자번호 승인 요청» 화면을 더해요 (대표님 정책 04 · SQL 24 · 워시 서버 sb28~sb30).
쓰는 법: python3 관리/만들기_관리_v4.9.2.py   (v4.9.1 파일은 읽기만 · 덮어쓰지 않아요)
- 재료: 관리/3_차곳간_관리_index_v4.9.1.html · 관리/v4재료/bizshare.js
- 결과: 관리/3_차곳간_관리_index_v4.9.2.html
- 같은 사업자번호로 두 번째 업체 · 두 번째 제품은 본사 승인 때만 돼요(개인 · 법인 같아요).
  · 업체 묶음 다섯째 칸 «사업자번호 승인 요청»: 대기 · 승인 · 거절 칩, 줄마다 업체 · 제품 · 사업자번호(가림) · 같은 번호를 쓰는 곳 · 요청한 사람(가림) · 요청 시각 · 상태
  · [승인] [거절] → 확인 창(누구에게 · 사업자번호 · 같은 번호를 쓰는 곳 · 하는 일) + 메모 → hqBizShareDecide([요청번호, 승인?, 메모]). 서버가 거절하면 그 글을 그대로.
  · 대기가 있으면: 관리 홈 알림 띠 «사업자번호 승인 요청 N건» + 오늘 할 일 + 메뉴 «업체» 빨간 숫자
- 새 서버 창구 2개(hqBizShareList · hqBizShareDecide, 서버에 이미 있음 · 본사 전용). 그 밖은 v4.9.1 과 같아요.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "3_차곳간_관리_index_v4.9.1.html")
OUT = os.path.join(HERE, "3_차곳간_관리_index_v4.9.2.html")
s = open(SRC, encoding="utf-8").read()

def rep(old, new):
    global s
    if s.count(old) != 1: raise SystemExit("찾은 수 %d: %s" % (s.count(old), old[:80]))
    s = s.replace(old, new)

rep('var ADM_VER="관리 v4.9.1 · 공통 1.13.2 · 2026-10-21";', 'var ADM_VER="관리 v4.9.2 · 공통 1.13.2 · 2026-10-25";')
# 화면 하나 더 — 업체 묶음 다섯째 칸
rep("var TABS = [\n", open(os.path.join(HERE, "v4재료", "bizshare.js"), encoding="utf-8").read() + "var TABS = [\n")
rep('  ["bizok","사업자 확인",viewBizOk],\n', '  ["bizok","사업자 확인",viewBizOk],\n  ["bizreq","사업자번호 승인 요청",viewBizShare],\n')
rep('  ["shops","업체",["shops","lock","wait","bizok"]],', '  ["shops","업체",["shops","lock","wait","bizok","bizreq"]],')
# 처음 불러올 때 대기 건수만 (없거나 SQL 24 전이면 0)
rep('''    api("hqPayWait",[]).then(function(r){ PW.list=(r&&r.list)||[]; PW.loaded=true; },function(){ PW.list=null; }),''',
    '''    api("hqPayWait",[]).then(function(r){ PW.list=(r&&r.list)||[]; PW.loaded=true; },function(){ PW.list=null; }),
    api("hqBizShareList",["wait"]).then(function(r){ BSR.wait=((r&&Array.isArray(r.list))?r.list:[]).length; },function(){ BSR.wait=0; }),''')
# 메뉴 «업체» 빨간 숫자
rep('''  CGG.nav($("nav"), GROUPS, navKey(TAB), navPick, {find:{feats:FEATS, onGo:goFeat}});''',
    '''  bsBadge(); CGG.nav($("nav"), GROUPS, navKey(TAB), navPick, {find:{feats:FEATS, onGo:goFeat}});''')
# 홈 — 오늘 할 일 맨 앞 + 알림 띠
rep('''  var todos = memoTodos.concat([''',
    '''  var todos = memoTodos.concat([
    [BSR.wait||0,"사업자번호 승인 요청", BSR.wait?"같은 번호로 두 번째 업체 · 제품을 쓰려는 요청":"같은 번호로 두 번째 업체 · 제품", go("bizreq"),"imp"],''')
rep('''    desc:"오늘 "+(now.getMonth()+1)+"월 "+now.getDate()+"일 · "+pad2(now.getHours())+":"+pad2(now.getMinutes())+" 기준",''',
    '''    desc:"오늘 "+(now.getMonth()+1)+"월 "+now.getDate()+"일 · "+pad2(now.getHours())+":"+pad2(now.getMinutes())+" 기준",
    notice:BSR.wait?'<div id="bsHomeBand"></div>':"",''')
rep('''  /* 숫자 칸을 누르면 그 화면으로 (v4.8.3 그대로) */''',
    '''  if($("bsHomeBand")) CGG.todoBand($("bsHomeBand"),{count:BSR.wait, text:"사업자번호 승인 요청 "+(Number(BSR.wait)||0)+"건이 기다리고 있어요", tone:"chk", go:"해결하러 가기", onGo:function(){ jgo("bizreq"); }});
  /* 숫자 칸을 누르면 그 화면으로 (v4.8.3 그대로) */''')
rep('''  shops:"업체별 요금제 · 이용 기한 · 상태를 보고,''', '''  shops:"업체별 요금제 · 이용 기한 · 상태를 보고, 같은 사업자번호 승인 요청을 처리하고,''')
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", OUT, len(s), "글자")
