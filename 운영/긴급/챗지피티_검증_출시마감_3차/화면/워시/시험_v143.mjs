// 다른 곳에서 돌릴 때: PW=<playwright index.mjs 경로> CHROME=<chromium 경로> (없으면 playwright 기본)
const { chromium } = await import(process.env.PW||'/opt/node-tools/node_modules/playwright/index.mjs');
import fs from 'fs';
const SP=process.argv[2];
const b=await chromium.launch(process.env.CHROME===''?{}:{executablePath:process.env.CHROME||'/opt/pw-browsers/chromium'});
let pass=0,fail=0; const out=[];
const ok=(name,cond,info='')=>{ (cond?pass++:fail++); const l=(cond?'통과':'실패')+' | '+name+(info?' | '+info:''); out.push(l); console.log(l); };
async function page(q='',seed=null,w=1366,h=1000){ const p=await b.newPage({viewport:{width:w,height:h}}); p._errs=[];
  p.on('pageerror',e=>p._errs.push(String(e))); p.on('dialog',d=>{p._errs.push('NATIVE '+d.message()); d.accept();});
  if(seed) await p.addInitScript(s=>{window.__SEEDDB=JSON.parse(s);},JSON.stringify(seed));
  await p.goto('file://'+SP+'/pv143/t.html'+q); await p.waitForTimeout(2500); return p; }
const W=(p,ms=900)=>p.waitForTimeout(ms);
const dbs=p=>p.evaluate(()=>document.getElementById('dbState').textContent);
const bar=p=>p.evaluate(()=>{const x=document.getElementById('wSaveBar');return x?x.innerText:'';});
const cnt=(p,plate)=>p.evaluate(pl=>Object.values(__PV.DB().intakes||{}).filter(r=>r.plate===pl).length,plate);
async function fillIn(p,plate){
  await p.evaluate(pl=>{ __t.tab('in'); const r=__t.recs().find(x=>x.company&&x.dealer);
    document.getElementById('fCompany').value=r.company; document.getElementById('fDealer').value=r.dealer;
    document.getElementById('fPlate').value=pl; __t.works([{name:'실내 세차',amount:33000}]); },plate); await W(p,400); }
const clickSave=p=>p.evaluate(()=>document.getElementById('btnSave').click());

// ① 입고 저장 실패 → 화면에서 되돌림 · «저장 안 됨» · 실패 띠 · 다시 하기
{ const p=await page('',null,390,844); const PL='11가1111';
  await fillIn(p,PL); await p.evaluate(()=>{window.__FAIL=1;}); await clickSave(p); await W(p,1500);
  const r=await p.evaluate(pl=>({inS:__t.recs().some(x=>x.plate===pl),form:document.getElementById('fPlate').value,btn:document.getElementById('btnSave').disabled,
    banner:(document.getElementById('banner')||{}).innerText||''}),PL);
  ok('① 입고 실패 → 목록에 안 남음',!r.inS); ok('① 입고 실패 → 입력한 내용 그대로',r.form===PL); ok('① 입고 실패 → 단추 다시 눌림',!r.btn);
  ok('① 머리말 «저장 안 됨»',/안 됨/.test(await dbs(p)),await dbs(p)); ok('① 실패 띠 + 다시 하기',/저장 못 한 기록 1건/.test(await bar(p))&&/다시 하기/.test(await bar(p)),(await bar(p)).replace(/\n/g,' '));
  ok('① 입고 실패 안내 글',/입고를 저장하지 못했어요/.test(r.banner),r.banner.slice(0,80));
  await p.evaluate(()=>__t.dbs(true)); ok('① 주기적 동기화(저장됨 신호)가 와도 «저장 안 됨» 유지',/안 됨/.test(await dbs(p)),await dbs(p));
  await p.evaluate(()=>document.getElementById('wSaveRetry').click()); await W(p,1500);
  ok('① 다시 하기 → 1건 저장',await cnt(p,PL)===1,'서버 '+await cnt(p,PL)+'건'); ok('① 다시 하기 → 띠 사라짐 · 저장됨',!(await bar(p))&&!/안 됨/.test(await dbs(p)),await dbs(p));
  ok('① 다시 하기 → 목록에 보임',await p.evaluate(pl=>__t.recs().some(x=>x.plate===pl),PL));
  // 띠로 살린 뒤 [입고 등록]을 또 눌러도 한 건 (입력 칸이 비워져 있어야 함)
  const after=await p.evaluate(()=>({plate:document.getElementById('fPlate').value,banner:(function(){const x=document.getElementById('banner');return x&&x.offsetParent!==null?x.innerText:'';})(),idem:__t.W().inIdem}));
  ok('① 띠로 살리면 입력 칸 비움 · 입고 실패 안내 닫힘',after.plate===''&&!/입고를 저장하지 못했어요/.test(after.banner)&&after.idem===null,JSON.stringify(after));
  await clickSave(p); await W(p,1000); ok('① 그 뒤 [입고 등록]을 또 눌러도 한 건',await cnt(p,PL)===1,'서버 '+await cnt(p,PL)+'건');
  ok('① 페이지 오류 없음',!p._errs.length,p._errs.join(' | ')); await p.close(); }

