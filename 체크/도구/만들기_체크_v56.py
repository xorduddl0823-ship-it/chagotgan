"""체크 v55.1 → v56 — 디자인 통합 2단계 (대표님 «디자인 통합 계획» 승인 10/18)
쓰는 법: python3 체크/도구/만들기_체크_v56.py [v56.1]   (v55.1 은 읽기만 · 덮어쓰지 않아요)
  v56.1 (총괄 10/18 밤) = 같은 만들기에 공통 부품만 1.13 으로 바꿔 끼우기 — 결과 목록 · 진행 줄 · 밀린 달 창은 1.13 공통(CGG.listify · CGG.progress · CGG.bundle),
        알림톡 잠금은 디자인/공통/cgg-ata-1.1.js, 폰 목록은 1.13 «이름표: 값» 칸(cgg-mf), 덧붙임은 v56.1_통합.js
  ① 공통 부품 cgg-j4 1.10 → 1.12(보안 통과 판 그대로) + 메뉴 지도 체크_메뉴.js(CGG_MENU_CHECK)
  ② 덧댄 조각(chk-j4 · v42-cal · v43-piece · chk-glue · chk-v50 · cgg-beta-piece) 걷어내고 체크 전용 몫만 «chk-v56» 한 곳에
  ③ 대조표 74줄 추천(체크/대조 · 04 결정 기록) — 표 · 숫자 칸 · 할 일 띠 · 화면 제목 · 말(«메시지») · 배달 기록 · 목적지별 보기 뺌
  ④ 같은 판: 알림톡 칸 잠금(문자만 고치기) · 밀린 달 한꺼번에(check-api v51) · «매일 자동» 잠금 풀기 · 결과 목록 창 · «불러오기» 글 없앰
절대 규칙: 정산 · 입금 · 세금계산서 · 청구서 계산 함수는 고치지 않음(체크/도구/돈코드_지문.py 로 v55.1 과 같은지 확인).
"""
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); CHK = os.path.dirname(HERE); ROOT = os.path.dirname(CHK)
V = sys.argv[1] if len(sys.argv) > 1 else "v56"; N = V != "v56"   # N: v56.1 (공통 1.13)
assert V in ("v56", "v56.1")
SRC = os.path.join(CHK, "2_차곳간_체크_index_v55.1.html"); OUT = os.path.join(CHK, "2_차곳간_체크_index_%s.html" % V)
def rd(*p): return open(os.path.join(ROOT, *p), encoding="utf-8").read()
s = open(SRC, encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:120]))
    s = s.replace(old, new)
def cut(start, end):
    """start 로 시작해 end 로 끝나는 덩어리 하나를 통째로 뺌"""
    global s
    i = s.find(start); j = s.find(end, i)
    if i < 0 or j < 0 or s.find(start, i + 1) >= 0: raise SystemExit("덩어리를 못 찾음: " + start[:80])
    s = s[:i] + s[j + len(end):]

# ═══ ① 공통 부품 1.10 → 1.12 · 메뉴 지도 ═══
J110, C110 = rd("디자인", "공통", "cgg-j4-1.10.js"), rd("디자인", "공통", "cgg-j4-1.10.css")
CV = "1.13" if N else "1.12"
J112, C112 = rd("디자인", "공통", "cgg-j4-%s.js" % CV), rd("디자인", "공통", "cgg-j4-%s.css" % CV)
MENU = rd("디자인", "메뉴지도", "체크_메뉴.js")
rep(J110, J112 + "\n" + MENU)
rep(C110, C112)
assert ('version:"cgg-j4 %s"' % CV) in s

# 판 이름
rep('ver:"체크 v55.1", date:"10/18"', 'ver:"체크 %s", date:"10/18"' % V)
rep('$("hdVer").textContent="체크 v55.1 · "', '$("hdVer").textContent="체크 %s · "' % V)
rep('<!-- 체크 v55.1 (', ('<!-- 체크 v56.1 (v56 + 공통 부품 1.13 바꿔 끼우기) · ' if N else '') + '<!-- 체크 v56 (v55.1 + 디자인 통합 2단계: 공통 부품 1.12 · 대조표 74줄 · 알림톡 잠금 · 밀린 달 한꺼번에 · 매일 자동 풀기) · 체크 v55.1 (')

