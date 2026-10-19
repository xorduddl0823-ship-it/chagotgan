/* 전체 검사 (0단계 안전장치) — 화면 통합 중에 «돈 코드»가 한 글자도 안 바뀌었는지 + 두 제품 모양이 같은지 한 번에 봐요. (디자인 방)
   쓰는 법 (저장소 맨 위 폴더에서):
     node 디자인/통합검사/전체검사.js <워시 새 판> <체크 새 판>            ← 판을 올리기 전에 늘 이것
     node 디자인/통합검사/전체검사.js <워시 새 판> <체크 새 판> --no-shape ← 모양 비교는 빼고 돈 코드만
     node 디자인/통합검사/전체검사.js --save                             ← 기준값 다시 뜨기(정식 판이 바뀌었을 때만, 총괄 확인 뒤)
   ① 돈 코드 지문: 정산 · 입금 맞추기 · 세금계산서 · 청구서 만들기 · 단가 · 부가세 함수 본문을 정식 판(기준값 파일)과 새 판에서 뽑아
      지문(sha256)을 비교해요. 하나라도 다르거나 없으면 ❌ 로 멈춰요(종료 값 3). 띄어쓰기 · 줄바꿈만 다른 건 같다고 봐요.
   ② 모양 비교: 같은 폴더 검사.js 를 그대로 불러 «다른 것 N가지»를 받아요(0이 아니면 종료 값 2).
   ③ 결과를 한 표로 보여 줘요. 파일은 바꾸지 않아요(--save 때만 기준값 파일을 써요). */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const HERE=__dirname, BASEFILE=path.join(HERE,'돈코드_기준값.json');
/* 지금 정식 판 — 바뀌면 총괄과 정한 뒤 --save 로 기준값을 다시 떠요 */
const OFFICIAL={wash:'워시/1_차곳간_워시_index_v141.html', check:'체크/2_차곳간_체크_index_v56.5.html'};
/* 돈 코드 함수 목록 — 두 파일을 검색해서 뽑았어요(10/18). 화면만 그리는 함수(render*·draw*·*Html·*Sheet 등)는 화면 통합 때 바뀌는 게 맞아서 뺐어요.
   단, 단가표 · 부가세 안내(renderPriceSets · vatHint)는 돈 숫자를 직접 만지므로 넣었어요(총괄 지정). */
const MONEY={
  wash:['calc','splitVat','vatMode','setVat','vatHint','priceSets','renderPriceSets','sum','sums','sumUp','won','wonExact','swon','vmoney',
    'billAmt','billCode','billDetailCsv','billDue','billDueDate','billKey','billMode','billPayload','billPlan','billSentFor','billState','billTargets','billVars','billableMonth','buildBills','markBilled','sendOneBill',
    'afterPay','cwPay','payHist','loadBal','canSettle','isMoneyRec','bankCfg','bankNeed','depositNotice','match','plateMatch','mnBills','mnMatch','mnMatchSet','dueGroups','duePay','dueUndo','twinsOf','jLedgerState','ledgerRows',
    'exportHometax','exportHometax0','exportTaxCsv','hometaxRows','writeHometax','issuerOf','recTaxType','taxBillCode','taxBillFor','taxBillOf','taxBillTotal','taxDocId','taxGroups','taxIssuedReal','taxIssues','taxOf','taxParty','taxPayOf','taxPending','taxSentRows',
    'pbIssueSelected','pbMgtKey','pbRun'],
  check:['calc','loadPrice','priceAddGo','priceDelGo','priceNext1','sums','won','money','vmoney',
    'billDel','billLoadRows','billMove','billOut','billSel','billSendGo','billSendResult','billTargets','billUnsend','billXls','loadBill',
    'afterPay','cwPay','payHist','loadBal','match','depApplyGo','depDelGo','depKindGo','depNorm','depPicked','depUndoGo','depXlsGuess','depXlsParse','depXlsRead','depXlsWhen','smsParse','txPicked',
    'feeGet','feeKey','feeSet','insCancel','insG','insSum','loadIns','setInsQ','hometaxGo','loadTax','ptTax','taxOf']};

/* 함수 본문 뽑기 — «function 이름(» · «이름=function(» · «이름:function(» 뒤의 { … } 를 글자 · 주석 · 정규식을 건너뛰며 짝 맞춰 찾아요.
   같은 이름이 여러 번 있으면 나온 차례대로 모두 모아요. */
function bodies(src,name){
  const re=new RegExp('(?:function\\s+'+name+'\\s*\\(|[^A-Za-z0-9_$.]'+name+'\\s*[=:]\\s*(?:async\\s+)?function\\s*\\()','g'); const out=[]; let m;
  while((m=re.exec(src))){ const st=src.indexOf('{',m.index+m[0].length); if(st<0) break; const end=close(src,st); if(end<0) break; out.push(src.slice(m.index,end+1)); re.lastIndex=end+1; }
  return out; }
