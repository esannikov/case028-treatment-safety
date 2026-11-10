import test from 'node:test';
import assert from 'node:assert/strict';
import {trendConnections} from '../src/safety/trend-connections.ts';

const point=(date,value,extra={})=>({key:date+':'+value,date,value,comparator:null,records:[{unit:'U/L',method:'method-a',specimen_type:'serum',specimen_literal:'serum'}],statuses:['within'],references:[],...extra});
test('orders exact clinical measurements without changing the source points',()=>{
 const points=[point('2026-03-01',3),point('2026-01-01',1),point('2026-02-01',2)];const before=JSON.stringify(points);
 const links=trendConnections(points);assert.deepEqual(links.map(l=>[l.from.date,l.to.date]),[['2026-01-01','2026-02-01'],['2026-02-01','2026-03-01']]);assert.ok(links.every(l=>!l.provisional));assert.equal(JSON.stringify(points),before);
});
test('ambiguous same-day values and censored results break both adjacent links',()=>{
 const first=point('2026-01-01',1),last=point('2026-03-01',3);
 assert.equal(trendConnections([first,point('2026-02-01',2),point('2026-02-01',4),last]).length,0);
 for(const comparator of ['<','>','<=','>=','≤','≥','~'])assert.equal(trendConnections([first,point('2026-02-01',2,{comparator}),last]).length,0);
});
test('identical same-day readings can retain separate source markers without an invented vertical segment',()=>{
 const a=point('2026-01-01',1),b=point('2026-02-01',2),duplicate={...b,key:'other-source'};
 const links=trendConnections([a,b,duplicate]);assert.equal(links.length,1);assert.equal(links[0].to.date,b.date);
});
test('unit, material or method changes never share a connector; missing metadata is explicit',()=>{
 const a=point('2026-01-01',1),b=point('2026-02-01',2);
 for(const [key,value] of [['unit','other'],['method','other'],['specimen_type','plasma'],['specimen_literal','plasma']])assert.equal(trendConnections([a,{...b,records:[{...b.records[0],[key]:value}]}]).length,0);
 const missing=p=>({...p,records:[{...p.records[0],method:null}]});assert.equal(trendConnections([missing(a),missing(b)])[0].provisional,true);
});
test('different normalized denominators on one day do not invent a trajectory',()=>{
 const a=point('2026-01-01',1),b=point('2026-02-01',2),other={...b,key:'other',value:2};
 assert.equal(trendConnections([a,b,other],p=>p.key==='other'?4:p.value).length,0);
});
