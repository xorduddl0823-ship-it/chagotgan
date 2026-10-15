"""워시 v114 → 워시 v115 새 판. 사진을 «서명 주소»로 보이게 (보안 ⑤ 2단계, 서버/설계/08_사진보관함_비공개_설계.md).
쓰는 법: python3 워시/도구/만들기_워시_v112.py && python3 워시/도구/만들기_워시_v113.py && python3 워시/도구/만들기_워시_v114.py && python3 워시/도구/만들기_워시_v115.py
바꾸는 것:
  - blobUrl(id) 한 곳만 바꿈 (부르는 16곳은 그대로).
    'sb/…' 사진은 공개 주소를 만들지 않고, 서버 새 창구 shotLinks 로 받은 서명 주소(기본 6시간)를 기억 칸에서 꺼내 씀.
    · 자료를 불러온 뒤(apiLoad 다음) 화면 자료 안의 'sb/' 사진 id 를 모아 300장씩 한 번에 받음
    · 기억에 없으면 잠깐 투명한 빈 그림 → 받아 오면 그 자리 그림만 바로 바꿔 끼움 (화면 다시 그리기 없이, 열린 창 안도)
    · 유지 시간의 80%가 지나면 다시 받음. 사진을 새로 올린 직후에도 그 id 로 받음
    · 서버가 아직 shotLinks 를 모르는 옛 판(sb1~sb3)이면 예전처럼 공개 주소 (그래서 올리는 순서가 바뀌어도 안 깨짐)
운영 v111 · 새 판 v112~v114 는 덮어쓰지 않는다. 서버 주소 · 저장 방식 · 로그인은 그대로.
"""
import os, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
SRC = os.path.join(BASE, "1_차곳간_워시_index_v114.html")
OUT = os.path.join(BASE, "1_차곳간_워시_index_v115.html")
s = open(SRC, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit("찾은 수가 다름(%d≠%d): %s" % (n, count, old[:90]))
    s = s.replace(old, new)

rep('var APP_VER="워시 v114 · UI 3.0 · 2026-10-15";', 'var APP_VER="워시 v115 · UI 3.0 · 2026-10-15";')

rep('''function blobUrl(id){
  /* 주소에 따옴표·꺾쇠 같은 글자가 섞여 화면에 코드가 심어지지 않게 먼저 지웁니다 */
  id=String(id==null?"":id).replace(/[<>"'`\\\\\\s]/g,"");
  if(!id)return "";
  if(id.indexOf("sb/")===0)return SUPA_URL+"/storage/v1/object/public/wash/"+encodeURI(id.slice(3));''',
'''/* ===== 사진 서명 주소 (v115 · 보안 ⑤) =====
   보관함을 비공개로 바꿔도 사진이 보이게, 'sb/' 사진은 서버가 주는 «잠깐만 열리는 주소»를 씁니다.
   SHOT.map[id] = {u:주소, t:받은 때} · 유지 시간(ttl)의 80%가 지나면 다시 받습니다. */
var SHOT={map:{},want:{},ttl:21600,busy:false,timer:0,legacy:false,
  blank:"data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"};
function shotFresh(id){var h=SHOT.map[id];return !!(h&&(Date.now()-h.t)<SHOT.ttl*800);}
function shotHold(id){return SHOT.blank+"#shot="+encodeURIComponent(id);}
/* 받아 온 주소로 화면에 이미 그려진 빈 그림을 바로 바꿔 끼웁니다 (열린 창 안까지) */
function shotSwap(){
  Array.prototype.forEach.call(document.querySelectorAll('img[src*="#shot="],[data-big*="#shot="]'),function(el){
    ["src","data-big"].forEach(function(at){
      var v=el.getAttribute(at); if(!v||v.indexOf("#shot=")<0)return;
      var id=decodeURIComponent(v.split("#shot=")[1]||"");
      var h=SHOT.map[id]; if(h)el.setAttribute(at,h.u);
      else if(SHOT.legacy)el.setAttribute(at,shotPublic(id));
    });
  });
}
function shotPublic(id){return SUPA_URL+"/storage/v1/object/public/wash/"+encodeURI(id.slice(3));}
/* 모아 둔 사진 id 를 300장씩 서버에 물어봅니다 */
function shotPull(){
  if(SHOT.busy||SHOT.legacy)return;
  var ids=Object.keys(SHOT.want).filter(function(id){return !shotFresh(id);});
  SHOT.want={};
  if(!ids.length)return;
  SHOT.busy=true;
  var chunks=[];for(var i=0;i<ids.length;i+=300)chunks.push(ids.slice(i,i+300));
  var at=Date.now();
  chunks.reduce(function(p,ch){
    return p.then(function(){
      return gsCall("shotLinks",[ch]).then(function(r){
        var v=typeof r==="string"?JSON.parse(r):r;
        if(v&&v.ttl)SHOT.ttl=Math.max(60,Number(v.ttl)||21600);
        var L=(v&&v.links)||{};
        Object.keys(L).forEach(function(id){SHOT.map[id]={u:L[id],t:at};});
      });
    });
  },Promise.resolve()).catch(function(e){
    /* 서버가 아직 shotLinks 를 모르는 옛 판이면 예전처럼 공개 주소로 */
    var m=String((e&&e.message)||e||"");
    if(/모르는|unknown|not.*(found|allowed)/i.test(m))SHOT.legacy=true;
  }).then(function(){
    SHOT.busy=false; shotSwap();
    if(Object.keys(SHOT.want).length)setTimeout(shotPull,50);
  });
}
function shotAsk(id){SHOT.want[id]=1;clearTimeout(SHOT.timer);SHOT.timer=setTimeout(shotPull,30);}
/* 자료를 불러온 뒤 — 자료 안의 'sb/' 사진 id 를 모두 모아 미리 받아 둡니다 */
function shotPrefetch(){
  try{
    var seen={};
    (function walk(v,d){
      if(d>6||v==null)return;
      if(typeof v==="string"){if(v.indexOf("sb/")===0&&!shotFresh(v))seen[v]=1;return;}
      if(typeof v!=="object")return;
      if(Array.isArray(v)){v.forEach(function(x){walk(x,d+1);});return;}
      Object.keys(v).forEach(function(k){walk(v[k],d+1);});
    })(GS.cache,0);
    Object.keys(seen).forEach(function(id){SHOT.want[id]=1;});
    shotPull();
  }catch(e){}
}
/* 유지 시간이 지나기 전에 알고 있는 사진을 모두 다시 받습니다 */
setInterval(function(){
  if(SHOT.legacy)return;
  Object.keys(SHOT.map).forEach(function(id){if(!shotFresh(id))SHOT.want[id]=1;});
  if(Object.keys(SHOT.want).length)shotPull();
},60000);
function blobUrl(id){
  /* 주소에 따옴표·꺾쇠 같은 글자가 섞여 화면에 코드가 심어지지 않게 먼저 지웁니다 */
  id=String(id==null?"":id).replace(/[<>"'`\\\\\\s]/g,"");
  if(!id)return "";
  if(id.indexOf("sb/")===0){
    if(SHOT.legacy)return shotPublic(id);
    if(SHOT.map[id]){ if(!shotFresh(id))shotAsk(id); return SHOT.map[id].u; }
    shotAsk(id);
    return shotHold(id);
  }''')
rep('''    GS.cache=d;GS.ready=true;
    fireSubs();''', '''    GS.cache=d;GS.ready=true;
    shotPrefetch();
    fireSubs();''')

open(OUT, "w", encoding="utf-8").write(s)
print("OK", OUT, len(s))
# 올리기용도 같이
shutil.copyfile(OUT, os.path.join(BASE, "올리기용", "index.html"))
print("올리기용/index.html = v115")