// ② 실패 뒤 [입고 등록] 다시 누르기 → 같은 id(멱등 키) → 한 건만
{ const p=await page('',null,390,844); const PL='22나2222';
  await fillIn(p,PL); await p.evaluate(()=>{window.__FAIL=1;window.__CALLS=[];}); await clickSave(p); await W(p,1500);
  await clickSave(p); await W(p,1500);
  const ids=await p.evaluate(()=>window.__CALLS.filter(x=>x.indexOf('set:intakes/')===0));
  ok('② 다시 눌러도 같은 id 로 보냄',ids.length===2&&ids[0]===ids[1],ids.join(' , '));
  ok('② 서버에 한 건만',await cnt(p,PL)===1,'서버 '+await cnt(p,PL)+'건'); ok('② 띠 사라짐',!(await bar(p)));
  // 저장 뒤 같은 차를 새로 넣으면 새 id (다음 입고와 섞이지 않음)
  const k=await p.evaluate(()=>__t.W().inIdem); ok('② 저장 끝나면 멱등 키 비움',k===null,JSON.stringify(k));
  ok('② 페이지 오류 없음',!p._errs.length,p._errs.join(' | ')); await p.close(); }

// ③ 연속 클릭 → 한 건
{ const p=await page('',null,390,844); const PL='33다3333';
  await fillIn(p,PL); await p.evaluate(()=>{window.__CALLS=[];const b=document.getElementById('btnSave');b.click();b.click();b.click();}); await W(p,1500);
  const ids=await p.evaluate(()=>window.__CALLS.filter(x=>x.indexOf('set:intakes/')===0));
  ok('③ 세 번 빠르게 눌러도 한 번만 보냄',ids.length===1,ids.length+'번'); ok('③ 서버에 한 건만',await cnt(p,PL)===1);
  ok('③ 페이지 오류 없음',!p._errs.length,p._errs.join(' | ')); await p.close(); }

