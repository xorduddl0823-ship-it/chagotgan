/* 체크 v56.10 도착 알림 스위치 시험 — node 체크/도구/알림스위치_시험_v56.10.js [미리보기 html] [사진 폴더]
   ① 대표: 홈·배달에 스위치 · 끄기 확인 창 · 끈 뒤 꺼짐 · 다시 켜기 ② 직원: 잠금 «대표만» ③ 서버 v54(칸 없음): 잠금 «서버 준비 중» ④ 저장이 버려지면 오류 글 */
const {chromium}=require('playwright'); const path=require('path');
const F=path.resolve(process.argv[2]||'체크/시안/체크_v56.10_미리보기.html'), OUT=process.argv[3]||'';
let fail=0; const ok=(c,m)=>{ console.log((c?'통과':'실패')+' — '+m); if(!c) fail++; };
(async()=>{ const b=await chromium.launch();
 async function open(w,init){ const p=await b.newPage({viewport:{width:w,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
   if(init) await p.addInitScript(init); await p.goto('file://'+F); await p.waitForTimeout(1600); p.errs=errs; return p; }
 const row=p=>p.evaluate(()=>{ const r=document.querySelector('#main .v5610-alarm'); if(!r) return null; const s=r.querySelector('.v5610-sw');
   return {off:r.classList.contains('off'), st:r.querySelector('.st').textContent, lock:(r.querySelector('.lock')||{}).textContent||'', dis:s.disabled, chk:s.getAttribute('aria-checked'), next:(r.nextElementSibling||{}).className||'', txt:r.innerText}; });
 // ① 대표
 for(const w of [1440,390]){
  const p=await open(w);
  let r=await row(p); ok(r && r.st==='켜짐' && !r.dis && /cgg-sec/.test(r.next), w+' 홈: 스위치 «켜짐» · «오늘 할 일» 바로 위');
  if(OUT) await p.screenshot({path:OUT+'/홈_'+w+'.png'});
  await p.click('#main .v5610-sw'); await p.waitForTimeout(300);
  const dlg=await p.evaluate(()=>{ const d=document.querySelector('.cgg-dlg'); return d&&d.offsetHeight?d.innerText:''; });
  ok(/도착 알림을 끌까요/.test(dlg) && /끄기/.test(dlg), w+' 끄기 확인 창');
  if(OUT) await p.screenshot({path:OUT+'/끄기창_'+w+'.png'});
  await p.click('.cgg-dlg [data-dok]'); await p.waitForTimeout(500);
  r=await row(p); ok(r && r.off && r.st==='꺼짐' && r.chk==='false', w+' 끈 뒤 «꺼짐» 빨간 줄');
  await p.evaluate(()=>go('deliv')); await p.waitForTimeout(900);
  r=await row(p); ok(r && r.off && /v55-per/.test(r.next), w+' 배달: 기간 줄 바로 위 · 꺼짐 그대로');
  if(OUT) await p.screenshot({path:OUT+'/배달_꺼짐_'+w+'.png'});
  await p.click('#main .v5610-sw'); await p.waitForTimeout(300);
  ok(/다시 켤까요/.test(await p.evaluate(()=>document.querySelector('.cgg-dlg').innerText)), w+' 켜기 확인 창');
  await p.click('.cgg-dlg [data-dok]'); await p.waitForTimeout(500);
  r=await row(p); ok(r && !r.off && r.st==='켜짐', w+' 다시 켜짐');
  // 취소하면 그대로
  await p.click('#main .v5610-sw'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  r=await row(p); ok(r && !r.off, w+' 취소하면 그대로 켜짐');
  ok(!p.errs.length, w+' 화면 오류 없음 '+p.errs.join('|')); await p.close(); }
 // ② 직원
 { const p=await open(1440); await p.evaluate(()=>{ ST.role='staff'; chkV5610.place(); }); await p.waitForTimeout(200);   /* 미리보기는 열 때 대표로 넣어서 — 열린 뒤 직원으로 */
   const r=await row(p); await p.evaluate(()=>chkV5610.ask()); await p.waitForTimeout(200);
   ok(!(await p.evaluate(()=>{ const d=document.querySelector('.cgg-dlg'); return d&&d.offsetHeight; })), '직원: 눌러도 확인 창 안 뜸'); ok(r && r.dis && /대표만/.test(r.lock), '직원: 스위치 잠금 «대표만 바꿀 수 있어요»'); await p.close(); }
 // ③ 서버 v54 (arrive_on 칸 없음)
 { const p=await open(1440,()=>{ window.__NOARRIVE=1; });
   let r=await row(p); ok(r && r.dis && /서버 준비 중/.test(r.lock) && r.st==='켜짐', '서버 v54: 잠금 «서버 준비 중» (켜짐으로 보임)');
   await p.evaluate(()=>go('deliv')); await p.waitForTimeout(900); r=await row(p); ok(r && r.dis, '서버 v54: 배달 화면도 잠금');
   // ④ 잠금을 우회해 눌러도 저장 확인에서 걸림
   await p.evaluate(()=>{ DCONF.arrive_on=true; chkV5610.place(); }); await p.waitForTimeout(200);
   await p.evaluate(()=>{ document.querySelector('#main .v5610-alarm').remove(); chkV5610.place(); }); await p.waitForTimeout(200);
   await p.click('#main .v5610-sw'); await p.waitForTimeout(300); await p.click('.cgg-dlg [data-dok]'); await p.waitForTimeout(600);
   const er=await p.evaluate(()=>{ const e=document.getElementById('v5610Err'); return e&&!e.hidden?e.textContent:''; });
   ok(/저장되지 않았어요/.test(er), '서버가 저장을 버리면 «서버에 저장되지 않았어요» (꺼진 척 안 함)');
   await p.close(); }
 // 배달 표 «꺼짐» 줄
 { const p=await open(1440); const t=await p.evaluate(()=>{ return typeof mapDrive==='function' ? mapDrive({배달ID:'x',발송결과:'꺼짐',도착일시:'2026-11-02 10:00'}).alarm : '-'; });
   ok(t==='꺼짐', '서버 발송결과 «꺼짐» → 알림 칸 «꺼짐»'); await p.close(); }
 await b.close(); console.log(fail?('실패 '+fail+'건'):'모두 통과'); process.exit(fail?1:0); })();
