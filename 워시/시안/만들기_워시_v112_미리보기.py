"""워시 v112 미리보기 만들기 — 대표님이 눌러 볼 수 있게, 서버 대신 지어낸 자료를 넣은 사본.
쓰는 법: python3 워시/시안/만들기_워시_v112_미리보기.py [v113]   (판 이름을 주면 그 판으로 만듭니다. 기본 v112)
- 재료: 워시/1_차곳간_워시_index_v112.html (읽기만)
- 결과: 워시/시안/워시_v112_미리보기.html — 실제 서버(wash-api)에 연결하지 않습니다.
  서버로 가는 요청을 이 파일 안에서 가로채서 지어낸 자료로 답합니다. 저장을 눌러도 이 창 안에서만 바뀝니다.
- 예시 자료는 워시 파일 안 «샘플 자료 넣기»(seedDemo)와 같은 지어낸 값입니다 (기준서 6-3).
"""
import os, json
import sys
HERE = os.path.dirname(os.path.abspath(__file__))
VER = sys.argv[1] if len(sys.argv) > 1 else "v112"
VERN = int("".join(c for c in VER if c.isdigit()) or 0)
SRC = os.path.join(HERE, "..", "1_차곳간_워시_index_%s.html" % VER)
OUT = os.path.join(HERE, "워시_%s_미리보기.html" % VER)
SEED = os.path.join(HERE, "워시_v112_미리보기_자료.json")
s = open(SRC, encoding="utf-8").read()
seed = "{}"
if os.path.exists(SEED):
    d = json.load(open(SEED, encoding="utf-8"))
    for col in d:
        for k in d[col]:
            if isinstance(d[col][k], str):
                d[col][k] = json.loads(d[col][k])
    if VER >= "v115":
        n = 0
        for k, r in (d.get("intakes") or {}).items():
            for f in ("photoId", "outPhotoId"):
                if r.get(f):
                    n += 1
                    r[f] = "sb/PREVIEW/%s_%s.jpg" % (r.get("plate", "car"), "in" if f == "photoId" else "out")
    seed = json.dumps(d, ensure_ascii=False)

