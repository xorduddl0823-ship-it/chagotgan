/* 체크 v56.7 알림 «확인 중» · 시험 5(저장 실패 ↔ 발송 실패 따로) 시험 — 시험 서버는 기록_시험_v56.6.js 와 같아요
   (아래는 그 파일 머리 그대로) 체크 v56.6 기록 · 알림 시험 (체크 방 · 10/19 · 운영/긴급/2026-10-19_기록_알림톡_출시마감_요청.md «체크» 줄)
   쓰는 법: node 체크/도구/기록_시험_v56.6.js [화면.html] [xlsx.full.min.js 0.18.5 경로(없으면 엑셀 도구 없이)]
   - 진짜 서버 · 진짜 알림은 쓰지 않아요. 화면이 서버로 보내는 요청을 이 파일 안의 «시험 서버»가 받아요.
     시험 서버는 미리보기 가짜 서버(체크/시안/만들기_체크_미리보기.py FAKE)를 바탕으로, 새로고침 · 다시 로그인해도 자료가 남게 node 쪽에 둬요.
   - 시험 서버는 서버 방에 제안한 약속대로 같은 rid 를 한 번만 처리해요(서버가 아직 안 했으면 «미확인»으로 적어요).
   - 결과: 통과 · 실패 수와 줄마다 결과를 찍고, 실패가 있으면 종료 값 1. */
const fs=require('fs'), path=require('path'), vm=require('vm');
const pw=require(fs.existsSync('/opt/node22/lib/node_modules/playwright')?'/opt/node22/lib/node_modules/playwright':'playwright');
const ROOT=path.join(__dirname,'..','..');
const HTML=path.resolve(process.argv[2]||path.join(ROOT,'체크/2_차곳간_체크_index_v56.7.html'));
const XLSX_JS=process.argv[3]||'';