function close(s,i){ let d=0, prev='';
  for(;i<s.length;i++){ const c=s[i];
    if(c==='"'||c==="'"){ i=str(s,i,c); prev='a'; continue; }
    if(c==='`'){ i=tpl(s,i); prev='a'; continue; }
    if(c==='/'&&s[i+1]==='/'){ i=s.indexOf('\n',i); if(i<0) return -1; continue; }
    if(c==='/'&&s[i+1]==='*'){ i=s.indexOf('*/',i+2)+1; if(i<=0) return -1; continue; }
    if(c==='/'&&/[(,=:\[!&|?{};+\-*%<>~^]|^$/.test(prev)){ i=rx(s,i); prev='a'; continue; }
    if(c==='{') d++; else if(c==='}'){ d--; if(d===0) return i; }
    if(!/\s/.test(c)) prev=c; }
  return -1; }
function str(s,i,q){ for(i++;i<s.length;i++){ if(s[i]==='\\'){ i++; continue; } if(s[i]===q||s[i]==='\n') return i; } return i; }
function tpl(s,i){ for(i++;i<s.length;i++){ if(s[i]==='\\'){ i++; continue; } if(s[i]==='`') return i; if(s[i]==='$'&&s[i+1]==='{'){ i=close(s,i+1); if(i<0) return s.length; } } return i; }
function rx(s,i){ let cls=false; for(i++;i<s.length;i++){ const c=s[i]; if(c==='\\'){ i++; continue; } if(c==='\n') return i; if(c==='[') cls=true; else if(c===']') cls=false; else if(c==='/'&&!cls){ while(/[a-z]/i.test(s[i+1]||'')) i++; return i; } } return i; }
const norm=t=>t.replace(/\s+/g,' ').trim();
const fp=t=>crypto.createHash('sha256').update(norm(t)).digest('hex').slice(0,16);
function prints(file,names){ const src=fs.readFileSync(file,'utf8'), o={};
  names.forEach(n=>{ const b=bodies(src,n); o[n]=b.length?b.map(fp).join('+'):null; }); return o; }

const args=process.argv.slice(2), flags=args.filter(a=>a.startsWith('--')), files=args.filter(a=>!a.startsWith('--'));
if(flags.includes('--save')){
  const base={made:new Date().toISOString().slice(0,10),files:OFFICIAL,money:{}};
  for(const p of ['wash','check']){ base.money[p]=prints(OFFICIAL[p],MONEY[p]); const miss=Object.keys(base.money[p]).filter(k=>!base.money[p][k]);
    if(miss.length){ console.log('❌ 정식 판에 없는 함수: '+p+' '+miss.join(', ')+' — 목록을 고친 뒤 다시 떠요'); process.exit(3); } }
  fs.writeFileSync(BASEFILE,JSON.stringify(base,null,1)+'\n'); console.log('기준값을 떴어요: '+path.relative(process.cwd(),BASEFILE)+' (워시 '+MONEY.wash.length+'개 · 체크 '+MONEY.check.length+'개 함수)'); process.exit(0); }
if(files.length<2){ console.log('쓰는 법: node 디자인/통합검사/전체검사.js <워시 새 판> <체크 새 판> [--no-shape] · 기준값 다시 뜨기: --save'); process.exit(1); }
if(!fs.existsSync(BASEFILE)){ console.log('기준값 파일이 없어요. 먼저 --save 로 떠요.'); process.exit(1); }
const BASE=JSON.parse(fs.readFileSync(BASEFILE,'utf8'));

/* ① 돈 코드 지문 */
const rows=[]; let moneyBad=0;
[['wash','워시',files[0]],['check','체크',files[1]]].forEach(([p,lab,f])=>{
  const now=prints(f.split('#')[0],MONEY[p]), base=BASE.money[p];
  MONEY[p].forEach(n=>{ const a=base[n], b=now[n], ok=!!b&&a===b; if(!ok) moneyBad++;
    rows.push({lab,n,res:ok?'✅ 같음':(!b?'❌ 새 판에 없음':'❌ 바뀜')}); }); });
console.log('## ① 돈 코드 지문 — 기준: 워시 '+path.basename(BASE.files.wash)+' · 체크 '+path.basename(BASE.files.check)+' ('+BASE.made+')');
const bad=rows.filter(r=>!r.res.startsWith('✅'));
console.log('| 제품 | 같음 | 다름 · 없음 |\n|---|---|---|');
['워시','체크'].forEach(l=>{ const r=rows.filter(x=>x.lab===l); console.log('| '+l+' | '+r.filter(x=>x.res.startsWith('✅')).length+' / '+r.length+' | '+(r.filter(x=>!x.res.startsWith('✅')).map(x=>x.n+' '+x.res.slice(2)).join(', ')||'없음')+' |'); });

/* ② 모양 비교 (검사.js 그대로) */
let shape='건너뜀 (--no-shape)', shapeBad=0;
if(!flags.includes('--no-shape')){
  const r=cp.spawnSync(process.execPath,[path.join(HERE,'검사.js'),files[0],files[1]],{encoding:'utf8',maxBuffer:1<<24});
  const m=/다른 것 (\d+)가지 \/ (\d+)가지/.exec(r.stdout||'');
  if(m){ shapeBad=+m[1]; shape=(shapeBad?'❌ ':'✅ ')+'다른 것 '+m[1]+'가지 / '+m[2]+'가지'; console.log('\n## ② 모양 비교 (검사.js)\n'+r.stdout.trim().split('\n').slice(0,-1).join('\n')); }
  else { shapeBad=1; shape='❌ 검사.js 가 끝까지 못 돌았어요: '+((r.stderr||'').split('\n')[0]||'까닭 모름'); } }

/* ③ 한 표 */
console.log('\n## ③ 결과\n| 검사 | 결과 |\n|---|---|');
console.log('| 돈 코드 지문 ('+rows.length+'개 함수) | '+(moneyBad?'❌ '+moneyBad+'개 다름 — **멈춰요. 돈 코드는 고치면 안 돼요**':'✅ 모두 같음')+' |');
console.log('| 두 제품 모양 | '+shape+' |');
process.exit(moneyBad?3:shapeBad?2:0);
