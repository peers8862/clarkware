/**
 * Firmware API client for clark-firmware-extension.
 * All types defined locally — frontend module, cannot import from backend packages.
 */

const API_BASE = 'http://localhost:3000/v1';
const TOKEN_KEY = 'clark_access_token';

export type FlashStatus = 'pending' | 'flashing' | 'success' | 'failed';

export interface FirmwareRecord {
  id: string;
  jobId: string;
  elfFilename: string;
  binaryHash: string;
  firmwareVersion: string | null;
  targetMcu: string;
  programmerSerial: string | null;
  flashStatus: FlashStatus;
  crcVerified: boolean | null;
  flashDurationMs: number | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
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

// ── API calls ─────────────────────────────────────────────────────────────────

export async function fetchRecords(jobId: string): Promise<FirmwareRecord[]> {
  return json<FirmwareRecord[]>(await authFetch(`/firmware/records/job/${encodeURIComponent(jobId)}`));
}

export async function createRecord(params: {
  jobId: string;
  facilityId: string;
  workstationId: string;
  elfFilename: string;
  binaryHash: string;
  firmwareVersion?: string;
  targetMcu: string;
  programmerSerial?: string;
}): Promise<FirmwareRecord> {
  return json<FirmwareRecord>(await authFetch('/firmware/records', {
    method: 'POST',
    body: JSON.stringify(params),
  }));
}

export async function recordFlashResult(params: {
  recordId: string;
  jobId: string;
  facilityId: string;
  workstationId: string;
  flashStatus: 'success' | 'failed';
  crcVerified: boolean;
  flashDurationMs: number;
  errorMessage?: string;
}): Promise<FirmwareRecord> {
  const { recordId, ...body } = params;
  return json<FirmwareRecord>(await authFetch(`/firmware/records/${encodeURIComponent(recordId)}/result`, {
    method: 'POST',
    body: JSON.stringify(body),
  }));
}

/**
 * Hash an ELF file in the browser using the SubtleCrypto API.
 * The operator selects the file via a file input; we hash it client-side
 * before sending the record to the API — no file upload required for Phase 1.
 */
export async function hashElfFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const FLASH_STATUS_LABELS: Record<FlashStatus, string> = {
  pending:  'Pending',
  flashing: 'Flashing…',
  success:  'Success',
  failed:   'Failed',
};
