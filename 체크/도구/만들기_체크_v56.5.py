"""체크 v56.5 = v56.4 + 홈택스 일괄발급 파일 나누기 100건씩 → 50건씩 (대표님 10/19 «지금 주는 홈택스 양식은 일괄 50건 발급 양식»)
쓰는 법: python3 체크/도구/만들기_체크_v56.5.py   (v56.4 는 읽기만 · 덮어쓰지 않아요)
  바꾸는 것: hometaxGo 의 나누는 건수(parts 셈 · pick.slice) · 확인 창 «50건씩 파일 N개» 글 · 설명 주석 2곳 · 판 이름
  그대로: 돈 셈 · 칸 · 금액 · 영수 01 · 안내 «발행은 한 번에 50건씩»
  증명: node 체크/도구/낱말_비교.js — 두 판의 낱말(token)을 차례로 맞춰 다른 것만 뽑아 비교표(체크/올리기용/v56.5_50건_비교표.md)로 · 예상 밖이면 멈춤
"""
import os, hashlib, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); CHK = os.path.dirname(HERE); ROOT = os.path.dirname(CHK)
SRC = os.path.join(CHK, "2_차곳간_체크_index_v56.4.html"); OUT = os.path.join(CHK, "2_차곳간_체크_index_v56.5.html")
s = open(SRC, encoding="utf-8").read()
if hashlib.sha256(s.encode()).hexdigest()[:12] != "9d84fafe4c38": raise SystemExit("v56.4 가 보안 통과 판과 달라요")
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:120]))
    s = s.replace(old, new)
rep('ver:"체크 v56.4", date:"10/19"', 'ver:"체크 v56.5", date:"10/19"')
rep('$("hdVer").textContent="체크 v56.4 · "', '$("hdVer").textContent="체크 v56.5 · "')
rep('<!-- 체크 v56.4 (', '<!-- 체크 v56.5 (v56.4 + 홈택스 파일 50건씩 · 대표님 10/19) · 체크 v56.4 (')
# 나누는 건수 — 홈택스 일괄 50건 발급 양식
rep('var parts=Math.ceil(pick.length/100), tot=', 'var parts=Math.ceil(pick.length/50), tot=')
rep('(parts>1?" (100건씩 파일 "+parts+"개)":"")', '(parts>1?" (50건씩 파일 "+parts+"개)":"")')
rep('makeFile(pick.slice(i*100,(i+1)*100), i+1, parts, warn, other)', 'makeFile(pick.slice(i*50,(i+1)*50), i+1, parts, warn, other)')
# 설명 주석
rep('.xls 로 내려받기 (100건씩 · 길이 제한 · 영수 01)', '.xls 로 내려받기 (50건씩 · 길이 제한 · 영수 01 · v56.5 대표님 10/19 «일괄 50건 발급 양식»)')
rep('59칸 · 7줄부터 · 100건까지 */', '59칸 · 7줄부터 · 한 파일 50건씩(홈택스 일괄 50건 발급 · v56.5) */')
open(OUT, "w", encoding="utf-8").write(s)
r = subprocess.run(["node", os.path.join(HERE, "낱말_비교.js"), SRC, OUT, os.path.join(CHK, "올리기용", "v56.5_50건_비교표.md")])
if r.returncode: os.remove(OUT); raise SystemExit("비교가 예상과 달라 멈췄어요")
print("만듦:", os.path.relpath(OUT, ROOT), hashlib.sha256(open(OUT, "rb").read()).hexdigest()[:12])
