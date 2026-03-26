/**
 * Inspection API client for the clark-inspection-extension.
 * All types are defined locally — this is a frontend module and cannot
 * import from backend packages such as @clark/ipc-criteria.
 */

const API_BASE = 'http://localhost:3000/v1';
const TOKEN_KEY = 'clark_access_token';

export type AssemblyClass = '1' | '2' | '3';
export type InspectionResult = 'Pass' | 'Fail' | 'ProcessIndicator' | 'NotEvaluated';
export type DefectDisposition = 'Repair' | 'Reject' | 'UseAsIs' | 'CustomerWaiver';

export interface IPCCriterion {
  id: string;
  ipcSection: string;
  name: string;
  description: string;
  componentCategory: string;
  stepType: string;
  accept: Record<AssemblyClass, string>;
  reject: Record<AssemblyClass, string>;
  tags: string[];
}

export interface InspectionStep {
  id: string;
  jobId: string;
  stepIndex: number;
  stepType: string;
  assemblyClass: AssemblyClass;
  status: 'pending' | 'in_progress' | 'complete';
  createdAt: string;
  completedAt: string | null;
}

export interface InspectionPointResult {
  id: string;
  stepId: string;
  jobId: string;
  criterionId: string;
  result: InspectionResult;
  notes: string | null;
  evidenceArtifactId: string | null;
  operatorId: string;
  recordedAt: string;
}

export interface DefectRecord {
  id: string;
  stepId: string;
  jobId: string;
  criterionId: string;
  description: string;
  disposition: DefectDisposition | null;
  dispositionNote: string | null;
  dispositionBy: string | null;
  dispositionAt: string | null;
  status: 'open' | 'dispositioned' | 'closed';
  createdAt: string;
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string>) },
  });
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// ── Criteria ─────────────────────────────────────────────────────────────────

export async function fetchCriteria(assemblyClass: AssemblyClass, stepType?: string): Promise<IPCCriterion[]> {
  const params = new URLSearchParams({ assemblyClass });
  if (stepType) params.set('stepType', stepType);
  return json<IPCCriterion[]>(await authFetch(`/inspection/criteria?${params}`));
}

// ── Steps ─────────────────────────────────────────────────────────────────────

export async function fetchSteps(jobId: string): Promise<InspectionStep[]> {
  return json<InspectionStep[]>(await authFetch(`/inspection/steps/job/${encodeURIComponent(jobId)}`));
}

export async function createStep(params: {
  jobId: string;
  facilityId: string;
  workstationId: string;
  stepIndex: number;
  stepType: string;
  assemblyClass: AssemblyClass;
}): Promise<InspectionStep> {
  return json<InspectionStep>(await authFetch('/inspection/steps', {
    method: 'POST',
    body: JSON.stringify(params),
  }));
}

export async function completeStep(params: {
  stepId: string;
  jobId: string;
  facilityId: string;
  workstationId: string;
}): Promise<InspectionStep> {
  return json<InspectionStep>(await authFetch(`/inspection/steps/${encodeURIComponent(params.stepId)}/complete`, {
    method: 'POST',
    body: JSON.stringify({
      jobId: params.jobId,
      facilityId: params.facilityId,
      workstationId: params.workstationId,
    }),
  }));
}

// ── Results ───────────────────────────────────────────────────────────────────

export async function fetchResults(stepId: string): Promise<InspectionPointResult[]> {
  return json<InspectionPointResult[]>(await authFetch(`/inspection/results/step/${encodeURIComponent(stepId)}`));
}

export async function logResult(params: {
  stepId: string;
  jobId: string;
  facilityId: string;
  workstationId: string;
  criterionId: string;
  result: InspectionResult;
  notes?: string;
}): Promise<{ result: InspectionPointResult; defect: DefectRecord | null }> {
  return json<{ result: InspectionPointResult; defect: DefectRecord | null }>(
    await authFetch('/inspection/results', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  );
}

// ── Defects ───────────────────────────────────────────────────────────────────

export async function fetchDefects(jobId: string): Promise<DefectRecord[]> {
  return json<DefectRecord[]>(await authFetch(`/inspection/defects/job/${encodeURIComponent(jobId)}`));
}

export async function dispositionDefect(params: {
  defectId: string;
  jobId: string;
  disposition: DefectDisposition;
  note?: string;
}): Promise<DefectRecord> {
  return json<DefectRecord>(await authFetch(`/inspection/defects/${encodeURIComponent(params.defectId)}/disposition`, {
    method: 'POST',
    body: JSON.stringify({
      jobId: params.jobId,
      disposition: params.disposition,
      note: params.note,
    }),
  }));
}

// ── Labels ────────────────────────────────────────────────────────────────────

export const STEP_TYPE_LABELS: Record<string, string> = {
  solder: 'Solder',
  component_placement: 'Placement',
  cleanliness: 'Cleanliness',
  marking: 'Marking',
  mechanical: 'Mechanical',
  general: 'General',
};

export const RESULT_LABELS: Record<InspectionResult, string> = {
  Pass: 'Pass',
  Fail: 'Fail',
  ProcessIndicator: 'PI',
  NotEvaluated: 'N/A',
};
