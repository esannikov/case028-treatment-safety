import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessmentTones} from '../src/safety/assessment-tone.ts';
import {historyDisplay} from '../src/safety/history-presentation.ts';
const a={course:{status:'uncertain'},causality:{category:'indeterminate'},severity:{status:'not_assessed',grade:null},seriousness:{status:'not_assessed'}};
test('unknown and unassessed states do not become reassuring or urgent colors',()=>{
 assert.deepEqual(assessmentTones(a),{course:'neutral',cause:'neutral',severity:'neutral',seriousness:'neutral'});
 assert.equal(assessmentTones({...a,severity:{status:'not_assessed',grade:3}}).severity,'neutral');
 for(const grade of [-1,0,6,2.5,NaN])assert.equal(assessmentTones({...a,severity:{status:'source_reported',grade}}).severity,'neutral');
});
test('recorded severity is independent of course, causality and seriousness',()=>{
 for(const [grade,tone] of [[1,'information'],[2,'attention'],[3,'concern'],[4,'concern'],[5,'concern']]){
  const result=assessmentTones({...a,course:{status:'improving_in_records'},causality:{category:'possible'},severity:{status:'source_reported',grade,scale:null}});
  assert.equal(result.severity,tone);assert.equal(result.course,'positive');assert.equal(result.cause,'information');assert.equal(result.seriousness,'neutral');
 }
 assert.equal(assessmentTones({...a,seriousness:{status:'criteria_met'}}).seriousness,'concern');
 assert.equal(assessmentTones({...a,seriousness:{status:'criteria_not_met'}}).seriousness,'neutral');
});
test('history annotation requires exact text, object versions and source hashes',()=>{
 const p=JSON.parse(readFileSync(new URL('../public/presentation.json',import.meta.url)));
 for(const row of p.complications.patient_intro.history){
  assert.ok(historyDisplay(row));
  assert.equal(historyDisplay({...row,text:row.text+' changed'}),null);
  assert.equal(historyDisplay({...row,source_refs:[{...row.source_refs[0],version_id:'changed'}]}),null);
  assert.equal(historyDisplay({...row,source_text_sha256:{}}),null);
  assert.equal(historyDisplay({...row,display:{...row.display,source_refs:null}}),null);
  assert.equal(historyDisplay({...row,display:{...row.display,title:5}}),null);
  assert.equal(historyDisplay({...row,display:undefined}),null);
 }
});
