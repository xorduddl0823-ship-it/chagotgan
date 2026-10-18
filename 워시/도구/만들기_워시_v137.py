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
SRC = os.path.join(BASE, "1_차곳간_워시_index_v136_1.html"); OUT = os.path.join(BASE, "1_차곳간_워시_index_v137.html")
P = os.path.join(ROOT, "체크", "부품")
def rd(n): return open(os.path.join(P, n), encoding="utf-8").read()
CPT13, ATA = rd("거래처_부품_1.3.js"), rd("알림톡문구_부품_1.0.js")
s = open(SRC, encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('var APP_VER="워시 v136.1 · UI 3.0 · 2026-10-18";', 'var APP_VER="워시 v137 · UI 3.0 · 2026-10-18";')

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

open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s))
