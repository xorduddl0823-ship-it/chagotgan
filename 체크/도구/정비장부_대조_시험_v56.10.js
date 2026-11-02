/* 체크 v56.10 — 가온 정비 장부 받기 · 차 한 대씩 엑셀 시험 (지어낸 자료 · 진짜 서버 안 씀)
   쓰는 법: node 체크/도구/정비장부_대조_시험_v56.10.js <미리보기.html 절대 경로> <xlsx.full.min.js 0.18.5 절대 경로> */
const {chromium}=require('playwright'); const fs=require('fs');
const [F,X]=process.argv.slice(2); let fail=0; const ok=(c,m,x)=>{ console.log((c?'통과':'실패')+' — '+m+(x?' ('+x+')':'')); if(!c) fail++; };
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1440,height:900}, acceptDownloads:true});
 await p.route('**/xlsx.full.min.js',r=>r.fulfill({path:X,contentType:'application/javascript'}));
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+F); await p.waitForTimeout(1800);
 /* 가온 장부 모양 만들기 */
 await p.evaluate(()=>{
   const A=(rows)=>XLSX.utils.aoa_to_sheet(rows);
   const wb=XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb, A([["9월 정비"],["날짜","차량","차명","상사","이름","사유","금액"],["2026-09-03","12가3456","K5","하늘모터스","김하늘","세척비",30000]]), "2609정비");
   XLSX.utils.book_append_sheet(wb, A([]), "2608정비");
   XLSX.utils.book_append_sheet(wb, A([["날짜","차량","차명","상사","이름","사유","금액"],
     ["2026-10-02","12가3456","K5","하늘모터스","김하늘","세척비",30000],
     [46298,"34나5678","아반떼","푸른카","이푸름","주유비",50000],
     ["10/7","56다7890","쏘렌토","다온상사","최다온","세척비",30000],
     ["2026.10.09","78라1234","BMW 5","별빛오토","없는딜러","세척비",40000],
     ["","","","","","합계",150000],
     ["","","","","유현호 청구제외","",150000],
     ["","","","","김정현 선납","",250000]]), "2610 정비");
   window.__WB=wb; });
 const run=(ym)=>p.evaluate(ym=>{ ST.ym=ym; DEALERS=[{name:"김하늘"},{name:"이푸름"},{name:"최다온"}]; return chkRepairBook(__WB,"가온정비장부.xlsx"); }, ym);
 let r=await run('2026-10');
 ok(r && !r.err && r.sheet==='2610 정비', '10월을 고르면 «2610 정비» 시트(띄어쓰기 섞인 이름)만 읽음', r&&r.sheet);
 ok(r && r.rows.length===4, '날짜 있는 4줄만 넣음 (합계 · 메모 줄 빼기)', r&&r.rows.length);
 ok(r && r.rows.every(x=>/^2026-10-\d\d$/.test(x['작업일'])), '날짜 모양 4가지(2026-10-02 · 엑셀 숫자 · 10/7 · 2026.10.09) 모두 읽음', r&&r.rows.map(x=>x['작업일']).join(','));
 ok(r && r.rows[0]['차량번호']==='12가3456' && r.rows[0]['신청인']==='김하늘' && r.rows[0]['작업내용']==='세척비' && r.rows[0]['회사명']==='하늘모터스', '열 이름 바꾸기: 차량→차량번호 · 이름→신청인 · 사유→작업내용 · 상사→회사명');
 ok(r && /150,000원/.test(r.note), '합계 금액 글 «4건 · 150,000원»', r&&r.note.slice(0,30));
 ok(r && /확인 필요 2줄\(넣지 않았어요\): 유현호 청구제외 150000 \/ 김정현 선납 250000/.test(r.note), '청구제외 · 선납 메모는 넣지 않고 «확인 필요»로', r&&r.note);
 ok(r && /거래처에 없는 이름 1명: 없는딜러/.test(r.note) && r.warn, '거래처에 없는 이름 알림');
 ok(r && r.cols.indexOf('작업내용')>=0 && await p.evaluate(c=>guessKind('가온정비장부.xlsx',c),r.cols)==='정비비', '정비비로 알아봄');
 r=await run('2026-09'); ok(r && r.rows && r.rows.length===1, '9월: 머리줄이 2줄째여도 읽음', r&&(r.err||r.rows.length));
 r=await run('2026-08'); ok(r && /빈 시트/.test(r.err||''), '8월(빈 시트) → «넣을 정비 줄이 없어요»', r&&r.err);
 r=await run('2026-11'); ok(r && /«2611정비» 시트가 없어요/.test(r.err||''), '11월(시트 없음) → 달 칸을 바꾸라는 글', r&&r.err);
 ok(await p.evaluate(()=>chkRepairBook(XLSX.utils.book_new(),"x.xlsx"))===null, '가온 장부 모양이 아니면 예전대로(null)');
 /* 올리기 흐름 끝까지 — 서버로 가는 줄 · 달 */
 await p.evaluate(()=>{ ST.ym='2026-10'; DEALERS=[{name:"김하늘"},{name:"이푸름"},{name:"최다온"},{name:"없는딜러"}]; window.__PUT=[]; const raw=window.call;
   window.call=function(fn,a){ if(fn==='excelPut') __PUT.push({kind:a[0], n:(a[1]||[]).length, ym:a[2], rows:a[1]}); return raw.apply(this,arguments); };
   const out=XLSX.write(__WB,{type:'array',bookType:'xlsx'}); const f=new File([out],"가온 정비장부 2026.xlsx");
   const box=document.createElement('div'); box.id='tMsg'; document.body.appendChild(box); putExcels([f],'tMsg'); });
 await p.waitForTimeout(2500);
 const put=await p.evaluate(()=>__PUT);
 const real=put.filter(x=>x.n>0);
 ok(real.length===1 && real[0].kind==='정비비' && real[0].n===4 && real[0].ym==='2026-10', '서버로 정비비 4줄 · 10월로 보냄', JSON.stringify(real.map(x=>[x.kind,x.n,x.ym])));
 ok(real.length && real[0].rows.every(x=>x['작업일'] && x['신청인'] && x['금액']>0), '보내는 줄마다 작업일 · 신청인 · 금액');
 const msg=await p.evaluate(()=>document.getElementById('tMsg').innerText);
 ok(/정비비 4줄/.test(msg) && /2610 정비/.test(msg) && /확인 필요/.test(msg), '다 올린 뒤 글에 시트 · 건수 · 확인 필요', msg.slice(0,120));
 ok(await p.evaluate(()=>/warn/.test(document.getElementById('tMsg').className) && !/안 된 것/.test(document.getElementById('tMsg').innerText)), '메모 줄이 있으면 주황 «확인 필요» (빨간 «안 된 것» 아님)');
 /* 차 한 대씩 엑셀 */
 await p.evaluate(()=>go('bill')); await p.waitForTimeout(900);
 ok(!!(await p.$('#bCarXls')), '월별 청구서에 «차 한 대씩 엑셀» 단추');
 await p.evaluate(()=>{ BILLS.forEach((b,i)=>{ b.rows=[{kind:"fee",dealer_name:b.name,item:"국산",unit:30000,amount:33000,car:{plate:"11가1111",check_date:"2026-10-0"+(i+1)}}]; });
   BILLS[0].rows.push({kind:"fee",dealer_name:BILLS[0].name,item:"국산 선납",unit:30000,amount:33000,car:{plate:"22나2222",check_date:"2026-10-05"}}); });
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:8000}).catch(()=>null), p.click('#bCarXls')]);
 ok(!!dl, '엑셀 받기');
 if(dl){ const path=await dl.path(); const rows=await p.evaluate(buf=>{ const wb=XLSX.read(new Uint8Array(buf),{type:'array'}); return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1}); }, [...fs.readFileSync(path)]);
   ok(rows[0].join(',')==='청구처,신청인,차량번호,검사일,상품명,갈래,금액,확인', '칸: 청구처 · 신청인 · 차량번호 · 검사일 · 상품명 · 갈래 · 금액 · 확인');
   ok(rows.slice(1).filter(r=>/같은 차량번호가/.test(r[7]||'')).length>=2, '같은 차량번호 여러 줄 → «확인» 칸');
   ok(rows.slice(1).some(r=>/선납이 있는데 금액/.test(r[7]||'')), '선납인데 금액 → «확인» 칸'); }
 ok(await p.evaluate(()=>{ const m=document.querySelector('#bar .msg'); return !!m && /warn/.test(m.className) && /확인 필요/.test(m.innerText) && /전부/.test(m.innerText); }), '받은 뒤 주황 «확인 필요 N줄» · 이 달 청구처 전부');

 /* 청구처 펼침 표 차량번호 · 검사일 */
 const cols=await p.evaluate(()=>{ OPEN_BILL=BILLS[0].name; OPEN_KIND="fee"; const h=billDetail(); return h; });
 ok(/차량번호/.test(cols) && /검사일/.test(cols) && /22나2222/.test(cols), '청구처 펼침 표에 차량번호 · 검사일');
 ok(!errs.length, '화면 오류 없음', errs.join('|'));
 await b.close(); console.log(fail?('실패 '+fail+'건'):'모두 통과'); process.exit(fail?1:0); })();
