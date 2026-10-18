/**
 * 역방향 읽기 — 사이트 폼에 채워진 값을 통합 스키마 키로 되읽는다.
 *
 * 카인포는 [확인] 시점에 원부·카히스토리를 조회해 차량정보를 자동으로 채운다.
 * 그 값을 앱으로 끌어오면 점검원은 차량번호와 딜러명만 입력하면 되고,
 * 나머지 차량정보는 다시 타이핑할 필요가 없다. 그대로 경기조합으로도 나간다.
 */
const { ALL_FIELDS } = require('./schema');

function buildScrapeScript(siteKey) {
  const targets = [];

  for (const f of ALL_FIELDS) {
    const m = f[siteKey];
    if (!m) continue;

    // 통합값으로 되돌리기 위한 역변환표
    let rmap = null;
    if (m.vmap) {
      rmap = {};
      for (const [uni, site] of Object.entries(m.vmap)) rmap[site] = uni;
    }

    if (m.checkbox) {
      targets.push({ k: f.k, kind: 'checkbox', map: m.checkbox });
    } else if (m.name || m.radio) {
      targets.push({ k: f.k, kind: 'radio', name: m.name || m.radio, rmap });
    } else if (m.split === 'vin') {
      targets.push({ k: f.k, kind: 'vin' });
    } else if (m.sel) {
      targets.push({ k: f.k, kind: 'value', sel: m.sel, rmap });
    }
  }

  return `(function () {
  var targets = ${JSON.stringify(targets)};
  var out = {};

  targets.forEach(function (t) {
    try {
      var v = null;

      if (t.kind === 'value') {
        var el = document.querySelector(t.sel);
        if (el) v = el.value;
      } else if (t.kind === 'vin') {
        var a = document.querySelector('#vin1'), b = document.querySelector('#vin2');
        v = ((a && a.value) || '') + ((b && b.value) || '');
      } else if (t.kind === 'radio') {
        var els = Array.prototype.slice.call(document.getElementsByName(t.name));
        els.forEach(function (e) { if (e.checked && e.value !== '') v = e.value; });
      } else if (t.kind === 'checkbox') {
        Object.keys(t.map).forEach(function (uni) {
          var els = document.getElementsByName(t.map[uni]);
          if (els && els[0] && els[0].checked) v = uni;
        });
      }

      if (v === null || v === undefined) return;
      v = String(v).trim();
      if (v === '' || v === '0') return;               // 미선택 값은 가져오지 않는다
      if (t.rmap && t.rmap[v] !== undefined) v = t.rmap[v];
      out[t.k] = v;
    } catch (e) {}
  });

  return out;
})();`;
}

module.exports = { buildScrapeScript };
