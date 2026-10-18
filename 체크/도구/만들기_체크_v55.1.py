"""체크 v55 → v55.1 — 핵심 흐름 다시 검토(총괄 10/18 밤 «매우 중요 · 오류 나면 안 됨»)에서 찾은 것만 고침
  ① 배달 기록: 서버에서 늘 «최근 30일»만 받아 와서, 기간 칸 «지난 달»·더 앞 날짜를 고르면 일부가 빠져 보였어요
     → 고른 기간까지 받아 오기(최소 최근 30일) · 기간을 바꾸면 다시 받아 오기
  ② 입·출금 내역: 늘 «최근 62일»만 받아 와서 같은 문제 → 고른 기간까지(최소 62일 · 서버 한도 120일) · 바꾸면 다시 받아 오기
그 밖은 v55(보안 통과 14d8c99 · 72b3ea72de34)와 같아요. 경로는 이 파일 자리 기준.
"""
import os
BASE = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")) + "/"
s = open(BASE + "체크/2_차곳간_체크_index_v55.html", encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

rep('ver:"체크 v55", date:"10/18"', 'ver:"체크 v55.1", date:"10/18"')
rep('$("hdVer").textContent="체크 v55 · "', '$("hdVer").textContent="체크 v55.1 · "')
rep('<!-- 체크 v55 (', '<!-- 체크 v55.1 (v55 + 배달 · 입금 기간만큼 받아 오기) · 체크 v55 (')

# 기간 칸 상태를 밖에서도 읽게
rep('var PER={dep:{k:"month"}, drv:{k:"month"}};', 'var PER=window.chkPer={dep:{k:"month"}, drv:{k:"month"}};')
rep("window.perSet=function(id,k){ var r=rangeOf(k); PER[id]={k:k, f:r[0], t:r[1]};",
    "window.perSet=function(id,k){ var r=rangeOf(k); PER[id]=window.chkPer[id]={k:k, f:r[0], t:r[1]};")
rep('PER[id]={k:"", f:f, t:t}; var x=ts(id); if(x) x.page=1; draw();',
    'PER[id]=window.chkPer[id]={k:"", f:f, t:t}; var x=ts(id); if(x) x.page=1; refresh([id==="dep"?"dep":"deliv"]);   /* v55.1: 고른 기간까지 다시 받아 와요 */')
rep('perSet(v[0],v[1]); draw();', 'perSet(v[0],v[1]); refresh([v[0]==="dep"?"dep":"deliv"]);   /* v55.1 */')

# ① 배달: 고른 기간까지
rep("""function delivRange(){
  var to=new Date(), from=new Date(Date.now()-30*86400000);
  return [ymd(from), ymd(to)];
}""", """function delivRange(){   /* v55.1: 기간 칸에서 고른 기간까지 받아 와요(최소 최근 30일) */
  var to=new Date(), from=new Date(Date.now()-30*86400000), P=(window.chkPer||{}).drv||{};
  var a=ymd(from), b=ymd(to);
  if(P.f && P.f<a) a=P.f;
  if(P.t && P.t>b) b=P.t;
  return [a, b];
}""")
# ② 입금: 고른 기간까지(최소 62일 · 서버 한도 120일)
rep('return call("depositList",[{days:62}]).then(function(list){',
    'return call("depositList",[{days:(function(){ var P=(window.chkPer||{}).dep||{}, d=P.f?Math.ceil((Date.now()-Date.parse(P.f+"T00:00:00+09:00"))/864e5)+1:0; return Math.min(120,Math.max(62,d||0)); })()}]).then(function(list){   /* v55.1 */')

open(BASE + "체크/2_차곳간_체크_index_v55.1.html", "w", encoding="utf-8").write(s)
print("만듦: 체크/2_차곳간_체크_index_v55.1.html", len(s))