/* ── 시험 서버 ── */
function makeServer(){
  const py=fs.readFileSync(path.join(ROOT,'체크/시안/만들기_체크_미리보기.py'),'utf8');
  let src=py.slice(py.indexOf("FAKE = r'''<script>")+"FAKE = r'''<script>".length, py.indexOf("</script>\n'''"));
  src=src.replace("var realFetch = window.fetch","window.__answer=answer; var realFetch = window.fetch");
  const MEM={}, ls={getItem:k=>k in MEM?MEM[k]:null,setItem:(k,v)=>{MEM[k]=String(v);},removeItem:k=>{delete MEM[k];}};
  const win={localStorage:ls, fetch:null, addEventListener(){}, CGG:null};
  const doc={addEventListener(){}, querySelector(){return null;}, readyState:'complete', createElement(){return {};}};
  const ctx=vm.createContext({window:win, localStorage:ls, document:doc, setTimeout, clearTimeout, console, Date, Math, JSON, String, Number, Object, Array, RegExp, Promise, Response:class{}, TypeError, Error});
  win.window=win; vm.runInContext(src, ctx);
  const answer=win.__answer;
  /* 미리보기 가짜 서버에 없는 저장 자리 */
  const DB={uploads:[], fees:{}, unsent:{}, deliv:[
      {배달ID:"dv1", 도착일시:"2026-10-19 09:10", 딜러:"김하늘", 상사:"하늘모터스", 딜러연락처:"010-0000-0010", 차량번호:"12가3456", 차명:"아반떼", 목적지:"본사", 기사:"박기사", 발송방법:"ATA", 발송결과:"성공", 발송사유:"", 보낸일시:"2026-10-19 09:11", 상태:"", 메모:"", 사진ID:"", 추가사진ID:""},
      {배달ID:"dv2", 도착일시:"2026-10-19 10:20", 딜러:"이푸름", 상사:"푸른카", 딜러연락처:"010-0000-0011", 차량번호:"34나5678", 차명:"쏘나타", 목적지:"본사", 기사:"박기사", 발송방법:"", 발송결과:"실패", 발송사유:"연락처 없음", 보낸일시:"", 상태:"", 메모:"", 사진ID:"", 추가사진ID:""}]};
  const S={log:[], rids:{}, inject:[], exec:{}};
  function run(fn,a){
    switch(fn){
      case "excelPut": { const m=a[3]||{}; if(m.last) DB.uploads.unshift({kind:a[0], name:m.file, n:m.total, ym:a[2]||"", who:"김대표", at:"2026-10-19 11:00"}); return {n:(a[1]||[]).length}; }
      case "uploadList": return DB.uploads;
      case "carFeeSet": { const o=a[0]||{}; DB.fees[o.carId]=o.fee; return {ok:true, carId:o.carId, fee:o.fee}; }
      case "invoiceRows": { const r=answer(fn,a)||[]; if(/_0$/.test(String(a[0]))) r.push({kind:"fee", dealer_name:"김하늘", item:"수출 가성능", qty:1, unit:DB.fees.carX1||0, amount:Math.round((DB.fees.carX1||0)*1.1), car_id:"carX1", car:{plate:"99수9999", check_date:"2026-10-05"}}); return r; }
      case "invoiceUnsend": ((a[0]||{}).ids||[]).forEach(id=>{ DB.unsent[id]=1; }); return {n:((a[0]||{}).ids||[]).length};
      case "invoiceList": return (answer(fn,a)||[]).map(v=>DB.unsent[v.id]?Object.assign({},v,{sent_at:null, view_at:null}):v);
      case "deliv_list": if(a[3]) return {ok:true, rows:[], dests:[], conf:{way:"ata",fallback:true,photo_on:true}, trashN:0, ver:"시험"};
        return {ok:true, rows:DB.deliv.filter(r=>r.상태!=="삭제"), dests:[{목적지:"본사",분류:"",사용:"Y"}], conf:{way:"ata", fallback:true, photo_on:true, from_tel:""}, trashN:0, trashDays:30, ver:"시험", dealerN:8, carN:2, extraN:0};
      case "deliv_update": { const r=DB.deliv.find(x=>x.배달ID===a[1]); const map={"차량번호":"차량번호","메모":"메모","딜러":"딜러","차명":"차명","목적지":"목적지","상사":"상사","딜러연락처":"딜러연락처"};
        if(r) Object.keys(a[2]||{}).forEach(k=>{ if(map[k]) r[map[k]]=String(a[2][k]); }); return {ok:true}; }
      case "remindSend": if(DB.mode==="unsure"){ const res=answer(fn,a); (res.results||[]).forEach((x,i)=>{ if(i===0){ x.ok=false; x.unsure=true; x.why="확인 중"; } }); return res; } return answer(fn,a);
      case "deliv_resend": if(DB.mode==="unsure") return {ok:0, bad:0, unsure:(a[1]||[]).length};
      { const ids=a[1]||[]; let ok=0,bad=0; ids.forEach(id=>{ const r=DB.deliv.find(x=>x.배달ID===id); if(r&&r.딜러연락처&&!/0011$/.test(r.딜러연락처)) ok++; else bad++; }); return {ok, bad}; }
      case "billBundleSend": if(DB.mode==="unsure") return {ok:false, unsure:true, how:"", why:"확인 중", months:1, left:0}; return answer(fn,a);
      case "sendLogList": { const r=answer(fn,a); if(DB.mode==="unsure"&&r&&Array.isArray(r.list)&&r.list[0]) r.list[0].status="확인 중"; return r; }
      case "billSend": if(DB.mode==="unsure") return {sent:1, results:(a[1]||[]).map((id,i)=>i===0?{id,name:"김하늘",ok:true,how:"ata",why:""}:i===1?{id,name:"이푸름",ok:false,unsure:true,how:"",why:"확인 중"}:{id,name:"박바름",ok:false,how:"",why:"연락처 없음"})};
        return {sent:2, results:(a[1]||[]).map((id,i)=>i===0?{id,name:"김하늘",ok:true,how:"ata",why:""}:i===1?{id,name:"이푸름",ok:true,how:"sms",why:""}:{id,name:"박바름",ok:false,how:"",why:"연락처 없음"})};
      case "salesStat": { const r=answer(fn,a); (Array.isArray(r)?r:(r&&r.rows)||[]).forEach(x=>{ x.feeNeed=1; }); return r; }   /* 수출 가성능 금액 넣기 띠가 보이게 */
      default: return answer(fn,a);
    }
  }
  /* 화면 요청 하나 — {result} | {__err} | {abort:true}(답 잃음: 서버는 처리했지만 화면은 못 받음) */
  S.handle=function(body){
    const fn=String(body.fn||""), a=Array.isArray(body.args)?body.args:[], rid=String(body.rid||"");
    S.log.push({fn, rid, args:JSON.stringify(a).slice(0,200)});
    const inj=S.inject.findIndex(x=>x.fn===fn);
    if(inj>=0 && S.inject[inj].mode==="err"){ const x=S.inject.splice(inj,1)[0]; return {__err:x.msg||"저장하지 못했어요. 잠시 뒤 다시 해 주세요."}; }
    if(rid && S.rids[rid]) return S.rids[rid];   /* 같은 rid — 처음 답 그대로(다시 처리하지 않음) */
    S.exec[fn]=(S.exec[fn]||0)+1;   /* 서버가 실제로 처리한 수(알림이면 나간 수) */
    let out; try{ out={result:run(fn,a)}; }catch(e){ out={__err:String(e&&e.message||e)}; }
    if(rid) S.rids[rid]=out;
    if(inj>=0 && S.inject[inj].mode==="lose"){ S.inject.splice(inj,1); return {abort:true}; }
    return out;
  };
  S.db=DB; S.answer=answer;
  return S;
}

