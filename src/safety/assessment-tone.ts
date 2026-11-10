import type {EpisodeAssessment} from './safety-graph';

export type AssessmentTone = 'neutral'|'positive'|'information'|'attention'|'concern';

// Each axis is styled independently. Unknown never means reassuring or urgent.
export function assessmentTones(a: EpisodeAssessment): Record<'course'|'cause'|'severity'|'seriousness',AssessmentTone> {
  const course:AssessmentTone = ['improving_in_records','resolved_in_records'].includes(a.course.status)
    ? 'positive' : ['persistent_in_records','recurring_in_records'].includes(a.course.status) ? 'attention' : 'neutral';
  const cause:AssessmentTone = ['possible','probable'].includes(a.causality.category) ? 'information' : 'neutral';
  let severity:AssessmentTone = 'neutral';
  const g=a.severity.grade;
  if (['source_reported','estimated'].includes(a.severity.status) && g!==null && Number.isInteger(g) && g>=1 && g<=5) {
    severity=g>=3?'concern':g===2?'attention':'information';
  }
  const seriousness:AssessmentTone = a.seriousness.status==='criteria_met'?'concern':'neutral';
  return {course,cause,severity,seriousness};
}
