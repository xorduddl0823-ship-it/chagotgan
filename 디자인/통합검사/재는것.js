/* ═══════════════════════════════════════════════════════════════════
   차곳간 통합 검사표 — 재는 것 (2026-10-18, 디자인 방)
   한 화면(document)을 받아 «두 제품이 같아야 하는 것» 30가지를 숫자로 재요. 눈이 아니라 숫자로 «같음 ✅»을 확인해요.
   쓰는 곳: 디자인/통합검사/검사.js (명령 줄) · 디자인/메뉴찾기_합친모양.html (미리보기 안에서 바로 잼)
   재는 화면: 홈, 넓은 화면(1400). 공통 이름표(cgg-…)만 보므로 판이 바뀌어도 그대로 써요.
   ═══════════════════════════════════════════════════════════════════ */
function cggMeasure(doc){
  var win=doc.defaultView;
  function q(s){ try{ return doc.querySelector(s); }catch(e){ return null; } }
  function qa(s){ try{ return Array.prototype.slice.call(doc.querySelectorAll(s)); }catch(e){ return []; } }
  function vis(e){ if(!e) return false; var r=e.getBoundingClientRect(); if(!(r.width>0&&r.height>0)) return false; var s=win.getComputedStyle(e); return s.visibility!=="hidden"&&s.display!=="none"; }
  function R(e){ return e.getBoundingClientRect(); }
  function px(n){ return Math.round(n)+"px"; }
  function fs(e){ if(!e) return "없음"; var s=win.getComputedStyle(e); return parseFloat(s.fontSize)+"px · "+s.fontWeight; }
  function first(list){ for(var i=0;i<list.length;i++){ var e=q(list[i]); if(e&&vis(e)) return e; } return null; }
  function uniq(a){ return a.filter(function(v,i){ return a.indexOf(v)===i; }); }
  var out=[];
  function put(k,label,v,group){ out.push({k:k,label:label,v:String(v),group:group}); }
  /* 1 머리말 */
  var top=q(".cgg-top"), right=q(".cgg-right");
  var hh=top?R(top).height:0; if(hh<1&&right) hh=R(right).height;
  put("hdr_h","머리말 높이",px(hh),"머리말");
  var ci=q(".cgg-brand .cgg-ci"); put("logo","로고 크기",ci?px(R(ci).width)+" × "+px(R(ci).height):"없음","머리말");
  var ciImg=ci&&ci.querySelector("img"); put("logo_kind","로고 모양",ci?(ciImg?"그림":"글자 «"+ci.textContent.trim().slice(0,2)+"»"):"없음","머리말");
  put("brand_fs","제품 이름 글자",fs(first([".cgg-brand b",".cgg-brand h1"])),"머리말");
  var bn=first([".cgg-brand b",".cgg-brand h1"]); put("brand_txt","제품 이름 꼴",bn?bn.textContent.trim().replace(/(워시|체크|딜러|관리)/,"○○").replace(/\(.+\)/,""):"없음","머리말");
  put("brand_sub","제품 아래 줄 글자",fs(first([".cgg-brand small",".cgg-brand .sub"])),"머리말");
  var biz=first([".cgg-hdr-biz",".cgg-biz"]), bizb=biz&&(biz.querySelector("b,strong,h1,h2,.nm")||biz.firstElementChild);
  put("biz_fs","업체명 글자",fs(bizb),"머리말");
  /* 업체명 잘림 (대표님 10/18 — 어느 폭에서도 업체명 전체가 보여야 해요) */
  var cut="안 보임"; if(bizb&&vis(bizb)){ var cs=win.getComputedStyle(bizb), lh=parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.3;
    cut=(bizb.scrollWidth>bizb.clientWidth+1||cs.textOverflow==="ellipsis"&&bizb.scrollWidth>bizb.clientWidth||R(bizb).height>lh*2+2||R(bizb).right>win.innerWidth)?"잘림":"안 잘림"; }
  put("biz_cut","업체명 잘림",cut,"머리말");
  var hdr=q(".cgg-hdr"); put("biz_x","업체명 자리 (왼쪽에서)",biz&&hdr?px(R(biz).left-R(hdr).left):"없음","머리말");
  var bs=right?Array.prototype.slice.call(right.querySelectorAll("button,select,.cgg-hb,a")).filter(function(b){ return vis(b)&&!b.closest(".cgg-hfind")&&!b.closest(".cgg-drop"); }):[];
  bs=bs.filter(function(b){ return !bs.some(function(o){ return o!==b&&o.contains(b); }); }).sort(function(x,y){ return R(x).left-R(y).left; });
  put("hb_h","단추 높이",uniq(bs.map(function(b){ return px(R(b).height); })).join(" / ")||"없음","단추");
  put("hb_fs","단추 글자",uniq(bs.map(function(b){ return parseFloat(win.getComputedStyle(b).fontSize)+"px · "+win.getComputedStyle(b).fontWeight; })).join(" / ")||"없음","단추");
  var gaps=[]; for(var i=1;i<bs.length;i++){ var g=Math.round(R(bs[i]).left-R(bs[i-1]).right); if(g>=0&&g<40) gaps.push(g+"px"); }
  put("hb_gap","단추 간격",uniq(gaps).join(" / ")||"없음","단추");
  put("hb_order","단추 차례",bs.map(function(b){ var t=(b.tagName==="SELECT"?"자동 새로고침":(b.textContent||"").trim()); if(/저장/.test(t)) return "저장 표시"; if(/^더보기/.test(t)) return "더보기 ▾"; if(/▾/.test(t)) return /마이페이지/.test(t)?"마이페이지 ▾":"이름 ▾"; if(/초마다|분마다|자동/.test(t)) return "자동 새로고침"; return t.replace(/[0-9]+/g,"#"); }).filter(function(t){ return t!=="현장 화면"; }).join(" · ")||"없음","단추");   /* «현장 화면»은 워시에만 있는 단추로 정해서 차례 비교에서 빼요 */
  /* 2 메뉴 · 본문 */
  var nav=q(".cgg-nav"), app=q(".cgg-app"), side=app&&/lay-side|lay-icon/.test(app.className)&&win.innerWidth>=1000;
  put("nav","메뉴 줄",nav?(side?"왼쪽 "+px(R(q(".cgg-hdr")).width):"위 "+px(R(nav).height)):"없음","본문");
  var main=q(".cgg-main"), ms=main&&win.getComputedStyle(main);
  put("main_pad","본문 옆 여백",ms?px(parseFloat(ms.paddingLeft))+" / "+px(parseFloat(ms.paddingRight)):"없음","본문");
  put("main_max","본문 최대 폭",ms?(ms.maxWidth==="none"?"끝까지":ms.maxWidth):"없음","본문");
  var mt0=main?R(main).top:0, h1=qa(".cgg-main h1,.cgg-main h2").filter(function(e){ return vis(e)&&R(e).top<mt0+520; }).sort(function(x,y){ return parseFloat(win.getComputedStyle(y).fontSize)-parseFloat(win.getComputedStyle(x).fontSize); })[0]||null;
  put("h1_fs","첫 줄 제목 글자",fs(h1),"본문");
  put("h1_kind","첫 줄 제목 꼴",h1?(/\d{4}년\s*\d+월$/.test(h1.textContent.trim())?"날짜만":"한 줄 요약"):"없음","본문");
  /* 3 할 일 */
  var acts=qa(".cgg-act").filter(vis); put("todo_n","할 일 카드 수",acts.length+"장","할 일");
  put("todo_h","할 일 카드 높이",acts[0]?px(R(acts[0]).height):"없음","할 일");
  var all=qa(".cgg-main button,.cgg-main a,.cgg-main .btn").filter(function(e){ return vis(e)&&/모두 보기/.test(e.textContent)&&/할 일/.test(e.textContent); })[0];
  var box=acts[0]&&acts[0].parentElement, where="없음";
  if(all&&box){ var a=R(all), b=R(box); where=(a.top>=b.bottom-2?"아래":"위")+" · "+(a.width>b.width*0.5?"넓은 줄":"오른쪽 글자"); }
  put("todo_all","«할 일 모두 보기» 자리",where,"할 일");
  /* 4 숫자 칸 */
  var kp=qa(".cgg-kpi").filter(vis);
  put("kpi_n","숫자 칸 수",kp.length+"칸","숫자 칸");
  put("kpi_sp","작은 그래프 있는 칸",kp.filter(function(k){ return k.querySelector("svg"); }).length+" / "+kp.length,"숫자 칸");
  put("kpi_tr","비교 줄(지난주 · 지난달) 있는 칸",kp.filter(function(k){ return k.querySelector(".tr"); }).length+" / "+kp.length,"숫자 칸");
  put("kpi_fs","숫자 글자",fs(kp[0]&&kp[0].querySelector("strong")),"숫자 칸");
  /* 5 달력 · 오른쪽 칸 */
  var cells=qa(".cgg-cal .d:not(.e),.cal .d").filter(function(e){ return vis(e)&&/\d/.test(e.textContent); });
  put("cal_h","달력 칸 높이",cells[0]?px(R(cells[0]).height):"없음","달력");
  put("cal_amt","달력 칸에 금액",cells.some(function(c){ var a=c.querySelector(".amt"); return a&&/\d/.test(a.textContent); })?"보임":"안 보임","달력");
  var grid=cells[0]&&cells[0].parentElement, cc=grid; for(var c2=0;c2<6&&cc&&!/(^|\s)(cgg-card|card)(\s|$)/.test(String(cc.className));c2++) cc=cc.parentElement;
  var lg=cc?Array.prototype.slice.call(cc.querySelectorAll(".lg,[class*=legend]")).filter(vis)[0]:null;
  put("cal_lg","달력 범례 자리",lg&&grid?(R(lg).top>=R(grid).bottom-2?"아래":"위"):"없음","달력");
  var mt=qa(".cgg-main b,.cgg-main h3,.cgg-main h2,.cgg-main .ttl,.cgg-main div").filter(function(e){ return vis(e)&&e.children.length<=2&&/^이번 달 입금/.test((e.textContent||"").trim())&&(e.textContent||"").trim().length<20; })[0];
  put("side_fs","오른쪽 칸 제목 글자",fs(mt),"오른쪽 칸");
  var card=mt; for(var j=0;j<6&&card&&!/(^|\s)(cgg-card|card)(\s|$)/.test(String(card.className));j++) card=card.parentElement;
  var bar=card?Array.prototype.slice.call(card.querySelectorAll("*")).filter(function(e){ var r=R(e); return vis(e)&&r.height>=4&&r.height<=14&&r.width>120; })[0]:null;
  put("side_bar","입금 막대 높이",bar?px(R(bar).height):"없음","오른쪽 칸");
  return out;
}
/* 두 결과를 견주기: 같은 것 ✅, 다른 것 ❌ */
function cggCompare(a, b){ return a.map(function(x,i){ var y=b[i]||{v:"없음"}; return {k:x.k,label:x.label,group:x.group,a:x.v,b:y.v,same:x.v===y.v}; }); }
if(typeof module!=="undefined") module.exports={cggMeasure:cggMeasure,cggCompare:cggCompare};
