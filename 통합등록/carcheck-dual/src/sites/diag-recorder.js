/**
 * 진단 기록기 (8차 · 검수 보완) — 실제 전산 화면을 «바꾸지 않고» 요청 모양과 화면 구조만 기록한다
 * ------------------------------------------------------------------
 *  가온 내부용 전산 연결 칸. 두 겹 막기(diag-session.js: 세션 거르개 + 창별 붙잡기)가 이 판단(decide)을 쓴다.
 *
 *  «안전한 조회만 허용»
 *   · 내보냄: 그림·글꼴·모양·코드 파일 GET · 그 전산 주소로 가는 화면·조회 GET 중 주소·물음표 뒤에 저장 같은 말이 없는 것
 *   · 막음:   그 밖의 모든 것 — POST·PUT·PATCH·DELETE(신규등록·사진 올리기·저장·전송·로그인 포함) · 저장처럼 보이는 GET ·
 *             다른 주소로 가는 화면·조회(iframe 포함) · 실시간 연결·신호
 *  기록에는 값을 남기지 않는다 — 주소 경로, 물음표 뒤 «이름», 보내려던 자료의 «칸 이름»만.
 *  파일로 쓰기 전에 maskDiag 로 개인정보 무늬를 가리고 checkDiag 로 다시 검사한다(남으면 파일을 만들지 않음 — main.js).
 *  쿠키·토큰·비밀번호·문자 인증번호는 읽지 않는다(머리글·값을 기록하지 않음).
 *  한계: 사람 이름처럼 무늬가 없는 글자는 무늬로 못 찾는다 → 화면 뼈대에서 표·글 칸 글자는 통째로 지우는 방식으로 막는다.
 */

//  GET 이라도 붙잡을 주소 낱말(저장·등록·삭제·전송·올리기 등)
//  (짧은 말 del·reg 는 model·region 같은 조회 주소에도 들어 있어 뺐다)
const WRITE_WORDS = /(save|insert|update|delete|remove|regist|write|upload|submit|modify|cancel|send|proc|apply|confirm|approve|issue|transfer|commit|exec)/i;
//  늘 내보내도 되는 «정적 자료»(그림·글꼴·모양·코드 파일) — 조회만 하는 GET 일 때
const STATIC = /^(image|font|stylesheet|script|media|manifest)$/;
//  늘 막는 종류 — 실시간 연결·신호·보고(서버로 무언가를 보냄)
const NEVER = /^(websocket|ping|cspreport|eventsource|beacon)$/;

function hostOf(url) { try { return new URL(url).host.toLowerCase(); } catch { return ''; } }
function pathOf(url) { try { return new URL(url).pathname; } catch { return String(url || '').split('?')[0].slice(0, 200); } }
/** 기록용 경로 — %EA%B0%80 같은 글자를 풀어서 가리기 규칙이 제대로 걸리게 */
function pathForLog(url) { const p = pathOf(url); try { return decodeURIComponent(p); } catch { return p; } }
function queryKeys(url) { try { return [...new URL(url).searchParams.keys()].slice(0, 40); } catch { return []; } }
/** 물음표 뒤 «이름=값» 전체에 저장처럼 보이는 말이 있나 (?cmd=save 같은 GET 저장) — 값은 판단에만 쓰고 기록하지 않음 */
function queryLooksWrite(url) {
  try { for (const [k, v] of new URL(url).searchParams) { if (WRITE_WORDS.test(k) || WRITE_WORDS.test(v)) return true; } } catch {}
  return false;
}

/** 요청 종류 이름 맞추기 — 개발자 연결(CDP)·세션(webRequest) 이름을 한 가지로 */
function kindName(k) {
  const t = String(k || '').toLowerCase();
  if (t === 'form' || t === 'document' || t === 'mainframe' || t === 'subframe') return 'document';
  if (t === 'ajax' || t === 'xhr' || t === 'fetch') return 'xhr';
  return t || 'other';
}

/**
 * 진단 중 이 요청을 내보내도 되나 — «확인된 읽기 전용 경로만 허용»(8차 보완 2차 검수)
 *  내보냄: ① 그 전산 주소(같은 host)의 그림·글꼴·모양·코드 파일 GET (주소·물음표 뒤에 저장 같은 말이 없을 때)
 *          ② 그 전산 주소로 가는 화면·조회 GET 중 «읽기 전용으로 확인된 경로»(설정 diagReadPaths)에 맞고, 저장 같은 말이 없는 것
 *  막음:   그 밖의 모든 것 — 확인 안 된 GET(기본 차단) · POST·PUT·PATCH·DELETE · 다른 주소 · 실시간 연결·신호
 *  금지 단어 검사는 «덧붙인 막기»일 뿐, 허용의 근거는 확인된 경로 목록이다. 목록이 비어 있으면 화면·조회 GET 은 전부 막힌다.
 *  (막힌 GET 의 경로는 기록에 남으므로, 그 기록을 보고 읽기 전용임을 확인한 경로만 목록에 더한다)
 */
