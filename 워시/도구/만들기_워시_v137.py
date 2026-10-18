"""워시 v136 → v137. 대표님 10/18: 알림톡은 카카오 승인 문구 그대로만 나가요 → 화면에서는 «보기만»(잠금), 고칠 수 있는 건 문자 문구뿐
쓰는 법: python3 워시/도구/만들기_워시_v137.py  (v136 판 위에 덧붙임 — v136 은 덮어쓰지 않아요)
  1) 공통 부품 알림톡 문구 ata 1.0 (체크/부품/알림톡문구_부품_1.0.js · 체크도 같이 씀) — 승인 원문(알림톡/00_확정본) 그대로
  2) 배달 › 문구 · 발송 설정(출고 알림): 문자 칸 위에 잠긴 «알림톡 문구» 칸 · 문자 칸 이름 «문자 문구 — 알림톡이 안 갈 때 · 고칠 수 있어요»
  3) 월별 청구서 › 청구서 보내기: 같은 방식(청구서 승인 문구 잠금 · 문자만 고치기)
  4) 설정 › 알림 › 카카오 알림톡 칸: 템플릿 문구를 고치는 칸 · 변수 단추 · «처음 문구로» 없앰 → 승인 문구 보기만. 저장 값도 늘 승인 문구
운영 v111 · 시험판 v125 · v126 ~ v136 은 덮어쓰지 않는다.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE); ROOT = os.path.dirname(BASE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v136_2.html"); OUT = os.path.join(BASE, "1_차곳간_워시_index_v137.html")
P = os.path.join(ROOT, "체크", "부품")
def rd(n): return open(os.path.join(P, n), encoding="utf-8").read()
CPT13 = rd("거래처_부품_1.3.js")
G = os.path.join(ROOT, "디자인", "공통")
def gd(n): return open(os.path.join(G, n), encoding="utf-8").read()
ATA = gd("cgg-ata-1.1.js")   # 공통 자리로 옮긴 같은 글(1.1 = 1.0 + 체크 재검사 안내)
s = open(SRC, encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('var APP_VER="워시 v136.2 · UI 3.0 · 2026-10-18";', 'var APP_VER="워시 v137 · UI 3.0 · 2026-10-18";')

# 0) 공통 부품 1.10 → 1.13 (1.12 확정본 + 검수 고침 · 체크 v56 공통 몫) · 메뉴 지도 → 최신(«배달 기록» · 보낸 기록은 알림 안 · 메시지 설정 · 카모두 명부)
import subprocess
def gitshow(rev, path): return subprocess.check_output(["git", "-C", ROOT, "show", rev + ":" + path]).decode("utf-8")
rep(gd("cgg-j4-1.10.css"), gd("cgg-j4-1.13.css"))
rep(gd("cgg-j4-1.10.js"), gd("cgg-j4-1.13.js"))
rep(gitshow("4d75f08", "디자인/메뉴지도/워시_메뉴.js"), open(os.path.join(ROOT, "디자인", "메뉴지도", "워시_메뉴.js"), encoding="utf-8").read())

# 0-2) 설정 항목 줄 = 메뉴 지도 차례 그대로(1.11 규칙 · «워시 전용» 묶음 이름 포함) · 보낸 기록은 «알림» 안
rep('''      var subs=g.subs.filter(function(x){
        if(g.key==="settings")return setK.indexOf(x.key)>=0;''',
'''      var subs=g.subs.filter(function(x){
        if(g.key==="settings")return !!x.group||setK.indexOf(x.key)>=0;   /* v137 묶음 이름({group}) 도 메뉴 차례대로 */''')
rep('''      if(g.key==="settings")subs.sort(function(a,b){return setK.indexOf(a.key)-setK.indexOf(b.key);});
      o.subs=subs.map(function(x){return {key:x.key,label:x.label};});''',
'''      /* v137 메뉴 지도 차례 그대로 — 묶음 이름 뒤에 칸이 하나도 없으면 묶음 이름도 빼요 */
      subs=subs.filter(function(x,i){ if(!x.group)return true; var n=subs[i+1]; return !!(n&&!n.group); });
      o.subs=subs.map(function(x){return x.group?{group:x.group}:{key:x.key,label:x.label};});''')
rep('''  if(t==="settings")return S.setSub==="trash"?"settings":"settings/"+(S.setSub||"");''',
'''  if(t==="settings")return S.setSub==="trash"?"settings":"settings/"+(S.setSub==="outbox"?"send":(S.setSub||""));   /* v137 보낸 기록은 «알림» 안 */''')
rep('''function renderSend(){
  var c=sendCfg();
  $("sendBody").innerHTML=
''',
'''function renderSend(){
  var c=sendCfg();
  /* v137 보낸 기록은 «알림» 안 — 맨 위에 한 줄 (공통 1.12 · 체크와 같은 자리) */
  var obl=S.outbox||[], obSent=obl.filter(function(o){return o.status==="보냄";}).length, obFail=obl.filter(function(o){return o.status==="실패";}).length;
  $("sendBody").innerHTML=
  '<div class="card" id="sendOutbox"><h2>보낸 기록 <span class="rt">'+(obFail?'<span style="color:var(--stop)">못 보냄 '+obFail+'건</span>':'보냄 '+obSent+'건')+'</span></h2>'+
   '<div class="hint" style="margin:-6px 0 12px">보낸 문자 · 알림톡을 보고, 못 보낸 것은 다시 보내요.</div>'+
   '<button class="btn'+(obFail?' primary':'')+'" id="sendObGo">보낸 기록 열기</button></div>'+
''')

rep('''  $("scSave").onclick=function(){''',
'''  if($("sendObGo"))$("sendObGo").onclick=function(){S.setSub="outbox";decideMode(false);window.scrollTo(0,0);};
  $("scSave").onclick=function(){''')

# 0-3) 홈 첫 줄 = 두 제품 같은 규칙(1.12 CGG.home sum) · 화면 제목 숫자 파랑 없앰(워시 덧칠 걷어냄)
rep('''.dashhead h2 em,.jsay em{font-style:normal;color:var(--blue)}''', '''.dashhead h2 em,.jsay em{font-style:normal;color:inherit}   /* v137 제목 숫자는 기본 글자색(1.12) */''')
rep('''pick:(typeof pick!=="undefined"?pick:[]),paid:paid,dueAmt:dueAmt,''',
'''pick:(typeof pick!=="undefined"?pick:[]),paid:paid,dueAmt:dueAmt,unsent:(function(){var u={};(notBilled||[]).forEach(function(d){u[d]=1;});return Object.keys(u).length;})(),''')
rep('''  CGG.home(host,{date:(now.getMonth()+1)+"월 "+now.getDate()+"일 "+"일월화수목금토".charAt(now.getDay())+"요일",''',
'''  CGG.home(host,{date:(now.getMonth()+1)+"월 "+now.getDate()+"일 "+"일월화수목금토".charAt(now.getDay())+"요일",
    sum:mgr?null:{unsent:c.unsent||0,due:c.dueAmt||0},   /* v137 홈 첫 줄 = 체크와 같은 규칙 (매니저는 «작업 중인 차» 그대로) */''')

# 1) 부품 넣기 — 거래처 부품 바로 뒤
rep(CPT13, CPT13 + "\n" + ATA)

# 2) 출고 알림 문구 카드
rep('''    <h2>출고 알림 — 문구와 보내는 방식</h2>
    <div class="hint" style="margin:-6px 0 12px">여기서 고친 내용이 <b>출고할 때 자동으로 나가는 알림</b>에 그대로 쓰여요.</div>''',
'''    <h2>출고 알림 — 문구와 보내는 방식</h2>
    <div class="hint" style="margin:-6px 0 12px">알림톡은 승인된 문구 그대로 나가요. 여기서 고치는 건 <b>알림톡이 안 갈 때 가는 문자</b>예요.</div>''')
rep('''        <label class="f">문자 내용</label>
        <textarea id="osText" style="min-height:150px"></textarea>''',
'''        <div id="osAtaLock"></div>
        <label class="f">문자 문구 — 알림톡이 안 갈 때 · 고칠 수 있어요</label>
        <textarea id="osText" style="min-height:150px"></textarea>''')
rep('''        <label class="f" style="margin-top:12px">간단히 보낼 때 문구 (단문·요금 쌈)</label>
        <textarea id="osShort" style="min-height:70px"></textarea>''',
'''        <label class="f" style="margin-top:12px">간단히 보낼 때 문자 문구 (단문·요금 쌈)</label>
        <textarea id="osShort" style="min-height:70px"></textarea>''')

# 3) 청구서 보내기
rep('''          <label class="f">알림톡이 안 될 때 가는 문자 문구</label>
          <textarea id="bmText" style="min-height:200px"></textarea>''',
'''          <div id="bmAtaLock"></div>
          <label class="f">문자 문구 — 알림톡이 안 갈 때 · 고칠 수 있어요</label>
          <textarea id="bmText" style="min-height:200px"></textarea>''')
rep('''          <label class="f" style="margin-top:12px">간단히 보낼 때 문구 (단문 · 요금 쌈)</label>''',
'''          <label class="f" style="margin-top:12px">간단히 보낼 때 문자 문구 (단문 · 요금 쌈)</label>''')
rep('''          <summary>문구 · 보내는 방식 바꾸기</summary>''', '''          <summary>문자 문구 · 보내는 방식 바꾸기</summary>''')
# 잠긴 칸 채우기 — 화면이 처음 뜰 때 한 번(승인 문구는 바뀌지 않아요)
rep('''$("osText").oninput=outSmsPreview;$("osShort").oninput=outSmsPreview;''',
'''$("osText").oninput=outSmsPreview;$("osShort").oninput=outSmsPreview;
/* v137 알림톡 승인 문구 — 보기만(잠금) */
(function(){try{var a=$("osAtaLock");if(a)a.innerHTML=CGG_ATATXT.box("release");var b=$("bmAtaLock");if(b)b.innerHTML=CGG_ATATXT.box("bill");}catch(e){}})();''')

# 4) 설정 › 알림 › 카카오 알림톡 — 문구 고치기 없앰
rep('''      '<label class="f" style="margin-top:8px">템플릿 문구 — 신청할 때 이 글을 <b>한 글자도 바꾸지 말고</b> 그대로 붙여 넣으세요</label>'+
      '<textarea id="at_txt_'+key+'" style="min-height:190px">'+esc(text)+'</textarea>'+
      '<div class="chips" style="margin-top:6px">'+ATA_VARS[key].map(function(v){
        return '<button type="button" class="chip at_var" data-t="at_txt_'+key+'" data-v="#{'+v+'}">#{'+v+'}</button>';}).join("")+'</div>'+
      '<div class="tools" style="margin-top:8px">'+
        '<button class="btn" data-copy="at_txt_'+key+'">문구 복사 (신청용)</button>'+
        '<button class="btn" data-reset="'+key+'">처음 문구로</button>'+
        '<button class="btn" data-test="'+key+'">내 번호로 알림톡 시험</button></div>'+''',
'''      '<div style="margin-top:8px">'+CGG_ATATXT.box(key==="out"?"release":"bill",null,{noSms:true})+'</div>'+
      '<textarea id="at_txt_'+key+'" hidden readonly>'+esc(text)+'</textarea>'+   /* v137 승인 문구 — 보기만 */
      '<div class="tools" style="margin-top:8px">'+
        '<button class="btn" data-test="'+key+'">내 번호로 알림톡 시험</button></div>'+''')
rep('''    out:{tpl:c.tplOut||"",text:c.ataOutText||DEF_ATA_OUT},bill:{tpl:c.tplBill||"",text:c.ataBillText||DEF_ATA_BILL}};''',
'''    out:{tpl:c.tplOut||"",text:DEF_ATA_OUT},bill:{tpl:c.tplBill||"",text:DEF_ATA_BILL}};   /* v137 늘 승인 문구 */''')
rep('''      ataOutText:$("at_txt_out").value,ataBillText:$("at_txt_bill").value,''', '''      ataOutText:DEF_ATA_OUT,ataBillText:DEF_ATA_BILL,''')

# 검사 일꾼: 신청 순서 안내의 없어진 단추 이름 · 미리보기/시험 예시 값을 승인 문구 변수 이름으로
rep('''    '<li>솔라피 → 카카오 → <b>템플릿 등록</b>. 아래 두 문구를 [문구 복사]로 복사해 그대로 붙여 넣고 검수 요청 (보통 1~3일)</li>'+''',
'''    '<li>템플릿 문구는 아래 승인 문구 그대로예요(고칠 수 없어요). 승인 뒤 받은 <b>템플릿 ID</b>만 넣으면 돼요.</li>'+''')
rep('''  var sample={out:{"업체":shopLabel(),"딜러":"홍길동","상사":"브라더모터스","차량번호":"12가3456",
      "작업":"외부세차, 광택","목적지":"브라더모터스","금액":"150,000원"},
    bill:{"업체":shopLabel(),"청구월":periodLabel(mKey(nowIso())),"받는분":"브라더모터스",
      "소속상사":"","대수":"12대","작업내역":"광택 8대, 외부세차 4대","합계":"1,320,000원",
      "계좌":(S.cfg&&S.cfg.bank)||"(계좌)","연락처":(S.cfg&&S.cfg.send&&S.cfg.send.from)||""}};''',
'''  var sample={out:{"딜러명":"홍길동","상사명":"브라더모터스","차량번호":"12가3456","작업내용":"외부세차, 광택",
      "목적지":"브라더모터스","출고일시":dtKo(nowIso()),"업체전화":shopTel(),"업체명":shopLabel(),"보기코드":""},
    bill:{"기간":periodLabel(mKey(nowIso())),"받는곳":"브라더모터스","업체명":shopLabel(),"건수":"12","금액":"1,320,000",
      "입금기한":billDue(null),"계좌":(S.cfg&&S.cfg.bank)||"(계좌)","업체전화":shopTel(),"보기코드":""}};   /* v137 승인 문구 변수 이름 */''')
# 승인 문구와 부품 글자가 같은지 만들 때 확인
import re, json
def jsstr(name):
    m = re.search(r'var ' + name + r'="((?:[^"\\]|\\.)*)";', s); return json.loads('"' + m.group(1) + '"')
assert jsstr("DEF_ATA_OUT") in ATA.replace("\\n", "\n") and jsstr("DEF_ATA_BILL") in ATA.replace("\\n", "\n"), "승인 문구가 부품과 달라요"

# 9) 말 맞추기 (디자인/말_대조표.md · 대표님 10/18) — 맨 마지막에 한 번에
#  · 문자 · 알림톡을 함께 뜻하면 «메시지»   · 배달 화면 «출고 기록» → «배달 기록»(«입출고 기록»은 그대로)
import re
for a, b in [("체크한 번호가 문자·알림톡에 들어가요", "체크한 번호가 메시지에 들어가요"),
             ("문자에 넣을 연락처", "메시지에 넣을 연락처"),
             ("문자·알림톡·세금계산서", "메시지 · 세금계산서"),
             ("문자 · 알림톡 · 세금계산서", "메시지 · 세금계산서"),
             ("문자·알림톡 연동과 보낸 기록", "메시지 연동과 보낸 기록"),
             ("출고 · 문자·알림톡 · 사진", "출고 · 메시지 · 사진"),
             ("보낸 문자 · 알림톡을 보고", "보낸 메시지를 보고"),
             ("내역·출고 기록·자재", "내역·배달 기록·자재"),
             ("<li><b>기기 지우기는 시연 관리자만</b> 할 수 있어요. 대표·직원 화면에서는 목록만 보여요.</li>",
              "<li><b>기기 지우기는 시연 관리자만</b> 할 수 있어요. 대표·직원 화면에서는 목록만 보여요. (로그인 잠금 화면에서는 대표도 안 쓰는 기기를 내보낼 수 있어요)</li>"),
             ("<li>들어갈 수 없다는 안내(<b>들어올 수 없어요</b>)가 뜨면 <b>차곳간에 문의</b>해 주세요. 쓰던 기기에서 로그아웃하면 자리가 나고, 그때 [다시 시도]를 누르면 들어와요.</li>",
              "<li>«<b>로그인할 수 없어요</b>»가 뜨면 대표는 그 화면에서 안 쓰는 기기를 <b>내보내고</b> 들어와요. 직원은 대표에게 문의해요. 지금 로그인(휴대폰 번호 · 비밀번호)은 기기 수를 서버가 지켜서 이 화면이 거의 안 떠요.</li>"),
             ("양식이나 카모두에서 받은 딜러 명부(엑셀)를 그대로 올려 바로 거래처로 넣어요.", "양식이나 카모두에서 받은 상사명부 · 딜러명부(엑셀)를 그대로 올려 바로 거래처로 넣어요."),
             ("화면이 새 모양으로 바뀌었어요. 출고 기록 · 목적지는", "화면이 새 모양으로 바뀌었어요. 배달 기록 · 목적지는")]:
    if a not in s: raise SystemExit("말 맞추기 못 찾음: " + a)
    s = s.replace(a, b)
s, nOut = re.subn(r"(?<![입·])출고 기록", "배달 기록", s)
print("출고 기록 → 배달 기록", nOut)

open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s))