# ═══ ③-A3 표 = 공통 1.12 모양(워시 표) — 위 «넓은 찾기 · 상태 칩 · 20개씩 · 빨간 지우기», 칸 머리 ↕, 아래 «처음 · 이전 · 1 / N · 모두 N줄 · 다음 · 맨뒤», 할 일 단추는 표 아래 줄
#    표 안 동작(wireTable · picked · data-* 이름)은 그대로 — 모양만 바꿔요
rep('function ts(id){ if(!TS[id]) TS[id]={q:"",sort:"",dir:1,per:10,page:1,sel:{}}; return TS[id]; }',
    'function ts(id){ if(!TS[id]) TS[id]={q:"",sort:"",dir:1,per:20,page:1,sel:{}}; return TS[id]; }   /* v56: 처음 20개씩(공통 1.12) */')
rep('  if([5,10,20,30,50].indexOf(s.per)<0) s.per=10;', '  if([5,10,20,30,50].indexOf(s.per)<0) s.per=20;')
i = s.index("  var h='<div class=\"tblk cgg-card\" id=\"'+id+'-blk\">';")
j = s.index("  /* 넓은 화면 — 표 */", i)
s = s[:i] + r'''  var h='<div class="tblk cgg-tblock" id="'+id+'-blk">';   /* v56: 공통 1.12 표 — 흰 카드는 표만 감싸요 */
  var nSel=Object.keys(s.sel).filter(function(k){ return s.sel[k]; }).length;
  TBX[id]={cols:cols, rows:all, cell:cellHtml};   /* v40: 엑셀 다운로드용 */
  var bulk=(opt.tools||"").replace(/<button class="btn">(엑셀 다운로드|기록 전체 엑셀 다운로드)<\/button>/g, '<button class="btn" data-xls="1">$1</button>').replace(/<button (?:type="button" )?class="btn( primary| danger)?"/g, function(_,k){ return '<button type="button" class="cgg-btn btn'+(k===" danger"?" danger":k===" primary"?" pri":"")+'"'; })
    .replace(/(<button type="button" class="cgg-btn btn[^"]*")([^>]*>)(\s*(?:선택항목|선택한|고른)[^<]*<\/button>)/g, function(_,a,b2,c2){
      return a+' data-needsel="1"'+(nSel?' data-n="'+nSel+'"':' disabled')+b2+c2; });
  /* 빨간 지우기 단추는 표 위 오른쪽, 나머지 할 일 단추는 표 아래 줄 (워시 모양) */
  var dels=[], rest=bulk.replace(/<button[^>]*>[\s\S]*?<\/button>/g, function(b){ if(/class="cgg-btn btn danger"/.test(b)||/>[^<]*줄[^<]*지우기[^<]*<\/button>$/.test(b)){ dels.push(b.replace('class="cgg-btn btn"','class="cgg-btn btn danger"')); return ""; } return b; });
  h+='<div class="cgg-ttop"><label class="cgg-find"><input id="'+id+'-q" data-q="1" placeholder="검색" value="'+esc(s.q)+'" aria-label="검색"></label>';
  if(si>=0) h+='<div class="cgg-tchips" role="group" aria-label="상태로 거르기">'+tabs.map(function(t){
      return '<button type="button" class="cgg-fp'+((s.tf||"")===t[0]?' on':'')+'" data-tf="'+esc(t[0])+'" aria-pressed="'+((s.tf||"")===t[0])+'">'+esc(t[1])+' <b>'+t[2]+'</b></button>'; }).join("")+'</div>';
  h+=(opt.filters||"")+'<span class="sp"></span><select class="cgg-size" id="'+id+'-per" data-size="1" aria-label="한 번에 보일 개수">'+
     [5,10,20,30,50].map(function(n){ return '<option value="'+n+'"'+(s.per===n?" selected":"")+'>'+n+'개씩</option>'; }).join("")+'</select>'+dels.join("")+'</div><div class="cgg-card">';
''' + s[j:]
rep('''       (s.sort===c.k?(s.dir>0?"ascending":"descending"):"none")+'">'+esc(c.t)+(s.sort===c.k?(s.dir>0?' ↑':' ↓'):'')+'</th>';''',
    '''       (s.sort===c.k?(s.dir>0?"ascending":"descending"):"none")+'">'+esc(c.t)+'<i class="so">'+(s.sort===c.k?(s.dir>0?'▲':'▼'):'↕')+'</i></th>';''')
