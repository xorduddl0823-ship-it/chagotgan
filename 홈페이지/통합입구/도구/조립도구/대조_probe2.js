(function(){
  /* 세 제품 공통 부품을 똑같은 뼈대로 하나씩 붙여 보고, 실제로 그려진 모양 값을 모읍니다 */
  var host=document.createElement('div');
  host.className='wrap pc'; host.id='__pb';
  host.style.cssText='position:absolute;left:0;top:6000px;width:1280px';
  var cal=''; for(var i=0;i<35;i++) cal+='<div class="d'+(i===11?' today':'')+'"><div class="n'+(i%7===0?' sun':'')+'">'+(i+1)+(i===11?'<span class="todaytag">오늘</span>':'')+'</div><div class="amt">35,000원</div><div class="cars"><span>입 1</span></div><div class="memo">📝 메모</div></div>';
  host.innerHTML=
   '<section><div class="dashhead"><div class="dh-row"><h2>2026년 10월</h2></div><div class="sub2">오늘</div></div>'+
   '<div class="sums"><div class="sum"><span>칸</span><b>1원</b></div><div class="sum bad"><span>칸</span><b>2원</b></div><div class="sum"><span>칸</span><b>3</b></div><div class="sum"><span>칸</span><b>4</b></div></div>'+
   '<div class="dash homegrid"><div class="hgL"><div class="card"><h2>일정</h2>'+
     '<div class="tools" style="margin:0 0 4px"><button class="btn">‹ 지난달</button><span class="hint">2026년 10월</span></div>'+
     '<div class="dow"><span class="sun">일</span><span>월</span></div><div class="cal">'+cal+'</div><div class="legend"><span>합계 <b>1</b></span></div></div></div>'+
   '<div class="hgR"><div class="card"><h2>오늘 할 일 <span class="rt">오른쪽</span></h2><div class="todo">'+
     '<button><span class="cnt">0</span><span class="tx"><b>제목</b><span>설명</span></span><span class="go">›</span></button>'+
     '<button class="imp"><span class="cnt">1</span><span class="tx"><b><span class="imptag">중요</span>제목</b><span>설명</span></span><span class="go">›</span></button>'+
     '<button type="button" class="todoMore">할 일 <b>5건</b> 모두 보기</button></div></div>'+
     '<div class="card"><h2>수금</h2><div class="prog"><i style="width:40%"></i></div><div class="mini-row"><span>줄</span><b>1</b></div><div class="kv"><span>a</span><b>b</b></div></div></div></div>'+
   '<div class="tools"><input type="text" class="gq" placeholder="🔍 표에서 찾기"><select class="gs"><option>10개씩</option></select><button class="btn danger">선택항목 삭제</button><button class="btn primary">만들기</button></div>'+
   '<div class="gbody"><div class="tablebox"><table style="min-width:760px"><thead><tr><th class="c-chk"><input type="checkbox"></th><th class="c-name">이름 <span class="ar">↕</span></th><th>칸</th><th style="text-align:right">금액</th></tr></thead>'+
     '<tbody><tr><td class="c-chk"><input type="checkbox"></td><td class="c-name">이름</td><td>칸</td><td class="num">1,000</td></tr></tbody></table><div class="empty">없음</div></div>'+
   '<div class="pager"><button class="btn gfirst">처음</button><span class="pg">1 / 3 · 모두 9줄</span><button class="btn gnext">다음</button></div></div>'+
   '<div class="fld"><label class="f">이름표</label><input type="text"><select><option>a</option></select><textarea></textarea></div>'+
   '<span class="pill ok">쓰는 중</span><div class="hint">힌트</div><div class="row2"><div>a</div><div>b</div></div>'+
   '</section>';
  document.body.appendChild(host);
  var sh=document.createElement('div'); sh.className='sheet show'; sh.id='__sh';
  sh.innerHTML='<button class="sheetx">✕</button><h3>창 제목</h3><div class="sheetbtns"><button class="btn">닫기</button><button class="btn primary">확인</button></div>';
  document.body.appendChild(sh);
  var ak=document.createElement('div'); ak.className='askbox show'; ak.id='__ak';
  ak.innerHTML='<div class="msg">묻기</div><div class="row"><button class="btn">취소</button><button class="btn danger">네</button></div>';
  document.body.appendChild(ak);
  var to=document.createElement('div'); to.className='toast show'; to.id='__to'; to.textContent='알림'; document.body.appendChild(to);

  var P=['fontSize','fontWeight','color','backgroundColor','padding','margin','borderTop','borderRadius','display','gap','gridTemplateColumns','gridAutoRows','minHeight','height','width','textAlign','lineHeight','boxShadow','position','justifyContent','letterSpacing'];
  function st(el){ if(!el) return '없음'; var c=getComputedStyle(el); return P.map(function(k){return k+'='+c[k];}).join('; '); }
  var Q=function(s,root){ return (root||host).querySelector(s); };
  var R={};
  var list={
   'dashhead h2':'.dashhead h2','sub2':'.dashhead .sub2','sums':'.sums','sum':'.sum','sum span':'.sum span','sum b':'.sum b','sum.bad b':'.sum.bad b',
   'homegrid':'.dash.homegrid','card':'.card','card h2':'.card h2','card h2 .rt':'.card h2 .rt','tools':'.tools','tools .btn':'.tools .btn','tools .hint':'.tools .hint',
   'dow':'.dow','dow span':'.dow span','cal':'.cal','cal .d':'.cal .d','cal .d.today':'.cal .d.today','cal .n':'.cal .d .n','todaytag':'.todaytag','cal .amt':'.cal .amt','cal .cars':'.cal .cars','cal .memo':'.cal .memo','legend':'.legend',
   'todo':'.todo','todo button':'.todo button','todo .cnt':'.todo .cnt','todo .tx b':'.todo .tx b','todo .tx span':'.todo .tx>span','todo .go':'.todo .go','todo .imp':'.todo button.imp','imptag':'.imptag','todoMore':'.todoMore',
   'prog':'.prog','prog i':'.prog i','mini-row':'.mini-row','kv':'.kv',
   'gq':'.gq','gs':'.gs','btn.danger':'.tools .btn.danger','btn.primary':'.tools .btn.primary','tablebox':'.tablebox','table':'.tablebox table','th.c-chk':'th.c-chk','th.c-name':'th.c-name','th':'thead th:nth-child(3)','th .ar':'th .ar','td.c-name':'td.c-name','td':'tbody td:nth-child(3)','td.num':'td.num','checkbox':'th.c-chk input','empty':'.empty',
   'pager':'.pager','pager .btn':'.pager .btn','pager .pg':'.pager .pg',
   'label.f':'label.f','input':'.fld input','select':'.fld select','textarea':'.fld textarea','pill':'.pill','hint':'section>.hint','row2':'.row2'
  };
  Object.keys(list).forEach(function(k){ R[k]=st(Q(list[k])); });
  R['sheet']=st(sh); R['sheet h3']=st(sh.querySelector('h3')); R['sheetx']=st(sh.querySelector('.sheetx'));
  R['sheetbtns .btn']=st(sh.querySelector('.sheetbtns .btn')); R['sheetbtns .primary']=st(sh.querySelector('.btn.primary'));
  R['askbox']=st(ak); R['askbox .msg']=st(ak.querySelector('.msg')); R['askbox .danger']=st(ak.querySelector('.btn.danger'));
  R['toast']=st(to); R['body']=st(document.body);
  /* 실제 머리말 (있으면) */
  var app=document.getElementById('app');
  if(app){
    var keep={d:app.style.display, h:app.hidden, c:app.className};
    app.hidden=false; app.style.display='block'; app.className='wrap pc';
    var tabs=document.getElementById('tabs')||document.getElementById('nav');
    R['H header']=st(app.querySelector('header'));
    R['H brandrow']=st(app.querySelector('.brandrow'));
    R['H logo']=st(app.querySelector('header .logo'));
    R['H h1']=st(app.querySelector('header h1'));
    R['H sub']=st(app.querySelector('header .sub'));
    R['H ver']=st(app.querySelectorAll('header .sub')[1]);
    R['H bizname']=st(app.querySelector('.bizname'));
    R['H mini']=st(app.querySelector('.hdr-right .mini'));
    R['H who']=st(app.querySelector('header .who'));
    R['H mypglb']=st(app.querySelector('.who .mypglb'));
    R['H tabs']=st(tabs);
    var tb=tabs.querySelector('button')|| (function(){ var b=document.createElement('button'); b.setAttribute('aria-selected','true'); b.textContent='홈'; tabs.appendChild(b); return b; })();
    R['H tab']=st(tb);
    app.style.display=keep.d; app.hidden=keep.h; app.className=keep.c;
  }
  host.remove(); sh.remove(); ak.remove(); to.remove();
  return R;
})()
