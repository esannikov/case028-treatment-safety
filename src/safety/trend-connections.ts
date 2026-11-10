import type {PlotPoint} from './model';

export type TrendConnection = {from: PlotPoint; to: PlotPoint; provisional: boolean};
const exact = (p: PlotPoint) => p.comparator === null || p.comparator === '' || p.comparator === '=';
const signature = (p: PlotPoint) => [...new Set(p.records.map(o => JSON.stringify([o.unit,o.specimen_type,o.specimen_literal,o.method])))];

// A connector orders observed samples. It never supplies an intermediate value.
// Conflicting values on one day or a censored result break the sequence.
export function trendConnections(points: PlotPoint[], value: (p: PlotPoint) => number = p => p.value): TrendConnection[] {
  const days = new Map<string, PlotPoint[]>();
  for (const p of points) days.set(p.date, [...(days.get(p.date) ?? []), p]);
  const out: TrendConnection[] = [];
  let previous: PlotPoint | null = null;
  for (const [, rows] of [...days].sort(([a],[b]) => a.localeCompare(b))) {
    const values = new Set(rows.map(p => value(p)));
    const signatures = new Set(rows.flatMap(signature));
    if (values.size !== 1 || signatures.size !== 1 || rows.some(p => !exact(p) || !Number.isFinite(value(p)))) {
      previous = null;
      continue;
    }
    const current = rows[0];
    if (previous && signature(previous)[0] === signature(current)[0]) {
      const provisional = [...previous.records,...current.records].some(o => !o.method || !(o.specimen_type || o.specimen_literal));
      out.push({from: previous, to: current, provisional});
    }
    previous = current;
  }
  return out;
}
