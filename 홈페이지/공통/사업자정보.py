# -*- coding: utf-8 -*-
"""사업자 정보 칸 — 모든 화면 맨 아래에 같은 내용을 넣습니다.
   값은 같은 폴더의 사업자정보.json 한 곳에서만 읽습니다.
   python 사업자정보.py 파일.html [파일.html …]   → 파일 안 <!--CGG-BIZ-START--> … <!--CGG-BIZ-END--> 자리를 새로 채움
   python 사업자정보.py --미리보기                 → 칸 이름 그대로 보이는 시안 조각을 화면에 찍음
"""
import io, os, re, sys, json, html

HERE = os.path.dirname(os.path.abspath(__file__))
START, END = "<!--CGG-BIZ-START-->", "<!--CGG-BIZ-END-->"

def load():
    return json.load(io.open(os.path.join(HERE, "사업자정보.json"), encoding="utf-8"))

def _ok(v):
    v = str(v or "").strip()
    return v and not (v.startswith("{") and v.endswith("}"))

def render(info=None, show_blank=False):
    """show_blank=True 면 비어 있는 칸도 {칸 이름} 그대로 보여 줍니다(시안용)."""
    info = info or load()
    e = lambda s: html.escape(str(s), quote=True)
    def val(k):
        v = info.get(k, "")
        if _ok(v): return e(v)
        if show_blank: return '<span style="color:#b26b00">' + e(v or "{" + k + "}") + "</span>"
        return ""
    rows = [("상호", "상호"), ("대표자", "대표자"), ("사업자등록번호", "사업자등록번호"),
            ("통신판매업 신고번호", "통신판매업신고번호"), ("주소", "주소"), ("대표 전화", "대표전화"),
            ("이메일", "이메일"), ("개인정보 보호책임자", "개인정보보호책임자")]
    parts = []
    for label, k in rows:
        v = val(k)
        if not v and k == "통신판매업신고번호": v = "신고 진행 중"
        if v: parts.append('<span style="white-space:nowrap">' + e(label) + " " + v + "</span>")
    biz = re.sub(r"\D", "", str(info.get("사업자등록번호", "")))
    if len(biz) == 10:
        parts.append('<a href="https://www.ftc.go.kr/bizCommPop.do?wrkr_no=' + biz +
                     '" target="_blank" rel="noopener" style="color:inherit;white-space:nowrap">사업자정보 확인</a>')
    elif show_blank:
        parts.append('<span style="color:#b26b00">사업자정보 확인 (사업자등록번호를 넣으면 생겨요)</span>')
    links = []
    for label, k in (("이용약관", "이용약관"), ("개인정보처리방침", "개인정보처리방침"), ("환불 규정", "환불규정")):
        u = str(info.get(k, "")).strip()
        if u.startswith("https://") or u.startswith("/"):
            w = "font-weight:700;" if k == "개인정보처리방침" else ""
            links.append('<a href="' + e(u) + '" target="_blank" rel="noopener" style="color:inherit;' + w + '">' + e(label) + "</a>")
    return (START + '\n<footer class="cgg-biz" style="font-size:11.5px;line-height:1.75;color:var(--muted,#667389);'
            'text-align:center;margin:18px auto 0;max-width:640px;word-break:keep-all">'
            + '<div>' + " · ".join(links) + "</div>"
            + '<div style="margin-top:4px">' + " <span aria-hidden=\"true\">|</span> ".join(parts) + "</div>"
            + "</footer>\n" + END)

def fill(path):
    t = io.open(path, encoding="utf-8").read()
    if START not in t: print("자리 표시가 없어 건너뜀:", path); return False
    t = re.sub(re.escape(START) + r".*?" + re.escape(END), lambda m: render(), t, flags=re.S)
    io.open(path, "w", encoding="utf-8").write(t); print("사업자 정보 채움:", path); return True

if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["--미리보기"]: print(render(show_blank=True))
    else:
        for p in a: fill(p)
