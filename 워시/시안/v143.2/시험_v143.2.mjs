import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const SP=process.argv[2], V=process.argv[3]||'143.2';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
let pass=0,fail=0; const out=[]; const ok=(n,c,i='')=>{(c?pass++:fail++);const l=(c?'통과':'실패')+' | '+n+(i?' | '+i:'');out.push(l);console.log(l);};
async function page(q='',w=1366,h=1000){const p=await b.newPage({viewport:{width:w,height:h}});p._errs=[];p.on('pageerror',e=>p._errs.push(String(e)));
  await p.goto('file://'+SP+'/pv'+V+'/t.html'+q);await p.waitForTimeout(2500);return p;}
const W=(p,ms)=>p.waitForTimeout(ms);
// ① 띠 닫기 · 자세히 · 다시 열기 · 버리기 · 다시 하기
{ const p=await page('',390,844);
  const r=await p.evaluate(async()=>{ const w=__t.recs().find(x=>x.status==='입고'); window.__FAIL=1;
    await __t.saveRec(Object.assign({},w,{memo:'띠 시험'})).catch(()=>0); await new Promise(r=>setTimeout(r,300));
    const b=document.getElementById('wSaveBar'); return {txt:b&&b.innerText,close:!!document.getElementById('wSaveClose'),id:w.id}; });
  ok('① 띠에 닫기 단추',r.close,(r.txt||'').split('\n')[0]);
  await p.evaluate(()=>document.getElementById('wSaveMore').click()); await W(p,200);
  const more=await p.evaluate(()=>{const l=document.getElementById('wSaveList');return l&&!l.hidden?l.innerText:'';});
  ok('① 자세히 → 기록 종류 · 까닭',/입고 · 출고 기록/.test(more)&&/인터넷 연결이 끊겼어요/.test(more),more.replace(/\n/g,' / '));
  await p.evaluate(()=>document.getElementById('wSaveClose').click()); await W(p,300);
  const st=await p.evaluate(()=>({hid:document.getElementById('wSaveBar').hidden,db:document.getElementById('dbState').textContent}));
  ok('① 닫으면 띠 숨김 · 머리말은 «저장 안 됨» 그대로',st.hid&&/안 됨/.test(st.db),JSON.stringify(st));
  await p.evaluate(()=>document.getElementById('dbState').click()); await W(p,300);
  ok('① 머리말 «저장 안 됨»을 누르면 띠가 다시 열림',await p.evaluate(()=>!document.getElementById('wSaveBar').hidden));
  await p.evaluate(()=>{window.__CALLS=[];document.getElementById('wSaveRetry').click();}); await W(p,1200);
  const rt=await p.evaluate(id=>({bar:!!document.getElementById('wSaveBar'),memo:(__PV.DB().intakes[id]||{}).memo,n:Object.values(__PV.DB().intakes).filter(x=>x.id===id).length}),r.id);
  ok('① 다시 하기 → 저장 · 띠 사라짐 · 같은 기록 한 건',!rt.bar&&rt.memo==='띠 시험'&&rt.n===1,JSON.stringify(rt));
  // 버리기
  await p.evaluate(async()=>{ const w=__t.recs().find(x=>x.status==='입고'); window.__FAIL=1; await __t.saveRec(Object.assign({},w,{memo:'버릴 것'})).catch(()=>0); });
  await W(p,300); await p.evaluate(()=>document.getElementById('wSaveDrop').click()); await W(p,300);
  const ask=await p.evaluate(()=>{const a=document.getElementById('askbox');return a&&a.classList.contains('show')?a.innerText:'';});
  await p.evaluate(()=>document.getElementById('askYes').click()); await W(p,1200);
  const dr=await p.evaluate(()=>({bar:!!document.getElementById('wSaveBar'),db:document.getElementById('dbState').textContent,left:__t.W().fail&&Object.keys(__t.W().fail).length}));
  ok('① 버리기 → 확인 창 → 띠 사라짐 · 대기 0건',/버릴까요/.test(ask)&&!dr.bar&&dr.left===0&&!/안 됨/.test(dr.db),JSON.stringify(dr));
  ok('① 페이지 오류 없음',!p._errs.length,p._errs.join(' | ')); await p.close(); }