i = s.index("  /* 아래 쪽 — 총 N건 · N개씩 보기 · 이전 / 다음 */")
j = s.index("function wireTable(id, redraw){", i)
s = s[:i] + r'''  /* v56 아래 쪽 — 처음 · 이전 · 1 / N · 모두 N줄 · 다음 · 맨뒤 (공통 1.12) · 그 아래 할 일 단추 줄 */
  h+='</div><div class="cgg-pager"><button type="button" class="cgg-btn" data-pg="1"'+(s.page<=1?" disabled":"")+'>처음</button>'+
     '<button type="button" class="cgg-btn" data-pg="'+(s.page-1)+'"'+(s.page<=1?" disabled":"")+'>이전</button><span>'+s.page+' / '+pages+' · 모두 '+won(all.length)+'줄</span>'+
     '<button type="button" class="cgg-btn" data-pg="'+(s.page+1)+'"'+(s.page>=pages?" disabled":"")+'>다음</button>'+
     '<button type="button" class="cgg-btn" data-pg="'+pages+'"'+(s.page>=pages?" disabled":"")+'>맨뒤</button></div>';
  if(String(rest).replace(/\s+/g,"")) h+='<div class="cgg-tacts">'+rest+'</div>';
  h+='</div>';
  return h;
}
''' + s[j:]
# ③-A2 숫자 칸 뜻 색은 sums(돈 코드 목록 · 안 고침) 대신 그린 뒤 v56_통합.js 가 입혀요

CSSV = open(os.path.join(HERE, "v56_체크전용.css"), encoding="utf-8").read()
if N:   # 1.13 공통으로 옮겨 간 몫은 뺌
    for a_, b_ in (("/* 결과 목록 창 · 얇은 진행 줄", "@media (prefers-reduced-motion:reduce){ body.chk-loading::before{animation:none;width:100%;opacity:.6} }\n"),
                   ("/* 밀린 달 한꺼번에 — 달 고르기 줄 */", ".cgg-dlg label.chk-bb input{flex:none;width:20px;height:20px;margin:0}\n")):
        i_ = CSSV.index(a_); j_ = CSSV.index(b_, i_) + len(b_); CSSV = CSSV[:i_] + CSSV[j_:]
    CSSV = CSSV.replace('<style id="chk-v56">', '<style id="chk-v56">\n/* v56.1: 결과 목록 · 진행 줄 · 밀린 달 줄은 공통 1.13(.cgg-list · .cgg-prog · .cgg-bb) */')
# ═══ ② 덧댄 조각 걷어내기 → 체크 전용 몫 한 곳(chk-v56, 공통 부품 앞) ═══
cut('<style id="chk-j4">', '</style>')
for sid in ("cgg-beta-piece", "v42-cal", "v43-piece", "chk-glue", "chk-v50"):
    cut('<style id="%s">' % sid, '</style>')
rep('<!-- ===== 체크 붙임 몫 — 옛 .wrap 틀과 공통 부품이 맞물리게 (머리말 버튼 모양은 디자인/공통/예시.html 그대로) ===== -->', '')
rep('<!-- ===== 차곳간 공통 부품 cgg-j4 (디자인/공통 최신판', CSSV + '<!-- ===== 차곳간 공통 부품 cgg-j4 (디자인/공통 최신판')
for sid in ("chk-j4", "chk-glue", "chk-v50", "v42-cal", "v43-piece", "cgg-beta-piece"):
    assert ('id="%s"' % sid) not in s, sid

