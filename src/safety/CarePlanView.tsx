import {useEffect, useRef, useState} from 'react';
import {Button, Chip, MenuItem, TextField, ToggleButton, ToggleButtonGroup} from '@mui/material';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined';
import type {Bundle, Issue, Workup} from './model';
import {dateText, workupTitle} from './model';
import type {ComplicationsHost} from './complications-model';
import {complications} from './complications-model';
import {carePlan, planGroup, planRows, relatedPlanSteps} from './care-plan-model';
import {EvidenceLink} from './clinical-components';
import {ClearPlan} from './clear-views';
import './care-plan.css';

const groupLabels = {priority: 'Першочергові уточнення', conditional: 'За клінічними показаннями', urgent: 'За невідкладних симптомів'};
const stageLabels = {ordered: 'Призначено', performed: 'Виконано', result_available: 'Результат отримано', reviewed: 'Переглянуто лікарем'};

function OutcomePreview({b, w}: {b: Bundle; w: Workup}) {
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => setSelected(null), [w.id]);
  const outcome = selected === null ? undefined : w.expected_outcomes[selected];
  return <section className="plan-outcomes" aria-label="Сценарії результатів">
    <h3>Як результат змінює оцінку</h3>
    <p className="plan-hint">Можливі результати перевірки</p>
    <div className="outcome-options">{w.expected_outcomes.map((o, i) =>
      <button key={i} aria-pressed={selected === i} onClick={() => setSelected(selected === i ? null : i)}>
        <span>{o.result}</span><ExpandMoreOutlinedIcon aria-hidden="true"/>
      </button>)}</div>
    {outcome && <div className="plan-outcome-detail" role="region" aria-label="Інтерпретація обраного сценарію">
      <h4>Умови інтерпретації</h4><p>{outcome.conditions}</p>
      <ul>{outcome.effects.map((effect, i) => <li key={i}>
        <strong>{({supports:'Підтримує',weakens:'Послаблює',unchanged:'Без зміни оцінки',needs_review:'Потребує перегляду'} as Record<string,string>)[effect.impact] ?? 'Потребує оцінки'}:</strong>{' '}
        {b.data.projection.candidate.hypotheses.find(h => h.id === effect.hypothesis_id)?.label}
      </li>)}</ul>
    </div>}
  </section>;
}

