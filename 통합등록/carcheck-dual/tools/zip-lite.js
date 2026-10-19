/*  작은 ZIP 만들기·풀기 (10차 시험판 묶음용) — 따로 받을 것 없이 Node 만으로.
 *  한글 파일 이름이 윈도우 «압축 풀기»에서 깨지지 않게 UTF-8 표시(일반 목적 비트 11)를 켠다. */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) {
  if (zlib.crc32) return zlib.crc32(buf) >>> 0;
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function dosTime(d) {
  return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
           date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() };
}

/** entries: [{ name: 'a/b.txt', data: Buffer }] → zip Buffer (폴더는 이름에서 저절로) */
function makeZip(entries, when = new Date()) {
  const { time, date } = dosTime(when);
  const locals = [], centrals = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name.replace(/\\/g, '/'), 'utf8');
    const raw = e.data;
    const comp = zlib.deflateRawSync(raw, { level: 9 });
    const useStore = comp.length >= raw.length;
    const body = useStore ? raw : comp;
    const crc = crc32(raw);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(useStore ? 0 : 8, 8);
    lh.writeUInt16LE(time, 10); lh.writeUInt16LE(date, 12); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(body.length, 18);
    lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    locals.push(lh, name, body);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(useStore ? 0 : 8, 10);
    ch.writeUInt16LE(time, 12); ch.writeUInt16LE(date, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(raw.length, 24);
    ch.writeUInt16LE(name.length, 28); ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32); ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36);
    ch.writeUInt32LE(0, 38); ch.writeUInt32LE(offset, 42);
    centrals.push(ch, name);
    offset += lh.length + name.length + body.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

/** zip Buffer → [{ name, data, utf8Flag }] (가운데 목록 기준) */
function readZip(buf) {
  let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error('ZIP 끝 표시를 찾지 못했어요');
  const count = buf.readUInt16LE(e + 10);
  let p = buf.readUInt32LE(e + 16);
  const out = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('ZIP 목록이 깨졌어요');
    const flag = buf.readUInt16LE(p + 8), method = buf.readUInt16LE(p + 10), crc = buf.readUInt32LE(p + 16);
    const csize = buf.readUInt32LE(p + 20), nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32);
    const lo = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nlen).toString('utf8');
    const lnl = buf.readUInt16LE(lo + 26), lxl = buf.readUInt16LE(lo + 28);
    const body = buf.slice(lo + 30 + lnl + lxl, lo + 30 + lnl + lxl + csize);
    const data = method === 8 ? zlib.inflateRawSync(body) : body;
    if (crc32(data) !== crc) throw new Error('ZIP 안 파일이 깨졌어요: ' + name);
    out.push({ name, data, utf8Flag: !!(flag & 0x0800) });
    p += 46 + nlen + xlen + clen;
  }
  return out;
}

/** 풀기 — 바깥으로 나가는 이름(.. · 절대 경로)은 거부 */
function extractZip(buf, dest) {
  const items = readZip(buf);
  for (const it of items) {
    if (/^([\\/]|[A-Za-z]:)/.test(it.name) || it.name.split(/[\\/]/).includes('..')) throw new Error('이상한 파일 이름: ' + it.name);
    const f = path.join(dest, it.name);
    if (it.name.endsWith('/')) { fs.mkdirSync(f, { recursive: true }); continue; }
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, it.data);
  }
  return items;
}

module.exports = { makeZip, readZip, extractZip, crc32 };
