/**
 * 자동 로그인
 * ------------------------------------------------------------------
 * 두 사이트의 로그인 칸 id 를 따로 외우지 않는다. 로그인 화면의 생김새로 찾는다.
 *   · 비밀번호 칸은 input[type=password] 하나뿐이다 — 이것이 기준점.
 *   · 아이디 칸은 그 앞에 있는 가장 가까운 text 입력칸.
 *   · 보내기는 [로그인] 버튼을 누르고, 없으면 폼을 제출한다.
 * 사이트가 개편되어 id 가 바뀌어도 이 구조가 유지되면 계속 동작한다.
 *
 * 값은 페이지 안에서만 쓰이고 결과로 돌려주지 않는다.
 * 성공/실패 여부와 어느 단계였는지만 돌려준다 — 비밀번호는 어디에도 남기지 않는다.
 */

function buildLoginScript(id, pw) {
  //  값은 JSON 으로 안전하게 넣는다. 따옴표·역슬래시가 섞여도 깨지지 않는다.
  const ID = JSON.stringify(String(id || ''));
  const PW = JSON.stringify(String(pw || ''));

  return `(function () {
  function visible(el) {
    if (!el) return false;
    try { var r = el.getBoundingClientRect(); return !!(r.width || r.height); }
    catch (e) { return false; }
  }

  //  비밀번호 칸을 기준점으로 삼는다
  var pwEl = null;
  var pws = document.querySelectorAll('input[type=password]');
  for (var i = 0; i < pws.length; i++) { if (visible(pws[i])) { pwEl = pws[i]; break; } }
  if (!pwEl) return { ok: false, step: '로그인 화면 아님', error: '비밀번호 칸을 찾지 못했습니다.' };

  //  같은 폼(없으면 문서 전체)에서 비밀번호 칸보다 앞에 있는 마지막 text 칸 = 아이디
  var scope = pwEl.form || document;
  var texts = Array.prototype.slice.call(
    scope.querySelectorAll('input[type=text], input[type=email], input:not([type])')
  ).filter(visible);
  var idEl = null;
  for (var j = 0; j < texts.length; j++) {
    if (texts[j].compareDocumentPosition(pwEl) & Node.DOCUMENT_POSITION_FOLLOWING) idEl = texts[j];
  }
  if (!idEl) idEl = texts[0] || null;
  if (!idEl) return { ok: false, step: '아이디 칸', error: '아이디 칸을 찾지 못했습니다.' };

  function put(el, v) {
    el.focus();
    try {
      var d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      if (d && d.set) d.set.call(el, v); else el.value = v;
    } catch (e) { el.value = v; }
    ['input', 'change', 'keyup', 'blur'].forEach(function (t) {
      el.dispatchEvent(new Event(t, { bubbles: true }));
    });
  }

  put(idEl, ${ID});
  put(pwEl, ${PW});

  //  [로그인] 버튼을 찾아 누른다. 없으면 폼을 제출한다.
  var btn = null;
  var cands = (pwEl.form || document).querySelectorAll(
    'button, input[type=submit], input[type=button], a'
  );
  for (var k = 0; k < cands.length; k++) {
    var b = cands[k];
    if (!visible(b)) continue;
    var t = String(b.textContent || b.value || '').replace(/\\s+/g, '');
    if (t.indexOf('로그인') < 0 && t.toLowerCase().indexOf('login') < 0) continue;
    if (t.length > 10) continue;                    // '아이디/비밀번호 찾기' 같은 긴 문구 제외
    btn = b; break;
  }

  if (btn) { btn.click(); return { ok: true, step: '로그인 버튼 클릭' }; }
  if (pwEl.form) { pwEl.form.submit(); return { ok: true, step: '폼 제출' }; }
  return { ok: false, step: '보내기', error: '[로그인] 버튼도 폼도 찾지 못했습니다.' };
})();`;
}

/** 지금 화면이 로그인 화면인지 (비밀번호 칸이 보이면 그렇다) */
const LOGIN_PAGE_EXPR =
  '(function(){var p=document.querySelectorAll("input[type=password]");' +
  'for(var i=0;i<p.length;i++){var r=p[i].getBoundingClientRect();' +
  'if(r.width||r.height)return true;}return false;})()';

module.exports = { buildLoginScript, LOGIN_PAGE_EXPR };
