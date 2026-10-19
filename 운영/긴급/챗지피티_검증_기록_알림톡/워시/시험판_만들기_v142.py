import sys
SP=sys.argv[1]; p=SP+"/pv142/워시_v142_미리보기_시험용.html"; s=open(p,encoding="utf-8").read()
def r(a,b):
    global s
    assert s.count(a)==1,a[:60]; s=s.replace(a,b)
r("  var DB = {","  var DB = window.__SEEDDB || {")
F='if(window.__FAIL>0){window.__FAIL--; throw new Error("인터넷 연결이 끊겼어요 (시험)");} '
r('      case "apiSet": put(a[0],a[1],a[2]); return "ok";','      case "apiSet": window.__CALLS=window.__CALLS||[]; window.__CALLS.push("set:"+a[0]+"/"+a[1]); '+F+'put(a[0],a[1],a[2]); return "ok";')
r('      case "apiSetMany": var rows=a[0];','      case "apiSetMany": '+F+'var rows=a[0];')
r('      case "apiDel": if(DB','      case "apiDel": '+F+'if(DB')
r('SENT.push({kind:mb.kind,','SENT.push({sendKey:mb.sendKey||"",kind:mb.kind,')
r("window.__t={","window.__t={W:function(){return WSAVE;},SS:function(){return S;},G:function(){return GS;},saveRec:function(r){return saveRec(r);},dbs:function(v){setDbState(v);},how:function(o){return sentHow(o);},cfgSave:function(){return saveCfg({noBak:true});},")
open(SP+"/pv142/t.html","w",encoding="utf-8").write(s)
