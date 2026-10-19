"""워시 v143 → v143.1. 총괄 10/19: «확인 중» 말 · 서버 답 이름을 체크 v56.7 과 같게 (운영/긴급/챗지피티_검증_출시마감_3차/체크/README.md)
쓰는 법: python3 워시/도구/만들기_워시_v143_1.py  (v143 판 위에 덧붙임 — v143 은 덮어쓰지 않아요)
  1) 안내 말: «갔는지 아직 몰라요 — 보낸 기록에서 확인해 주세요» → 체크와 같은 «확인 중 — 보낸 기록에서 확인해 주세요» (색은 그대로 주황 = 확인 필요)
  2) 체크가 알아보는 서버 답 이름도 알아봐요: unsure:true · state:"확인 중" · __unsure:true (이미 알던 checking · __checking · «확인 중/처리 중» 글은 그대로)
  돈 셈 · 화면 모양 그대로.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v143.html"); OUT = os.path.join(BASE, "1_차곳간_워시_index_v143.1.html")
s = open(SRC, encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('var APP_VER="워시 v143 · UI 3.0 · 2026-10-19";', 'var APP_VER="워시 v143.1 · UI 3.0 · 2026-10-19";')
rep('var WUNK="갔는지 아직 몰라요 — 보낸 기록에서 확인해 주세요";', 'var WUNK="확인 중 — 보낸 기록에서 확인해 주세요";   /* v143.1 체크 v56.7 과 같은 말 */')
rep('function wUnknown(e){return !!(e&&(e.unknown||/처리 중이에요|확인 중/.test(String(e.message||e.error||e.__err||""))));}',
    'function wUnknown(e){return !!(e&&(e.unknown||e.unsure||e.__unsure||e.state==="확인 중"||/처리 중이에요|확인 중/.test(String(e.message||e.error||e.__err||""))));}   /* v143.1 체크와 같은 이름도 */')
rep('if(j&&j.__err){var u=!!j.__checking||wUnknown({message:j.__err});', 'if(j&&j.__err){var u=!!(j.__checking||j.__unsure)||wUnknown({message:j.__err});')
rep('if(v&&v.__err)throw {message:v.__err,unknown:!!v.__checking||wUnknown({message:v.__err})};', 'if(v&&v.__err)throw {message:v.__err,unknown:!!(v.__checking||v.__unsure)||wUnknown({message:v.__err})};')
rep('if(res&&(res.checking||(!res.ok&&(res.unknown||', 'if(res&&(res.checking||res.unsure||res.state==="확인 중"||(!res.ok&&(res.unknown||')
open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s))