// ② 거래처 엑셀 12,680줄 — 묶어 넣기
{ const p=await page('',1440,1000);
  await p.evaluate(()=>{const S=__t.SS();S.setSub='parties';__t.tab('settings');}); await W(p,1200);
  await p.evaluate(()=>{window.__RIDS=[];});
  await p.evaluate(()=>document.getElementById('wPtCsv').click()); await W(p,600);
  const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.evaluate(()=>{const b=[...document.querySelectorAll('.cgg-dim:not([hidden]) button')].find(x=>x.textContent.trim()==='파일 고르기');b.click();})]);
  await fc.setFiles(SP+'/t1432/dealerList.csv'); await W(p,4000);
  const pv=await p.evaluate(()=>{const d=document.querySelector('.cgg-dim:not([hidden]) .cgg-dlg')||document.body;return d.innerText.slice(0,400);});
  const t0=Date.now();
  await p.evaluate(()=>{const b=document.querySelector('.cgg-dim:not([hidden]) [data-dok]');b&&b.click();});
  let last=''; for(let i=0;i<120;i++){ await W(p,500); const s=await p.evaluate(()=>{const g=document.getElementById('csuProg');return g&&!g.hidden?g.textContent:'끝';}); last=s; if(s==='끝')break; }
  const sec=((Date.now()-t0)/1000).toFixed(1);
  const R=await p.evaluate(()=>{const R=window.__RIDS||[];const DB=__PV.DB();return {many:R.filter(x=>x.fn==='apiSetMany').length,one:R.filter(x=>x.fn==='apiSet').length,
    comps:Object.values(DB.companies||{}).filter(x=>/^시험상사/.test(x.name)).length,dl:Object.values(DB.dealers||{}).filter(x=>/^딜러\d{5}$/.test(x.name)).length,
    dupKim:Object.values(DB.dealers||{}).filter(x=>x.name==='김딜러').length,toast:(document.querySelector('#toast.show,.cgg-toast:not([hidden])')||{}).textContent||''};});
  ok('② 미리보기에 «이미 있음» 줄이 잡힘',/이미 있음/.test(pv),pv.replace(/\n/g,' ').slice(0,160));
  ok('② 새 상사 839곳 · 새 딜러 12,679명 모두 들어감',R.comps===839&&R.dl===12679,JSON.stringify(R));
  ok('② 300줄씩 묶어 보냄(서버 부르기 약 46번 · 한 줄씩 0번)',R.many>=44&&R.many<=50&&R.one===0,'묶음 '+R.many+'번 · 한 줄 '+R.one+'번 · '+sec+'초');
  ok('② 이미 있던 딜러는 두 번 안 들어감',R.dupKim===1);
  ok('② 페이지 오류 없음',!p._errs.length,p._errs.slice(0,2).join(' | ')); await p.close(); }

// ③ 진짜 까닭 — 답 못 받음(인터넷) / 서버 거절(영어 원문)
{ const p=await page('',390,844);
  const r=await p.evaluate(async()=>{ const w=__t.recs().find(x=>x.status==='입고'); window.__LOSE={apiSet:1};
    await __t.saveRec(Object.assign({},w,{memo:'망'})).catch(()=>0); await new Promise(r=>setTimeout(r,300));
    const a=Object.values(__t.W().fail)[0]||{}; window.__FAILEN=1;
    const w2=__t.recs().filter(x=>x.status==='입고')[1]; await __t.saveRec(Object.assign({},w2,{memo:'거절'})).catch(()=>0); await new Promise(r=>setTimeout(r,300));
    const b=Object.values(__t.W().fail).find(x=>x.id===w2.id)||{}; return {a:a.why,b:b.why,raw:b.raw}; });
  ok('③ 답을 못 받으면 «인터넷 연결이 끊겼거나 서버 답을 받지 못했어요»',/인터넷 연결이 끊겼거나/.test(r.a||''),r.a);
  ok('③ 서버가 거절하면 «서버가 저장을 받지 않았어요(인터넷 문제 아님)» + 서버 글',/서버가 저장을 받지 않았어요/.test(r.b||'')&&/row-level/.test(r.raw||''),r.b+' / '+r.raw);
  await p.evaluate(()=>{window.__FAILEN=1;document.getElementById('wSaveRetry').click();}); await W(p,1200);
  const t=await p.evaluate(()=>{const x=document.querySelector('#toast.show,.cgg-toast:not([hidden])');return x?x.textContent:'';});
  ok('③ 다시 하기가 또 안 되면 알림 글도 진짜 까닭',/서버가 저장을 받지 않았어요|인터넷 연결이 끊겼거나/.test(t)&&!/인터넷 연결을 확인해 주세요$/.test(t),t);
  await p.evaluate(()=>document.getElementById('wSaveClose').click()); await W(p,300);
  const c=await p.evaluate(()=>{const c=document.getElementById('wSaveChip');return c&&!c.hidden?{t:c.textContent,h:c.getBoundingClientRect().height}:null;});
  ok('③ 폰: 닫으면 아래 «저장 못 한 기록 N건» 단추(42px 이상)',!!c&&c.h>=42,JSON.stringify(c));
  await p.evaluate(()=>document.getElementById('wSaveChip').click()); await W(p,300);
  ok('③ 그 단추로 띠 다시 열림',await p.evaluate(()=>!document.getElementById('wSaveBar').hidden&&document.getElementById('wSaveChip').hidden));
  const hs=await p.evaluate(()=>['wSaveClose','wSaveRetry','wSaveMore','wSaveDrop'].map(id=>Math.round(document.getElementById(id).getBoundingClientRect().height)));
  ok('③ 띠 단추 높이 42px 이상',hs.every(h=>h>=42),hs.join(','));
  ok('③ 페이지 오류 없음',!p._errs.length,p._errs.join(' | ')); await p.close(); }
