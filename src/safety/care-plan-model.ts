import type {Bundle, Workup} from './model';

export type PlanItem = {
  workup_id: string;
  workup_sha256: string;
  decision: string;
  required_information: string[];
  review_moment: string;
  owner: null;
  due_date: null;
  clinician_decision: null;
};
export type PlanDependency = {
  from_workup_id: string;
  to_workup_id: string;
  kind: 'clinical_context';
  label: string;
  basis_workup_id: string;
  basis_field: 'rationale';
  basis_text: string;
};
export type CarePlan = {
  schema_version: 'hematoboard.care-plan-projection/0.1';
  candidate_sha256: string;
  graph_state_sha256: string;
  status: 'proposed_for_clinician_review';
  basis: 'existing_candidate_workup';
  items: PlanItem[];
  dependencies: PlanDependency[];
};

export function carePlan(b: Bundle): CarePlan | undefined {
  return (b.presentation as unknown as {complications?: {care_plan?: CarePlan}}).complications?.care_plan;
}

export function validateCarePlan(b: Bundle) {
  const plan = carePlan(b);
  if (!plan) return true; // Existing cases need no new projection.
  if (plan.schema_version !== 'hematoboard.care-plan-projection/0.1'
    || plan.status !== 'proposed_for_clinician_review'
    || plan.basis !== 'existing_candidate_workup'
    || plan.candidate_sha256 !== b.manifest.candidate_sha256
    || plan.graph_state_sha256 !== b.manifest.patient_graph_state_sha256) {
    throw new Error('План спостереження належить іншій версії клінічної оцінки.');
  }
  const workup = new Map(b.data.projection.candidate.workup.map(w => [w.id, w]));
  const ids = new Set<string>();
  for (const item of plan.items) {
    if (!workup.has(item.workup_id) || ids.has(item.workup_id)
      || !/^[a-f0-9]{64}$/.test(item.workup_sha256) || !item.decision.trim()
      || !item.required_information.length || item.required_information.some(s => !s.trim())
      || !item.review_moment.trim()
      || item.owner !== null || item.due_date !== null || item.clinician_decision !== null) {
      throw new Error('Пункт плану не відповідає синтезу або містить непідтверджене призначення.');
    }
    ids.add(item.workup_id);
  }
  if (ids.size !== workup.size) throw new Error('План втратив частину клінічних уточнень.');
  const edges = new Set<string>();
  for (const edge of plan.dependencies) {
    const key = `${edge.from_workup_id}:${edge.to_workup_id}`;
    if (!ids.has(edge.from_workup_id) || !ids.has(edge.to_workup_id)
      || edge.from_workup_id === edge.to_workup_id || edges.has(key)
      || edge.kind !== 'clinical_context' || edge.basis_field !== 'rationale'
      || edge.basis_workup_id !== edge.to_workup_id
      || edge.basis_text !== workup.get(edge.basis_workup_id)?.rationale
      || workup.get(edge.to_workup_id)?.necessity === 'urgent_if_triggered') {
      throw new Error('Залежність плану не має належної клінічної підстави.');
    }
    edges.add(key);
  }
  return true;
}

export async function validateCarePlanBindings(b: Bundle) {
  validateCarePlan(b);
  for (const item of carePlan(b)?.items ?? []) {
    const w = b.data.projection.candidate.workup.find(w => w.id === item.workup_id)!;
    const bytes = new TextEncoder().encode(JSON.stringify(w));
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
      .map(x => x.toString(16).padStart(2, '0')).join('');
    if (hash !== item.workup_sha256) throw new Error('Клінічна підстава плану змінилася. Потрібне оновлення представлення.');
  }
  return true;
}

export function planGroup(w: Workup): 'priority' | 'conditional' | 'urgent' {
  return w.necessity === 'urgent_if_triggered' ? 'urgent'
    : ['high', 'medium'].includes(w.priority) ? 'priority' : 'conditional';
}

export function planRows(b: Bundle, issueWorkupIds: string[] | null, query = '') {
  const q = query.trim().toLocaleLowerCase('uk');
  return b.data.projection.candidate.workup.filter(w => (!issueWorkupIds || issueWorkupIds.includes(w.id))
    && (!q || `${w.label} ${w.rationale} ${carePlan(b)?.items.find(i => i.workup_id === w.id)?.decision ?? ''}`.toLocaleLowerCase('uk').includes(q)));
}

export function relatedPlanSteps(plan: CarePlan, workupId: string) {
  return plan.dependencies.filter(e => e.to_workup_id === workupId || e.from_workup_id === workupId);
}
