"""워시 v116 → 워시 v117 새 판. 짝 서버 sb7 (알림톡 템플릿 키 이름 · 서버가 채우는 값).
쓰는 법: 만들기_워시_v112 → … → v116 → v117 차례로 (`워시/도구/`)
바꾸는 것 (서버 sb7 · 관리 v4.1 의 13개 키 이름과 같게):
  - ataKey 이름: out → release · add → extra_work · bill → bill · deposit → deposit_ok
  - 출고 · 추가작업은 rec(입고 기록 id)를 함께 보냄 → 보기코드는 서버가 그 차로 만듦
  - 청구서는 viewBill 로 받은 보기코드를 함께 보냄 (서버가 이 업체의 살아 있는 코드인지 확인)
  - 업체명 · 업체전화는 서버가 채움 (화면이 보내도 서버 값으로 덮어씀 — 옛 서버와도 맞게 그대로 둠)
  - 서버가 알림톡 준비 중 오류를 «거절(오류)»로 돌려줘도(예: 보기 주소 만료) 그 한 건은 문자로 다시 보냄
운영 v111 · 새 판 v112~v116 은 덮어쓰지 않는다.
"""
import os, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v116.html")
OUT = os.path.join(BASE, "1_차곳간_워시_index_v117.html")
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

rep('var APP_VER="워시 v116 · UI 3.0 · 2026-10-15";', 'var APP_VER="워시 v117 · UI 3.0 · 2026-10-15";')

# 키 이름 (sb7 · 관리 v4.1)
rep('''var HQATA={off:false};''', '''var HQATA={off:false};
/* 본사 템플릿 키 — 서버 sb7 · 관리 v4.1 의 13개 이름과 같게 */
var HQKEY={out:"release",add:"extra_work",bill:"bill",deposit:"deposit_ok"};''')
rep('''var hq=(!useAta&&code&&!HQATA.off)?{key:"out",vars:hqVars(onlyKeys(outVars(r,code),ATA_VARS.out))}:null;''',
    '''var hq=(!useAta&&!HQATA.off)?{key:HQKEY.out,rec:r.id,vars:hqVars(onlyKeys(outVars(r,code),ATA_VARS.out))}:null;''')
rep('''var hq=(!useAta&&code&&!HQATA.off)?{key:"bill",vars:hqVars(onlyKeys(billVars(b,code),ATA_VARS.bill))}:null;''',
    '''var hq=(!useAta&&code&&!HQATA.off)?{key:HQKEY.bill,vars:hqVars(onlyKeys(billVars(b,code),ATA_VARS.bill))}:null;''', 2)
rep('''  return {key:"add",vars:hqVars({"차량번호":r.plate||"","업체명":shopLabel(),"작업내용":w.text||"",''',
    '''  return {key:HQKEY.add,rec:r.id,vars:hqVars({"차량번호":r.plate||"","업체명":shopLabel(),"작업내용":w.text||"",''')
rep('''hq:{key:"deposit",vars:hqVars(vars)}''', '''hq:{key:HQKEY.deposit,vars:hqVars(vars)}''')
# 출고: 서버가 보기코드를 만들므로, 화면이 코드를 못 받아도 본사 알림톡은 보냄 (업체 알림톡용으로는 그대로 받아 둠)

# sendNow — rec 함께 · 서버 «거절(오류)»여도 그 한 건은 문자로
rep('''    else if(o.hq&&!HQATA.off){body.kind="ATA";body.ataKey=o.hq.key;body.variables=o.hq.vars;body.imageB64="";body.disableSms=false;}''',
    '''    else if(o.hq&&!HQATA.off){body.kind="ATA";body.ataKey=o.hq.key;body.variables=o.hq.vars;body.imageB64="";body.disableSms=false;
      if(o.hq.rec)body.rec=String(o.hq.rec);}''')
rep('''    return GS.send(body).then(function(res){
      /* 본사 템플릿이 아직 없거나 옛 서버 → 예전처럼 문자로 (이 화면에서는 다시 묻지 않음) */
      if(body.ataKey&&!(res&&res.ok)&&/템플릿 ID|채널 ID|pfId/.test(String((res&&(res.error||res.message))||""))){
        HQATA.off=true;
        var o2=Object.assign({},o);delete o2.hq;
        return jobImage(o2).then(function(b2){
          body.kind=o.kind||c.mode||"AUTO";if(body.kind==="ATA")body.kind="AUTO";
          delete body.ataKey;delete body.variables;delete body.disableSms;body.imageB64=b2||"";
          o.sentKind=body.kind;
          return GS.send(body);
        });
      }
      return res;
    });''', '''    /* 알림톡이 안 되면 그 자리에서 예전처럼 문자로 다시 */
    function asSms(){
      var o2=Object.assign({},o);delete o2.hq;
      return jobImage(o2).then(function(b2){
        body.kind=o.kind||c.mode||"AUTO";if(body.kind==="ATA")body.kind="AUTO";
        delete body.ataKey;delete body.variables;delete body.disableSms;delete body.rec;body.imageB64=b2||"";
        o.sentKind=body.kind;
        return GS.send(body);
      });
    }
    return GS.send(body).then(function(res){
      /* 본사 템플릿이 아직 없거나 옛 서버 → 문자로 (이 화면에서는 다시 묻지 않음) */
      if(body.ataKey&&!(res&&res.ok)&&/템플릿 ID|채널 ID|pfId/.test(String((res&&(res.error||res.message))||""))){
        HQATA.off=true; return asSms();
      }
      return res;
    },function(err){
      /* 서버가 알림톡 준비 중 거절(예: 청구서 보기 주소 만료 · 차를 못 찾음) → 그 한 건만 문자로 */
      if(body.ataKey) return asSms();
      throw err;
    });''')

open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
