/* 체크 v56.4 — 화면 글 «발급» → «발행» (대표님 10/19 허락 · 총괄 전달 · 워시 v140 과 같은 말)
   쓰는 법: node 체크/도구/발행_말바꿈.js <들어갈 판.html> <나올 판.html> <비교표.md>
   - 체크 몫 <script> 만 봐요. 공통 부품(cgg-j4 · 메뉴 지도 · 알림톡 부품)은 디자인 방 서랍이라 건드리지 않아요.
   - 바꾸는 곳은 문자열(따옴표 · `…` 안)뿐이에요. 정규식 /발급|전송/ · sameWord 의 /발급/g(셈) · 값 "발급"(상태 비교) · 검색 낱말(words:) 은 그대로.
   - 그대로 둘 이름: «수정발급»(팝빌 화면 이름) · «일괄발급» · «발급내역»(홈택스 메뉴 이름) · «미발급»(공통 거래처 부품과 같은 말 · 다음 판에 공통으로).
   - 증명 ①: 바뀐 줄마다 따옴표 안을 지운 줄이 전과 뒤에 같아야 해요 · 증명 ②: 다시 읽은 낱말(token) 차례 · 종류 · 문자열 밖 값이 모두 같아야 해요. 하나라도 다르면 멈춰요(종료 값 2). */
const fs=require('fs'), path=require('path');
function req(n){ try{ return require(n); }catch(e){ return require('/opt/node-tools/node_modules/'+n); } }
const acorn=req('acorn'), walk=req('acorn-walk');
const ROOT=path.join(__dirname,'..','..');
const [fin,fout,fmd]=process.argv.slice(2);
const html=fs.readFileSync(fin,'utf8');
const OPT={ecmaVersion:'latest',sourceType:'script',allowReturnOutsideFunction:true};
/* 남의 서랍(공통 부품) 자리 */
const SHARED=['디자인/공통/cgg-j4-1.13.2.js','디자인/메뉴지도/체크_메뉴.js','디자인/공통/cgg-ata-1.1.js'].map(p=>{
  const t=fs.readFileSync(path.join(ROOT,p),'utf8'), i=html.indexOf(t);
  if(i<0||html.indexOf(t,i+1)>=0){ console.log('❌ 공통 부품 자리를 못 찾음: '+p); process.exit(2); }
  return [i,i+t.length,p]; });
const MONEY=new Set(`calc loadPrice priceAddGo priceDelGo priceNext1 sums won money vmoney billDel billLoadRows billMove billOut billSel billSendGo billSendResult billTargets billUnsend billXls loadBill afterPay cwPay payHist loadBal match depApplyGo depDelGo depKindGo depNorm depPicked depUndoGo depXlsGuess depXlsParse depXlsRead depXlsWhen smsParse txPicked feeGet feeKey feeSet insCancel insG insSum loadIns setInsQ hometaxGo loadTax ptTax taxOf
leftOf taxOf depSrv billSendGo billDocHtml hometaxGo dueBlock splitPartner billAtaText call insMoney`.split(/\s+/));
const KEEP=['수정발급','일괄발급','발급내역','미발급'];
function swap(raw){ let t=raw; KEEP.forEach((k,i)=>{ t=t.split(k).join('\u0000'+i+'\u0000'); });
  t=t.replace(/발급/g,'발행'); KEEP.forEach((k,i)=>{ t=t.split('\u0000'+i+'\u0000').join(k); }); return t; }
function toks(src){ const a=[]; for(const t of acorn.tokenizer(src,OPT)) a.push(t); return a; }
const isStr=t=>t.type.label==='string'||t.type.label==='template';
/* 줄에서 따옴표 안을 지움 (증명 ①) */
function strip(line){ return line.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g,'""'); }
function nameAt(ast,pos){ let best=null;
  walk.full(ast,n=>{ let nm=null, fn=null;
    if(n.type==='FunctionDeclaration'&&n.id){ nm=n.id.name; fn=n; }
    else if(n.type==='VariableDeclarator'&&n.id.type==='Identifier'&&n.init&&/Function/.test(n.init.type)){ nm=n.id.name; fn=n.init; }
    else if(n.type==='AssignmentExpression'&&/Function/.test(n.right.type)){ const l=n.left; nm=l.type==='Identifier'?l.name:(l.type==='MemberExpression'&&!l.computed?(l.property.name||l.property.value):null); fn=n.right; }
    else if(n.type==='Property'&&/Function/.test(n.value.type)){ nm=n.key.name||n.key.value; fn=n.value; }
    if(nm&&fn&&fn.start<=pos&&pos<fn.end&&(!best||fn.start>=best.s)) best={s:fn.start,n:nm}; });
  return best?best.n:''; }
