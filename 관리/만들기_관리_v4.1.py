"""관리 v4.1 시안 만들기 — v4.0(보안 통과본)에 «알림 › 알림톡 템플릿» 화면만 더합니다 (규칙 5-6).
쓰는 법: python3 관리/만들기_관리_v4.1.py
- 재료: 관리/3_차곳간_관리_index_v4.0.html (읽기만, 덮어쓰지 않음)
- 결과: 관리/3_차곳간_관리_index_v4.1.html
- 서버 창구 hqAta · hqAtaSave 는 서버 방 새 판이 필요해요. 없으면 화면에 «서버 새 판이 아직» 안내가 나오고, 안내는 모두 문자로 나가요.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "3_차곳간_관리_index_v4.0.html")
OUT = os.path.join(HERE, "3_차곳간_관리_index_v4.1.html")
s = open(SRC, encoding="utf-8").read()

def rep(old, new):
    global s
    if s.count(old) != 1: raise SystemExit("찾은 수 %d: %s" % (s.count(old), old[:80]))
    s = s.replace(old, new)

rep('var ADM_VER="관리 v4.0 · UI 3.0 · 2026-10-14";', 'var ADM_VER="관리 v4.1 · UI 3.0 · 2026-10-15";')
# 알림 묶음 끝에 붙임 (원래 화면 차례는 그대로)
rep('["noti","공지사항",viewNotice],', '["noti","공지사항",viewNotice],\n  ["ata","알림톡 템플릿",viewAta],')
rep('["noti","알림",["sms","noti"]],', '["noti","알림",["sms","noti","ata"]],')
rep('noti:"기한 안내 문자와 공지사항으로 업체에 알려요.",', 'noti:"기한 안내 문자 · 공지사항 · 알림톡 템플릿 코드예요. 안내는 알림톡이 먼저 나가요.",')
ata = open(os.path.join(HERE, "v4재료", "ata.js"), encoding="utf-8").read()
rep('function navOf(t){', ata + '\nfunction navOf(t){')
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", OUT, len(s), "글자")
