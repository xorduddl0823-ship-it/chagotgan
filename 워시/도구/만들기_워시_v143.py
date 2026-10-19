"""워시 v142 → v143. 총괄 10/19 «출시마감 3차»(운영/긴급/2026-10-19_출시마감_3차_요청.md [1]) — v142 는 올리지 않고 v143 으로
쓰는 법: python3 워시/도구/만들기_워시_v143.py  (v142 판 위에 덧붙임 — v142 는 덮어쓰지 않아요)
  디자인 · 새 기능 없음. 돈 셈 그대로(전체검사.js 돈 지문 같아야 해요).
  1) 서버 약속(sb28): 쓰기 창구 몸통 맨 위에 rid(소문자 · 숫자 24자). 읽기 창구엔 안 붙여요(처음 답이 24시간 고정되니까).
     · 사용자 «한 번 누름»마다 새 rid. 답을 못 받은 일(연결 끊김 · 답 못 읽음)을 같은 내용으로 다시 하면 같은 rid(30분 안).
     · 보내기: 보낸 기록 한 줄(o)마다 rid 하나 — 알림톡 → 문자 대체도 같은 rid(한 발송 업무). 보낸 기록의 [다시 보내기]는 새 rid.
     · v142 의 sendKey 는 빼요(서버가 따로 받지 않음).
  2) 결과 불명(답을 못 받음 · 서버 «처리 중/확인 중»): 보낸 기록 상태 «확인 중», 글 «확인 중 — 보낸 기록에서 확인해 주세요».
     자동으로 다시 보내지 않아요(문자로 대신 보내기 · 문자 앱 열기도 안 해요).
운영 v111 · 시험판 v125 · v126 ~ v142 은 덮어쓰지 않는다.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(HERE); ROOT = os.path.dirname(BASE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v142.html"); OUT = os.path.join(BASE, "1_차곳간_워시_index_v143.html")
s = open(SRC, encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)
rep('var APP_VER="워시 v142 · UI 3.0 · 2026-10-19";', 'var APP_VER="워시 v143 · UI 3.0 · 2026-10-19";')

# 1) 서버 부르기(supaRpc) — 쓰기 창구에만 rid
rep('''function supaRpc(fn,args){
  if(fn==="webAppUrl")return Promise.resolve(supaHome());
  return fetch(SUPA.fn,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({shop:SUPA.shop,token:SUPA.key,fn:fn,args:args})})
    .then(function(r){return r.text();},function(){throw {message:"서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요."};})
    .then(function(t){
      var j;try{j=JSON.parse(t);}catch(e){throw {message:"서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요."};}
      if(j&&j.__err)throw {message:j.__err};
      return j?j.result:null;
    });
}''', '''/* v143 같은 일 표시(rid · 서버 sb28 약속) — 쓰기 창구에만. 읽기 창구(apiLoad · apiStamp …)엔 안 붙여요 */
var WRID={cur:"",lost:{},W:{}};
("apiSet apiSetMany apiDel apiWipeDemo sendMsg cancelSchedule shopBiz pbIssue pbModify userAdd userEdit userDel userPw userPhone "+
 "inviteAdd inviteDel bankLink bankUnlink driveUpload driveUploadMany trialUse joinPlanSet cfgVoice "+
 "billIssue billOff billStart cashAsk payConfirm payStart noticeHide").split(" ").forEach(function(k){WRID.W[k]=1;});
function wNewRid(){var A="abcdefghijklmnopqrstuvwxyz0123456789",a=new Uint8Array(24);
  try{crypto.getRandomValues(a);}catch(e){for(var i=0;i<24;i++)a[i]=Math.floor(Math.random()*256);}
  return Array.prototype.map.call(a,function(x){return A[x%36];}).join("");}
/* 답을 못 받았는지(결과 불명) — 다시 하면 같은 rid, 보내기는 «확인 중» */
function wUnknown(e){return !!(e&&(e.unknown||/처리 중이에요|확인 중/.test(String(e.message||e.error||e.__err||""))));}
function supaRpc(fn,args){
  if(fn==="webAppUrl")return Promise.resolve(supaHome());
  var b={shop:SUPA.shop,token:SUPA.key,fn:fn,args:args},lk="",rid="";
  if(WRID.W[fn]){
    if(WRID.cur)rid=WRID.cur;                      /* 보내기 — 보낸 기록 한 줄의 rid */
    else{try{lk=fn+"|"+JSON.stringify(args);}catch(e){lk="";}
      var l=lk&&WRID.lost[lk];rid=(l&&Date.now()-l.t<30*60000)?l.rid:wNewRid();}
    b.rid=rid;
  }
  function lost(){if(lk)WRID.lost[lk]={rid:rid,t:Date.now()};}
  function done(){if(lk)delete WRID.lost[lk];}
  return fetch(SUPA.fn,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(b)})
    .then(function(r){return r.text();},function(){lost();throw {message:"서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.",unknown:true};})
    .then(function(t){
      var j;try{j=JSON.parse(t);}catch(e){lost();throw {message:"서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.",unknown:true};}
      if(j&&j.__err){if(wUnknown({message:j.__err}))lost();else done();throw {message:j.__err};}
      done();
      return j?j.result:null;
    });
}''')
# 오류에 붙은 «결과 불명» 표시가 rpcChecked 를 지나도 남게 (그대로 넘어가요 — 바꿀 것 없음)

# 보내기: 보낸 기록 한 줄마다 rid · sendKey 빼기
rep('''GS.send=function(body){return gsCall("sendMsg",[JSON.stringify(body)]).then(function(t){''',
'''GS.send=function(body,rid){var p;WRID.cur=rid||"";try{p=gsCall("sendMsg",[JSON.stringify(body)]);}finally{WRID.cur="";}return p.then(function(t){''')
rep('''      templateId:"",scheduledDate:o.scheduledDate||"",ref:o.ref||"",sendKey:String(o.id||"")};   /* v142 보내기 멱등 키 */''',
'''      templateId:"",scheduledDate:o.scheduledDate||"",ref:o.ref||""};
    if(!o.rid)o.rid=wNewRid();   /* v143 보낸 기록 한 줄 = 발송 한 건 = rid 하나 (알림톡 → 문자 대체도 같은 rid) */''')
rep('''        o.sentKind=body.kind;
        return GS.send(body);''', '''        o.sentKind=body.kind;
        return GS.send(body,o.rid);''')
rep('''    return GS.send(body).then(function(res){''', '''    return GS.send(body,o.rid).then(function(res){''')
# 결과 불명이면 문자로 대신 보내지 않아요
rep('''      /* 서버가 알림톡 준비 중 거절(예: 청구서 보기 주소 만료 · 차를 못 찾음) → 그 한 건만 문자로 */
      if(body.ataKey) return asSms();''', '''      /* 서버가 알림톡 준비 중 거절(예: 청구서 보기 주소 만료 · 차를 못 찾음) → 그 한 건만 문자로 */
      if(body.ataKey&&!wUnknown(err)) return asSms();   /* v143 답을 못 받았으면(갔을 수도 있음) 문자로 또 보내지 않아요 */''')
# 서버가 «결과 불명»을 답으로 줄 때도(ok 아님 + unknown/확인 중) 같은 처리
rep('''  }).then(function(res){
    if(res&&res.ok){if(GS.demo)o.demo=true;o.status=o.scheduledDate?"예약":"보냄";''',
'''  }).then(function(res){
    if(res&&!res.ok&&(res.unknown||res.status==="unknown"||wUnknown({message:res.error||res.message})))throw {message:String(res.error||res.message||"확인 중"),unknown:true};
    if(res&&res.ok){if(GS.demo)o.demo=true;o.status=o.scheduledDate?"예약":"보냄";''')
rep('''  }).catch(function(e){
    o.status="실패";''', '''  }).catch(function(e){
    if(wUnknown(e)){   /* v143 결과 불명 — 자동으로 다시 보내지 않고 «확인 중» */
      o.status="확인 중";o.err="";
      return saveJob(o).catch(function(){}).then(function(){throw {message:"확인 중 — 보낸 기록에서 확인해 주세요",unknown:true};});
    }
    o.status="실패";''')
# 자동 발송 알림: 확인 중이면 문자 앱도 열지 않아요
rep('''      .catch(function(){
        toast("자동 발송 실패 — 보낸 기록에 남겼어요. 문자 앱으로 보내요",true);
        if(openFallback)openFallback();
      });''', '''      .catch(function(e){
        if(wUnknown(e))return toast("확인 중 — 보낸 기록에서 확인해 주세요",true);   /* v143 갔을 수도 있어서 문자 앱을 열지 않아요 */
        toast("자동 발송 실패 — 보낸 기록에 남겼어요. 문자 앱으로 보내요",true);
        if(openFallback)openFallback();
      });''')
# 보낸 기록 [다시 보내기] = 사용자가 일부러 새로 → 새 rid · 확인 중 건은 한 번 더 알려요
rep('''    jobs.forEach(function(o){if(o.scheduledDate&&new Date(o.scheduledDate)<new Date(Date.now()+10*60000))o.scheduledDate="";});''',
'''    jobs.forEach(function(o){if(o.scheduledDate&&new Date(o.scheduledDate)<new Date(Date.now()+10*60000))o.scheduledDate="";
      o.rid=wNewRid();});   /* v143 일부러 다시 보내기 = 새 rid */''')
rep('''    var jobs=(S.outbox||[]).filter(function(o){return ids.indexOf(o.id)>=0&&o.status!=="예약";});
    if(!jobs.length)return toast("다시 보낼 건이 없어요 (예약 건은 빼고)",true);''',
'''    var jobs=(S.outbox||[]).filter(function(o){return ids.indexOf(o.id)>=0&&o.status!=="예약";});
    if(!jobs.length)return toast("다시 보낼 건이 없어요 (예약 건은 빼고)",true);
    var nChk=jobs.filter(function(o){return o.status==="확인 중";}).length;   /* v143 */
    if(nChk)toast("«확인 중» "+nChk+"건은 이미 갔을 수 있어요 — 받는 분께 확인한 뒤 보내 주세요",true);''')
# 보낸 기록 상태 칸: 확인 중 안내
rep('''        (o.err?(' <small style="color:var(--danger)">'+esc(sendErrText(o.err))+'</small>'):"");}},''',
'''        (o.err?(' <small style="color:var(--danger)">'+esc(sendErrText(o.err))+'</small>'):"")+
        (o.status==="확인 중"?' <small style="color:var(--warn)">갔는지 아직 몰라요 — 받는 분께 확인한 뒤 필요하면 다시 보내 주세요</small>':"");}},   /* v143 */''')

open(OUT, "w", encoding="utf-8").write(s); print("OK", OUT, len(s))
