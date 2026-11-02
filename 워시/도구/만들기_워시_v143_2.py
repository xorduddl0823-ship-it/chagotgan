"""워시 v143.1 → v143.2. 총괄 11/2 급함(운영 실사용): 모양 말고 두 가지만
쓰는 법: python3 워시/도구/만들기_워시_v143_2.py  (v143.1 판 위에 덧붙임 — v143.1 은 덮어쓰지 않아요)
  ① «저장 못 한 기록» 빨간 띠: [닫기] (닫아도 기록은 이 화면에 남고, 머리말 «저장 안 됨»을 누르면 다시 열려요) ·
     [자세히] — 어떤 기록(입고 · 설정 · 보낸 기록 …)이 왜 안 됐는지 · [다시 하기](같은 기록 번호 · 답 못 받은 건 같은 rid) · [버리기](확인 뒤 서버 자료로 다시 불러옴)
     띠의 대기 기록은 열린 화면의 기억(WSAVE.fail)에만 있어요 — 서버 · 폰 저장소에는 없음(앱을 끄면 사라짐).
  ② 거래처 엑셀 넣기: 한 줄씩(줄마다 서버 한 번 + 화면 다시 그리기) → 300줄씩 묶어서(apiSetMany · 서버 sb29 그대로 · 같은 id 덮어쓰기)
     «이미 있음» 건너뛰기 · 상사 먼저 → 딜러 차례 · 못 넣은 줄 표는 그대로. 묶음 하나가 안 되면 그 묶음 줄만 «못 넣은 줄»로.
  돈 셈 · 로그인 · rid · «확인 중» 처리 그대로.
운영 v111 · 시험판 v125 · v126 ~ v143.1 · v144(시안) 은 덮어쓰지 않는다.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v143.1.html"); OUT = os.path.join(BASE, "1_차곳간_워시_index_v143.2.html")
s = open(SRC, encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('var APP_VER="워시 v143.1 · UI 3.0 · 2026-10-19";', 'var APP_VER="워시 v143.2 · UI 3.0 · 2026-11-02";')

# ① 띠: 닫기 · 자세히 · 버리기
rep('''var WSAVE={fail:{},busy:false};''', '''var WSAVE={fail:{},busy:false,hide:false};
/* v143.2 기록 종류 이름 (띠 «자세히») */
var WSAVE_COL={intakes:"입고 · 출고 기록",outbox:"보낸 기록(알림)",settings:"설정",dealers:"딜러",companies:"상사",bills:"청구서",
  memos:"메모",staff:"직원",materials:"자재",matlogs:"자재 기록",trash:"휴지통",taxdocs:"세금계산서",vendors:"매입 거래처"};
function wSaveWhat(x){var n=WSAVE_COL[x.name]||x.name,o=x.obj||{};
  var t=o.plate||o.name||o.dealer||o.title||o.to||"";
  return n+(x.op==="del"?" 지우기":"")+(t?" · "+String(t).slice(0,20):"");}''')
rep('''  if(!keys.length){ if(b)b.remove(); try{setDbState(true);}catch(e){} return; }
  try{setDbState(false,"저장하지 못한 기록 "+keys.length+"건");}catch(e){}''',
'''  if(!keys.length){ if(b)b.remove(); WSAVE.hide=false; try{setDbState(true);}catch(e){} return; }
  try{setDbState(false,"저장하지 못한 기록 "+keys.length+"건");}catch(e){}
  if(WSAVE.hide){ if(b)b.hidden=true; return; }   /* v143.2 닫아도 기록은 남아요 — 머리말 «저장 안 됨»을 누르면 다시 열려요 */''')
rep('''  var f=WSAVE.fail[keys[0]];
  b.title=f.why||"";
  b.innerHTML='<b>저장 못 한 기록 '+keys.length+'건</b> — 인터넷을 확인하고 [다시 하기]를 눌러 주세요. '+
    '<button type="button" class="btn primary" id="wSaveRetry" style="margin-left:6px"'+(WSAVE.busy?' disabled':'')+'>'+(WSAVE.busy?'다시 저장하는 중…':'다시 하기')+'</button>';''',
'''  var f=WSAVE.fail[keys[0]];
  b.hidden=false; b.title=f.why||"";
  b.innerHTML='<div class="wsv-top"><b>저장 못 한 기록 '+keys.length+'건</b> — 인터넷을 확인하고 [다시 하기]를 눌러 주세요.'+
    '<button type="button" class="wsv-x" id="wSaveClose" aria-label="띠 닫기">닫기 ✕</button></div>'+
    '<div class="wsv-btns"><button type="button" class="btn primary" id="wSaveRetry"'+(WSAVE.busy?' disabled':'')+'>'+(WSAVE.busy?'다시 저장하는 중…':'다시 하기')+'</button>'+
    '<button type="button" class="btn" id="wSaveMore"'+(WSAVE.busy?' disabled':'')+'>자세히</button>'+
    '<button type="button" class="btn" id="wSaveDrop"'+(WSAVE.busy?' disabled':'')+'>버리기</button></div>'+
    '<div class="wsv-list" id="wSaveList" hidden>'+keys.slice(0,20).map(function(k){var x=WSAVE.fail[k];
      return '<div><b>'+esc(wSaveWhat(x))+'</b><small>'+esc(x.why||"까닭을 받지 못했어요")+(x.at?" · "+esc(hhmm(x.at)):"")+'</small></div>';}).join("")+
      (keys.length>20?'<div><small>외 '+(keys.length-20)+'건</small></div>':'')+'</div>';
  $("wSaveClose").onclick=function(){WSAVE.hide=true;b.hidden=true;toast("띠를 닫았어요. 기록은 남아 있어요 — 위 «저장 안 됨»을 누르면 다시 열려요");};
  $("wSaveMore").onclick=function(){var l=$("wSaveList");if(l)l.hidden=!l.hidden;};
  $("wSaveDrop").onclick=function(){
    ask("저장 못 한 기록 "+keys.length+"건을 버릴까요?\\n\\n화면을 서버에 있는 자료로 다시 불러와요. 버린 기록은 되살릴 수 없어요.",function(){
      WSAVE.fail={};WSAVE.hide=false;WSAVE.inIdem=null;wSaveBar();
      Promise.resolve(GS.load?GS.load(true):null).then(function(){try{renderAll();}catch(e){}toast("버렸어요. 서버 자료로 다시 불러왔어요");},
        function(){toast("다시 불러오지 못했어요 — 새로고침해 주세요",true);});
    },"버리기",true);};''')
rep('''  WSAVE.fail[name+"/"+id]={name:name,id:id,op:op,obj:obj,why:errMsg(e)};''',
    '''  WSAVE.fail[name+"/"+id]={name:name,id:id,op:op,obj:obj,why:errMsg(e),at:Date.now()};''')
# 머리말 «저장 안 됨»을 누르면 닫은 띠를 다시 열어요
rep('''    else{banner("저장이 안 되는 이유: "+(el._why||"확인 필요")+" — 화면을 새로 열거나, 권한 창이 뜨면 허용해 주세요.");toast(el._why||"저장 연결 안 됨",true);}''',
'''    else if(typeof WSAVE!=="undefined"&&Object.keys(WSAVE.fail).length){WSAVE.hide=false;wSaveBar();var wb=$("wSaveBar");if(wb)wb.scrollIntoView({block:"nearest"});}   /* v143.2 닫은 띠 다시 열기 */
    else{banner("저장이 안 되는 이유: "+(el._why||"확인 필요")+" — 화면을 새로 열거나, 권한 창이 뜨면 허용해 주세요.");toast(el._why||"저장 연결 안 됨",true);}''')
rep('''.dashhead h2 em,.jsay em{font-style:normal;color:inherit}''', '''.dashhead h2 em,.jsay em{font-style:normal;color:inherit}
/* v143.2 저장 못 한 기록 띠 — 닫기 · 자세히 · 버리기 */
#wSaveBar .wsv-top{display:flex;align-items:flex-start;gap:8px}
#wSaveBar .wsv-top>b{flex:none}
#wSaveBar .wsv-x{margin-left:auto;flex:none;background:none;border:0;color:inherit;font:inherit;font-weight:800;cursor:pointer;padding:2px 4px;min-height:32px}
#wSaveBar .wsv-btns{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
#wSaveBar .wsv-list{margin-top:8px;display:flex;flex-direction:column;gap:6px}
#wSaveBar .wsv-list small{display:block;font-weight:500}''')

# ② 거래처 엑셀: 300줄씩 묶어 저장 (api.saveBatch 가 있으면)
rep('''  function savePartners(o, r, prog){
    var cs=Object.keys(r.comps).map(function(k){ return r.comps[k]; }),''',
'''  /* v143.2 묶어 넣기 — 300줄씩 서버 한 번(같은 id 덮어쓰기). 묶음이 안 되면 그 묶음 줄만 «못 넣은 줄» */
  function batchSave(list, mk, kind, fail, prog){
    var N=list.length, done=0, ok=0, fails=[], CH=300, chunks=[];
    for(var i=0;i<N;i+=CH) chunks.push(list.slice(i,i+CH));
    return chunks.reduce(function(p,ch){ return p.then(function(){
      var rows=ch.map(mk);
      return Promise.resolve(o0.api.saveBatch(kind, rows)).then(function(){ ok+=ch.length; },
        function(){ ch.forEach(function(x){ x.failWhy=x.failWhy||fail; fails.push(x); }); })
        .then(function(){ done+=ch.length; prog && prog(done); }); }); }, Promise.resolve())
      .then(function(){ return {n:ok, fails:fails}; }); }
  var o0=null;
  function savePartnersBatch(o, r, prog){
    o0=o;
    var cs=Object.keys(r.comps).map(function(k){ return r.comps[k]; }),
        ds=r.list.filter(function(x){ return x.st==="new" && x.d; }), total=cs.length+ds.length, bad={};
    return batchSave(cs, function(c){ return {name:c.name, no:c.no, ceo:c.ceo, email:c.email, tel:c.tel, addr:c.addr}; }, "company", "상사를 만들지 못했어요.",
        function(n){ prog && prog(n, total); })
      .then(function(rc){
        rc.fails.forEach(function(c){ bad[key(c.name)]=1; });
        var ds2=ds.filter(function(x){ if(bad[key(x.d.comp)]){ x.failWhy="소속 상사를 만들지 못해 딜러도 넣지 않았어요."; return false; } return true; });
        var skipped=ds.filter(function(x){ return ds2.indexOf(x)<0; });
        return batchSave(ds2, function(x){ return x.d; }, "dealer", "저장하지 못했어요. 다시 올려 주세요.",
            function(n){ prog && prog(cs.length+n+skipped.length, total); })
          .then(function(rd){
            var oc=r.list.filter(function(x){ return x.st==="new" && !x.d; }), cf=[];
            oc.forEach(function(x){ if(bad[key(x.c.comp)]) cf.push({line:x.line, c:x.c, why:"상사를 만들지 못했어요. 다시 올려 주세요."}); });
            var df=rd.fails.concat(skipped).map(function(x){ return {line:x.line, c:x.c, why:x.failWhy||"저장하지 못했어요. 다시 올려 주세요."}; });
            return {n:rd.n+oc.length-cf.length, fails:cf.concat(df).sort(function(a,b){ return a.line-b.line; })}; });
      }); }
  function savePartners(o, r, prog){
    if(o.api && o.api.saveBatch) return savePartnersBatch(o, r, prog);   /* v143.2 */
    var cs=Object.keys(r.comps).map(function(k){ return r.comps[k]; }),''')
rep('''        api:{saveCompany:function(c){return wPtSaveCompany(c);},saveDealer:function(d){return wPtSaveDealer(d,true);}},''',
'''        api:{saveCompany:function(c){return wPtSaveCompany(c);},saveDealer:function(d){return wPtSaveDealer(d,true);},
          saveBatch:function(kind,rows){return wPtSaveBatch(kind,rows);}},   /* v143.2 300줄씩 묶어서 */''')
# 상사 · 딜러 자료 만들기(저장 없이)와 묶어 저장
rep('''function wPtSaveCompany(c){''', '''/* v143.2 엑셀 넣기 — 새 상사 · 새 딜러 자료를 만들어 한 번에 저장(apiSetMany · saveMany 가 화면 캐시도 한 번에) */
function wPtSaveBatch(kind,rows){
  var docs=rows.map(function(x){return kind==="company"?wPtCompObj(x):wPtDealerObj(x);});
  if(!S.db){return Promise.resolve();}
  return saveMany(docs.map(function(o){return {col:kind==="company"?"companies":"dealers",id:o.id,data:o};}),{quiet:true}).then(function(){
    if(kind==="company"){var ids={};docs.forEach(function(o){ids[o.id]=1;});S.comps=S.comps.filter(function(x){return !ids[x.id];}).concat(docs);}
    else{var di={};docs.forEach(function(o){di[o.id]=1;});S.dealers=S.dealers.filter(function(x){return !di[x.id];}).concat(docs);}
  });
}
function wPtCompObj(c){   /* 새 상사(엑셀) — wPtSaveCompany 의 새 상사와 같은 칸 */
  var o={id:"c_"+Date.now()+"_"+Math.random().toString(36).slice(2,8),taxType:TAXTYPES[0]};
  o.name=String(c.name||"").trim();o.bizName=o.name;
  if(c.no!=null)o.bizNo=c.no?fmtBizNo(c.no):"";
  if(c.ceo!=null)o.ceo=c.ceo;
  if(c.tel!=null)o.mainPhone=c.tel?ccwPhoneFmt(c.tel):"";
  ["addr","email","upte","jongmok"].forEach(function(k){if(c[k]!=null)o[k]=c[k];});
  o.updatedAt=nowIso();return o;
}
function wPtDealerObj(nd){   /* 새 딜러(엑셀) — wPtSaveDealer(nd,true) 와 같은 칸 */
  var o={id:"d_"+Date.now()+"_"+Math.random().toString(36).slice(2,8)};
  o.name=nd.name;o.phone=nd.tel?ccwPhoneFmt(nd.tel):"";o.company=nd.comp||"";
  if(nd.tax==="none"){o.taxType=TAXTYPES[1];o.type="staff";}
  else{o.taxType=TAXTYPES[0];o.type=(nd.tax==="own")?"biz":"staff";}
  if(nd.tax==="own"&&nd.biz){var b=nd.biz;o.bizName=b.name||"";o.bizNo=b.no?fmtBizNo(b.no):"";o.ceo=b.ceo||"";
    ["addr","email","upte","jongmok"].forEach(function(k){if(b[k]!=null)o[k]=b[k];});}
  o.updatedAt=nowIso();return o;
}
function wPtSaveCompany(c){''')
# saveMany 에 quiet(엑셀 넣기는 못 넣은 줄 표로 알리니 빨간 띠에는 안 올림)
rep('''function saveMany(rows){''', '''function saveMany(rows,opt){''')
rep('''      wSaveFail(r.col,r.id,"set",r.data,e);});''', '''      if(!(opt&&opt.quiet))wSaveFail(r.col,r.id,"set",r.data,e);});''')
open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s))
