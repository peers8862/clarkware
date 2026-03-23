/**
 * All shared enumeration types for Clarkware v1.
 * Centralised here so domain modules import from one place.
 */

/** Who or what generated an event */
export enum SourceType {
  HumanUI          = 'human_ui',
  AIAgent          = 'ai_agent',
  AutomationService = 'automation_service',
  ToolAdapter      = 'tool_adapter',
  System           = 'system',
}

/** Message classification — drives routing, review, and retention */
export enum MessageClass {
  Chat           = 'chat',
  Question       = 'question',
  Alert          = 'alert',
  Handoff        = 'handoff',
  Recommendation = 'recommendation',
  Resolution     = 'resolution',
  StatusUpdate   = 'status_update',
  SystemNotice   = 'system_notice',
}

/** AI-content review lifecycle */
export enum ReviewState {
  NotRequired    = 'not_required',
  PendingReview  = 'pending_review',
  Accepted       = 'accepted',
  Rejected       = 'rejected',
  Edited         = 'edited',
}

/** Operational note classification */
export enum NoteType {
  Observation    = 'observation',
  OperatorLog    = 'operator_log',
  QualityNote    = 'quality_note',
  TestNote       = 'test_note',
  ShiftHandoff   = 'shift_handoff',
  AIDraft        = 'ai_draft',
  ResolutionNote = 'resolution_note',
}

/** Evidence artifact classification */
export enum ArtifactType {
  Image              = 'image',
  File               = 'file',
  TestOutput         = 'test_output',
  CalibrationOutput  = 'calibration_output',
  FirmwareBuild      = 'firmware_build',
  LogExport          = 'log_export',
  Report             = 'report',
}

/** Retention policy class — determines deletion eligibility */
export enum RetentionClass {
  /** Retain for job lifetime + configured years */
  Operational  = 'operational',
  /** Never delete without explicit owner action */
  Evidence     = 'evidence',
  /** Short retention (presence events, draft messages) */
  Transient    = 'transient',
  /** Retain per facility jurisdiction rules */
  Compliance   = 'compliance',
}

/** How a tool or instrument connects to Clarkware */
export enum IntegrationMode {
  ManualAttach   = 'manual_attach',
  FileImport     = 'file_import',
  WatchedFolder  = 'watched_folder',
  ApiAdapter     = 'api_adapter',
  SerialAdapter  = 'serial_adapter',
  NetworkAdapter = 'network_adapter',
}

/** Live adapter operational status */
export enum AdapterStatus {
  Connected    = 'connected',
  Idle         = 'idle',
  Importing    = 'importing',
  Error        = 'error',
  Offline      = 'offline',
}

/** Operational presence state — scoped per (actor, workstation) */
export enum PresenceStateValue {
  Available        = 'available',
  HeadsDown        = 'heads_down',
  OnStation        = 'on_station',
  InReview         = 'in_review',
  AwaitingResponse = 'awaiting_response',
  Unavailable      = 'unavailable',
  AutomationActive = 'automation_active',
}

/** Task classification vocabulary */
export enum TaskType {
  ProcedureStep    = 'procedure_step',
  Inspection       = 'inspection',
  CalibrationCheck = 'calibration_check',
  DataEntry        = 'data_entry',
  EvidenceCapture  = 'evidence_capture',
  AIReview         = 'ai_review',
  Approval         = 'approval',
}

/** AI agent functional specialisation */
export enum AgentType {
  Summarizer          = 'summarizer',
  Router              = 'router',
  RetrievalAssistant  = 'retrieval_assistant',
  DraftingAssistant   = 'drafting_assistant',
  TriageAssistant     = 'triage_assistant',
}

/** Bounded action classes for AI agent permission grants */
export enum AgentActionClass {
  SummarizeContext  = 'summarize_context',
  DraftNote         = 'draft_note',
  RouteAlert        = 'route_alert',
  RetrieveHistory   = 'retrieve_history',
  ProposeTask       = 'propose_task',
  FlagAnomaly       = 'flag_anomaly',
  GenerateReport    = 'generate_report',
}

/** Zone functional type */
export enum ZoneType {
  Assembly    = 'assembly',
  Test        = 'test',
  Calibration = 'calibration',
  Diagnostics = 'diagnostics',
  Receiving   = 'receiving',
  Shipping    = 'shipping',
  QA          = 'qa',
  Storage     = 'storage',
  General     = 'general',
}

/** Job category */
export enum JobType {
  BoardDiagnostics  = 'board_diagnostics',
  FunctionalTest    = 'functional_test',
  Calibration       = 'calibration',
  Assembly          = 'assembly',
  QualityReview     = 'quality_review',
  FirmwareFlash     = 'firmware_flash',
  Rework            = 'rework',
  General           = 'general',
}

/** Job urgency */
export enum Priority {
  Critical = 'critical',
  High     = 'high',
  Medium   = 'medium',
  Low      = 'low',
}

/** Conversation channel type */
export enum ConversationType {
  Direct    = 'direct',
  Workspace = 'workspace',
  Job       = 'job',
  Issue     = 'issue',
  System    = 'system',
  AIAssist  = 'ai_assist',
}

/** Automation service category */
export enum AutomationServiceType {
  ToolAdapter       = 'tool_adapter',
  FileWatcher       = 'file_watcher',
  DataExporter      = 'data_exporter',
  AlertRouter       = 'alert_router',
  SyncWorker        = 'sync_worker',
  BackupService     = 'backup_service',
}
