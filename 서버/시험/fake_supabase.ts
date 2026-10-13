// 시험용 가짜 수파베이스 — 실제 서버에 붙지 않고 메모리 표로만 움직입니다.
// cgg-api · check-api 가 쓰는 만큼만 흉내 냅니다 (select/insert/update/delete/eq/is/limit/maybeSingle, check_office 붙이기)
type Row = Record<string, any>;
const g = globalThis as any;
g.__DB = g.__DB ?? {} as Record<string, Row[]>;
export const store: Record<string, Row[]> = g.__DB;

class Q {
  op = "select"; payload: any = null; filters: ((r: Row) => boolean)[] = [];
  one = false; lim = 0; cols = "*";
  constructor(public t: string) {}
  select(c = "*") { if (this.op === "select") this.cols = c; return this; }
  insert(p: any) { this.op = "insert"; this.payload = p; return this; }
  update(p: any) { this.op = "update"; this.payload = p; return this; }
  delete() { this.op = "delete"; return this; }
  eq(k: string, v: any) { this.filters.push((r) => r[k] === v); return this; }
  is(k: string, v: any) { this.filters.push((r) => (r[k] ?? null) === v); return this; }
  limit(n: number) { this.lim = n; return this; }
  maybeSingle() { this.one = true; return this; }
  then(res: any, rej: any) { return Promise.resolve().then(() => this.run()).then(res, rej); }
  run() {
    const tbl = store[this.t];
    if (!tbl) return { data: null, error: { message: `relation "${this.t}" does not exist` } };
    const hit = tbl.filter((r) => this.filters.every((f) => f(r)));
    if (this.op === "insert") {
      for (const p of [].concat(this.payload)) tbl.push({ ...p });
      return { data: null, error: null };
    }
    if (this.op === "update") { hit.forEach((r) => Object.assign(r, this.payload)); return { data: null, error: null }; }
    if (this.op === "delete") { store[this.t] = tbl.filter((r) => !hit.includes(r)); return { data: null, error: null }; }
    let out = hit.map((r) => {
      const o = { ...r };
      if (this.cols.includes("check_office")) o.check_office = (store.check_office ?? []).find((x) => x.id === r.office_id) ?? null;
      return o;
    });
    if (this.lim) out = out.slice(0, this.lim);
    if (this.one) {
      if (out.length > 1) return { data: null, error: { message: "more than one row" } };
      return { data: out[0] ?? null, error: null };
    }
    return { data: out, error: null };
  }
}

export function createClient(..._a: any[]) {
  return { from: (t: string) => new Q(t), rpc: async () => ({ data: true, error: null }) };
}
