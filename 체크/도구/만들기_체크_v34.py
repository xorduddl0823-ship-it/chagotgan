"""체크 v33 → 체크 v34 새 판 — J안 완성 기준(디자인/완성기준/00_공통 · 02_체크) + 공통 부품 cgg-j4 1.3.
쓰는 법: python3 체크/도구/만들기_체크_v34.py   (저장소의 v33 파일을 읽기만 — 앞 판은 다시 만들지 않음)
바꾸는 것:
  1) 공통 부품 1.2 → 1.3 (디자인/공통 글자 그대로, JS 는 제품 스크립트보다 먼저)
  2) 화면 일곱 칸 공통 부품으로: ② 화면 머리 head() → CGG.head(묶음 › 화면) · ⑤ 숫자 카드 sums() → CGG.kpis 모양
     · 확인 창 ask() → CGG.dialog(확인 400) · 저장 알림 bar(…,"ok") → CGG.toast 도 함께
  3) 사람 단추 글 «마이페이지 · 휴지통 ▾» → 이름 + ▾ (워시와 같게) · 머리말 숨은 휴지통 버튼 지움
  4) 그림 문자(🔒 📝 🔔 …) 지움 (02_체크 · 00_공통 4장)
  5) 잠금 안내 · 공지 칸(rpcL · rpcN) — 워시 열쇠로 체크 서버를 부르던 것을 결제 칸처럼 워시 서버(sb12)로,
     체크 열쇠(cgg_key) · 검사소 코드(cgg_shop) (서버 방 2026-10-15 답 · 보안 방 권고)
기능(서버 부르기 · 계산)은 그대로 — 그리는 부분만 바꿈 (00_공통 2장)
"""
import re
BASE = "/home/user/chagotgan/체크/"
SRC = BASE + "2_차곳간_체크_index_v33.html"
OUT = BASE + "2_차곳간_체크_index_v34.html"
CSS = open("/home/user/chagotgan/디자인/공통/cgg-j4.css", encoding="utf-8").read()
JS = open("/home/user/chagotgan/디자인/공통/cgg-j4.js", encoding="utf-8").read()
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

# 1) 공통 부품 1.3
m = re.search(r'<style id="cgg-j4-common">\n.*?\n</style>', s, re.S)
s = s[:m.start()] + '<style id="cgg-j4-common">\n' + CSS + '\n</style>' + s[m.end():]
m = re.search(r'<script>\n/\* ═+\n   차곳간 공통 부품 · J안 4판 · cgg-j4 .*?\nvar CGG = \(function\(\)\{.*?\n\}\)\(\);\n\n?</script>', s, re.S)
if not m: raise SystemExit("공통 부품 JS 덩어리를 못 찾음")
s = s[:m.start()] + "<script>\n" + JS + "\n</script>" + s[m.end():]
if 'version:"cgg-j4 1.3"' not in s: raise SystemExit("1.3 이 안 들어감")

# 2) 화면 일곱 칸 — 공통 함수 한 곳씩만 바꿔서 모든 화면에 걸리게
rep('''function head(t,p){ return '<div class="phead"><h2>'+t+'</h2><p>'+p+'</p></div>'; }''',
    '''/* v34: ② 화면 머리 — 공통 부품 CGG.head (묶음 › 화면 · 제목 · 설명 한 줄) */
function head(t,p){
  if(window.CGG && CGG.head){
    var G=(typeof groupOf==="function")?groupOf(page):[page,null], big="", small="";
    JOBS.forEach(function(j){ if(j[0]===G[0]) big=j[1]; });
    (G[1]||[]).forEach(function(x){ if(x[0]===page) small=x[1]; });
    var crumb = big ? (small && small!==big ? big+" › "+small : big) : "";
    return CGG.head({crumb:crumb, title:t, desc:String(p||"").replace(/<[^>]+>/g,"")});
  }
  return '<div class="phead"><h2>'+t+'</h2><p>'+p+'</p></div>'; }''')
rep('''function sums(list,cls){
  return '<div class="sums '+(cls||"")+'">'+list.map(function(x){''',
    '''/* v34: ⑤ 숫자 카드 — 공통 부품 CGG.kpis 모양 (4개씩 · 이름 · 큰 숫자 + 단위) */
function sums(list,cls){
  if(window.CGG && CGG.kpis && list.length<=4 && !cls){
    var box=document.createElement("div");
    CGG.kpis(box, list.map(function(x){
      var t=String(x[1]).replace(/<[^>]+>/g,""), m=t.match(/^([\\d,.\\-−+]+)\\s*(.*)$/);
      return {label:String(x[0]).replace(/<[^>]+>/g,""), value:m?m[1]:t, unit:m?m[2]:"",
              color: x[2]==="bad"?"#D64545":(x[2]==="good"?"#1E9E5A":"#1668C4")}; }));
    return box.outerHTML;
  }
  return '<div class="sums '+(cls||"")+'">'+list.map(function(x){''')
