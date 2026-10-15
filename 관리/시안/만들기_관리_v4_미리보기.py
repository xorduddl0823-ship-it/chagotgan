"""관리 v4.0 미리보기 만들기 — 대표님이 눌러 볼 수 있게 서버 대신 지어낸 자료를 넣은 사본.
쓰는 법: python3 관리/시안/만들기_관리_v4_미리보기.py
- 재료: 관리/3_차곳간_관리_index_v4.0.html (읽기만)
- 결과: 관리/시안/관리_v4.0_미리보기.html — 실제 서버에 연결하지 않습니다. 저장을 눌러도 아무것도 바뀌지 않습니다.
- 업체 · 사람 · 번호는 모두 지어낸 값입니다 (기준서 6-3).
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
import sys
VER = sys.argv[1] if len(sys.argv) > 1 else "4.0"     # python3 … 4.1 → v4.1 미리보기
SRC = os.path.join(HERE, "..", "3_차곳간_관리_index_v%s.html" % VER)
OUT = os.path.join(HERE, "관리_v%s_미리보기.html" % VER)
s = open(SRC, encoding="utf-8").read()

def rep(old, new):
    global s
    if s.count(old) != 1: raise SystemExit("못 찾음: " + old[:80])
    s = s.replace(old, new)

import re
s, n = re.subn(r'var API = "https://[^"]*";', 'var API = "미리보기 — 서버에 연결하지 않음";', s)
assert n == 1
rep('<title>차곳간 관리</title>', '<title>관리 v%s 미리보기</title>' % VER)
rep('document.title = "차곳간 관리";', 'document.title = "관리 v%s 미리보기";' % VER)

# 미리보기는 대화 화면 안에 끼워서 보므로 «끼워 넣기 막기»를 뺍니다 (실제 판에는 있음)
a0 = s.index('<script>/* 다른 사이트 안에 끼워 열리면'); b0 = s.index('</script>', a0) + len('</script>')
s = s[:a0] + s[b0:]

# 브라우저 저장이 막혀도 돌아가게 — 기억은 이 창 안에서만
rep('function ls(k,v){ try{ if(v===undefined) return localStorage.getItem(k)||""; localStorage.setItem(k,v); }catch(e){} return ""; }',
    'var MEM={};\nfunction ls(k,v){ if(v===undefined){ try{ var x=localStorage.getItem(k); if(x!=null) return x; }catch(e){} return MEM[k]||""; } MEM[k]=v; try{ localStorage.setItem(k,v); }catch(e){} return ""; }')

FAKE = r'''
/* ═══ 미리보기 전용 — 지어낸 자료 (실제 서버 창구 이름과 같은 꼴로 돌려줍니다) ═══ */
function dd(n){ var t=new Date(); t.setDate(t.getDate()+n); return t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0"); }
var YM0=dd(0).slice(0,7);
var F_SHOPS=[{shop:"ADMIN",name:"차곳간 본사",active:true},
 {shop:"HANBIT",name:"한빛광택",biz_kind:"wash",plan:"basic",active:true,paid_until:dd(9),endAt:dd(9),staff:4,owner_phone:"01000001111"},
 {shop:"SAEBIT",name:"새빛 성능장",biz_kind:"repair",plan:"trial",active:true,trial_until:dd(3),endAt:dd(3),staff:2,owner_phone:"01000002222"},
 {shop:"DURI",name:"두리휠",biz_kind:"wheel",plan:"standard",active:false,paid_until:dd(-5),endAt:dd(-5),staff:3,owner_phone:"01000003333"},
 {shop:"BAREUN",name:"바른 카모터스",biz_kind:"wash",plan:"pro",active:true,paid_until:dd(21),endAt:dd(21),staff:6,owner_phone:"01000004444"}];
var F_USERS=[{phone:"admin",name:"한본사",shop:"ADMIN",shopName:"차곳간 본사",role:"admin",active:true,last_login:dd(0)+"T09:10:00",created_at:"2026-05-01"},
 {phone:"01000001111",name:"김하늘",shop:"HANBIT",shopName:"한빛광택",role:"owner",active:true,last_login:dd(0)+"T08:00:00",created_at:"2026-06-11"},
 {phone:"01000002222",name:"박바다",shop:"SAEBIT",shopName:"새빛 성능장",role:"owner",active:true,last_login:dd(-1)+"T18:00:00",created_at:"2026-09-30"},
 {phone:"01000005555",name:"최들판",shop:"HANBIT",shopName:"한빛광택",role:"staff",active:false,last_login:dd(-20)+"T10:00:00",created_at:"2026-07-02"}];
var F_PAYS=[{id:1,shop:"HANBIT",shopName:"한빛광택",amount:55000,status:"paid",period:YM0,paid_at:dd(-2)},
 {id:2,shop:"BAREUN",shopName:"바른 카모터스",amount:99000,status:"paid",period:YM0,paid_at:dd(-1)},
 {id:3,shop:"DURI",shopName:"두리휠",amount:77000,status:"ready",period:YM0}];
var F_PLANS=[{code:"basic",name:"베이직",price:55000,active:true,sort:1},{code:"standard",name:"스탠다드",price:77000,active:true,sort:2},{code:"pro",name:"프로",price:0,active:true,sort:3}];
var F_SVCS=[{id:1,code:"supabase",name:"수파베이스",kind:"sub",cost:35000,next_due:dd(4),active:true,sort:1,url:"https://supabase.com",what:"서버·자료"},
 {id:2,code:"solapi",name:"솔라피 문자",kind:"charge",balance:8000,min_bal:10000,active:true,sort:2,auto:true,auto_note:"자동으로 읽음",what:"문자"},
 {id:3,code:"cloudflare",name:"클라우드플레어",kind:"sub",cost:0,next_due:dd(17),active:true,sort:3,what:"주소"}];
var F_TODO=[{id:1,title:"QR 스티커 교체",done:false,due_at:dd(0)},{id:2,title:"문자 충전",done:false,due_at:dd(-2)},{id:3,title:"세금계산서 정리",done:false,due_at:dd(6)}], F_NEXT=10;
function FAKE(fn,a){
  a=a||[];
  switch(fn){
    case "me": return {shop:"ADMIN",who:"한본사",role:"admin"};
    case "hqLogin": return {tick:"T1",to:"010-****-0000"};
    case "hqLogin2": return {key:"SID-PREVIEW",who:"한본사",shop:"ADMIN",role:"admin"};
    case "logout": return {ok:true};
    case "hqSummary": return {salesMonth:154000,expMonth:35000,shops:4,shopsOff:1,users:4,usersOn:3,active7:6,waitInvite:2,unpaid:1};
    case "hqShops": return {shops:F_SHOPS};
    case "hqUsers": return {users:F_USERS};
    case "hqPayments": return {payments:F_PAYS};
    case "inviteList": return {invites:[{phone:"01000007777",memo:"광택 상담",used:false,created_at:dd(-3)},{phone:"01000008888",memo:"",used:true,created_at:dd(-9)}]};
    case "hqPlans": return {plans:F_PLANS};
    case "hqSessions": return {sessions:[]};
    case "hqServices": return {services:F_SVCS};
    case "hqExpenses": return {expenses:[{id:1,day:dd(-4),name:"수파베이스",amount:35000}]};
    case "hqInfo": return {hq:{biz_name:"차곳간 본사",biz_no:"1234567890",ceo:"한본사",pb_test:true},hasPopbill:true};
    case "hqTodo": return {todo:F_TODO};
    case "hqTodoAdd": F_NEXT++; F_TODO.push({id:F_NEXT,title:a[0],done:false,due_at:a[1]||null}); return {ok:true};
    case "hqTodoDone": F_TODO.forEach(function(t){ if(t.id===a[0]) t.done=!!a[1]; }); return {ok:true};
    case "hqTodoDel": F_TODO=F_TODO.filter(function(t){ return t.id!==a[0]; }); return {ok:true};
    case "hqAta": return {ok:true,pfSet:true,tpls:{auth:"KA01TP000000AUTH01",release:"KA01TP000000REL001",bill:"KA01TP000000BILL01",deposit_ok:"KA01TP000000DEP001"},
      stats:{ym:a[0],ata:{cnt:412,won:412*13},sms:{cnt:96,won:96*18},lms:{cnt:1288,won:1288*45},mms:{cnt:12,won:12*110}}};
    case "hqAtaSave": return {ok:true};
    case "hqOps": return {usage:{db_bytes:1.9*Math.pow(1024,3),file_bytes:23.4*Math.pow(1024,3),file_cnt:18234},limits:{dbGb:8,fileGb:100,warnPct:80},
      services:[{code:"solapi",balance:8000,minBal:10000,balanceAt:dd(0)+"T09:00:00"}],monthCost:35000,due:[],low:[],at:dd(0)+"T09:00:00"};
  }
  return {};
}
function post(bodyObj){
  return new Promise(function(ok){ setTimeout(function(){ ok(JSON.parse(JSON.stringify(FAKE(bodyObj.fn,bodyObj.args)))); },60); });
}
'''
a = s.index('function post(bodyObj){'); b = s.index('function open_(fn,args)')
s = s[:a] + FAKE + s[b:]
# 처음 열면 바로 들어가게
rep('(function boot(){', 'if(!ls(SIDKEY)) ls(SIDKEY,"SID-PREVIEW");\n(function boot(){')
# 미리보기 표시
rep('<div class="toast" id="toast"></div>', '<div class="toast" id="toast"></div>\n<div style="position:fixed;right:12px;bottom:calc(70px + env(safe-area-inset-bottom,0px));z-index:70;background:#B26B00;color:#fff;font-size:12px;font-weight:700;padding:6px 11px;border-radius:999px;box-shadow:0 4px 12px #0003;pointer-events:none">미리보기 · 지어낸 자료 · 저장 안 됨</div>')
open(OUT, "w", encoding="utf-8").write(s)
print("만듦:", OUT, len(s), "글자")
