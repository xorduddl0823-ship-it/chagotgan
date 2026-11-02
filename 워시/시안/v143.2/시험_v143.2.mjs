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
await b.close();
const sum=`실행 ${pass+fail} · 통과 ${pass} · 실패 ${fail} · 건너뜀 0`; console.log(sum);
import fs from 'fs'; fs.writeFileSync(SP+'/t1432/result.txt',out.join('\n')+'\n'+sum+'\n');
