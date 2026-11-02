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
'''  /* v143.2 묶어 넣기 — 상사와 그 상사 딜러를 한 묶음(서버 한 번 = 한꺼번에 저장)으로 300줄씩.
     묶음 하나가 다 들어가거나 하나도 안 들어가요(창을 닫아도 «상사만 있고 딜러는 없음» 같은 반쪽이 없게). [멈추기] = 지금 묶음까지 */
  function savePartnersBatch(o, r, prog, ctl){
    var cs=Object.keys(r.comps).map(function(k){ return r.comps[k]; }),
        ds=r.list.filter(function(x){ return x.st==="new" && x.d; }), total=cs.length+ds.length;
    var G={}, order=[];
    function g(k){ if(!G[k]){ G[k]={c:null,d:[]}; order.push(k); } return G[k]; }
    cs.forEach(function(c){ g(key(c.name)).c=c; });
    ds.forEach(function(x){ g(key(x.d.comp)).d.push(x); });
    var chunks=[], cur=[];
    order.forEach(function(k){ var it=[], gg=G[k];
      if(gg.c) it.push({kind:"company", row:{name:gg.c.name, no:gg.c.no, ceo:gg.c.ceo, email:gg.c.email, tel:gg.c.tel, addr:gg.c.addr}, src:gg.c});
      gg.d.forEach(function(x){ it.push({kind:"dealer", row:x.d, src:x}); });
      if(cur.length && cur.length+it.length>300){ chunks.push(cur); cur=[]; }
      while(it.length>300){ chunks.push(it.splice(0,300)); }
      cur=cur.concat(it); });
    if(cur.length) chunks.push(cur);
    var done=0, okD=0, fails=[], saved={}, left=0, stopped=false;
    return chunks.reduce(function(p,ch){ return p.then(function(){
      if(ctl && ctl.stop){ stopped=true; ch.forEach(function(it){ if(it.kind==="dealer") left++; }); return; }
      return Promise.resolve(o.api.saveBatch(ch.map(function(it){ return {kind:it.kind, row:it.row}; }))).then(function(){
          ch.forEach(function(it){ if(it.kind==="dealer") okD++; else saved[key(it.src.name)]=1; }); },
        function(e){ var why=(o.fail?o.fail(e):"")||"저장하지 못했어요. 다시 올려 주세요.";
          ch.forEach(function(it){ if(it.kind==="dealer") fails.push({line:it.src.line, c:it.src.c, why:why}); }); })
        .then(function(){ done+=ch.length; prog && prog(done, total); }); }); }, Promise.resolve())
      .then(function(){
        var oc=r.list.filter(function(x){ return x.st==="new" && !x.d; }), ocOk=0;
        oc.forEach(function(x){ if(saved[key(x.c.comp)]) ocOk++; else if(stopped && !fails.some(function(f){ return key((f.c||{}).comp)===key(x.c.comp); })) left++;
          else fails.push({line:x.line, c:x.c, why:"상사를 만들지 못했어요. 다시 올려 주세요."}); });
        return {n:okD+ocOk, fails:fails.sort(function(a,b){ return a.line-b.line; }), stopped:stopped, left:left}; });
  }
  function savePartners(o, r, prog, ctl){
    if(o.api && o.api.saveBatch) return savePartnersBatch(o, r, prog, ctl);   /* v143.2 */
    var cs=Object.keys(r.comps).map(function(k){ return r.comps[k]; }),''')
rep('''        api:{saveCompany:function(c){return wPtSaveCompany(c);},saveDealer:function(d){return wPtSaveDealer(d,true);}},''',
'''        api:{saveCompany:function(c){return wPtSaveCompany(c);},saveDealer:function(d){return wPtSaveDealer(d,true);},
          saveBatch:function(items){return wPtSaveBatch(items);}},   /* v143.2 상사+딜러 한 묶음씩 */''')
