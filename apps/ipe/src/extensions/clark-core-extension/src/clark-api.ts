const API_BASE = 'http://localhost:3000/v1';
const TOKEN_KEY = 'clark_access_token';
const ACTOR_KEY = 'clark_actor_id';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  actorId: string;
  displayName: string;
}

export interface Job {
  id: string;
  title: string;
  status: string;
  facility_id: string;
  workstation_id: string;
  job_type: string;
  priority: string;
  human_ref: string | null;
  created_at: string;
}

export interface JobDetail extends Job {
  zone_id: string;
  description: string | null;
  current_owner_actor_id: string | null;
  updated_at: string;
}

export interface Note {
  id: string;
  body: string;
  author_actor_id: string;
  created_at: string;
}

export interface Workstation {
  id: string;
  name: string;
  facility_id: string;
  zone_id: string;
  station_type: string;
  status: string;
}

export interface CreateJobParams {
  title: string;
  facilityId: string;
  zoneId: string;
  workstationId: string;
  description?: string;
  jobType?: string;
  priority?: string;
  humanRef?: string;
}

export interface UpdateJobParams {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getActorId(): string | null {
  return localStorage.getItem(ACTOR_KEY);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ACTOR_KEY);
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `Login failed (${res.status})`);
  }
  const data = await res.json() as LoginResult;
  localStorage.setItem(TOKEN_KEY, data.accessToken);
  localStorage.setItem(ACTOR_KEY, data.actorId);
  return data;
}

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers, ...init.headers as Record<string, string> },
  });
  return res;
}

export async function fetchJobs(): Promise<Job[]> {
  const res = await authFetch('/jobs');
  if (!res.ok) throw new Error(`Failed to load jobs (${res.status})`);
  return res.json() as Promise<Job[]>;
}

export async function fetchJob(id: string): Promise<JobDetail> {
  const res = await authFetch(`/jobs/${id}`);
  if (!res.ok) throw new Error(`Failed to load job (${res.status})`);
  return res.json() as Promise<JobDetail>;
}

export async function fetchWorkstations(): Promise<Workstation[]> {
  const res = await authFetch('/workstations');
  if (!res.ok) throw new Error(`Failed to load workstations (${res.status})`);
  return res.json() as Promise<Workstation[]>;
}

export async function createJob(params: CreateJobParams): Promise<{ id: string; title: string; status: string }> {
  const res = await authFetch('/jobs', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `Failed to create job (${res.status})`);
  }
  return res.json() as Promise<{ id: string; title: string; status: string }>;
}

export async function startJob(id: string): Promise<void> {
  const res = await authFetch(`/jobs/${id}/start`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `Failed to start job (${res.status})`);
  }
}

export async function resumeJob(id: string): Promise<void> {
  const res = await authFetch(`/jobs/${id}/resume`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `Failed to resume job (${res.status})`);
  }
}

export async function reopenJob(id: string): Promise<void> {
  const res = await authFetch(`/jobs/${id}/reopen`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `Failed to reopen job (${res.status})`);
  }
}

export async function updateJob(id: string, params: UpdateJobParams): Promise<void> {
  const res = await authFetch(`/jobs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `Failed to update job (${res.status})`);
  }
}

export async function fetchNotes(jobId: string): Promise<Note[]> {
  const res = await authFetch(`/notes?jobId=${encodeURIComponent(jobId)}`);
  if (!res.ok) throw new Error(`Failed to load notes (${res.status})`);
  return res.json() as Promise<Note[]>;
}

export async function postNote(jobId: string, body: string): Promise<Note> {
  const res = await authFetch('/notes', {
    method: 'POST',
    body: JSON.stringify({ jobId, body }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `Failed to post note (${res.status})`);
  }
  return res.json() as Promise<Note>;
}

/** Dispatch a job selection event across all widgets */
export function selectJob(jobId: string, jobTitle: string): void {
  window.dispatchEvent(new CustomEvent('clark:job-selected', { detail: { jobId, jobTitle } }));
}

/** Dispatch a job list refresh event (e.g. after create or status change) */
export function notifyJobListChanged(): void {
  window.dispatchEvent(new CustomEvent('clark:jobs-changed'));
}
