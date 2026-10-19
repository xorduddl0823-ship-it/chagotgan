"""체크 v56.4 = v56.3 + 화면 글 «발급» → «발행» (대표님 10/19 허락 · 총괄 전달 · 워시 v140 과 같은 말)
쓰는 법: python3 체크/도구/만들기_체크_v56.4.py   (v56.3 은 읽기만 · 덮어쓰지 않아요)
  ① v56.3(보안 통과 판 · 지문 6e7f9580caec)을 그대로 읽어 판 이름만 v56.4 로
  ② node 체크/도구/발행_말바꿈.js — 체크 몫 문자열 안 «발급» → «발행» (따옴표 밖이 같은지 증명 · 다르면 멈춤) · 비교표 체크/올리기용/v56.4_발행_말바꿈_비교표.md
"""
import os, hashlib, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); CHK = os.path.dirname(HERE); ROOT = os.path.dirname(CHK)
SRC = os.path.join(CHK, "2_차곳간_체크_index_v56.3.html"); OUT = os.path.join(CHK, "2_차곳간_체크_index_v56.4.html")
MD = os.path.join(CHK, "올리기용", "v56.4_발행_말바꿈_비교표.md")
s = open(SRC, encoding="utf-8").read()
if hashlib.sha256(s.encode()).hexdigest()[:12] != "6e7f9580caec": raise SystemExit("v56.3 이 보안 통과 판과 달라요")
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:120]))
    s = s.replace(old, new)
rep('ver:"체크 v56.3", date:"10/18"', 'ver:"체크 v56.4", date:"10/19"')
rep('$("hdVer").textContent="체크 v56.3 · "', '$("hdVer").textContent="체크 v56.4 · "')
rep('<!-- 체크 v56.3 (', '<!-- 체크 v56.4 (v56.3 + 화면 글 «발급» → «발행» · 대표님 10/19) · 체크 v56.3 (')
# v56.3 의 화면 글 바꾸기(sameWord · 세금계산서 화면 글자 바꾸기)가 이름까지 바꾸던 것 — 이름(수정발급 · 일괄발급 · 발급내역 · 미발급)은 그대로 (총괄 10/19 «그대로 둘 곳»)
KEEPRE = '.replace(/(수정|일괄|미)?발급(내역)?/g,function(m,a,b){ return (a||b)?m:"발행"; })'
rep('.replace(/발급/g,"발행"); }   /* v56.3: 세금계산서 말 «발행» */', KEEPRE + '; }   /* v56.4: 세금계산서 말 «발행» · 이름(수정발급 · 일괄발급 · 발급내역 · 미발급)은 그대로 */')
rep('nd.nodeValue=nd.nodeValue.replace(/발급/g,"발행");', 'nd.nodeValue=nd.nodeValue' + KEEPRE + ';')
TMP = OUT + ".tmp"
open(TMP, "w", encoding="utf-8").write(s)
r = subprocess.run(["node", os.path.join(HERE, "발행_말바꿈.js"), TMP, OUT, MD])
os.remove(TMP)
if r.returncode: raise SystemExit("말 바꾸기가 멈췄어요")
print("만듦:", os.path.relpath(OUT, ROOT), hashlib.sha256(open(OUT, "rb").read()).hexdigest()[:12])