# 넣는 중 [멈추기] — 지금 묶음까지 넣고 멈춰요(넣은 줄은 남고, 다시 올리면 «이미 있음»)
rep('''      save:function(r, prog){ return savePartners(o, r, prog); },''','''      save:function(r, prog, ctl){ return savePartners(o, r, prog, ctl); },''')
rep('''    Promise.resolve(o.save(r, function(i, t){ if(pg) pg.textContent="넣는 중이에요… "+i+" / "+t; })).then(function(res){
      var fails=(res&&res.fails)||[], ok=(res&&res.n)||0;
      unblk(); closeD();
      o.done && o.done(ok+"줄을 넣었어요."+(fails.length?" "+fails.length+"줄은 못 넣었어요.":""));''','''    var ctl={stop:false}, sbn=null;   /* v143.2 넣는 중 멈추기 */
    if(o.kind==="partners"){ sbn=document.createElement("button"); sbn.type="button"; sbn.className="cgg-btn"; sbn.textContent="멈추기";
      sbn.style.marginTop="8px"; sbn.onclick=function(){ ctl.stop=true; sbn.disabled=true; sbn.textContent="지금 묶음까지 넣고 멈춰요…"; };
      pg.parentNode.insertBefore(sbn, pg.nextSibling); }
    Promise.resolve(o.save(r, function(i, t){ if(pg) pg.textContent="넣는 중이에요… "+i+" / "+t; }, ctl)).then(function(res){
      var fails=(res&&res.fails)||[], ok=(res&&res.n)||0;
      unblk(); if(sbn) sbn.remove(); closeD();
      if(res&&res.stopped) o.done && o.done(ok+"줄을 넣고 멈췄어요. 남은 "+res.left+"줄은 같은 파일을 다시 올리면 이어서 넣어요(넣은 줄은 «이미 있음»으로 건너뛰어요).");
      else o.done && o.done(ok+"줄을 넣었어요."+(fails.length?" "+fails.length+"줄은 못 넣었어요.":""));''')