# ═══ ④ 같은 판 고침 ═══
# «불러오기» 글 없앰 — 메뉴 · 안쪽 칸을 바꿀 때 화면을 지우지 않고 얇은 진행 줄만 (처음 한 번만 글)
rep("""    $("main").innerHTML='<div class="card"><div class="loading">불러오는 중이에요…</div></div>';
    bar(""); busy(true);
    need(page).then(function(){ busy(false); bar(""); draw(); })
              .catch(function(e){ busy(false); fail(e); draw(); });""",
    """    if(!String($("main").innerHTML||"").trim()) $("main").innerHTML='<div class="card"><div class="loading">불러오는 중이에요…</div></div>';   /* v56: 처음 한 번만 */
    document.body.classList.add("chk-loading"); busy(true);
    need(page).then(function(){ document.body.classList.remove("chk-loading"); busy(false); draw(); })
              .catch(function(e){ document.body.classList.remove("chk-loading"); busy(false); fail(e); draw(); });""" if not N else
    """    if(!String($("main").innerHTML||"").trim()) $("main").innerHTML='<div class="card"><div class="loading">불러오는 중이에요…</div></div>';   /* v56: 처음 한 번만 */
    CGG.progress(1,3,"불러오는 중"); busy(true);   /* v56.1: 공통 1.13 진행 줄 */
    need(page).then(function(){ CGG.progress(null); busy(false); draw(); })
              .catch(function(e){ CGG.progress(null); busy(false); fail(e); draw(); });""")
# «매일 자동» 잠금 풀기 — 서버 v50부터 승인 전에도 켤 수 있음(그동안 문자로)
rep("""(RRULE.auto?" checked":"")+((own&&RRULE.ataReady)?"":" disabled")+'> 매일 아침 9시쯤 자동으로 보내기</label>'""",
    """(RRULE.auto?" checked":"")+(own?"":" disabled")+'> 매일 아침 9시쯤 자동으로 보내기</label>'""")
rep("""(RRULE.ataReady ? "" : '<p class="note" style="margin:6px 0 0">자동 보내기는 재검사 알림톡이 <b>카카오 승인된 뒤</b>에 켤 수 있어요. 그 전에는 직접 보내면 문자로 가요.</p>')""",
    """(RRULE.ataReady ? "" : '<p class="note" style="margin:6px 0 0">재검사 알림톡이 <b>카카오 승인되기 전</b>에는 자동으로 보낼 때도 <b>문자</b>로 나가요(문자 요금이 들어요).</p>')""")
# 배달 › 문구 · 발송 설정 — 알림톡은 승인 문구(출고안내) 잠금 칸, 고칠 수 있는 건 문자 문구
rep("""      '<label class="f">문자로 갈 때 문구</label>'+""", """      '<div id="dwAtaLock"></div><label class="f">문자 문구 — 알림톡이 안 갈 때 · 고칠 수 있어요</label>'+""")
a = s.index("""      '<label class="f" style="margin-top:6px">알림톡 문구 (차곳간이 카카오에 등록한 문구""")
b = s.index("""      '<div class="tools"><button class="btn primary" id="dwSave2">문구 저장</button>'+""", a)
s = s[:a] + s[b:]
k = s.index('<div class="phone-top">카카오 알림톡</div>', a)   # 배달 문구 화면 것만 (청구서 보내기 것은 그대로)
s = s[:k] + '<div class="phone-top">문자 (알림톡이 안 갈 때)</div>' + s[k+len('<div class="phone-top">카카오 알림톡</div>'):]
k = s.index('<div class="phone-from">차곳간 카카오 채널에서</div>', k)
s = s[:k] + '<div class="phone-from">검사소 번호로</div>' + s[k+len('<div class="phone-from">차곳간 카카오 채널에서</div>'):]
# 알림톡 문구 부품 ata 1.1 + v56 덧붙임 — 마지막 «공통 부품 부르기» 앞
rep("""<script>
/* ===== 체크 v24 — 공통 부품 부르기 ===== */""", "<script>\n" + (rd("디자인", "공통", "cgg-ata-1.1.js") if N else rd("체크", "부품", "알림톡문구_부품_1.1.js")) + "\n</script>\n" + open(os.path.join(HERE, "v56.1_통합.js" if N else "v56_통합.js"), encoding="utf-8").read() + """<script>
/* ===== 체크 v24 — 공통 부품 부르기 ===== */""")

