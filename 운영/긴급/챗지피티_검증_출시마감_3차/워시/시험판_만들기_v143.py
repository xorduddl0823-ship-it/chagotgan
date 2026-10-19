import sys
SP=sys.argv[1]; V=sys.argv[2] if len(sys.argv)>2 else "v143"
p=SP+"/pv"+V[1:]+"/워시_"+V+"_미리보기_시험용.html"; s=open(p,encoding="utf-8").read()
def r(a,b):
    global s
    assert s.count(a)==1,a[:60]; s=s.replace(a,b)
r("  var DB = {","  var DB = window.__SEEDDB || {")
F='if(window.__FAIL>0){window.__FAIL--; throw new Error("인터넷 연결이 끊겼어요 (시험)");} '
r('      case "apiSet": put(a[0],a[1],a[2]); return "ok";','      case "apiSet": window.__CALLS=window.__CALLS||[]; window.__CALLS.push("set:"+a[0]+"/"+a[1]); '+F+'put(a[0],a[1],a[2]); return "ok";')
r('      case "apiSetMany": var rows=a[0];','      case "apiSetMany": '+F+'var rows=a[0];')
r('      case "apiDel": if(DB','      case "apiDel": '+F+'if(DB')
r('SENT.push({kind:mb.kind,','SENT.push({rid:window.__CURRID||"",kind:mb.kind,')
# 서버 sb28 처럼: 업체+fn+rid 같은 쓰기는 처음 답 그대로(성공만 기억) · __LOSE: 처리는 하고 답을 잃음
r('''      var out;
      try{ out = {result: answer(body.fn, body.args)}; }catch(e){ out = {__err: String(e && e.message || e)}; }''',
'''      var out; window.__RIDS=window.__RIDS||[]; window.__RIDS.push({fn:body.fn,rid:body.rid||""}); window.__IDEM=window.__IDEM||{};
      var ik=body.rid?(body.fn+"|"+body.rid):"";
      if(ik&&window.__IDEM[ik]){ out=window.__IDEM[ik]; }
      else{ window.__CURRID=body.rid||"";
        try{ out = {result: answer(body.fn, body.args)}; }catch(e){ out = {__err: String(e && e.message || e)}; }
        window.__CURRID="";
        var okr=!out.__err&&!(function(){try{var v=typeof out.result==="string"?JSON.parse(out.result):out.result;return v&&v.ok===false;}catch(e){return false;}})();
        if(ik&&okr) window.__IDEM[ik]=out; }
      if(window.__LOSE&&window.__LOSE[body.fn]>0){ window.__LOSE[body.fn]--; return Promise.reject(new TypeError("Failed to fetch")); }''')
r("window.__t={","window.__t={W:function(){return WSAVE;},SS:function(){return S;},G:function(){return GS;},saveRec:function(r){return saveRec(r);},dbs:function(v){setDbState(v);},how:function(o){return sentHow(o);},cfgSave:function(){return saveCfg({noBak:true});},")
open(SP+"/pv"+V[1:]+"/t.html","w",encoding="utf-8").write(s)