// ④ 알림 켜기/끄기
{ const p=await page('',1440,1000);
  const h=await p.evaluate(()=>{const w=document.querySelector('#vHome .wal');const t=w&&w.nextElementSibling;return {has:!!w,rows:w?w.querySelectorAll('.wal-row').length:0,next:t?t.innerText.slice(0,10):''};});
  ok('④ 홈 «오늘 할 일» 바로 위에 입고 · 출고 알림 두 줄',h.has&&h.rows===2&&/오늘 할 일/.test(h.next),JSON.stringify(h));
  await p.evaluate(()=>document.querySelector('#vHome .wal [data-wal="autoIn"]').click()); await W(p,300);
  const ask=await p.evaluate(()=>{const a=document.getElementById('askbox');return a&&a.classList.contains('show')?a.innerText:'';});
  ok('④ 끄기 전에 확인 창',/입고 알림을 끌까요/.test(ask),ask.replace(/\n/g,' ').slice(0,60));
  await p.evaluate(()=>document.getElementById('askYes').click()); await W(p,1200);
  const r=await p.evaluate(()=>{const c=(__PV.DB().settings||{}).config||{};const w=document.querySelector('#vHome .wal');const row=w&&w.querySelector('.wal-row');
    return {saved:(c.send||{}).autoIn,off:row&&row.classList.contains('off'),txt:row&&row.innerText.replace(/\n/g,' ')};});
  ok('④ 끄면 서버 설정에 저장 · 줄이 «꺼져 있어요»',r.saved===false&&r.off&&/꺼져 있어요/.test(r.txt),JSON.stringify(r));
  const sw=await p.evaluate(()=>Math.round(document.querySelector('#vHome .wal-sw').getBoundingClientRect().height));
  ok('④ 스위치 누르는 칸 42px',sw>=42,sw+'px');
  await p.evaluate(()=>{const b=document.getElementById('btnMode');b&&b.click();}); await W(p,900);
  const f=await p.evaluate(()=>{const s=document.getElementById('vFHome');const w=s&&s.querySelector(':scope > .wal');return {has:!!w,vis:!!(w&&w.offsetParent),off:!!(w&&w.querySelector('.wal-row.off'))};});
  ok('④ 현장 화면에도 같은 줄(꺼진 상태 그대로)',f.has&&f.vis&&f.off,JSON.stringify(f));
  ok('④ 페이지 오류 없음',!p._errs.length,p._errs.join(' | ')); await p.close(); }
