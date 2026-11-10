export type PointState = 'above' | 'below' | 'within' | 'unassessed' | 'mixed';
const labels: Record<string, string> = {
  above: 'Вище референсу', below: 'Нижче референсу', within: 'У референсі джерела',
  not_comparable: 'Референс не визначено',
};
// Display only the supplied source classifications; never calculate a clinical grade.
export function recordedPointStatus(statuses: string[]): {state: PointState; label: string} {
  const unique = [...new Set(statuses)];
  if (unique.length > 1) return {state: 'mixed', label: 'Різні оцінки джерел: ' + unique.map(s => labels[s] ?? 'Референс не визначено').join('; ')};
  const status = unique[0];
  return {state: status === 'above' || status === 'below' || status === 'within' ? status : 'unassessed', label: labels[status] ?? 'Референс не визначено'};
}
