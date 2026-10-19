"""워시 v138 → v139. 총괄 10/19: 공통 1.13.2 바꿔 끼우기 + 서버 sb27 codes 짝 + CGG.steps
쓰는 법: python3 워시/도구/만들기_워시_v139.py  (v138 판 위에 덧붙임 — v138 은 덮어쓰지 않아요)
  1) 공통 1.13(85fe100) → 1.13.2 (디자인/공통/cgg-j4-1.13.2.* · 보안 통과 7257e11)
  2) 표(CGG.table 쓰는 곳 = 일감 입고 · 출고 내역): 처음 정렬 sort:[입고일,-1] (머리 두 번 누르던 꼼수 대신 · F03)
     — 일괄 단추 없는 표 · 배달 기록 · 알림 표는 워시에서 아직 CGG.table 을 안 써서 해당 없음
  3) sendErrText · kmsg → CGG.sendWhy · CGG.easyMsg (같은 셈 · 넣는 곳은 모두 esc/textContent 그대로)
  4) 말: 세금계산서 «발급» → «발행» (화면 글만 · 돈 함수 안 글과 저장 값 «발급», 홈택스 공식 이름 «일괄발급»은 그대로)
  5) 밀린 달 한꺼번에: 서버 sb27 짝 — 최근 달 코드는 variables.보기코드, 묶인 다른 달 코드는 codes:[…]
  6) 홈 «이번 달 어디까지 왔나» → 공통 CGG.steps (워시 임시 .wsh-steps 걷어냄)
운영 v111 · 시험판 v125 · v126 ~ v138 은 덮어쓰지 않는다.
"""
import os, re, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE); ROOT = os.path.dirname(BASE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v138.html"); OUT = os.path.join(BASE, "1_차곳간_워시_index_v139.html")
G = os.path.join(ROOT, "디자인", "공통")
def gd(n): return open(os.path.join(G, n), encoding="utf-8").read()
def gitshow(rev, path): return subprocess.check_output(["git", "-C", ROOT, "show", rev + ":" + path]).decode("utf-8")
s = open(SRC, encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('var APP_VER="워시 v138 · UI 3.0 · 2026-10-18";', 'var APP_VER="워시 v139 · UI 3.0 · 2026-10-19";')

# 1) 공통 1.13 → 1.13.2
rep(gitshow("85fe100", "디자인/공통/cgg-j4-1.13.css"), gd("cgg-j4-1.13.2.css"))
rep(gitshow("85fe100", "디자인/공통/cgg-j4-1.13.js"), gd("cgg-j4-1.13.2.js"))

# 2) 일감 표 처음 정렬 = 최신 입고순 (F03 sort)
rep('''      sorts:[[4,-1,"최신 입고순"],[4,1,"오래된 입고순"],[5,-1,"금액 큰 순"],[0,1,"상사명 순"]],''',
'''      sort:[4,-1],   /* v139 1.13.2 F03 처음 정렬 = 최신 입고순 */
      sorts:[[4,-1,"최신 입고순"],[4,1,"오래된 입고순"],[5,-1,"금액 큰 순"],[0,1,"상사명 순"]],''')
rep('''    /* 처음 정렬은 «최신 입고순» (입고일 머리 두 번 = 내림차순) */
    for(var k=0;k<2;k++){var th=host.querySelector('th[data-k="4"]');if(th)th.click();}}''',
'''    /* v139 처음 정렬은 sort:[4,-1] 로 (머리 두 번 누르던 것 걷어냄) */}''')

# 3) 실패 까닭 쉬운 말 — 공통 셈으로
rep('''function kmsg(e,fb){
  var m=(typeof e==="string")?e:String((e&&(e.message||e.__err||e.error))||"");''',
'''function kmsg(e,fb){
  if(window.CGG&&CGG.easyMsg)return CGG.easyMsg(e,fb);   /* v139 공통 1.13.2 (같은 셈) */
  var m=(typeof e==="string")?e:String((e&&(e.message||e.__err||e.error))||"");''')
rep('''function sendErrText(raw){
  var t = String(raw || "");''',
'''function sendErrText(raw){
  if(window.CGG&&CGG.sendWhy)return CGG.sendWhy(raw);   /* v139 공통 1.13.2 (같은 셈 · 쉬운 말) */
  var t = String(raw || "");''')

# 5) 밀린 달 — sb27 codes (본사 알림톡 길: body.ataKey="bill")
rep('''    else if(o.hq&&!HQATA.off){body.kind="ATA";body.ataKey=o.hq.key;body.variables=o.hq.vars;body.imageB64="";body.disableSms=false;
      if(o.hq.rec)body.rec=String(o.hq.rec);}''',
'''    else if(o.hq&&!HQATA.off){body.kind="ATA";body.ataKey=o.hq.key;body.variables=o.hq.vars;body.imageB64="";body.disableSms=false;
      if(o.hq.rec)body.rec=String(o.hq.rec);
      if(o.hq.codes&&o.hq.codes.length)body.codes=o.hq.codes.slice(0,24);}   /* v139 sb27 밀린 달 묶음의 다른 달 보기코드 */''')
rep('''        delete body.ataKey;delete body.variables;delete body.disableSms;delete body.rec;body.imageB64=b2||"";''',
'''        delete body.ataKey;delete body.variables;delete body.disableSms;delete body.rec;delete body.codes;body.imageB64=b2||"";''')
rep('''    var hq=(!useAta&&!HQATA.off)?{key:HQKEY.bill,vars:hqVars(onlyKeys(v,ATA_VARS.bill))}:null;''',
'''    var hq=(!useAta&&!HQATA.off)?{key:HQKEY.bill,vars:hqVars(onlyKeys(v,ATA_VARS.bill)),codes:codes.slice(0,-1).filter(Boolean)}:null;   /* v139 sb27 */''')

# 6) 이번 달 어디까지 왔나 → CGG.steps (1.13.1~)
rep('''    var stp=function(done,title,pct,sub){return '<div class="'+(done?"done":"")+'"><b>'+esc(title)+'</b><div class="bar"><i style="width:'+pct+'%"></i></div><small>'+esc(sub)+'</small></div>';};''',
'''    /* v139 공통 CGG.steps — state: done · now · todo (글자는 부품이 esc) */''')
rep('''    var sb=document.createElement("div");sb.className="card wsh-steps-card";sb.id="homeSteps";
    sb.innerHTML='<h2>이번 달 어디까지 왔나</h2><div class="hint" style="margin:-6px 0 12px">왼쪽부터 차례대로 하시면 돼요.</div><div class="wsh-steps">'+
      stp(st.nIn>0&&st.nWk===0,"1. 입고 · 출고",pc(st.nIn-st.nWk,st.nIn),st.nIn?(inL+" "+st.nIn+"대 · 작업 중 "+st.nWk+"대"):(inL+" 들어온 차가 없어요"))+
      stp(st.nB>0,"2. 청구서 만들기",st.nB?100:0,st.nB?(bmL+" · "+st.nB+"장 만듦"):(bmL+" 청구할 차가 없어요"))+
      stp(st.nB>0&&st.nUn===0,"3. 청구서 보내기",pc(sent,st.nB),sent+"장 보냄 · "+st.nUn+"장 남음")+
      stp(st.bAll>0&&st.bGot>=st.bAll,"4. 입금 확인",pc(st.bGot,st.bAll),pc(st.bGot,st.bAll)+"% 입금")+'</div>';''',
'''    var sb=document.createElement("div");sb.id="homeSteps";
    var d1=st.nIn>0&&st.nWk===0,d2=st.nB>0,d3=st.nB>0&&st.nUn===0,d4=st.bAll>0&&st.bGot>=st.bAll;
    var now=!d1?0:!d2?1:!d3?2:!d4?3:-1, stt=function(i,d){return d?"done":(i===now?"now":"todo");};
    CGG.steps(sb,[
      {label:"입고 · 출고",state:stt(0,d1),note:st.nIn?(inL+" "+st.nIn+"대 · 작업 중 "+st.nWk+"대"):(inL+" 들어온 차가 없어요")},
      {label:"청구서 만들기",state:stt(1,d2),note:st.nB?(bmL+" · "+st.nB+"장 만듦"):(bmL+" 청구할 차가 없어요")},
      {label:"청구서 보내기",state:stt(2,d3),note:sent+"장 보냄 · "+st.nUn+"장 남음"},
      {label:"입금 확인",state:stt(3,d4),note:pc(st.bGot,st.bAll)+"% 입금"}],
      {title:"이번 달 어디까지 왔나",desc:"왼쪽부터 차례대로 하시면 돼요."});''')
rep('''/* v138 이번 달 어디까지 왔나 — 체크 v56 .chk-steps 와 같은 모양 (공통 부품으로 옮기면 걷어내요) */
.wsh-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.wsh-steps>div{background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:12px 14px;font-size:13.5px;line-height:1.5}
.wsh-steps>div b{display:block;font-size:14px}
.wsh-steps>div .bar{height:6px;border-radius:3px;background:var(--line);margin:8px 0 4px;overflow:hidden}
.wsh-steps>div .bar i{display:block;height:100%;background:var(--blue)}
.wsh-steps>div.done .bar i{background:var(--done)}
.wsh-steps>div small{color:var(--muted)}
@media (max-width:800px){.wsh-steps{grid-template-columns:repeat(2,minmax(0,1fr))}}''', '')

# 4) 말 «발급» → «발행» — 화면 글만 (돈 함수 · 저장 값 "발급" · 홈택스 «일괄발급» 은 그대로)
MONEY = set(re.search(r"wash:\[([^\]]*)\]", open(os.path.join(ROOT, "디자인", "통합검사", "전체검사.js"), encoding="utf-8").read()).group(1).replace("'", "").replace("\n", "").replace(" ", "").split(","))
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
def wording(seg):
    seg = seg.replace('"발급"', "\x00Q\x00").replace("일괄발급", "\x00I\x00")
    seg = seg.replace("발급", "발행")
    return seg.replace("\x00Q\x00", '"발급"').replace("\x00I\x00", "일괄발급")
for name in ["renderBill", "renderTax", "pbCardHtml", "pbBarHtml", "pbCopy", "pbFixSheet", "taxUnpaidText", "useSheet", "taxBox", "wBandOf", "bindPbCard"]:
    assert name not in MONEY, name
    a, b = fn_span(name)
    s = s[:a] + wording(s[a:b]) + s[b:]
for a0, b0 in [("팝빌을 쓰면 버튼 한 번으로 발급돼요.", "팝빌을 쓰면 버튼 한 번으로 발행돼요."),
               ("vTax:\"한 달치 세금계산서를 모아 보고, 발급하거나", "vTax:\"한 달치 세금계산서를 모아 보고, 발행하거나"),
               ("[\"tPbIssue\",\"세금계산서 발급\",\"국세청에 세금계산서를 발급해요.\"]", "[\"tPbIssue\",\"세금계산서 발행\",\"국세청에 세금계산서를 발행해요.\"]")]:
    rep(a0, b0)

# 도움말(HELP) 안 «발급» 글 — 화면 단추 이름과 맞게
for a0, b0 in [("팝빌로 발급한 건은 자동", "팝빌로 발행한 건은 자동"),
               ("켜 두면 진짜 발급이 되지 않아요.", "켜 두면 진짜 발행이 되지 않아요."),
               ("<b>자동 발급(팝빌)</b>: 팝빌 가입·연동 후 켜면 [고른 건 바로 발급]으로 국세청까지 바로 발급됩니다. 처음엔 <b>시험 모드</b>로 확인하세요. 한 번 발급된 건은 다시 발급되지 않습니다.",
                "<b>자동 발행(팝빌)</b>: 팝빌 가입·연동 후 켜면 [고른 건 바로 발행]으로 국세청까지 바로 발행돼요. 처음엔 <b>시험 모드</b>로 확인하세요. 한 번 발행된 건은 다시 발행되지 않아요.")]:
    rep(a0, b0)
# 3) 잔액 부족 같은 보내기 실패 까닭은 sendWhy 를 먼저 (easyMsg 는 «잔액» 글을 숨겨서)
rep('''    else{o.status="실패";o.err=kmsg(res&&(res.error||res.message),"보내지 못했어요. 보낸 기록에서 다시 보내 주세요.");}''',
'''    else{o.status="실패";o.err=((window.CGG&&CGG.sendWhy)?CGG.sendWhy(String((res&&(res.error||res.message))||"")):"")||kmsg(res&&(res.error||res.message),"보내지 못했어요. 보낸 기록에서 다시 보내 주세요.");}   /* v139 sendWhy 먼저 */''')
rep('''    o.err=kmsg(e,"보내지 못했어요. 보낸 기록에서 다시 보내 주세요.");''',
'''    o.err=((window.CGG&&CGG.sendWhy)?CGG.sendWhy(String((e&&(e.message||e.error||e.__err))||(typeof e==="string"?e:""))):"")||kmsg(e,"보내지 못했어요. 보낸 기록에서 다시 보내 주세요.");   /* v139 sendWhy 먼저 */''')

open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s))
