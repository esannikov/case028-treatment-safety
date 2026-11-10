import {readFileSync,readdirSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {validateCarePlanBindings} from '../src/safety/care-plan-model.ts';
const root=new URL('../',import.meta.url).pathname;
const json=f=>JSON.parse(readFileSync(join(root,'public',f),'utf8'));
const sha=f=>createHash('sha256').update(readFileSync(join(root,'public',f))).digest('hex');
const m=json('preview-manifest.json'),r=json('release.json'),d=json('case-package.json'),g=json('patient-graph.json');
for(const [f,k] of [['case-package.json','package_sha256'],['patient-graph.json','graph_sha256'],['presentation.json','presentation_sha256'],['release.json','release_sha256']])if(sha(f)!==m[k])throw new Error(`Hash mismatch: ${f}`);
if(m.distribution_mode!=='static_public_snapshot'||r.publication_authorized_by_user!==true||d.publication.publication_authorized_by_user!==true)throw new Error('Missing publication authorization');
if(r.case_id!==m.case_id||r.candidate_sha256!==m.candidate_sha256||r.clinical_input_sha256!==d.projection.clinical_input_sha256||r.patient_graph_state_sha256!==m.patient_graph_state_sha256)throw new Error('Release identity mismatch');
for(const key of ['package_sha256','graph_sha256','presentation_sha256'])if(r.files[key]!==m[key])throw new Error(`Release mismatch: ${key}`);
if(g.origin_patient_graph_state_sha256!==m.patient_graph_state_sha256||g.objects.length!==d.patient_projection.objects.length)throw new Error('Graph projection mismatch');
if(r.clinician_accepted!==d.clinical_history.clinician_accepted)throw new Error('Clinical acceptance mismatch');
const prohibited=[/\/Users\//,/\/private\//,/file:\/\//,/collected\//,/-----BEGIN [A-Z ]*PRIVATE KEY-----/,/github_pat_[A-Za-z0-9_]{20,}/,/gh[pousr]_[A-Za-z0-9]{30,}/,/\bsk-[A-Za-z0-9_-]{24,}/];
const walk=dir=>readdirSync(dir).flatMap(n=>{const p=join(dir,n);return statSync(p).isDirectory()?walk(p):[p]});
for(const f of walk(join(root,'public'))){
 if(/\.(pdf|docx|xlsx)$/i.test(f))throw new Error('Original document is not permitted in the public tree');
 const t=readFileSync(f,'utf8');if(prohibited.some(p=>p.test(t)))throw new Error(`Private artifact or credential pattern in ${f.slice(root.length)}`);
}
await validateCarePlanBindings({manifest:m,data:d,presentation:json('presentation.json')});
console.log(JSON.stringify({status:'pass',case_id:m.case_id,candidate_sha256:m.candidate_sha256,distribution_mode:m.distribution_mode,clinician_accepted:r.clinician_accepted}));
