import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {carePlan,validateCarePlan,validateCarePlanBindings,planRows,planGroup,relatedPlanSteps} from '../src/safety/care-plan-model.ts';
const read=name=>JSON.parse(readFileSync(new URL('../public/'+name,import.meta.url),'utf8'));
const b={data:read('case-package.json'),presentation:read('presentation.json'),manifest:read('preview-manifest.json')};
const clone=()=>structuredClone(b);
test('every workup has one plan item bound to unchanged clinical content',async()=>{
 assert.equal(await validateCarePlanBindings(b),true);
 assert.equal(carePlan(b).items.length,17);
 assert.deepEqual(carePlan(b).items.map(i=>i.workup_id),b.data.projection.candidate.workup.map(w=>w.id));
});
test('an altered result branch invalidates the planning projection',async()=>{
 const bad=clone();bad.data.projection.candidate.workup[0].expected_outcomes[0].conditions='changed';
 await assert.rejects(()=>validateCarePlanBindings(bad),/підстава плану змінилася/);
});
test('cross-revision plans, invented appointments and silent omissions fail closed',()=>{
 for(const mutate of [x=>x.candidate_sha256='other',x=>x.items[0].due_date='2026-12-01',x=>x.items[0].owner='Assigned doctor',x=>x.items.pop(),x=>x.items.push(x.items[0])]) {
  const bad=clone();mutate(carePlan(bad));assert.throws(()=>validateCarePlan(bad));
 }
});
test('dependencies preserve their source rationale and never delay urgent assessment',()=>{
 const plan=carePlan(b);
 for(const e of plan.dependencies) assert.notEqual(planGroup(b.data.projection.candidate.workup.find(w=>w.id===e.to_workup_id)),'urgent');
 const bad=clone();carePlan(bad).dependencies[0].basis_text='different';assert.throws(()=>validateCarePlan(bad),/Залежність/);
 const urgent=clone();carePlan(urgent).dependencies[0].to_workup_id='W7';assert.throws(()=>validateCarePlan(urgent),/Залежність/);
 assert.ok(relatedPlanSteps(plan,'W5').some(e=>e.from_workup_id==='W4'));
});
test('issue scope and search include all supported steps without mutating the case',()=>{
 const before=JSON.stringify(b);
 const issue=b.presentation.issues[0];
 assert.deepEqual(planRows(b,issue.workup_ids).map(w=>w.id),b.data.projection.candidate.workup.filter(w=>issue.workup_ids.includes(w.id)).map(w=>w.id));
 assert.equal(planRows(b,null).length,17);
 assert.equal(planRows(b,null,'zzzzzz').length,0);
 assert.ok(planRows(b,null,'кортизол').length>0);
 assert.equal(JSON.stringify(b),before);
});
test('public snapshot never invents performed actions; other cases remain compatible',()=>{
 assert.equal(b.presentation.complications.workflow_records.length,0);
 assert.ok(carePlan(b).items.every(i=>i.owner===null&&i.due_date===null&&i.clinician_decision===null));
 const legacy=clone();delete legacy.presentation.complications.care_plan;assert.equal(validateCarePlan(legacy),true);
});
