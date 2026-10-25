"""관리 v4.9.3 만들기 — v4.9.2(보안 통과)에서 «표를 넘기거나 칩 · 정렬을 바꾸면 새로 나타난 줄의 단추가 안 눌리는» 문제를 고쳐요 (총괄 허락 10/25).
쓰는 법: python3 관리/만들기_관리_v4.9.3.py   (v4.9.2 파일은 읽기만 · 덮어쓰지 않아요)
- 결과: 관리/3_차곳간_관리_index_v4.9.3.html
- 왜: 표 함수는 다시 그릴 때 «그때 화면에 있던 단추»의 하는 일만 이어 줬어요(v4.4 부터). 2쪽 · 다른 칩에서 처음 나타난 줄의 단추는 비어 있었어요.
  (예: 결제 내역 20건이 넘을 때 2쪽 [환불] · [입금 확인], 카드 결제 [환불], 세금계산서 [세금계산서], 사업자 확인 [확인])
- 어떻게: 표마다 원래 쓰던 «단추 잇기» 코드를 tBind(표 이름, 함수)로 감싸 두고, 표가 다시 그려질 때마다 그 함수를 다시 불러요.
  단추 잇기 코드 글자는 한 글자도 안 바꿔요 → 돈 계산 · 서버 요청 · 확인 창은 그대로예요.
- 대상 표 12개: tShops · tUsers · tPays · tInv · exShopT · pgT · tExp · tTax · tCw · tPR · tPW · tBiz
  (공지사항 · 잠금 표 · 사업자번호 승인 요청은 이미 바깥 칸 하나에서 받고 있어 그대로)
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "3_차곳간_관리_index_v4.9.2.html")
OUT = os.path.join(HERE, "3_차곳간_관리_index_v4.9.3.html")
s = open(SRC, encoding="utf-8").read()

def rep(old, new):
    global s
    if s.count(old) != 1: raise SystemExit("찾은 수 %d: %s" % (s.count(old), old[:80]))
    s = s.replace(old, new)

def call_end(t, i):
    """t[i] 가 '(' 일 때 짝 ')' 자리 — 글자 묶음(' \" `) 안은 건너뛰어요"""
    dep = 0; q = None; k = i
    while k < len(t):
        c = t[k]
        if q:
            if c == "\\": k += 2; continue
            if c == q: q = None
        elif c in "\"'`": q = c
        elif c == "(": dep += 1
        elif c == ")":
            dep -= 1
            if dep == 0: return k
        k += 1
    raise SystemExit("짝 괄호를 못 찾음")

rep('var ADM_VER="관리 v4.9.2 · 공통 1.13.2 · 2026-10-25";', 'var ADM_VER="관리 v4.9.3 · 공통 1.13.2 · 2026-10-25";')
# 표 함수 — 다시 그릴 때마다 그 표의 단추 잇기를 다시
rep("var TSTATE = {};\n", "var TSTATE = {};\n/* v4.9.3 — 표마다 «단추 잇기» 함수를 기억해 두고, 쪽 넘김 · 칩 · 정렬로 다시 그릴 때마다 다시 불러요 */\nvar TBIND = {};\nfunction tBind(id, f){ (TBIND[id]=TBIND[id]||[]).push(f); try{ f(); }catch(e){} }\n")
rep("""  var host = $(o.id);
  if(!host) return;
  /* 칸 차례""", """  var host = $(o.id);
  if(!host) return;
  TBIND[o.id] = [];   /* 새로 부를 때는 그 화면이 다시 정해요 */
  /* 칸 차례""")
rep("""    restore(old);
    bind();""", """    restore(old);
    bind();
    (TBIND[o.id]||[]).forEach(function(f){ try{ f(); }catch(e){} });""")

TARGETS = [   # (단추 잇기 코드 시작 글자, 표 이름)
    ('Array.prototype.forEach.call($("tShops").querySelectorAll("button[data-x]"),', "tShops"),
    ('Array.prototype.forEach.call($("tUsers").querySelectorAll("button[data-u]"),', "tUsers"),
    ('Array.prototype.forEach.call($("tPays").querySelectorAll("button[data-p]"),', "tPays"),
    ('Array.prototype.forEach.call($("tInv").querySelectorAll("button[data-i]"),', "tInv"),
    ('Array.prototype.forEach.call(document.querySelectorAll("[data-tog]"),', "exShopT"),
    ('Array.prototype.forEach.call(document.querySelectorAll("[data-refund]"),', "pgT"),
    ('Array.prototype.forEach.call($("main").querySelectorAll("button[data-ex]"),', "tExp"),
    ('Array.prototype.forEach.call(document.querySelectorAll("[data-txp]"),', "tTax"),
    ('Array.prototype.forEach.call(host.querySelectorAll("[data-cw]"),', "tCw"),
    ('Array.prototype.forEach.call(document.querySelectorAll("[data-prf]"),', "tPR"),
    ('Array.prototype.forEach.call(document.querySelectorAll("[data-prp]"),', "tPR"),
    ('Array.prototype.forEach.call(document.querySelectorAll("[data-pwd]"),', "tPW"),
    ('Array.prototype.forEach.call(document.querySelectorAll("[data-bizok]"),', "tBiz"),
    ('Array.prototype.forEach.call(document.querySelectorAll("[data-bizx]"),', "tBiz"),
]
for start, tid in TARGETS:
    if s.count(start) != 1: raise SystemExit("시작 찾은 수 %d: %s" % (s.count(start), start))
    a = s.index(start)
    p = a + len("Array.prototype.forEach.call")
    b = call_end(s, p) + 1
    if s[b] == ";": b += 1
    block = s[a:b]
    s = s[:a] + 'tBind("' + tid + '", function(){ ' + block + ' });' + s[b:]

open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", OUT, len(s), "글자 · 감싼 곳", len(TARGETS))
