/**
 * 창이 앞으로 튀어나오지 않게 — «조용한 창» 규칙 (대표님 가장 큰 불편)
 * ------------------------------------------------------------------
 *  가온 내부용 전산 연결 칸.
 *  config.quietWindows 가 true 이면:
 *   · 프로그램이 일하려고 사이트 창을 부를 때(전송·준비·차대번호 등) 창을 보이거나 초점을 주지 않는다
 *   · 사람이 [카인포 창]/[경기조합 창] 단추를 눌렀을 때만 앞으로 낸다
 *   · 사이트 팝업도 숨긴 채 연다
 *   · 카모두 딜러 칸의 «진짜 엔터»는 창 초점 없이 개발자 연결(Input.dispatchKeyEvent)로 보낸다
 *   · 숨긴 창이 느려지지 않게 backgroundThrottling 을 끈다
 *  false(기본)이면 예전과 똑같이 동작한다 — 지금 쓰는 기능을 바꾸지 않기 위해.
 */

/**
 * 창을 어떻게 다룰지 정한다.
 * @param reason  'user'(사람이 창 열기 단추) | 'auto'(프로그램이 일하려고)
 * @returns 'show-focus' | 'none'
 */
function windowAction(reason, quiet) {
  if (!quiet) return 'show-focus';
  return reason === 'user' ? 'show-focus' : 'none';
}

/** 새 사이트 창의 처음 보이기 여부 */
function initialShow(reason, quiet) {
  return windowAction(reason, quiet) === 'show-focus';
}

/** 사이트 창 webPreferences 에 더할 것 (조용한 창일 때 숨긴 창도 제 속도로) */
function extraPrefs(quiet) {
  return quiet ? { backgroundThrottling: false } : {};
}

/** 팝업 창 옵션에 더할 것 */
function popupOptions(quiet) {
  return quiet ? { show: false } : {};
}

/**
 * 창 초점 없이 «진짜 키»를 보낸다 — 개발자 연결로 보낸 키는 페이지에서 isTrusted=true 로 받는다.
 * @param wc   webContents
 * @param key  'Enter' 등
 */
async function cdpKey(wc, key = 'Enter') {
  const dbg = wc.debugger;
  let mine = false;
  if (!dbg.isAttached()) { dbg.attach('1.3'); mine = true; }
  const code = key === 'Enter' ? 13 : 0;
  try {
    //  숨긴·초점 없는 창도 «초점 있는 페이지»처럼 키를 받게 한다(이게 없으면 키가 가끔 버려졌다 — 모의 시험에서 확인)
    await dbg.sendCommand('Emulation.setFocusEmulationEnabled', { enabled: true });
    await dbg.sendCommand('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code });
    if (key === 'Enter') await dbg.sendCommand('Input.dispatchKeyEvent', { type: 'char', key, text: '\r', unmodifiedText: '\r' });
    await dbg.sendCommand('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code });
  } finally {
    if (mine) { try { dbg.detach(); } catch {} }
  }
}

module.exports = { windowAction, initialShow, extraPrefs, popupOptions, cdpKey };
