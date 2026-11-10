import type {Ref} from './model';
import type {HistoryEntry,HistoryDisplay} from './complications-model';

// Display annotations can label an existing stage, never rewrite or date a new fact.
export function historyDisplay(item:HistoryEntry):HistoryDisplay|null {
  const d=item.display;
  if(!d || typeof d.title!=='string' || !d.title.trim() || typeof d.period!=='string' || !d.period.trim() || d.source_text!==item.text) return null;
  if(!Array.isArray(d.source_refs) || d.source_refs.some(r=>!r || typeof r.object_id!=='string' || typeof r.version_id!=='string') || !d.source_text_sha256 || typeof d.source_text_sha256!=='object') return null;
  const refs=(xs:Ref[])=>JSON.stringify(xs.map(r=>[r.object_id,r.version_id]).sort());
  const hashes=(v:Record<string,string>)=>JSON.stringify(Object.entries(v).sort());
  if(refs(d.source_refs)!==refs(item.source_refs) || hashes(d.source_text_sha256)!==hashes(item.source_text_sha256)) return null;
  return d;
}
