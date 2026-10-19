/* 기사 앱 v30 도착 보내기 시험 (v29 시험 + 알림 «확인 중») (체크 방 · 10/19) — 진짜 서버 · 진짜 알림 안 씀
   쓰는 법: node 체크/도구/기사앱_시험_v29.js [기사앱.html]
   시험 서버는 서버 방에 제안한 약속대로 같은 rid 를 한 번만 처리해요. */
const fs=require('fs'), path=require('path');
const pw=require(fs.existsSync('/opt/node22/lib/node_modules/playwright')?'/opt/node22/lib/node_modules/playwright':'playwright');
const HTML=path.resolve(process.argv[2]||path.join(__dirname,'..','driver','index_v30.html'));
(async()=>{
  const R=[]; let pass=0, fail=0; const ok=(n,c,m)=>{ R.push((c?'통과':'실패')+' · '+n+(m?' — '+m:'')); c?pass++:fail++; };
  const S={log:[], rids:{}, exec:0, lose:0, err:0, how:'성공', errMsg:''};
  const b=await pw.chromium.launch(); const ctx=await b.newContext({viewport:{width:400,height:800}});
  await ctx.exposeBinding('__srv',(src,body)=>{
    S.log.push({fn:body.fn, rid:body.rid||''});
    if(body.fn!=='deliv_arrive') return {__err:'시험: 다른 창구'};
    if(S.err){ S.err--; return {__err:S.errMsg||'처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.'}; }
    if(body.rid && S.rids[body.rid]) return S.rids[body.rid];
    S.exec++;
    const out={result:{row:{차량번호:'12가3456', 목적지:'본사', 딜러:'김하늘', 발송결과:S.how, 발송방법:S.how==='성공'?'ATA':'', 발송사유:''}}};
    if(body.rid) S.rids[body.rid]=out;
    if(S.lose){ S.lose--; return {abort:true}; }
    return out; });
  await ctx.addInitScript(()=>{ const rf=window.fetch.bind(window);
    window.fetch=function(u,o){ u=String((u&&u.url)||u||''); if(/check-api/.test(u)){ let bd={}; try{ bd=JSON.parse(o&&o.body||'{}'); }catch(e){}
      return window.__srv(bd).then(x=>{ if(x&&x.abort) throw new TypeError('Failed to fetch'); return new Response(JSON.stringify(x),{status:200}); }); }
      if(/^https?:/.test(u)) return Promise.reject(new TypeError('시험: 바깥 연결 안 함')); return rf(u,o); }; });
  await ctx.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+HTML); await p.waitForTimeout(800);
  const prep=()=>p.evaluate(()=>{ me={pin:'TEST', name:'박기사'}; resetS(); S.plate='12가3456'; S.dealer='김하늘'; S.tel='010-0000-0010'; S.dest='본사'; });
  const modalTxt=()=>p.evaluate(()=>{ const m=document.querySelector('.modal-box, #modal, .modal'); return m?m.innerText:document.body.innerText.slice(-300); });
  // 1 답을 잃음 → 다시 보내기 → 같은 rid · 기록 · 알림 한 번
  await prep(); S.lose=1; await p.evaluate(()=>doSend(false)); await p.waitForTimeout(600);
  const t1=await modalTxt(); const again=await p.$('#m-again');
  ok('보내지 못했어요 창에 «다시 보내기»', /보내지 못했어요/.test(t1) && !!again);
  if(again){ await again.click(); await p.waitForTimeout(600); }
  const t2=await modalTxt();
  ok('다시 보내기 → 보냈어요', /보냈어요/.test(t2), t2.split('\n')[0]);
  ok('두 요청이 같은 rid(24자)', S.log.length===2 && S.log[0].rid===S.log[1].rid && /^[a-z0-9]{24}$/.test(S.log[0].rid));
  ok('서버가 처리한 수 1번(기록 · 알림 한 번)', S.exec===1, '처리 '+S.exec+'번');
  // 2 다음 차는 새 rid
  await p.evaluate(()=>{ closeModal(); }); await prep(); S.log.length=0; await p.evaluate(()=>doSend(false)); await p.waitForTimeout(500);
  ok('다음 차량은 새 rid', S.log.length===1 && !S.rids.__x && S.log[0].rid && Object.keys(S.rids).length===2);
  // 3 «그래도 보내기»(force)는 새 rid
  const before=Object.keys(S.rids).length; await p.evaluate(()=>doSend(true)); await p.waitForTimeout(500);
  ok('«그래도 보내기»는 새 rid', Object.keys(S.rids).length===before+1);
  // 4 서버 거절 → 다시 보내기 창
  await prep(); S.err=1; await p.evaluate(()=>doSend(false)); await p.waitForTimeout(500);
  const r0=S.log.length; await p.click('#m-no'); await p.evaluate(()=>{ S.dest='물류센터'; check(); doSend(false); }); await p.waitForTimeout(500);
  ok('닫고 내용을 고쳐 보내면 새 rid(예전 답이 돌아오지 않게)', S.log.length===r0+1 && S.log[S.log.length-1].rid!==S.log[r0-1].rid);
  await prep(); S.err=1; await p.evaluate(()=>doSend(false)); await p.waitForTimeout(500);
  ok('서버가 거절해도 «보냈어요»로 안 보임 (다시)', /보내지 못했어요/.test(await modalTxt()) && !!(await p.$('#m-again')));
  // v30: 알림 «확인 중»
  await p.evaluate(()=>closeModal()); await prep(); S.how='확인 중'; await p.evaluate(()=>doSend(false)); await p.waitForTimeout(500);
  const u1=await modalTxt(); ok('도착: 알림 확인 중 → «기록은 됐어요 — 알림은 확인 중» · 다시 보내기 없음', /기록은 됐어요 — 알림은 확인 중/.test(u1) && !(await p.$('#m-again')), u1.split('\n')[0]);
  await p.evaluate(()=>closeModal()); await prep(); S.how='성공'; S.err=1; S.errMsg='확인 중이에요. 보낸 기록에서 확인해 주세요.'; await p.evaluate(()=>doSend(false)); await p.waitForTimeout(500);
  const u2=await modalTxt(); ok('같은 일이 확인 중(오류 글) → 같은 창 · 다시 보내기 없음', /알림은 확인 중/.test(u2) && !(await p.$('#m-again')));
  S.errMsg='';
  // 시험 5: 기록 저장 실패 ↔ 발송 실패
  await p.evaluate(()=>closeModal()); await prep(); S.how='실패'; await p.evaluate(()=>doSend(false)); await p.waitForTimeout(500);
  ok('시험 5: 기록은 저장 · 알림만 실패 → «기록은 됐지만 알림을 못 보냈어요»', /기록은 됐지만 알림을 못 보냈어요/.test(await modalTxt()));
  await p.evaluate(()=>closeModal()); await prep(); S.how='성공'; S.err=1; await p.evaluate(()=>doSend(false)); await p.waitForTimeout(500);
  ok('시험 5: 기록 저장 실패 → «보내지 못했어요» + 다시 보내기', /보내지 못했어요/.test(await modalTxt()) && !!(await p.$('#m-again')));
  ok('기록 칩: «확인 중»', await p.evaluate(()=>sendTag({발송결과:'확인 중', 딜러연락처:'010'})[0]==='확인 중'));
  ok('스크립트 오류 없음', errs.length===0, errs.slice(0,2).join(' | '));
  await b.close(); console.log(R.join('\n')); console.log('\n실행 '+(pass+fail)+' · 통과 '+pass+' · 실패 '+fail+' · 건너뜀 0'); process.exit(fail?1:0);
})();