(async()=>{
  const SRV=makeServer(), R=[]; let pass=0, fail=0;
  const ok=(name,cond,more)=>{ R.push((cond?'통과':'실패')+' · '+name+(more?' — '+more:'')); cond?pass++:fail++; };
  const b=await pw.chromium.launch(); const ctx=await b.newContext({viewport:{width:1400,height:900}});
  await ctx.exposeBinding('__srv',(src,body)=>SRV.handle(body));
  await ctx.addInitScript(()=>{
    try{ if(!sessionStorage.getItem('__init')){ sessionStorage.setItem('__init','1');
      localStorage.setItem('cgg_key','chk_TEST'); localStorage.setItem('cgg_shop','DEMO'); localStorage.setItem('cgg_who','김대표'); localStorage.setItem('cgg_role','owner'); localStorage.setItem('cgg_shopname','예시 성능검사소'); } }catch(e){}
    const rf=window.fetch.bind(window);
    window.fetch=function(url,opt){ const u=String((url&&url.url)||url||"");
      if(/\/functions\/v1\/check-api/.test(u)){ let body={}; try{ body=JSON.parse(opt&&opt.body||"{}"); }catch(e){}
        return window.__srv(body).then(o=>{ if(o&&o.abort) throw new TypeError("Failed to fetch");
          return new Response(JSON.stringify(o),{status:200,headers:{"Content-Type":"application/json"}}); }); }
      if(/^https?:/.test(u)) return Promise.reject(new TypeError("시험: 바깥 연결 안 함"));
      return rf(url,opt); };
  });
  await ctx.route('**/*',r=>{ const u=r.request().url();
    if(u.startsWith('file:')) return r.continue();
    if(/xlsx\.full\.min\.js/.test(u) && XLSX_JS) return r.fulfill({path:XLSX_JS, contentType:'application/javascript'});
    if(/\.js(\?|$)/.test(u)) return r.fulfill({body:'', contentType:'application/javascript'});
    if(/fonts\.googleapis/.test(u)) return r.fulfill({body:'', contentType:'text/css'});
    return r.abort(); });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.dismiss());
  const W=ms=>p.waitForTimeout(ms);
  const open=async()=>{ await p.goto('file://'+HTML); await W(1500); };
  const go=async k=>{ await p.evaluate(k=>go(k),k); await W(900); };
  const text=()=>p.evaluate(()=>document.getElementById('main').innerText);
  const barTxt=()=>p.evaluate(()=>{ const m=document.querySelector('#bar .msg'); return m?(m.className+' | '+m.innerText):''; });
  const relogin=async()=>{ await p.evaluate(()=>{ localStorage.removeItem('cgg_key'); }); await p.reload(); await W(1200);
    await p.fill('#lg-ph','010-0000-0000'); await p.fill('#lg-pw','test1234'); await p.click('#lg-go'); await W(1500); };
  const reqs=(fn)=>SRV.log.filter(x=>x.fn===fn);
  await open();


  const ym=await p.evaluate(()=>ST.ym);
  /* ── E. 알림 «확인 중»(결과 불명) ── */
  SRV.db.mode="unsure";
  // E1 청구서 보내기 — 한 곳 확인 중
  await go('bill'); SRV.log.length=0;
  await p.evaluate(ym=>billSendGo(["inv_"+ym+"_0","inv_"+ym+"_1","inv_"+ym+"_2"],false),ym); await W(1200);
  let t=await text(), b1=await barTxt();
  ok('청구서 보내기: 확인 중 줄은 «못 보냄»이 아니라 «확인 중» 칩', await p.evaluate(()=>Array.prototype.some.call(document.querySelectorAll('#main .tag, #main .cgg-st'),t=>t.textContent.trim()==='확인 중')) && /확인 중 — 보낸 기록에서 확인해 주세요/.test(t));
  ok('청구서 보내기: 맨 위 글이 셋으로 나뉨(보냄 · 확인 중 · 못 보냄)', /1곳에 보냈어요/.test(b1) && /확인 중 1곳/.test(b1) && /못 보낸 1곳/.test(b1), b1.replace(/\n/g,' '));
  ok('청구서 보내기: 결과 위 숫자 «못 보냄»에서 확인 중을 뺌', /1곳 못 보냄 · 확인 중 1곳/.test(t));
  ok('청구서 보내기: 서버 요청 1번(자동으로 다시 안 보냄)', reqs('billSend').length===1);
  // E2 재검사 알림 — 확인 중만
  await go('remind'); SRV.log.length=0;
  const cars=await p.evaluate(()=>(window.REMIND||[]).slice(0,1).map(r=>r.id));
  await p.evaluate(ids=>remindGo(ids,false),cars); await W(1200);
  const b2=await barTxt(); const lg=await p.$('#bar [data-v567-log]'), rt=await p.$('#bar [data-v566-retry]');
  ok('재검사 알림: 보낸 수가 0이면 «0명에게 보냈어요»를 쓰지 않음', !/0명에게/.test(b2));
  ok('재검사 알림: 확인 중이면 파란 정보 글 + «보낸 기록 보기» · 다시 하기 없음', /info/.test(b2) && /확인 중 1명/.test(b2) && !!lg && !rt, b2.replace(/\n/g,' '));
  if(lg){ await lg.click(); await W(900); ok('«보낸 기록 보기» → 보낸 기록 화면', await p.evaluate(()=>/보낸 기록/.test(document.querySelector('.cgg-head h1')?.innerText||''))); }
  // E3 보낸 기록 상태 «확인 중»
  const st=await p.evaluate(()=>Array.prototype.filter.call(document.querySelectorAll('#main .cgg-st'),e=>e.textContent.trim()==='확인 중').map(e=>e.className).join(','));
  ok('보낸 기록: «확인 중» 상태는 주황(확인 필요) 칩', /\bchk\b/.test(st), st||'(없음)');
  // E4 같은 일을 다시 보냈는데 앞 것이 확인 중(__err)
  SRV.inject.push({fn:'billSend',mode:'err',msg:'확인 중이에요. 보낸 기록에서 확인해 주세요.'});
  await go('bill'); SRV.log.length=0;
  await p.evaluate(ym=>billSendGo(["inv_"+ym+"_3"],false),ym); await W(900);
  const b4=await barTxt(); const rt4=await p.$('[data-v566-retry]'), lg4=await p.$('#bar [data-v567-log]');
  ok('앞 것이 확인 중: «다시 하기» 없이 «보낸 기록 보기» · 서버 요청 1번', !rt4 && !!lg4 && reqs('billSend').length===1 && /다시 보내지 마세요/.test(b4), b4.replace(/\n/g,' '));
  // E5 밀린 달 한꺼번에 — 확인 중만
  const r5=await p.evaluate(()=>call("billBundleSend",[{dealerId:"d0",ids:["x"],due:"",test:false}]).then(r=>JSON.stringify({ok:r.ok,why:r.why})));
  ok('밀린 달 보내기 답: 확인 중이면 ok:false · 까닭 «확인 중 — 보낸 기록…»', /"ok":false/.test(r5) && /확인 중 — 보낸 기록에서 확인해 주세요/.test(r5), r5);
  // E6 배달 다시 보내기 — 확인 중
  await go('deliv'); await p.evaluate(()=>{ const s=ts("drv"); s.sel={dv1:true}; }); await p.evaluate(()=>delivAct('resend')); await W(400);
  const y6=await p.$('.cgg-dlg [data-dok]'); if(y6){ await y6.click(); await W(900); }
  const b6=await barTxt(); ok('배달 다시 보내기: 확인 중 1건 — 정보 글', /info/.test(b6) && /확인 중 1건/.test(b6), b6.replace(/\n/g,' '));
  // E7 배달 기록 알림 칸
  SRV.db.deliv[0].발송결과="확인 중"; await p.reload(); await W(1500); await go('deliv');
  const tg=await p.evaluate(()=>Array.prototype.some.call(document.querySelectorAll('#main .tag, #main .cgg-st'),t=>t.textContent.trim()==='확인 중'));
  ok('배달 기록: 서버 발송결과 «확인 중» → 알림 칸 «확인 중»', tg);
  await p.evaluate(()=>{ OPEN_DRV="12가3456"; draw(); }); await p.waitForTimeout(600);
  ok('배달 상세 창: 확인 중이면 «알림 다시 보내기» 단추 없음', !(await p.$('#dvResend')) && !!(await p.$('#dvSave')));
  await p.evaluate(()=>{ OPEN_DRV=null; draw(); }); await p.waitForTimeout(400);
  await p.evaluate(()=>{ const s=ts("drv"); s.sel={dv1:true}; }); await p.evaluate(()=>delivAct('resend')); await W(400);
  const wtx=await p.evaluate(()=>{ const d=document.querySelector('.cgg-dlg'); return d?d.innerText:''; });
  ok('고른 줄 다시 보내기 확인 창: «확인 중 1건은 이미 나갔을 수 있어요»', /확인 중 1건은 이미 나갔을 수 있어요/.test(wtx));
  await p.evaluate(()=>CGG.closeDialog());
  SRV.db.mode=""; SRV.db.deliv[0].발송결과="성공";

  /* ── 5. 기록 저장 실패 ↔ 발송 실패 따로 · 저장된 기록은 발송 실패로 없어지지 않음 ── */
  await go('bill'); const nb=await p.evaluate(()=>BILLS.length);
  await p.evaluate(ym=>billSendGo(["inv_"+ym+"_0","inv_"+ym+"_1","inv_"+ym+"_2"],false),ym); await W(1200);
  const b7=await barTxt(); await p.reload(); await W(1500); await go('bill'); const nb2=await p.evaluate(()=>BILLS.length);
  ok('시험 5: 발송 일부 실패 → 빨간 글(발송) · 청구서는 그대로(새로고침 뒤 수 같음)', /err/.test(b7) && /못 보낸/.test(b7) && nb===nb2 && nb>0, '청구서 '+nb+' → '+nb2);
  await go('deliv'); await p.evaluate(()=>{ const s=ts("drv"); s.sel={dv2:true}; }); await p.evaluate(()=>delivAct('resend')); await W(400);
  const y8=await p.$('.cgg-dlg [data-dok]'); if(y8){ await y8.click(); await W(900); }
  const b8=await barTxt(); await p.reload(); await W(1500); await go('deliv'); const still=(await text()).indexOf('34나5678')>=0;
  ok('시험 5: 배달 알림 다시 보내기 실패 → 빨간 글 · 배달 기록은 남음', /err/.test(b8) && still, b8.replace(/\n/g,' '));
  SRV.inject.push({fn:'deliv_update',mode:'err',msg:'저장하지 못했어요. 잠시 뒤 다시 해 주세요.'});
  await p.evaluate(()=>{ OPEN_DRV="34나5678"; draw(); }); await W(700);
  if(await p.$('#dv-memo')){ await p.fill('#dv-memo','저장실패'); await p.click('#dvSave'); await W(800); }
  const b9=await barTxt();
  ok('시험 5: 기록 저장 실패는 «저장하지 못했어요»(발송 말 아님) · 다시 하기', /err/.test(b9) && /저장하지 못했/.test(b9) && !/보내/.test(b9) && !!(await p.$('#drvModal [data-v566-retry]')), b9.replace(/\n/g,' '));

  ok('스크립트 오류 없음', errs.length===0, errs.slice(0,3).join(' | '));
  await b.close();
  console.log(R.join('\n')); console.log('\n실행 '+(pass+fail)+' · 통과 '+pass+' · 실패 '+fail+' · 건너뜀 0');
  process.exit(fail?1:0);
})();