// ④ 등록 · 수정 뒤 새로고침 · 다시 로그인해도 남음 (입고 · 출고 · 입금 · 청구서 · 배달 기록 · 설정)
let seed=null, A={};
{ const p=await page('?ata=on&srv=15',null,390,844); const PL='44라4444';
  await fillIn(p,PL); await clickSave(p); await W(p,1800);
  A=await p.evaluate(async pl=>{ const R={};
    const r=__t.recs().find(x=>x.plate===pl); R.inId=r.id;
    // 출고 (runOut 과 같은 저장)
    const w=__t.recs().find(x=>x.status==='입고'&&x.plate!==pl); const o=Object.assign({},w,{status:'출고',outAt:new Date().toISOString(),dest:'시험 목적지'});
    await __t.saveRec(o); R.outId=o.id;
    // 입금 확인 (duePay 와 같은 저장)
    const d=__t.recs().find(x=>x.status==='출고'&&x.id!==o.id); const dn=Object.assign({},d,{status:'수금완료',paidAt:new Date().toISOString(),paidBy:'김대표'});
    await __t.saveRec(dn); R.paidId=dn.id;
    // 입고 고치기(금액 수정)
    const e=Object.assign({},__t.recs().find(x=>x.id===R.inId)); e.memo='수정 시험'; await __t.saveRec(e);
    // 청구서 보내기 (bills 기록)
    const m=(__t.recs().find(x=>x.status==='출고'||x.status==='수금완료')||{}).month; const bs=__t.bills(m)||[]; const bb=bs.find(x=>!x.dup&&x.phone)||bs[0];
    R.bill=bb?await __t.bill(bb).then(()=>'ok',e=>'ERR '+(e&&e.message||e)):'청구서 없음'; R.billName=bb&&bb.name; R.billM=m;
    // 배달 기록 (입고 알림)
    R.inn=await __t.inn(__t.recs().findIndex(x=>x.id===R.inId)).then(()=>'ok',e=>'ERR '+(e&&e.message||e));
    await new Promise(r=>setTimeout(r,1500));
    const DB=__PV.DB(); R.bills=Object.keys(DB.bills||{}).length; R.outbox=Object.values(DB.outbox||{}).map(x=>({id:x.id,status:x.status,via:x.via,rec:x.rec||x.recId||''}));
    R.cnt={intakes:Object.keys(DB.intakes||{}).length,bills:R.bills,outbox:R.outbox.length};
    return R; },PL);
  ok('④ 청구서 보내기',A.bill==='ok',A.bill+' '+(A.billName||'')); ok('④ 입고 알림 보내기',A.inn==='ok',A.inn);
  seed=await p.evaluate(()=>JSON.parse(JSON.stringify(__PV.DB())));
  A.recs=await p.evaluate(()=>JSON.parse(JSON.stringify(__t.recs())));
  ok('④ 페이지 오류 없음(1)',!p._errs.length,p._errs.join(' | ')); await p.close(); }
for (const how of ['새로고침','다시 로그인']) {
  const p=await page(how==='새로고침'?'?ata=on&srv=15':'?ata=on&srv=15&relogin=1',seed,1366,1000);
  if(how==='다시 로그인') await p.evaluate(()=>{try{localStorage.clear();}catch(e){}});   // 기기 기억 지움 뒤 다시 불러오기
  if(how==='다시 로그인'){ await p.reload(); await W(p,2500); }
  const B=await p.evaluate(()=>({recs:JSON.parse(JSON.stringify(__t.recs())),DB:JSON.parse(JSON.stringify(__PV.DB()))}));
  const g=id=>B.recs.find(x=>x.id===id)||{};
  ok('④ '+how+' 뒤 입고 남음 · 고친 메모 그대로',g(A.inId).plate==='44라4444'&&g(A.inId).memo==='수정 시험',g(A.inId).memo);
  ok('④ '+how+' 뒤 출고 남음',g(A.outId).status==='출고'&&g(A.outId).dest==='시험 목적지');
  ok('④ '+how+' 뒤 입금 확인 남음',g(A.paidId).status==='수금완료');
  ok('④ '+how+' 뒤 청구서 남음',Object.keys(B.DB.bills||{}).length===A.bills&&A.bills>0,'청구서 '+Object.keys(B.DB.bills||{}).length+'장');
  ok('④ '+how+' 뒤 배달 기록 남음',Object.keys(B.DB.outbox||{}).length===A.outbox.length&&A.outbox.length>0,'배달 기록 '+Object.keys(B.DB.outbox||{}).length+'건');
  ok('④ '+how+' 뒤 기록 수 같음',B.recs.length===A.recs.length,B.recs.length+' / '+A.recs.length);
  ok('④ '+how+' 페이지 오류 없음',!p._errs.length,p._errs.join(' | ')); await p.close(); }

