"""체크 v50 → v51 (총괄 10/18: 실제 주소 바꿔치기는 v51로)
  ① 공통 부품 cgg-j4 1.9 → 1.10 (디자인 d18ec73 — 머리말 «차» 글자 → 차곳간 대표 CI · CGG.favicon() 브라우저 탭 아이콘)
  ② 워시 방 엑셀(CSV) 한꺼번에 올리기 부품 csvup 1.0 (체크/부품/엑셀올리기_부품_1.0 · 보안 sb16 통과) — 설정 › 거래처 아래 «엑셀로 한꺼번에 올리기»
     카모두 칸 맞추기(csvup 1.1 · 워시 v134)는 아직 main 에 안 와서 이번 판에는 없음
  ③ 검사비 바로잡기(대표님 10/18): 단가 저장 때 코드가 비면 이름을 코드로 · 단가표 «가온 규칙으로 맞추기»(~5/31 25,000·35,000 / 6/1~ 30,000·40,000)
     · 코드 빈 항목 경고와 «이름으로 채우기» — 재검 · 가성능 0원 · 수출 가성능 손 입력 · 이름으로도 찾기는 서버 방 요청
v50(보안 통과 aebedf0 · b504ac4aec02)은 읽기만. 기능은 v50 과 같아요.
"""
BASE = "/home/user/chagotgan/"
s = open(BASE + "체크/2_차곳간_체크_index_v50.html", encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

# ① 1.9 → 1.10
rep(open(BASE + "디자인/공통/cgg-j4-1.9.css", encoding="utf-8").read(), open(BASE + "디자인/공통/cgg-j4-1.10.css", encoding="utf-8").read())
rep(open(BASE + "디자인/공통/cgg-j4-1.9.js", encoding="utf-8").read(), open(BASE + "디자인/공통/cgg-j4-1.10.js", encoding="utf-8").read())

# 판 번호
rep('ver:"체크 v50", date:"10/18"', 'ver:"체크 v51", date:"10/18"')
rep('$("hdVer").textContent="체크 v50 · "', '$("hdVer").textContent="체크 v51 · "')
rep('<!-- 체크 v50 · 화면 통합 (공통 부품 cgg-j4 1.9) · 2026-10-18 · 만든 도구: 체크/도구/만들기_체크_v50.py -->',
    '<!-- 체크 v51 · 화면 통합 (공통 부품 cgg-j4 1.10 · 엑셀 올리기 csvup 1.0) · 2026-10-18 · 만든 도구: 체크/도구/만들기_체크_v50.py → 만들기_체크_v51.py -->')

# ② 엑셀 올리기 부품 (글자 그대로) + 체크 이음 — 맨 끝 공통 부품 부르기 바로 앞
CSVJS = open(BASE + "체크/부품/엑셀올리기_부품_1.0.js", encoding="utf-8").read()
CSVCSS = open(BASE + "체크/부품/엑셀올리기_부품_1.0.css", encoding="utf-8").read()
TPL = open(BASE + "워시/올리기용/양식_거래처.csv", encoding="utf-8").read().lstrip("﻿").replace("\r\n", "\n").rstrip("\n")
assert "<" not in TPL and "\\" not in TPL and '"' not in TPL
GLUE = '''<style id="csvup-css">
''' + CSVCSS + '''
</style>
<script>
/* 차곳간 엑셀(CSV) 한꺼번에 올리기 부품 csvup 1.0 — 체크/부품/엑셀올리기_부품_1.0.js 글자 그대로 */
''' + CSVJS + '''
</script>
<script>
/* ═══ v51 — 설정 › 거래처 «엑셀로 한꺼번에 올리기» (워시와 같은 부품 · 같은 양식) + 브라우저 탭 아이콘 ═══ */
(function(){
try{ if(window.CGG&&CGG.favicon) CGG.favicon(); }catch(e){}
var TPL_P=''' + repr(TPL.replace("\n", "\r\n")).replace("'", '"') + ''';
function key(s){ return String(s==null?"":s).replace(/\\s+/g,"").toLowerCase(); }
var a=AFTER.partner;
AFTER.partner=function(){
  if(a) a.apply(this,arguments);
  if(!isOwner()||!window.CGG_CSVUP||$("chkCsv")) return;
  var host=$("ptBox"); if(!host||COMPS===null) return;
  var card=document.createElement("div"); card.className="card"; card.id="chkCsvCard";
  card.innerHTML='<h3>엑셀로 한꺼번에 올리기</h3><p class="csub">양식에 상사 · 딜러를 적어 올리면 한 번에 들어가요. 이미 있는 사람은 건너뛰어요.</p>'+
    '<div class="tools"><button type="button" class="btn" id="chkCsvTpl">엑셀 양식 받기</button><button type="button" class="btn primary" id="chkCsv">엑셀로 한꺼번에 올리기</button></div>';
  var c0=host.closest(".card"); if(c0&&c0.parentNode) c0.parentNode.insertBefore(card, c0.nextSibling);
  $("chkCsvTpl").onclick=function(){ CGG_CSVUP.download("양식_거래처.csv", TPL_P); };
  $("chkCsv").onclick=function(){
    var CM={}; ptCompanies().forEach(function(c){ CM[key(c.name)]=String(c.id); });
    CGG_CSVUP.partners({owner:isOwner(), tplText:TPL_P, dealers:ptDealers(), companies:ptCompanies(), later:!!PCAPS.later,
      api:{ saveCompany:function(c){ return ptSaveCompany({name:c.name, no:c.no||"", ceo:c.ceo||"", email:c.email||""}).then(function(r){ if(r&&r.id) CM[key(c.name)]=String(r.id); return r; }); },
            saveDealer:function(d){ return ptSaveDealer({name:d.name, tel:d.tel||"", compId:CM[key(d.comp)]||"", tax:d.tax, biz:d.biz||{}}, true); } },
      done:function(m){ bar(m,"ok",true); DEALERS=[]; refresh(["set","bill"]); },
      fail:function(e){ return niceMsg(e&&e.message); }});
  };
};
})();
</script>
'''
rep('''<script>
/* ===== 체크 v24 — 공통 부품 부르기 ===== */''', GLUE + '''<script>
/* ===== 체크 v24 — 공통 부품 부르기 ===== */''')

# ③ 검사비 바로잡기 (대표님 «금액이 안 맞아요») — 단가 코드가 비면 이름을 코드로 · 가온 규칙 단가 맞추기
rep("""        items.push({code:c, name:n, price:p}); }""", """        items.push({code:c||n, name:n, price:p}); }   /* v51: 서버는 코드(= 접수리스트 상품명)로만 찾아요 — 비면 이름을 코드로 */""")
rep("모르면 비워 두고 이름으로 맞춰요.", "비워 두면 이름을 코드로 써요(이름 = 접수리스트 «상품명», 예: 국산차).")
rep('''<script>
/* ===== 체크 v24 — 공통 부품 부르기 ===== */''', open(BASE + "체크/도구/v51_단가.js", encoding="utf-8").read() + '''
<script>
/* ===== 체크 v24 — 공통 부품 부르기 ===== */''')

open(BASE + "체크/2_차곳간_체크_index_v51.html", "w", encoding="utf-8").write(s)
print("만듦: 체크/2_차곳간_체크_index_v51.html", len(s))