function decide(req, hosts, readPaths) {
  const m = String(req.method || 'GET').toUpperCase();
  const kind = kindName(req.kind || req.resourceType);
  const url = String(req.url || '');
  if (/^(data|blob|about|devtools):/i.test(url)) return { allow: true, why: '내부 자료' };
  if (NEVER.test(kind)) return { allow: false, why: '실시간 연결·신호(' + kind + ')' };
  if (m !== 'GET' && m !== 'HEAD') return { allow: false, why: '쓰기(' + m + ')' };
  const h = hostOf(url);
  if (!hosts.size || !hosts.has(h)) return { allow: false, why: '다른 주소(또는 주소 모름)' };
  if (WRITE_WORDS.test(pathOf(url)) || queryLooksWrite(url)) return { allow: false, why: '저장처럼 보이는 GET' };
  if (STATIC.test(kind)) return { allow: true, why: '정적 자료' };
  if ((readPaths || []).some((re) => re.test(pathOf(url)))) return { allow: true, why: '확인된 읽기 경로' };
  return { allow: false, why: '확인 안 된 GET(기본 차단)' };
}

/** 보낸 자료에서 «칸 이름»만 꺼낸다(값은 버림) — JSON 은 맨 위 이름, 폼 모양은 이름=값 의 이름 */
function bodyKeys(postData) {
  const s = String(postData || '');
  if (!s) return [];
  try {
    const j = JSON.parse(s);
    if (j && typeof j === 'object' && !Array.isArray(j)) return Object.keys(j).slice(0, 80);
    return ['(JSON 목록)'];
  } catch { /* 폼 모양 */ }
  if (/^[^=&\s]+=/.test(s)) return [...new Set(s.split('&').map((p) => { try { return decodeURIComponent(p.split('=')[0] || '').slice(0, 60); } catch { return '(이름)'; } }))].slice(0, 80);
  if (/Content-Disposition/i.test(s)) {                     // 파일 올리기(멀티파트) — 칸 이름(name="...")만, 파일 이름은 버림
    return [...new Set([...s.matchAll(/[;\s]name="([^"]{1,60})"/g)].map((x) => x[1]))].slice(0, 80);
  }
  return ['(알 수 없는 모양 · ' + s.length + '자)'];
}

/**
 * 진단 기록기 — 판단(decide)과 기록. 두 겹에서 함께 쓴다.
 *  · 세션 거르개(diag-session.js · 그 전산 세션 전체: 본 창·팝업·iframe·작업자) — source:'session' · 기록함
 *  · 창별 붙잡기(save-hold · 개발자 연결) — 같은 판단으로 한 번 더 막음 · 기록은 하지 않음(두 번 적지 않게)
 * @param o.siteHosts  그 전산 주소들 — 화면·조회 GET 은 이 주소로 가는 것만 내보냄
 */
function createDiagRecorder(o = {}) {
  const hosts = new Set((o.siteHosts || []).map((h) => String(h).toLowerCase()).filter(Boolean));
  //  읽기 전용으로 확인된 경로 무늬(설정 diagReadPaths) — 잘못된 무늬는 버림(막는 쪽)
  const readPaths = (o.readPaths || []).map((x) => { try { return new RegExp(x); } catch { return null; } }).filter(Boolean);
  const now = o.now || (() => new Date());
  const entries = [];
  const windows = new Map();
  let held = 0, passed = 0;

  function note(req, d) {
    if (entries.length >= 800) return;
    entries.push(maskEntry({
      at: now().toISOString(), verdict: (d.allow ? '내보냄 · ' : '막음 · ') + d.why, method: String(req.method || 'GET').toUpperCase(),
      kind: kindName(req.kind || req.resourceType), host: hostOf(req.url), path: pathForLog(req.url), queryKeys: queryKeys(req.url),
      bodyKeys: bodyKeys(req.postData),
    }));
  }

  return {
    hosts,
    decide: (req) => decide(req, hosts, readPaths),
    registerWindow(id, kind) { if (!windows.has(id)) windows.set(id, { kind: kind || 'main', attached: false, since: Date.now() }); },
    attachWindow(id) { const w = windows.get(id) || {}; windows.set(id, { ...w, attached: true }); },
    detachWindow(id) { windows.delete(id); },
    /** 세션 거르개 — true(막음) / false(내보냄) */
    onSessionRequest(req) {
      const d = decide(req, hosts, readPaths);
      if (d.allow) passed++; else held++;
      if (!d.allow || kindName(req.resourceType) === 'xhr' || kindName(req.resourceType) === 'document') note(req, d);
      return !d.allow;
    },
    /** 창별 붙잡기(save-hold) 모양 — 'hold' | 'ignore' (기록 안 함) */
    onRequest(req) { return decide(req, hosts, readPaths).allow ? 'ignore' : 'hold'; },
    onResponse() {}, onNetworkError() {}, onWindowClosed() {}, onTimeout() {},
    unlock() { return false; },                            // 진단 중에는 어떤 허락도 받지 않음
    seal() {},
    coverage() {
      const reg = [...windows.entries()];
      return { windows: reg.length, unattachedWindows: reg.filter(([, w]) => !w.attached).map(([id, w]) => ({ id, since: w.since })), held, passed };
    },
    summary() { return { held, passed, windows: [...windows.entries()].map(([id, w]) => ({ id, kind: w.kind, attached: w.attached })), entries: entries.slice() }; },
  };
}

/* ── 개인정보 가리기·검사 (8차 검수 보완) ────────────────────────────
 *  진단 파일에 들어가는 «모든 글자»(주소·속성·단추 글자·칸 이름·화면 뼈대)를 쓰기 전에 가리고, 가린 뒤 한 번 더 검사한다.
 *  남아 있으면 파일을 만들지 않는다. */
const MASK_RULES = [
  //  순서 중요 — 긴 것·섞인 것(인증값·차대번호)을 먼저 가려야 «긴 숫자» 규칙이 중간을 잘라 먹지 않는다
  //  로그인한 사람 표시 «이름 (아이디)» — 엔트리 오른쪽 위 같은 곳(10/19 화면). 이름·아이디는 무늬가 없어 이 모양으로 잡는다
  ['로그인 이름(아이디)', /[가-힣]{2,5}\s*\(\s*[A-Za-z0-9_.\-]{3,30}\s*\)/g],
  ['인증값처럼 보이는 긴 글자', /(?<![A-Za-z0-9_\-])(?=[A-Za-z0-9_\-]*\d)(?=[A-Za-z0-9_\-]*[A-Za-z])[A-Za-z0-9_\-]{24,}(?![A-Za-z0-9_\-])/g],
  ['차대번호', /(?<![A-Za-z0-9])[A-HJ-NPR-Z0-9]{17}(?![A-Za-z0-9])/g],
  ['전자우편', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g],
  ['휴대폰 번호', /01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/g],
  ['주민·외국인 번호', /(?<!\d)\d{6}[-\s]?[1-8]\d{6}(?!\d)/g],
  ['사업자번호', /(?<!\d)\d{3}-\d{2}-\d{5}(?!\d)/g],
  ['전화번호', /(?<!\d)0\d{1,2}[-.\s]\d{3,4}[-.\s]\d{4}(?!\d)/g],
  ['차량번호', /\d{2,3}\s?[가-힣]\s?\d{4}/g],
  ['긴 숫자(번호)', /\d{6,}/g],
];
function maskText(s, counts) {
  let t = String(s);
  for (const [label, re] of MASK_RULES) {
    t = t.replace(re, () => { counts[label] = (counts[label] || 0) + 1; return '[가림]'; });
  }
  return t;
}
/** 진단 기록 전체를 가린다 — 코드 파일(code)도 같은 규칙으로. 돌려줌 { data, masked:{종류:개수} } */
function maskDiag(obj) {
  const counts = {};
  const walk = (v) => {
    if (typeof v === 'string') return maskText(v, counts);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[maskText(k, counts)] = walk(v[k]); return o; }
    return v;
  };
  return { data: walk(obj), masked: counts };
}
/** 내보내기 전 마지막 검사 — 남은 개인정보 무늬 개수(0이어야 파일을 만듦). 시각(at) 글자는 빼고 본다 */
function checkDiag(text) {
  const t = String(text).replace(/"(at|startedAt|endedAt)":"[^"]*"/g, '""');
  const left = {};
  for (const [label, re] of MASK_RULES) { const m = t.match(re); if (m) left[label] = m.length; }
  //  비밀번호·인증 «값»이 따로 들어갈 자리는 없지만, 혹시 «이름=값» 모양이 남았는지
  const kv = t.match(/(password|passwd|pwd|token|cookie|session|auth|otp|cert)[^"]{0,3}["']?\s*[:=]\s*["']?[^"'\s,}]{4,}/gi);
  if (kv) left['비밀번호·인증 값 모양'] = kv.length;
  return left;
}

/**
 * 화면 요소 목록 스크립트 — 단추(글자)·입력 칸(id·name·종류)·표(머리글)·내부 창(iframe). 입력된 «값»은 읽지 않는다.
 *  창의 모든 화면 조각(frame)에서 돌려 합친다(main.js).
 */
const ELEMENTS_EXPR = `(function(){
  function cls(e){return String(e.className&&e.className.baseVal!=null?e.className.baseVal:e.className||'').split(/\\s+/).filter(Boolean).slice(0,3).join(' ');}
  function vis(e){return !!(e.offsetWidth||e.offsetHeight||e.getClientRects().length);}
  function txt(e){return String(e.tagName==='INPUT'?e.value:e.textContent||'').replace(/\\s+/g,' ').trim().slice(0,30);}
  var out={path:location.pathname,title:String(document.title||'').slice(0,60),buttons:[],fields:[],tables:[],frames:[]};
  var bs=document.querySelectorAll('button,a.btn,a[role=button],input[type=button],input[type=submit]');
  for(var i=0;i<bs.length&&out.buttons.length<200;i++){var b=bs[i];var t=txt(b);if(!t)continue;
    out.buttons.push({text:t,tag:b.tagName.toLowerCase(),id:b.id||'',cls:cls(b),visible:vis(b),disabled:!!(b.disabled||b.getAttribute('aria-disabled')==='true')});}
  var fs=document.querySelectorAll('input:not([type=button]):not([type=submit]):not([type=hidden]),select,textarea');
  for(var k=0;k<fs.length&&out.fields.length<400;k++){var f=fs[k];
    var lab='';try{if(f.id){var l=document.querySelector('label[for="'+f.id+'"]');if(l)lab=txt(l);}}catch(e){}
    out.fields.push({tag:f.tagName.toLowerCase(),type:f.type||'',id:f.id||'',name:f.name||'',placeholder:String(f.placeholder||'').slice(0,30),label:lab,
      readonly:!!f.readOnly,disabled:!!f.disabled,visible:vis(f),checkbox:(f.type==='checkbox'||f.type==='radio')?{checked:!!f.checked}:undefined});}
  var ts=document.querySelectorAll('table');
  for(var t=0;t<ts.length&&out.tables.length<30;t++){var tb=ts[t];var hs=[].map.call(tb.querySelectorAll('thead th, thead td'),function(h){return txt(h);});
    var body=tb.querySelectorAll('tbody tr');var first=body[0]?body[0].querySelectorAll('td').length:0;
    out.tables.push({id:tb.id||'',cls:cls(tb),headers:hs.slice(0,40),rows:body.length,cellsInFirstRow:first});}
  var ifr=document.querySelectorAll('iframe');for(var q=0;q<ifr.length;q++){out.frames.push({id:ifr[q].id||'',name:ifr[q].name||'',src:String(ifr[q].getAttribute('src')||'').split('?')[0].slice(0,120)});}
  return out;})()`;

/**
 * 화면 구조·코드 저장 스크립트 (8차 보강 — 대표님 «로그인한 뒤 화면 구성·코드·작동 방식을 확인»)
 *  · 화면(HTML)은 «뼈대»만: 표 칸·글 칸(td·span·div 등)의 글자는 «·»로 지우고, 머리글·이름표·단추 글자(th·label·button·h1~h6·legend)만 남김.
 *    입력 칸의 값·title·data-값은 지움(이름만 남김). → 차량번호·이름·전화번호 같은 값이 남지 않음
 *  · 페이지 안 코드(인라인 script)는 따옴표 안 글자를 «…»로 지움(로그인한 사람 이름·아이디가 코드에 박혀 있을 수 있어서)
 *  · 바깥 코드 파일(script src — 사이트 프로그램 자체)은 같은 사이트 것만 그대로 받아 둠(합쳐 6MB까지)
 *  · 사이트 서버에는 아무것도 보내지 않는다(코드 파일 받기는 GET 조회 — 진단 기록기가 그대로 둠)
 */
/* 페이지 안에서 돌릴 함수 — 글로 바꿔 executeJavaScript 로 넘긴다(바깥 변수를 쓰지 않음) */
async function pageSnapshot(opt) {
  opt = opt || {};
  var KEEP = { TH: 1, LABEL: 1, BUTTON: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, LEGEND: 1, CAPTION: 1 };
  var QUOTED = /(["'`])(?:\\.|(?!\1)[^\\])*\1/g;
  var root = document.documentElement.cloneNode(true);
  function scrub(n) {
    for (var c = n.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) {
        var p = c.parentNode && c.parentNode.nodeName;
        if (p === 'SCRIPT') c.nodeValue = String(c.nodeValue).replace(QUOTED, '"…"');
        else if (p === 'STYLE') { /* 모양 규칙은 그대로 */ }
        else if (KEEP[p]) c.nodeValue = String(c.nodeValue).replace(/\d{2,}[\d-]*/g, '#');
        else if (String(c.nodeValue).trim()) c.nodeValue = '·';
      } else if (c.nodeType === 1) {
        var at = [].slice.call(c.attributes || []);
        for (var i = 0; i < at.length; i++) {
          var nm = at[i].name;
          if (nm === 'value' && !/^(button|submit|checkbox|radio)$/.test(c.type || '')) c.setAttribute(nm, '');
          else if (nm === 'title' || nm === 'alt' || nm === 'aria-label' || nm === 'placeholder' && /\d{3,}/.test(at[i].value) || /^data-/.test(nm)) c.setAttribute(nm, '');
          else if (nm === 'src' && c.nodeName === 'IMG') c.setAttribute(nm, '');
          else if (nm === 'href' && at[i].value.indexOf('?') >= 0) c.setAttribute(nm, at[i].value.split('?')[0] + '?…');
          else if (/^on/.test(nm)) c.setAttribute(nm, at[i].value.replace(QUOTED, '"…"'));
        }
        if (c.nodeName === 'TEXTAREA') c.textContent = '';
        if (c.nodeName === 'OPTION' && !/^\s*(선택|전체)?\s*$/.test(c.textContent)) c.textContent = '·';
        scrub(c);
      }
    }
  }
  scrub(root);
  var scripts = [], total = 0, ss = document.querySelectorAll('script[src]');
  for (var k = 0; k < ss.length && k < 60; k++) {
    var src = ss[k].src, same = false;
    try { same = new URL(src).host === location.host; } catch (e) {}
    var item = { src: String(src).split('?')[0], sameSite: same, size: 0, code: null };
    if (opt.includeCode && same && total < 6000000) {
      try {
        var r = await fetch(src, { credentials: 'same-origin' });
        var t = await r.text();
        item.size = t.length;
        if (total + t.length <= 6000000) { item.code = t; total += t.length; }
      } catch (e) { item.error = String((e && e.message) || e); }
    }
    scripts.push(item);
  }
  return { path: location.pathname, html: '<!doctype html>' + root.outerHTML, scripts: scripts };
}
/**
 * 화면 구조·코드 저장 스크립트 (8차 보강 — 대표님 «로그인한 뒤 화면 구성·코드·작동 방식을 확인»)
 *  · 화면(HTML)은 «뼈대»만: 표 칸·글 칸(td·span·div 등)의 글자는 «·»로 지우고, 머리글·이름표·단추 글자(th·label·button·h1~h6)만 남김(그 안 숫자도 #).
 *    입력 칸의 값·title·data-값·선택지 글자는 지움(이름만 남김) → 차량번호·이름·전화번호 같은 값이 남지 않음
 *  · 페이지 안 코드(인라인 script·onclick)는 따옴표 안 글자를 «…»로 지움(로그인한 사람 이름·아이디가 박혀 있을 수 있어서)
 *  · 바깥 코드 파일(script src)은 기본으로 «주소 목록»만. 내용은 설정 diagScripts:true 일 때만 같은 사이트 것을 받음(6MB까지 · 받은 뒤에도 가리기 규칙 적용)
 */
/** includeCode: 사이트 코드 파일 내용까지 받기 — 기본은 끔(주소 목록만). 설정 diagScripts:true 일 때만 켬 */
const pageExpr = (opt) => '(' + pageSnapshot.toString() + ')(' + JSON.stringify(opt || {}) + ')';
const PAGE_EXPR = pageExpr({});

/** 기록 한 줄을 남기는 순간 바로 가림(메모리에도 가린 것만 둠) */
function maskEntry(e) { const at = e.at; const d = maskDiag(e).data; d.at = at; return d; }

module.exports = { createDiagRecorder, decide, ELEMENTS_EXPR, PAGE_EXPR, pageExpr, bodyKeys, WRITE_WORDS, maskDiag, checkDiag };