// ⑤ 출고 · 입금 · 청구서 · 배달 기록 · 설정 저장 실패 → 되돌림 · 띠 · 다시 하기
{ const p=await page('?ata=on&srv=15',null,1366,1000);
  const R=await p.evaluate(async()=>{ const R={};
    const w=__t.recs().find(x=>x.status==='입고'); const o=Object.assign({},w,{status:'출고',outAt:new Date().toISOString()});
    window.__FAIL=1; R.out=await __t.saveRec(o).then(()=>'ok',e=>'ERR'); R.outBack=(__t.recs().find(x=>x.id===w.id)||{}).status;
    R.bar1=(document.getElementById('wSaveBar')||{}).innerText||'';
    const d=__t.recs().find(x=>x.status==='출고'); const dn=Object.assign({},d,{status:'수금완료'});
    window.__FAIL=1; R.pay=await __t.saveRec(dn).then(()=>'ok',e=>'ERR'); R.payBack=(__t.recs().find(x=>x.id===d.id)||{}).status;
    R.bar2=(document.getElementById('wSaveBar')||{}).innerText||'';
    const cfgOld=JSON.stringify(__t.G().cache.settings.config); __t.SS().cfg.shopName='실패 시험'; window.__FAIL=2;
    R.cfg=await __t.cfgSave().then(()=>'ok',e=>'ERR'); R.cfgBack=JSON.stringify(__t.G().cache.settings.config)===cfgOld;
    R.bar3=(document.getElementById('wSaveBar')||{}).innerText||'';
    window.__FAIL=0; const rb=document.getElementById('wSaveRetry'); rb.click(); await new Promise(r=>setTimeout(r,30));
    const rb2=document.getElementById('wSaveRetry'); R.lock=!!(rb2&&rb2.disabled); await new Promise(r=>setTimeout(r,1500));
    R.after={out:(__PV.DB().intakes[w.id]||{}).status,pay:(__PV.DB().intakes[d.id]||{}).status,cfg:(__PV.DB().settings.config||{}).shopName,bar:!!document.getElementById('wSaveBar')};
    // 지우기 실패 → 다시 보임
    const z=__t.recs()[__t.recs().length-1]; window.__FAIL=1;
    R.del=await __t.SS().db.collection('intakes').doc(z.id).delete().then(()=>'ok',e=>'ERR'); R.delBack=__t.recs().some(x=>x.id===z.id);
    window.__FAIL=0; document.getElementById('wSaveRetry').click(); await new Promise(r=>setTimeout(r,1500));
    R.delDone=!__PV.DB().intakes[z.id]&&!__t.recs().some(x=>x.id===z.id);
    return R; });
  ok('⑤ 출고 저장 실패 → «입고»로 되돌림',R.out==='ERR'&&R.outBack==='입고',R.outBack);
  ok('⑤ 입금 확인 실패 → «출고»로 되돌림',R.pay==='ERR'&&R.payBack==='출고',R.payBack);
  ok('⑤ 설정 저장 실패 → 화면 되돌림',R.cfg==='ERR'&&R.cfgBack);
  ok('⑤ 띠에 실패 건수가 쌓임',/1건/.test(R.bar1)&&/2건/.test(R.bar2)&&/3건/.test(R.bar3),[R.bar1,R.bar2,R.bar3].map(x=>x.split('\n')[0].slice(0,24)).join(' / '));
  ok('⑤ 다시 하기 → 셋 다 저장 · 띠 사라짐',R.after.out==='출고'&&R.after.pay==='수금완료'&&R.after.cfg==='실패 시험'&&!R.after.bar,JSON.stringify(R.after));
  ok('⑤ 다시 하는 중에는 단추 잠김(여러 건)',R.lock);
  ok('⑤ 지우기 실패 → 다시 보임 · 다시 하기로 지움',R.del==='ERR'&&R.delBack&&R.delDone);
  ok('⑤ 페이지 오류 없음',!p._errs.length,p._errs.join(' | ')); await p.close(); }