# 상사 · 딜러 자료 만들기(저장 없이)와 묶어 저장
rep('''function wPtSaveCompany(c){''', '''/* v143.2 엑셀 넣기 — 새 상사 · 새 딜러 자료를 만들어 한 번에 저장(apiSetMany · saveMany 가 화면 캐시도 한 번에) */
function wPtSaveBatch(items){
  var cs=[],ds=[];
  items.forEach(function(it){if(it.kind==="company")cs.push(wPtCompObj(it.row));else ds.push(wPtDealerObj(it.row));});
  var rows=cs.map(function(o){return {col:"companies",id:o.id,data:o};}).concat(ds.map(function(o){return {col:"dealers",id:o.id,data:o};}));
  function keep(){   /* 화면 목록도 바로 (서버 연결이 없는 시연에서도) */
    if(cs.length){var ci={};cs.forEach(function(o){ci[o.id]=1;});S.comps=S.comps.filter(function(x){return !ci[x.id];}).concat(cs);}
    if(ds.length){var di={};ds.forEach(function(o){di[o.id]=1;});S.dealers=S.dealers.filter(function(x){return !di[x.id];}).concat(ds);}}
  if(!S.db){keep();return Promise.resolve();}
  return saveMany(rows,{quiet:true}).then(keep);
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
# ③ 진짜 까닭: 답을 못 받은 것(인터넷)과 서버가 거절한 것을 나눠요 · 서버 글 원문(짧게)은 «자세히»에
rep("""  return map[c]||kmsg(e,"저장하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.");""",
"""  if(map[c])return map[c];
  if(e&&e.unknown&&!/처리 중|확인 중/.test(String(e.message||"")))return "인터넷 연결이 끊겼거나 서버 답을 받지 못했어요. 연결을 확인하고 다시 해 주세요.";   /* v143.2 */
  return kmsg(e,"서버가 저장을 받지 않았어요(인터넷 문제 아님). «자세히»의 서버 글을 차곳간에 알려 주세요.");""")
rep("""  WSAVE.fail[name+"/"+id]={name:name,id:id,op:op,obj:obj,why:errMsg(e),at:Date.now()};""",
    """  WSAVE.fail[name+"/"+id]={name:name,id:id,op:op,obj:obj,why:errMsg(e),raw:String((e&&(e.message||e.error||e.__err))||"").slice(0,120),net:!!(e&&e.unknown),at:Date.now()};""")
rep("""      return '<div><b>'+esc(wSaveWhat(x))+'</b><small>'+esc(x.why||"까닭을 받지 못했어요")+(x.at?" · "+esc(hhmm(x.at)):"")+'</small></div>';}).join("")+""",
    """      return '<div><b>'+esc(wSaveWhat(x))+'</b><small>'+esc(x.why||"까닭을 받지 못했어요")+(x.at?" · "+esc(hhmm(x.at)):"")+'</small>'+
        (x.raw&&x.raw!==x.why?'<small class="wsv-raw">서버 글: '+esc(x.raw)+'</small>':'')+'</div>';}).join("")+""")
rep("""      if(ok===r.length)toast(ok+"건을 저장했어요"); else toast((r.length-ok)+"건은 아직 저장하지 못했어요 — 인터넷 연결을 확인해 주세요",true);""",
    """      var k1=Object.keys(WSAVE.fail)[0],f1=k1?WSAVE.fail[k1]:null;   /* v143.2 진짜 까닭 */
      if(ok===r.length)toast(ok+"건을 저장했어요"); else toast((r.length-ok)+"건은 아직 저장하지 못했어요 — "+((f1&&f1.why)||"«자세히»를 봐 주세요"),true);""")
# 닫은 띠 다시 열기 — 폰은 머리말이 숨으니 아래쪽 작은 단추로
rep("""  if(WSAVE.hide){ if(b)b.hidden=true; return; }   /* v143.2 닫아도 기록은 남아요 — 머리말 «저장 안 됨»을 누르면 다시 열려요 */""",
    """  var chip=$("wSaveChip");
  if(WSAVE.hide){ if(b)b.hidden=true;
    if(!chip){ chip=document.createElement("button"); chip.type="button"; chip.id="wSaveChip"; document.body.appendChild(chip);
      chip.onclick=function(){WSAVE.hide=false;wSaveBar();var wb=$("wSaveBar");if(wb)wb.scrollIntoView({block:"nearest"});}; }
    chip.hidden=false; chip.textContent="저장 못 한 기록 "+keys.length+"건 ▴"; return; }   /* v143.2 닫아도 기록은 남아요 — 아래 단추로 다시 열기 */
  if(chip)chip.hidden=true;""")
rep("""  if(!keys.length){ if(b)b.remove(); WSAVE.hide=false; try{setDbState(true);}catch(e){} return; }""",
    """  if(!keys.length){ if(b)b.remove(); var ch0=$("wSaveChip"); if(ch0)ch0.remove(); WSAVE.hide=false; try{setDbState(true);}catch(e){} return; }""")
rep("""toast("띠를 닫았어요. 기록은 남아 있어요 — 위 «저장 안 됨»을 누르면 다시 열려요");""",
    """wSaveBar();toast("띠를 닫았어요. 기록은 남아 있어요 — 아래 «저장 못 한 기록» 단추로 다시 열어요");""")
rep("""#wSaveBar .wsv-x{margin-left:auto;flex:none;background:none;border:0;color:inherit;font:inherit;font-weight:800;cursor:pointer;padding:2px 4px;min-height:32px}""",
    """#wSaveBar .wsv-x{margin-left:auto;flex:none;background:none;border:0;color:inherit;font:inherit;font-weight:800;cursor:pointer;padding:0 10px;min-height:42px}
#wSaveBar .btn{min-height:42px}
#wSaveBar .wsv-raw{opacity:.8;word-break:break-all}
#wSaveChip{position:fixed;z-index:9000;left:max(12px,env(safe-area-inset-left,0px));bottom:calc(84px + env(safe-area-inset-bottom,0px));min-height:42px;padding:0 16px;border-radius:21px;border:1px solid var(--danger);background:var(--danger-soft);color:var(--danger);font:inherit;font-weight:800;cursor:pointer;box-shadow:var(--shadow)}
@media (min-width:1000px){#wSaveChip{bottom:calc(20px + env(safe-area-inset-bottom,0px))}}""")

# ④ 입고 · 출고 알림 켜기/끄기 — 홈(오늘 할 일 위) · 현장 화면(사진 칸 아래). 대표만 · 확인 창 (체크 «도착 알림» 줄과 같은 모양)
rep("""function autoInOn(){return sendCfg().autoIn!==false;}""", """function autoInOn(){return sendCfg().autoIn!==false;}
/* v143.2 알림 켜기/끄기 줄 */
function wAlarmEl(){
  var c=sendCfg(),own=isOwner(),d=document.createElement("div");d.className="card wal";
  function row(k,nm,desc){var on=c[k]!==false;
    return '<div class="wal-row'+(on?'':' off')+'"><span class="wal-ic" aria-hidden="true">'+((window.CGG&&CGG.ic)?CGG.ic("bell"):"")+'</span>'+
      '<span class="wal-tx"><b>'+nm+'</b><small>'+(on?desc:'꺼져 있어요 — 알림이 안 나가요')+'</small></span>'+
      '<span class="wal-st">'+(on?'켜짐':'꺼짐')+'</span>'+
      '<button type="button" class="wal-sw" role="switch" aria-checked="'+on+'" data-wal="'+k+'" aria-label="'+nm+'"'+(own?'':' disabled')+'><i></i></button></div>';}
  d.innerHTML=row("autoIn","입고 알림","차가 들어오면 딜러에게 알림톡이 나가요")+row("autoOut","출고 알림","출고하면 딜러에게 알림톡이 나가요")+
    (own?'':'<div class="wal-lock">대표만 바꿀 수 있어요</div>');
  Array.prototype.forEach.call(d.querySelectorAll("[data-wal]"),function(b){b.onclick=function(){
    if(!isOwner())return toast("대표만 바꿀 수 있어요",true);
    var k=b.getAttribute("data-wal"),on=sendCfg()[k]!==false,nm=k==="autoIn"?"입고 알림":"출고 알림";
    ask(on?(nm+"을 끌까요?\\n\\n끄는 동안 차가 "+(k==="autoIn"?"들어와도":"출고돼도")+" 딜러에게 알림이 안 나가요."):(nm+"을 다시 켤까요?\\n\\n"+(k==="autoIn"?"차가 들어오면":"출고하면")+" 딜러에게 알림톡이 나가요."),function(){
      var o=Object.assign({},sendCfg());o[k]=!on;S.cfg=Object.assign({},S.cfg);S.cfg.send=o;
      saveCfg({what:nm+(on?" 끄기":" 켜기")}).then(function(){toast(nm+(on?"을 껐어요":"을 켰어요"));},function(e){toast(errMsg(e),true);})
        .then(function(){try{renderAll();}catch(e){}});
    },on?"끄기":"켜기",on);};});
  return d;
}
function wAlarmMount(parent,before){if(!parent)return;var old=parent.querySelector(":scope > .wal");if(old)old.remove();parent.insertBefore(wAlarmEl(),before||null);}""")
rep("""  /* 정산(이번 달 입금)은 매니저에게 보이지 않아요 */
  if(mgr){var mc=host.querySelector(".cgg-homeside .cgg-side");if(mc)mc.remove();}""",
    """  /* 정산(이번 달 입금)은 매니저에게 보이지 않아요 */
  if(mgr){var mc=host.querySelector(".cgg-homeside .cgg-side");if(mc)mc.remove();}
  /* v143.2 알림 켜기/끄기 — «오늘 할 일» 바로 위 */
  try{var tdh=Array.prototype.filter.call(host.querySelectorAll(".cgg-sech"),function(x){return /오늘 할 일/.test(x.textContent);})[0];
    if(tdh&&tdh.parentNode)wAlarmMount(tdh.parentNode.parentNode,tdh.parentNode);}catch(e){}""")
rep("""function renderFHome(){""", """function renderFHome(){
  try{var fsec=$("vFHome"),fn=fsec&&fsec.querySelector(".fhnums");if(fn)wAlarmMount(fsec,fn);}catch(e){}   /* v143.2 알림 켜기/끄기 */""")
rep("""#wSaveBar .wsv-btns{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}""", """#wSaveBar .wsv-btns{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
/* v143.2 알림 켜기/끄기 줄 (체크 «도착 알림»과 같은 모양) */
.wal{padding:6px 16px;margin:0 0 16px}
.wal-row{display:flex;align-items:center;gap:12px;padding:10px 0}
.wal-row+.wal-row{border-top:1px solid var(--line)}
.wal-row.off{background:var(--danger-soft);margin:0 -10px;padding:10px;border-radius:12px}
.wal-ic{display:inline-flex;color:var(--muted)}.wal-ic svg{width:20px;height:20px}
.wal-tx{flex:1;min-width:0}.wal-tx b{display:block;font-size:15px}.wal-tx small{color:var(--muted);font-size:13px}
.wal-row.off .wal-tx small{color:var(--danger);font-weight:700}
.wal-st{font-size:13px;font-weight:700;color:var(--muted)}
.wal-sw{position:relative;flex:none;width:56px;height:42px;background:none;border:0;padding:0;cursor:pointer}
.wal-sw i{position:absolute;left:2px;top:6px;width:52px;height:30px;border-radius:15px;background:var(--line);transition:background .15s}
.wal-sw i::after{content:"";position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:var(--card);box-shadow:0 1px 3px rgba(0,0,0,.25);transition:left .15s}
.wal-sw[aria-checked="true"] i{background:var(--done)}.wal-sw[aria-checked="true"] i::after{left:25px}
.wal-sw:disabled{opacity:.5;cursor:not-allowed}
.wal-sw:focus-visible{outline:2px solid var(--brand);outline-offset:2px;border-radius:15px}
.wal-lock{font-size:12.5px;color:var(--muted);padding:0 0 8px}
@media (prefers-reduced-motion:reduce){.wal-sw i,.wal-sw i::after{transition:none}}""")

open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s))
