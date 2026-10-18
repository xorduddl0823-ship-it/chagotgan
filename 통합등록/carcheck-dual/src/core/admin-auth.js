/**
 * 관리자 확인 (강제 닫기 · 강제 닫기 뒤 다음 차 허용에 쓴다)
 * ------------------------------------------------------------------
 *  이름만 적어서는 관리자로 인정하지 않는다. 관리자 비밀번호(PIN)를 맞혀야 한다.
 *  · PIN 은 그대로 저장하지 않는다 — scrypt 로 바꾼 값(소금 포함)만 저장
 *  · 비교는 시간 차이가 나지 않는 방법(timingSafeEqual)
 *  · 5번 틀리면 10분 동안 잠김
 *  · 맞히면 «확인 표»를 돌려준다 — 짧은 시간(5분)만 유효하고 한 번만 쓸 수 있다
 *
 *  저장 위치(앱에서): %APPDATA%\carcheck-dual\admin.json — 이 파일도 저장소·대화에 올리지 않는다.
 *  나눔 원칙(상용화 고려): 업무 관리 칸. 전산 이름을 모른다.
 */
const crypto = require('crypto');
const fsDefault = require('fs');

const MAX_FAIL = 5;
const LOCK_MS = 10 * 60 * 1000;
const TICKET_MS = 5 * 60 * 1000;

function createAdminAuth(file, opts = {}) {
  const fs = opts.fs || fsDefault;
  const now = opts.now || (() => Date.now());
  const used = new Set();                 // 이미 쓴 확인 표 (한 번만)
  const issued = new Map();               // 발급한 확인 표 → { by, at }

  function read() {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
  }
  function save(o) {
    fs.writeFileSync(file, JSON.stringify(o, null, 2), 'utf8');
  }
  function hash(pin, salt) {
    return crypto.scryptSync(String(pin), Buffer.from(salt, 'hex'), 32).toString('hex');
  }

  return {
    /** 관리자 PIN 이 정해져 있는가 */
    isSet() {
      const o = read();
      return !!(o.salt && o.hash);
    },

    /** PIN 정하기/바꾸기. 이미 있으면 지금 PIN 을 맞혀야 바꿀 수 있다. */
    setPin(newPin, currentPin) {
      const p = String(newPin || '');
      if (!/^\d{6,12}$/.test(p)) throw new Error('관리자 PIN 은 숫자 6~12자리로 정해 주세요.');
      const o = read();
      if (o.salt && o.hash) {
        const ok = crypto.timingSafeEqual(Buffer.from(hash(currentPin || '', o.salt), 'hex'), Buffer.from(o.hash, 'hex'));
        if (!ok) throw new Error('지금 관리자 PIN 이 맞지 않아 바꾸지 않았습니다.');
      }
      const salt = crypto.randomBytes(16).toString('hex');
      save({ salt, hash: hash(p, salt), fail: 0, lockUntil: 0 });
    },

    /**
     * PIN 확인. 맞으면 { ok:true, ticket } — ticket 은 5분 동안 한 번만 쓸 수 있다.
     *  by: 확인한 관리자 이름(기록용 — 권한 판단에는 쓰지 않음)
     */
    verify(by, pin) {
      const o = read();
      if (!o.salt || !o.hash) return { ok: false, reason: '관리자 PIN 이 아직 정해지지 않았습니다.' };
      if (o.lockUntil && now() < o.lockUntil) {
        return { ok: false, reason: '관리자 PIN 을 여러 번 틀려 잠겼습니다. ' + Math.ceil((o.lockUntil - now()) / 60000) + '분 뒤 다시 해 주세요.' };
      }
      const ok = crypto.timingSafeEqual(Buffer.from(hash(pin == null ? '' : pin, o.salt), 'hex'), Buffer.from(o.hash, 'hex'));
      if (!ok) {
        o.fail = (o.fail || 0) + 1;
        if (o.fail >= MAX_FAIL) { o.lockUntil = now() + LOCK_MS; o.fail = 0; }
        save(o);
        return { ok: false, reason: '관리자 PIN 이 맞지 않습니다.' };
      }
      if (!String(by || '').trim()) return { ok: false, reason: '확인한 관리자 이름을 적어 주세요.' };
      o.fail = 0; o.lockUntil = 0; save(o);
      const ticket = crypto.randomBytes(16).toString('hex');
      issued.set(ticket, { by: String(by).trim().slice(0, 40), at: now() });
      return { ok: true, ticket, by: String(by).trim().slice(0, 40) };
    },

    /** 확인 표 쓰기 — 유효하면 { by } 를 돌려주고 다시는 못 쓰게 한다. 아니면 null */
    consume(ticket) {
      const t = issued.get(ticket);
      if (!t || used.has(ticket)) return null;
      if (now() - t.at > TICKET_MS) { issued.delete(ticket); return null; }
      used.add(ticket);
      issued.delete(ticket);
      return { by: t.by };
    },
  };
}

module.exports = { createAdminAuth };