rep('  home:["bill","dep"], sales:["sales"],', '  home:["bill","dep","sales"], sales:["sales"],   /* v56: 홈 숫자 칸 작은 그래프 · 지난달 비교 */')

# 입·출금 내역 «통장을 먼저 연결해 주세요» — 워시 모양(주황 상자 · ①②③ 글 · 파란 단추)
rep("""  (OFFICE.popbill_ready?'':card("통장을 먼저 연결해 주세요","팝빌로 통장을 이어 두면 들어온 돈이 저절로 들어와요. 설정 › 입금 자동 확인에서 한 번만 하면 돼요.",
    '<div class="tools"><button type="button" class="btn primary" id="depBankGo">입금 자동 확인 화면으로 가기</button></div>'))+""",
"""  (OFFICE.popbill_ready?'':'<div class="card" style="background:var(--warn-soft);box-shadow:none">'+   /* v56: 워시와 같은 연결 상자 */
    '<b style="color:var(--warn)">통장을 먼저 연결해 주세요</b>'+
    '<div class="hint" style="margin-top:6px">① 위쪽 메뉴에서 <b>설정</b> 을 눌러요 → ② 그 아래 줄에서 <b>입금 자동 확인</b> 을 눌러요 → ③ 통장을 연결해요.</div>'+
    '<button type="button" class="btn primary" id="depBankGo" style="margin-top:10px">입금 자동 확인 화면으로 가기</button></div>')+""")

# 표 칸이 많으면 글 칸(폭 없음)이 23px로 눌리던 것(v55.1부터) — 표 최소 폭을 칸 폭 합으로, 넘치면 옆으로 밀어 봐요
rep("""  h+='<div class="cgg-twrap"><table class="cgg-table"><colgroup><col style="width:56px">'+kinds.map(""",
    """  var tmin=56+kinds.reduce(function(t,k){ return t+(TB_WID[k]||120); },0)+(hasAct?(opt.actWidth||TB_WID.act):0);   /* v56: 글 칸 최소 120 */
  h+='<div class="cgg-twrap"><table class="cgg-table" style="min-width:'+tmin+'px"><colgroup><col style="width:56px">'+kinds.map(""")

# 말 통일(10/18): 문자 · 알림톡을 함께 뜻하면 «메시지»
rep("<b>보내기</b><div class=\"bar\"><i style=\"width:100%\"></i></div><small>알림톡 · 문자</small>", "<b>보내기</b><div class=\"bar\"><i style=\"width:100%\"></i></div><small>메시지</small>")
rep("문자·알림톡·계산서에 쓰여요", "메시지 · 계산서에 쓰여요")
rep("자료 올리기 · 청구서 보내기 · 문자·알림톡 · 세금계산서", "자료 올리기 · 청구서 보내기 · 메시지 · 세금계산서")

# 설정 › 자료 올리기 — 끌어다 놓는 칸에 제목 «엑셀 올리기»
rep('  card("", "",\n    \'<div class="photobox" id="xlBox"', '  card("엑셀 올리기", "",\n    \'<div class="photobox" id="xlBox"')

# 카모두 명부 공통 자리 = 설정 › 거래처 관리 «엑셀로 한꺼번에 올리기»(워시와 같은 칸 · 같은 글) — 자료 올리기 칸은 그대로 둬요
rep("<h3>엑셀로 한꺼번에 올리기</h3><p class=\"csub\">양식에 상사 · 딜러를 적어 올리면 한 번에 들어가요. 이미 있는 사람은 건너뛰어요.</p>",
    "<h3>엑셀로 한꺼번에 올리기</h3><p class=\"csub\">카모두 · 조합 전산에서 받은 명부를 그대로 올려도 돼요. 이미 있는 사람은 건너뛰어요.</p>")

