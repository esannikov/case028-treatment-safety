import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatePublicRelease} from '../src/safety/publication.ts';
const load=f=>JSON.parse(readFileSync(new URL('../public/'+f,import.meta.url)));
const m=load('preview-manifest.json'),d=load('case-package.json'),r=load('release.json');
test('public snapshot retains explicit authorization and exact clinical identity',()=>assert.equal(validatePublicRelease(m,d,r),true));
test('public snapshot rejects mismatched candidate, source files, input or authorization',()=>{
 for(const key of ['candidate_sha256','case_id','clinical_input_sha256','patient_graph_state_sha256'])assert.throws(()=>validatePublicRelease(m,d,{...r,[key]:'changed'}));
 assert.throws(()=>validatePublicRelease(m,d,{...r,publication_authorized_by_user:false}));
 assert.throws(()=>validatePublicRelease(m,d,{...r,clinician_accepted:!r.clinician_accepted}));
 assert.throws(()=>validatePublicRelease(m,d,{...r,files:{...r.files,graph_sha256:'changed'}}));
 assert.throws(()=>validatePublicRelease(m,d,{...r,source_review:{...r.source_review,human_verified:true}}));
});
