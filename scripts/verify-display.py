"""Verify the exact display permission without importing a private clinical engine."""
from pathlib import Path
import hashlib, json

root=Path(__file__).resolve().parents[1]
package=json.loads((root/'public/case-package.json').read_text())
review=package['publication'].pop('public_display_review')
digest=lambda x:hashlib.sha256((json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode()).hexdigest()
entries=[{'evidence_id':e['id'],'source_sha256':e.get('source_sha256'),
 'bibliographic_id':e.get('bibliographic_id'),'processing_permission':e.get('rights_status','unknown'),
 'representation_sha256':digest({'proposition':e.get('proposition'),'applicability':e.get('applicability')})}
 for e in package['projection']['candidate']['external_evidence']]
assert review['schema_version']=='hematoboard.public-display-review/1.0'
assert review['decision']=='approved' and review['test_only'] is False
assert review['payload_sha256']==digest(package)
assert review['entries']==entries
assert review['scope']=='complete_serialized_package_including_all_embedded_copies'
assert review['reviewer_id'] and review['basis'] and review['recorded_at']
print(json.dumps({'status':'pass','display_entries':len(entries),'exact_payload':True}))
