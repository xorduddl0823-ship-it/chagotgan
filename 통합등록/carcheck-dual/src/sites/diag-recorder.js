/**
 * 진단 기록기 (8차) — 실제 전산 화면을 «바꾸지 않고» 저장·조회 요청 모양과 화면 요소만 기록한다
 * ------------------------------------------------------------------
 *  가온 내부용 전산 연결 칸. 저장 붙잡기(save-hold)에 저장 통제기 대신 끼워 쓴다(같은 모양의 함수들).
 *
 *  지키는 것
 *   · 쓰기 요청(POST·PUT·DELETE·PATCH 등)은 «하나도» 내보내지 않는다 — 언제나 붙잡아 실패시킴(hold).
 *     신규등록 [확인] · 사진 올리기 · [저장] · [전송] · 팝업 창의 요청까지 모두(save-hold 가 팝업에도 붙음).
 *   · 조회(GET)는 화면이 그려지도록 내보내되, 주소에 «저장·등록·삭제·전송» 같은 말이 들어간 GET 은 붙잡는다(GET 으로 저장하는 사이트 대비).
 *   · 다른 주소(host)로 가는 쓰기도 붙잡는다.
 *   · 기록에는 «값»을 남기지 않는다 — 주소의 경로, 물음표 뒤 «이름»들, 보내려던 자료의 «칸 이름»들만(차량번호·이름 같은 값 없음).
 *
 *  쓰는 법: main.js 의 diag:start / diag:snap / diag:stop (설정 diagnose:true 일 때만)
 */

//  GET 이라도 붙잡을 주소 낱말(저장·등록·삭제·전송·올리기 등)
//  (짧은 말 del·reg 는 model·region 같은 조회 주소에도 들어 있어 뺐다)
const WRITE_WORDS = /(save|insert|update|delete|remove|regist|write|upload|submit|modify|cancel|send|proc)/i;

function hostOf(url) { try { return new URL(url).host.toLowerCase(); } catch { return ''; } }
function pathOf(url) { try { return new URL(url).pathname; } catch { return String(url || '').split('?')[0].slice(0, 200); } }
function queryKeys(url) { try { return [...new URL(url).searchParams.keys()].slice(0, 40); } catch { return []; } }

/** 보내려던 자료에서 «칸 이름»만 꺼낸다(값은 버림) — JSON 은 맨 위 이름, 폼 모양은 이름=값 의 이름 */
function bodyKeys(postData) {
  const s = String(postData || '');
  if (!s) return [];
  try {
    const j = JSON.parse(s);
    if (j && typeof j === 'object' && !Array.isArray(j)) return Object.keys(j).slice(0, 80);
    return ['(JSON 목록)'];
  } catch { /* 폼 모양 */ }
  if (/^[^=&\s]+=/.test(s)) return [...new Set(s.split('&').map((p) => decodeURIComponent(p.split('=')[0] || '').slice(0, 60)))].slice(0, 80);
  if (/Content-Disposition/i.test(s)) {                     // 파일 올리기(멀티파트) — name="..." 만
    //  filename="..."(파일 이름)은 남기지 않는다 — 칸 이름(name="...")만
    return [...new Set([...s.matchAll(/[;\s]name="([^"]{1,60})"/g)].map((m) => m[1]))].slice(0, 80);
  }
  return ['(알 수 없는 모양 · ' + s.length + '자)'];
}

/**
 * @param o.siteHosts  그 전산 주소들(모르면 빈 배열 — 그래도 쓰기는 모두 붙잡음)
 * @param o.now        시각(시험용)
 */
function createDiagRecorder(o = {}) {
  const hosts = new Set((o.siteHosts || []).map((h) => String(h).toLowerCase()));
  const now = o.now || (() => new Date());
  const entries = [];
  const windows = new Map();
  let held = 0, passed = 0;

  function note(req, verdict) {
    if (entries.length >= 500) return;
    entries.push({
      at: now().toISOString(), verdict, method: String(req.method || 'GET').toUpperCase(), kind: req.kind || '',
      window: req.windowId || '', host: hostOf(req.url), path: pathOf(req.url), queryKeys: queryKeys(req.url),
      bodyKeys: bodyKeys(req.postData), foreign: !!(hosts.size && hostOf(req.url) && !hosts.has(hostOf(req.url))),
    });
  }

  return {
    registerWindow(id, kind) { if (!windows.has(id)) windows.set(id, { kind: kind || 'main', attached: false }); },
    attachWindow(id) { const w = windows.get(id) || {}; windows.set(id, { ...w, attached: true }); },
    detachWindow(id) { windows.delete(id); },
    /** 'hold'(붙잡아 실패시킴) | 'ignore'(내보냄 — 조회만) */
    onRequest(req) {
      const m = String(req.method || 'GET').toUpperCase();
      const isGet = m === 'GET' || m === 'HEAD';
      if (!isGet || WRITE_WORDS.test(pathOf(req.url))) {
        held++;
        note(req, isGet ? '붙잡음(저장처럼 보이는 GET)' : '붙잡음(쓰기)');
        return 'hold';
      }
      passed++;
      if (req.kind === 'ajax' || req.kind === 'form') note(req, '내보냄(조회)');
      return 'ignore';
    },
    onResponse() {}, onNetworkError() {}, onWindowClosed() {}, onTimeout() {},
    unlock() { return false; },                            // 진단 중에는 어떤 허락도 받지 않음
    seal() {},
    coverage() {
      const reg = [...windows.entries()];
      return { windows: reg.length, unattachedWindows: reg.filter(([, w]) => !w.attached).map(([id]) => id), held, passed };
    },
    summary() { return { held, passed, windows: [...windows.entries()].map(([id, w]) => ({ id, kind: w.kind, attached: w.attached })), entries: entries.slice() }; },
  };
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
async function pageSnapshot() {
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
    if (same && total < 6000000) {
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
 *  · 바깥 코드 파일(script src — 사이트 프로그램 자체)은 같은 사이트 것만 그대로 받아 둠(합쳐 6MB까지). 받기는 GET 조회뿐
 */
const PAGE_EXPR = '(' + pageSnapshot.toString() + ')()';

module.exports = { createDiagRecorder, ELEMENTS_EXPR, PAGE_EXPR, bodyKeys, WRITE_WORDS };