// ② 멈추기 — 지금 묶음까지 · 상사만 있고 딜러 없는 반쪽 없음
{ const p=await page('',1440,1000);
  await p.evaluate(()=>{const S=__t.SS();S.setSub='parties';__t.tab('settings');}); await W(p,1200);
  await p.evaluate(()=>document.getElementById('wPtCsv').click()); await W(p,600);
  const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.evaluate(()=>{const b=[...document.querySelectorAll('.cgg-dim:not([hidden]) button')].find(x=>x.textContent.trim()==='파일 고르기');b.click();})]);
  await fc.setFiles(SP+'/t1432/dealerList.csv'); await W(p,4000);
  await p.evaluate(()=>{const b=document.querySelector('.cgg-dim:not([hidden]) [data-dok]');b&&b.click();}); await W(p,700);
  const sb=await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent==='멈추기');if(b){b.click();return true;}return false;});
  for(let i=0;i<60;i++){ await W(p,500); if(await p.evaluate(()=>{const g=document.getElementById('csuProg');return !g||g.hidden||!g.isConnected;}))break; }
  const R=await p.evaluate(()=>{const DB=__PV.DB();const cs=Object.values(DB.companies||{}).filter(x=>/^시험상사/.test(x.name)).map(x=>x.name);
    const ds=Object.values(DB.dealers||{}).filter(x=>/^딜러\d{5}$/.test(x.name));const have={};ds.forEach(d=>have[d.company]=1);
    return {comps:cs.length,dealers:ds.length,orphan:cs.filter(n=>!have[n]).length,toast:(document.querySelector('#toast.show,.cgg-toast:not([hidden])')||{}).textContent||''};});
  ok('② [멈추기] 단추가 넣는 중에 눌림',sb);
  ok('② 멈추면 일부만 넣고 «멈췄어요 · 남은 줄은 다시 올리면 이어서»',R.dealers>0&&R.dealers<12679&&/멈췄어요/.test(R.toast),JSON.stringify(R));
  ok('② 상사만 있고 그 딜러는 없는 반쪽 없음',R.orphan===0,'반쪽 '+R.orphan+'곳');
  ok('② 페이지 오류 없음',!p._errs.length,p._errs.slice(0,2).join(' | ')); await p.close(); }

// ② 묶음 하나가 실패 → 하나씩 다시 보내지 않음 · 못 넣은 줄 표에 까닭
{ const p=await page('',1440,1000);
  await p.evaluate(()=>{const S=__t.SS();S.setSub='parties';__t.tab('settings');}); await W(p,1200);
  await p.evaluate(()=>document.getElementById('wPtCsv').click()); await W(p,600);
  const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.evaluate(()=>{const b=[...document.querySelectorAll('.cgg-dim:not([hidden]) button')].find(x=>x.textContent.trim()==='파일 고르기');b.click();})]);
  await fc.setFiles(SP+'/t1432/dealerList.csv'); await W(p,4000);
  await p.evaluate(()=>{window.__RIDS=[];window.__FAIL=1;const b=document.querySelector('.cgg-dim:not([hidden]) [data-dok]');b&&b.click();});
  for(let i=0;i<80;i++){ await W(p,500); if(await p.evaluate(()=>{const g=document.getElementById('csuProg');return !g||g.hidden||!g.isConnected;}))break; }
  await W(p,800);
  const R=await p.evaluate(()=>{const R=window.__RIDS||[];const d=document.querySelector('.cgg-dim:not([hidden]) .cgg-dlg');
    const DB=__PV.DB();const cs=Object.values(DB.companies||{}).filter(x=>/^시험상사/.test(x.name)).map(x=>x.name);const ds=Object.values(DB.dealers||{}).filter(x=>/^딜러\d{5}$/.test(x.name));const have={};ds.forEach(x=>have[x.company]=1);
    return {one:R.filter(x=>x.fn==='apiSet').length,many:R.filter(x=>x.fn==='apiSetMany').length,dlg:d?d.innerText.slice(0,220):'',orphan:cs.filter(n=>!have[n]).length,dl:ds.length};});
  ok('② 묶음이 실패해도 하나씩 다시 보내지 않음',R.one===0,'한 줄 '+R.one+'번 · 묶음 '+R.many+'번');
  ok('② «못 넣은 줄» 창에 까닭(서버 글)',/못 넣은 줄/.test(R.dlg)&&/인터넷 연결이 끊겼어요/.test(R.dlg),R.dlg.replace(/\n/g,' ').slice(0,140));
  ok('② 실패 묶음 뒤에도 반쪽 없음 · 나머지는 들어감',R.orphan===0&&R.dl>12000,JSON.stringify({orphan:R.orphan,dl:R.dl}));
  await p.close(); }
await b.close();
const sum=`실행 ${pass+fail} · 통과 ${pass} · 실패 ${fail} · 건너뜀 0`; console.log(sum);
import fs from 'fs'; fs.writeFileSync(SP+'/t1432/result.txt',out.join('\n')+'\n'+sum+'\n');