rep('''function ask(opt, done){
  opt=opt||{};''',
    '''/* v34: 확인 창 — 공통 부품 CGG.dialog (확인 400 · «누구 · 몇 개 · 합계 금액» 줄) */
function ask(opt, done){
  opt=opt||{};
  if(window.CGG && CGG.dialog){
    var rows=[]; if(opt.k1) rows.push([opt.k1, String(opt.v1||"").replace(/<[^>]+>/g,"")]);
    if(opt.k2) rows.push([opt.k2, String(opt.v2||"").replace(/<[^>]+>/g,"")]);
    var body = opt.rows && opt.rows.length
      ? '<p style="margin:0 0 8px;font-size:12.5px;font-weight:800;color:var(--muted)">'+esc(opt.rowsTitle||"받는 곳")+'</p><div class="dlg-who">'+
        opt.rows.map(function(r){ return '<div><b>'+r[0]+'</b><span style="color:var(--muted);font-weight:700">'+r[1]+'</span></div>'; }).join("")+'</div>'
      : (opt.html||"");
    if(opt.warn) body += '<div class="dlg-warn '+(opt.warnKind||"info")+'">'+opt.warn+'</div>';
    var only = (opt.no===false);
    var tl=String(opt.title||"확인해 주세요").split(/\\n+/), t1=tl.shift(), d1=[opt.sub||""].concat(tl).filter(Boolean).join(" · ");   /* 줄바꿈 제목 → 제목 + 설명 */
    CGG.dialog({size:"confirm", title:t1, desc:d1, rows:rows.length?rows:null, body:body,
      ok: only ? null : (opt.yes||"확인"), cancel: only ? (opt.yes||"닫기") : (opt.no||"취소"),
      onOk:function(){ if(done) setTimeout(done, 0); }});
    return;
  }''')
rep('''function askClose(){ $("ovl").hidden=true; DLG_DONE=null; }''',
    '''function askClose(){ $("ovl").hidden=true; DLG_DONE=null; try{ if(window.CGG&&CGG.closeDialog) CGG.closeDialog(); }catch(e){} }''')
n = s.index("function bar(text, kind, quiet){")
rep('''function bar(text, kind, quiet){''', '''function bar(text, kind, quiet){
  try{ if(text && kind==="ok" && window.CGG && CGG.toast) CGG.toast(String(text).replace(/<[^>]+>/g,"")); }catch(e){}   /* v34: 저장 알림 글 */''')

# 3) 사람 단추 — 이름 + ▾ · 숨은 휴지통 버튼 지움
rep('''<button class="hb cgg-wide" id="btnTrash" hidden title="지운 자료 되돌리기">휴지통</button>''', '')
rep('''  $("btnTrash").onclick = function(){ go("trash"); };''',
    '''  /* v34: 휴지통은 사람 단추 ▾ 안에서만 (머리말 숨은 단추 지움) */''')
rep('''<span class="mypglb"><span class="t-wide">마이페이지 · 휴지통 ▾</span><span class="t-narrow">내 정보</span></span>''',
    '''<span class="mypglb"><span id="meName">내 정보</span> ▾</span>''')
rep('''  $("hdWho").innerHTML='<b>'+esc(ST.who||"—")+'</b><br>'+esc(ST.role==="owner"?"대표 · 전체 권한":"직원");''',
    '''  $("hdWho").innerHTML='<b>'+esc(ST.who||"—")+'</b><br>'+esc(ST.role==="owner"?"대표 · 전체 권한":"직원");
  if($("meName")) $("meName").textContent=ST.who||"내 정보";   /* v34: 사람 단추 = 이름 + ▾ */''')
# 휴지통 단추 대신 공지 단추가 붙을 자리
rep('''var host=document.getElementById("btnTrash") || document.getElementById("btnRefresh");''',
    '''var host=document.getElementById("btnHelp") || document.getElementById("btnRefresh");''')

# 3-2) 태블릿 너비(768)에서 홈 달력이 48px 넘치던 것 (v33부터) — 달력 칸이 줄어들 수 있게
rep('''.cgg-right .me{position:relative}''', '''.cgg-right .me{position:relative}
/* v34: 홈 달력 칸이 화면 너비 안에서 줄어들게 (태블릿 넘침 고침) */
.dow,.cal{grid-template-columns:repeat(7,minmax(0,1fr))}
.cal .d{min-width:0;overflow:hidden}
.homegrid>.hgL,.homegrid>.hgR,.homegrid .card{min-width:0}
@media(max-width:820px){.homegrid{grid-template-columns:minmax(0,1fr)}}''')

