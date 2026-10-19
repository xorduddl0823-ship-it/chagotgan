/* 체크 v56.6 기록 · 알림 시험 (체크 방 · 10/19 · 운영/긴급/2026-10-19_기록_알림톡_출시마감_요청.md «체크» 줄)
   쓰는 법: node 체크/도구/기록_시험_v56.6.js [화면.html] [xlsx.full.min.js 0.18.5 경로(없으면 엑셀 도구 없이)]
   - 진짜 서버 · 진짜 알림은 쓰지 않아요. 화면이 서버로 보내는 요청을 이 파일 안의 «시험 서버»가 받아요.
     시험 서버는 미리보기 가짜 서버(체크/시안/만들기_체크_미리보기.py FAKE)를 바탕으로, 새로고침 · 다시 로그인해도 자료가 남게 node 쪽에 둬요.
   - 시험 서버는 서버 방에 제안한 약속대로 같은 rid 를 한 번만 처리해요(서버가 아직 안 했으면 «미확인»으로 적어요).
   - 결과: 통과 · 실패 수와 줄마다 결과를 찍고, 실패가 있으면 종료 값 1. */
const fs=require('fs'), path=require('path'), vm=require('vm');
const pw=require(fs.existsSync('/opt/node22/lib/node_modules/playwright')?'/opt/node22/lib/node_modules/playwright':'playwright');
const ROOT=path.join(__dirname,'..','..');
const HTML=path.resolve(process.argv[2]||path.join(ROOT,'체크/2_차곳간_체크_index_v56.6.html'));
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
      case "deliv_resend": { const ids=a[1]||[]; let ok=0,bad=0; ids.forEach(id=>{ const r=DB.deliv.find(x=>x.배달ID===id); if(r&&r.딜러연락처&&!/0011$/.test(r.딜러연락처)) ok++; else bad++; }); return {ok, bad}; }
      case "billSend": return {sent:2, results:(a[1]||[]).map((id,i)=>i===0?{id,name:"김하늘",ok:true,how:"ata",why:""}:i===1?{id,name:"이푸름",ok:true,how:"sms",why:""}:{id,name:"박바름",ok:false,how:"",why:"연락처 없음"})};
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

  /* ── A. 등록 · 고치기 뒤 새로고침 · 다시 로그인해도 그대로 ── */
  // 1 엑셀 접수
  await p.evaluate(()=>putOne("접수리스트",[{"성능번호":"T-1","차량번호":"99수9999","검사일":"2026-10-05"}],"시험접수_202610.xlsx","xlMsg","2026-10"));
  await W(600); await go('files');
  let t1=await text(); await p.reload(); await W(1500); await go('files'); let t2=await text(); await relogin(); await go('files'); let t3=await text();
  ok('엑셀 접수 → 새로고침 · 다시 로그인', [t1,t2,t3].every(t=>t.indexOf('시험접수_202610.xlsx')>=0), '올린 기록 표에 파일 이름');
  // 2 검사비 (수출 가성능 손 입력)
  await go('bill');
  await p.click('#v52Bill button').catch(()=>{}); await W(1200);
  const hasExp=await p.$('[data-ex="0"]');
  if(hasExp){ await p.fill('[data-ex="0"]','77000'); await p.click('.cgg-dlg [data-dok]'); await W(900); }
  await p.reload(); await W(1500); await go('bill'); await p.click('#v52Bill button').catch(()=>{}); await W(1200);
  let v1=await p.evaluate(()=>{ const i=document.querySelector('[data-ex="0"]'); return i?i.value:''; }); await p.evaluate(()=>CGG.closeDialog());
  await relogin(); await go('bill'); await p.click('#v52Bill button').catch(()=>{}); await W(1200);
  let v2=await p.evaluate(()=>{ const i=document.querySelector('[data-ex="0"]'); return i?i.value:''; }); await p.evaluate(()=>CGG.closeDialog());
  ok('검사비 넣기 → 새로고침 · 다시 로그인', !!hasExp && v1==='77,000' && v2==='77,000', '다시 연 창의 값 '+v1+' / '+v2);
  // 3 청구서 (보냄 표시 지우기)
  const ym=await p.evaluate(()=>ST.ym), inv='inv_'+ym+'_0';
  await p.evaluate(id=>call("invoiceUnsend",[{ids:[id]}]),inv); await W(300);
  await p.reload(); await W(1500); await go('bill');
  let s1=await p.evaluate(id=>{ const b=(BILLS||[]).find(x=>String(x.id)===id); return b?String(b.sendState||b.sent||''):'없음'; },inv);
  await relogin(); await go('bill');
  let s2=await p.evaluate(id=>{ const b=(BILLS||[]).find(x=>String(x.id)===id); return b?String(b.sendState||b.sent||''):'없음'; },inv);
  ok('청구서 보냄 표시 지우기 → 새로고침 · 다시 로그인', /안 보냄|^$/.test(s1) && /안 보냄|^$/.test(s2), '상태 '+(s1||'(빈칸)')+' / '+(s2||'(빈칸)'));
  // 4 입금 (은행 엑셀 넣기)
  await p.evaluate(()=>call("depositImport",[{rows:[{tx_at:"2026-10-19T10:00:00",sender:"시험입금자",amount:123000,memo:""}]}])); await W(300);
  await p.reload(); await W(1500); await go('deposit'); let d1=await text(); await relogin(); await go('deposit'); let d2=await text();
  ok('입금 넣기 → 새로고침 · 다시 로그인', d1.indexOf('시험입금자')>=0 && d2.indexOf('시험입금자')>=0);
  // 5 배달 기록 (고치기 · 화면 단추)
  await go('deliv'); await p.evaluate(()=>{ OPEN_DRV="12가3456"; draw(); }); await W(700);
  let viaUi=false;
  if(await p.$('#dv-plate')){ await p.fill('#dv-plate','56다7890'); await p.click('#dvSave'); await W(800); viaUi=true; }
  else{ await p.evaluate(()=>call("deliv_update",[ST.key,"dv1",{"차량번호":"56다7890"}])); }
  await p.reload(); await W(1500); await go('deliv'); let v5a=await text(); await relogin(); await go('deliv'); let v5b=await text();
  ok('배달 기록 고치기 → 새로고침 · 다시 로그인', v5a.indexOf('56다7890')>=0 && v5b.indexOf('56다7890')>=0, viaUi?'상세 창 «저장»으로':'저장 창구로');
  // 6 재검사 (알림에서 빼기)
  await go('remind');
  const car=await p.evaluate(()=>{ const r=(window.REMIND||[])[0]; return r?{id:r.id, plate:r.plate}:null; });
  if(car){ await p.evaluate(id=>call("remindOff",[[id],true]),car.id); await W(300); }
  await p.reload(); await W(1500); await go('remind'); let r1=await p.evaluate(id=>(window.REMIND||[]).some(r=>r.id===id),car&&car.id);
  await relogin(); await go('remind'); let r2=await p.evaluate(id=>(window.REMIND||[]).some(r=>r.id===id),car&&car.id);
  ok('재검사 알림에서 빼기 → 새로고침 · 다시 로그인', !!car && !r1 && !r2, car?car.plate:'차 없음');

  /* ── B. 두 번 생기지 않게 ── */
  SRV.log.length=0;
  await p.evaluate(()=>Promise.all([call("depositKind",[{ids:["dp1"],kind:"정비비"}]),call("depositKind",[{ids:["dp1"],kind:"정비비"}])]));
  ok('같은 저장을 동시에 두 번 → 서버 요청 1번', reqs('depositKind').length===1, '요청 '+reqs('depositKind').length+'번');
  ok('저장 요청에 같은 일 표시(rid 24자)', /^[a-z0-9]{24}$/.test((reqs('depositKind')[0]||{}).rid||''));
  SRV.log.length=0; await p.evaluate(()=>call("depositList",[])).catch(()=>{});
  ok('읽기 요청에는 rid 를 안 붙임', reqs('depositList').every(x=>!x.rid));
  // 답을 잃은 저장 → 다시 하면 같은 rid → 한 번만
  SRV.log.length=0; SRV.inject.push({fn:'depositImport',mode:'lose'});
  const row={rows:[{tx_at:"2026-10-19T11:00:00",sender:"끊김시험",amount:5000,memo:""}]};
  const e1=await p.evaluate(r=>call("depositImport",[r]).then(()=>'성공',e=>e.message),row);
  const e2=await p.evaluate(r=>call("depositImport",[r]).then(()=>'성공',e=>e.message),row);
  const L=reqs('depositImport'); const n=await p.evaluate(()=>call("depositList",[]).then(l=>(l||[]).filter(d=>d.sender==='끊김시험').length));
  ok('답을 잃은 저장 → 다시 하기는 같은 rid · 입금 1건만', L.length===2 && L[0].rid===L[1].rid && n===1, '첫 답 «'+e1+'» · 다시 «'+e2+'» · 입금 '+n+'건');
  // 알림 다시 보내기 — 답을 잃고 다시 해도 알림은 한 번만
  SRV.inject.push({fn:'deliv_resend',mode:'lose'}); SRV.exec.deliv_resend=0;
  const k1=await p.evaluate(()=>call("deliv_resend",[ST.key,["dv1"]]).then(()=>'성공',e=>e.message));
  const k2=await p.evaluate(()=>call("deliv_resend",[ST.key,["dv1"]]).then(()=>'성공',e=>e.message));
  ok('알림 다시 보내기 답을 잃음 → 다시 해도 알림은 1번', SRV.exec.deliv_resend===1, '첫 답 «'+k1+'» · 다시 «'+k2+'» · 서버가 보낸 수 '+SRV.exec.deliv_resend);
  // 화면 단추 연속 두 번 (재검사 규칙 저장)
  await go('remind'); SRV.log.length=0;
  const sv=await p.$('#rmSave');
  if(sv){ await sv.dblclick(); await W(800); }
  ok('화면 단추 빨리 두 번 → 서버 요청 1번', !!sv && reqs('remindRuleSave').length===1, sv?'요청 '+reqs('remindRuleSave').length+'번':'단추 못 찾음');

  /* ── C. 실패를 «저장됨»으로 보이지 않게 + 다시 하기 ── */
  await go('deliv'); await p.evaluate(()=>{ OPEN_DRV="34나5678"; draw(); }); await W(700);
  if(await p.$('#dv-memo')){
    SRV.inject.push({fn:'deliv_update',mode:'err',msg:'저장하지 못했어요. 잠시 뒤 다시 해 주세요.'});
    await p.fill('#dv-memo','실패시험'); await p.click('#dvSave'); await W(800);
    const bt=await barTxt(), inBox=await p.evaluate(()=>{ const e=document.querySelector('#drvModal [data-v566-err]'); return e?e.innerText:''; }), rb=await p.$('#drvModal [data-v566-retry]');
    ok('배달 고치기 실패 → 빨간 글 · «저장했어요» 아님', /err/.test(bt) && !/저장했어요/.test(bt), bt.replace(/\n/g,' '));
    ok('상세 창이 열려 있으면 창 안에도 빨간 글', /저장하지 못했/.test(inBox), inBox.replace(/\n/g,' '));
    ok('실패하면 «다시 하기» 단추(창 안)', !!rb);
    if(rb){ await rb.click(); await W(900); const bt2=await barTxt(); const memo=SRV.db.deliv.find(x=>x.배달ID==='dv2').메모;
      ok('«다시 하기» → 저장됨', /ok/.test(bt2) && memo==='실패시험', bt2.replace(/\n/g,' ')); }
  } else ok('배달 상세 창 열기', false, '#dv-memo 없음');
  SRV.inject.push({fn:'feeRules',mode:'err',msg:'저장하지 못했어요.'});
  await p.evaluate(()=>{ call("feeRules",[{on:true,rules:[{who:"시험",how:"한 대마다",amt:1000}]}]).catch(function(){}); }); await W(500);   /* feeSet 과 같은 모양(실패를 조용히 넘김) */
  const fb=await barTxt(); ok('검사자 수수료 저장 실패 → 빨간 글(예전엔 조용히 넘어감)', /err/.test(fb) && /수수료/.test(fb), fb.replace(/\n/g,' '));
  SRV.log.length=0; const fr=await p.$('#bar [data-v566-retry]'); if(fr){ await fr.click(); await W(500); }
  const fb2=await barTxt(); ok('수수료 «다시 하기» → 다른 단추를 누르지 않고 같은 값만 다시 저장', !!fr && reqs('feeRules').length===1 && SRV.log.length===1 && /저장했어요/.test(fb2), fb2.replace(/\n/g,' '));

  /* ── D. 알림톡 보낸 결과 ── */
  await go('bill');
  await p.evaluate(ym=>billSendGo(["inv_"+ym+"_0","inv_"+ym+"_1","inv_"+ym+"_2"],false),ym); await W(1200);
  const bres=await text(), bbar=await barTxt();
  ok('청구서 보내기 결과 — 알림톡 · 짧은 문자 · 못 보냄 + 까닭', /알림톡/.test(bres) && /짧은 문자/.test(bres) && /못 보냄/.test(bres) && /연락처 없음/.test(bres));
  ok('하나라도 못 보내면 빨간 글', /err/.test(bbar), bbar.replace(/\n/g,' '));
  await go('deliv'); await p.evaluate(()=>{ const s=ts("drv"); s.sel={dv1:true,dv2:true}; });
  await p.evaluate(()=>delivAct('resend')); await W(400);
  const yes=await p.$('.cgg-dlg [data-dok], #ovl .yes, #ovl [data-yes]'); if(yes){ await yes.click(); await W(900); }
  const rbar=await barTxt(); ok('배달 다시 보내기 일부 실패 → 빨간 글(예전엔 초록)', /err/.test(rbar) && /실패 1건/.test(rbar), rbar.replace(/\n/g,' ')||'(단추 흐름 못 엶)');

  ok('스크립트 오류 없음', errs.length===0, errs.slice(0,3).join(' | '));
  await b.close();
  console.log(R.join('\n')); console.log('\n실행 '+(pass+fail)+' · 통과 '+pass+' · 실패 '+fail+' · 건너뜀 0');
  process.exit(fail?1:0);
})();
