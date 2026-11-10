import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateCarePlanBindings} from '../src/safety/care-plan-model.ts';

const dir=new URL('../public/',import.meta.url);
const read=name=>JSON.parse(readFileSync(new URL(name,dir),'utf8'));
const hash=name=>createHash('sha256').update(readFileSync(new URL(name,dir))).digest('hex');
const write=(name,value)=>writeFileSync(new URL(name,dir),JSON.stringify(value,null,2)+'\n');
const manifest=read('preview-manifest.json'),release=read('release.json');
const data=read('case-package.json'),presentation=read('presentation.json');
for(const [name,key] of [['case-package.json','package_sha256'],['patient-graph.json','graph_sha256']]) {
  if(hash(name)!==manifest[key]||hash(name)!==release.files[key]) throw new Error('Clinical data changed: use its owning publication route.');
}
if(presentation.candidate_sha256!==manifest.candidate_sha256||presentation.graph_state_sha256!==manifest.patient_graph_state_sha256) throw new Error('Presentation revision mismatch');
await validateCarePlanBindings({manifest,data,presentation});
const presentationHash=hash('presentation.json');
if(presentationHash!==manifest.presentation_sha256) {
  release.presentation_revisions??=[];
  release.presentation_revisions.push({date:'2026-11-10',kind:'care_plan_projection',previous_sha256:manifest.presentation_sha256,sha256:presentationHash,clinical_candidate_changed:false,publication_basis:'User requested integration of the next planning step into the separately published CASE028 dashboard.'});
  release.files.presentation_sha256=presentationHash;
  write('release.json',release);
  manifest.presentation_sha256=presentationHash;
  manifest.release_sha256=hash('release.json');
  write('preview-manifest.json',manifest);
}
console.log('Presentation release refreshed; clinical package and graph unchanged.');
