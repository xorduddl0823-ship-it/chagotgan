"""체크 v30 → 체크 v31 새 판. v30 · v29 · 운영 v21.2 는 건드리지 않는다. (워시 서버 sb11 짝 — 서버/설계/13_체크_결제는_워시_지갑으로.md)
쓰는 법: python3 체크/도구/만들기_체크_v22.py … _v30.py && python3 체크/도구/만들기_체크_v31.py
바꾸는 것 (결제 · 캐시 칸만):
  - cwRpc: 워시 서버(wash-api)로, { shop: 검사소 코드(cgg_shop), token: 체크 열쇠(cgg_key) } — 워시 열쇠(ccw_sid)는 안 씀
  - 대표만: 화면도 ST.role 이 owner 일 때만 열고(서버도 대표만 받음)
  - 지갑이 아직 안 이어진 검사소({ok:false, off:true, notLinked:true, note}) → note 를 그대로 안내
"""
BASE = "/home/user/chagotgan/체크/"
SRC = BASE + "2_차곳간_체크_index_v30.html"
OUT = BASE + "2_차곳간_체크_index_v31.html"
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

rep('''    var sid="", shop="";
    try{ sid = localStorage.getItem("ccw_sid")||""; shop = localStorage.getItem("ccw_shop")||""; }catch(e){}
    var url = "https://ybfpxmmjofyvfprtvmhj.supabase.co/functions/v1/check-api?forceFunctionRegion=ap-northeast-2";''',
    '''    /* v31: 결제 · 캐시는 워시 서버 한 곳(sb11) — 체크 열쇠(cgg_key)와 검사소 코드(cgg_shop)로 부름 */
    var sid="", shop="";
    try{ sid = (typeof ST!=="undefined" && ST.key) || localStorage.getItem("cgg_key") || "";
         shop = (typeof ST!=="undefined" && ST.shop) || localStorage.getItem("cgg_shop") || ""; }catch(e){}
    var url = "https://ybfpxmmjofyvfprtvmhj.supabase.co/functions/v1/wash-api?forceFunctionRegion=ap-northeast-2";''')

rep('''  function cashAllowed(){
    try{
      if(typeof isOwner === "function") return !!isOwner();''',
    '''  function cashAllowed(){
    try{
      if(typeof ST !== "undefined" && ST.role) return ST.role === "owner";   /* v31: 체크는 검사소 대표만 */
      if(typeof isOwner === "function") return !!isOwner();''')

rep('''      if(!r || r.on === false){ offNotice(r && r.note); return; }''',
    '''      if(!r || r.on === false || r.off || r.ok === false){ offNotice(r && r.note); return; }   /* v31: 지갑 안 이어짐(notLinked) 포함 */''')
rep('''      var q = rs[0] || {};
      var ci = rs[1] || {};
      CW.due = q;''',
    '''      var q = rs[0] || {};
      var ci = rs[1] || {};
      if(q.off || q.notLinked){ offNotice(q.note); return; }   /* v31: 이 검사소에 지갑이 아직 안 이어짐 */
      CW.due = q;''')

rep('''  $("hdVer").textContent="체크 v30 · "''', '''  $("hdVer").textContent="체크 v31 · "''')
open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
