"""워시 v140 → v141. 대표님 10/19 지시(총괄 전달): «홈택스 일괄발급 양식은 50건 발급 양식이라 50건씩이 맞다»
쓰는 법: python3 워시/도구/만들기_워시_v141.py  (v140 판 위에 덧붙임 — v140 은 덮어쓰지 않아요)
  홈택스 파일 나누기 100건씩 → 50건씩. 바꾸는 것은 나누는 숫자와 그 숫자를 말하는 글뿐이에요(돈 셈 · 칸 · 금액은 그대로).
    exportHometax: parts = ceil(n/50) · pick.slice(i*50,(i+1)*50) · «50건씩 파일 N개»
    writeHometax : chunks i+=50 · rows.slice(i,i+50)
    도움말(HELP) «50건씩 나눠 받음» · 설명 주석 «50건씩»
  그대로: 홈택스 양식 원문(HTX_TPL «100건 이하 … 발급은 최대 50건씩») — 홈택스 글
  증명: 바뀐 줄 비교표 → 워시/시안/v141_홈택스_50건_비교표.md (바뀐 줄이 아래 목록 말고 하나라도 있으면 만들기가 멈춰요)
운영 v111 · 시험판 v125 · v126 ~ v140 은 덮어쓰지 않는다.
"""
import os, difflib
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE); ROOT = os.path.dirname(BASE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v140.html"); OUT = os.path.join(BASE, "1_차곳간_워시_index_v141.html")
REPORT = os.path.join(BASE, "시안", "v141_홈택스_50건_비교표.md")
s = open(SRC, encoding="utf-8").read(); before = s
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('var APP_VER="워시 v140 · UI 3.0 · 2026-10-19";', 'var APP_VER="워시 v141 · UI 3.0 · 2026-10-19";')
# exportHometax (돈 지문 목록 안 — 나누는 숫자와 글만)
rep('var parts=Math.ceil(pick.length/100), tot=', 'var parts=Math.ceil(pick.length/50), tot=')
rep('(parts>1?(" (100건씩 파일 "+parts+"개)"):"")', '(parts>1?(" (50건씩 파일 "+parts+"개)"):"")')
rep('htxMake(pick.slice(i*100,(i+1)*100), i+1, parts, warn)', 'htxMake(pick.slice(i*50,(i+1)*50), i+1, parts, warn)')
# writeHometax (돈 지문 목록 안 — 나누는 숫자만)
rep('var chunks=[];for(var i=0;i<rows.length;i+=100)chunks.push(rows.slice(i,i+100));',
    'var chunks=[];for(var i=0;i<rows.length;i+=50)chunks.push(rows.slice(i,i+50));')
# 도움말 · 설명 주석
rep('그대로 올리면 돼요(100건씩 나눠 받음).</li>', '그대로 올리면 돼요(50건씩 나눠 받음).</li>')
rep('.xls 로 내려받기 (100건씩 · 길이 제한 · 영수 01)', '.xls 로 내려받기 (50건씩 · 길이 제한 · 영수 01)')
assert s.count("100건 이하") == before.count("100건 이하"), "홈택스 양식 원문이 바뀌면 안 돼요"

# 증명 — 바뀐 줄은 아래 7줄뿐이어야 해요(판 이름 포함)
bl, al = before.split("\n"), s.split("\n")
assert len(bl) == len(al)
ch = [(i + 1, x, y) for i, (x, y) in enumerate(zip(bl, al)) if x != y]
if len(ch) != 7: raise SystemExit("바뀐 줄 수가 달라요: %d" % len(ch))
for i, x, y in ch:
    if "APP_VER" in x: continue
    # 줄 안에서 바뀐 글자는 «100» → «50» 뿐이어야 해요
    if x.replace("100", "50") != y: raise SystemExit("100 → 50 말고 바뀐 것이 있어요: %d" % i)
md = ["# 워시 v141 — 홈택스 파일 100건씩 → 50건씩 비교표", "",
      "대표님 10/19 지시(총괄 전달). 만들기 파일이 **바뀐 줄이 7줄뿐이고, 줄 안에서 «100» → «50» 말고는 바뀐 글자가 없는지** 확인했어요 — 아니면 만들기가 멈춰요.",
      "돈 셈 · 칸 · 금액 · 홈택스 양식 원문(«100건 이하 … 발급은 최대 50건씩»)은 그대로예요.", "",
      "| 줄 | 전 | 뒤 |", "|---|---|---|"]
def cut(t, k):
    j = t.find(k); return t[max(0, j - 40): j + 60].strip() if j >= 0 else t.strip()[:100]
for i, x, y in ch:
    k = "100" if "100" in x else "APP_VER"
    md.append("| %d | `%s` | `%s` |" % (i, cut(x, k).replace("|", "\\|"), cut(y, "50" if k == "100" else k).replace("|", "\\|")))
md += ["", "## 돈 지문", "- 바뀐 함수: `exportHometax`(파일 나누는 수 · 확인 창 글) · `writeHometax`(파일 나누는 수) — 까닭: 대표님 10/19 «홈택스 일괄발급 양식은 50건씩».",
       "- 새 값 제안: `워시/시안/돈코드_기준값_v141_제안.json` (나머지 함수는 v140 제안과 같아요). 기준값 파일은 디자인 방 서랍이라 제안만 해요."]
md += ["", "## 시험 (Playwright · 미리보기 · 2026-10-19 · 내려받기/저장만 가짜로 바꿔 파일 수와 줄 수를 셈)",
       "| 건수 | v140 홈택스 양식(.xls) | v141 홈택스 양식(.xls) | v140 엑셀(.xlsx) | v141 엑셀(.xlsx) |", "|---|---|---|---|---|",
       "| 50 | 1개 [50] | 1개 [50] | 1개 | 1개 |",
       "| 51 | 1개 [51] | **2개 [50, 1]** · 확인 창 «51건 (50건씩 파일 2개)» | 1개 | **2개 (1of2 · 2of2)** |",
       "| 100 | 1개 [100] | **2개 [50, 50]** | 1개 | **2개** |",
       "| 101 | 2개 [100, 1] | **3개 [50, 50, 1]** · 확인 창 «101건 (50건씩 파일 3개)» | 2개 | **3개 (1of3 · 2of3 · 3of3)** |",
       "", "페이지 오류 없음."]
open(REPORT, "w", encoding="utf-8").write("\n".join(md) + "\n")
open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s), "· 바뀐 줄", len(ch))
