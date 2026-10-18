/**
 * 자동차 사진 8칸
 * ------------------------------------------------------------------
 *  1 전면 · 2 후면 · 3 계기판 · 4~8 기타
 *
 *  사진 파일을 복사하지 않고 "그 파일이 있는 자리(전체 경로)" 만 기억한다.
 *  나중에 두 사이트에 올릴 때 그 경로를 파일 선택칸에 그대로 넣어야 하기 때문이다.
 *  그래서 사진을 옮기거나 지우면 칸에 [파일 없음] 이라고 알려 준다.
 *
 *  값은 state[photo1] … state[photo8] 에 들어간다.
 */

/** 파일 경로를 화면에 띄울 주소로 (윈도우 역슬래시·한글 이름 대응) */
function fileUrl(p) {
  var s = String(p || '').replace(/\\/g, '/');
  if (!s) return '';
  return 'file:///' + s.split('/').map(encodeURIComponent).join('/').replace('%3A', ':');
}

function baseName(p) {
  var s = String(p || '').replace(/\\/g, '/');
  return s.slice(s.lastIndexOf('/') + 1);
}

function prettySize(n) {
  if (!n) return '';
  if (n < 1024) return n + 'B';
  if (n < 1024 * 1024) return Math.round(n / 1024) + 'KB';
  return (n / 1024 / 1024).toFixed(1) + 'MB';
}

/**
 * @param container  넣을 자리
 * @param fields     스키마의 사진 항목들 (k, label, hint)
 * @param state      앱 상태 객체 — 이 객체를 직접 읽고 쓴다
 * @param onChange   값이 바뀔 때 부르는 콜백
 */
function renderPhotos(container, fields, state, onChange) {
  var wrap = document.createElement('div');
  wrap.className = 'photos';

  var guide = document.createElement('div');
  guide.className = 'photos-guide';
  guide.textContent =
    '칸을 누르거나 사진 파일을 끌어다 놓으면 붙습니다. 1·2·3번은 자리가 정해져 있고 4~8번은 기타입니다.';
  wrap.appendChild(guide);

  var grid = document.createElement('div');
  grid.className = 'photos-grid';
  wrap.appendChild(grid);

  var cells = {};

  fields.forEach(function (f) {
    var cell = document.createElement('div');
    cell.className = 'photo-cell';
    cell.dataset.key = f.k;

    var head = document.createElement('div');
    head.className = 'photo-head';
    var name = document.createElement('b');
    name.textContent = f.label;
    head.appendChild(name);
    if (f.hint) {
      var hint = document.createElement('small');
      hint.textContent = f.hint;
      head.appendChild(hint);
    }
    cell.appendChild(head);

    var drop = document.createElement('button');
    drop.type = 'button';
    drop.className = 'photo-drop';
    drop.setAttribute('aria-label', f.label + ' 고르기');
    cell.appendChild(drop);

    var foot = document.createElement('div');
    foot.className = 'photo-foot';
    var fileName = document.createElement('span');
    fileName.className = 'photo-name';
    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'ghost photo-del';
    del.textContent = '지움';
    foot.appendChild(fileName);
    foot.appendChild(del);
    cell.appendChild(foot);

    grid.appendChild(cell);
    cells[f.k] = { cell: cell, drop: drop, name: fileName, del: del, label: f.label };

    /* ── 고르기 ── */
    drop.addEventListener('click', function () {
      //  이미 사진이 있으면 눌렀을 때 크게 보여준다. 바꾸려면 [지움] 뒤에 다시 고른다.
      if (state[f.k]) { window.api.openPhoto(state[f.k]); return; }
      pick(f.k);
    });

    del.addEventListener('click', function (e) {
      e.stopPropagation();
      state[f.k] = '';
      paint();
      if (onChange) onChange();
    });

    /* ── 끌어다 놓기 ── */
    ['dragenter', 'dragover'].forEach(function (t) {
      drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (t) {
      drop.addEventListener(t, function () { drop.classList.remove('over'); });
    });
    drop.addEventListener('drop', function (e) {
      e.preventDefault();
      var list = (e.dataTransfer && e.dataTransfer.files) || [];
      if (!list.length) return;
      var paths = [];
      for (var i = 0; i < list.length; i++) {
        var p = window.api.filePath ? window.api.filePath(list[i]) : '';
        if (p) paths.push(p);
      }
      if (!paths.length) {
        alert('끌어다 놓은 파일의 자리를 읽지 못했습니다. 칸을 눌러 [사진 고르기] 로 골라 주세요.');
        return;
      }
      fill(f.k, paths);
    });
  });

  container.appendChild(wrap);

  /** 이 칸부터 차례로 채운다 (여러 장을 한 번에 골랐을 때) */
  function fill(startKey, paths) {
    var keys = fields.map(function (x) { return x.k; });
    var at = keys.indexOf(startKey);
    paths.forEach(function (p) {
      while (at < keys.length && state[keys[at]] && keys[at] !== startKey) at++;
      if (at >= keys.length) return;
      state[keys[at]] = p;
      at++;
    });
    paint();
    if (onChange) onChange();
  }

  async function pick(key) {
    var r = await window.api.pickPhoto({ title: (cells[key] || {}).label + ' 고르기', many: true });
    if (!r || !r.ok || !r.files.length) return;
    fill(key, r.files);
  }

  /** 화면을 지금 값에 맞춘다 */
  async function paint() {
    var have = fields.map(function (f) { return state[f.k]; }).filter(Boolean);
    var info = {};
    if (have.length) {
      try { info = (await window.api.checkPhotos(have)) || {}; } catch (e) { info = {}; }
    }

    fields.forEach(function (f) {
      var c = cells[f.k];
      var p = state[f.k] || '';
      c.cell.classList.toggle('has', !!p);

      if (!p) {
        c.drop.innerHTML = '<span class="photo-plus">+</span><span class="photo-tip">사진 고르기</span>';
        c.name.textContent = '';
        c.name.classList.remove('gone');
        c.del.style.display = 'none';
        return;
      }

      var st = info[p] || { ok: false, size: 0 };
      c.drop.textContent = '';
      if (st.ok) {
        var img = document.createElement('img');
        img.src = fileUrl(p);
        img.alt = f.label;
        c.drop.appendChild(img);
      } else {
        var miss = document.createElement('span');
        miss.className = 'photo-miss';
        miss.textContent = '파일 없음';
        c.drop.appendChild(miss);
      }
      c.name.textContent = baseName(p) + (st.ok && st.size ? ' · ' + prettySize(st.size) : '');
      c.name.title = p;
      c.name.classList.toggle('gone', !st.ok);
      c.del.style.display = '';
    });
  }

  paint();
  return { refresh: paint };
}

window.renderPhotos = renderPhotos;