# 4) 그림 문자 지움
for old, new in [('placeholder="🔍 표에서 찾기"', 'placeholder="표에서 찾기"'), ("'<div class=\"memo\">📝 '", "'<div class=\"memo\">'"),
                 ('(m.time||"📝")', '(m.time||"메모")'), ("📝 이 날 메모", "이 날 메모"), ("🔔 알림 설정", "알림 설정"),
                 ("<b>🛡 자료 점검</b>", "<b>자료 점검</b>"), ("🖼 청구서 그림으로", "청구서 그림으로"), ("⏰ 예약 발송", "예약 발송"),
                 ("🕘 예약 발송…", "예약 발송…"), ("📅 작성일자는", "작성일자는"), ("'<div class=\"lkT\">🔓 ", "'<div class=\"lkT\">"),
                 ("'<div class=\"lkT\">🔒 ", "'<div class=\"lkT\">")]:
    if old not in s: raise SystemExit("그림 문자 자리를 못 찾음: " + old)
    s = s.replace(old, new)

# 5) 잠금 안내 · 공지 — 워시 서버(sb12)로, 체크 열쇠와 검사소 코드
OLDL = '''    if(typeof rpc === "function") return rpc(fn, args||[]);
    var sid="", shop="";
    try{ sid=localStorage.getItem("ccw_sid")||""; shop=localStorage.getItem("ccw_shop")||""; }catch(e){}
    if(!sid) return Promise.reject({message:"로그인이 필요합니다"});
    var url="https://ybfpxmmjofyvfprtvmhj.supabase.co/functions/v1/check-api?forceFunctionRegion=ap-northeast-2";'''
OLDN = '''    if(typeof rpc === "function") return rpc(fn,args||[]);
    var sid="",shop="";
    try{ sid=localStorage.getItem("ccw_sid")||""; shop=localStorage.getItem("ccw_shop")||""; }catch(e){}
    var url="https://ybfpxmmjofyvfprtvmhj.supabase.co/functions/v1/check-api?forceFunctionRegion=ap-northeast-2";'''
NEWW = '''    /* v34: 잠금 안내 · 공지도 워시 서버(sb12) 한 곳 — 체크 열쇠(cgg_key) · 검사소 코드(cgg_shop) */
    var sid="", shop="";
    try{ sid=(typeof ST!=="undefined" && ST.key) || localStorage.getItem("cgg_key") || "";
         shop=(typeof ST!=="undefined" && ST.shop) || localStorage.getItem("cgg_shop") || ""; }catch(e){}
    if(String(sid).indexOf("chk_")!==0) return Promise.reject({message:"통합 입구로 다시 로그인해 주세요."});
    var url="https://ybfpxmmjofyvfprtvmhj.supabase.co/functions/v1/wash-api?forceFunctionRegion=ap-northeast-2";'''
rep(OLDL, NEWW); rep(OLDN, NEWW)

# 5-2) 나머지 «워시 열쇠가 있어야만 부름» 문 — 체크에는 워시 열쇠가 없어 캐시 · 잠금 · 공지가 아예 안 불렸음 → 체크 열쇠(chk_)로
KEYGET = '''(function(){ try{ var k=(typeof ST!=="undefined" && ST.key) || localStorage.getItem("cgg_key") || ""; return String(k).indexOf("chk_")===0 ? k : ""; }catch(e){ return ""; } })()'''
rep('''    var sid=""; try{ sid = localStorage.getItem("ccw_sid")||""; }catch(e){}''',
    '''    var sid=''' + KEYGET + ''';   /* v34: 체크 열쇠 */''')
rep('''    var sid=""; try{ sid=localStorage.getItem("ccw_sid")||""; }catch(e){}''',
    '''    var sid=''' + KEYGET + ''';   /* v34: 체크 열쇠 */''', 3)
# 워시 요금제 불러오기(ccwOpen 은 체크에 없고 아무도 안 부름) — 워시 열쇠를 읽지 않게 막음
rep('''      var sid = localStorage.getItem("ccw_sid");
      if(!sid) return;
      if(typeof ccwOpen !== "function") return;
      ccwOpen("myPlan",[sid])''',
    '''      return;   /* v34: 체크에는 워시 요금제 불러오기가 없음 — 요금은 결제 칸(cwRpc)이 받음 */
      ccwOpen("myPlan",[])''')

rep('''  $("hdVer").textContent="체크 v33 · "''', '''  $("hdVer").textContent="체크 v34 · "''')
for bad in ["ccw_sid", "🔒", "📝", "🔍"]:
    if bad in s: raise SystemExit("아직 남음: " + bad)
open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
