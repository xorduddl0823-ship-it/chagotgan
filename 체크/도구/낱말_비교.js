/* 두 판의 낱말(token) 비교 — 체크 v56.5 «홈택스 파일 50건씩» 증명용 (체크 방 · 10/19)
   쓰는 법: node 체크/도구/낱말_비교.js <전 판.html> <뒤 판.html> <비교표.md>
   - 두 판의 <script> 를 acorn 으로 낱말로 나눠 차례로 맞춰요. 낱말 수 · 종류가 하나라도 다르면 멈춰요(종료 값 2).
   - 다른 낱말만 뽑아 «줄 · 함수 · 전 · 뒤» 표로 남겨요. 주석은 낱말이 아니라서 표에 안 나와요(주석 바뀐 줄은 따로 셈).
   - 예상한 것(EXPECT)과 하나라도 다르면 멈춰요. */
const fs=require('fs');
function req(n){ try{ return require(n); }catch(e){ return require('/opt/node-tools/node_modules/'+n); } }
const acorn=req('acorn'), walk=req('acorn-walk');
const OPT={ecmaVersion:'latest',sourceType:'script',allowReturnOutsideFunction:true};
const [fa,fb,fmd]=process.argv.slice(2), A=fs.readFileSync(fa,'utf8'), B=fs.readFileSync(fb,'utf8');
/* 예상: 함수 · 종류 · 전 → 뒤 */
const EXPECT=[
  ['hometaxGo','num','100','50'],
  ['hometaxGo','string','" (100건씩 파일 "','" (50건씩 파일 "'],
  ['hometaxGo','num','100','50'],['hometaxGo','num','100','50'],
].map(a=>a.join('|')).sort();
const VER=/^"체크 v56\.[45]( · )?"$/;   /* 판 이름 글자 */
const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
function scripts(h){ const o=[]; let m; re.lastIndex=0; while((m=re.exec(h))) o.push({src:m[1],at:m.index+m[0].indexOf('>')+1}); return o; }
function nameAt(ast,pos){ let best=null;
  walk.full(ast,n=>{ let nm=null, fn=null;
    if(n.type==='FunctionDeclaration'&&n.id){ nm=n.id.name; fn=n; }
    else if(n.type==='VariableDeclarator'&&n.id.type==='Identifier'&&n.init&&/Function/.test(n.init.type)){ nm=n.id.name; fn=n.init; }
    else if(n.type==='AssignmentExpression'&&/Function/.test(n.right.type)){ const l=n.left; nm=l.type==='Identifier'?l.name:(l.type==='MemberExpression'&&!l.computed?(l.property.name||l.property.value):null); fn=n.right; }
    else if(n.type==='Property'&&/Function/.test(n.value.type)){ nm=n.key.name||n.key.value; fn=n.value; }
    if(nm&&fn&&fn.start<=pos&&pos<fn.end&&(!best||fn.start>=best.s)) best={s:fn.start,n:nm}; });
  return best?best.n:''; }
const SA=scripts(A), SB=scripts(B); let stop=0; const rows=[], got=[];
if(SA.length!==SB.length){ console.log('❌ script 수가 달라요'); process.exit(2); }
SA.forEach((a,k)=>{ const b=SB[k]; if(a.src===b.src) return;
  const TA=[...acorn.tokenizer(a.src,OPT)], TB=[...acorn.tokenizer(b.src,OPT)], ast=acorn.parse(b.src,OPT);
  if(TA.length!==TB.length){ console.log('❌ 낱말 수가 달라요 (script '+k+')'); stop++; return; }
  TA.forEach((t,i)=>{ const u=TB[i], ra=a.src.slice(t.start,t.end), rb=b.src.slice(u.start,u.end);
    if(t.type.label!==u.type.label){ console.log('❌ 낱말 종류가 달라요: '+ra+' → '+rb); stop++; return; }
    if(ra===rb) return;
    const ln=B.slice(0,b.at+u.start).split('\n').length, fn=nameAt(ast,u.start);
    rows.push({ln,fn,kind:t.type.label,a:ra,b:rb});
    if(t.type.label==='string'&&VER.test(ra)&&VER.test(rb)) return;   /* 판 이름 */
    got.push([fn,t.type.label,ra,rb].join('|')); }); });
/* script 밖(HTML)은 맨 위 판 주석 한 줄만 달라야 해요 */
const outA=A.replace(re,'<script>'), outB=B.replace(re,'<script>');
const la=outA.split('\n'), lb=outB.split('\n'); let htmlDiff=0;
if(la.length!==lb.length) stop++; else la.forEach((l,i)=>{ if(l!==lb[i]){ htmlDiff++; if(!/^<!-- 체크 v56\.5 \(/.test(lb[i])){ console.log('❌ HTML 이 달라요 (줄 '+(i+1)+')'); stop++; } } });
got.sort(); if(got.join('\n')!==EXPECT.join('\n')){ console.log('❌ 예상과 달라요:\n'+got.join('\n')); stop++; }
/* 주석 바뀐 줄 (낱말 밖) */
const LA=A.split('\n'), LB=B.split('\n'), cm=[];
LA.forEach((l,i)=>{ if(l!==LB[i] && !rows.some(r=>r.ln===i+1)) cm.push(i+1); });
if(stop){ console.log('❌ 멈춰요'); process.exit(2); }
const e=s=>'`'+s.replace(/\|/g,'\\|')+'`';
fs.writeFileSync(fmd,['# 체크 v56.5 — 홈택스 일괄발급 파일 100건씩 → 50건씩 비교표','',
 '대표님 10/19 «지금 주는 홈택스 양식은 일괄 50건 발급 양식이라 50건이 맞다» (총괄 전달). `체크/도구/낱말_비교.js` 가 v56.4 · v56.5 의 자바스크립트를 낱말(token)로 나눠 차례로 맞췄어요 — 낱말 수 · 종류가 같고, 다른 낱말은 아래 표뿐이에요(예상과 하나라도 다르면 만들기가 멈춰요).',
 '돈 셈(합계 tot · 부가세) · 칸 이름 · 금액 · 영수 01 · 길이 제한 · 저장 값 · 서버로 가는 값은 그대로예요. 안내 «발행은 한 번에 50건씩» 도 그대로예요.','',
 '| 줄 | 함수 | 종류 | 전 | 뒤 |','|---|---|---|---|---|',
 ...rows.map(r=>'| '+r.ln+' | '+r.fn+' | '+(r.kind==='num'?'숫자':'글자')+' | '+e(r.a)+' | '+e(r.b)+' |'),'',
 '- 주석만 바뀐 줄: '+cm.join(' · ')+' (판 이름 주석 · 홈택스 설명 주석 2곳 — 낱말이 아니라 실행에 영향 없음)',
 '- 돈 함수 중 바뀐 것: hometaxGo 하나(나누는 건수 숫자 3곳 = parts 셈 · slice 앞뒤 · 확인 창 글 1곳). makeFile · writeHometax · 금액 셈은 그대로.',''].join('\n'));
console.log('다른 낱말 '+rows.length+'개 (판 이름 '+(rows.length-got.length)+' · hometaxGo '+got.length+') · 주석 줄 '+cm.length+' · 예상과 같음');