// ⑥ 보낸 결과 말 (보냄 / 대체 문자 / 실패)
{ const p=await page('?ata=on&srv=15',null,1366,1000);
  const h=await p.evaluate(()=>[__t.how({via:'ata'}),__t.how({via:'sms',ataTried:true}),__t.how({via:'sms',ataTried:true,hq:{}}),__t.how({via:'sms',ata:true,hq:{}})]);
  ok('⑥ 알림톡 감 → «알림톡을 보냈어요»',h[0]==='알림톡을 보냈어요'); ok('⑥ 알림톡 대신 문자 → «알림톡이 안 가서 문자로 대신 보냈어요»',h[1]===h[2]&&/대신/.test(h[1]),h[1]);
  ok('⑥ 알림톡을 시도 안 함(꺼 둠) → «문자로 보냈어요»',h[3]==='문자로 보냈어요');
  const r=await p.evaluate(async()=>{ const i=__t.recs().findIndex(x=>x.phone); await __t.inn(i).catch(()=>0); await new Promise(r=>setTimeout(r,800));
    const ob=Object.values(__PV.DB().outbox||{}); const l=ob[ob.length-1]||{}; return {via:l.via,status:l.status}; });
  ok('⑥ 알림톡 켠 서버 → 배달 기록 «보냄 · 알림톡»',r.status==='보냄'&&r.via==='ata',JSON.stringify(r)); await p.close(); }
{ const p=await page('?srv=15',null,1366,1000);   // 알림톡 코드 없음 → 서버가 문자로 대신
  const r=await p.evaluate(async()=>{ const i=__t.recs().findIndex(x=>x.phone); await __t.inn(i).catch(()=>0); await new Promise(r=>setTimeout(r,800));
    const ob=Object.values(__PV.DB().outbox||{}); const l=ob[ob.length-1]||{}; return {via:l.via,status:l.status,hq:l.hq,ata:l.ata,kind:l.kind,how:__t.how(l)}; });
  ok('⑥ 알림톡 코드 없는 서버 → «보냄 · 문자» · «대신»',r.status==='보냄'&&r.via==='sms'&&/대신/.test(r.how),r.how);
  const r2=await p.evaluate(async()=>{ __t.hq().off=true; const i=__t.recs().findIndex(x=>x.phone); await __t.inn(i).catch(()=>0); await new Promise(r=>setTimeout(r,800));
    const ob=Object.values(__PV.DB().outbox||{}); const l=ob[ob.length-1]||{}; return {via:l.via,how:__t.how(l)}; });
  ok('⑥ 본사 알림톡 꺼짐 → «대신» 아님',!/대신/.test(r2.how),JSON.stringify(r2));
  await p.evaluate(()=>{__t.tab('settings');}); await W(p,300);
  ok('⑥ 페이지 오류 없음',!p._errs.length,p._errs.join(' | ')); await p.close(); }
{ const p=await page('?ata=on&nofrom=1',null,1366,1000);   // 보내기 실패 → «실패» · 까닭 · 기록은 남음
  const r=await p.evaluate(async()=>{ const rec=__t.recs().find(x=>x.phone); const n0=__t.recs().length; const i=__t.recs().indexOf(rec);
    __t.cfg('send',Object.assign({},__t.SS().cfg.send||{},{from:''}));
    const res=await __t.inn(i).then(()=>'ok',e=>'ERR '+(e&&e.message||e)); await new Promise(r=>setTimeout(r,800));
    const ob=Object.values(__PV.DB().outbox||{}); const l=ob[ob.length-1]||{}; return {res,status:l.status,err:l.err,keep:__t.recs().length===n0&&__t.recs().some(x=>x.id===rec.id)}; });
  ok('⑥ 보내기 실패 → 배달 기록 «실패» + 까닭',r.status==='실패'&&!!r.err,JSON.stringify(r));
  ok('⑥ 보내기가 실패해도 입고 기록은 그대로',r.keep);
  await p.close(); }
