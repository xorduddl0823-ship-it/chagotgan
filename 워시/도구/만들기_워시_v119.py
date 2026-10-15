"""워시 v118 → 워시 v119 새 판. 입고 알림톡 기본 켜짐 (대표님 결정 2026-10-15 · 총괄 전달).
쓰는 법: 만들기_워시_v112 → … → v118 → v119 차례로 (`워시/도구/`)
바꾸는 것:
  - 「입고하면 딜러에게 알림톡 보내기」 처음 값을 켜짐으로. 업체 설정에 값이 없으면(이미 가입한 업체 포함) 켜짐,
    업체가 설정에서 끄고 저장한 경우(send.autoIn === false)에만 꺼짐.
운영 v111 · 새 판 v112~v118 은 덮어쓰지 않는다.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v118.html")
OUT = os.path.join(BASE, "1_차곳간_워시_index_v119.html")
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

rep('var APP_VER="워시 v118 · UI 3.0 · 2026-10-15";', 'var APP_VER="워시 v119 · UI 3.0 · 2026-10-15";')
rep('function autoInOn(){return sendCfg().autoIn===true;}', 'function autoInOn(){return sendCfg().autoIn!==false;}   /* v119: 기본 켜짐 (끈 업체만 꺼짐) */')
rep('''(c.autoIn===true?" checked":"")''', '''(c.autoIn!==false?" checked":"")''')
rep('입고 알림톡은 처음에 꺼져 있어요. 켜면 입고 등록이 끝날 때 딜러 번호로 «차량 입고 안내»가 나가요 (알림톡이 안 되면 문자). 끈 채로도 입고 완료 창에서 한 건씩 보낼 수 있어요.',
    '입고 알림톡은 처음부터 켜져 있어요. 입고 등록이 끝날 때 딜러 번호로 «차량 입고 안내»가 나가요 (알림톡이 안 되면 문자). 끄고 저장하면 안 나가고, 꺼 두어도 입고 완료 창에서 한 건씩 보낼 수 있어요.')

open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
