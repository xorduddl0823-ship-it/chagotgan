"""워시 v141 → v142. 대표님 최우선 지시(10/19 · 운영/긴급/2026-10-19_기록_알림톡_출시마감_요청.md «워시» 줄)
쓰는 법: python3 워시/도구/만들기_워시_v142.py  (v141 판 위에 덧붙임 — v141 은 덮어쓰지 않아요)
  디자인 개편 · 추가 기능 없음. 돈 셈 그대로(전체검사.js 돈 지문 같아야 해요).
  1) 저장 실패는 «저장됨»으로 보이지 않게: gsDB 의 set · delete 는 화면을 먼저 바꾸는데(빠르게 보이려고),
     서버 저장이 실패하면 그 줄을 저장 전으로 되돌리고(화면에서 사라짐) · 머리말 «저장 안 됨» · 빨간 띠에 실패 문구 + [다시 하기]
     [다시 하기] = 실패한 기록을 같은 id 로 다시 보내요(서버는 업체 · 종류 · id 로 덮어써서 두 번 생기지 않아요)
  2) 연속 클릭 · 재시도로 같은 입고가 두 번 생기지 않게: 입고 등록은 저장이 끝날 때까지 같은 내용이면 같은 id(멱등 키)를 다시 써요
     (단추 잠금은 원래 있음 · 출고 · 청구서 · 입금 확인은 이미 있는 기록을 고치는 것이라 같은 id 로 덮어써요)
  2-1) 보내기 멱등 키 sendKey = 보낸 기록 한 줄의 id (같은 줄을 두 번 눌러도 서버가 한 번만 보내게 · 서버 방 몫)
  3) 알림톡 보낸 결과: «알림톡 보냄» · «알림톡이 안 가서 문자로 대신 보냄» · «못 보냄 — 까닭» (보낸 기록 «방식» 칸에도 «문자(대체)»)
운영 v111 · 시험판 v125 · v126 ~ v141 은 덮어쓰지 않는다.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE); ROOT = os.path.dirname(BASE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v141.html"); OUT = os.path.join(BASE, "1_차곳간_워시_index_v142.html")
s = open(SRC, encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('var APP_VER="워시 v141 · UI 3.0 · 2026-10-19";', 'var APP_VER="워시 v142 · UI 3.0 · 2026-10-19";')

# 1) gsDB set · delete — 실패하면 되돌리기 + 실패 띠 + 다시 하기
rep('''          set:function(obj){
            GS.cache[name]=GS.cache[name]||{};GS.cache[name][id]=obj;
            fireSubs(name);                                  // 화면은 바로 갱신 (서버 기다리지 않음)
            return gsCall("apiSet",[name,id,JSON.stringify(obj)]).then(function(r){
              var v=typeof r==="string"?(function(){try{return JSON.parse(r);}catch(e){return null;}})():r;
              if(v&&v.rev)GS.rev=String(v.rev);              // 내가 낸 변경이니 다시 안 불러와요
              return r;});},
          delete:function(){
            if(GS.cache[name])delete GS.cache[name][id];
            fireSubs(name);
            return gsCall("apiDel",[name,id]).then(function(r){
              var v=typeof r==="string"?(function(){try{return JSON.parse(r);}catch(e){return null;}})():r;
              if(v&&v.rev)GS.rev=String(v.rev);
              return r;});},''',
'''          set:function(obj){
            GS.cache[name]=GS.cache[name]||{};
            var had=Object.prototype.hasOwnProperty.call(GS.cache[name],id), prev=GS.cache[name][id];
            GS.cache[name][id]=obj;
            fireSubs(name);                                  // 화면은 바로 갱신 (서버 기다리지 않음)
            return gsCall("apiSet",[name,id,JSON.stringify(obj)]).then(function(r){
              var v=typeof r==="string"?(function(){try{return JSON.parse(r);}catch(e){return null;}})():r;
              if(v&&v.rev)GS.rev=String(v.rev);              // 내가 낸 변경이니 다시 안 불러와요
              wSaveOk(name,id);
              return r;},function(e){
              /* v142 저장 실패 — 화면을 저장 전으로 되돌리고(«저장됨»으로 보이지 않게) 실패 띠 + 다시 하기 */
              if(GS.cache[name]&&GS.cache[name][id]===obj){ if(had)GS.cache[name][id]=prev; else delete GS.cache[name][id]; fireSubs(name); }
              wSaveFail(name,id,"set",obj,e);
              throw e;});},
          delete:function(){
            var had=!!(GS.cache[name]&&Object.prototype.hasOwnProperty.call(GS.cache[name],id)), prev=had?GS.cache[name][id]:null;
            if(GS.cache[name])delete GS.cache[name][id];
            fireSubs(name);
            return gsCall("apiDel",[name,id]).then(function(r){
              var v=typeof r==="string"?(function(){try{return JSON.parse(r);}catch(e){return null;}})():r;
              if(v&&v.rev)GS.rev=String(v.rev);
              wSaveOk(name,id);
              return r;},function(e){
              /* v142 지우기 실패 — 화면에 다시 보여요 */
              if(had&&GS.cache[name]&&!Object.prototype.hasOwnProperty.call(GS.cache[name],id)){ GS.cache[name][id]=prev; fireSubs(name); }
              wSaveFail(name,id,"del",null,e);
              throw e;});},''')
rep('''function gsDB(){
  function colRef(name){''',
'''/* v142 저장 실패 모음 — 같은 기록(종류 · id)은 한 줄로. [다시 하기]는 같은 id 로 다시 보내요(서버가 덮어써서 두 번 안 생겨요) */
var WSAVE={fail:{},busy:false};
function wSaveOk(name,id){
  if(!WSAVE.fail[name+"/"+id])return;
  delete WSAVE.fail[name+"/"+id]; wSaveBar();
}
function wSaveFail(name,id,op,obj,e){
  if(GS.demo&&!S.db)return;
  WSAVE.fail[name+"/"+id]={name:name,id:id,op:op,obj:obj,why:errMsg(e)};
  wSaveBar();
}
function wSaveBar(){
  var keys=Object.keys(WSAVE.fail), b=$("wSaveBar");
  if(!keys.length){ if(b)b.remove(); try{setDbState(true);}catch(e){} return; }
  try{setDbState(false,"저장하지 못한 기록 "+keys.length+"건");}catch(e){}
  if(!b){ b=document.createElement("div"); b.id="wSaveBar"; b.className="banner stop"; b.setAttribute("role","alert");
    var bn=$("banner"); if(bn&&bn.parentNode)bn.parentNode.insertBefore(b,bn.nextSibling); else document.body.insertBefore(b,document.body.firstChild); }
  var f=WSAVE.fail[keys[0]];
  b.title=f.why||"";
  b.innerHTML='<b>저장 못 한 기록 '+keys.length+'건</b> — 인터넷을 확인하고 [다시 하기]를 눌러 주세요. '+
    '<button type="button" class="btn primary" id="wSaveRetry" style="margin-left:6px"'+(WSAVE.busy?' disabled':'')+'>'+(WSAVE.busy?'다시 저장하는 중…':'다시 하기')+'</button>';
  $("wSaveRetry").onclick=function(){
    if(WSAVE.busy)return;
    WSAVE.busy=true; var bt=this; bt.disabled=true; bt.textContent="다시 저장하는 중…";
    var list=Object.keys(WSAVE.fail).map(function(k){return WSAVE.fail[k];});
    var idem=WSAVE.inIdem;
    Promise.all(list.map(function(x){
      var d=S.db.collection(x.name).doc(x.id);
      return (x.op==="del"?d.delete():d.set(x.obj)).then(function(){
        /* 입고를 띠에서 살렸으면: 입력 칸 비우고(다시 눌러 두 번 생기지 않게) 입고 알림도 보내요 */
        if(idem&&x.name==="intakes"&&x.op==="set"&&x.id===idem.id){
          WSAVE.inIdem=null; try{banner("");resetForm();}catch(e){}
          try{if(autoInOn()&&canNotify()&&x.obj.phone)sendInMsg(x.obj,"입고 알림",null);}catch(e){}
        }
        return true;},function(){return false;});
    })).then(function(r){
      WSAVE.busy=false; wSaveBar();
      var ok=r.filter(Boolean).length;
      if(ok===r.length)toast(ok+"건을 저장했어요"); else toast((r.length-ok)+"건은 아직 저장하지 못했어요 — 인터넷 연결을 확인해 주세요",true);
      try{renderAll();}catch(e){}
    });
  };
}
function gsDB(){
  function colRef(name){''')

rep('.banner.warn{background:var(--warn-soft);color:var(--warn);display:block}',
    '.banner.warn{background:var(--warn-soft);color:var(--warn);display:block}\n.banner.stop{background:var(--danger-soft);color:var(--danger);display:block}   /* v142 저장 못 한 기록 띠 */')

# 2) 입고 등록 멱등 키 — 저장이 끝날 때까지 같은 내용이면 같은 id
rep('''  var id="in_"+Date.now()+"_"+Math.random().toString(36).slice(2,7);
  var rec={id:id,company:company,dealer:dealer,phone:$("fPhone").value.trim(),plate:plate,''',
'''  /* v142 멱등 키 — 실패 뒤 다시 눌러도(같은 상사 · 딜러 · 차량번호 · 금액) 같은 id 로 보내서 두 번 생기지 않아요 */
  var idemK=[company,dealer,plate,total].join("|");
  var id=(WSAVE.inIdem&&WSAVE.inIdem.k===idemK&&Date.now()-WSAVE.inIdem.at<600000)?WSAVE.inIdem.id:("in_"+Date.now()+"_"+Math.random().toString(36).slice(2,7));
  WSAVE.inIdem={k:idemK,id:id,at:(WSAVE.inIdem&&WSAVE.inIdem.id===id)?WSAVE.inIdem.at:Date.now()};   /* 10분 안의 다시 누르기만 같은 id */
  var rec={id:id,company:company,dealer:dealer,phone:$("fPhone").value.trim(),plate:plate,''')
rep('''  saveRec(rec)
  .then(function(){
    resetForm();renderAll();''',
'''  saveRec(rec)
  .then(function(){
    WSAVE.inIdem=null;   /* v142 저장 끝 — 다음 입고는 새 id */
    resetForm();renderAll();''')
rep('''  .catch(function(e){banner("입고를 저장하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.");toast(errMsg(e),true);})''',
'''  .catch(function(e){banner("입고를 저장하지 못했어요. 인터넷을 확인하고 [입고 등록]을 다시 눌러 주세요.");toast(errMsg(e),true);})''')

# 저장 실패가 남아 있으면 머리말은 «저장 안 됨» 그대로(주기적 동기화가 «저장됨»으로 덮지 않게) · 입력 칸을 비우면 멱등 키도 비워요
rep('''function setDbState(ok,why){
  DB_OK=!!ok;''', '''function setDbState(ok,why){
  if(ok&&typeof WSAVE!=="undefined"&&WSAVE.fail&&Object.keys(WSAVE.fail).length){ok=false;why="저장하지 못한 기록 "+Object.keys(WSAVE.fail).length+"건";}   /* v142 */
  DB_OK=!!ok;''')
rep('''function resetForm(){
  if(window.WPT)WPT.ok="";''', '''function resetForm(){
  if(typeof WSAVE!=="undefined")WSAVE.inIdem=null;   /* v142 */
  if(window.WPT)WPT.ok="";''')

# 여러 건 저장(설정)도 실패하면 되돌리기 + 실패 띠
rep('''  rows.forEach(function(r){
    GS.cache[r.col]=GS.cache[r.col]||{};GS.cache[r.col][r.id]=r.data;});
  var cols={};rows.forEach(function(r){cols[r.col]=1;});
  Object.keys(cols).forEach(fireSubs);
  if(rows.length===1||GS.newCode===false)
    return Promise.all(rows.map(function(r){
      return gsCall("apiSet",[r.col,r.id,JSON.stringify(r.data)]);}));
  return gsCall("apiSetMany",''', '''  var prevs=rows.map(function(r){var c=GS.cache[r.col]||{};return {had:Object.prototype.hasOwnProperty.call(c,r.id),v:c[r.id]};});
  rows.forEach(function(r){
    GS.cache[r.col]=GS.cache[r.col]||{};GS.cache[r.col][r.id]=r.data;});
  var cols={};rows.forEach(function(r){cols[r.col]=1;});
  Object.keys(cols).forEach(fireSubs);
  /* v142 끝내 저장하지 못하면 화면을 저장 전으로 되돌리고 실패 띠에 올려요 */
  function undo(e){
    rows.forEach(function(r,i){var c=GS.cache[r.col];if(c&&c[r.id]===r.data){if(prevs[i].had)c[r.id]=prevs[i].v;else delete c[r.id];}
      wSaveFail(r.col,r.id,"set",r.data,e);});
    Object.keys(cols).forEach(fireSubs);
    throw e;}
  function ok(v){rows.forEach(function(r){wSaveOk(r.col,r.id);});return v;}
  if(rows.length===1||GS.newCode===false)
    return Promise.all(rows.map(function(r){
      return gsCall("apiSet",[r.col,r.id,JSON.stringify(r.data)]);})).then(ok,undo);
  return gsCall("apiSetMany",''')
rep('''      /* 옛 Code.gs — 하나씩 저장해요 */
      return Promise.all(rows.map(function(r){
        return gsCall("apiSet",[r.col,r.id,JSON.stringify(r.data)]);}));
    });''', '''      /* 옛 Code.gs — 하나씩 저장해요 */
      return Promise.all(rows.map(function(r){
        return gsCall("apiSet",[r.col,r.id,JSON.stringify(r.data)]);}));
    }).then(ok,undo);''')

# 보내기 멱등 키 — 보낸 기록 한 줄(o.id)마다 하나. 서버가 같은 키로 이미 «보냄»이면 다시 안 보내게(서버 방과 이름 맞춤: sendKey)
rep('''      templateId:"",scheduledDate:o.scheduledDate||"",ref:o.ref||""};''',
'''      templateId:"",scheduledDate:o.scheduledDate||"",ref:o.ref||"",sendKey:String(o.id||"")};   /* v142 보내기 멱등 키 */''')

rep('  var plan=ataPlan(o);\n', '  var plan=ataPlan(o);\n  o.ataTried=!!(plan||(o.hq&&!HQATA.off));   /* v142 알림톡을 실제로 시도했는지 — «대신 문자» 표시용 */\n')
# 7) 자동 발송 알림 글도 같은 말
rep('toast(x&&x.sentKind==="ATA"?"알림톡을 보냈어요":"문자를 보냈어요");return x;})',
    'toast(x&&x.via?sentHow(x):(x&&x.sentKind==="ATA"?"알림톡을 보냈어요":"문자를 보냈어요"));return x;})')

# 3) 보낸 결과 말 — 알림톡 · 대체 문자 · 실패
rep('''function sentHow(o){var v=o&&o.via;return v==="ata"?"알림톡을 보냈어요":(v==="sms"?"문자로 보냈어요":"보냈어요");}''',
'''function sentHow(o){var v=o&&o.via;   /* v142 알림톡이 안 가서 문자로 간 것은 «대신» 이라고 알려요 */
  var wantAta=!!(o&&o.ataTried);
  return v==="ata"?"알림톡을 보냈어요":(v==="sms"?(wantAta?"알림톡이 안 가서 문자로 대신 보냈어요":"문자로 보냈어요"):"보냈어요");}''')
rep('''      html:function(o){var k=o.sentKind||o.kind||"";return esc(KIND_NAME[k]||k);}},''',
'''      html:function(o){var k=o.sentKind||o.kind||"";
        if(o.status==="보냄"&&o.via==="sms"&&o.ataTried)return esc("문자(알림톡 대신)");   /* v142 */
        return esc(KIND_NAME[k]||k);}},''')

open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s))