export function CarePlanView({b, issue, host, onOpen}: {b: Bundle; issue: Issue; host: ComplicationsHost; onOpen: (ids: string[]) => void}) {
  const plan = carePlan(b);
  const [all, setAll] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(issue.workup_ids[0]);
  const detailRef = useRef<HTMLElement>(null);
  useEffect(() => {setSelectedId(issue.workup_ids[0]); setQuery(''); setAll(false)}, [issue.key, b.manifest.candidate_sha256]);
  if (!plan) return <ClearPlan b={b} issue={issue} host={host} onOpen={onOpen}/>;
  const rows = planRows(b, all ? null : issue.workup_ids, query);
  const selected = rows.find(w => w.id === selectedId) ?? rows[0];
  const item = plan.items.find(i => i.workup_id === selected?.id);
  const records = complications(b).workflow_records.filter(r => r.workup_id === selected?.id)
    .slice().sort((a, z) => a.recorded_at.localeCompare(z.recorded_at));
  const links = selected ? relatedPlanSteps(plan, selected.id) : [];
  const patientRefs = [...new Set(b.data.projection.candidate.relations
    .filter(r => selected?.discriminates.includes(r.hypothesis_id))
    .map(r => r.source_ref.object_id))];
  const gaps = b.data.projection.candidate.critical_gaps.filter(g => selected?.discriminates.some(id => g.hypothesis_ids.includes(id)));
  const choose = (id: string, reveal = false) => {
    if (reveal) {setAll(true); setQuery('')}
    setSelectedId(id);
    requestAnimationFrame(() => {detailRef.current?.focus({preventScroll: true}); detailRef.current?.scrollIntoView({block:'start', behavior:'instant'})});
  };
  return <div className="care-plan" data-testid="care-plan">
    <section className="panel plan-intro">
      <div className="panel-heading"><h2>План спостереження</h2><Chip label="Для узгодження з лікарем" size="small" variant="outlined"/></div>
      <details className="plan-setup-disclosure"><summary>Строки контролю та відповідальний</summary><div className="plan-setup" aria-label="Узгодження плану">
        <span><strong>Строки контролю</strong>Визначити після актуалізації стану</span>
        <span><strong>Відповідальний</strong>Узгодити з клінічною командою</span>
      </div></details>
    </section>
    <>
      <div className="plan-toolbar">
        <ToggleButtonGroup exclusive size="small" value={all ? 'all' : 'related'} onChange={(_, v) => v && setAll(v === 'all')} aria-label="Обсяг плану">
          <ToggleButton value="related">За обраним питанням</ToggleButton><ToggleButton value="all">Увесь план · {plan.items.length}</ToggleButton>
        </ToggleButtonGroup>
        <TextField size="small" label="Пошук у плані" value={query} onChange={e => setQuery(e.target.value)}/>
      </div>
      {!rows.length ? <section className="panel plan-empty"><h3>Уточнень за цим запитом немає</h3><Button onClick={() => {setQuery(''); setAll(true)}}>Показати весь план</Button></section> : <div className="plan-workspace">
        <aside className="panel plan-navigation" aria-label="Клінічні рішення плану">
          <h3>Клінічні рішення</h3>
          {(['priority', 'conditional', 'urgent'] as const).map(group => {
            const groupRows = rows.filter(w => planGroup(w) === group);
            return groupRows.length > 0 && <section key={group} className={'plan-step-group ' + group}>
              <h4>{groupLabels[group]}</h4>{groupRows.map(w => <button key={w.id} onClick={() => choose(w.id)} aria-current={selected?.id === w.id ? 'true' : undefined}>
                <span>{workupTitle(b,w)}</span><ArrowForwardOutlinedIcon aria-hidden="true"/>
              </button>)}
            </section>;
          })}
        </aside>
        {selected && item && <article className="panel plan-decision" ref={detailRef} tabIndex={-1} data-testid="plan-decision" data-workup-id={selected.id}>
          <div className="plan-mobile-choice"><TextField select fullWidth size="small" label="Клінічне рішення" value={selected.id} onChange={e => setSelectedId(e.target.value)}>
            {rows.map(w => <MenuItem key={w.id} value={w.id} sx={{whiteSpace:'normal',maxWidth:'80vw'}}>{workupTitle(b,w)}</MenuItem>)}
          </TextField></div>
          <div className="plan-decision-title"><h2>{item.decision}</h2><span className={'plan-priority '+planGroup(selected)}>{groupLabels[planGroup(selected)]}</span></div>
          <p className="plan-rationale">{selected.rationale}</p>
          {patientRefs.length>0 && <Button className="plan-patient-sources" size="small" variant="outlined" onClick={() => onOpen(patientRefs)}>Дані пацієнтки · {patientRefs.length}</Button>}
          <section className="plan-required"><h3>Дані для рішення</h3><ul>{item.required_information.map(text => <li key={text}>{text}</li>)}</ul></section>
          <section className={'plan-review-moment '+planGroup(selected)}><h3>Коли переглянути тактику</h3><p>{item.review_moment}</p>{selected.trigger && selected.trigger !== item.review_moment && <p className="plan-trigger">{selected.trigger}</p>}</section>
          {links.length > 0 && <section className="plan-dependencies"><h3>Пов’язані клінічні перевірки</h3><p className="plan-hint">Контекст для узгодженої оцінки</p>{links.map(edge => {
            const incoming = edge.to_workup_id === selected.id;
            const id = incoming ? edge.from_workup_id : edge.to_workup_id;
            const w = b.data.projection.candidate.workup.find(w => w.id === id)!;
            return <div className="plan-dependency" key={`${edge.from_workup_id}-${edge.to_workup_id}`}><span>{edge.label}</span><Button size="small" onClick={() => choose(id, true)} endIcon={<ArrowForwardOutlinedIcon/>}>{workupTitle(b,w)}</Button></div>;
          })}</section>}
          <OutcomePreview key={`${b.manifest.candidate_sha256}:${selected.id}`} b={b} w={selected}/>
          <section className="plan-execution"><h3>Виконання та результат</h3>{records.length === 0 ? <p>Запропоновано в синтезі. Запису про призначення чи виконання цього кроку ще немає.</p> : <ol>{records.map((r,i) => <li key={i}><strong>{stageLabels[r.stage]}</strong><time>{dateText(r.recorded_at)}</time><p>{r.text}</p><Button size="small" onClick={() => onOpen(r.source_refs.map(ref => ref.object_id))}>Джерело виконання</Button></li>)}</ol>}
            {host.onRequestWorkupUpdate && <Button variant="outlined" onClick={() => host.onRequestWorkupUpdate?.({case_id:b.manifest.case_id,candidate_sha256:b.manifest.candidate_sha256,workup_id:selected.id})}>Оновити виконання</Button>}
          </section>
          {gaps.length>0 && <details className="plan-sources"><summary>Невирішені клінічні питання · {gaps.length}</summary>{gaps.map(g => <div key={g.id}><h4>{g.question}</h4><p>{g.rationale}</p></div>)}</details>}
          <details className="plan-sources"><summary>Настанови й підстава плану · {selected.evidence_refs.length}</summary><div className="small-source-list">{selected.evidence_refs.map(id => <EvidenceLink key={id} b={b} id={id}/>)}</div><p>Формулювання синтезу: {selected.label}</p></details>
        </article>}
      </div>}
    </>
  </div>;
}