FAKE = r'''<script>
/* ═══ 미리보기 전용 — 서버(wash-api)로 가는 요청을 가로채서 지어낸 자료로 답합니다 ═══ */
(function(){
  var DB = __SEED__;
  var SHOTN = 0, SENT = [], PAY = [], TOSS = [], AB = {}, TRY = {};
  var OLDQ=location.search;   /* 미리보기: ?srv=old 이면 옛 서버처럼 */
  var AQ=(location.search.match(/ab=(open|on|fail|off)/)||[])[1]||"__ABDEF__"; if(AQ==="off")AQ="";   /* 미리보기: 처음 주소에서 한 번만 읽음 */   /* shotLinks 를 몇 번 불렀는지 (시험용) */
  function shotPic(id){ var t=id.split("/").pop().replace(/[^0-9A-Za-z가-힣._-]/g,"");
    return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"><rect width="640" height="420" fill="#1668C4"/><text x="320" y="200" font-size="34" fill="#fff" text-anchor="middle" font-family="sans-serif">서명 주소 사진</text><text x="320" y="250" font-size="22" fill="#cfe3fa" text-anchor="middle" font-family="sans-serif">'+t+'</text></svg>'); }
  var REV = 1;
  /* 주소에 ?role=manager 또는 ?role=staff 를 붙이면 매니저 · 직원으로 들어가 봅니다 (서버 sb2 처럼 돈 자료를 비워서 줌) */
  var RQ = ""; try{ RQ = (new URLSearchParams(location.search).get("role")||"").toLowerCase(); }catch(e){}
  var ROLE = (RQ==="manager"||RQ==="staff") ? RQ : "owner";
  var WHO = ROLE==="owner" ? "김대표" : (ROLE==="manager" ? "이매니저" : "박직원");
  var ME = {shop:"PREVIEW", who:WHO, role:ROLE, key:"SID-PREVIEW"};
  /* v121~: 주소 끝 ?plan=trial 이면 체험판 계정 (로그인 답에 요금제가 같이 옴) */
  if(/plan=trial/.test(location.search)) ME.planInfo={trial:true,name:"무료 체험",daysLeft:30};
  var MEM = {};
  /* 브라우저 저장이 막힌 곳(미리보기 창)에서도 돌아가게 */
  try{ localStorage.setItem("__t","1"); localStorage.removeItem("__t"); }catch(e){
    try{ Object.defineProperty(window,"localStorage",{value:{getItem:function(k){return k in MEM?MEM[k]:null;},
      setItem:function(k,v){MEM[k]=String(v);},removeItem:function(k){delete MEM[k];},clear:function(){MEM={};}}}); }catch(e2){}
  }
  try{
    localStorage.setItem("ccw_sid","SID-PREVIEW"); localStorage.setItem("ccw_shop","PREVIEW");
    localStorage.setItem("ccw_user", JSON.stringify({who:WHO,role:ROLE,phone:ROLE==="owner"?"01000000000":""}));
  }catch(e){}
  function put(col,id,data){ if(typeof data==="string"){ try{ data=JSON.parse(data); }catch(e){} } DB[col]=DB[col]||{}; DB[col][id]=data; REV++; }
  function answer(fn,a){
    a=a||[];
    switch(fn){
      case "me": case "login": return ME;
      case "logout": return {ok:true};
      case "apiLoad": var d=JSON.parse(JSON.stringify(DB));
        if(ROLE!=="owner"){   /* 서버 sb2 와 같게: 청구서 · 세금계산서는 비우고, 직원 번호 · 설정 백업은 뺌 */
          d.bills={}; d.taxdocs={};
          Object.keys(d.staff||{}).forEach(function(k){ d.staff[k].phone=""; });
          Object.keys(d.settings||{}).forEach(function(k){ if(k.indexOf("bak_")===0) delete d.settings[k]; });
        }
        d.__rev=String(REV); d.__fast=true; return d;
      case "apiStamp": return {rev:String(REV)};
      case "apiVer": return {ver:"미리보기"};
      case "ping": return {ok:true};
      /* v122~: 주소 끝 ?wait=1 이면 서버 sb13 «결제 대기» 업체(체험판) */
      case "lockInfo": return /wait=1/.test(OLDQ) ? {state:"pay",kind:"pay",joinPlan:"standard",shop:"PREVIEW",name:"미리보기 세차",msg:"결제를 마치면 모든 기능이 열립니다. 지금은 예시 자료로 둘러보실 수 있어요."} : {state:"ok"};
      case "trialUse": PAY.push({fn:fn,a:a}); TRY[a[0]]=(TRY[a[0]]||0)+1;
        return TRY[a[0]]>3 ? {ok:false,left:0} : {ok:true,left:3-TRY[a[0]]};
      case "joinPlanSet": PAY.push({fn:fn,a:a}); if(!/^(basic|standard|pro)$/.test(String(a[0]))) throw new Error("고를 수 없는 요금제입니다");
        return {ok:true,plan:a[0],name:"표준 요금제",price:55000};
      /* v115~: 사진 서명 주소 — 진짜 서버(sb4)처럼 'sb/PREVIEW/…' 사진만, 지어낸 그림 주소로 답함.
         주소 끝 ?shot=legacy 이면 옛 서버처럼 «모르는 요청»으로 답함 */
      case "shotLinks":
        if(/shot=legacy/.test(location.search)) throw new Error("모르는 요청입니다: shotLinks");
        SHOTN++; var L={};
        (a[0]||[]).forEach(function(id){ id=String(id); if(id.indexOf("sb/PREVIEW/")===0) L[id]=shotPic(id); });
        return {links:L, ttl:21600};
      case "apiSet": put(a[0],a[1],a[2]); return "ok";
      case "apiSetMany": var rows=a[0]; if(typeof rows==="string"){ try{rows=JSON.parse(rows);}catch(e){rows=[];} }
        (rows||[]).forEach(function(r){ put(r.col,r.id,r.data); }); return "ok";
      case "apiDel": if(DB[a[0]]) delete DB[a[0]][a[1]]; REV++; return "ok";
      case "sendMsg":   /* 서버 sb5 처럼: 본사 알림톡(ataKey)은 주소 끝 ?ata=on 일 때만 «코드 있음» */
        var mb={}; try{ mb=JSON.parse(a[0]||"{}"); }catch(e){}
        SENT.push({kind:mb.kind,ataKey:mb.ataKey||"",vars:mb.variables||null,text:mb.text||"",to:mb.to||""});
        SENT[SENT.length-1].rec=mb.rec||"";
        /* ?srv=15 : 서버 sb15 처럼 — 코드 없으면 서버가 문자로 바꾸고 via 로 알려 줌 */
        if(/srv=15/.test(OLDQ)){
          var v15=(mb.kind==="ATA"&&mb.ataKey&&/ata=on/.test(OLDQ))?"ata":"sms";
          return JSON.stringify({ok:true,id:"PREVIEW",groupId:"PREVIEW_G",via:v15});
        }
        if(mb.kind==="ATA"&&mb.ataKey){
          /* sb7 처럼: 키는 intake · release · extra_work · bill · deposit_ok (옛 이름은 모르는 키 → 코드 없음과 같음) */
          var K7={intake:1,release:1,extra_work:1,bill:1,deposit_ok:1,staff_link:1};   /* sb14: staff_link 도 */
          if(!K7[mb.ataKey]||!/ata=on/.test(location.search)) return JSON.stringify({ok:false,error:"알림톡 템플릿 ID가 없습니다"});
          if((mb.ataKey==="release"||mb.ataKey==="extra_work")&&!mb.rec) throw new Error("어느 차인지 알 수 없습니다 (입고 기록 번호가 없습니다)");
          if(mb.ataKey==="bill"&&!(mb.variables&&mb.variables["#{보기코드}"]&&mb.variables["#{보기코드}"]!=="-")) throw new Error("청구서 보기 주소가 올바르지 않습니다");
        }
        return JSON.stringify({ok:true,id:"PREVIEW",groupId:"PREVIEW_G"});
      case "viewLink": return {url:"https://app.cgg.co.kr/v.html?c=CAR"+String(a[0]||"").slice(-4)};
      case "viewBill": return {url:"https://app.cgg.co.kr/v.html?c=BILL01"};
      case "shopBiz": if(/biz=lock/.test(OLDQ)) throw new Error("사업자번호는 한 번 넣으면 바꿀 수 없습니다. 바꾸시려면 차곳간으로 연락해 주세요.");
        return /srv=15/.test(OLDQ)?{ok:true,bizWait:true}:{ok:true};
      case "pbIssue": return JSON.stringify({ok:true,ntsConfirmNum:"미리보기-0001"});
      case "pbCheck": case "pbReady": return JSON.stringify({ok:true,test:true,point:""});
      case "webAppUrl": return location.href.split("?")[0];
      /* v121~: 요금제 — 주소 끝 ?plan=trial 이면 체험판 계정 (체험 띠 · 자물쇠) */
      case "myPlan": if(/plan=trial/.test(OLDQ)) return {planInfo:{trial:true,name:"무료 체험",daysLeft:30}};
        return {planInfo:{trial:false,name:"기본 요금제",price:30000,daysLeft:30,paidUntil:"2026-11-14"}};
      /* v120~: 결제 (서버 sb10 처럼) — 주소 끝 ?ab=open|on|fail 이면 자동 결제 칸이 열림 (없으면 관리 스위치 꺼짐과 같음) */
      case "payDue": return {ok:true,trial:false,pgOn:true,planName:"기본 요금제",price:30000,vat:3000,full:33000,cash:0,
        period:new Date().toISOString().slice(0,7),paid:/paid=1/.test(location.search),paidUntil:"2026-11-14T15:00:00Z"};
      case "payMine": return {ok:true,pgOn:true,orders:[
          {order_id:"PV1",kind:"plan",amount:33000,use_cash:0,status:"paid",order_name:"차곳간 기본 요금제 2026-09 이용요금",period:"2026-09",paid_at:"2026-09-14T10:00:00Z",method:"카드",created_at:"2026-09-14T09:59:00Z",receiptUrl:"https://dashboard.tosspayments.com/receipt/redirection?transactionId=PREVIEW"},
          {order_id:"PV2",kind:"cash",amount:50000,use_cash:0,status:"canceled",order_name:"캐시 충전",period:"",paid_at:"2026-08-02T10:00:00Z",method:"카드",created_at:"2026-08-02T10:00:00Z",receiptUrl:"javascript:alert(1)"}]};
      case "cashInfo": return {ok:true,on:true,balance:0,free:0,paid:0,usedMonth:0,price:{},lots:[],logs:[]};
      case "payStart": PAY.push({fn:fn,a:a});
        if(/srv=old/.test(OLDQ)) return {ok:true,orderId:"PV"+Date.now(),amount:33000,orderName:"차곳간 기본 요금제 이용요금",
          clientKey:"test_ck_PREVIEW",customerName:"미리보기 세차"};   /* 옛 서버(sb7~sb9): sdk 없음 */
        return {ok:true,orderId:"PV"+Date.now(),amount:33000,orderName:"차곳간 기본 요금제 이용요금",
          clientKey:"test_ck_PREVIEW",customerName:"미리보기 세차",customerKey:"ANONYMOUS",sdk:"v2"};
      case "billInfo": case "billStart": case "billIssue": case "billOff":
        if(/srv=old/.test(OLDQ)) throw new Error("모르는 요청입니다: "+fn);
        if(ROLE!=="owner") throw new Error("대표만 할 수 있습니다");
        PAY.push({fn:fn,a:a});
        if(fn==="billInfo"){ if(!AQ) return {ok:true,open:false,on:false};
          if(AB.on===undefined) AB.on=(AQ!=="open");
          return {ok:true,open:true,on:AB.on,cardCompany:AB.on?"신한":"",last4:AB.on?"1234":"",nextAt:AB.on?"2026-11-15":"",
            failCount:(AB.on&&AQ==="fail")?1:0,lastFail:(AB.on&&AQ==="fail")?"잔액이 모자라요":"",nextTry:(AB.on&&AQ==="fail")?"2026-11-16":""}; }
        if(!AQ) return {ok:false,off:true,note:"자동 결제는 아직 준비 중입니다"};
        if(fn==="billStart") return {ok:true,customerKey:"ck_PREVIEW_RANDOM",clientKey:"test_ck_PREVIEW"};
        if(fn==="billIssue"){ AB.on=true; return {ok:true,cardCompany:"신한",last4:"1234"}; }
        AB.on=false; return {ok:true};
      /* ?ai=off|trial|fail|ok : 번호판 읽기 (서버 sb15 글 그대로) */
      case "aiReady": return !/ai=off/.test(OLDQ);
      case "aiJson":
        if(/ai=trial/.test(OLDQ)) throw new Error("체험판 AI 읽기 3번을 모두 쓰셨습니다. 결제하시면 계속 쓰실 수 있어요.");
        if(/ai=fail/.test(OLDQ)) throw new Error("번호판을 읽지 못했습니다. 번호를 직접 적어 주세요.");
        if(/ai=ok/.test(OLDQ)) return JSON.stringify({plate:"12가3456",sure:true});
        return {ok:true};
      default: return {ok:true};
    }
  }
  /* 미리보기: 토스 창 대신 부른 값만 적어 둠 (바깥으로 안 나감) */
  window.TossPayments = function(ck){ TOSS.push({init:ck}); return {
    payment:function(o){ TOSS.push({payment:o}); return {
      requestPayment:function(x){ TOSS.push({requestPayment:x}); return Promise.resolve(); },
      requestBillingAuth:function(x){ TOSS.push({requestBillingAuth:x}); return Promise.resolve(); } }; },
    requestPayment:function(m,x){ TOSS.push({v1:m,x:x}); return Promise.resolve(); } }; };
  window.TossPayments.ANONYMOUS = "@@ANONYMOUS"; window.TossPayments.__preview = true;
  window.__PV = {DB:function(){return DB;}, shotCalls:function(){return SHOTN;}, sent:function(){return SENT;}, pay:function(){return PAY;}, toss:function(){return TOSS;}};
  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function(url, opt){
    var u = String((url && url.url) || url || "");
    if(u.indexOf("/functions/v1/") >= 0){
      var body = {}; try{ body = JSON.parse((opt && opt.body) || "{}"); }catch(e){}
      var out;
      try{ out = {result: answer(body.fn, body.args)}; }catch(e){ out = {__err: String(e && e.message || e)}; }
      return new Promise(function(res){ setTimeout(function(){
        res(new Response(JSON.stringify(out), {status:200, headers:{"Content-Type":"application/json"}})); }, 60); });
    }
    if(/^https?:/i.test(u) && (!location.host || u.indexOf(location.host) < 0)) return Promise.reject(new TypeError("미리보기: 바깥 연결 안 함"));   /* srcdoc 창(주인 없음)에서도 막음 */
    return realFetch ? realFetch(url, opt) : Promise.reject(new TypeError("no fetch"));
  };
})();
</script>
'''.replace("__SEED__", seed).replace("__ABDEF__", "open" if VERN >= 120 else "")

