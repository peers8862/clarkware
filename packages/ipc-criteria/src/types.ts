/** IPC-A-610 assembly class */
export type AssemblyClass = '1' | '2' | '3';

/** Result an operator records for a single inspection point */
export type InspectionResult = 'Pass' | 'Fail' | 'ProcessIndicator' | 'NotEvaluated';

/** Disposition for a defect */
export type DefectDisposition = 'Repair' | 'Reject' | 'UseAsIs' | 'CustomerWaiver';

/**
 * A single IPC workmanship criterion.
 * Structured summaries of IPC-A-610 conditions — not verbatim standard text.
 * Each entry covers one specific condition and has class-specific accept/reject language.
 */
export interface IPCCriterion {
  /** Clark internal criterion ID — stable across database versions */
  id: string;

  /** IPC-A-610 section reference, e.g. "8.3.2" */
  ipcSection: string;

  /** Short name of the condition, e.g. "Solder Bridge" */
  name: string;

  /** Description of what the inspector is looking for */
  description: string;

  /** Component category this criterion applies to */
  componentCategory: string;

  /** Step type this criterion is relevant to */
  stepType: 'solder' | 'component_placement' | 'cleanliness' | 'mechanical' | 'marking' | 'general';

  /** Accept criteria per class — may be same across classes or differ */
  accept: Record<AssemblyClass, string>;

  /** Reject criteria per class */
  reject: Record<AssemblyClass, string>;

  /** Keywords for search/filtering */
  tags: string[];
}

/** A step in a job's inspection sequence */
export interface InspectionStep {
  id: string;
  jobId: string;
  stepIndex: number;
  stepType: string;
  assemblyClass: AssemblyClass;
  status: 'pending' | 'in_progress' | 'complete';
  createdAt: Date;
  completedAt: Date | null;
}

/** A single operator-recorded inspection point result */
export interface InspectionPointResult {
  id: string;
  stepId: string;
  jobId: string;
  criterionId: string;
  result: InspectionResult;
  notes: string | null;
  evidenceArtifactId: string | null;
  operatorId: string;
  recordedAt: Date;
}

/** A defect record — created when an inspection point is logged as Fail */
export interface DefectRecord {
  id: string;
  stepId: string;
  jobId: string;
  criterionId: string;
  description: string;
  disposition: DefectDisposition | null;
  dispositionNote: string | null;
  dispositionBy: string | null;
  dispositionAt: Date | null;
  status: 'open' | 'dispositioned' | 'closed';
  createdAt: Date;
}