// ⑦ rid — 쓰기에만 · 읽기엔 없음 · 소문자 숫자 24자
{ const p=await page('?ata=on&srv=15',null,390,844); const PL='77사7777';
  await fillIn(p,PL); await p.evaluate(()=>{window.__RIDS=[];}); await clickSave(p); await W(p,1500);
  await p.evaluate(async()=>{ await __t.G().load(true); });
  const R=await p.evaluate(()=>window.__RIDS);
  const sets=R.filter(x=>x.fn==='apiSet'), loads=R.filter(x=>x.fn==='apiLoad'||x.fn==='apiStamp');
  ok('⑦ 저장(apiSet)에 rid 24자',sets.length>0&&sets.every(x=>/^[a-z0-9]{24}$/.test(x.rid)),sets.map(x=>x.rid).join(','));
  ok('⑦ 읽기(apiLoad)엔 rid 없음',loads.length>0&&loads.every(x=>!x.rid),loads.length+'번');
  // 누를 때마다 새 rid
  await fillIn(p,'77사7778'); await clickSave(p); await W(p,1500);
  const s2=await p.evaluate(()=>window.__RIDS.filter(x=>x.fn==='apiSet').map(x=>x.rid));
  ok('⑦ 누를 때마다 새 rid',new Set(s2).size===s2.length,s2.length+'번');
  ok('⑦ 페이지 오류 없음',!p._errs.length,p._errs.join(' | ')); await p.close(); }

// ⑧ 저장 답을 잃음(서버는 저장함) → 다시 하기 = 같은 rid → 서버에 한 건 · 처음 답 그대로
{ const p=await page('',null,390,844); const PL='88아8888';
  await fillIn(p,PL); await p.evaluate(()=>{window.__RIDS=[];window.__LOSE={apiSet:1};}); await clickSave(p); await W(p,1500);
  const b1=await bar(p); ok('⑧ 답을 잃으면 «저장 못 한 기록» 띠',/저장 못 한 기록 1건/.test(b1),b1.split('\n')[0]);
  await p.evaluate(()=>document.getElementById('wSaveRetry').click()); await W(p,1500);
  const r=await p.evaluate(()=>window.__RIDS.filter(x=>x.fn==='apiSet').map(x=>x.rid));
  ok('⑧ 다시 하기는 같은 rid',r.length===2&&r[0]===r[1],r.join(' , ')); ok('⑧ 서버에 한 건',await cnt(p,PL)===1);
  ok('⑧ 띠 사라짐',!(await bar(p))); ok('⑧ 페이지 오류 없음',!p._errs.length,p._errs.join(' | ')); await p.close(); }

