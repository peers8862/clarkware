export enum Role {
  Owner                 = 'owner',
  FacilityAdministrator = 'facility_admin',
  Supervisor            = 'supervisor',
  Operator              = 'operator',
  QualityReviewer       = 'quality_reviewer',
  RemoteExpert          = 'remote_expert',
  ObserverAuditor       = 'observer',
  AgentBounded          = 'agent_bounded',
  ServiceAdapter        = 'service_adapter',
}

export enum ActorType {
  HumanUser          = 'human_user',
  AIAgent            = 'ai_agent',
  AutomationService  = 'automation_service',
}
