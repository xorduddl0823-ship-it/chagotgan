"""워시 v132 → v133. 대표님 10/18: 브라더광택이 직접 자료를 올리게 «엑셀(CSV) 한꺼번에 올리기»
쓰는 법: python3 워시/도구/만들기_워시_v133.py  (v132 판 위에 덧붙임 — v132 는 덮어쓰지 않아요)
  1) 설정 › 거래처: «엑셀 양식 받기» + «엑셀로 한꺼번에 올리기» (대표만 · 이미 있는 사람은 건너뜀 · 처음 보는 상사는 같이 만듦)
  2) 배달 › 목적지: 같은 방식 (장소 이름 · 주소 · 연락처 · 메모) — 메모 칸을 목록에도 보이게
  3) 부품 = 체크/부품/엑셀올리기_부품_1.0.js · .css (체크도 같은 부품) — 서버 창구는 새로 안 씀(거래처 · 목적지 저장을 그대로 부름)
  4) 양식 파일 = 워시/올리기용/양식_거래처.csv · 양식_배달장소.csv (화면의 «양식 받기»도 이 파일 글자 그대로)
운영 v111 · 시험판 v125 · v126 ~ v132 는 덮어쓰지 않는다.
"""
import os, json
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE); ROOT = os.path.dirname(BASE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v132.html"); OUT = os.path.join(BASE, "1_차곳간_워시_index_v133.html")
P = os.path.join(ROOT, "체크", "부품")
PJS = open(os.path.join(P, "거래처_부품.js"), encoding="utf-8").read()
PCSS = open(os.path.join(P, "거래처_부품.css"), encoding="utf-8").read()
UJS = open(os.path.join(P, "엑셀올리기_부품_1.0.js"), encoding="utf-8").read()
UCSS = open(os.path.join(P, "엑셀올리기_부품_1.0.css"), encoding="utf-8").read()
def tpl(n): return open(os.path.join(BASE, "올리기용", n), encoding="utf-8-sig", newline="").read()
TP, TD = tpl("양식_거래처.csv"), tpl("양식_배달장소.csv")
s = open(SRC, encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('var APP_VER="워시 v132 · UI 3.0 · 2026-10-18";', 'var APP_VER="워시 v133 · UI 3.0 · 2026-10-18";')

# 0) 부품 넣기 — 거래처 부품 바로 뒤
rep(PJS, PJS + "\n" + UJS)
rep(PCSS, PCSS + "\n" + UCSS)

# 1) 거래처 화면 — 딜러 명부 칸 위에 «엑셀로 한꺼번에 올리기» 칸 (대표만)
rep('''  host.innerHTML='<div class="card" style="padding:16px"><div id="wPt"></div></div>'+
''', '''  host.innerHTML='<div class="card" style="padding:16px"><div id="wPt"></div></div>'+
    (isOwner()?'<div class="card wpt-roster"><div><b>엑셀로 한꺼번에 올리기</b><div class="hint" style="margin-top:2px">양식에 상사 · 딜러를 적어 올리면 한 번에 들어가요. 이미 있는 사람은 건너뛰어요.</div></div>'+
    '<div class="wcsv-btns"><button type="button" class="cgg-btn" id="wPtCsvTpl">엑셀 양식 받기</button><button type="button" class="cgg-btn pri" id="wPtCsv">엑셀로 한꺼번에 올리기</button></div></div>':'')+
''')
rep('''  $("wPtRoster").onclick=function(){P.sub="roster";renderParties();window.scrollTo(0,0);};
''', '''  $("wPtRoster").onclick=function(){P.sub="roster";renderParties();window.scrollTo(0,0);};
  if($("wPtCsv")){
    $("wPtCsvTpl").onclick=function(){CGG_CSVUP.download("양식_거래처.csv",W133_TPL_P);};
    $("wPtCsv").onclick=function(){
      CGG_CSVUP.partners({owner:isOwner(),tplText:W133_TPL_P,dealers:wPtDealers(),companies:wPtCompanies(),later:false,
        api:{saveCompany:function(c){return wPtSaveCompany(c);},saveDealer:function(d){return wPtSaveDealer(d,true);}},
        done:function(m){toast(m);renderParties();try{refreshDatalists();}catch(e){}},
        fail:function(e){return errMsg(e);}});
    };
  }
''')
# 양식 글자(올리기용/*.csv 와 같은 글자) — 거래처 이음새 앞에
rep('''var WPT={st:{}};''', '''var WPT={st:{}};
/* v133 엑셀(CSV) 양식 — 워시/올리기용/양식_거래처.csv · 양식_배달장소.csv 글자 그대로(받을 때 BOM 붙음) */
var W133_TPL_P=''' + json.dumps(TP, ensure_ascii=False) + ''';
var W133_TPL_D=''' + json.dumps(TD, ensure_ascii=False) + ''';''')

# 2) 목적지 화면 — 단추 두 개 + 메모 칸
rep('''      <button class="btn" id="btnDestCard" type="button">명함 사진으로 추가</button>
''', '''      <button class="btn" id="btnDestCard" type="button">명함 사진으로 추가</button>
      <button class="btn" id="destCsvTpl" type="button">엑셀 양식 받기</button>
      <button class="btn" id="destCsv" type="button">엑셀로 한꺼번에 올리기</button>
''')
rep('''    row.style.gridTemplateColumns="34px 1.2fr 1fr 1.4fr 40px 40px";''', '''    row.style.gridTemplateColumns="34px 1.2fr 1fr 1.4fr 1fr 40px 40px";''')
rep('''    row.appendChild(n);row.appendChild(ph);row.appendChild(ad);row.appendChild(mp);row.appendChild(x);''', '''    var me=document.createElement("input");me.type="text";me.value=dv.memo||"";me.placeholder="메모";me.maxLength=300;
    me.oninput=function(){editDests[i]=Object.assign({},toObj(editDests[i]),{memo:me.value});};
    row.appendChild(n);row.appendChild(ph);row.appendChild(ad);row.appendChild(me);row.appendChild(mp);row.appendChild(x);''')
rep('''    return {name:(d.name||"").trim(),phone:(d.phone||"").trim(),addr:(d.addr||"").trim(),fav:!!d.fav};''', '''    return {name:(d.name||"").trim(),phone:(d.phone||"").trim(),addr:(d.addr||"").trim(),memo:(d.memo||"").trim(),fav:!!d.fav};''')
rep('''$("btnAddDest").onclick=function(){editDests.push({name:""});renderDests();};''', '''$("btnAddDest").onclick=function(){editDests.push({name:""});renderDests();};
/* v133 엑셀로 한꺼번에 올리기 — 저장된 목록 + 아직 저장 안 한 고친 목록 둘 다 보고 겹침을 걸러요 */
$("destCsvTpl").onclick=function(){CGG_CSVUP.download("양식_배달장소.csv",W133_TPL_D);};
$("destCsv").onclick=function(){
  var cur=destList2().concat((editDests||[]).map(toObj).filter(function(d){return d.name;}));
  CGG_CSVUP.places({owner:isOwner(),tplText:W133_TPL_D,places:cur,
    api:{savePlaces:function(add){
      var list=destList2().concat(add.map(function(d){return {name:d.name,phone:d.phone||"",addr:d.addr||"",memo:d.memo||"",fav:false};}));
      S.cfg=Object.assign({},S.cfg);S.cfg.destinations=list;
      return saveCfg().then(function(){
        if(editDests)editDests=editDests.concat(add.map(function(d){return {name:d.name,phone:d.phone||"",addr:d.addr||"",memo:d.memo||""};}));
      });}},
    done:function(m){toast(m);renderSms();},
    fail:function(e){return errMsg(e);}});
};''')

# 3) 시험 쓰기(체험) 막기 — 거래처 · 목적지와 같은 열쇠
rep('''btnSaveDest:"destinations",dSave:"destinations",''', '''btnSaveDest:"destinations",dSave:"destinations",wPtCsv:"partners",destCsv:"destinations",''')

# 4) CSS — 거래처 화면 두 단추
rep('''.wpt-roster{margin-top:14px;''', '''.wcsv-btns{display:flex;flex-wrap:wrap;gap:8px}
.wcsv-btns .cgg-btn{min-height:43px;height:43px}
@media (max-width:640px){.wcsv-btns{width:100%}.wcsv-btns .cgg-btn{flex:1 1 140px;height:42px;min-height:42px}}
.wpt-roster{margin-top:14px;''')

open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s))
