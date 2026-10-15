// 시험용 가짜 수파베이스 (딜러앱 dealer-api 용) — 실제 서버에 붙지 않고 메모리 표로만 움직입니다.
// fake_supabase.ts 를 복사해서 딜러 서버가 쓰는 것만큼 늘렸습니다
// (select/insert/update/upsert/delete · eq/neq/is/in · order/limit · maybeSingle · update 뒤 select · rpc)
type Row = Record<string, any>;
const g = globalThis as any;
g.__DB_DEALER = g.__DB_DEALER ?? {} as Record<string, Row[]>;
export const store: Record<string, Row[]> = g.__DB_DEALER;

/* 시험에서 rpc 를 바꿔 끼울 수 있게 (예: wash_rate_bump 가 오류를 내는 경우) */
export const rpcHooks: Record<string, (a: any) => { data: any; error: any }> = {};
export const rpcCalls: { fn: string; args: any }[] = [];

class Q {
  op = "select"; payload: any = null; filters: ((r: Row) => boolean)[] = [];
  one = false; lim = 0; cols = "*"; ret = false; conflict = "";
  ord: { k: string; asc: boolean }[] = [];
  constructor(public t: string) {}
  select(c = "*") { if (this.op === "select") this.cols = c; else this.ret = true; return this; }
  insert(p: any) { this.op = "insert"; this.payload = p; return this; }
  update(p: any) { this.op = "update"; this.payload = p; return this; }
  upsert(p: any, o: any = {}) { this.op = "upsert"; this.payload = p; this.conflict = String(o.onConflict || ""); return this; }
  delete() { this.op = "delete"; return this; }
  eq(k: string, v: any) { this.filters.push((r) => r[k] === v); return this; }
  neq(k: string, v: any) { this.filters.push((r) => r[k] !== v); return this; }
  is(k: string, v: any) { this.filters.push((r) => (r[k] ?? null) === v); return this; }
  in(k: string, vs: any[]) { this.filters.push((r) => vs.includes(r[k])); return this; }
  gt(k: string, v: any) { this.filters.push((r) => r[k] > v); return this; }
  contains(k: string, vs: any[]) { this.filters.push((r) => Array.isArray(r[k]) && vs.every((x) => r[k].includes(x))); return this; }
  order(k: string, o: any = {}) { this.ord.push({ k, asc: o.ascending !== false }); return this; }
  limit(n: number) { this.lim = n; return this; }
  maybeSingle() { this.one = true; return this; }
  then(res: any, rej: any) { return Promise.resolve().then(() => this.run()).then(res, rej); }
  run() {
    const tbl = store[this.t];
    if (!tbl) return { data: null, error: { message: `relation "${this.t}" does not exist` } };
    const hit = tbl.filter((r) => this.filters.every((f) => f(r)));
    if (this.op === "insert") {
      for (const p of [].concat(this.payload) as Row[]) tbl.push({ ...p });
      return { data: null, error: null };
    }
    if (this.op === "upsert") {
      const keys = this.conflict.split(",").map((s) => s.trim()).filter(Boolean);
      for (const p of [].concat(this.payload) as Row[]) {
        const old = keys.length ? tbl.find((r) => keys.every((k) => r[k] === p[k])) : undefined;
        if (old) Object.assign(old, p); else tbl.push({ ...p });
      }
      return { data: null, error: null };
    }
    if (this.op === "update") {
      hit.forEach((r) => Object.assign(r, this.payload));
      return { data: this.ret ? hit.map((r) => ({ ...r })) : null, error: null };
    }
    if (this.op === "delete") { store[this.t] = tbl.filter((r) => !hit.includes(r)); return { data: null, error: null }; }
    let out = hit.map((r) => ({ ...r }));
    for (const o of [...this.ord].reverse())
      out.sort((x, y) => (x[o.k] > y[o.k] ? 1 : x[o.k] < y[o.k] ? -1 : 0) * (o.asc ? 1 : -1));
    if (this.lim) out = out.slice(0, this.lim);
    if (this.one) {
      if (out.length > 1) return { data: null, error: { message: "more than one row" } };
      return { data: out[0] ?? null, error: null };
    }
    return { data: out, error: null };
  }
}

export const signLog: { bucket: string; paths: string[]; ttl: number }[] = [];
export function createClient(..._a: any[]) {
  return {
    from: (t: string) => new Q(t),
    rpc: async (fn: string, a: any) => { await Promise.resolve(); rpcCalls.push({ fn, args: a }); return rpc(fn, a); },
    storage: { from: (b: string) => ({
      createSignedUrls: async (paths: string[], ttl: number) => {
        signLog.push({ bucket: b, paths: [...paths], ttl });
        return { data: paths.map((p) => ({ path: p, signedUrl: `https://fake/sign/${b}/${p}?ttl=${ttl}`, error: null })), error: null };
      },
    }) },
  };
}

/* SQL 함수 흉내 — 한 번에 처리되므로 동시에 불러도 안 샘 */
function rpc(fn: string, a: any) {
  if (rpcHooks[fn]) return rpcHooks[fn](a);
  /* 서버/sql/03 의 dealer_otp_try 와 같은 규칙 */
  if (fn === "dealer_otp_try") {
    if (!store.dealer_otp) return { data: null, error: { message: "function dealer_otp_try does not exist" } };
    const r = store.dealer_otp.find((x) => x.phone === a.p_phone);
    if (!r) return { data: null, error: null };
    r.tries = (Number(r.tries) || 0) + 1;
    return { data: r.tries, error: null };
  }
  /* 워시 쪽 wash_rate_bump 흉내 — 키마다 세고 max 를 넘으면 false */
  if (fn === "wash_rate_bump") {
    const t = (store.wash_rate = store.wash_rate ?? []);
    let r = t.find((x) => x.key === a.p_key);
    if (!r) { r = { key: a.p_key, cnt: 0 }; t.push(r); }
    r.cnt++;
    return { data: r.cnt <= a.p_max, error: null };
  }
  if (fn === "dealer_cars") {
    const rows = (store.wash_docs ?? []).filter((d) => String(d.data?.phone ?? "").replace(/[^0-9]/g, "") === a.p_phone);
    return { data: rows, error: null };
  }
  return { data: null, error: { message: `function ${fn} does not exist` } };
}