# «준비 중» 글 없애기 — 배달 문구 화면 상태 글
rep('["문자 보낼 준비",DCONF.sms_ready===false?"아직 (차곳간 준비 중)":"됨"]', '["문자 보낼 준비",DCONF.sms_ready===false?"아직 안 켜짐 (차곳간에 알려 주세요)":"됨"]')
rep('["번호판 읽기 준비",DCONF.ai_ready===false?"아직 (차곳간 준비 중)":"됨"]', '["번호판 읽기 준비",DCONF.ai_ready===false?"아직 안 켜짐 (차곳간에 알려 주세요)":"됨"]')

# v56.1 폰 목록 = 공통 1.13 모양(R02~R05): 이름 · 둘째 칸 / 글 칸 한 줄 / «이름표: 값» 칸(금액 · 날짜 · 상태, 또는 opt.mobileFields 열 열쇠) / 줄 단추
if N:
    rep("""      var rest=cols.map(function(c,k){ return (k<2||k===si||k===mi)?"":tbPlain(cellHtml(c,r)); }).filter(Boolean).join(" · ");
      var ra=hasAct?acts(r):"";
      return '<div class="cgg-mrow"><input type="checkbox" class="pk" data-k="'+esc(key)+'"'+(s.sel[key]?" checked":"")+' aria-label="선택">'+
        '<span class="t"><b>'+cellHtml(cols[0],r)+(sub?'<span>'+esc(sub)+'</span>':'')+'</b><small>'+esc(rest)+'</small></span>'+
        '<span class="r">'+(mi>=0?'<b>'+cellHtml(cols[mi],r)+'</b>':'')+(si>=0?cellHtml(cols[si],r):'')+'</span>'+
        (ra?'<span class="ra">'+ra+'</span>':'')+'</div>'; }).join("")""",
    """      var MF=opt.mobileFields?cols.map(function(c,k){ return opt.mobileFields.indexOf(c.k)>=0?k:-1; }).filter(function(k){ return k>0; })
                              :kinds.map(function(kd,k){ return (k>0&&(kd==="money"||kd==="state"||kd==="date"||kd==="time"))?k:-1; }).filter(function(k){ return k>0; });   /* v56.1 (1.13 R02~R05) */
      var rest=cols.map(function(c,k){ return (k<2||MF.indexOf(k)>=0)?"":tbPlain(cellHtml(c,r)); }).filter(Boolean).join(" · ");
      var ra=hasAct?acts(r):"";
      return '<div class="cgg-mrow"><input type="checkbox" class="pk" data-k="'+esc(key)+'"'+(s.sel[key]?" checked":"")+' aria-label="선택">'+
        '<span class="t"><b>'+cellHtml(cols[0],r)+(sub&&MF.indexOf(1)<0?'<span>'+esc(sub)+'</span>':'')+'</b>'+(rest?'<small>'+esc(rest)+'</small>':'')+
        '<span class="cgg-mf">'+MF.map(function(k){ return '<span class="'+(kinds[k]==="money"?'n':'')+'"><i>'+esc(cols[k].t)+'</i>'+cellHtml(cols[k],r)+'</span>'; }).join("")+'</span></span>'+
        (ra?'<span class="ra">'+ra+'</span>':'')+'</div>'; }).join("")""")
    # 청구서 표 폰 칸 (디자인 권장: 청구액 · 받을 금액 · 기한 · 발송 — 체크 청구서엔 기한 칸이 없어 셋)
    rep("    ], billShown(), {pick:true,", "    ], billShown(), {pick:true, mobileFields:[\"total\",\"left\",\"sendState\"],   /* v56.1 폰 칸 */")

#@@끝

open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", os.path.relpath(OUT, ROOT), len(s))
