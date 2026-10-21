/* ═══════ 알림 › 문자 · 알림톡 보내는 업체 (관리 v4.9.1 · 대표님 10/21) ═══════
   워시 · 체크를 따로 «솔라피 / 비즈고» 중에서 골라요. 바꾸면 이후 보내는 것부터 적용돼요.
   서버 창구(이름 · 요청 · 답 모양)는 서버 방이 알려 줘요. 받으면 아래 SVND_API 두 이름만 채워요.
   비어 있으면 화면 틀만 보이고 바꾸기 단추는 잠겨요 — 이 화면은 서버 함수를 만들지 않아요.
   서버가 거절하면(예: «비즈고 준비가 안 됐어요») 그 글을 그대로 보여 줘요. */
var SVND_API = {get:"", set:""};
var SVND = {busy:false, err:"", rows:null, note:""};
var SVND_PROD = [["wash","워시"],["check","체크"]];
var SVND_NAME = {solapi:"솔라피", bizgo:"비즈고"};
function svndRow(r, p){   /* 답 모양이 정해지기 전이라 흔한 꼴을 모두 받아요 — 정해지면 이 함수만 좁혀요 */
  var x = r && (r[p] || (Array.isArray(r.list)?r.list.filter(function(y){ return y && y.product===p; })[0]:null));
  if(typeof x==="string") x = {vendor:x};
  x = x || {};
  return {vendor:String(x.vendor||x.provider||""), at:String(x.at||x.updatedAt||x.updated_at||""), by:String(x.by||x.who||x.updatedBy||"")};
}
function svndLoad(){
  if(!SVND_API.get){ SVND.rows=null; svndDraw(); return; }
  if(SVND.busy) return; SVND.busy=true;
  api(SVND_API.get,[]).then(function(r){ SVND.err=""; SVND.rows={}; SVND_PROD.forEach(function(p){ SVND.rows[p[0]]=svndRow(r,p[0]); }); },
    function(e){ SVND.rows=null; SVND.err=emsg(e,"불러오지 못했어요. 다시 시도해 주세요."); })
  .then(function(){ SVND.busy=false; svndDraw(); });
}
function svndDraw(){
  var host=$("sendVnd"); if(!host) return;
  var ready=!!(SVND_API.get && SVND_API.set && SVND.rows);
  host.innerHTML='<div class="card"><h2>문자 · 알림톡 보내는 업체</h2>'+
    '<p class="lead" style="margin:2px 0 12px">워시와 체크가 문자 · 알림톡을 어느 업체로 보낼지 따로 골라요. 바꾸면 이후 보내는 것부터 적용돼요.</p>'+
    (!SVND_API.get?'<div class="hint" style="margin:0 0 10px">서버 준비가 끝나면 여기서 바꿀 수 있어요. 지금은 바꿀 수 없어요.</div>':'')+
    (SVND.err?'<div class="hint" style="margin:0 0 10px;color:var(--stop)">'+esc(SVND.err)+'</div>':'')+
    (SVND.note?'<div class="hint" style="margin:0 0 10px;color:var(--stop)">'+esc(SVND.note)+'</div>':'')+
    SVND_PROD.map(function(p){ var r=(SVND.rows&&SVND.rows[p[0]])||{vendor:"",at:"",by:""}, cur=r.vendor;
      return '<div class="svnd-row"><b class="pn">'+esc(p[1])+'</b>'+
        '<span class="now">지금 <span class="cgg-st '+(cur?"done":"run")+'">'+esc(SVND_NAME[cur]||cur||"—")+'</span></span>'+
        '<span class="at">'+(r.at?esc(dt(r.at,true)):"바꾼 기록 없음")+(r.by?' · '+esc(r.by):'')+'</span>'+
        '<span class="sw" role="group" aria-label="'+esc(p[1])+' 보내는 업체">'+["solapi","bizgo"].map(function(v){
          return '<button type="button" class="btn sm'+(cur===v?' primary':'')+'" data-svnd="'+p[0]+'" data-v="'+v+'" aria-pressed="'+(cur===v)+'"'+(ready&&cur!==v?'':' disabled')+'>'+SVND_NAME[v]+'</button>'; }).join("")+'</span></div>'; }).join("")+
    '</div>';
  Array.prototype.forEach.call(host.querySelectorAll("[data-svnd]"),function(b){
    b.onclick=function(){ var p=b.getAttribute("data-svnd"), v=b.getAttribute("data-v"), pn=SVND_PROD.filter(function(x){ return x[0]===p; })[0][1];
      var cur=(SVND.rows&&SVND.rows[p]&&SVND.rows[p].vendor)||"";
      confirmBox(pn+" 문자 업체를 "+SVND_NAME[v]+"로 바꿔요",
        "제품: "+pn+"\n지금: "+(SVND_NAME[cur]||cur||"—")+"\n바꿀 업체: "+SVND_NAME[v]+"\n적용: 이후 보내는 것부터 적용돼요", SVND_NAME[v]+"로 바꾸기", false, function(){
        SVND.note="";
        api(SVND_API.set,[p,v]).then(function(){ toast(pn+" 문자 업체를 "+SVND_NAME[v]+"로 바꿨어요"); svndLoad(); },
          function(e){ SVND.note=emsg(e,"바꾸지 못했어요. 다시 시도해 주세요."); toast(SVND.note,true); svndDraw(); }); }); }; });
}
