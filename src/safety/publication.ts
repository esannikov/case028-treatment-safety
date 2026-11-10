import type {CasePackage,Manifest} from './model';

export type PublicRelease={
 schema_version:'case028.public-snapshot/1.0';case_id:string;candidate_sha256:string;
 clinical_input_sha256:string;patient_graph_state_sha256:string;
 files:{package_sha256:string;graph_sha256:string;presentation_sha256:string};
 publication_authorized_by_user:boolean;clinician_accepted:boolean;public_display_payload_sha256:string;
 source_review:{mode:'delegated_technical';technical_verified:boolean;human_verified:boolean};
};

export function validatePublicRelease(m:Manifest,d:CasePackage,r:PublicRelease){
 const publication=d.publication as CasePackage['publication']&{publication_authorized_by_user?:boolean;public_display_review?:{decision:string;payload_sha256:string}};
 const history=d.clinical_history as CasePackage['clinical_history']&{clinician_accepted?:boolean};
 if(m.distribution_mode!=='static_public_snapshot'||r.schema_version!=='case028.public-snapshot/1.0'
  ||r.case_id!==m.case_id||r.candidate_sha256!==m.candidate_sha256
  ||r.clinical_input_sha256!==d.projection.clinical_input_sha256
  ||r.patient_graph_state_sha256!==m.patient_graph_state_sha256
  ||r.files?.package_sha256!==m.package_sha256||r.files?.graph_sha256!==m.graph_sha256
  ||r.files?.presentation_sha256!==m.presentation_sha256
  ||publication.public_display_review?.decision!=='approved'||publication.public_display_review.payload_sha256!==r.public_display_payload_sha256
  ||r.publication_authorized_by_user!==true||publication.publication_authorized_by_user!==true
  ||r.clinician_accepted!==history.clinician_accepted
  ||r.source_review?.mode!=='delegated_technical'||r.source_review.technical_verified!==true
  ||r.source_review.human_verified!==false){throw new Error('Файли публічного випадку належать різним версіям або не мають дозволу на публікацію.');}
 return true;
}
