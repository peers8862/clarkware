export enum Role {
  Owner                 = 'owner',
  FacilityAdministrator = 'facility_administrator',
  Supervisor            = 'supervisor',
  Operator              = 'operator',
  QualityReviewer       = 'quality_reviewer',
  RemoteExpert          = 'remote_expert',
  ObserverAuditor       = 'observer_auditor',
}

export enum ActorType {
  HumanUser          = 'human_user',
  AIAgent            = 'ai_agent',
  AutomationService  = 'automation_service',
}
