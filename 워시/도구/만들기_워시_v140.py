"""워시 v139 → v140. 대표님 10/19 허락(총괄 전달): 돈 함수 안의 화면 글 «발급» → «발행» + 팝빌 실패 안내 글
쓰는 법: python3 워시/도구/만들기_워시_v140.py  (v139 판 위에 덧붙임 — v139 는 덮어쓰지 않아요)
  조건(총괄 10/19): ① 글자(문자열)만 바꿔요 — 계산 · 조건 · 서버에 보내는 값 · 저장 값("발급" 상태)은 그대로
                   ② 바뀐 줄 비교표 → 워시/시안/v140_발행_말바꿈_비교표.md (글자 밖이 같은지 이 만들기가 직접 확인해요)
                   ③ 돈 지문 기준값 새로 뜨기 제안 → 워시/시안/돈코드_기준값_v140_제안.json (기준값 파일은 디자인 방 서랍)
  바꾸는 함수: pbIssueSelected · pbRun · exportHometax · writeHometax · taxIssuedReal (돈 지문 목록 안)
  그대로: 저장 · 비교 값 "발급"(d.status) · 홈택스 공식 이름 «일괄발급» · 홈택스 양식 원문
  팝빌 실패 안내: kmsg 가 «잔액» 글을 숨겨 «사업자번호 · 이메일을 확인해 주세요»로 엉뚱하게 보이던 것 →
                  대신할 말(두 번째 글자 인자)만 «발행하지 못했어요 — 팝빌 충전 잔액 · 사업자번호 · 이메일을 확인해 주세요»로
운영 v111 · 시험판 v125 · v126 ~ v139 은 덮어쓰지 않는다.
"""
import os, re
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE); ROOT = os.path.dirname(BASE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v139.html"); OUT = os.path.join(BASE, "1_차곳간_워시_index_v140.html")
REPORT = os.path.join(BASE, "시안", "v140_발행_말바꿈_비교표.md")
s = open(SRC, encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('var APP_VER="워시 v139 · UI 3.0 · 2026-10-19";', 'var APP_VER="워시 v140 · UI 3.0 · 2026-10-19";')

def fn_span(name):
    m = re.search(r"function\s+" + name + r"\s*\(", s)
    if not m: raise SystemExit("함수 없음: " + name)
    i = s.index("{", m.end()); d = 0; j = i
    while True:
        c = s[j]
        if c == "{": d += 1
        elif c == "}":
            d -= 1
            if d == 0: return m.start(), j + 1
        j += 1

# 문자열 글자 안에서만 «발급» → «발행» (저장 값 "발급" · «일괄발급» 은 그대로)
STR = re.compile(r'"(?:[^"\\\n]|\\.)*"|\'(?:[^\'\\\n]|\\.)*\'')
def in_strings(seg):
    def f(m):
        t = m.group(0)
        if t in ('"발급"', "'발급'"): return t          # 저장 · 비교 값
        t = t.replace("일괄발급", "\x00I\x00").replace("발급", "발행").replace("\x00I\x00", "일괄발급")
        return t
    return STR.sub(f, seg)

FNS = ["pbIssueSelected", "pbRun", "exportHometax", "writeHometax", "taxIssuedReal"]
before = s
for name in FNS:
    a, b = fn_span(name)
    s = s[:a] + in_strings(s[a:b]) + s[b:]

# 팝빌 실패 안내 — 대신할 말(글자)만 바꿔요
FB_OLD = 'kmsg(r.error,"발행하지 못했어요 — 사업자번호'
assert s.count(FB_OLD) == 1, "팝빌 실패 글을 못 찾음"
m = re.search(re.escape(FB_OLD) + r'[^"]*"', s)
s = s[:m.start()] + 'kmsg(r.error,"발행하지 못했어요 — 팝빌 충전 잔액 · 사업자번호 · 이메일을 확인해 주세요"' + s[m.end():]

# 검사 일꾼 권장: 표(renderTax · 돈 함수 아님)의 실패 대신할 말도 같게 · 도움말의 단추 이름을 실제 단추와 같게
rep('''"발행하지 못했어요 — 사업자번호·이메일을 확인해 주세요"''', '''"발행하지 못했어요 — 팝빌 충전 잔액 · 사업자번호 · 이메일을 확인해 주세요"''')
rep("홈택스 일괄발급 엑셀 받기", "홈택스 일괄발급 양식 내려받기", 2)

# ② 증명: 바뀐 줄은 글자(문자열) 밖이 모두 같아야 해요 — 다르면 멈춰요
bl, al = before.split("\n"), s.split("\n")
assert len(bl) == len(al), "줄 수가 바뀌었어요"
rows = []
for i, (x, y) in enumerate(zip(bl, al)):
    if x == y or "APP_VER" in x: continue
    strip = lambda t: STR.sub('""', t)
    if strip(x) != strip(y): raise SystemExit("글자 밖이 바뀐 줄이 있어요: %d" % (i + 1))
    ox = [t for t in STR.findall(x)]; oy = [t for t in STR.findall(y)]
    pairs = [(p, q) for p, q in zip(ox, oy) if p != q]
    fn = ""
    for name in FNS:
        a, b = fn_span(name)
        if s.count("\n", 0, a) <= i <= s.count("\n", 0, b): fn = name
    for p, q in pairs: rows.append((i + 1, fn, p, q))
md = ["# 워시 v140 — 돈 함수 안 화면 글 «발급» → «발행» 비교표", "",
      "대표님 10/19 허락(총괄 전달). 만들기 파일이 바뀐 줄마다 **문자열(따옴표 안) 밖을 지운 뒤 같은지** 확인했어요 — 하나라도 다르면 만들기가 멈춰요.",
      "저장 · 비교 값 `\"발급\"`(세금계산서 상태) · 홈택스 공식 이름 «일괄발급» · 계산 · 조건 · 서버에 보내는 값은 그대로예요.", "",
      "| 줄 | 함수 | 전 (글자) | 뒤 (글자) |", "|---|---|---|---|"]
for r in rows:
    md.append("| %d | %s | `%s` | `%s` |" % (r[0], r[1], r[2].replace("|", "\\|"), r[3].replace("|", "\\|")))
md += ["", "바뀐 글자 %d곳 · 함수 %s" % (len(rows), ", ".join(sorted(set(r[1] for r in rows))))]
open(REPORT, "w", encoding="utf-8").write("\n".join(md) + "\n")
open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s), "· 바뀐 글자", len(rows))