// ⑨ 보내기: 답을 잃음(공급자는 받음) → «확인 중» · 문자로 또 안 보냄 · 자동 다시 없음 · [다시 보내기]는 새 rid
{ const p=await page('?ata=on&srv=15',null,1366,1000);
  const r=await p.evaluate(async()=>{ const i=__t.recs().findIndex(x=>x.phone); const n0=__PV.sent().length; window.__LOSE={sendMsg:1};
    const res=await __t.inn(i).then(()=>'ok',e=>'ERR '+(e&&e.message||e)); await new Promise(r=>setTimeout(r,2500));
    const ob=Object.values(__PV.DB().outbox||{}); const l=ob[ob.length-1]||{};
    const t=document.querySelector('#toast.show,.cgg-toast:not([hidden])'); return {res,sent:__PV.sent().length-n0,status:l.status,rid:l.rid,id:l.id,toast:t?t.textContent:''}; });
  ok('⑨ 답을 잃은 발송 → 보낸 기록 «확인 중»',r.status==='확인 중',JSON.stringify(r));
  ok('⑨ 공급자에 1번만(문자로 또 안 보냄 · 자동 다시 없음)',r.sent===1,r.sent+'번');
  ok('⑨ 안내 글 «갔는지 아직 몰라요 — 보낸 기록에서 확인해 주세요»',/갔는지 아직 몰라요 — 보낸 기록에서 확인/.test(r.res+' '+r.toast),r.res);
  ok('⑨ 보낸 기록에 rid 24자 남음',/^[a-z0-9]{24}$/.test(r.rid||''),r.rid);
  // 보낸 기록 화면: 확인 중 안내 · [다시 보내기](일부러) = 새 rid
  await p.evaluate(()=>{__t.SS().setSub='outbox';__t.tab('settings');}); await W(p,800);
  const v=await p.evaluate(()=>{const b=document.getElementById('outboxBody');return b?b.innerText:'';});
  ok('⑨ 보낸 기록에 «확인 중» + «갔는지 아직 몰라요» 안내',/확인 중/.test(v)&&/갔는지 아직 몰라요/.test(v),v.split('\n').filter(x=>/확인 중/.test(x)).join(' / ').slice(0,120));
  const picked=await p.evaluate(()=>{const rows=[...document.querySelectorAll('#outboxBody tr')].filter(tr=>/확인 중/.test(tr.innerText));
    const cb=rows.length&&rows[0].querySelector('input[type=checkbox]'); if(cb){cb.click();return true;} return false;});
  await p.evaluate(()=>{window.__N1=__PV.sent().length;document.getElementById('obRetry').click();}); await W(p,600);
  const warn=await p.evaluate(()=>{const a=document.getElementById('askbox');return a&&a.classList.contains('show')?a.innerText:'';});
  await p.evaluate(()=>{const bs=[...document.querySelectorAll('#askbox button,.cgg-dim:not([hidden]) button,.cgg-dlg button')].filter(x=>x.offsetParent&&/다시 보내기/.test(x.textContent));bs.length&&bs[bs.length-1].click();}); await W(p,2000);
  const r3=await p.evaluate(()=>{const s=__PV.sent().slice(window.__N1);return s.map(x=>x.rid);});
  ok('⑨ [다시 보내기] 확인 창 안에 «이미 갔을 수 있어요»',picked&&/이미 갔을 수 있어요/.test(warn),warn.replace(/\n/g,' ').slice(0,90));
  ok('⑨ 일부러 [다시 보내기] = 새 rid',r3.length===1&&/^[a-z0-9]{24}$/.test(r3[0])&&r3[0]!==r.rid,r3.join(',')+' ← '+r.rid);
  // 홈 할 일 · 보낸 기록 띠 · 숫자 칸 (다시 보내기 전 상태를 새 페이지에서)
  { const seedC=await p.evaluate(()=>JSON.parse(JSON.stringify(__PV.DB())));
    const q=await page('?ata=on&srv=15',seedC,1366,1000);
    await q.evaluate(()=>{const ob=__PV.DB().outbox;Object.values(ob).forEach(o=>{if(o.rid&&o.status==='보냄'&&o.type==='시험')o.status='확인 중';});});
    await q.evaluate(()=>{const o=Object.values(__PV.DB().outbox).find(x=>x.status==='확인 중');});
    await q.evaluate(async()=>{await __t.G().load(true);});
    await q.evaluate(()=>{__t.SS().setSub='outbox';__t.tab('settings');}); await W(q,600);
    const ob=await q.evaluate(()=>(document.getElementById('outboxBody')||{}).innerText||'');
    ok('⑨ 보낸 기록 띠 · 숫자 칸에 «확인 중»',/갔는지 확인 필요 \d+건/.test(ob)&&/확인 중 \d+건/.test(ob),ob.split('\n').filter(x=>/확인/.test(x)).slice(0,3).join(' / '));
    await q.evaluate(()=>{__t.tab('home');}); await W(q,800);
    await q.evaluate(()=>{const m=document.querySelector('#dashTodo .todoMore');m&&m.click();}); await W(q,500);   // 할 일이 3건 넘으면 «모두 보기»
    const hm=await q.evaluate(()=>document.body.innerText);
    ok('⑨ 홈 할 일에 «확인 필요»',/갔는지 확인 필요/.test(hm),hm.split('\n').filter(x=>/확인 필요/.test(x)).slice(0,2).join(' / '));
    ok('⑨ 페이지 오류 없음(2)',!q._errs.length,q._errs.join(' | ')); await q.close(); }
  ok('⑨ 페이지 오류 없음',!p._errs.length,p._errs.join(' | ')); await p.close(); }