# 자료 만들기 때만: 같은 범위 안에서 샘플 자료 넣기를 부를 수 있게 (최종 미리보기에는 안 들어감)
if os.environ.get("SEEDMODE"):
    s = s.replace("function seedDemo(){", "window.__seed=function(){GS.demo=true;seedDemo();setTimeout(function(){GS.demo=false;},4000);};\nfunction seedDemo(){", 1)
# 시험할 때만 (TESTHOOK=1): 같은 범위 안 함수를 밖에서 부를 수 있게 — 최종 미리보기에는 안 들어감
if os.environ.get("TESTHOOK") and "function sendOutMsg(" in s:
    s = s.replace("function sendOutMsg(", "window.__t={out:function(i){return sendOutMsg(S.records[i],'시험');},bill:function(b){return sendOneBill(b);},recs:function(){return S.records;},bills:function(m){B.month=m;return buildBills();},hq:function(){return HQATA;},autoIn:function(v){S.cfg=Object.assign({},S.cfg);S.cfg.send=Object.assign({},(S.cfg.send||{}),{autoIn:v});},works:function(w){S.works=w;},cfg:function(k,v){S.cfg=Object.assign({},S.cfg);S.cfg[k]=v;}};\nfunction sendOutMsg(", 1)
i = s.index("<script")
s = s[:i] + FAKE + s[i:]
s = s.replace("<title>차곳간 워시</title>", "<title>워시 %s 미리보기</title>" % VER, 1)
# 미리보기 띠 — 실제 서버가 아니라는 것을 늘 보이게
k = s.rindex('<div', 0, s.index('id="app" hidden>'))
s = s[:k] + '<div style="position:sticky;top:0;z-index:100000;background:#FFF2DD;color:#7A4A00;font:600 12.5px/1.5 \'Noto Sans KR\',sans-serif;padding:6px 14px;text-align:center">미리보기 — 지어낸 자료예요. 실제 서버에 연결하지 않고, 저장해도 이 창 안에서만 바뀌어요.</div>\n' + s[k:]
open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