const out=[], rows=[]; let last=0, fail=0, before=0;
const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi; let m;
while((m=re.exec(html))){
  const s0=m.index+m[0].indexOf('>')+1, src=m[1];
  if(SHARED.some(([a,b])=>s0<b&&a<s0+src.length)){ continue; }   /* 공통 부품 덩어리 — 그대로 */
  if(src.indexOf('발급')<0) continue;
  let ast; try{ ast=acorn.parse(src,OPT); }catch(e){ console.log('❌ 못 읽은 script (줄 '+html.slice(0,s0).split('\n').length+')'); process.exit(2); }
  const T=toks(src); let ns='', p=0;
  T.forEach((t,i)=>{ const raw=src.slice(t.start,t.end);
    let nw=raw;
    if(isStr(t)&&raw.indexOf('발급')>=0){
      const p1=T[i-1], p2=T[i-2], val=String(t.value);
      const words=p1&&p1.type.label===':'&&p2&&p2.value==='words';
      if(!words&&val!=='발급') nw=swap(raw); }
    ns+=src.slice(p,t.start)+nw; p=t.end;
    if(nw!==raw){ const ln=html.slice(0,s0+t.start).split('\n').length, fn=nameAt(ast,t.start);
      rows.push({ln,fn,money:MONEY.has(fn),a:raw,b:nw}); } });
  ns+=src.slice(p);
  /* 증명 ② 낱말 차례 · 종류 · 문자열 밖 값 */
  const U=toks(ns);
  if(U.length!==T.length){ console.log('❌ 낱말 수가 달라요'); process.exit(2); }
  T.forEach((t,i)=>{ const u=U[i]; if(t.type.label!==u.type.label||(!isStr(t)&&String(t.value)!==String(u.value))){ fail++; console.log('❌ 문자열 밖이 달라요: '+t.value+' → '+u.value); } });
  /* 증명 ① 바뀐 줄마다 */
  const A=src.split('\n'), B=ns.split('\n');
  if(A.length!==B.length){ console.log('❌ 줄 수가 달라요'); process.exit(2); }
  A.forEach((l,i)=>{ if(l!==B[i]&&strip(l)!==strip(B[i])){ fail++; console.log('❌ 따옴표 밖이 달라요 (줄 '+(html.slice(0,s0).split('\n').length+i)+')'); } });
  out.push(html.slice(last,s0)+ns); last=s0+src.length; }
out.push(html.slice(last));
if(fail){ console.log('❌ 멈춰요 — '+fail+'곳'); process.exit(2); }
const res=out.join('');
/* 남은 «발급» 세기 (그대로 둔 곳) */
const left=(res.match(/발급/g)||[]).length;
fs.writeFileSync(fout,res);
const e=s=>'`'+s.replace(/\|/g,'\\|').replace(/\n/g,' ')+'`';
const fns=[...new Set(rows.map(r=>r.fn).filter(Boolean))];
const md=['# 체크 v56.4 — 화면 글 «발급» → «발행» 비교표','',
 '대표님 10/19 허락(총괄 전달) · 워시 v140 과 같은 말. `체크/도구/발행_말바꿈.js` 가 바뀐 줄마다 **따옴표 안을 지운 줄이 전 · 뒤 같은지**, 그리고 **다시 읽은 낱말(token)의 차례 · 종류 · 문자열 밖 값이 모두 같은지** 확인했어요 — 하나라도 다르면 만들기가 멈춰요.',
 '그대로 둔 것: 정규식 `/발급|전송/`(상태 셈) · sameWord 의 `/발급/g` · 값 `"발급"`(상태 비교) · 검색 낱말(`words:`) · «수정발급»(팝빌 화면 이름) · «일괄발급» · «발급내역»(홈택스 메뉴 이름) · «미발급»(공통 거래처 부품과 같은 말) · 공통 부품(cgg-j4 1.13.2 · 메뉴 지도 · 알림톡 부품) 전부.','',
 '덧붙임(만들기_체크_v56.4.py): v56.3 의 화면 글 바꾸기 두 곳(`sameWord` · 세금계산서 · 정산 기록 · 청구서 화면 글자 바꾸기)이 «일괄발급» 같은 이름까지 «일괄발행»으로 바꾸던 것을 이름은 그대로 두게 고쳤어요(정규식 셈 한 줄씩 · 돈 함수 아님).','',
 '| 줄 | 함수 | 돈 함수 | 전 (글자) | 뒤 (글자) |','|---|---|---|---|---|',
 ...rows.map(r=>'| '+r.ln+' | '+r.fn+' | '+(r.money?'**예**':'')+' | '+e(r.a)+' | '+e(r.b)+' |'),'',
 '바뀐 문자열 '+rows.length+'곳 · 돈 함수 안 '+rows.filter(r=>r.money).length+'곳('+[...new Set(rows.filter(r=>r.money).map(r=>r.fn))].join(' · ')+') · 함수 '+fns.join(', '),
 '파일 안에 남은 «발급» '+left+'곳 = 위 «그대로 둔 것» · 주석.',''];
fs.writeFileSync(fmd,md.join('\n'));
console.log('바뀐 문자열 '+rows.length+'곳 · 돈 함수 안 '+rows.filter(r=>r.money).map(r=>r.fn).join(',')+' · 남은 «발급» '+left+' · 증명 ①② 통과');