// ⑩ 알림톡 → 문자 대체는 같은 rid(한 발송 업무) · 저장 성공 기록은 발송 실패로 안 없어짐(새로고침 뒤에도)
{ const p=await page('',null,1366,1000);   /* 알림톡 코드 없음 → 서버가 ok:false → 화면은 문자를 따로 안 보냄(대체는 서버 sb29 안에서) */
  const r=await p.evaluate(async()=>{ const i=__t.recs().findIndex(x=>x.phone); const n0=__PV.sent().length; __t.hq().off=false;
    await __t.out(i).catch(()=>0); await new Promise(r=>setTimeout(r,1200));
    const s=__PV.sent().slice(n0); const ob=Object.values(__PV.DB().outbox||{}); const l=ob[ob.length-1]||{}; return {n:s.length,status:l.status}; });
  ok('⑩ 알림톡 실패 답 → 화면은 문자를 따로 안 보냄(서버가 대체) · «실패»',r.n===1&&r.status==='실패',JSON.stringify(r));
  await p.close(); }
// ⑪ 서버 sb29 «확인 중» 답 모양 3가지 → «확인 중» · 자동 다시 없음
for (const [name,set] of [['{ok:false,checking:true}',"window.__CHK='no'"],['{ok:true,checking:true}',"window.__CHK='ok'"],['__err + __checking',"window.__CHKERR=1"],['__err(글에 «확인 중» 없음) + __checking',"window.__CHKERR=2"]]) {
  const p=await page('?ata=on&srv=15',null,1366,1000);
  const r=await p.evaluate(async(set)=>{ eval(set); const i=__t.recs().findIndex(x=>x.phone); const n0=__PV.sent().length;
    const res=await __t.inn(i).then(()=>'ok',e=>'ERR '+(e&&e.message||e)); await new Promise(r=>setTimeout(r,1200));
    const ob=Object.values(__PV.DB().outbox||{}); const l=ob[ob.length-1]||{}; const t=document.querySelector('#toast.show,.cgg-toast:not([hidden])'); return {res:res+' '+(t?t.textContent:''),status:l.status,more:__PV.sent().length-n0}; },set);
  ok('⑪ 서버 답 '+name+' → «확인 중» · 다시 안 보냄',r.status==='확인 중'&&r.more<=1&&/갔는지 아직 몰라요/.test(r.res),JSON.stringify(r));
  await p.close(); }
{ const p=await page('?ata=on&nofrom=1',null,1366,1000);
  const r=await p.evaluate(async()=>{ const rec=__t.recs().find(x=>x.phone); __t.cfg('send',Object.assign({},__t.SS().cfg.send||{},{from:''}));
    await __t.inn(__t.recs().indexOf(rec)).catch(()=>0); await new Promise(r=>setTimeout(r,800));
    const ob=Object.values(__PV.DB().outbox||{}); const l=ob[ob.length-1]||{}; return {id:rec.id,status:l.status,bar:!!document.getElementById('wSaveBar')}; });
  const seed2=await p.evaluate(()=>JSON.parse(JSON.stringify(__PV.DB()))); await p.close();
  const q=await page('',seed2,1366,1000);
  const keep=await q.evaluate(id=>__t.recs().some(x=>x.id===id),r.id);
  ok('⑩ 시험5: 발송 실패는 «실패»(보낸 기록) · 저장 실패 띠는 안 뜸',r.status==='실패'&&!r.bar,JSON.stringify(r));
  ok('⑩ 시험5: 발송 실패해도 기록은 새로고침 뒤 그대로',keep);
  await q.close(); }
{ const p=await page('?ata=on&srv=15',null,390,844); const PL='99자9999';
  await fillIn(p,PL); await p.evaluate(()=>{window.__FAIL=1;window.__N0=__PV.sent().length;__t.autoIn(true);}); await clickSave(p); await W(p,1500);
  const r=await p.evaluate(()=>({sent:__PV.sent().length-window.__N0,bar:(document.getElementById('wSaveBar')||{}).innerText||''}));
  ok('⑩ 시험5: 저장 실패면 «저장 못 한 기록» 띠 · 알림은 안 보냄',/저장 못 한 기록/.test(r.bar)&&r.sent===0,JSON.stringify(r));
  await p.close(); }
await b.close();
const sum=`실행 ${pass+fail} · 통과 ${pass} · 실패 ${fail} · 건너뜀 0`; console.log(sum); fs.writeFileSync(SP+'/t143_result.txt',out.join('\n')+'\n'+sum+'\n');
